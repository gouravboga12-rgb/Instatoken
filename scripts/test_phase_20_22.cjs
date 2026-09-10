// Automated test suite for Phase 20, 21, and 22
const http = require('http');

let app;
try {
  app = require('../server/index.js');
} catch (e) {
  console.error('Failed to import server:', e);
  process.exit(1);
}

const TEST_PORT = 5099;
let server;

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 20, 21 & 22 AUTOMATED VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    await new Promise(r => setTimeout(r, 1200));

    // 1. PHASE 22: AUTHENTICATION & LOGIN
    console.log('--- TEST 1: Hospital Authentication & Sessions ---');
    const apolloLogin = await makeRequest('POST', '/api/auth/hospital-login', {}, {
      email: 'admin@apollo.com',
      password: 'password'
    });
    const apolloToken = apolloLogin.body?.token;
    assert(!!apolloToken, `Apollo login succeeded and returned session token: ${apolloToken?.substring(0, 12)}...`);

    const fortisLogin = await makeRequest('POST', '/api/auth/hospital-login', {}, {
      email: 'admin@fortis.com',
      password: 'password'
    });
    const fortisToken = fortisLogin.body?.token;
    assert(!!fortisToken, `Fortis login succeeded and returned session token: ${fortisToken?.substring(0, 12)}...`);

    // 2. PHASE 22: STRICT ACCESS CONTROL & AUTHORIZATION (401 & 403 CHECKS)
    console.log('\n--- TEST 2: Phase 22 Access Control & Security ---');
    
    // 2a. Unauthenticated access blocked with 401
    const unauthRes = await makeRequest('GET', '/api/hospitals/hosp-apollo/patients');
    assert(unauthRes.status === 401, `Unauthenticated request blocked with 401 Unauthorized (got ${unauthRes.status})`);

    // 2b. Authorized access allowed with 200
    const authRes = await makeRequest('GET', '/api/hospitals/hosp-apollo/patients', {
      Authorization: `Bearer ${apolloToken}`
    });
    assert(authRes.status === 200, `Authorized hospital request succeeded with 200 OK (got ${authRes.status})`);

    // 2c. Cross-hospital access blocked with 403 Forbidden!
    const crossAccessRes = await makeRequest('GET', '/api/hospitals/hosp-fortis/patients', {
      Authorization: `Bearer ${apolloToken}`
    });
    assert(crossAccessRes.status === 403, `Cross-hospital patient access blocked with 403 Forbidden (got ${crossAccessRes.status})`);
    assert(crossAccessRes.body?.code === 'CROSS_HOSPITAL_FORBIDDEN', `Error code is CROSS_HOSPITAL_FORBIDDEN`);

    // 2d. Cross-hospital revenue check blocked with 403 Forbidden!
    const crossRevRes = await makeRequest('GET', '/api/hospitals/hosp-fortis/revenue', {
      Authorization: `Bearer ${apolloToken}`
    });
    assert(crossRevRes.status === 403, `Cross-hospital revenue access blocked with 403 Forbidden (got ${crossRevRes.status})`);

    // 2e. Cross-hospital token creation blocked with 403 Forbidden!
    const crossTokenRes = await makeRequest('POST', '/api/hospitals/hosp-fortis/tokens', {
      Authorization: `Bearer ${apolloToken}`
    }, { patientName: 'Malicious Intruder' });
    assert(crossTokenRes.status === 403, `Cross-hospital token issuance blocked with 403 Forbidden (got ${crossTokenRes.status})`);

    // 3. PHASE 20: PATIENTS PAGE & RELATIONAL CHAIN
    console.log('\n--- TEST 3: Phase 20 Patients Relational Management ---');
    
    // Register patient under Apollo with linked attending doctor
    const newPatientPayload = {
      uhid: 'UHID-TST-001',
      name: 'Ramesh Sharma',
      age: 45,
      gender: 'Male',
      phone: '9876543210',
      address: 'Jayanagar, Bengaluru',
      emergencyContact: '9876543211',
      bloodGroup: 'B+',
      doctorId: 'doc-apollo-1',
      doctorName: 'Dr. Priya Sharma',
      departmentName: 'Cardiology',
      tokenNo: 101,
      tokenId: 'tok-tst-101'
    };
    const regPatientRes = await makeRequest('POST', '/api/hospitals/hosp-apollo/patients', {
      Authorization: `Bearer ${apolloToken}`
    }, newPatientPayload);
    assert(regPatientRes.status === 201 || regPatientRes.status === 200, `Patient registered successfully under hosp-apollo (got ${regPatientRes.status})`);

    // Fetch Apollo patients and verify doctor visits summary
    const patientsList = await makeRequest('GET', '/api/hospitals/hosp-apollo/patients', {
      Authorization: `Bearer ${apolloToken}`
    });
    const foundPatient = (patientsList.body?.patients || []).find(p => p.phone === '9876543210');
    assert(!!foundPatient, `Registered patient found in hosp-apollo patients list`);
    assert(foundPatient?.hospitalId === 'hosp-apollo', `Patient belongs to hosp-apollo`);
    assert(Array.isArray(foundPatient?.doctorVisits), `Patient has doctorVisits aggregation array`);
    const docVisit = foundPatient?.doctorVisits?.find(v => v.doctorId === 'doc-apollo-1');
    assert(!!docVisit && docVisit.visitCount >= 1, `Doctor visit recorded under attending doctor Dr. Priya Sharma`);

    // Verify Data Isolation: Fortis patients list must NOT contain Ramesh Sharma
    const fortisPatientsList = await makeRequest('GET', '/api/hospitals/hosp-fortis/patients', {
      Authorization: `Bearer ${fortisToken}`
    });
    const leakedPatient = (fortisPatientsList.body?.patients || []).find(p => p.phone === '9876543210');
    assert(!leakedPatient, `Fortis cannot see Apollo's patient (Complete Data Isolation confirmed)`);

    // Test Doctor Filter on Patients API
    const docFilterRes = await makeRequest('GET', '/api/hospitals/hosp-apollo/patients?doctorId=doc-apollo-1', {
      Authorization: `Bearer ${apolloToken}`
    });
    const allMatchDoc = (docFilterRes.body?.patients || []).every(p => 
      (p.doctorVisits || []).some(v => v.doctorId === 'doc-apollo-1') || p.doctorId === 'doc-apollo-1'
    );
    assert(allMatchDoc, `Filtering by doctorId returns only patients linked to that doctor`);

    // 4. PHASE 21: BACKEND/DATA INTEGRITY & SERVER-SIDE REVENUE
    console.log('\n--- TEST 4: Phase 21 Backend Data Integrity & Server-Side Revenue ---');
    
    // Create token in Apollo for Dr. Priya Sharma
    const tokenPayload = {
      tokenNo: 102,
      type: 'offline',
      patientName: 'Anita Rao',
      patientPhone: '9988776655',
      patientAge: 32,
      patientGender: 'Female',
      doctorId: 'doc-apollo-1',
      doctorName: 'Dr. Priya Sharma',
      departmentId: 'dept-apollo-cardio',
      departmentName: 'Cardiology',
      session: 'morning',
      time: '10:30 AM',
      bookingDate: new Date().toISOString().split('T')[0],
      status: 'completed',
      consultationFee: 800,
      paymentStatus: 'paid',
      paymentMethod: 'UPI'
    };
    const createTokenRes = await makeRequest('POST', '/api/hospitals/hosp-apollo/tokens', {
      Authorization: `Bearer ${apolloToken}`
    }, tokenPayload);
    assert(createTokenRes.status === 201, `Token created via backend endpoint with full relational metadata (status 201)`);
    const createdTokenId = createTokenRes.body?.token?.id;

    // Call backend revenue calculation endpoint (server-side, not frontend-only)
    const revRes = await makeRequest('GET', '/api/hospitals/hosp-apollo/revenue?period=all', {
      Authorization: `Bearer ${apolloToken}`
    });
    assert(revRes.status === 200, `Revenue calculation endpoint returned 200 OK`);
    assert(revRes.body?.totals !== undefined, `Revenue response includes calculated totals`);
    assert(typeof revRes.body?.totals?.totalRevenue === 'number', `totalRevenue is calculated on backend (${revRes.body?.totals?.totalRevenue})`);
    assert(Array.isArray(revRes.body?.doctorStats), `Revenue includes doctor-wise breakdown array`);

    const priyaStats = revRes.body?.doctorStats?.find(d => d.doctorId === 'doc-apollo-1');
    assert(!!priyaStats, `Dr. Priya Sharma doctorStats present in server-side revenue calculation`);
    assert(priyaStats?.totalTokens >= 1, `Doctor stats has accurate token count (tokens: ${priyaStats?.totalTokens})`);
    assert(priyaStats?.completedVisits >= 1, `Doctor stats has accurate completed consultation count (completed: ${priyaStats?.completedVisits})`);
    assert(priyaStats?.earnedRevenue >= 800, `Doctor stats earned revenue reflects completed visits (₹${priyaStats?.earnedRevenue})`);

    // 5. PARTITIONED SYNC
    console.log('\n--- TEST 5: Partitioned /api/sync Data Isolation ---');
    const syncRes = await makeRequest('GET', '/api/sync?hospitalId=hosp-apollo', {
      Authorization: `Bearer ${apolloToken}`
    });
    assert(syncRes.status === 200, `Partitioned sync returned 200 OK`);
    const syncPatients = syncRes.body?.data?.hospitalPatients || [];
    const allApollo = syncPatients.every(p => !p.hospitalId || p.hospitalId === 'hosp-apollo');
    assert(allApollo, `All synced patients in slice belong strictly to hosp-apollo`);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    return failed === 0;
  } catch (err) {
    console.error('Test execution error:', err);
    return false;
  }
}

server = app.listen(TEST_PORT, async () => {
  console.log(`Test server running on port ${TEST_PORT}`);
  const ok = await runTests();
  server.close(() => {
    console.log('Test server closed.');
    process.exit(ok ? 0 : 1);
  });
});
