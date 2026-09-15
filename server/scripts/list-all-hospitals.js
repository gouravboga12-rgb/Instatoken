require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');

async function list() {
  const h = await query("SELECT id, name, email FROM hospitals");
  console.log('=== HOSPITALS IN TABLE ===');
  console.log(h.rows);

  const s = await query("SELECT data FROM sync_store WHERE key = 'global_store'");
  if (s.rows.length > 0) {
    const store = s.rows[0].data || {};
    console.log('=== HOSPITALS IN GLOBAL_STORE ===');
    console.log((store.hospitals || []).map(x => ({ id: x.id, name: x.name, email: x.email })));

    console.log('=== HOSPITAL CREDENTIALS IN GLOBAL_STORE ===');
    console.log((store.hospitalCredentials || []).map(x => ({ hospitalId: x.hospitalId, email: x.email, name: x.hospitalName })));
  }
}

list().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
