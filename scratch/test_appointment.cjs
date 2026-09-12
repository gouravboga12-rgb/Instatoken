async function test() {
  const res = await fetch('https://testcodtech.online/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'tok-test-real-123',
      patientName: 'Real Test Patient',
      phone: '9876543210',
      hospitalId: 'hosp-apollo',
      doctorId: 'doc-arvind',
      tokenNumber: 5,
      date: '2026-09-11',
      time: '10:00 AM'
    })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', data);
}

test().catch(console.error);
