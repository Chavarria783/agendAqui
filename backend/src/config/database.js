const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'AgendAqui_hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  client_encoding: 'UTF8',
});

// Evento de conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL (AgendaAqui_hotel)');
});

// Evento de error
pool.on('error', (err) => {
  console.error('❌ Error inesperado en pool de PostgreSQL:', err);
  process.exit(-1);
});

// Verificar conexión al iniciar
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error al conectar con la base de datos:', err);
  } else {
    console.log(`🕐 Hora del servidor de base de datos: ${res.rows[0].now}`);
  }
});

module.exports = pool;
