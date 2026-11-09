const { Pool } = require('pg');
require('dotenv').config({ path: '/home/ubuntu/Instatoken/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const BASE_URL = 'http://localhost:5000';
const HOSP_ID = 'hosp-mu0838sg';
const AUTH_HEADER = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer htok_hosp-mu0838sg_default'
};

const TEST_DATE = '2026-11-10'; // Specific target day

async function runTest() {
  console.log('====================================================');
  console.log('🩺 HOSPITAL PANEL DOCTOR SCREEN & TOKEN FLOW AUDIT');
  console.log(`Hospital ID: ${HOSP_ID} | Test Date: ${TEST_DATE}`);
  console.log('====================================================\n');

  const errors = [];
  const testTokenIds = [];

  try {
    // 1. Fetch Gandhi Hospital Doctors from DB
    console.log('Step 1: Fetching Doctors for Hospital...');
    const docRes = await pool.query(
      `SELECT id, name, department_name FROM hospital_doctors WHERE hospital_id = $1 ORDER BY name ASC`,
      [HOSP_ID]
    );

    const doctors = docRes.rows;
    console.log(`Found ${doctors.length} doctors:`);
    doctors.forEach(d => console.log(`  - [${d.id}] ${d.name} (${d.department_name})`));

    if (doctors.length < 2) {
      throw new Error(`Insufficient doctors found for test: ${doctors.length}`);
    }

    const doc1 = doctors[0]; // e.g. Dr. Mamitha or Dr. Vignesh
    const doc2 = doctors[1]; // second doctor

    console.log(`\nSelected Doctor 1: ${doc1.name} (${doc1.id})`);
    console.log(`Selected Doctor 2: ${doc2.name} (${doc2.id})`);

    // 2. Generate Session Tokens for Doctor 1 & Doctor 2
    console.log('\nStep 2: Creating Test Tokens across Sessions (Morning, Afternoon, Evening)...');

    const tokensToCreate = [
      {
        id: `test-flow-tok-1-${Date.now()}`,
        tokenNo: 1,
        type: 'online',
        patientName: 'Test Patient Morn 1',
        patientPhone: '9885001111',
        patientAge: 30,
        patientGender: 'Male',
        doctorId: doc1.id,
        doctorName: doc1.name,
        departmentId: 'dept-general',
        departmentName: doc1.department_name || 'General',
        session: 'morning',
        time: 'Morning OPD (09:00 AM - 01:00 PM)',
        bookingDate: TEST_DATE,
        status: 'booked',
        consultationFee: 500,
        paymentStatus: 'pending',
        hospitalId: HOSP_ID
      },
      {
        id: `test-flow-tok-2-${Date.now()}`,
        tokenNo: 2,
        type: 'offline',
        patientName: 'Test Patient Morn 2',
        patientPhone: '9885002222',
        patientAge: 45,
        patientGender: 'Female',
        doctorId: doc1.id,
        doctorName: doc1.name,
        departmentId: 'dept-general',
        departmentName: doc1.department_name || 'General',
        session: 'morning',
        time: '10:30 AM',
        bookingDate: TEST_DATE,
        status: 'waiting',
        consultationFee: 500,
        paymentStatus: 'paid',
        hospitalId: HOSP_ID
      },
      {
        id: `test-flow-tok-3-${Date.now()}`,
        tokenNo: 3,
        type: 'online',
        patientName: 'Test Patient Aft 1',
        patientPhone: '9885003333',
        patientAge: 28,
        patientGender: 'Male',
        doctorId: doc1.id,
        doctorName: doc1.name,
        departmentId: 'dept-general',
        departmentName: doc1.department_name || 'General',
        session: 'afternoon',
        time: 'Afternoon OPD (01:00 PM - 05:00 PM)',
        bookingDate: TEST_DATE,
        status: 'booked',
        consultationFee: 500,
        paymentStatus: 'pending',
        hospitalId: HOSP_ID
      },
      {
        id: `test-flow-tok-4-${Date.now()}`,
        tokenNo: 4,
        type: 'online',
        patientName: 'Test Patient Eve 1',
        patientPhone: '9885004444',
        patientAge: 52,
        patientGender: 'Female',
        doctorId: doc1.id,
        doctorName: doc1.name,
        departmentId: 'dept-general',
        departmentName: doc1.department_name || 'General',
        session: 'evening',
        time: 'Evening OPD (05:00 PM - 09:00 PM)',
        bookingDate: TEST_DATE,
        status: 'booked',
        consultationFee: 500,
        paymentStatus: 'pending',
        hospitalId: HOSP_ID
      },
      // Doctor 2 tokens (to test cabin isolation)
      {
        id: `test-flow-tok-5-${Date.now()}`,
        tokenNo: 1,
        type: 'online',
        patientName: 'Test Patient Doc2 Morn 1',
        patientPhone: '9885005555',
        patientAge: 35,
        patientGender: 'Male',
        doctorId: doc2.id,
        doctorName: doc2.name,
        departmentId: 'dept-general',
        departmentName: doc2.department_name || 'General',
        session: 'morning',
        time: 'Morning OPD (09:00 AM - 01:00 PM)',
        bookingDate: TEST_DATE,
        status: 'booked',
        consultationFee: 600,
        paymentStatus: 'pending',
        hospitalId: HOSP_ID
      },
      {
        id: `test-flow-tok-6-${Date.now()}`,
        tokenNo: 2,
        type: 'offline',
        patientName: 'Test Patient Doc2 Aft 1',
        patientPhone: '9885006666',
        patientAge: 40,
        patientGender: 'Female',
        doctorId: doc2.id,
        doctorName: doc2.name,
        departmentId: 'dept-general',
        departmentName: doc2.department_name || 'General',
        session: 'afternoon',
        time: '02:00 PM',
        bookingDate: TEST_DATE,
        status: 'booked',
        consultationFee: 600,
        paymentStatus: 'paid',
        hospitalId: HOSP_ID
      }
    ];

    for (const t of tokensToCreate) {
      testTokenIds.push(t.id);
      const postRes = await fetch(`${BASE_URL}/api/hospitals/${HOSP_ID}/tokens`, {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify(t)
      });
      const data = await postRes.json();
      if (!data.success) {
        errors.push(`Failed to create token ${t.id}: ${data.message || JSON.stringify(data)}`);
      } else {
        console.log(`  ✓ Created token ${t.tokenNo} for ${t.doctorName} [Session: ${t.session}] (ID: ${t.id})`);
      }
    }

    // 3. Test API Filtering for Doctor 1
    console.log('\nStep 3: Testing Doctor Isolation & Session Filtering API...');
    
    // 3a. Doctor 1 - All tokens
    const doc1Res = await fetch(`${BASE_URL}/api/hospitals/${HOSP_ID}/tokens?doctorId=${doc1.id}&date=${TEST_DATE}`, {
      headers: AUTH_HEADER
    });
    const doc1Data = await doc1Res.json();
    const doc1Tokens = (doc1Data.tokens || []).filter(t => t.id.startsWith('test-flow-tok-'));
    console.log(`  Doctor 1 tokens returned: ${doc1Tokens.length} (Expected: 4)`);
    if (doc1Tokens.length !== 4) {
      errors.push(`Doctor 1 token count mismatch: got ${doc1Tokens.length}, expected 4`);
    }
    // Check isolation: zero doc2 tokens in doc1 list
    const leakedDoc2 = doc1Tokens.filter(t => t.doctorId === doc2.id);
    if (leakedDoc2.length > 0) {
      errors.push(`CRITICAL: Doctor 2 tokens leaked into Doctor 1 screen: ${leakedDoc2.map(t => t.id).join(', ')}`);
    } else {
      console.log(`  ✓ Doctor cabin isolation verified: 0 leaked tokens.`);
    }

    // 3b. Doctor 1 - Morning Session filter (case-insensitive test)
    for (const sessionQuery of ['morning', 'Morning', 'MORNING']) {
      const mornRes = await fetch(`${BASE_URL}/api/hospitals/${HOSP_ID}/tokens?doctorId=${doc1.id}&date=${TEST_DATE}&session=${sessionQuery}`, {
        headers: AUTH_HEADER
      });
      const mornData = await mornRes.json();
      const mornTokens = (mornData.tokens || []).filter(t => t.id.startsWith('test-flow-tok-'));
      console.log(`  Doctor 1 session='${sessionQuery}' tokens returned: ${mornTokens.length} (Expected: 2)`);
      if (mornTokens.length !== 2) {
        errors.push(`Session query '${sessionQuery}' failed: returned ${mornTokens.length} tokens instead of 2. Possible case-sensitivity bug!`);
      }
    }

    // 3c. Doctor 1 - Afternoon Session filter
    const aftRes = await fetch(`${BASE_URL}/api/hospitals/${HOSP_ID}/tokens?doctorId=${doc1.id}&date=${TEST_DATE}&session=afternoon`, {
      headers: AUTH_HEADER
    });
    const aftData = await aftRes.json();
    const aftTokens = (aftData.tokens || []).filter(t => t.id.startsWith('test-flow-tok-'));
    console.log(`  Doctor 1 session='afternoon' tokens returned: ${aftTokens.length} (Expected: 1)`);
    if (aftTokens.length !== 1) {
      errors.push(`Afternoon session filter failed: returned ${aftTokens.length} instead of 1`);
    }

    // 3d. Doctor 1 - Evening Session filter
    const eveRes = await fetch(`${BASE_URL}/api/hospitals/${HOSP_ID}/tokens?doctorId=${doc1.id}&date=${TEST_DATE}&session=evening`, {
      headers: AUTH_HEADER
    });
    const eveData = await eveRes.json();
    const eveTokens = (eveData.tokens || []).filter(t => t.id.startsWith('test-flow-tok-'));
    console.log(`  Doctor 1 session='evening' tokens returned: ${eveTokens.length} (Expected: 1)`);
    if (eveTokens.length !== 1) {
      errors.push(`Evening session filter failed: returned ${eveTokens.length} instead of 1`);
    }

    // 3e. Date Filter Test: Querying a different date should return 0 test tokens
    const diffDateRes = await fetch(`${BASE_URL}/api/hospitals/${HOSP_ID}/tokens?doctorId=${doc1.id}&date=2026-11-15`, {
      headers: AUTH_HEADER
    });
    const diffDateData = await diffDateRes.json();
    const diffDateTokens = (diffDateData.tokens || []).filter(t => t.id.startsWith('test-flow-tok-'));
    console.log(`  Different date query returned: ${diffDateTokens.length} test tokens (Expected: 0)`);
    if (diffDateTokens.length !== 0) {
      errors.push(`Date filter failure: Tokens from ${TEST_DATE} returned when querying 2026-11-15!`);
    } else {
      console.log(`  ✓ Date filter isolation verified.`);
    }

    // 4. Test Token Status Transitions
    console.log('\nStep 4: Testing Token Action Status Transitions (Call -> Consult -> Complete)...');
    const targetTokenId = tokensToCreate[0].id; // Test Patient Morn 1

    // 4a. Call Patient (checked-in)
    const callRes = await fetch(`${BASE_URL}/api/hospitals/${HOSP_ID}/tokens/${targetTokenId}/status`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: JSON.stringify({ status: 'checked-in' })
    });
    const callData = await callRes.json();
    if (!callData.success || callData.token?.status !== 'checked-in') {
      errors.push(`Call patient status transition failed: ${JSON.stringify(callData)}`);
    } else {
      console.log(`  ✓ Token status updated to 'checked-in' (calling patient)`);
    }

    // 4b. Complete Consultation & Collect Payment
    const compRes = await fetch(`${BASE_URL}/api/hospitals/${HOSP_ID}/tokens/${targetTokenId}/status`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: JSON.stringify({ status: 'completed', paymentStatus: 'paid', paymentMethod: 'Cash' })
    });
    const compData = await compRes.json();
    if (!compData.success || compData.token?.status !== 'completed' || compData.token?.paymentStatus !== 'paid') {
      errors.push(`Complete consultation status/payment transition failed: ${JSON.stringify(compData)}`);
    } else {
      console.log(`  ✓ Token status updated to 'completed' & payment marked 'paid' via Cash`);
    }

    // 5. Audit PostgreSQL DB Tables
    console.log('\nStep 5: Auditing PostgreSQL Database Rows...');
    const dbRowsRes = await pool.query(
      `SELECT id, token_number, doctor_id, session, token_date, status FROM tokens WHERE id = ANY($1::varchar[])`,
      [testTokenIds]
    );
    console.log(`  PostgreSQL 'tokens' table persisted: ${dbRowsRes.rows.length} / ${testTokenIds.length} records`);
    if (dbRowsRes.rows.length !== testTokenIds.length) {
      errors.push(`Database persistence mismatch: Only ${dbRowsRes.rows.length} of ${testTokenIds.length} tokens found in PostgreSQL table.`);
    }

  } catch (err) {
    errors.push(`Runtime test exception: ${err.message}`);
  } finally {
    // 6. CLEAN UP TEST DATA
    console.log('\nStep 6: Cleaning up & Deleting all Test Data...');
    if (testTokenIds.length > 0) {
      try {
        await pool.query(`DELETE FROM tokens WHERE id = ANY($1::varchar[])`, [testTokenIds]);
        await pool.query(`DELETE FROM appointments WHERE id = ANY($1::varchar[])`, [testTokenIds]);

        // Also clean up from sync_store
        const storeRes = await pool.query(`SELECT data FROM sync_store WHERE key = 'global_store'`);
        if (storeRes.rows.length > 0) {
          const store = storeRes.rows[0].data;
          const testIdSet = new Set(testTokenIds);
          store.tokens = (store.tokens || []).filter(t => !testIdSet.has(t.id));
          store.appointments = (store.appointments || []).filter(a => !testIdSet.has(a.id));
          await pool.query(
            `UPDATE sync_store SET data = $1, last_updated = NOW() WHERE key = 'global_store'`,
            [JSON.stringify(store)]
          );
        }
        console.log(`  ✓ Successfully deleted ${testTokenIds.length} test tokens from PostgreSQL & sync_store.`);
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr.message);
      }
    }

    await pool.end();
  }

  console.log('\n====================================================');
  console.log('AUDIT RESULT SUMMARY:');
  console.log('====================================================');
  if (errors.length === 0) {
    console.log('🎉 ALL TESTS PASSED! No errors found.');
  } else {
    console.log(`⚠️ FOUND ${errors.length} ISSUE(S):`);
    errors.forEach((e, idx) => console.log(`  ${idx + 1}. ${e}`));
  }
}

runTest();
