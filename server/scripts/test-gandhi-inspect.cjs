const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD?.replace(/"/g, ''),
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const hospRes = await pool.query("SELECT id, name, email, doctors FROM hospitals WHERE name ILIKE '%gandhi%' OR name ILIKE '%gandi%'");
    console.log('Hospitals found:', hospRes.rows.length);
    for (const h of hospRes.rows) {
      console.log('Hospital ID:', h.id, 'Name:', h.name, 'Email:', h.email);
      let docs = h.doctors;
      if (typeof docs === 'string') {
        try { docs = JSON.parse(docs); } catch(e) {}
      }
      console.log('Doctors count:', Array.isArray(docs) ? docs.length : 0);
      if (Array.isArray(docs)) {
        docs.forEach(d => console.log('  Doc ID:', d.id, 'Name:', d.name, 'Active:', d.active, 'Sessions:', d.sessions?.length));
      }

      const tokRes = await pool.query("SELECT id, token_number, patient_name, doctor_id, doctor_name, status, session, booking_date, is_walkin FROM appointments WHERE hospital_id = $1 ORDER BY created_at DESC LIMIT 10", [h.id]);
      console.log('Recent appointments in DB:', tokRes.rows.length);
      tokRes.rows.forEach(t => console.log('   Token:', t.token_number, t.patient_name, 'Doc:', t.doctor_name, 'ID:', t.doctor_id, 'Status:', t.status, 'Session:', t.session, 'Date:', t.booking_date, 'Walkin:', t.is_walkin));
    }
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
