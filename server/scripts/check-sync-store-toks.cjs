const { Pool } = require('pg');
require('dotenv').config({ path: '/home/ubuntu/Instatoken/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const r = await pool.query("SELECT data FROM sync_store WHERE key = 'global_store'");
    const d = r.rows[0].data;
    console.log("=== TOKENS in global_store matching gandhi ===");
    (d.tokens || []).filter(t => t.hospitalId === 'hosp-gandhi' || t.hospitalId === 'hosp-mu0838sg').forEach(t => {
      console.log(`[${t.hospitalId}] ${t.id} | ${t.patientName} | fee: ${t.consultationFee} | totalFee: ${t.totalFee} | method: "${t.paymentMethod}" | pc: ${JSON.stringify(t.paymentCollection)}`);
    });
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await pool.end();
  }
}
run();
