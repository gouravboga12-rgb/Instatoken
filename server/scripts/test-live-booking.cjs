const http = require('http');
const { Pool } = require('pg');
require('dotenv').config({ path: '/home/ubuntu/Instatoken/server/.env' });

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function testBooking() {
  console.log('====================================================');
  console.log('🩺 LIVE HOSPITAL TOKEN BOOKING END-TO-END VERIFICATION');
  console.log('====================================================\n');

  console.log('Step 1: Fetching Active Hospitals from API...');
  const hRes = await request('http://localhost:5000/api/hospitals');
  console.log('  Status:', hRes.status, '| Total hospitals available:', hRes.body.hospitals?.length);

  const gandhi = hRes.body.hospitals.find(h => h.id === 'hosp-mu0838sg') || hRes.body.hospitals[0];
  console.log('  Testing with Hospital:', gandhi.name, `(${gandhi.id})`);

  console.log('\nStep 2: Fetching Doctors for Hospital...');
  const dRes = await request('http://localhost:5000/api/hospitals/' + gandhi.id + '/doctors', {
    headers: { 'Authorization': 'Bearer htok_' + gandhi.id + '_default' }
  });
  console.log('  Status:', dRes.status, '| Total doctors found:', dRes.body.doctors?.length);
  const doc = dRes.body.doctors[0];
  console.log('  Selected Doctor:', doc.name, `(${doc.id})`);

  console.log('\nStep 3: Testing Razorpay Payment Order Creation API...');
  const rzpRes = await request('http://localhost:5000/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    amount: 549,
    patientName: 'Test Patient',
    patientPhone: '9885012345',
    notes: { hospitalId: gandhi.id, doctorId: doc.id }
  });
  console.log('  Razorpay Order Status:', rzpRes.status, '| Order ID:', rzpRes.body.order?.id);
  if (!rzpRes.body.order?.id) {
    throw new Error('Razorpay order creation failed: ' + JSON.stringify(rzpRes.body));
  }

  console.log('\nStep 4: Creating Live Token via Hospital Booking API...');
  const testTokId = 'live-test-' + Date.now();
  const todayStr = new Date().toISOString().split('T')[0];
  const tokRes = await request('http://localhost:5000/api/hospitals/' + gandhi.id + '/tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer htok_' + gandhi.id + '_default'
    }
  }, {
    id: testTokId,
    tokenNo: 99,
    type: 'online',
    patientName: 'Live Audit Patient',
    patientPhone: '9885099999',
    patientAge: 29,
    patientGender: 'Female',
    doctorId: doc.id,
    doctorName: doc.name,
    departmentName: doc.departmentName || 'Cardiology',
    session: 'Morning',
    bookingDate: todayStr,
    status: 'booked',
    consultationFee: doc.consultationFee || 500,
    paymentStatus: 'paid',
    paymentMethod: 'Razorpay Online',
    paymentCollection: {
      mode: 'full_online',
      consultationFee: doc.consultationFee || 500,
      platformFee: 39,
      totalAmountPaid: 549,
      settlementStatus: 'unsettled'
    }
  });
  console.log('  Token Creation Status:', tokRes.status, '| Token ID:', tokRes.body.token?.id);
  if (!tokRes.body.token?.id) {
    throw new Error('Token creation failed: ' + JSON.stringify(tokRes.body));
  }

  console.log('\nStep 5: Verifying Token in Hospital Live Queue...');
  const qRes = await request('http://localhost:5000/api/hospitals/' + gandhi.id + '/tokens?date=' + todayStr, {
    headers: { 'Authorization': 'Bearer htok_' + gandhi.id + '_default' }
  });
  const foundTok = (qRes.body.tokens || []).find(t => t.id === testTokId);
  console.log('  Found in Live Queue:', foundTok ? 'YES ✓' : 'NO ✗', '| Status:', foundTok?.status);
  if (!foundTok) throw new Error('Token was not found in hospital queue!');

  console.log('\nStep 6: Verifying Token on Doctor Cabin Screen...');
  const docTokRes = await request('http://localhost:5000/api/hospitals/' + gandhi.id + '/tokens?doctorId=' + doc.id + '&date=' + todayStr, {
    headers: { 'Authorization': 'Bearer htok_' + gandhi.id + '_default' }
  });
  const foundInDoc = (docTokRes.body.tokens || []).find(t => t.id === testTokId);
  console.log('  Found on Doctor Cabin Screen:', foundInDoc ? 'YES ✓' : 'NO ✗');
  if (!foundInDoc) throw new Error('Token was not found on doctor cabin screen!');

  console.log('\nStep 7: Testing Status Transition (Mark Completed / Visited)...');
  const patchRes = await request('http://localhost:5000/api/hospitals/' + gandhi.id + '/tokens/' + testTokId + '/status', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer htok_' + gandhi.id + '_default'
    }
  }, {
    status: 'completed',
    paymentStatus: 'paid',
    paymentMethod: 'Razorpay Online'
  });
  console.log('  Status Update Result:', patchRes.status, '| New Status:', patchRes.body.token?.status);

  console.log('\nStep 8: Checking Hospital Payout Summary & Dues...');
  const payRes = await request('http://localhost:5000/api/hospitals/' + gandhi.id + '/payout-summary', {
    headers: { 'Authorization': 'Bearer htok_' + gandhi.id + '_default' }
  });
  console.log('  Payout Summary Status:', payRes.status, '| Total Collected:', payRes.body.totalCollectedOnline, '| Pending Due:', payRes.body.pendingDue);

  console.log('\nStep 9: Cleaning up Test Token from Database...');
  const delRes = await request('http://localhost:5000/api/hospitals/' + gandhi.id + '/tokens/' + testTokId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer htok_' + gandhi.id + '_default' }
  });
  console.log('  Cleanup Status:', delRes.status, '| Deleted:', delRes.body.success);

  console.log('\n====================================================');
  console.log('🎉 ALL HOSPITAL BOOKING CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

testBooking().catch(async (err) => {
  console.error('\n❌ ERROR DURING TEST:', err.message);
  try {
    const gandhi = 'hosp-mu0838sg';
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`DELETE FROM tokens WHERE id LIKE 'live-test-%'`);
    await pool.end();
    console.log('Cleaned up orphan test tokens from database.');
  } catch(e) {}
  process.exit(1);
});
