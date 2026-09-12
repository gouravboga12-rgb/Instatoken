const { Pool } = require('pg');

// Read connection string from environment (same as server/index.js)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log('DATABASE_URL not set - checking .env file');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    const r1 = await pool.query('SELECT COUNT(*) FROM tokens');
    console.log('Total tokens in RDS:', r1.rows[0].count);

    const r2 = await pool.query('SELECT COUNT(*) FROM appointments');
    console.log('Total appointments in RDS:', r2.rows[0].count);

    const r3 = await pool.query('SELECT id, data->>\'patientName\' as name, data->>\'status\' as status, data->>\'tokenNo\' as tokenno, created_at FROM tokens ORDER BY created_at DESC LIMIT 5');
    console.log('\nLast 5 tokens:');
    r3.rows.forEach(r => console.log(' ', r.id, '|', r.name, '| status:', r.status, '| tokenNo:', r.tokenno));
  } catch(e) {
    console.error('DB error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
