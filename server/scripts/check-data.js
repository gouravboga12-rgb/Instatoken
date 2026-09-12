require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');

async function check() {
  const h = await query("SELECT * FROM hospitals WHERE id = 'hosp-apollo'");
  console.log('Apollo Hospital in RDS:\n', JSON.stringify(h.rows[0], null, 2));

  const p = await query("SELECT * FROM hospital_profiles WHERE hospital_id = 'hosp-apollo'");
  console.log('Apollo Profile in RDS:\n', JSON.stringify(p.rows[0], null, 2));

  const d = await query("SELECT id, name, specialization FROM hospital_doctors WHERE hospital_id = 'hosp-apollo'");
  console.log('Apollo Doctors in RDS:\n', d.rows);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
