const { Pool } = require('pg');
require('dotenv').config({ path: '/home/ubuntu/Instatoken/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const r = await pool.query("SELECT id, hospital_id, patient_name, token_date, data FROM tokens WHERE hospital_id IN ('hosp-mu0838sg', 'hosp-gandhi') ORDER BY created_at DESC");
    console.log("=== TOKENS in PG ===");
    r.rows.forEach(x => {
      let d = {};
      try { d = typeof x.data === 'string' ? JSON.parse(x.data) : (x.data || {}); } catch(e){}
      console.log(`[${x.hospital_id}] ${x.id} | ${x.patient_name} | Fee: ${d.consultationFee} | totalFee: ${d.totalFee} | platformFee: ${d.platformFee} | method: "${d.paymentMethod}" | status: ${d.status} | pc: ${JSON.stringify(d.paymentCollection)}`);
    });

    const aRes = await pool.query("SELECT id, hospital_id, patient_name, appointment_date, data FROM appointments WHERE hospital_id IN ('hosp-mu0838sg', 'hosp-gandhi') ORDER BY created_at DESC");
    console.log("\n=== APPOINTMENTS in PG ===");
    aRes.rows.forEach(x => {
      let d = {};
      try { d = typeof x.data === 'string' ? JSON.parse(x.data) : (x.data || {}); } catch(e){}
      console.log(`[${x.hospital_id}] ${x.id} | ${x.patient_name} | fee: ${d.fee} | totalFee: ${d.totalFee} | platformFee: ${d.platformFee} | method: "${d.paymentMethod}" | collectionMode: ${d.collectionMode}`);
    });
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await pool.end();
  }
}
run();
