const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── File-Based Persistent Data Store ─────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const INITIAL_DOCTORS = [
  {
    id: 'doc-arvind', name: 'Dr. Arvind Sharma', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    qualification: 'MD, DM (Cardiology), FACC', specialization: 'Interventional Cardiologist',
    departmentId: 'dept-cardio', departmentName: 'Cardiology', experience: 16,
    consultationFee: 800, languages: ['Hindi', 'English', 'Kannada'], gender: 'Male',
    biography: 'Dr. Arvind is a leading interventional cardiologist with 16+ years of experience.',
    opdDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    opdStartTime: '09:00', opdEndTime: '13:00',
    consultationDuration: 15, maxTokensPerDay: 50,
    onlineConsult: true, offlineConsult: true, active: true, rating: 4.9, totalPatients: 4820,
  },
  {
    id: 'doc-sarah', name: 'Dr. Sarah Jenkins', photo: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=400&auto=format&fit=crop&q=80',
    qualification: 'MBBS, DM (Neurology)', specialization: 'Consultant Neurologist',
    departmentId: 'dept-neuro', departmentName: 'Neurology', experience: 12,
    consultationFee: 1000, languages: ['English', 'Hindi'], gender: 'Female',
    biography: 'Dr. Sarah specializes in epilepsy, stroke management and cognitive disorders.',
    opdDays: ['Mon', 'Wed', 'Fri'],
    opdStartTime: '10:00', opdEndTime: '17:00',
    consultationDuration: 20, maxTokensPerDay: 30,
    onlineConsult: true, offlineConsult: true, active: true, rating: 4.7, totalPatients: 2140,
  },
  {
    id: 'doc-ramesh', name: 'Dr. Ramesh Patel', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
    qualification: 'MS (Ortho), MCh (Ortho)', specialization: 'Joint Replacement Specialist',
    departmentId: 'dept-ortho', departmentName: 'Orthopedics', experience: 18,
    consultationFee: 900, languages: ['Gujarati', 'Hindi', 'English'], gender: 'Male',
    biography: 'Dr. Ramesh is a pioneer in minimally invasive joint replacement surgery.',
    opdDays: ['Tue', 'Thu', 'Sat'],
    opdStartTime: '09:30', opdEndTime: '13:00',
    consultationDuration: 15, maxTokensPerDay: 40,
    onlineConsult: false, offlineConsult: true, active: true, rating: 4.8, totalPatients: 3300,
  },
  {
    id: 'doc-anjali', name: 'Dr. Anjali Sharma', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    qualification: 'MD (Pediatrics), Fellowship in Neonatology', specialization: 'Pediatrician',
    departmentId: 'dept-pedia', departmentName: 'Pediatrics', experience: 10,
    consultationFee: 700, languages: ['Hindi', 'English', 'Telugu'], gender: 'Female',
    biography: 'Dr. Anjali specializes in neonatal care and childhood developmental disorders.',
    opdDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    opdStartTime: '09:00', opdEndTime: '17:00',
    consultationDuration: 12, maxTokensPerDay: 60,
    onlineConsult: true, offlineConsult: true, active: true, rating: 4.8, totalPatients: 5600,
  },
  {
    id: 'doc-vivek', name: 'Dr. Vivek Singh', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    qualification: 'MBBS, MS - Orthopedics', specialization: 'Orthopedic Surgeon',
    departmentId: 'dept-ortho', departmentName: 'Orthopedics', experience: 12,
    consultationFee: 600, languages: ['Hindi', 'English'], gender: 'Male',
    biography: 'Dr. Vivek focuses on sports injuries and arthroscopic procedures.',
    opdDays: ['Mon', 'Wed', 'Fri'],
    opdStartTime: '05:00 PM', opdEndTime: '09:00 PM',
    consultationDuration: 15, maxTokensPerDay: 30,
    onlineConsult: true, offlineConsult: true, active: true, rating: 4.6, totalPatients: 1890,
  },
];

const INITIAL_PROFILE = {
  id: 'hosp-apollo', name: 'Apollo Spectra Hospital', logo: '', coverImage: '',
  registrationNumber: 'KA/HOS/2009/04521', accreditation: 'NABH Accredited',
  gstNumber: '29AABCA1234K1Z5', licenseNumber: 'KA-MED-2009-1234',
  type: 'Multi Speciality', ownershipType: 'Private',
  phone: '+91 80 4668 8888', whatsapp: '+91 98765 43210',
  email: 'info@apollospectra.com', website: 'www.apollospectra.com', emergencyNumber: '+91 80 4668 9999',
  country: 'India', state: 'Karnataka', city: 'Bengaluru', area: 'Koramangala',
  address: 'Koramangala 5th Block, near Sony World Signal, Bengaluru', pinCode: '560095',
  lat: 12.9348, lng: 77.6189,
  about: 'Apollo Spectra is a state-of-the-art multi-specialty hospital committed to delivering world-class healthcare.',
  mission: 'To provide accessible, affordable, and high-quality healthcare to every patient.',
  vision: 'To be the most trusted and patient-centric hospital network in India.',
  facilities: ['24/7 Emergency', 'ICU', 'Pharmacy', 'Ambulance', 'Lab Testing', 'Cafeteria', 'Dialysis', 'Blood Bank'],
  emergencyServices: ['Cardiac Emergency', 'Trauma Care', 'Stroke Unit', 'Burn Unit'],
  gallery: [],
  timings: [
    { day: 'Mon', open: '09:00', close: '18:00' }, { day: 'Tue', open: '09:00', close: '18:00' },
    { day: 'Wed', open: '09:00', close: '18:00' }, { day: 'Thu', open: '09:00', close: '18:00' },
    { day: 'Fri', open: '09:00', close: '18:00' }, { day: 'Sat', open: '09:00', close: '14:00' },
    { day: 'Sun', open: '10:00', close: '13:00' },
  ],
  brandColor: '#2563EB',
};

const INITIAL_DEPARTMENTS = [
  { id: 'dept-cardio', name: 'Cardiology', icon: '❤️', headDoctor: 'Dr. Arvind Sharma', totalDoctors: 2, active: true },
  { id: 'dept-neuro', name: 'Neurology', icon: '🧠', headDoctor: 'Dr. Sarah Jenkins', totalDoctors: 1, active: true },
  { id: 'dept-ortho', name: 'Orthopedics', icon: '🦴', headDoctor: 'Dr. Ramesh Patel', totalDoctors: 2, active: true },
  { id: 'dept-pedia', name: 'Pediatrics', icon: '👶', headDoctor: 'Dr. Anjali Sharma', totalDoctors: 1, active: true },
  { id: 'dept-gynaec', name: 'Gynecology', icon: '🌸', headDoctor: 'Dr. Meera Nair', totalDoctors: 1, active: true },
  { id: 'dept-general', name: 'General Medicine', icon: '🩺', headDoctor: 'Dr. Vivek Singh', totalDoctors: 3, active: true },
  { id: 'dept-eye', name: 'Ophthalmology', icon: '👁️', headDoctor: '', totalDoctors: 0, active: false },
  { id: 'dept-dental', name: 'Dental', icon: '🦷', headDoctor: '', totalDoctors: 0, active: false },
];

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      if (!data.hospitalDoctors || Object.keys(data.hospitalDoctors).length === 0) {
        data.hospitalDoctors = { 'hosp-apollo': INITIAL_DOCTORS };
      }
      if (!data.hospitalProfiles || Object.keys(data.hospitalProfiles).length === 0) {
        data.hospitalProfiles = { 'hosp-apollo': INITIAL_PROFILE };
      }
      if (!data.hospitalDepartments || Object.keys(data.hospitalDepartments).length === 0) {
        data.hospitalDepartments = { 'hosp-apollo': INITIAL_DEPARTMENTS };
      }
      return data;
    }
  } catch (e) {
    console.error('Error reading store.json:', e);
  }
  return {
    hospitals: [],
    hospitalDoctors: { 'hosp-apollo': INITIAL_DOCTORS },
    hospitalProfiles: { 'hosp-apollo': INITIAL_PROFILE },
    hospitalDepartments: { 'hosp-apollo': INITIAL_DEPARTMENTS },
    tokens: [],
    appointments: [],
    lastUpdated: Date.now()
  };
}

function saveStore(data) {
  try {
    data.lastUpdated = Date.now();
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing store.json:', e);
  }
}

// ─── Data Sync API Endpoints ──────────────────────────────────────────────────

const isDummyTokenRecord = (t) =>
  !t ||
  ['tok-101', 'tok-102', 'tok-103', 'tok-104', 'tok-105', 'tok-106', 'tok-107', 'tok-108', 'tok-98', 'tok-99', 'tok-100', 'tok-1001'].includes(t.id) ||
  ['Rahul Kumar', 'Priya Sharma', 'Mohan Reddy', 'Ananya Patel', 'Ramesh Kumar', 'Neha Singh', 'Mohan Das', 'Lakshmi Devi', 'Suresh Reddy', 'Kavitha Rao', 'Arun Verma', 'Guest Patient'].includes(t.patientName);

const isDummyApptRecord = (a) =>
  !a || a.id === 'tok-1001' || a.patientName === 'Guest Patient';

// GET all synced data from AWS
app.get('/api/sync', (req, res) => {
  const store = loadStore();
  store.tokens = (store.tokens || []).filter(t => !isDummyTokenRecord(t));
  store.appointments = (store.appointments || []).filter(a => !isDummyApptRecord(a));
  res.json(store);
});

// POST to update global sync data
app.post('/api/sync', (req, res) => {
  const store = loadStore();
  const { hospitals, hospitalDoctors, hospitalProfiles, hospitalDepartments, tokens, appointments } = req.body;

  if (hospitals) store.hospitals = hospitals;
  if (hospitalDoctors) store.hospitalDoctors = { ...store.hospitalDoctors, ...hospitalDoctors };
  if (hospitalProfiles) store.hospitalProfiles = { ...store.hospitalProfiles, ...hospitalProfiles };
  if (hospitalDepartments) store.hospitalDepartments = { ...store.hospitalDepartments, ...hospitalDepartments };
  if (tokens) store.tokens = tokens.filter(t => !isDummyTokenRecord(t));
  if (appointments) store.appointments = appointments.filter(a => !isDummyApptRecord(a));

  saveStore(store);
  res.json({ success: true, store });
});

// GET hospitals
app.get('/api/hospitals', (req, res) => {
  const store = loadStore();
  res.json({ success: true, hospitals: store.hospitals, store });
});

// POST hospital doctors
app.post('/api/hospitals/:id/doctors', (req, res) => {
  const { id } = req.params;
  const { doctors } = req.body;
  const store = loadStore();

  store.hospitalDoctors = store.hospitalDoctors || {};
  store.hospitalDoctors[id] = doctors;

  saveStore(store);
  res.json({ success: true, hospitalId: id, doctors });
});

// POST hospital profile
app.post('/api/hospitals/:id/profile', (req, res) => {
  const { id } = req.params;
  const { profile } = req.body;
  const store = loadStore();

  store.hospitalProfiles = store.hospitalProfiles || {};
  store.hospitalProfiles[id] = profile;

  saveStore(store);
  res.json({ success: true, hospitalId: id, profile });
});

// POST hospital departments
app.post('/api/hospitals/:id/departments', (req, res) => {
  const { id } = req.params;
  const { departments } = req.body;
  const store = loadStore();

  store.hospitalDepartments = store.hospitalDepartments || {};
  store.hospitalDepartments[id] = departments;

  saveStore(store);
  res.json({ success: true, hospitalId: id, departments });
});

// POST tokens
app.post('/api/tokens', (req, res) => {
  const { tokens } = req.body;
  const store = loadStore();
  store.tokens = tokens;
  saveStore(store);
  res.json({ success: true, tokens });
});

// Nodemailer SMTP Transporter setup for token.in1999@gmail.com
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'token.in1999@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'rnppcyctnhowcynk',
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ Real SMTP Mailer Connected via token.in1999@gmail.com!');
  }
});

// API Endpoint to Send Real OTP Emails
app.post('/api/send-otp', async (req, res) => {
  const { email, code, type, recipientName } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
  }

  let title = 'Verification Code';
  let subtitle = 'Complete your authentication';

  if (type === 'customer_signup') {
    title = 'Welcome to Insta Token!';
    subtitle = 'Verify your email to complete registration';
  } else if (type === 'customer_forgot_password') {
    title = 'Reset Your Password';
    subtitle = 'Use the code below to set a new password';
  } else if (type === 'hospital_signup') {
    title = 'Hospital Registration Verification';
    subtitle = 'Verify your hospital account to activate dashboard access';
  } else if (type === 'hospital_forgot_password') {
    title = 'Hospital Admin Password Reset';
    subtitle = 'Use the code below to reset your hospital admin password';
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }
        .brand { font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
        .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 6px; }
        .content { padding: 28px 0; text-align: center; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .subtitle { font-size: 13px; color: #64748b; margin-bottom: 24px; }
        .otp-box { background: linear-gradient(135deg, #2563eb, #4338ca); color: #ffffff; font-size: 36px; font-weight: 900; letter-spacing: 12px; padding: 20px; border-radius: 16px; margin: 20px 0; font-family: monospace; }
        .info { font-size: 12px; color: #64748b; line-height: 1.6; background: #f8fafc; padding: 14px; border-radius: 12px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">Insta Token 🩺</div>
          <div class="badge">Healthcare OTP Authentication</div>
        </div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="subtitle">Hello ${recipientName || 'User'}, ${subtitle}</div>
          
          <div class="otp-box">${code}</div>

          <p style="font-size: 13px; color: #475569; font-weight: 600;">This code is valid for <strong>5 minutes</strong>. Do not share this OTP with anyone.</p>

          <div class="info">
            🔒 Sent securely via <strong>Insta Token Mailer</strong> (token.in1999@gmail.com).<br>
            If you did not request this code, please ignore this email.
          </div>
        </div>
        <div class="footer">
          © 2026 Insta Token HMS · Automated OTP System · All Rights Reserved
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Insta Token" <token.in1999@gmail.com>',
      to: email,
      subject: `[Insta Token] ${code} is your OTP Verification Code`,
      html: htmlContent,
    });

    console.log(`✉️ Email sent successfully to ${email} (MessageId: ${info.messageId})`);
    return res.json({ success: true, message: `OTP code sent to ${email}`, messageId: info.messageId });
  } catch (err) {
    console.error('❌ Error sending mail:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP email.', error: err.message });
  }
});

// Serve frontend static build files if available
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Insta Token Unified Express Server running on port ${PORT}`);
});
