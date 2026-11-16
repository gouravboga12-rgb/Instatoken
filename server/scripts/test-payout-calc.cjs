const { Pool } = require('pg');
require('dotenv').config({ path: '/home/ubuntu/Instatoken/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT data FROM sync_store WHERE key = 'global_store'");
    const store = res.rows[0].data;
    let totalCollectedOnline = 0;
    let totalSettled = 0;
    let unsettledTokens = [];
    const hospitalId = "hosp-mu0838sg";
    const allTokens = [...(store.tokens || []), ...(store.appointments || []).map(a => ({ ...a, consultationFee: a.fee }))];
    const seenIds = new Set();
    const hospTokens = [];
    allTokens.forEach(t => {
      const matchesHosp = t.hospitalId === hospitalId || ((hospitalId === "hosp-mu0838sg" || hospitalId === "hosp-gandhi") && (t.hospitalId === "hosp-mu0838sg" || t.hospitalId === "hosp-gandhi"));
      if (matchesHosp && t.id && !seenIds.has(t.id)) {
        seenIds.add(t.id);
        hospTokens.push(t);
      }
    });

    hospTokens.forEach(t => {
      const pc = t.paymentCollection || {};
      const isFullOnline = pc.mode === 'full_online' || 
        t.collectionMode === 'full_online' || 
        (t.paymentMethod && t.paymentMethod.toLowerCase().includes('full online')) ||
        (Number(t.totalFee || 0) > (Number(t.consultationFee || t.fee || 0) + 5));
      if (isFullOnline && t.status !== 'cancelled') {
        const docFee = Number(pc.consultationFee || t.consultationFee || t.fee || 0);
        totalCollectedOnline += docFee;
        if (pc.settlementStatus === 'settled') {
          totalSettled += docFee;
        } else {
          unsettledTokens.push({ id: t.id, patient: t.patientName || t.name, docFee });
        }
      }
    });
    console.log("CALCULATION RESULT:", JSON.stringify({ totalCollectedOnline, totalSettled, unsettledCount: unsettledTokens.length, unsettledTokens }, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
