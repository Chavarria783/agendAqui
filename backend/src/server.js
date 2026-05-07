const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { json } = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');
const pool = require('./config/database');

const PORT = process.env.PORT || 4005;

// =============================================================================
// CACHE DE PERMISOS (TTL: 5 minutos)
// =============================================================================
const permisosCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene los permisos efectivos de un usuario (con cache)
 * @param {number} userId - ID del usuario
 * @returns {Promise<string[]>} Array de códigos de permiso
 */
async function obtenerPermisosUsuario(userId) {
  const cacheKey = `permisos_${userId}`;
  const cached = permisosCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permisos;
  }

  try {
    const result = await pool.query(
      `SELECT codigo FROM obtener_permisos_usuario($1)`,
      [userId]
    );
    const permisos = result.rows.map(r => r.codigo);

    permisosCache.set(cacheKey, {
      permisos,
      timestamp: Date.now()
    });

    return permisos;
  } catch (error) {
    console.error('Error obteniendo permisos del usuario:', error);
    return [];
  }
}

/**
 * Invalida el cache de permisos de un usuario o de todos
 * @param {number|null} userId - ID del usuario o null para invalidar todo
 */
function invalidarCachePermisos(userId = null) {
  if (userId) {
    permisosCache.delete(`permisos_${userId}`);
  } else {
    permisosCache.clear();
  }
}

// Exportar para uso en otros módulos
global.invalidarCachePermisos = invalidarCachePermisos;

// =============================================================================
// CONTEXTO DE GRAPHQL
// =============================================================================
const context = async ({ req }) => {
  const token = req.headers.authorization || '';
  let user = null;
  let permisos = [];

  if (token) {
    try {
      user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'default_secret_key');
      console.log('✅ Usuario autenticado:', user.usuario, '| Rol:', user.rol);

      // Admin tiene todos los permisos, no necesita cargarlos
      if (user.rol !== 'admin') {
        permisos = await obtenerPermisosUsuario(user.id);
      }
    } catch (err) {
      console.log('❌ Token inválido:', err.message);
    }
  } else {
    console.log('⚠️ No se recibió token de autorización');
  }

  // Función helper para verificar permisos
  const tienePermiso = (codigo) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    return permisos.includes(codigo);
  };

  return {
    user,
    pool,
    permisos,
    tienePermiso,
    invalidarCachePermisos
  };
};

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Crear servidor Apollo
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
      };
    },
  });

  await server.start();

  // Middleware
  app.use(cors());
  app.use(json());

  // Ruta GraphQL
  app.use('/graphql', expressMiddleware(server, { context }));

  // Endpoint de salud
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      service: 'Factufy Hotel API',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // =========================================================================
  // Helper: obtener token de Factus y endpoint
  // =========================================================================
  async function getFactusAuth() {
    const configResult = await pool.query('SELECT * FROM configuracion_factus WHERE id = 1');
    const config = configResult.rows[0];
    if (!config || !config.activo) throw new Error('Factus no está activo');

    const FactusService = require('./services/FactusService');
    const token = await FactusService.getAuthToken();
    const endpoint = config.endpoint || 'https://api-sandbox.factus.com.co';
    return { token, endpoint };
  }

  // =========================================================================
  // Descargar PDF vía API Factus (base64)
  // Params: tipo=factura|nota-credito, numero=SETP990023303
  // =========================================================================
  app.get('/api/descargar-pdf', async (req, res) => {
    try {
      const { tipo, numero } = req.query;
      if (!tipo || !numero) {
        return res.status(400).json({ error: 'Se requieren parámetros tipo y numero' });
      }

      const { token, endpoint } = await getFactusAuth();

      let apiUrl;
      if (tipo === 'factura') {
        apiUrl = `${endpoint}/v1/bills/download-pdf/${numero}`;
      } else if (tipo === 'nota-credito') {
        apiUrl = `${endpoint}/v1/credit-notes/download-pdf/${numero}`;
      } else {
        return res.status(400).json({ error: 'Tipo no válido' });
      }

      console.log(`[Descargar PDF] ${apiUrl}`);
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`Factus respondió ${response.status}`);

      const data = await response.json();
      if (!data.data?.pdf_base_64_encoded) throw new Error('PDF no disponible en respuesta de Factus');

      const pdfBuffer = Buffer.from(data.data.pdf_base_64_encoded, 'base64');
      let fileName = data.data.file_name || `factura_${numero}`;
      if (!fileName.endsWith('.pdf')) fileName += '.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error al descargar PDF:', error.message);
      res.status(500).json({ error: 'Error al descargar el PDF', details: error.message });
    }
  });

  // =========================================================================
  // Descargar XML vía API Factus (base64)
  // =========================================================================
  app.get('/api/descargar-xml', async (req, res) => {
    try {
      const { tipo, numero } = req.query;
      if (!tipo || !numero) {
        return res.status(400).json({ error: 'Se requieren parámetros tipo y numero' });
      }

      const { token, endpoint } = await getFactusAuth();

      let apiUrl;
      if (tipo === 'factura') {
        apiUrl = `${endpoint}/v1/bills/download-xml/${numero}`;
      } else if (tipo === 'nota-credito') {
        apiUrl = `${endpoint}/v1/credit-notes/download-xml/${numero}`;
      } else {
        return res.status(400).json({ error: 'Tipo no válido' });
      }

      console.log(`[Descargar XML] ${apiUrl}`);
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`Factus respondió ${response.status}`);

      const data = await response.json();
      if (!data.data?.xml_base_64_encoded) throw new Error('XML no disponible en respuesta de Factus');

      const xmlBuffer = Buffer.from(data.data.xml_base_64_encoded, 'base64');
      let fileName = data.data.file_name || `factura_${numero}`;
      if (!fileName.endsWith('.xml')) fileName += '.xml';
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', xmlBuffer.length);
      res.send(xmlBuffer);
    } catch (error) {
      console.error('Error al descargar XML:', error.message);
      res.status(500).json({ error: 'Error al descargar el XML', details: error.message });
    }
  });

  // =========================================================================
  // Descargar ZIP (PDF + XML) vía API Factus
  // =========================================================================
  app.get('/api/descargar-zip', async (req, res) => {
    try {
      const { tipo, numero } = req.query;
      if (!tipo || !numero) {
        return res.status(400).json({ error: 'Se requieren parámetros tipo y numero' });
      }

      const { token, endpoint } = await getFactusAuth();
      const archiver = require('archiver');

      const tipoPath = tipo === 'nota-credito' ? 'credit-notes' : 'bills';
      const pdfUrl = `${endpoint}/v1/${tipoPath}/download-pdf/${numero}`;
      const xmlUrl = `${endpoint}/v1/${tipoPath}/download-xml/${numero}`;

      console.log(`[Descargar ZIP] PDF: ${pdfUrl}, XML: ${xmlUrl}`);

      const [pdfResp, xmlResp] = await Promise.all([
        fetch(pdfUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
        fetch(xmlUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } })
      ]);

      const nombreZip = `factura_${numero}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreZip}"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      if (pdfResp.ok) {
        const pdfData = await pdfResp.json();
        if (pdfData.data?.pdf_base_64_encoded) {
          archive.append(Buffer.from(pdfData.data.pdf_base_64_encoded, 'base64'), { name: `${numero}.pdf` });
        }
      }

      if (xmlResp.ok) {
        const xmlData = await xmlResp.json();
        if (xmlData.data?.xml_base_64_encoded) {
          archive.append(Buffer.from(xmlData.data.xml_base_64_encoded, 'base64'), { name: `${numero}.xml` });
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error('Error al crear ZIP:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al crear el archivo ZIP', details: error.message });
      }
    }
  });

  // Ruta raíz
  app.get('/', (req, res) => {
    res.json({
      message: 'Factufy Hotel API',
      graphql: '/graphql',
      health: '/health'
    });
  });

  // Iniciar servidor
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log('');
  console.log('🏨 ===================================');
  console.log('🏨  FACTUFY HOTEL - Backend API');
  console.log('🏨 ===================================');
  console.log(`🚀 Servidor escuchando en: http://localhost:${PORT}`);
  console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log('🏨 ===================================');
  console.log('');
}

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando servidor...');
  await pool.end();
  process.exit(0);
});

// Iniciar servidor
startServer().catch((err) => {
  console.error('Error al iniciar servidor:', err);
  process.exit(1);
});


