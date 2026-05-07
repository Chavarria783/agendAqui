// Archivo principal de resolvers
// Importar todos los resolvers individuales
const authResolvers = require('./auth');
const habitacionesResolvers = require('./habitaciones');
const huespedesResolvers = require('./huespedes');
const reservasResolvers = require('./reservas');
const hospedajesResolvers = require('./hospedajes');
const serviciosResolvers = require('./servicios');
const consumosResolvers = require('./consumos');
const categoriasResolvers = require('./categorias');
const itemsResolvers = require('./items');
const tiposDocumentoDianResolvers = require('./tiposDocumentoDian');
const configuracionResolvers = require('./configuracion');
const facturacionResolvers = require('./facturacion');
const { consecutivosResolvers } = require('./consecutivos');

// Sistema POS
const cajaResolvers = require('./caja');
const descuentosResolvers = require('./descuentos');
const posResolvers = require('./pos');

// Calendario Unificado
const calendarioResolvers = require('./calendario');

// Sistema de Permisos
const permisosResolvers = require('./permisos');

// TRA - Tarjeta de Registro de Alojamiento (MinCIT)
const traResolvers = require('./tra');

// Cargar municipios DANE (módulo singleton compartido con resolvers)
const { getMunicipiosFormateados } = require('../data/municipios-loader');

const resolvers = {
  Query: {
    // Auth queries
    ...authResolvers.Query,

    // Habitaciones queries
    ...habitacionesResolvers.Query,

    // Huéspedes y Clientes queries
    ...huespedesResolvers.Query,

    // Reservas queries
    ...reservasResolvers.Query,

    // Hospedajes queries
    ...hospedajesResolvers.Query,

    // Servicios queries
    ...serviciosResolvers.Query,

    // Consumos queries
    ...consumosResolvers.Query,

    // Categorías queries
    ...categoriasResolvers.Query,

    // Items queries
    ...itemsResolvers.Query,

    // Tipos de Documento DIAN queries
    ...tiposDocumentoDianResolvers.Query,

    // Configuración queries
    ...configuracionResolvers.Query,

    // Facturación Electrónica queries
    ...facturacionResolvers.Query,

    // Facturas (historial)
    facturas: async (_, { fecha_desde, fecha_hasta, busqueda, tipo_factura, limite }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');
      try {
        let query = `
          SELECT f.*,
            c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.numero_documento as cliente_documento
          FROM facturas f
          LEFT JOIN clientes c ON c.id = f.cliente_id
          WHERE 1=1
        `;
        const params = [];

        if (fecha_desde) {
          params.push(fecha_desde);
          query += ` AND f.fecha >= $${params.length}`;
        }
        if (fecha_hasta) {
          params.push(fecha_hasta);
          query += ` AND f.fecha <= $${params.length}`;
        }
        if (busqueda) {
          params.push(`%${busqueda}%`);
          query += ` AND (f.numero_factura ILIKE $${params.length} OR c.nombre ILIKE $${params.length} OR c.apellido ILIKE $${params.length} OR c.numero_documento ILIKE $${params.length})`;
        }
        if (tipo_factura) {
          params.push(tipo_factura);
          query += ` AND f.tipo_factura = $${params.length}`;
        }

        query += ` ORDER BY f.created_at DESC`;

        if (limite) {
          params.push(limite);
          query += ` LIMIT $${params.length}`;
        } else {
          query += ` LIMIT 100`;
        }

        const result = await pool.query(query, params);
        return result.rows.map(row => ({
          ...row,
          numero: row.numero_factura,
          impuestos: row.iva,
          metodos_pago: row.metodos_pago_detalle,
        }));
      } catch (error) {
        console.error('Error obteniendo facturas:', error);
        throw new Error('Error al obtener facturas');
      }
    },

    factura: async (_, { id }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');
      try {
        const result = await pool.query(`
          SELECT f.*,
            c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.numero_documento as cliente_documento
          FROM facturas f
          LEFT JOIN clientes c ON c.id = f.cliente_id
          WHERE f.id = $1
        `, [id]);

        if (result.rows.length === 0) throw new Error('Factura no encontrada');

        const row = result.rows[0];
        return {
          ...row,
          numero: row.numero_factura,
          impuestos: row.iva,
          metodos_pago: row.metodos_pago_detalle,
        };
      } catch (error) {
        console.error('Error obteniendo factura:', error);
        throw error;
      }
    },

    // Sistema POS queries
    ...cajaResolvers.Query,
    ...descuentosResolvers.Query,
    ...posResolvers.Query,

    // Calendario Unificado queries
    ...calendarioResolvers.Query,

    // Consecutivos DIAN queries
    ...consecutivosResolvers.Query,

    // Sistema de Permisos queries
    ...permisosResolvers.Query,

    // TRA - Tarjeta de Registro de Alojamiento queries
    ...traResolvers.Query,

    // Métodos de pago
    metodosPago: async (_, { activo }, { pool }) => {
      let query = 'SELECT * FROM metodos_pago';
      const params = [];

      if (activo !== undefined) {
        params.push(activo);
        query += ` WHERE activo = $${params.length}`;
      }

      query += ' ORDER BY orden';

      const result = await pool.query(query, params);
      return result.rows;
    },

    // Municipios DANE (Colombia - DIVIPOLA)
    municipiosDane: async () => {
      return getMunicipiosFormateados();
    },
  },

  Mutation: {
    // Auth mutations
    ...authResolvers.Mutation,

    // Habitaciones mutations
    ...habitacionesResolvers.Mutation,

    // Huéspedes y Clientes mutations
    ...huespedesResolvers.Mutation,

    // Reservas mutations
    ...reservasResolvers.Mutation,

    // Hospedajes mutations
    ...hospedajesResolvers.Mutation,

    // Servicios mutations
    ...serviciosResolvers.Mutation,

    // Consumos mutations
    ...consumosResolvers.Mutation,

    // Categorías mutations
    ...categoriasResolvers.Mutation,

    // Items mutations
    ...itemsResolvers.Mutation,

    // Configuración mutations
    ...configuracionResolvers.Mutation,

    // Facturación Electrónica mutations
    ...facturacionResolvers.Mutation,

    // Sistema POS mutations
    ...cajaResolvers.Mutation,
    ...descuentosResolvers.Mutation,
    ...posResolvers.Mutation,

    // Consecutivos DIAN mutations
    ...consecutivosResolvers.Mutation,

    // Sistema de Permisos mutations
    ...permisosResolvers.Mutation,

    // TRA - Tarjeta de Registro de Alojamiento mutations
    ...traResolvers.Mutation,
  },

  // Type resolvers
  Usuario: {
    ...authResolvers.Usuario,
    ...permisosResolvers.Usuario,
  },
  Reserva: reservasResolvers.Reserva,
  Hospedaje: hospedajesResolvers.Hospedaje,
  Huesped: {
    ...huespedesResolvers.Huesped,
    ...tiposDocumentoDianResolvers.Huesped,
    ...facturacionResolvers.Huesped,
  },
  Cliente: {
    ...tiposDocumentoDianResolvers.Cliente,
    ...facturacionResolvers.Cliente,
  },
  ItemInventario: itemsResolvers.ItemInventario,
  MovimientoInventario: itemsResolvers.MovimientoInventario,

  // Facturación Electrónica resolvers
  FacturaElectronica: facturacionResolvers.FacturaElectronica,
  NotaCredito: facturacionResolvers.NotaCredito,

  // Factura resolver - mapear columnas de DB a campos GraphQL
  Factura: {
    ...facturacionResolvers.Factura,
    impuestos: (parent) => parent.iva,
    usuario_id: (parent) => parent.created_by,
    tiene_factura_electronica: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT COUNT(*) FROM facturas_electronicas WHERE factura_id = $1',
          [parent.id]
        );
        return parseInt(result.rows[0].count) > 0;
      } catch (error) {
        console.error('Error verificando factura electrónica:', error);
        return false;
      }
    },
    factura_electronica: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM facturas_electronicas WHERE factura_id = $1',
          [parent.id]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error obteniendo factura electrónica:', error);
        return null;
      }
    }
  },

  // Sistema POS type resolvers
  TurnoCaja: cajaResolvers.TurnoCaja,
  ArqueoCaja: cajaResolvers.ArqueoCaja,
  MovimientoCaja: cajaResolvers.MovimientoCaja,
  ResumenTurnoCaja: cajaResolvers.ResumenTurnoCaja,
  IngresoMetodo: cajaResolvers.IngresoMetodo,
  Descuento: descuentosResolvers.Descuento,
  VentaPOS: posResolvers.VentaPOS,
  DetalleVentaPOS: posResolvers.DetalleVentaPOS,
  VentaPOSPago: posResolvers.VentaPOSPago,
  ProductoMasVendido: posResolvers.ProductoMasVendido,

  // Calendario Unificado type resolver
  CalendarioEvento: calendarioResolvers.CalendarioEvento,

  // TRA type resolvers
  ReporteTRA: traResolvers.ReporteTRA,
};

module.exports = resolvers;
