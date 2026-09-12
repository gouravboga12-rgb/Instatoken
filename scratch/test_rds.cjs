require('dotenv').config({ path: './server/.env' });
const { query, testConnection } = require('./server/config/db');

async function check() {
  const connected = await testConnection();
  console.log('Connected:', connected);
  if (!connected) return;

  const syncStore = await query("SELECT key, last_updated, length(data::text) as datalen FROM sync_store");
  console.log('sync_store keys:', syncStore.rows);

  const tokens = await query("SELECT id, token_number, patient_name, hospital_id, status FROM tokens");
  console.log('tokens count:', tokens.rows.length, tokens.rows);

  const appts = await query("SELECT id, patient_name, status, doctor_name FROM appointments");
  console.log('appointments count:', appts.rows.length, appts.rows);

  const hospProfiles = await query("SELECT hospital_id, profile_data->>'name' as name, profile_data->>'address' as address FROM hospital_profiles");
  console.log('hospital_profiles:', hospProfiles.rows);

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
