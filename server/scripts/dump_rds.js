const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query, pool } = require('../config/db');

async function exportRDS() {
  console.log('--- 🚀 Starting AWS RDS PostgreSQL Data Dump ---');
  console.log('Source Host:', process.env.DB_HOST);
  console.log('Database:   ', process.env.DB_NAME);

  const outputPath = path.join(__dirname, '../../instatoken_dump.sql');
  const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

  // 1. Write Header & Load Schema DDL
  stream.write('-- =========================================================\n');
  stream.write('-- InstaToken PostgreSQL Full Database Dump\n');
  stream.write(`-- Generated at: ${new Date().toISOString()}\n`);
  stream.write('-- =========================================================\n\n');

  const schemaPath = path.join(__dirname, '../schema.sql');
  if (fs.existsSync(schemaPath)) {
    console.log('Reading base schema from server/schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    stream.write('-- 1. Base Schema Definitions\n');
    stream.write(schemaSql);
    stream.write('\n\n');
  }

  // 2. Fetch All Tables
  const tablesRes = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables to export:`, tables.join(', '));

  stream.write('-- 2. Table Data Inserts\n');
  stream.write('BEGIN;\n\n');

  // Tables ordered by dependency if possible
  const priorityOrder = [
    'hospitals',
    'hospital_profiles',
    'hospital_departments',
    'hospital_doctors',
    'hospital_schedules',
    'customers',
    'hospital_patients',
    'appointments',
    'tokens',
    'sync_store',
    'location_banners'
  ];

  const orderedTables = [
    ...priorityOrder.filter(t => tables.includes(t)),
    ...tables.filter(t => !priorityOrder.includes(t))
  ];

  let totalRowsExported = 0;

  for (const tableName of orderedTables) {
    const dataRes = await query(`SELECT * FROM "${tableName}"`);
    const rows = dataRes.rows;
    console.log(`Exporting ${tableName}: ${rows.length} rows`);
    totalRowsExported += rows.length;

    if (rows.length === 0) continue;

    stream.write(`-- Data for "${tableName}" (${rows.length} rows)\n`);

    for (const row of rows) {
      const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
      const values = Object.values(row).map(val => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val;
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (val instanceof Date) return `'${val.toISOString()}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');

      stream.write(`INSERT INTO "${tableName}" (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
    }
    stream.write('\n');
  }

  stream.write('COMMIT;\n');
  stream.write('-- End of Dump --\n');
  stream.end();

  console.log(`\n✅ Database dump completed successfully!`);
  console.log(`📁 File written to: ${outputPath}`);
  console.log(`📊 Total rows exported: ${totalRowsExported}`);

  await pool.end();
}

exportRDS().catch(err => {
  console.error('❌ Export failed:', err);
  process.exit(1);
});
