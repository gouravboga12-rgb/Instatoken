const BASE_URL = 'http://localhost:5000';

async function runMultiHospitalAudit() {
  console.log('====================================================');
  console.log('🏢 MULTI-TENANT HOSPITAL PANEL ISOLATION AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    const hospA = 'hosp-mu0838sg'; // Gandi Hospital
    const hospB = 'hosp-mwf0pf8a'; // Anitha
    const tokenA = `htok_${hospA}_default`;
    const tokenB = `htok_${hospB}_default`;

    // 1. Hospital A Doctors Isolation
    console.log('Test 1: Hospital A (Gandi Hospital) Doctors Isolation');
    const docResA = await fetch(`${BASE_URL}/api/hospitals/${hospA}/doctors`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const docDataA = await docResA.json();
    assert(docDataA.success && Array.isArray(docDataA.doctors), 'Hospital A doctors API responds successfully');
    assert(docDataA.doctors.some(d => d.name === 'Dr Vignesh' || d.name === 'Dr. Nikhil'), 'Hospital A contains Dr. Vignesh and Dr. Nikhil');
    assert(!docDataA.doctors.some(d => d.id === 'doc-arvind'), 'Hospital A does NOT leak Apollo demo doctors (Dr. Arvind)');

    // 2. Hospital A Patients Isolation
    console.log('\nTest 2: Hospital A Patients & PostgreSQL Persistence');
    const patResA = await fetch(`${BASE_URL}/api/hospitals/${hospA}/patients`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const patDataA = await patResA.json();
    assert(patDataA.success && Array.isArray(patDataA.patients), 'Hospital A patients API responds successfully');
    assert(patDataA.patients.length >= 8, `Hospital A returns its persisted patients (count: ${patDataA.patients.length})`);
    assert(patDataA.patients.some(p => p.name === 'Gourav Boga'), 'Hospital A patient records contain Gourav Boga');

    // 3. Hospital A Revenue Engine (No Apollo Fallback)
    console.log('\nTest 3: Hospital A Revenue Calculation Doctor Scoping');
    const revResA = await fetch(`${BASE_URL}/api/hospitals/${hospA}/revenue?filter=all`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const revDataA = await revResA.json();
    assert(revDataA.success && revDataA.doctorStats, 'Hospital A revenue API responds with doctorStats');
    assert(!revDataA.doctorStats.some(s => s.doctor?.id === 'doc-arvind'), 'Hospital A revenue does NOT fall back to Apollo doctors');
    assert(revDataA.doctorStats.some(s => s.doctor?.name === 'Dr Vignesh' || s.doctor?.name === 'Dr.Mamitha'), 'Hospital A revenue calculated against Gandi Hospital doctors');

    // 4. Hospital Doctor References Endpoint
    console.log('\nTest 4: Hospital Doctor References API');
    const testRef = {
      name: 'Dr. Test Reference RMP',
      phone: '9988776655',
      place: 'Hyderabad',
      notes: 'Automated Test Reference'
    };
    const postRefRes = await fetch(`${BASE_URL}/api/hospitals/${hospA}/doctor-references`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: testRef })
    });
    const postRefData = await postRefRes.json();
    assert(postRefData.success && Array.isArray(postRefData.references), 'Doctor reference added successfully');

    const getRefRes = await fetch(`${BASE_URL}/api/hospitals/${hospA}/doctor-references`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const getRefData = await getRefRes.json();
    assert(getRefData.success && getRefData.references.some(r => r.name === 'Dr. Test Reference RMP'), 'Doctor reference retrieved accurately');

    // Clean up test reference
    const createdRef = getRefData.references.find(r => r.name === 'Dr. Test Reference RMP');
    if (createdRef) {
      await fetch(`${BASE_URL}/api/hospitals/${hospA}/doctor-references/${createdRef.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` }
      });
      console.log('  ✓ Cleaned up test doctor reference');
    }

    // 5. Cross-Tenant Security Access Control (Hospital B trying to access Hospital A)
    console.log('\nTest 5: Cross-Tenant Security & 403 Forbidden Enforcement');
    const attackRes = await fetch(`${BASE_URL}/api/hospitals/${hospA}/tokens`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(attackRes.status === 403, 'Hospital B token blocked from accessing Hospital A tokens with HTTP 403');
    const attackData = await attackRes.json();
    assert(attackData.code === 'ACCESS_FORBIDDEN', 'Server responds with ACCESS_FORBIDDEN error code');

    const attackPatRes = await fetch(`${BASE_URL}/api/hospitals/${hospA}/patients`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(attackPatRes.status === 403, 'Hospital B token blocked from accessing Hospital A patients with HTTP 403');

    // 6. Hospital B Own Isolation
    console.log('\nTest 6: Hospital B Own Domain Scoping');
    const hospBTokensRes = await fetch(`${BASE_URL}/api/hospitals/${hospB}/tokens`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const hospBTokens = await hospBTokensRes.json();
    assert(hospBTokens.success, 'Hospital B can query its own tokens');
    assert(!hospBTokens.tokens.some(t => t.hospitalId === hospA), 'Hospital B does not see any tokens from Hospital A');

    console.log('\n====================================================');
    console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runMultiHospitalAudit();
