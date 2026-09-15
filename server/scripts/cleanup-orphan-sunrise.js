require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');

async function cleanup() {
  const orphanId = 'hosp-mty9hx4f';
  console.log(`Cleaning orphan hospital data for ${orphanId}...`);

  await query('DELETE FROM tokens WHERE hospital_id = $1', [orphanId]);
  await query('DELETE FROM appointments WHERE hospital_id = $1', [orphanId]);
  await query('DELETE FROM hospital_patients WHERE hospital_id = $1', [orphanId]);
  await query('DELETE FROM hospital_doctors WHERE hospital_id = $1', [orphanId]);
  await query('DELETE FROM hospital_departments WHERE hospital_id = $1', [orphanId]);
  await query('DELETE FROM hospital_schedules WHERE hospital_id = $1', [orphanId]);
  await query('DELETE FROM hospital_profiles WHERE hospital_id = $1', [orphanId]);
  await query('DELETE FROM hospitals WHERE id = $1', [orphanId]);

  const s = await query("SELECT data FROM sync_store WHERE key = 'global_store'");
  if (s.rows.length > 0) {
    const store = s.rows[0].data || {};
    store.hospitals = (store.hospitals || []).filter(h => h.id !== orphanId);
    store.hospitalCredentials = (store.hospitalCredentials || []).filter(c => c.hospitalId !== orphanId);
    store.deletedHospitalIds = store.deletedHospitalIds || [];
    if (!store.deletedHospitalIds.includes(orphanId)) {
      store.deletedHospitalIds.push(orphanId);
    }
    if (store.hospitalProfiles) delete store.hospitalProfiles[orphanId];
    if (store.hospitalDoctors) delete store.hospitalDoctors[orphanId];
    if (store.hospitalDepartments) delete store.hospitalDepartments[orphanId];
    if (store.hospitalSchedules) delete store.hospitalSchedules[orphanId];
    if (store.hospitalStaff) delete store.hospitalStaff[orphanId];
    if (store.hospitalPatients) delete store.hospitalPatients[orphanId];

    await query("UPDATE sync_store SET data = $1, last_updated = NOW() WHERE key = 'global_store'", [JSON.stringify(store)]);
    console.log('✅ Pruned orphan credentials and added to deletedHospitalIds tombstone');
  }

  // Also verify current state
  const creds = await query("SELECT data FROM sync_store WHERE key = 'global_store'");
  const currentStore = creds.rows[0]?.data || {};
  console.log('Current hospitals:', (currentStore.hospitals || []).map(h => ({ id: h.id, name: h.name })));
  console.log('Current credentials:', (currentStore.hospitalCredentials || []).map(c => ({ id: c.hospitalId, email: c.email, name: c.hospitalName })));
}

cleanup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
