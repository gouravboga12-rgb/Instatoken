const { Pool } = require('pg');
require('dotenv').config({ path: '/home/ubuntu/Instatoken/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const r = await pool.query("SELECT data FROM sync_store WHERE key = 'global_store'");
    const d = r.rows[0].data;
    const testTok = (d.tokens || []).find(t => t.id && t.id.includes('live-test'));
    console.log("TEST TOKEN DETAILS:\n", JSON.stringify(testTok, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await pool.end();
  }
}
run();
