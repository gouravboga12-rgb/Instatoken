require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query, pool } = require('../config/db');

async function inspect() {
  try {
    console.log('Connecting to RDS Host:', process.env.DB_HOST);
    const dbInfo = await query('SELECT current_database() as db, version()');
    console.log('Current DB:', dbInfo.rows[0].db);
    console.log('Postgres Version:', dbInfo.rows[0].version);

    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n--- RDS TABLES & ROW COUNTS ---');
    for (const row of tablesRes.rows) {
      const countRes = await query(`SELECT COUNT(*) as count FROM "${row.table_name}"`);
      console.log(`Table: ${row.table_name.padEnd(25)} -> ${countRes.rows[0].count} rows`);
    }
    console.log('-------------------------------\n');
  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await pool.end();
  }
}

inspect();
