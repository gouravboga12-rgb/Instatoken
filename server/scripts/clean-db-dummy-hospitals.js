require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');

async function cleanDummyHospitalsFromRDS() {
  console.log('🧹 Cleaning dummy hospitals from AWS RDS PostgreSQL...');

  const dummyIds = [
    'hosp-rainbow',
    'hosp-nethra',
    'hosp-fortis',
    'hosp-continental',
    'hosp-ramesh',
    'hosp-care-vizag',
    'hosp-mty56y2p'
  ];

  for (const id of dummyIds) {
    await query('DELETE FROM hospital_doctors WHERE hospital_id = $1', [id]);
    await query('DELETE FROM hospital_departments WHERE hospital_id = $1', [id]);
    await query('DELETE FROM hospital_profiles WHERE hospital_id = $1', [id]);
    await query('DELETE FROM tokens WHERE hospital_id = $1', [id]);
    await query('DELETE FROM appointments WHERE hospital_id = $1', [id]);
    await query('DELETE FROM hospital_patients WHERE hospital_id = $1', [id]);
    await query('DELETE FROM hospitals WHERE id = $1', [id]);
    console.log(`  ✓ Removed ${id} from RDS tables`);
  }

  // Update Apollo Spectra details in hospitals table
  await query(`
    UPDATE hospitals 
    SET email = 'info@apollospectra.com', 
        phone = '+91 80 4668 8888',
        name = 'Apollo Spectra Hospital',
        city = 'Hyderabad',
        state = 'Telangana'
    WHERE id = 'hosp-apollo'
  `);
  console.log('  ✓ Updated Apollo Spectra contact details in hospitals table');

  // Clean global_store in sync_store
  const syncRes = await query("SELECT data FROM sync_store WHERE key = 'global_store'");
  if (syncRes.rows.length > 0 && syncRes.rows[0].data) {
    const store = syncRes.rows[0].data;
    if (Array.isArray(store.hospitals)) {
      store.hospitals = store.hospitals.filter(h => !dummyIds.includes(h.id));
    }
    if (store.hospitalDoctors) {
      dummyIds.forEach(id => delete store.hospitalDoctors[id]);
    }
    if (store.hospitalDepartments) {
      dummyIds.forEach(id => delete store.hospitalDepartments[id]);
    }
    if (store.hospitalProfiles) {
      dummyIds.forEach(id => delete store.hospitalProfiles[id]);
    }
    if (store.hospitalPatients) {
      dummyIds.forEach(id => delete store.hospitalPatients[id]);
    }

    await query("UPDATE sync_store SET data = $1, last_updated = NOW() WHERE key = 'global_store'", [JSON.stringify(store)]);
    console.log('  ✓ Pruned sync_store global_store in RDS');
  }

  // Verify remaining hospitals
  const remaining = await query('SELECT id, name, email, phone FROM hospitals');
  console.log('\n📊 Remaining Hospitals in AWS RDS:');
  console.table(remaining.rows);

  console.log('\n✅ AWS RDS cleanup complete!');
}

cleanDummyHospitalsFromRDS()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  });
