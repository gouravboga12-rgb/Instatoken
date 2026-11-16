const { Pool } = require('pg');
require('dotenv').config({ path: '/home/ubuntu/Instatoken/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // 1. Delete from PostgreSQL tables
    await pool.query("DELETE FROM tokens WHERE id LIKE '%live-test%'");
    await pool.query("DELETE FROM appointments WHERE id LIKE '%live-test%'");
    await pool.query("DELETE FROM hospital_patients WHERE id LIKE '%live-test%' OR name = 'Live Audit Patient'");

    // 2. Delete from sync_store
    const syncRes = await pool.query("SELECT data FROM sync_store WHERE key = 'global_store'");
    if (syncRes.rows[0]) {
      const d = syncRes.rows[0].data;
      if (d.tokens) {
        d.tokens = d.tokens.filter(t => !t.id || !t.id.includes('live-test'));
      }
      if (d.appointments) {
        d.appointments = d.appointments.filter(a => !a.id || !a.id.includes('live-test'));
      }
      await pool.query("UPDATE sync_store SET data = $1 WHERE key = 'global_store'", [JSON.stringify(d)]);
      console.log("DELETED live-test from sync_store");
    }

    console.log("CLEANED LIVE-TEST SUCCESSFULLY");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await pool.end();
  }
}
run();
