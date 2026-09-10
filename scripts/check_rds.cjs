const { query, pool } = require('../server/config/db');

async function checkAndMigrate() {
  console.log('--- Checking AWS RDS PostgreSQL Tables ---');
  const res = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Existing RDS Tables:', res.rows.map(r => r.table_name));

  // Check if location_banners exists
  const hasBanners = res.rows.some(r => r.table_name === 'location_banners');
  console.log('Has location_banners table:', hasBanners);

  const hasPatients = res.rows.some(r => r.table_name === 'hospital_patients');
  console.log('Has hospital_patients table:', hasPatients);

  const hasSchedules = res.rows.some(r => r.table_name === 'hospital_schedules');
  console.log('Has hospital_schedules table:', hasSchedules);

  await pool.end();
}

checkAndMigrate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
