const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runSanitization() {
  console.log('====================================================');
  console.log('🧹 SANITIZATION & MULTI-TENANT DATABASE SYNC');
  console.log('====================================================\n');

  try {
    // 1. Remove duplicate tokens from hosp-gandhi
    console.log('Step 1: Deduplicating tokens in hosp-gandhi...');
    const duplicateTokenIds = [
      'appt-1794169719069',
      'appt-1794169720630',
      'appt-1794169722156',
      'appt-1794169717510'
    ];
    for (const id of duplicateTokenIds) {
      await pool.query('DELETE FROM tokens WHERE id = $1', [id]);
      await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
      console.log(`  ✓ Removed duplicate token/appt: ${id}`);
    }

    // 2. Remove dummy hospital shells
    console.log('\nStep 2: Pruning dummy hospital shells from RDS...');
    const dummyHospIds = [
      'hosp-rainbow',
      'hosp-nethra',
      'hosp-fortis',
      'hosp-continental',
      'hosp-ramesh',
      'hosp-care-vizag',
      'hosp-mty56y2p'
    ];

    for (const hid of dummyHospIds) {
      await pool.query('DELETE FROM hospital_doctors WHERE hospital_id = $1', [hid]);
      await pool.query('DELETE FROM hospital_departments WHERE hospital_id = $1', [hid]);
      await pool.query('DELETE FROM hospital_profiles WHERE hospital_id = $1', [hid]);
      await pool.query('DELETE FROM tokens WHERE hospital_id = $1', [hid]);
      await pool.query('DELETE FROM appointments WHERE hospital_id = $1', [hid]);
      await pool.query('DELETE FROM hospital_patients WHERE hospital_id = $1', [hid]);
      await pool.query('DELETE FROM hospitals WHERE id = $1', [hid]);
      console.log(`  ✓ Pruned dummy hospital ${hid}`);
    }

    // 3. Clean global_store in sync_store
    console.log('\nStep 3: Pruning sync_store JSON cache...');
    const syncRes = await pool.query("SELECT data FROM sync_store WHERE key = 'global_store'");
    if (syncRes.rows.length > 0 && syncRes.rows[0].data) {
      const store = syncRes.rows[0].data;
      if (Array.isArray(store.hospitals)) {
        store.hospitals = store.hospitals.filter(h => !dummyHospIds.includes(h.id));
      }
      if (store.hospitalDoctors) {
        dummyHospIds.forEach(id => delete store.hospitalDoctors[id]);
      }
      if (store.hospitalDepartments) {
        dummyHospIds.forEach(id => delete store.hospitalDepartments[id]);
      }
      if (store.hospitalProfiles) {
        dummyHospIds.forEach(id => delete store.hospitalProfiles[id]);
      }
      if (store.hospitalPatients) {
        dummyHospIds.forEach(id => delete store.hospitalPatients[id]);
      }
      if (store.hospitalStaff) {
        dummyHospIds.forEach(id => delete store.hospitalStaff[id]);
      }
      if (Array.isArray(store.tokens)) {
        store.tokens = store.tokens.filter(t => !duplicateTokenIds.includes(t.id) && !dummyHospIds.includes(t.hospitalId));
      }
      if (Array.isArray(store.appointments)) {
        store.appointments = store.appointments.filter(a => !duplicateTokenIds.includes(a.id) && !dummyHospIds.includes(a.hospitalId));
      }

      await pool.query("UPDATE sync_store SET data = $1, last_updated = NOW() WHERE key = 'global_store'", [JSON.stringify(store)]);
      console.log('  ✓ Updated global_store in sync_store');
    }

    // 4. Backfill real patients into PostgreSQL hospital_patients table
    console.log('\nStep 4: Synchronizing patients into hospital_patients table...');
    const tokenRows = await pool.query(`
      SELECT hospital_id, patient_name, patient_phone, doctor_id, token_date, data
      FROM tokens
      WHERE patient_phone IS NOT NULL AND patient_phone != ''
      ORDER BY token_date ASC
    `);

    const patientMap = new Map();
    for (const row of tokenRows.rows) {
      const hid = row.hospital_id || 'hosp-mu0838sg';
      const cleanPhone = String(row.patient_phone).replace(/\D/g, '').slice(-10);
      if (!cleanPhone && !row.patient_name) continue;
      const key = `${hid}_${cleanPhone || row.patient_name.trim().toLowerCase()}`;

      if (!patientMap.has(key)) {
        const parsedData = row.data && typeof row.data === 'object' ? row.data : {};
        patientMap.set(key, {
          id: `pat-${hid}-${cleanPhone || Math.random().toString(36).slice(2, 7)}`,
          hospitalId: hid,
          uhid: `APS${Math.abs(cleanPhone.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000)).toString().padStart(6, '0')}`,
          name: row.patient_name || 'Patient',
          phone: row.patient_phone,
          email: parsedData.patientEmail || '',
          age: Number(parsedData.patientAge) || 30,
          gender: parsedData.patientGender || 'Male',
          bloodGroup: parsedData.bloodGroup || 'B+',
          address: parsedData.address || '',
          city: parsedData.city || 'Hyderabad',
          pinCode: parsedData.pinCode || '',
          totalVisits: 0,
          lastVisit: row.token_date ? new Date(row.token_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          data: {
            doctorVisits: [],
            tokenHistory: []
          }
        });
      }

      const p = patientMap.get(key);
      p.totalVisits += 1;
      const tDate = row.token_date ? new Date(row.token_date).toISOString().split('T')[0] : '';
      if (tDate && tDate >= p.lastVisit) {
        p.lastVisit = tDate;
      }
      p.data.tokenHistory.push({
        tokenDate: tDate,
        doctorId: row.doctor_id,
        status: row.status
      });
    }

    console.log(`Found ${patientMap.size} unique patients across hospitals.`);
    for (const pat of patientMap.values()) {
      await pool.query(`
        INSERT INTO hospital_patients (id, hospital_id, uhid, name, phone, email, age, gender, blood_group, address, city, pin_code, total_visits, last_visit, data, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          total_visits = $13,
          last_visit = $14,
          data = $15,
          updated_at = NOW()
      `, [
        pat.id,
        pat.hospitalId,
        pat.uhid,
        pat.name,
        pat.phone,
        pat.email,
        pat.age,
        pat.gender,
        pat.bloodGroup,
        pat.address,
        pat.city,
        pat.pinCode,
        pat.totalVisits,
        pat.lastVisit,
        JSON.stringify(pat.data)
      ]);
      console.log(`  ✓ Synced patient ${pat.name} (${pat.phone}) to hospital ${pat.hospitalId}`);
    }

    // 5. Verification
    const countHosp = await pool.query('SELECT id, name, email FROM hospitals ORDER BY name');
    console.log('\n📊 Cleaned Active Hospitals:');
    console.table(countHosp.rows);

    const countPats = await pool.query('SELECT hospital_id, count(*) FROM hospital_patients GROUP BY hospital_id');
    console.log('\n📊 Patients per Hospital:');
    console.table(countPats.rows);

    console.log('\n✅ Step 1 Sanitization Complete!');
  } catch (err) {
    console.error('❌ Sanitization failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

runSanitization();
