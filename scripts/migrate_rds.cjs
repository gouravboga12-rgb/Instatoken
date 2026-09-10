const fs = require('fs');
const path = require('path');
const { query, pool } = require('../server/config/db');

async function runMigration() {
  console.log('--- Applying server/schema.sql to AWS RDS PostgreSQL ---');
  const schemaPath = path.join(__dirname, '../server/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await query(sql);
    console.log('✅ schema.sql applied successfully to AWS RDS PostgreSQL!');

    // Verify all tables
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('✅ Updated RDS Tables:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
