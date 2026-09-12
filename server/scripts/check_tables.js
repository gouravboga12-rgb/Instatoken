const { query } = require('../config/db');

async function main() {
  try {
    const cols = await query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);
    console.log('Database columns:');
    let currentTable = '';
    for (const r of cols.rows) {
      if (r.table_name !== currentTable) {
        currentTable = r.table_name;
        console.log(`\n--- Table: ${currentTable} ---`);
      }
      console.log(`  ${r.column_name} (${r.data_type})`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
