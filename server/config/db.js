const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'instatoken_prod',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false, // Required for AWS RDS SSL connections
  },
  max: 20, // Max concurrent connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle PostgreSQL client:', err);
});

// Helper for single query execution
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
  return res;
}

// Test connection function
async function testConnection() {
  try {
    const res = await query('SELECT NOW() as now, current_database() as db');
    console.log(`✅ Connected to AWS RDS PostgreSQL [Database: ${res.rows[0].db}, Time: ${res.rows[0].now}]`);
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to AWS RDS PostgreSQL:', err.message);
    return false;
  }
}

module.exports = {
  pool,
  query,
  testConnection,
};
