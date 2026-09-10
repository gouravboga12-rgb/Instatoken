// Automated test suite for Location-Based Banner Management System
const http = require('http');

let app;
try {
  app = require('../server/index.js');
} catch (e) {
  console.error('Failed to import server:', e);
  process.exit(1);
}

const TEST_PORT = 5098;
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
  console.log('================================================================');
  console.log('LOCATION-BASED BANNER MANAGEMENT SYSTEM - AUTOMATED VERIFICATION');
  console.log('================================================================\n');

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
    // ── TEST SUITE 1: API Banner CRUD & Listing ───────────────────────────────
    console.log('── TEST SUITE 1: Admin Banner Management & CRUD ──');

    // 1. List all banners (Admin)
    const listRes = await makeRequest('GET', '/api/banners');
    assert(listRes.status === 200, 'GET /api/banners returns 200 OK');
    const allBanners = listRes.body.banners || listRes.body;
    assert(Array.isArray(allBanners), 'GET /api/banners returns an array of banners');
    assert(allBanners.length >= 4, `Pre-seeded banners exist (count: ${allBanners.length})`);

    // 2. Create a new District/Mandal/Village targeted banner
    const newBannerPayload = {
      title: 'Choppadandi Free Eye Checkup Camp',
      description: 'Specialist eye care screening for Choppadandi mandal residents at Community Health Center',
      imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
      linkUrl: '/search?specialty=ophthalmology',
      ctaText: 'Book Eye Token',
      badge: 'Free Screening',
      active: true,
      status: 'active',
      targetLevel: 'mandal',
      country: 'India',
      state: 'Telangana',
      district: 'Karimnagar',
      mandal: 'Choppadandi',
      village: '',
      priority: 15
    };

    const createRes = await makeRequest('POST', '/api/banners', {}, newBannerPayload);
    assert(createRes.status === 201, 'POST /api/banners creates a banner with status 201');
    const createdBannerId = createRes.body.id || createRes.body.banner?.id;
    assert(Boolean(createdBannerId), `Banner created with ID: ${createdBannerId}`);

    // 3. Update the created banner
    const updatePayload = {
      ...newBannerPayload,
      title: 'Choppadandi Free Comprehensive Eye & Vision Camp',
      badge: 'Updated Offer'
    };
    const updateRes = await makeRequest('PUT', `/api/banners/${createdBannerId}`, {}, updatePayload);
    assert(updateRes.status === 200, `PUT /api/banners/${createdBannerId} returns 200 OK`);
    const updatedTitle = updateRes.body.banner?.title || updateRes.body.title;
    assert(updatedTitle === 'Choppadandi Free Comprehensive Eye & Vision Camp', 'Banner title was successfully updated');

    // 4. Toggle banner status (active -> inactive)
    const toggleRes = await makeRequest('PATCH', `/api/banners/${createdBannerId}/status`, {}, { active: false });
    assert(toggleRes.status === 200, `PATCH /api/banners/${createdBannerId}/status returns 200`);
    const isDeactivated = (toggleRes.body.banner?.active === false) || (toggleRes.body.active === false);
    assert(isDeactivated, 'Banner active status set to false');

    // Reactivate for hierarchy testing
    await makeRequest('PATCH', `/api/banners/${createdBannerId}/status`, {}, { active: true });


    // ── TEST SUITE 2: Geographic Hierarchy & Strict Isolation ─────────────────
    console.log('\n── TEST SUITE 2: Geographic Hierarchy & Location Targeting Rules ──');

    // Scenario A: Customer in Karimnagar -> Choppadandi -> Gumlapur
    const choppadandiRes = await makeRequest(
      'GET', 
      '/api/banners/active?country=India&state=Telangana&district=Karimnagar&mandal=Choppadandi&village=Gumlapur'
    );
    assert(choppadandiRes.status === 200, 'GET /api/banners/active for Choppadandi returns 200 OK');
    const choppadandiBanners = choppadandiRes.body.banners || choppadandiRes.body;
    assert(Array.isArray(choppadandiBanners), 'Returned banners is an array');

    const hasIndiaInChoppadandi = choppadandiBanners.some(b => b.targetLevel === 'country');
    const hasTelanganaInChoppadandi = choppadandiBanners.some(b => b.targetLevel === 'state' && b.state?.toLowerCase().includes('telangana'));
    const hasKarimnagarInChoppadandi = choppadandiBanners.some(b => b.targetLevel === 'district' && b.district?.toLowerCase().includes('karimnagar'));
    const hasChoppadandiInChoppadandi = choppadandiBanners.some(b => b.targetLevel === 'mandal' && b.mandal?.toLowerCase().includes('choppadandi'));
    const hasWarangalInChoppadandi = choppadandiBanners.some(b => b.district?.toLowerCase().includes('warangal'));

    assert(hasIndiaInChoppadandi, 'Choppadandi customer receives Country banner (India)');
    assert(hasTelanganaInChoppadandi, 'Choppadandi customer receives State banner (Telangana)');
    assert(hasKarimnagarInChoppadandi, 'Choppadandi customer receives District banner (Karimnagar)');
    assert(hasChoppadandiInChoppadandi, 'Choppadandi customer receives Mandal banner (Choppadandi)');
    assert(!hasWarangalInChoppadandi, 'STRICT ISOLATION: Choppadandi customer does NOT receive Warangal banner');

    // Scenario B: Customer in Warangal -> Hanamkonda -> Kazipet
    const warangalRes = await makeRequest(
      'GET',
      '/api/banners/active?country=India&state=Telangana&district=Warangal&mandal=Hanamkonda&village=Kazipet'
    );
    assert(warangalRes.status === 200, 'GET /api/banners/active for Warangal returns 200 OK');
    const warangalBanners = warangalRes.body.banners || warangalRes.body;

    const hasIndiaInWarangal = warangalBanners.some(b => b.targetLevel === 'country');
    const hasTelanganaInWarangal = warangalBanners.some(b => b.targetLevel === 'state' && b.state?.toLowerCase().includes('telangana'));
    const hasWarangalInWarangal = warangalBanners.some(b => b.district?.toLowerCase().includes('warangal'));
    const hasKarimnagarInWarangal = warangalBanners.some(b => b.district?.toLowerCase().includes('karimnagar'));
    const hasChoppadandiInWarangal = warangalBanners.some(b => b.mandal?.toLowerCase().includes('choppadandi'));

    assert(hasIndiaInWarangal, 'Warangal customer receives Country banner (India)');
    assert(hasTelanganaInWarangal, 'Warangal customer receives State banner (Telangana)');
    assert(hasWarangalInWarangal, 'Warangal customer receives Warangal District banner');
    assert(!hasKarimnagarInWarangal, 'STRICT ISOLATION: Warangal customer does NOT receive Karimnagar District banner');
    assert(!hasChoppadandiInWarangal, 'STRICT ISOLATION: Warangal customer does NOT receive Choppadandi Mandal banner');

    // Scenario C: Customer in Bengaluru Urban (Karnataka)
    const blrRes = await makeRequest(
      'GET',
      '/api/banners/active?country=India&state=Karnataka&district=Bengaluru%20Urban&city=Bengaluru'
    );
    assert(blrRes.status === 200, 'GET /api/banners/active for Bengaluru returns 200 OK');
    const blrBanners = blrRes.body.banners || blrRes.body;

    const hasIndiaInBlr = blrBanners.some(b => b.targetLevel === 'country');
    const hasTelanganaInBlr = blrBanners.some(b => b.state?.toLowerCase().includes('telangana'));
    const hasKarimnagarInBlr = blrBanners.some(b => b.district?.toLowerCase().includes('karimnagar'));
    const hasWarangalInBlr = blrBanners.some(b => b.district?.toLowerCase().includes('warangal'));

    assert(hasIndiaInBlr, 'Bengaluru customer receives Country banner (India)');
    assert(!hasTelanganaInBlr, 'STRICT ISOLATION: Bengaluru customer does NOT receive Telangana state banner');
    assert(!hasKarimnagarInBlr, 'STRICT ISOLATION: Bengaluru customer does NOT receive Karimnagar banner');
    assert(!hasWarangalInBlr, 'STRICT ISOLATION: Bengaluru customer does NOT receive Warangal banner');


    // ── TEST SUITE 3: Date & Status Filtering Validation ─────────────────────
    console.log('\n── TEST SUITE 3: Date Validity & Active Status Filtering ──');

    // Create an expired banner
    const expiredBannerPayload = {
      title: 'Expired Past Medical Health Camp',
      description: 'Camp ended last week',
      imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
      active: true,
      status: 'active',
      targetLevel: 'state',
      country: 'India',
      state: 'Telangana',
      startDate: '2026-01-01',
      endDate: '2026-01-10' // in the past relative to 2026-09
    };
    const expiredRes = await makeRequest('POST', '/api/banners', {}, expiredBannerPayload);
    const expiredBannerId = expiredRes.body.id || expiredRes.body.banner?.id;

    // Create an inactive banner
    const inactiveBannerPayload = {
      title: 'Inactive Draft Banner',
      description: 'Draft banner not yet approved',
      imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
      active: false,
      status: 'inactive',
      targetLevel: 'country',
      country: 'India'
    };
    const inactiveRes = await makeRequest('POST', '/api/banners', {}, inactiveBannerPayload);
    const inactiveBannerId = inactiveRes.body.id || inactiveRes.body.banner?.id;

    // Check active banners in Telangana
    const telanganaActiveRes = await makeRequest('GET', '/api/banners/active?country=India&state=Telangana');
    const activeList = telanganaActiveRes.body.banners || telanganaActiveRes.body;

    const containsExpired = activeList.some(b => b.id === expiredBannerId);
    const containsInactive = activeList.some(b => b.id === inactiveBannerId);

    assert(!containsExpired, 'Expired banners (endDate < current date) are EXCLUDED from active banners');
    assert(!containsInactive, 'Inactive banners (active: false) are EXCLUDED from active banners');

    // Clean up created banners
    if (createdBannerId) await makeRequest('DELETE', `/api/banners/${createdBannerId}`);
    if (expiredBannerId) await makeRequest('DELETE', `/api/banners/${expiredBannerId}`);
    if (inactiveBannerId) await makeRequest('DELETE', `/api/banners/${inactiveBannerId}`);
    console.log('  Cleaned up temporary test banners.');

    // ── SUMMARY ─────────────────────────────────────────────────────────────
    console.log('\n================================================================');
    console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

// Start test server on dedicated port
server = http.createServer(app);
server.listen(TEST_PORT, () => {
  console.log(`Test server running on port ${TEST_PORT}...`);
  runTests().then(() => {
    server.close(() => {
      console.log('Test server shut down successfully.');
      process.exit(0);
    });
  }).catch((err) => {
    console.error('Test execution failed:', err);
    server.close(() => process.exit(1));
  });
});
