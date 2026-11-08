const { io } = require('socket.io-client');
const http = require('https');

const SERVER_URL = 'https://16.113.86.236.nip.io';
const HOSPITAL_ID = 'hosp-gandhi';

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const url = new URL(path, SERVER_URL);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      rejectUnauthorized: false
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function patchJson(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const url = new URL(path, SERVER_URL);
    const req = http.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-hospital-token': `htok_${HOSPITAL_ID}_default`
      },
      rejectUnauthorized: false
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log(`\n======================================================`);
  console.log(`🧪 TESTING GANDHI HOSPITAL DOCTOR SCREENS (REAL-TIME)`);
  console.log(`Target: ${SERVER_URL}`);
  console.log(`Hospital: ${HOSPITAL_ID}`);
  console.log(`======================================================\n`);

  // Step 1: Connect Socket.io client (mimicking Doctor Token Screen)
  console.log('📡 [Step 1] Connecting Doctor Screen Socket.io client...');
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    rejectUnauthorized: false
  });

  const receivedEvents = [];

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket connection timed out')), 8000);
    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log(`✅ Doctor Screen Socket connected (ID: ${socket.id})`);
      socket.emit('join_hospital', { hospitalId: HOSPITAL_ID });
      console.log(`🏨 Joined hospital room: ${HOSPITAL_ID}`);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  socket.on('token_booked', (token) => {
    console.log(`⚡ [LIVE EVENT] token_booked received for Dr. ${token.doctorName} (Token #${token.tokenNo || token.tokenNumber})`);
    receivedEvents.push({ type: 'token_booked', token });
  });

  socket.on('token_status_changed', (token) => {
    console.log(`⚡ [LIVE EVENT] token_status_changed received -> Status: "${token.status}" (Token #${token.tokenNo || token.tokenNumber})`);
    receivedEvents.push({ type: 'token_status_changed', token });
  });

  socket.on('token_session_shifted', (token) => {
    console.log(`⚡ [LIVE EVENT] token_session_shifted received -> Session: "${token.session}" (Token #${token.tokenNo || token.tokenNumber})`);
    receivedEvents.push({ type: 'token_session_shifted', token });
  });

  // Step 2: Book test token for Dr. V. Ramesh (doc-gandhi-101)
  console.log('\n🧑‍⚕️ [Step 2] Booking test appointment for Dr. V. Ramesh (General Medicine)...');
  const appt1Id = `appt-${Date.now()}`;
  const appointmentPayload = {
    id: appt1Id,
    tokenNumber: '1',
    hospitalId: HOSPITAL_ID,
    hospitalName: 'Gandhi Hospital',
    doctorId: 'doc-gandhi-101',
    doctorName: 'Dr. V. Ramesh',
    departmentName: 'General Medicine',
    patientName: 'Test Patient Ramesh',
    phone: '+919876543210',
    age: 32,
    gender: 'Male',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    fee: 250,
    paymentStatus: 'paid'
  };

  const bookRes = await postJson('/api/appointments', appointmentPayload);
  console.log('API Response status:', bookRes.status);
  console.log('Booked Appointment ID:', bookRes.data?.appointment?.id || bookRes.data?.id || appt1Id);

  // Wait 1.5s for real-time delivery
  await new Promise(r => setTimeout(r, 1500));

  // Step 3: Book test token for Dr. Sunita Rao (doc-gandhi-102, Cardiology)
  console.log('\n🧑‍⚕️ [Step 3] Booking test appointment for Dr. Sunita Rao (Cardiology)...');
  const appt2Id = `appt-${Date.now() + 1}`;
  const cardioPayload = {
    id: appt2Id,
    tokenNumber: '1',
    hospitalId: HOSPITAL_ID,
    hospitalName: 'Gandhi Hospital',
    doctorId: 'doc-gandhi-102',
    doctorName: 'Dr. Sunita Rao',
    departmentName: 'Cardiology',
    patientName: 'Heart Patient Sharma',
    phone: '+919876543211',
    age: 48,
    gender: 'Female',
    date: new Date().toISOString().split('T')[0],
    time: '11:30',
    fee: 400,
    paymentStatus: 'paid'
  };

  const bookRes2 = await postJson('/api/appointments', cardioPayload);
  console.log('API Response status:', bookRes2.status);
  console.log('Booked Appointment ID:', appt2Id);
  await new Promise(r => setTimeout(r, 1500));

  // Step 4: Book test token for Dr. K. Srinivas (doc-gandhi-103, Pediatrics)
  console.log('\n🧑‍⚕️ [Step 4] Booking test appointment for Dr. K. Srinivas (Pediatrics)...');
  const appt3Id = `appt-${Date.now() + 2}`;
  const pediaPayload = {
    id: appt3Id,
    tokenNumber: '1',
    hospitalId: HOSPITAL_ID,
    hospitalName: 'Gandhi Hospital',
    doctorId: 'doc-gandhi-103',
    doctorName: 'Dr. K. Srinivas',
    departmentName: 'Pediatrics',
    patientName: 'Baby Aarav',
    phone: '+919876543212',
    age: 4,
    gender: 'Male',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    fee: 200,
    paymentStatus: 'paid'
  };

  await postJson('/api/appointments', pediaPayload);
  await new Promise(r => setTimeout(r, 1500));

  // Step 5: Book test token for Dr. P. Anitha (doc-gandhi-104, Orthopedics)
  console.log('\n🧑‍⚕️ [Step 5] Booking test appointment for Dr. P. Anitha (Orthopedics)...');
  const appt4Id = `appt-${Date.now() + 3}`;
  const orthoPayload = {
    id: appt4Id,
    tokenNumber: '1',
    hospitalId: HOSPITAL_ID,
    hospitalName: 'Gandhi Hospital',
    doctorId: 'doc-gandhi-104',
    doctorName: 'Dr. P. Anitha',
    departmentName: 'Orthopedics',
    patientName: 'Knee Patient Varma',
    phone: '+919876543213',
    age: 55,
    gender: 'Male',
    date: new Date().toISOString().split('T')[0],
    time: '10:30',
    fee: 300,
    paymentStatus: 'paid'
  };

  await postJson('/api/appointments', orthoPayload);
  await new Promise(r => setTimeout(r, 1500));

  // Step 6: Test status update via Walk-in/Doctor screen (calling patient into cabin)
  console.log('\n🔄 [Step 6] Updating token status to "in-consultation" for Dr. V. Ramesh...');
  const statusRes = await patchJson(`/api/hospitals/${HOSPITAL_ID}/tokens/${appt1Id}/status`, {
    status: 'in-consultation',
    hospitalId: HOSPITAL_ID
  });
  console.log('Status update API status:', statusRes.status);
  await new Promise(r => setTimeout(r, 1500));

  // Step 7: Summary of results
  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS SUMMARY`);
  console.log(`Total live real-time events captured: ${receivedEvents.length}`);
  receivedEvents.forEach((e, idx) => {
    console.log(`  ${idx + 1}. [${e.type}] Patient: ${e.token.patientName || e.token.name} | Doctor: ${e.token.doctorName} | Status: ${e.token.status} | Session: ${e.token.session}`);
  });
  console.log(`======================================================\n`);

  socket.disconnect();
  process.exit(0);
}

runTest().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
