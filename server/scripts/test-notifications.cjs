const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/hospitals/hosp-mu0838sg/notifications',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('POST Notification Status:', res.statusCode);
    console.log('Response:', d);

    // Now verify GET
    http.get('http://localhost:5000/api/hospitals/hosp-mu0838sg/notifications', (gRes) => {
      let gd = '';
      gRes.on('data', c => gd += c);
      gRes.on('end', () => {
        console.log('GET Notifications Status:', gRes.statusCode);
        const parsed = JSON.parse(gd);
        console.log('Total notifications returned:', parsed.notifications?.length);
        console.log('Latest message:', parsed.notifications?.[0]?.message);
      });
    });
  });
});

req.write(JSON.stringify({
  notification: {
    message: 'Important: Doctor OPD starting at 10:00 AM today.',
    recipient: 'all',
    type: 'inapp'
  }
}));
req.end();
