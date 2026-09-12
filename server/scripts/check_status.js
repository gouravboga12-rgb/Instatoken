const { query } = require('../config/db');

async function main() {
  try {
    const hosp = await query("SELECT id, name, data FROM hospitals WHERE id = 'hosp-apollo'");
    console.log('=== HOSP-APOLLO IN HOSPITALS TABLE ===');
    console.log(hosp.rows[0]);

    const prof = await query("SELECT hospital_id, profile_data FROM hospital_profiles WHERE hospital_id = 'hosp-apollo'");
    console.log('=== HOSP-APOLLO IN HOSPITAL_PROFILES TABLE ===');
    console.log(prof.rows[0]);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
