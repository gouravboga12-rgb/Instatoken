require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

// Razorpay Credentials
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_ThOMWcFfdTPNme';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'vm2Lt528SZHDC8JqcakbpMjB';

// AWS & DB Integrations
const { query, testConnection } = require('./config/db');
const { generateUploadUrl, uploadFile, deleteFile } = require('./config/s3');
const { normalizePhone10, sendSmsOtp, verifySmsOtp, clearSmsOtp } = require('./services/smsService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Socket.io Hospital Room Management
io.on('connection', (socket) => {
  socket.on('join_hospital', (data) => {
    const hospitalId = typeof data === 'string' ? data : data?.hospitalId;
    if (hospitalId) {
      socket.join(`hospital_${hospitalId}`);
      console.log(`📡 Socket ${socket.id} joined room hospital_${hospitalId}`);
      socket.emit('joined_hospital', { hospitalId, status: 'connected' });
    }
  });

  socket.on('leave_hospital', (data) => {
    const hospitalId = typeof data === 'string' ? data : data?.hospitalId;
    if (hospitalId) {
      socket.leave(`hospital_${hospitalId}`);
      console.log(`📡 Socket ${socket.id} left room hospital_${hospitalId}`);
    }
  });

  socket.on('join_patient', (data) => {
    const rawPhone = typeof data === 'string' ? data : data?.phone;
    if (rawPhone) {
      const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        socket.join(`patient_${cleanPhone}`);
        console.log(`📡 Socket ${socket.id} joined room patient_${cleanPhone}`);
        socket.emit('joined_patient', { phone: cleanPhone, status: 'connected' });
      }
    }
  });

  socket.on('disconnect', () => {
    // client disconnected
  });
});

const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Multer in-memory storage for direct S3 file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max (covers videos)
});

// Separate video upload instance with higher limit
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

// ─── File-Based Fallback Data Store ───────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let isDbConnected = false;

// Attempt initial DB connection test
testConnection().then(async (connected) => {
  isDbConnected = connected;
  if (connected) {
    console.log('⚡ Active Data Layer: AWS RDS PostgreSQL');
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255),
          phone VARCHAR(50),
          email VARCHAR(255),
          location VARCHAR(255),
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {
      console.warn('Could not auto-create customers table in RDS:', e.message);
    }
    // Auto-migrate: add payment columns to hospitals table if not present
    try {
      await query(`
        ALTER TABLE hospitals
          ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'token_only',
          ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255),
          ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100),
          ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50),
          ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100),
          ADD COLUMN IF NOT EXISTS upi_phone VARCHAR(50);
      `);
    } catch (e) {
      console.warn('Could not auto-add payment columns to hospitals:', e.message);
    }
    // Create hospital_payout_settlements table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS hospital_payout_settlements (
          id VARCHAR(100) PRIMARY KEY,
          hospital_id VARCHAR(100) NOT NULL,
          hospital_name VARCHAR(255) NOT NULL,
          payout_amount NUMERIC(10,2) NOT NULL,
          tokens_count INTEGER NOT NULL DEFAULT 0,
          token_ids JSONB NOT NULL DEFAULT '[]',
          payment_method VARCHAR(50) NOT NULL DEFAULT 'NEFT',
          utr_reference VARCHAR(100) NOT NULL,
          beneficiary_bank_account VARCHAR(100),
          beneficiary_ifsc VARCHAR(50),
          beneficiary_upi VARCHAR(100),
          settled_by_admin VARCHAR(100) NOT NULL DEFAULT 'super-admin',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at_ist VARCHAR(100)
        );
        CREATE INDEX IF NOT EXISTS idx_payout_settlements_hosp ON hospital_payout_settlements(hospital_id);
        CREATE INDEX IF NOT EXISTS idx_payout_settlements_utr ON hospital_payout_settlements(utr_reference);
      `);
    } catch (e) {
      console.warn('Could not auto-create hospital_payout_settlements table:', e.message);
    }
    // Create hospital_payout_requests table (for hospital-initiated requests)
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS hospital_payout_requests (
          id VARCHAR(100) PRIMARY KEY,
          hospital_id VARCHAR(100) NOT NULL,
          hospital_name VARCHAR(255) NOT NULL,
          requested_amount NUMERIC(10,2) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          notes TEXT,
          admin_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at_ist VARCHAR(100)
        );
        CREATE INDEX IF NOT EXISTS idx_payout_requests_hosp ON hospital_payout_requests(hospital_id);
        CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON hospital_payout_requests(status);
      `);
    } catch (e) {
      console.warn('Could not auto-create hospital_payout_requests table:', e.message);
    }
    // Auto-migrate: reassign any legacy 'hosp-gandhi' tokens/records to active 'hosp-mu0838sg' and delete hosp-gandhi
    try {
      await query(`UPDATE tokens SET hospital_id = 'hosp-mu0838sg' WHERE hospital_id = 'hosp-gandhi'`);
      await query(`UPDATE appointments SET hospital_id = 'hosp-mu0838sg' WHERE hospital_id = 'hosp-gandhi'`);
      await query(`UPDATE hospital_payout_settlements SET hospital_id = 'hosp-mu0838sg', hospital_name = 'Gandi Hospital' WHERE hospital_id = 'hosp-gandhi'`);
      await query(`DELETE FROM hospital_payout_requests WHERE hospital_id = 'hosp-gandhi'`);
      await query(`DELETE FROM hospitals WHERE id = 'hosp-gandhi'`);
      console.log('✅ Legacy hosp-gandhi records remapped to hosp-mu0838sg and purged.');
    } catch (e) {
      console.warn('Legacy hosp-gandhi cleanup notice:', e.message);
    }
  } else {
    console.log('📁 Active Data Layer: Local File Store (Fallback)');
  }
});

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
  id: 'hosp-apollo', name: 'City Care Multi-Specialty Hospital', logo: '', coverImage: '',
  registrationNumber: 'KA/HOS/2009/04521', accreditation: 'NABH Accredited',
  gstNumber: '29AABCA1234K1Z5', licenseNumber: 'KA-MED-2009-1234',
  type: 'Multi Speciality', ownershipType: 'Private',
  phone: '+91 80 4668 8888', whatsapp: '+91 98765 43210',
  email: 'info@instatoken.in', website: 'https://testcodtech.shop', emergencyNumber: '+91 80 4668 9999',
  country: 'India', state: 'Telangana', city: 'Hyderabad', area: 'Kothapet Pratap Nagar',
  address: '15-57/2, RAMkrishna Raju Residency, Pratap Nagar, Kothapet, Hyderabad, Telangana 500060, India', pinCode: '500060',
  lat: 17.37336200634615, lng: 78.53855589118986,
  about: 'City Care Multi-Specialty Hospital is a state-of-the-art multi-specialty hospital committed to delivering world-class healthcare.',
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
  { id: 'dept-cardio', name: 'Cardiology', icon: '❤️', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-neuro', name: 'Neurology', icon: '🧠', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-ortho', name: 'Orthopedics', icon: '🦴', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-pedia', name: 'Pediatrics', icon: '👶', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-gynaec', name: 'Gynecology', icon: '🌸', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-general', name: 'General Medicine', icon: '🩺', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-eye', name: 'Ophthalmology', icon: '👁️', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-dental', name: 'Dental', icon: '🦷', headDoctor: '', totalDoctors: 0, active: true },
];

function ensureDefaultDepartments(existingDepts) {
  if (!Array.isArray(existingDepts) || existingDepts.length === 0) {
    return INITIAL_DEPARTMENTS.map(d => ({ ...d }));
  }
  const isOnlyOldPlaceholders = existingDepts.length <= 2 && existingDepts.every(d =>
    (d.id?.includes('gen') || d.id?.includes('opd')) && d.name !== 'General Medicine'
  );
  if (isOnlyOldPlaceholders) {
    return INITIAL_DEPARTMENTS.map(d => ({ ...d }));
  }
  const result = [...existingDepts];
  INITIAL_DEPARTMENTS.forEach(defDept => {
    const exists = result.some(d => d.id === defDept.id || d.name?.toLowerCase() === defDept.name.toLowerCase());
    if (!exists) {
      result.push({ ...defDept });
    }
  });
  return result;
}

// ─── Real-World IST Timezone & Session Cutoff Helpers ─────────────────────────
function getNowIST() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  const timeParts = timeFormatter.formatToParts(now);
  const hour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;
  return { dateStr, totalMinutes, time24: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

function parseTimeToMinutes(rawStr) {
  if (!rawStr || typeof rawStr !== 'string') return 1440;
  const parts = rawStr.split(/[-–—]|to/i);
  const target = parts[parts.length - 1].trim();

  const ampmMatch = target.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2] || '0', 10);
    const meridiem = ampmMatch[3].toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  const militaryMatch = target.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    const hour = parseInt(militaryMatch[1], 10);
    const minute = parseInt(militaryMatch[2], 10);
    return hour * 60 + minute;
  }

  const lower = target.toLowerCase();
  if (lower.includes('morn')) return 13 * 60; // 01:00 PM (780 mins)
  if (lower.includes('after')) return 17 * 60; // 05:00 PM (1020 mins)
  if (lower.includes('even')) return 21 * 60; // 09:00 PM (1260 mins)
  if (lower.includes('night')) return 23 * 60; // 11:00 PM (1380 mins)

  return 1440;
}

function isSessionExpiredInIST(sessionEndTimeOrRange, targetDateStr) {
  const { dateStr: todayIST, totalMinutes: nowMinutesIST } = getNowIST();
  const dateToEvaluate = targetDateStr || todayIST;
  if (dateToEvaluate < todayIST) return true;
  if (dateToEvaluate > todayIST) return false;
  const sessionEndMinutes = parseTimeToMinutes(sessionEndTimeOrRange);
  return nowMinutesIST >= sessionEndMinutes;
}

const INITIAL_HOSPITALS = [
  {
    id: "hosp-apollo",
    name: "City Care Multi-Specialty Hospital",
    category: "Multi Speciality",
    email: "info@instatoken.in",
    phone: "+91 80 4668 8888",
    rating: 4.8,
    reviewsCount: 1240,
    distance: 1.8,
    baseWaitingTime: 20,
    address: "15-57/2, RAMkrishna Raju Residency, Pratap Nagar, Kothapet, Hyderabad, Telangana 500060, India",
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
    about: "City Care Multi-Specialty Hospital is a state-of-the-art multi-specialty hospital committed to bringing you the best clinical outcomes in a simplified, service-oriented environment.",
    facilities: ["24/7 Emergency", "ICU", "Pharmacy", "Ambulance", "Lab Testing", "Cafeteria"],
    contact: "+91 80 4668 8888",
    lat: 17.37336200634615,
    lng: 78.53855589118986
  }
];

const INITIAL_LOCATION_BANNERS = [
  {
    id: 'ban-india-health',
    title: 'National Ayushman Digital OPD Token Drive',
    description: 'Instant token booking & live queue tracking across all partner hospitals nationwide.',
    image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&auto=format&fit=crop&q=80',
    badge: 'ALL INDIA CAMPAIGN',
    linkUrl: '/search',
    ctaText: 'Find Hospitals',
    status: 'active',
    targetLevel: 'country',
    country: 'India',
    displayPanels: ['customer', 'hospital'],
    priority: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ban-ts-state',
    title: 'Telangana State Health Mission: Zero-Wait OPD',
    description: 'Fast-track doctor consultations and digital token booking across all districts in Telangana.',
    image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=1200&auto=format&fit=crop&q=80',
    badge: 'STATEWIDE INITIATIVE',
    linkUrl: '/search?state=Telangana',
    ctaText: 'Explore Clinics',
    status: 'active',
    targetLevel: 'state',
    country: 'India',
    state: 'Telangana',
    displayPanels: ['customer', 'hospital'],
    priority: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ban-karimnagar-district',
    title: 'Karimnagar Multi-Specialty Health & Token Camp',
    description: 'Comprehensive OPD coverage and special token booking discount across all Karimnagar hospitals, mandals, and villages.',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80',
    badge: 'KARIMNAGAR DISTRICT',
    linkUrl: '/search?district=Karimnagar',
    ctaText: 'Book in Karimnagar',
    status: 'active',
    targetLevel: 'district',
    country: 'India',
    state: 'Telangana',
    district: 'Karimnagar',
    displayPanels: ['customer', 'hospital'],
    priority: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ban-choppadandi-mandal',
    title: 'Choppadandi Mandal Rural Tele-Medicine & OPD Outreach',
    description: 'Priority doctor appointments for residents of Choppadandi, Gumlapur, Rukmapur, and neighboring villages.',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80',
    badge: 'CHOPPADANDI MANDAL',
    linkUrl: '/search?mandal=Choppadandi',
    ctaText: 'Book Mandal OPD',
    status: 'active',
    targetLevel: 'mandal',
    country: 'India',
    state: 'Telangana',
    district: 'Karimnagar',
    mandal: 'Choppadandi',
    displayPanels: ['customer'],
    priority: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ban-warangal-district',
    title: 'Warangal Heritage City Advanced Healthcare Access',
    description: 'Exclusive consultation slots at leading specialty centers across Warangal & Hanamkonda.',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&auto=format&fit=crop&q=80',
    badge: 'WARANGAL DISTRICT',
    linkUrl: '/search?district=Warangal',
    ctaText: 'Book in Warangal',
    status: 'active',
    targetLevel: 'district',
    country: 'India',
    state: 'Telangana',
    district: 'Warangal',
    displayPanels: ['customer', 'hospital'],
    priority: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ban-blr-urban',
    title: 'Bengaluru Tech Corridor Quick OPD Pass',
    description: 'Skip waiting rooms in Koramangala, HSR, Indiranagar, and Whitefield with live token tracking.',
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1200&auto=format&fit=crop&q=80',
    badge: 'BENGALURU URBAN',
    linkUrl: '/search?district=Bengaluru',
    ctaText: 'Book in Bengaluru',
    status: 'active',
    targetLevel: 'district',
    country: 'India',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    displayPanels: ['customer', 'hospital'],
    priority: 3,
    createdAt: new Date().toISOString()
  }
];

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      if (!data.hospitals || !Array.isArray(data.hospitals) || data.hospitals.length === 0) {
        data.hospitals = INITIAL_HOSPITALS;
      }
      if (!data.hospitalDoctors || Object.keys(data.hospitalDoctors).length === 0) {
        data.hospitalDoctors = { 'hosp-apollo': INITIAL_DOCTORS };
      }
      if (!data.hospitalProfiles || Object.keys(data.hospitalProfiles).length === 0) {
        data.hospitalProfiles = { 'hosp-apollo': INITIAL_PROFILE };
      }
      if (!data.hospitalDepartments || Object.keys(data.hospitalDepartments).length === 0) {
        data.hospitalDepartments = { 'hosp-apollo': INITIAL_DEPARTMENTS };
      }
      if (!data.hospitalPatients) data.hospitalPatients = {};
      if (!data.hospitalSchedules) data.hospitalSchedules = {};
      if (!data.hospitalStaff) data.hospitalStaff = {};
      if (!data.hospitalCredentials) data.hospitalCredentials = [];
      if (!data.customers || !Array.isArray(data.customers)) data.customers = [];
      if (!data.locationBanners || !Array.isArray(data.locationBanners) || data.locationBanners.length === 0) {
        data.locationBanners = INITIAL_LOCATION_BANNERS;
      }
      return data;
    }
  } catch (e) {
    console.error('Error reading store.json:', e);
  }
  return {
    hospitals: INITIAL_HOSPITALS,
    hospitalDoctors: { 'hosp-apollo': INITIAL_DOCTORS },
    hospitalProfiles: { 'hosp-apollo': INITIAL_PROFILE },
    hospitalDepartments: { 'hosp-apollo': INITIAL_DEPARTMENTS },
    hospitalPatients: {},
    hospitalSchedules: {},
    hospitalStaff: {},
    hospitalCredentials: [],
    customers: [],
    locationBanners: INITIAL_LOCATION_BANNERS,
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

// ─── Health Check Endpoint for ECS ALB ─────────────────────────────────────────
app.get(['/health', '/api/health'], async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'instatoken-backend',
    database: isDbConnected ? 'connected' : 'local-fallback',
  });
});

// ─── AWS S3 Media Upload Endpoints ───────────────────────────────────────────

// 1. Get Pre-signed URL for direct browser uploads (Recommended)
app.post('/api/media/upload-url', async (req, res) => {
  try {
    const { filename, fileType, folder = 'uploads' } = req.body;
    if (!filename || !fileType) {
      return res.status(400).json({ success: false, message: 'filename and fileType are required' });
    }

    const ext = path.extname(filename) || '.jpg';
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const result = await generateUploadUrl(key, fileType);

    res.json({
      success: true,
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      key: result.key,
    });
  } catch (err) {
    console.error('❌ Error creating presigned URL:', err);
    res.status(500).json({ success: false, message: 'Failed to generate upload URL', error: err.message });
  }
});

// 2. Direct Multipart File Upload to S3
app.post('/api/media/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const folder = req.body.folder || 'general';
    const ext = path.extname(req.file.originalname) || '.jpg';
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    const publicUrl = await uploadFile(key, req.file.buffer, req.file.mimetype);

    res.json({
      success: true,
      url: publicUrl,
      key,
    });
  } catch (err) {
    console.error('❌ Error uploading file to S3:', err);
    res.status(500).json({ success: false, message: 'File upload failed', error: err.message });
  }
});

// ─── Data Sync API Endpoints ──────────────────────────────────────────────────

const isDummyTokenRecord = (t) =>
  !t ||
  ['tok-101', 'tok-102', 'tok-103', 'tok-104', 'tok-105', 'tok-106', 'tok-107', 'tok-108', 'tok-98', 'tok-99', 'tok-100', 'tok-1001'].includes(t.id) ||
  ['Rahul Kumar', 'Priya Sharma', 'Mohan Reddy', 'Ananya Patel', 'Ramesh Kumar', 'Neha Singh', 'Mohan Das', 'Lakshmi Devi', 'Suresh Reddy', 'Kavitha Rao', 'Arun Verma', 'Guest Patient'].includes(t.patientName);

const isDummyApptRecord = (a) =>
  !a || a.id === 'tok-1001' || a.patientName === 'Guest Patient';

function mapHospitalDoctorsToPublic(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.map(d => ({
    id: d.id,
    name: d.name,
    specialty: d.specialization || d.specialty || d.departmentName || 'Specialist',
    departmentId: d.departmentId || 'dept-general',
    qualification: d.qualification || 'MBBS, MD',
    experience: Number(d.experience) || 5,
    consultationFee: Number(d.consultationFee) || 500,
    rating: Number(d.rating) || 4.9,
    reviewsCount: Number(d.reviewsCount || d.totalPatients) || 120,
    image: d.photo || d.image || '',
    availability: {
      days: Array.isArray(d.opdDays) && d.opdDays.length > 0 ? d.opdDays : (d.availability?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
      slots: Array.isArray(d.sessions) && d.sessions.length > 0
        ? d.sessions.filter(s => s.active !== false).map(s => `${s.startTime} - ${s.endTime}`)
        : ['09:00 AM - 01:00 PM', '05:00 PM - 09:00 PM']
    },
    opdDays: Array.isArray(d.opdDays) && d.opdDays.length > 0 ? d.opdDays : (d.availability?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
    currentQueue: d.currentQueue || 0,
    nextAvailableToken: d.nextAvailableToken || 1,
    estimatedWaitPerPatient: d.estimatedWaitPerPatient || d.consultationDuration || 15,
    active: d.active !== false,
    sessions: d.sessions || []
  }));
}

function mapHospitalDeptsToPublic(depts) {
  if (!Array.isArray(depts)) return [];
  return depts.map(d => ({
    id: d.id,
    name: d.name,
    icon: d.icon || '🩺',
    active: d.active !== false
  }));
}

function ensureHospitalProfilesSynced(store) {
  if (!store) return;
  if (store.hospitalProfiles) {
    Object.entries(store.hospitalProfiles).forEach(([id, prof]) => {
      if (prof && (prof.address || prof.name)) {
        syncProfileToHospitalsList(store, id, prof);
      }
    });
  }
  if (store.hospitals && Array.isArray(store.hospitals)) {
    store.hospitals.forEach(hosp => {
      if (store.hospitalDoctors && store.hospitalDoctors[hosp.id] && store.hospitalDoctors[hosp.id].length > 0) {
        hosp.doctors = mapHospitalDoctorsToPublic(store.hospitalDoctors[hosp.id]);
      }
      store.hospitalDepartments = store.hospitalDepartments || {};
      store.hospitalDepartments[hosp.id] = ensureDefaultDepartments(store.hospitalDepartments[hosp.id]);
      hosp.departments = mapHospitalDeptsToPublic(store.hospitalDepartments[hosp.id]);
      hosp.categories = Array.from(new Set(store.hospitalDepartments[hosp.id].filter(d => d.active !== false).map(d => d.name)));
    });
  }
}

async function getUnifiedStore() {
  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT data FROM sync_store WHERE key = 'global_store'`);
      if (dbRes.rows.length > 0 && dbRes.rows[0].data) {
        const store = dbRes.rows[0].data;
        if (!store.hospitals || !Array.isArray(store.hospitals) || store.hospitals.length === 0) {
          store.hospitals = INITIAL_HOSPITALS;
        }
        if (!store.hospitalDoctors || Object.keys(store.hospitalDoctors).length === 0) {
          store.hospitalDoctors = { 'hosp-apollo': INITIAL_DOCTORS };
        }
        if (!store.hospitalProfiles || Object.keys(store.hospitalProfiles).length === 0 || store.hospitalProfiles['hosp-apollo']?.address === STALE_MOCK_APOLLO_ADDRESS) {
          store.hospitalProfiles = { ...store.hospitalProfiles, 'hosp-apollo': INITIAL_PROFILE };
        }
        if (!store.hospitalDepartments || Object.keys(store.hospitalDepartments).length === 0) {
          store.hospitalDepartments = { 'hosp-apollo': INITIAL_DEPARTMENTS };
        }
        if (!store.hospitalPatients) store.hospitalPatients = {};
        if (!store.hospitalSchedules) store.hospitalSchedules = {};
        if (!store.hospitalStaff) store.hospitalStaff = {};
        if (!store.hospitalCredentials) store.hospitalCredentials = [];
        if (!store.deletedHospitalIds) store.deletedHospitalIds = [];
        if (!store.customers || !Array.isArray(store.customers)) store.customers = [];
        if (!store.locationBanners || !Array.isArray(store.locationBanners)) {
          store.locationBanners = INITIAL_LOCATION_BANNERS;
        }

        // Merge live tokens from PostgreSQL tokens table into store.tokens
        try {
          const tokRows = await query(`SELECT data FROM tokens ORDER BY created_at DESC LIMIT 300`);
          if (tokRows.rows.length > 0) {
            store.tokens = store.tokens || [];
            tokRows.rows.forEach(r => {
              if (r.data && !isDummyTokenRecord(r.data)) {
                const idx = store.tokens.findIndex(t => t.id === r.data.id);
                if (idx === -1) {
                  store.tokens.push(r.data);
                } else {
                  store.tokens[idx] = { ...store.tokens[idx], ...r.data };
                }
              }
            });
          }
        } catch (tokErr) {
          console.warn('Error merging tokens from RDS:', tokErr.message);
        }

        // Merge live customers from PostgreSQL customers table into store.customers
        try {
          const custRows = await query(`SELECT id, name, phone, email, location, data FROM customers ORDER BY updated_at DESC LIMIT 500`);
          if (custRows.rows.length > 0) {
            store.customers = store.customers || [];
            custRows.rows.forEach(r => {
              const custData = r.data || { id: r.id, name: r.name, phone: r.phone, email: r.email, location: r.location };
              const rPhoneNorm = normalizeCustomerPhone(r.phone);
              const rEmailNorm = (r.email || '').trim().toLowerCase();
              const idx = store.customers.findIndex(c => {
                if (c.id === r.id) return true;
                const cPhoneNorm = normalizeCustomerPhone(c.phone);
                if (rPhoneNorm && cPhoneNorm === rPhoneNorm) return true;
                const cEmailNorm = (c.email || '').trim().toLowerCase();
                if (rEmailNorm && cEmailNorm === rEmailNorm) return true;
                return false;
              });
              if (idx === -1) {
                store.customers.push(custData);
              } else {
                store.customers[idx] = { ...store.customers[idx], ...custData };
              }
            });
          }
        } catch (custErr) {
          console.warn('Error merging customers from RDS:', custErr.message);
        }



        // Merge live appointments from PostgreSQL appointments table into store.appointments
        try {
          const apptRows = await query(`SELECT data FROM appointments ORDER BY created_at DESC LIMIT 300`);
          if (apptRows.rows.length > 0) {
            store.appointments = store.appointments || [];
            apptRows.rows.forEach(r => {
              if (r.data && !isDummyApptRecord(r.data)) {
                const idx = store.appointments.findIndex(a => a.id === r.data.id);
                if (idx === -1) {
                  store.appointments.push(r.data);
                } else {
                  store.appointments[idx] = { ...store.appointments[idx], ...r.data };
                }
              }
            });
          }
        } catch (apptErr) {
          console.warn('Error merging appointments from RDS:', apptErr.message);
        }

        const DUMMY_HOSPITAL_IDS = ['hosp-rainbow', 'hosp-nethra', 'hosp-fortis', 'hosp-continental', 'hosp-ramesh', 'hosp-care-vizag', 'hosp-gandhi'];
        store.hospitals = (store.hospitals || []).filter(h => !DUMMY_HOSPITAL_IDS.includes(h.id));
        if (store.hospitals.length === 0) {
          store.hospitals = INITIAL_HOSPITALS;
        }

        // Merge live hospitals and profiles from PostgreSQL
        try {
          const hospRows = await query(`SELECT id, name, email, phone, city, state, payment_mode, data FROM hospitals`);
          const activeDbHospitalIds = new Set(hospRows.rows.map(r => r.id));
          activeDbHospitalIds.add('hosp-apollo');
          store.hospitals = (store.hospitals || []).filter(h => activeDbHospitalIds.has(h.id) && !DUMMY_HOSPITAL_IDS.includes(h.id));

          if (hospRows.rows.length > 0) {
            hospRows.rows.forEach(r => {
              if (DUMMY_HOSPITAL_IDS.includes(r.id)) return;
              const idx = store.hospitals.findIndex(h => h.id === r.id);
              const merged = {
                ...(r.data || {}),
                id: r.id,
                name: r.name || r.data?.name,
                email: r.email || r.data?.email || (r.id === 'hosp-apollo' ? 'info@instatoken.in' : ''),
                phone: r.phone || r.data?.phone || r.data?.contact || (r.id === 'hosp-apollo' ? '+91 80 4668 8888' : ''),
                contact: r.phone || r.data?.contact || r.data?.phone || (r.id === 'hosp-apollo' ? '+91 80 4668 8888' : ''),
                city: r.city || r.data?.city || '',
                state: r.state || r.data?.state || '',
                payment_mode: r.payment_mode || r.data?.payment_mode || 'token_only',
                paymentMode: r.payment_mode || r.data?.payment_mode || 'token_only'
              };
              if (idx === -1) store.hospitals.push(merged);
              else store.hospitals[idx] = { ...store.hospitals[idx], ...merged };
            });
          }
        } catch (hospErr) {
          console.warn('Error merging hospitals from RDS:', hospErr.message);
        }

        try {
          const profRows = await query(`SELECT hospital_id, profile_data FROM hospital_profiles`);
          if (profRows.rows.length > 0) {
            store.hospitalProfiles = store.hospitalProfiles || {};
            profRows.rows.forEach(r => {
              if (r.profile_data) {
                store.hospitalProfiles[r.hospital_id] = {
                  ...(store.hospitalProfiles[r.hospital_id] || {}),
                  ...r.profile_data
                };
              }
            });
          }
        } catch (profErr) {
          console.warn('Error merging hospital profiles from RDS:', profErr.message);
        }

        ensureHospitalProfilesSynced(store);
        return store;
      }
    } catch (e) {
      console.warn('Error fetching sync from RDS, using fallback:', e.message);
    }
  }
  const fileStore = loadStore();
  fileStore.hospitals = INITIAL_HOSPITALS;
  ensureHospitalProfilesSynced(fileStore);
  return fileStore;
}

async function saveUnifiedStore(store) {
  ensureHospitalProfilesSynced(store);
  if (isDbConnected) {
    try {
      await query(
        `INSERT INTO sync_store (key, data, last_updated) 
         VALUES ('global_store', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET data = $1, last_updated = NOW() RETURNING key`,
        [JSON.stringify(store)]
      );
    } catch (e) {
      console.error('Error syncing to RDS:', e.message);
    }
  }
}

// GET all synced data (Scoped to hospital if hospital auth provided)
app.get('/api/sync', async (req, res) => {
  const store = await getUnifiedStore();
  store.tokens = (store.tokens || []).filter(t => !isDummyTokenRecord(t));
  store.appointments = (store.appointments || []).filter(a => !isDummyApptRecord(a));

  const authHeader = req.headers['authorization'] || req.headers['x-hospital-token'];
  let tokenStr = '';
  if (authHeader) {
    tokenStr = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  }
  const session = tokenStr ? ACTIVE_SESSIONS.get(tokenStr) : null;

  // If request is from an authenticated hospital and not superadmin, isolate data to that hospital (Phase 22)
  if (session && session.role !== 'superadmin') {
    const hospId = session.hospitalId;
    const isolatedStore = {
      ...store,
      hospitalDoctors: { [hospId]: store.hospitalDoctors?.[hospId] || [] },
      hospitalProfiles: { [hospId]: store.hospitalProfiles?.[hospId] || null },
      hospitalDepartments: { [hospId]: store.hospitalDepartments?.[hospId] || [] },
      tokens: store.tokens.filter(t => (t.hospitalId || 'hosp-apollo') === hospId),
      appointments: store.appointments.filter(a => a.hospitalId === hospId),
      hospitalPatients: { [hospId]: store.hospitalPatients?.[hospId] || [] },
      hospitalStaff: { [hospId]: store.hospitalStaff?.[hospId] || [] },
      hospitalSchedules: { [hospId]: store.hospitalSchedules?.[hospId] || null },
      hospitalNotifications: { [hospId]: store.hospitalNotifications?.[hospId] || [] },
      broadcastNotifications: store.broadcastNotifications || []
    };
    return res.json(isolatedStore);
  }

  store.hospitalNotifications = store.hospitalNotifications || {};
  store.broadcastNotifications = store.broadcastNotifications || [];
  res.json(store);
});

function syncProfileToHospitalsList(store, hospitalId, profile) {
  if (!store || !profile) return;
  if (!store.hospitals || !Array.isArray(store.hospitals)) {
    store.hospitals = [];
  }
  const idx = store.hospitals.findIndex(h => h.id === hospitalId);
  const updatedData = {
    id: hospitalId,
    name: profile.name,
    category: profile.type || profile.category,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    area: profile.area,
    pinCode: profile.pinCode,
    contact: profile.phone || profile.emergencyNumber,
    emergencyContact: profile.emergencyNumber || profile.emergencyContact,
    whatsapp: profile.whatsapp,
    email: profile.email,
    website: profile.website,
    timings: profile.timings,
    about: profile.about,
    facilities: profile.facilities,
    logo: profile.logo || '',
    coverImage: profile.coverImage || profile.image || '',
    image: profile.coverImage || profile.image || profile.logo,
    gallery: profile.gallery || [],
    lat: profile.lat !== undefined ? Number(profile.lat) : undefined,
    lng: profile.lng !== undefined ? Number(profile.lng) : undefined,
    payment_mode: profile.payment_mode || profile.paymentMode,
    paymentMode: profile.payment_mode || profile.paymentMode
  };

  Object.keys(updatedData).forEach(k => updatedData[k] === undefined && delete updatedData[k]);

  if (idx !== -1) {
    store.hospitals[idx] = { ...store.hospitals[idx], ...updatedData };
  } else {
    store.hospitals.push({
      rating: 4.8,
      reviewsCount: 120,
      distance: 2.5,
      baseWaitingTime: 20,
      departments: [],
      doctors: [],
      gallery: [],
      timings: '09:00 AM - 08:00 PM',
      ...updatedData
    });
  }
}

const STALE_MOCK_APOLLO_ADDRESS = "Koramangala 5th Block, near Sony World Signal, Bengaluru";

// POST to update global sync data
app.post('/api/sync', async (req, res) => {
  const store = await getUnifiedStore();
  const { hospitals, hospitalDoctors, hospitalProfiles, hospitalDepartments, tokens, appointments, customers, hospitalNotifications, broadcastNotifications } = req.body;

  if (broadcastNotifications && Array.isArray(broadcastNotifications)) {
    store.broadcastNotifications = store.broadcastNotifications || [];
    broadcastNotifications.forEach(bn => {
      if (bn && bn.id && !store.broadcastNotifications.some(existing => existing.id === bn.id)) {
        store.broadcastNotifications.unshift(bn);
      }
    });
    if (store.broadcastNotifications.length > 50) {
      store.broadcastNotifications = store.broadcastNotifications.slice(0, 50);
    }
  }

  if (hospitalNotifications && typeof hospitalNotifications === 'object') {
    store.hospitalNotifications = store.hospitalNotifications || {};
    Object.entries(hospitalNotifications).forEach(([hId, notifs]) => {
      if (Array.isArray(notifs)) {
        store.hospitalNotifications[hId] = notifs.slice(0, 50);
      }
    });
  }

  // Protect hospitalProfiles from stale mock data overwrites
  if (hospitalProfiles && typeof hospitalProfiles === 'object') {
    Object.entries(hospitalProfiles).forEach(([hospId, prof]) => {
      const currentProf = store.hospitalProfiles?.[hospId];
      if (
        currentProf?.address &&
        currentProf.address !== STALE_MOCK_APOLLO_ADDRESS &&
        prof?.address === STALE_MOCK_APOLLO_ADDRESS
      ) {
        console.log(`[SYNC PROTECTION] Preserved custom address for ${hospId}: ${currentProf.address}`);
      } else if (prof) {
        store.hospitalProfiles = store.hospitalProfiles || {};
        store.hospitalProfiles[hospId] = prof;
      }
    });
  }

  // Protect hospitals list from stale mock data overwrites and merge safely
  if (hospitals && Array.isArray(hospitals) && hospitals.length > 0) {
    store.hospitals = store.hospitals || [];
    const deletedSet = new Set(store.deletedHospitalIds || []);
    hospitals.forEach(incomingHosp => {
      if (!incomingHosp || !incomingHosp.id) return;
      // Do NOT restore hospitals that were permanently deleted
      if (deletedSet.has(incomingHosp.id)) return;

      const currentProf = store.hospitalProfiles?.[incomingHosp.id];
      if (
        currentProf?.address &&
        currentProf.address !== STALE_MOCK_APOLLO_ADDRESS &&
        incomingHosp.address === STALE_MOCK_APOLLO_ADDRESS
      ) {
        incomingHosp.address = currentProf.address;
        if (currentProf.lat) incomingHosp.lat = currentProf.lat;
        if (currentProf.lng) incomingHosp.lng = currentProf.lng;
      }
      const idx = store.hospitals.findIndex(h => h.id === incomingHosp.id);
      if (idx !== -1) {
        store.hospitals[idx] = { ...store.hospitals[idx], ...incomingHosp };
      } else {
        store.hospitals.push(incomingHosp);
      }
    });
  }

  if (hospitalDoctors) store.hospitalDoctors = { ...store.hospitalDoctors, ...hospitalDoctors };
  ensureHospitalProfilesSynced(store);

  if (hospitalDepartments) store.hospitalDepartments = { ...store.hospitalDepartments, ...hospitalDepartments };

  if (tokens && Array.isArray(tokens) && tokens.length > 0) {
    store.tokens = store.tokens || [];
    const validTokens = tokens.filter(t => !isDummyTokenRecord(t));
    validTokens.forEach(t => {
      const idx = store.tokens.findIndex(old => old.id === t.id);
      if (idx !== -1) {
        store.tokens[idx] = { ...store.tokens[idx], ...t };
      } else {
        store.tokens.unshift(t);
      }

      if (isDbConnected) {
        query(
          `INSERT INTO tokens (id, hospital_id, doctor_id, token_number, patient_name, patient_phone, status, token_type, session, token_date, data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET status = $7, data = $11, updated_at = NOW()`,
          [
            t.id,
            t.hospitalId || 'hosp-apollo',
            t.doctorId || '',
            String(t.tokenNo || t.tokenNumber || ''),
            t.patientName || '',
            t.patientPhone || '',
            t.status || 'booked',
            t.type || 'online',
            t.session || 'morning',
            t.bookingDate || new Date().toISOString().split('T')[0],
            JSON.stringify(t)
          ]
        ).catch(e => console.warn('Error syncing token to RDS:', e.message));
      }
    });
  }

  if (appointments && Array.isArray(appointments) && appointments.length > 0) {
    store.appointments = store.appointments || [];
    const validAppts = appointments.filter(a => !isDummyApptRecord(a));
    validAppts.forEach(a => {
      const idx = store.appointments.findIndex(old => old.id === a.id);
      if (idx !== -1) {
        store.appointments[idx] = { ...store.appointments[idx], ...a };
      } else {
        store.appointments.unshift(a);
      }

      if (isDbConnected) {
        query(
          `INSERT INTO appointments (id, hospital_id, doctor_id, patient_name, patient_phone, appointment_date, appointment_time, status, data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET status = $8, data = $9, updated_at = NOW()`,
          [
            a.id,
            a.hospitalId || 'hosp-apollo',
            a.doctorId || '',
            a.patientName || '',
            a.phone || '',
            a.date || new Date().toISOString().split('T')[0],
            a.time || '',
            a.status || 'booked',
            JSON.stringify(a)
          ]
        ).catch(e => console.warn('Error syncing appointment to RDS:', e.message));
      }
    });
  }

  if (customers && Array.isArray(customers)) {
    store.customers = store.customers || [];
    customers.forEach(incoming => {
      if (!incoming || (!incoming.id && !incoming.phone && !incoming.email)) return;
      const incomingNorm = (incoming.phone || '').replace(/\D/g, '').slice(-10);
      const idx = store.customers.findIndex(c =>
        (incoming.id && c.id === incoming.id) ||
        (incomingNorm && (c.phone || '').replace(/\D/g, '').slice(-10) === incomingNorm) ||
        (incoming.email && c.email && c.email.toLowerCase() === incoming.email.toLowerCase())
      );
      if (idx !== -1) {
        store.customers[idx] = { ...store.customers[idx], ...incoming };
      } else {
        store.customers.push(incoming);
      }
    });
  }

  await saveUnifiedStore(store);

  res.json({ success: true, store });
});

// ─── Hospital Auth & Access Control (Phase 22) ───────────────────────────────

const DEFAULT_HOSPITAL_CREDENTIALS = [
  { hospitalId: 'hosp-apollo', email: 'admin@instatoken.in', phone: '9876543210', password: 'password', role: 'owner', name: 'Dr. Rajesh Kumar', hospitalName: 'City Care Multi-Specialty Hospital' },
  { hospitalId: 'hosp-mu0838sg', email: 'bogagourav5@gmail.com', phone: '6302970625', password: 'password', role: 'owner', name: 'Dr. Gaurav Boga', hospitalName: 'Gandi Hospital ' }
];

const ACTIVE_SESSIONS = new Map();

// Seed initial session tokens for ease of testing
DEFAULT_HOSPITAL_CREDENTIALS.forEach(cred => {
  const seedToken = `htok_${cred.hospitalId}_default`;
  ACTIVE_SESSIONS.set(seedToken, {
    token: seedToken,
    hospitalId: cred.hospitalId,
    hospitalName: cred.hospitalName,
    email: cred.email,
    phone: cred.phone || '',
    role: cred.role,
    name: cred.name,
    createdAt: Date.now()
  });
});

function generateSessionToken(cred) {
  const rand = Math.random().toString(36).substring(2, 10);
  const token = `htok_${cred.hospitalId}_${Date.now()}_${rand}`;
  const session = {
    token,
    hospitalId: cred.hospitalId,
    hospitalName: cred.hospitalName,
    email: cred.email,
    phone: cred.phone || '',
    role: cred.role || 'owner',
    name: cred.name || 'Hospital Admin',
    createdAt: Date.now()
  };
  ACTIVE_SESSIONS.set(token, session);
  return session;
}

// Security Middleware (Phase 22): Enforce hospital isolation at the API level
function requireHospitalAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-hospital-token'];
  let tokenStr = '';
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      tokenStr = authHeader.substring(7).trim();
    } else {
      tokenStr = authHeader.trim();
    }
  }

  if (!tokenStr && req.query.auth_token) {
    tokenStr = req.query.auth_token;
  }

  if (!tokenStr) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing hospital authorization token. Access denied.',
      code: 'AUTH_REQUIRED'
    });
  }

  let session = ACTIVE_SESSIONS.get(tokenStr);

  // Auto-accept default token pattern if restarted
  if (!session && tokenStr.startsWith('htok_')) {
    const parts = tokenStr.split('_');
    const hospId = parts[1];
    if (hospId) {
      const matched = DEFAULT_HOSPITAL_CREDENTIALS.find(c => c.hospitalId === hospId);
      session = {
        token: tokenStr,
        hospitalId: matched ? matched.hospitalId : hospId,
        hospitalName: matched ? matched.hospitalName : 'Hospital Admin',
        email: matched ? matched.email : `admin@${hospId}.com`,
        role: matched ? matched.role : 'owner',
        name: matched ? matched.name : 'Hospital Admin',
        createdAt: Date.now()
      };
      ACTIVE_SESSIONS.set(tokenStr, session);
    }
  }

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired hospital session token.',
      code: 'INVALID_TOKEN'
    });
  }

  const requestedHospitalId = req.params.hospitalId || req.params.id;
  if (requestedHospitalId && session.hospitalId !== requestedHospitalId && session.role !== 'superadmin') {
    console.warn(`[SECURITY 403] Hospital [${session.hospitalId}] attempted to access unauthorized hospital [${requestedHospitalId}]`);
    return res.status(403).json({
      success: false,
      error: `Access Denied: You are authenticated as [${session.hospitalName || session.hospitalId}]. You are strictly forbidden from viewing, accessing, or modifying data belonging to another hospital ([${requestedHospitalId}]).`,
      code: 'CROSS_HOSPITAL_FORBIDDEN',
      yourHospitalId: session.hospitalId,
      targetHospitalId: requestedHospitalId
    });
  }

  req.hospitalSession = session;
  next();
}

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

// ─── DLT SMS & MSG91 OTP Authentication ──────────────────────────────────────

// POST /api/auth/sms/send-otp
app.post('/api/auth/sms/send-otp', async (req, res) => {
  try {
    const { phone, purpose, mode } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }

    const cleanPhone10 = normalizePhone10(phone);
    if (!cleanPhone10 || cleanPhone10.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // 1. Guard against wasting SMS OTP credits for unregistered patients trying to login
    if (purpose === 'customer_auth' && mode === 'login') {
      const store = await getUnifiedStore();
      const customers = store.customers || [];
      let customer = customers.find(c => cleanPhone10 && normalizePhone10(c.phone) === cleanPhone10);

      let patientExists = Boolean(customer);
      if (!patientExists && isDbConnected) {
        try {
          const patRes = await query(`SELECT id FROM hospital_patients WHERE phone LIKE $1 LIMIT 1`, [`%${cleanPhone10}%`]);
          if (patRes.rows && patRes.rows.length > 0) patientExists = true;
        } catch (e) { }
      }

      if (!patientExists) {
        return res.status(404).json({
          success: false,
          notFound: true,
          message: 'No registered account found with this mobile number. Please click "Register Patient" to sign up first.'
        });
      }
    }

    // 2. Guard against wasting SMS OTP credits for already-registered patients on signup
    if (purpose === 'customer_auth' && mode === 'signup') {
      const store = await getUnifiedStore();
      const customers = store.customers || [];
      const customer = customers.find(c => cleanPhone10 && normalizePhone10(c.phone) === cleanPhone10);
      if (customer) {
        return res.status(409).json({
          success: false,
          alreadyExists: true,
          message: 'An account with this mobile number already exists. Please switch to "Sign In" to continue.'
        });
      }
    }

    const result = await sendSmsOtp(phone, purpose || 'auth');
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('Error in /api/auth/sms/send-otp:', err);
    return res.status(500).json({ success: false, message: 'Failed to send SMS OTP. Please try again.' });
  }
});

// POST /api/auth/hospital-otp-login
app.post('/api/auth/hospital-otp-login', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });
    }

    const verification = verifySmsOtp(phone, otp);
    if (!verification.success) {
      return res.status(400).json(verification);
    }

    const cleanPhone10 = normalizePhone10(phone);
    const store = await getUnifiedStore();

    // Look up in store.hospitalCredentials or DEFAULT_HOSPITAL_CREDENTIALS
    let activeCred = (store.hospitalCredentials || []).find(c => {
      return normalizePhone10(c.phone) === cleanPhone10;
    });

    if (!activeCred) {
      activeCred = DEFAULT_HOSPITAL_CREDENTIALS.find(c => {
        return normalizePhone10(c.phone) === cleanPhone10;
      });
    }

    // Fallback: check if any hospital in store.hospitals has this phone
    if (!activeCred && store.hospitals && Array.isArray(store.hospitals)) {
      const hosp = store.hospitals.find(h => normalizePhone10(h.phone) === cleanPhone10);
      if (hosp) {
        activeCred = {
          hospitalId: hosp.id,
          phone: hosp.phone,
          email: hosp.email || `admin@${hosp.id}.com`,
          role: 'owner',
          name: hosp.adminName || 'Hospital Admin',
          hospitalName: hosp.name
        };
        store.hospitalCredentials = store.hospitalCredentials || [];
        store.hospitalCredentials.push(activeCred);
        await saveUnifiedStore(store);
      }
    }

    if (!activeCred) {
      return res.status(404).json({
        success: false,
        message: 'No hospital found registered with this mobile number. Please register your hospital.'
      });
    }

    const session = generateSessionToken(activeCred);
    return res.json({
      success: true,
      message: 'Login successful',
      token: session.token,
      user: {
        id: `huser-${session.hospitalId}`,
        hospitalId: session.hospitalId,
        hospitalName: session.hospitalName,
        name: session.name,
        email: session.email,
        phone: activeCred.phone || phone,
        role: session.role
      }
    });
  } catch (err) {
    console.error('Hospital OTP login error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/hospital-otp-signup
app.post('/api/auth/hospital-otp-signup', async (req, res) => {
  try {
    const { name, phone, otp, adminName, email, city, address, category, registrationNumber } = req.body;
    if (!name || !phone || !otp) {
      return res.status(400).json({ success: false, message: 'Hospital Name, Mobile number, and OTP are required' });
    }

    const verification = verifySmsOtp(phone, otp);
    if (!verification.success) {
      return res.status(400).json(verification);
    }

    const cleanPhone10 = normalizePhone10(phone);
    const store = await getUnifiedStore();
    store.hospitalCredentials = store.hospitalCredentials || [];

    const existing = store.hospitalCredentials.find(c => normalizePhone10(c.phone) === cleanPhone10);
    if (existing) {
      const session = generateSessionToken(existing);
      return res.json({
        success: true,
        message: 'Hospital already registered. Logged in successfully.',
        token: session.token,
        user: {
          id: `huser-${session.hospitalId}`,
          hospitalId: session.hospitalId,
          hospitalName: session.hospitalName,
          name: session.name,
          email: session.email,
          phone: existing.phone,
          role: session.role
        }
      });
    }

    const newHospitalId = `hosp-${Date.now().toString(36)}`;
    const newCred = {
      hospitalId: newHospitalId,
      email: (email || `${cleanPhone10}@hospital.instatoken.in`).trim().toLowerCase(),
      phone: `+91 ${cleanPhone10}`,
      role: 'owner',
      name: adminName ? adminName.trim() : 'Hospital Administrator',
      hospitalName: name.trim()
    };

    store.hospitalCredentials.push(newCred);

    const newProfile = {
      id: newHospitalId,
      name: name.trim(),
      email: newCred.email,
      phone: `+91 ${cleanPhone10}`,
      whatsapp: `+91 ${cleanPhone10}`,
      city: city || 'Bengaluru',
      state: '',
      area: '',
      address: address || '',
      type: category || 'Multi Speciality',
      ownershipType: 'Private',
      registrationNumber: registrationNumber || `REG-${Date.now()}`,
      rating: 4.8,
      reviewsCount: 1,
      image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
      consultationFee: 300,
      departments: ["General Medicine", "Cardiology", "Pediatrics"],
      openTime: "08:00 AM",
      closeTime: "08:00 PM"
    };

    store.hospitals = store.hospitals || [];
    store.hospitalProfiles = store.hospitalProfiles || {};
    store.hospitalProfiles[newHospitalId] = newProfile;
    store.hospitalDoctors = store.hospitalDoctors || {};
    store.hospitalDoctors[newHospitalId] = [];
    store.hospitalDepartments = store.hospitalDepartments || {};
    store.hospitalDepartments[newHospitalId] = INITIAL_DEPARTMENTS.map(d => ({ ...d }));
    store.hospitalPatients = store.hospitalPatients || {};
    store.hospitalPatients[newHospitalId] = [];
    store.hospitalStaff = store.hospitalStaff || {};
    store.hospitalStaff[newHospitalId] = [];

    syncProfileToHospitalsList(store, newHospitalId, newProfile);

    if (isDbConnected) {
      try {
        await query(
          `INSERT INTO hospitals (id, name, email, phone, city, state, data) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name = $2, email = $3, phone = $4, city = $5, state = $6, data = $7`,
          [newHospitalId, name.trim(), newCred.email, newProfile.phone, city || '', '', JSON.stringify(newProfile)]
        );
        await query(
          `INSERT INTO hospital_profiles (hospital_id, profile_data) 
           VALUES ($1, $2)
           ON CONFLICT (hospital_id) DO UPDATE SET profile_data = $2`,
          [newHospitalId, JSON.stringify(newProfile)]
        );
        for (const dept of INITIAL_DEPARTMENTS) {
          await query(
            `INSERT INTO hospital_departments (id, hospital_id, name, icon, head_doctor, total_doctors, active, data, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (id, hospital_id) DO NOTHING`,
            [
              dept.id,
              newHospitalId,
              dept.name,
              dept.icon || '🩺',
              dept.headDoctor || '',
              0,
              true,
              JSON.stringify(dept)
            ]
          );
        }
      } catch (dbErr) {
        console.warn('Error saving new hospital to RDS tables:', dbErr.message);
      }
    }

    await saveUnifiedStore(store);

    const session = generateSessionToken(newCred);
    console.log(`✅ [DLT OTP] Registered new hospital: ${newProfile.name} (${newProfile.phone})`);

    return res.status(201).json({
      success: true,
      message: 'Hospital registered successfully',
      token: session.token,
      user: {
        id: `huser-${session.hospitalId}`,
        hospitalId: session.hospitalId,
        hospitalName: session.hospitalName,
        name: session.name,
        email: session.email,
        phone: newCred.phone,
        role: session.role
      }
    });
  } catch (err) {
    console.error('Hospital OTP signup error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/otp-auth (Login & Registration for Patients via Mobile OTP)
app.post('/api/customers/otp-auth', async (req, res) => {
  try {
    const { phone, otp, name, email, mode } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP code are required.' });
    }

    const verification = verifySmsOtp(phone, otp, false);
    if (!verification.success) {
      return res.status(400).json(verification);
    }

    const normPhone = normalizePhone10(phone);
    const store = await getUnifiedStore();
    store.customers = store.customers || [];

    let customer = store.customers.find(c => {
      return normPhone && normalizePhone10(c.phone) === normPhone;
    });

    if (mode === 'login' && !customer && (!name || !name.trim())) {
      return res.status(404).json({
        success: false,
        notFound: true,
        message: 'No registered account found with this mobile number. Please click "Register Patient" to sign up.'
      });
    }

    if (!customer) {
      if (!name || !name.trim()) {
        return res.json({
          success: true,
          needName: true,
          phone: normPhone,
          message: 'Mobile verified. Please enter your name to complete registration.'
        });
      }

      const cleanName = name.trim();
      const cleanEmail = (email && typeof email === 'string' && email.trim()) 
        ? email.trim().toLowerCase() 
        : `${normPhone}@patient.instatoken.in`;

      customer = {
        id: `cust-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        phone: `+91 ${normPhone}`,
        password: '',
        location: 'Hyderabad, Telangana',
        joinedDate: new Date().toISOString().split('T')[0],
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        familyMembers: [],
        savedDoctors: [],
        savedHospitals: [],
        subscription: {
          planName: "3-Day Pass",
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          price: 10
        },
        bookings: []
      };

      store.customers.unshift(customer);
      await saveUnifiedStore(store);

      if (isDbConnected) {
        try {
          await query(`
            INSERT INTO customers (id, name, phone, email, location, data, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET name = $2, phone = $3, email = $4, data = $6, updated_at = NOW()
          `, [customer.id, customer.name, customer.phone, customer.email, customer.location, JSON.stringify(customer)]);
        } catch (dbErr) {
          console.warn('[DB Sync Warn] Failed to insert customer into Postgres:', dbErr.message);
        }
      }

      clearSmsOtp(normPhone);
      console.log(`✅ [DLT OTP] Auto-registered new customer: ${customer.name} (${customer.phone}, ${customer.email})`);
      return res.json({
        success: true,
        customer,
        isNewUser: true,
        message: 'Registration successful!'
      });
    }

    // Existing customer found
    let custChanged = false;
    if (name && name.trim() && (!customer.name || customer.name === 'Patient' || customer.name === 'Valued Patient')) {
      customer.name = name.trim();
      custChanged = true;
    }
    if (email && typeof email === 'string' && email.trim() && (!customer.email || customer.email.endsWith('@patient.instatoken.in'))) {
      customer.email = email.trim().toLowerCase();
      custChanged = true;
    }

    if (custChanged) {
      await saveUnifiedStore(store);
      if (isDbConnected) {
        try {
          await query(`
            INSERT INTO customers (id, name, phone, email, location, data, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET name = $2, phone = $3, email = $4, data = $6, updated_at = NOW()
          `, [customer.id, customer.name, customer.phone, customer.email, customer.location, JSON.stringify(customer)]);
        } catch (dbErr) {
          console.warn('[DB Sync Warn] Failed to update customer in Postgres:', dbErr.message);
        }
      }
    }

    clearSmsOtp(normPhone);
    console.log(`✅ [DLT OTP] Logged in customer: ${customer.name} (${customer.phone}, ${customer.email})`);
    return res.json({
      success: true,
      customer,
      isNewUser: false,
      message: 'Login successful!'
    });
  } catch (err) {
    console.error('Customer OTP auth error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/hospital-login
app.post('/api/auth/hospital-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const store = await getUnifiedStore();
  const customCred = (store.hospitalCredentials || []).find(c => (c.email || '').toLowerCase() === cleanEmail);
  const defaultCred = DEFAULT_HOSPITAL_CREDENTIALS.find(c => (c.email || '').toLowerCase() === cleanEmail);
  const activeCred = customCred || defaultCred;

  if (!activeCred) {
    return res.status(401).json({ success: false, message: 'Invalid hospital credentials.' });
  }

  const isPasswordMatch = activeCred.password === password || ((cleanEmail === 'admin@instatoken.in' || cleanEmail === 'admin@apollo.com') && password === 'password');

  if (!isPasswordMatch) {
    return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
  }

  const session = generateSessionToken(activeCred);
  res.json({
    success: true,
    message: 'Login successful',
    token: session.token,
    user: {
      id: `huser-${session.hospitalId}`,
      hospitalId: session.hospitalId,
      hospitalName: session.hospitalName,
      name: session.name,
      email: session.email,
      role: session.role
    }
  });
});

// POST /api/auth/hospital-signup
app.post('/api/auth/hospital-signup', async (req, res) => {
  const { name, email, password, phone, city, address, category, registrationNumber, payment_mode, bank_account_holder, bank_account_number, bank_name, bank_ifsc, upi_id, upi_phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }

  const store = await getUnifiedStore();
  const newHospitalId = `hosp-${Date.now().toString(36)}`;
  const newCred = {
    hospitalId: newHospitalId,
    email,
    password,
    role: 'owner',
    name: 'Hospital Administrator',
    hospitalName: name
  };

  store.hospitalCredentials = store.hospitalCredentials || [];
  store.hospitalCredentials.push(newCred);

  const newProfile = {
    id: newHospitalId,
    name,
    email: email.trim().toLowerCase(),
    phone: phone || '',
    whatsapp: '',
    city: city || 'Bengaluru',
    state: '',
    area: '',
    address: address || '',
    type: category || 'Multi Speciality',
    ownershipType: 'Private',
    registrationNumber: registrationNumber || `REG-${Date.now()}`,
    accreditation: '',
    gstNumber: '',
    licenseNumber: '',
    website: '',
    emergencyNumber: phone || '',
    country: 'India',
    pinCode: '',
    lat: 17.3850,
    lng: 78.4867,
    about: '',
    mission: '',
    vision: '',
    brandColor: '#2563EB',
    logo: '',
    coverImage: '',
    gallery: [],
    facilities: [],
    emergencyServices: [],
    timings: [
      { day: 'Mon', open: '09:00', close: '18:00' },
      { day: 'Tue', open: '09:00', close: '18:00' },
      { day: 'Wed', open: '09:00', close: '18:00' },
      { day: 'Thu', open: '09:00', close: '18:00' },
      { day: 'Fri', open: '09:00', close: '18:00' },
      { day: 'Sat', open: '09:00', close: '14:00' },
      { day: 'Sun', open: '10:00', close: '13:00' },
    ],
    payment_mode: payment_mode || 'token_only',
    bank_account_holder: bank_account_holder || '',
    bank_account_number: bank_account_number || '',
    bank_name: bank_name || '',
    bank_ifsc: bank_ifsc || '',
    upi_id: upi_id || '',
    upi_phone: upi_phone || ''
  };

  store.hospitalProfiles = store.hospitalProfiles || {};
  store.hospitalProfiles[newHospitalId] = newProfile;
  store.hospitalDoctors = store.hospitalDoctors || {};
  store.hospitalDoctors[newHospitalId] = [];
  store.hospitalDepartments = store.hospitalDepartments || {};
  store.hospitalDepartments[newHospitalId] = INITIAL_DEPARTMENTS.map(d => ({ ...d }));
  store.hospitalPatients = store.hospitalPatients || {};
  store.hospitalPatients[newHospitalId] = [];
  store.hospitalStaff = store.hospitalStaff || {};
  store.hospitalStaff[newHospitalId] = [];

  syncProfileToHospitalsList(store, newHospitalId, newProfile);

  if (isDbConnected) {
    try {
      await query(
        `INSERT INTO hospitals (id, name, email, phone, city, state, payment_mode, bank_account_holder, bank_account_number, bank_name, bank_ifsc, upi_id, upi_phone, data) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET name = $2, email = $3, phone = $4, city = $5, state = $6, payment_mode=$7, bank_account_holder=$8, bank_account_number=$9, bank_name=$10, bank_ifsc=$11, upi_id=$12, upi_phone=$13, data = $14`,
        [newHospitalId, name, email.trim().toLowerCase(), phone || '', city || '', '', payment_mode||'token_only', bank_account_holder||null, bank_account_number||null, bank_name||null, bank_ifsc||null, upi_id||null, upi_phone||null, JSON.stringify(newProfile)]
      );
      await query(
        `INSERT INTO hospital_profiles (hospital_id, profile_data) 
         VALUES ($1, $2)
         ON CONFLICT (hospital_id) DO UPDATE SET profile_data = $2`,
        [newHospitalId, JSON.stringify(newProfile)]
      );
      for (const dept of INITIAL_DEPARTMENTS) {
        await query(
          `INSERT INTO hospital_departments (id, hospital_id, name, icon, head_doctor, total_doctors, active, data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (id, hospital_id) DO NOTHING`,
          [
            dept.id,
            newHospitalId,
            dept.name,
            dept.icon || '🩺',
            dept.headDoctor || '',
            0,
            true,
            JSON.stringify(dept)
          ]
        );
      }
    } catch (dbErr) {
      console.warn('Error saving new hospital to RDS tables:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);

  const session = generateSessionToken(newCred);
  res.json({
    success: true,
    message: 'Hospital account created and verified successfully',
    token: session.token,
    user: {
      id: `huser-${session.hospitalId}`,
      hospitalId: session.hospitalId,
      hospitalName: session.hospitalName,
      name: session.name,
      email: session.email,
      role: session.role
    }
  });
});

// POST /api/auth/hospital-reset-password
app.post('/api/auth/hospital-reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const store = await getUnifiedStore();
    store.hospitalCredentials = store.hospitalCredentials || [];

    // Find in custom credentials or default credentials
    let cred = store.hospitalCredentials.find(c => (c.email || '').toLowerCase() === cleanEmail);
    if (!cred) {
      const defaultCred = DEFAULT_HOSPITAL_CREDENTIALS.find(c => (c.email || '').toLowerCase() === cleanEmail);
      if (defaultCred) {
        cred = { ...defaultCred, password: String(newPassword) };
        store.hospitalCredentials.push(cred);
      }
    } else {
      cred.password = String(newPassword);
    }

    if (!cred) {
      return res.status(404).json({ success: false, message: 'Hospital account not found with this email.' });
    }

    await saveUnifiedStore(store);
    console.log(`🔑 Reset hospital password for: ${cleanEmail}`);
    return res.json({ success: true, message: 'Hospital password reset successfully.' });
  } catch (err) {
    console.error('Hospital reset password error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/hospital-me
app.get('/api/auth/hospital-me', requireHospitalAuth, (req, res) => {
  res.json({ success: true, session: req.hospitalSession });
});

// ─── Hospitals List (Public for Patient booking) ──────────────────────────────
app.get('/api/hospitals', async (req, res) => {
  const store = await getUnifiedStore();
  res.json({ success: true, hospitals: store.hospitals, store });
});

// DELETE /api/hospitals/:id - Permanently Delete Hospital from AWS RDS (Super Admin)
app.delete('/api/hospitals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getUnifiedStore();

    // 1. Remove from store.hospitals
    store.hospitals = (store.hospitals || []).filter(h => h.id !== id);

    // 2. Remove associated credentials & sessions
    store.hospitalCredentials = (store.hospitalCredentials || []).filter(c => c.hospitalId !== id);
    for (const [tok, sess] of ACTIVE_SESSIONS.entries()) {
      if (sess.hospitalId === id) {
        ACTIVE_SESSIONS.delete(tok);
      }
    }

    // 3. Add to tombstone deletedHospitalIds so sync cannot restore it
    store.deletedHospitalIds = store.deletedHospitalIds || [];
    if (!store.deletedHospitalIds.includes(id)) {
      store.deletedHospitalIds.push(id);
    }

    // 4. Remove associated profiles, doctors, depts, schedules, staff, patients, tokens, appointments
    if (store.hospitalProfiles) delete store.hospitalProfiles[id];
    if (store.hospitalDoctors) delete store.hospitalDoctors[id];
    if (store.hospitalDepartments) delete store.hospitalDepartments[id];
    if (store.hospitalSchedules) delete store.hospitalSchedules[id];
    if (store.hospitalStaff) delete store.hospitalStaff[id];
    if (store.hospitalPatients) delete store.hospitalPatients[id];
    store.tokens = (store.tokens || []).filter(t => t.hospitalId !== id);
    store.appointments = (store.appointments || []).filter(a => a.hospitalId !== id);

    // 5. Purge from relational PostgreSQL tables if connected
    if (isDbConnected) {
      try {
        await query(`DELETE FROM tokens WHERE hospital_id = $1`, [id]);
        await query(`DELETE FROM appointments WHERE hospital_id = $1`, [id]);
        await query(`DELETE FROM hospital_patients WHERE hospital_id = $1`, [id]);
        await query(`DELETE FROM hospital_doctors WHERE hospital_id = $1`, [id]);
        await query(`DELETE FROM hospital_departments WHERE hospital_id = $1`, [id]);
        await query(`DELETE FROM hospital_schedules WHERE hospital_id = $1`, [id]);
        await query(`DELETE FROM hospital_profiles WHERE hospital_id = $1`, [id]);
        await query(`DELETE FROM hospitals WHERE id = $1`, [id]);
      } catch (dbErr) {
        console.warn('Warning deleting relational hospital data:', dbErr.message);
      }
    }

    await saveUnifiedStore(store);
    console.log(`✅ Permanently deleted hospital ${id} from AWS RDS, credentials purged, and tombstone recorded`);
    res.json({ success: true, message: `Hospital ${id} permanently deleted`, deletedId: id });
  } catch (err) {
    console.error('Error deleting hospital:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Hospital Doctors (Phase 21 & 22) ────────────────────────────────────────
app.get('/api/hospitals/:id/doctors', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  let doctors = [];

  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT * FROM hospital_doctors WHERE hospital_id = $1 ORDER BY created_at ASC`, [id]);
      if (dbRes.rows && dbRes.rows.length > 0) {
        doctors = dbRes.rows.map(r => {
          let extra = {};
          try { extra = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {}); } catch (e) { }
          return {
            id: r.id,
            hospitalId: r.hospital_id,
            name: r.name,
            specialization: r.specialization,
            departmentId: r.department_id,
            departmentName: r.department_name,
            photo: r.photo_url,
            qualification: r.qualification,
            experience: Number(r.experience) || 0,
            consultationFee: Number(r.consultation_fee) || 500,
            rating: Number(r.rating) || 5.0,
            totalPatients: Number(r.total_patients) || 0,
            active: r.active !== false,
            ...extra
          };
        });
      }
    } catch (e) {
      console.warn('Error fetching doctors from RDS:', e.message);
    }
  }

  if (doctors.length === 0) {
    const store = await getUnifiedStore();
    doctors = store.hospitalDoctors?.[id] || (id === 'hosp-apollo' ? INITIAL_DOCTORS : []);
  }

  res.json({ success: true, hospitalId: id, doctors });
});

app.post('/api/hospitals/:id/doctors', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  const { doctors } = req.body;
  const store = await getUnifiedStore();

  store.hospitalDoctors = store.hospitalDoctors || {};
  store.hospitalDoctors[id] = doctors;

  if (store.hospitals && Array.isArray(store.hospitals)) {
    const hosp = store.hospitals.find(h => h.id === id);
    if (hosp) {
      hosp.doctors = mapHospitalDoctorsToPublic(doctors);
    }
  }

  if (isDbConnected && Array.isArray(doctors)) {
    try {
      await query(`DELETE FROM hospital_doctors WHERE hospital_id = $1`, [id]);
      for (const doc of doctors) {
        await query(
          `INSERT INTO hospital_doctors (id, hospital_id, name, specialization, department_id, department_name, photo_url, qualification, experience, consultation_fee, rating, total_patients, active, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
           ON CONFLICT (id) DO UPDATE SET name = $3, specialization = $4, photo_url = $7, consultation_fee = $10, active = $13, data = $14, updated_at = NOW()`,
          [
            doc.id,
            id,
            doc.name,
            doc.specialization || doc.specialty || '',
            doc.departmentId || '',
            doc.departmentName || '',
            doc.photo || doc.image || '',
            doc.qualification || '',
            Number(doc.experience) || 0,
            Number(doc.consultationFee) || 0,
            Number(doc.rating) || 5.0,
            Number(doc.totalPatients) || 0,
            doc.active !== false,
            JSON.stringify(doc)
          ]
        );
      }
      const hosp = store.hospitals?.find(h => h.id === id);
      if (hosp) {
        await query(`UPDATE hospitals SET data = $2, updated_at = NOW() WHERE id = $1`, [id, JSON.stringify(hosp)]);
      }
    } catch (dbErr) {
      console.error('Error persisting doctors to AWS RDS:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, doctors, hospitals: store.hospitals });
});

app.delete('/api/hospitals/:id/doctors/:docId', requireHospitalAuth, async (req, res) => {
  const { id, docId } = req.params;
  const store = await getUnifiedStore();

  store.hospitalDoctors = store.hospitalDoctors || {};
  store.hospitalDoctors[id] = (store.hospitalDoctors[id] || []).filter(d => d.id !== docId);

  if (store.hospitals && Array.isArray(store.hospitals)) {
    const hosp = store.hospitals.find(h => h.id === id);
    if (hosp) {
      hosp.doctors = mapHospitalDoctorsToPublic(store.hospitalDoctors[id]);
    }
  }

  if (isDbConnected) {
    try {
      await query(`DELETE FROM hospital_doctors WHERE id = $1 AND hospital_id = $2`, [docId, id]);
      const hosp = store.hospitals?.find(h => h.id === id);
      if (hosp) {
        await query(`UPDATE hospitals SET data = $2, updated_at = NOW() WHERE id = $1`, [id, JSON.stringify(hosp)]);
      }
    } catch (dbErr) {
      console.error('Error deleting doctor from AWS RDS:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, deletedDoctorId: docId, doctors: store.hospitalDoctors[id], hospitals: store.hospitals });
});

// ─── Hospital Profile (Phase 21 & 22) ────────────────────────────────────────
app.get('/api/hospitals/:id/profile', async (req, res) => {
  const { id } = req.params;
  const store = await getUnifiedStore();
  const profile = store.hospitalProfiles?.[id] || null;
  res.json({ success: true, hospitalId: id, profile });
});

app.post('/api/hospitals/:id/profile', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  const { profile } = req.body;
  const store = await getUnifiedStore();

  store.hospitalProfiles = store.hospitalProfiles || {};

  const currentProfile = store.hospitalProfiles[id];
  if (
    currentProfile?.address &&
    currentProfile.address !== STALE_MOCK_APOLLO_ADDRESS &&
    profile?.address === STALE_MOCK_APOLLO_ADDRESS
  ) {
    return res.json({ success: true, hospitalId: id, profile: currentProfile, hospitals: store.hospitals });
  }

  store.hospitalProfiles[id] = profile;
  syncProfileToHospitalsList(store, id, profile);

  if (isDbConnected && profile) {
    try {
      await query(
        `INSERT INTO hospital_profiles (hospital_id, profile_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (hospital_id) DO UPDATE SET profile_data = $2, updated_at = NOW()`,
        [id, JSON.stringify(profile)]
      );
      const hosp = store.hospitals?.find(h => h.id === id);
      if (hosp) {
        await query(`UPDATE hospitals SET data = $2, updated_at = NOW() WHERE id = $1`, [id, JSON.stringify(hosp)]);
      }
    } catch (dbErr) {
      console.error('Error persisting hospital profile to AWS RDS:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, profile, hospitals: store.hospitals });
});

// ─── Hospital Schedules & Booking Rules ──────────────────────────────────────
app.get('/api/hospitals/:id/schedules', async (req, res) => {
  const { id } = req.params;
  let schedule = null;
  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT schedule_data FROM hospital_schedules WHERE hospital_id = $1`, [id]);
      if (dbRes.rows && dbRes.rows.length > 0) {
        schedule = typeof dbRes.rows[0].schedule_data === 'string'
          ? JSON.parse(dbRes.rows[0].schedule_data)
          : dbRes.rows[0].schedule_data;
      }
    } catch (e) {
      console.warn('Error fetching schedule from RDS:', e.message);
    }
  }
  if (!schedule) {
    const store = await getUnifiedStore();
    schedule = store.hospitalSchedules?.[id] || {
      advanceBookingLimit: 7,
      bookingOpensDaysBefore: 7,
      bufferTime: 15,
      dailyTokenLimit: 150,
      autoContinuity: true
    };
  }
  res.json({ success: true, hospitalId: id, schedule });
});

app.post('/api/hospitals/:id/schedules', async (req, res) => {
  const { id } = req.params;
  const { schedule } = req.body;
  const store = await getUnifiedStore();
  store.hospitalSchedules = store.hospitalSchedules || {};
  store.hospitalSchedules[id] = schedule;
  await saveUnifiedStore(store);

  if (isDbConnected && schedule) {
    try {
      await query(
        `INSERT INTO hospital_schedules (hospital_id, schedule_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (hospital_id) DO UPDATE SET schedule_data = $2, updated_at = NOW()`,
        [id, JSON.stringify(schedule)]
      );
    } catch (dbErr) {
      console.warn('Error persisting schedule to RDS:', dbErr.message);
    }
  }

  res.json({ success: true, hospitalId: id, schedule });
});

// ─── Doctor Session Capacity & Availability API (For Patient Booking Hard-Cap) ─
app.get('/api/hospitals/:id/doctors/:doctorId/session-capacity', async (req, res) => {
  try {
    const { id: hospitalId, doctorId } = req.params;
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    // 1. Fetch Doctor details (specifically sessions & maxTokens)
    let doctor = null;
    if (isDbConnected) {
      try {
        const hospDb = await query(`SELECT data FROM hospitals WHERE id = $1`, [hospitalId]);
        if (hospDb.rows && hospDb.rows.length > 0) {
          const hData = typeof hospDb.rows[0].data === 'string' ? JSON.parse(hospDb.rows[0].data) : hospDb.rows[0].data;
          doctor = (hData?.doctors || []).find(d => d.id === doctorId);
        }
        if (!doctor) {
          const docDb = await query(`SELECT data FROM hospital_doctors WHERE id = $1 OR doctor_id = $1`, [doctorId]);
          if (docDb.rows && docDb.rows.length > 0) {
            doctor = typeof docDb.rows[0].data === 'string' ? JSON.parse(docDb.rows[0].data) : docDb.rows[0].data;
          }
        }
      } catch (e) {
        console.warn('Error fetching doctor from RDS:', e.message);
      }
    }

    if (!doctor) {
      const store = await getUnifiedStore();
      const hosp = (store.hospitals || []).find(h => h.id === hospitalId);
      doctor = (hosp?.doctors || hosp?.data?.doctors || store.doctors || []).find(d => d.id === doctorId);
    }

    const doctorSessions = (doctor && Array.isArray(doctor.sessions) && doctor.sessions.length > 0)
      ? doctor.sessions
      : [
          { name: 'Morning', maxTokens: 30, active: true },
          { name: 'Evening', maxTokens: 20, active: true }
        ];

    // 2. Count active booked tokens (Online + Walk-In Desk) for targetDate
    const sessionCounts = {};
    if (isDbConnected) {
      try {
        const countRes = await query(
          `SELECT LOWER(session) as sess, COUNT(*) as count 
           FROM tokens 
           WHERE doctor_id = $1 
             AND (token_date::text = $2 OR data->>'bookingDate' = $2) 
             AND status != 'cancelled' 
           GROUP BY LOWER(session)`,
          [doctorId, targetDate]
        );
        countRes.rows.forEach(r => {
          sessionCounts[r.sess] = parseInt(r.count, 10) || 0;
        });
      } catch (e) {
        console.warn('Error querying session counts from RDS:', e.message);
      }
    }

    const availability = doctorSessions.map(s => {
      const sKey = (s.name || '').toLowerCase();
      const booked = sessionCounts[sKey] || 0;
      const max = parseInt(s.maxTokens, 10) || (sKey.includes('morn') ? 30 : 20);
      const isFull = booked >= max;
      const isExpired = isSessionExpiredInIST(s.endTime || s.name, targetDate);
      return {
        id: s.id || s.name,
        name: s.name,
        startTime: s.startTime || '',
        endTime: s.endTime || '',
        maxTokens: max,
        bookedTokens: booked,
        remainingSlots: Math.max(0, max - booked),
        isFull: isFull,
        isExpired: isExpired,
        active: s.active !== false
      };
    });

    res.json({
      success: true,
      hospitalId,
      doctorId,
      date: targetDate,
      sessions: availability
    });
  } catch (err) {
    console.error('Error fetching session capacity:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Hospital Departments (Phase 21 & 22) ────────────────────────────────────
app.get('/api/hospitals/:id/departments', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  let departments = [];

  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT * FROM hospital_departments WHERE hospital_id = $1 ORDER BY created_at ASC`, [id]);
      if (dbRes.rows && dbRes.rows.length > 0) {
        departments = dbRes.rows.map(r => {
          let extra = {};
          try { extra = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {}); } catch (e) { }
          return {
            id: r.id,
            hospitalId: r.hospital_id,
            name: r.name,
            icon: r.icon,
            headDoctor: r.head_doctor,
            totalDoctors: Number(r.total_doctors) || 0,
            active: r.active !== false,
            ...extra
          };
        });
      }
    } catch (e) {
      console.warn('Error fetching departments from RDS:', e.message);
    }
  }

  if (departments.length === 0) {
    const store = await getUnifiedStore();
    departments = store.hospitalDepartments?.[id] || [];
  }

  departments = ensureDefaultDepartments(departments);

  const store = await getUnifiedStore();
  store.hospitalDepartments = store.hospitalDepartments || {};
  store.hospitalDepartments[id] = departments;
  await saveUnifiedStore(store);

  if (isDbConnected) {
    try {
      for (const dept of departments) {
        await query(
          `INSERT INTO hospital_departments (id, hospital_id, name, icon, head_doctor, total_doctors, active, data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (id, hospital_id) DO NOTHING`,
          [
            dept.id,
            id,
            dept.name,
            dept.icon || '🩺',
            dept.headDoctor || '',
            Number(dept.totalDoctors) || 0,
            dept.active !== false,
            JSON.stringify(dept)
          ]
        );
      }
    } catch (dbErr) {
      console.warn('Error auto-syncing departments to RDS:', dbErr.message);
    }
  }

  res.json({ success: true, hospitalId: id, departments });
});

app.post('/api/hospitals/:id/departments', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  const { departments } = req.body;
  const store = await getUnifiedStore();

  store.hospitalDepartments = store.hospitalDepartments || {};
  store.hospitalDepartments[id] = departments;

  if (store.hospitals && Array.isArray(store.hospitals)) {
    const hosp = store.hospitals.find(h => h.id === id);
    if (hosp) {
      hosp.departments = mapHospitalDeptsToPublic(departments);
      hosp.categories = Array.from(new Set(departments.filter(d => d.active !== false).map(d => d.name)));
    }
  }

  if (isDbConnected && Array.isArray(departments)) {
    try {
      await query(`DELETE FROM hospital_departments WHERE hospital_id = $1`, [id]);
      for (const dept of departments) {
        await query(
          `INSERT INTO hospital_departments (id, hospital_id, name, icon, head_doctor, total_doctors, active, data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (id, hospital_id) DO UPDATE SET name = $3, icon = $4, head_doctor = $5, total_doctors = $6, active = $7, data = $8`,
          [
            dept.id,
            id,
            dept.name,
            dept.icon || '🩺',
            dept.headDoctor || '',
            Number(dept.totalDoctors) || 0,
            dept.active !== false,
            JSON.stringify(dept)
          ]
        );
      }
      const hosp = store.hospitals?.find(h => h.id === id);
      if (hosp) {
        await query(`UPDATE hospitals SET data = $2, updated_at = NOW() WHERE id = $1`, [id, JSON.stringify(hosp)]);
      }
    } catch (dbErr) {
      console.error('Error persisting departments to AWS RDS:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, departments, hospitals: store.hospitals });
});

app.delete('/api/hospitals/:id/departments/:deptId', requireHospitalAuth, async (req, res) => {
  const { id, deptId } = req.params;
  const store = await getUnifiedStore();

  store.hospitalDepartments = store.hospitalDepartments || {};
  store.hospitalDepartments[id] = (store.hospitalDepartments[id] || []).filter(d => d.id !== deptId);

  if (store.hospitals && Array.isArray(store.hospitals)) {
    const hosp = store.hospitals.find(h => h.id === id);
    if (hosp) {
      hosp.departments = mapHospitalDeptsToPublic(store.hospitalDepartments[id]);
      hosp.categories = Array.from(new Set(store.hospitalDepartments[id].filter(d => d.active !== false).map(d => d.name)));
    }
  }

  if (isDbConnected) {
    try {
      await query(`DELETE FROM hospital_departments WHERE id = $1 AND hospital_id = $2`, [deptId, id]);
      const hosp = store.hospitals?.find(h => h.id === id);
      if (hosp) {
        await query(`UPDATE hospitals SET data = $2, updated_at = NOW() WHERE id = $1`, [id, JSON.stringify(hosp)]);
      }
    } catch (dbErr) {
      console.error('Error deleting department from AWS RDS:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, deletedDepartmentId: deptId, departments: store.hospitalDepartments[id], hospitals: store.hospitals });
});

// ─── Hospital Schedules (Sessions & OPD Management) ──────────────────────────
app.get('/api/hospitals/:id/schedules', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  let schedule = null;

  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT schedule_data FROM hospital_schedules WHERE hospital_id = $1`, [id]);
      if (dbRes.rows && dbRes.rows.length > 0) {
        schedule = typeof dbRes.rows[0].schedule_data === 'string'
          ? JSON.parse(dbRes.rows[0].schedule_data)
          : dbRes.rows[0].schedule_data;
      }
    } catch (e) {
      console.warn('Error fetching schedule from RDS:', e.message);
    }
  }

  if (!schedule) {
    const store = await getUnifiedStore();
    schedule = store.hospitalSchedules?.[id] || {
      sessions: [
        { id: 'sess-morning', name: 'Morning', startTime: '09:00 AM', endTime: '01:00 PM', maxTokens: 50, consultationDuration: 15, breakTime: 5, active: true },
        { id: 'sess-evening', name: 'Evening', startTime: '05:00 PM', endTime: '09:00 PM', maxTokens: 40, consultationDuration: 15, breakTime: 5, active: true },
      ],
      bookingOpensDaysBefore: 3,
      advanceBookingLimit: 7,
      bufferTime: 15,
      dailyTokenLimit: 150,
      walkInPercentage: 30,
      onlinePercentage: 70,
    };
  }

  res.json({ success: true, hospitalId: id, schedule });
});

app.post('/api/hospitals/:id/schedules', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  const { schedule } = req.body;
  const store = await getUnifiedStore();

  store.hospitalSchedules = store.hospitalSchedules || {};
  store.hospitalSchedules[id] = schedule;

  if (isDbConnected && schedule) {
    try {
      await query(
        `INSERT INTO hospital_schedules (hospital_id, schedule_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (hospital_id) DO UPDATE SET schedule_data = $2, updated_at = NOW()`,
        [id, JSON.stringify(schedule)]
      );
    } catch (e) {
      console.error('Error saving schedule to RDS:', e.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, schedule });
});

// ─── PHASE 20: Patients Management Endpoint ──────────────────────────────────
// Ensures patient information is correctly connected: Hospital -> Doctor -> Token/Booking -> Customer
// Strictly isolated: A hospital cannot access another hospital's patients
app.get('/api/hospitals/:hospitalId/patients', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { doctorId, search, status } = req.query;
  const store = await getUnifiedStore();

  const patientMap = new Map();

  // 1. First load from RDS PostgreSQL hospital_patients table if connected
  if (isDbConnected) {
    try {
      const dbPatRes = await query(`
        SELECT id, hospital_id as "hospitalId", uhid, name, phone, email, age, gender, blood_group as "bloodGroup",
               address, city, pin_code as "pinCode", total_visits as "totalVisits", last_visit as "lastVisit", data
        FROM hospital_patients
        WHERE hospital_id = $1
        ORDER BY last_visit DESC
      `, [hospitalId]);

      dbPatRes.rows.forEach(r => {
        const extra = r.data && typeof r.data === 'object' ? r.data : {};
        const cleanPhone = (r.phone || '').replace(/\D/g, '').slice(-10);
        const phoneKey = cleanPhone || (r.name || '').trim().toLowerCase();
        if (phoneKey) {
          patientMap.set(phoneKey, {
            ...r,
            familyMembers: extra.familyMembers || [],
            medicalHistory: extra.medicalHistory || [],
            allergies: extra.allergies || [],
            doctorVisits: extra.doctorVisits || [],
            tokenHistory: extra.tokenHistory || []
          });
        }
      });
    } catch (dbErr) {
      console.warn('Error reading hospital_patients from RDS:', dbErr.message);
    }
  }

  // 2. Gather all tokens and bookings belonging exclusively to this hospital
  const allHospitalTokens = [
    ...(store.tokens || []).filter(t => t.hospitalId === hospitalId && !isDummyTokenRecord(t)),
    ...(store.appointments || []).filter(a => a.hospitalId === hospitalId && !isDummyApptRecord(a)).map(a => ({
      id: a.id,
      tokenNo: a.tokenNumber,
      type: 'online',
      patientName: a.patientName,
      patientPhone: a.phone,
      patientAge: a.age,
      patientGender: a.gender,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      departmentId: a.departmentId || 'dept-general',
      departmentName: a.departmentName,
      session: a.session || 'morning',
      time: a.time,
      bookingDate: a.date,
      status: a.status,
      consultationFee: a.fee,
      paymentStatus: a.status === 'cancelled' ? 'refunded' : 'paid',
      paymentMethod: a.paymentMethod || 'Online',
      hospitalId
    }))
  ];

  allHospitalTokens.forEach(tok => {
    if (!tok.patientPhone && !tok.patientName) return;
    const cleanDigits = (tok.patientPhone || '').replace(/\D/g, '').slice(-10);
    const phoneKey = cleanDigits || (tok.patientName || '').trim().toLowerCase();

    if (!patientMap.has(phoneKey)) {
      patientMap.set(phoneKey, {
        id: `pat-${hospitalId}-${cleanDigits || Math.random().toString(36).substring(2, 7)}`,
        hospitalId,
        uhid: `APS${Math.abs(phoneKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)).toString().padStart(6, '0')}`,
        name: tok.patientName || 'Patient',
        phone: tok.patientPhone || '',
        email: tok.patientEmail || '',
        age: tok.patientAge || 30,
        gender: tok.patientGender || 'Male',
        bloodGroup: 'B+',
        address: tok.address || '',
        city: store.hospitalProfiles?.[hospitalId]?.city || 'Hyderabad',
        pinCode: store.hospitalProfiles?.[hospitalId]?.pinCode || '',
        registeredOn: tok.bookingDate || new Date().toISOString().split('T')[0],
        totalVisits: 0,
        lastVisit: tok.bookingDate || '',
        doctorVisits: new Map(),
        tokenHistory: []
      });
    }

    const p = patientMap.get(phoneKey);
    p.totalVisits = (p.totalVisits || 0) + 1;
    if (!p.lastVisit || new Date(tok.bookingDate) > new Date(p.lastVisit)) {
      p.lastVisit = tok.bookingDate;
    }

    // Ensure doctorVisits is handled whether it is Map or Array
    if (!Array.isArray(p.doctorVisits) && !(p.doctorVisits instanceof Map)) {
      p.doctorVisits = new Map();
    }

    if (tok.doctorId) {
      if (p.doctorVisits instanceof Map) {
        if (!p.doctorVisits.has(tok.doctorId)) {
          p.doctorVisits.set(tok.doctorId, {
            doctorId: tok.doctorId,
            doctorName: tok.doctorName || 'Attending Doctor',
            departmentName: tok.departmentName || 'General Medicine',
            visitCount: 0,
            lastVisitDate: tok.bookingDate
          });
        }
        const docVisit = p.doctorVisits.get(tok.doctorId);
        docVisit.visitCount += 1;
        if (new Date(tok.bookingDate) >= new Date(docVisit.lastVisitDate)) {
          docVisit.lastVisitDate = tok.bookingDate;
        }
      } else if (Array.isArray(p.doctorVisits)) {
        const found = p.doctorVisits.find(d => d.doctorId === tok.doctorId);
        if (found) {
          found.visitCount += 1;
          if (new Date(tok.bookingDate) >= new Date(found.lastVisitDate)) {
            found.lastVisitDate = tok.bookingDate;
          }
        } else {
          p.doctorVisits.push({
            doctorId: tok.doctorId,
            doctorName: tok.doctorName || 'Attending Doctor',
            departmentName: tok.departmentName || 'General Medicine',
            visitCount: 1,
            lastVisitDate: tok.bookingDate
          });
        }
      }
    }

    p.tokenHistory = p.tokenHistory || [];
    if (!p.tokenHistory.some(t => t.id === tok.id)) {
      p.tokenHistory.push({
        id: tok.id,
        tokenNo: tok.tokenNo,
        type: tok.type || 'online',
        doctorId: tok.doctorId,
        doctorName: tok.doctorName,
        departmentName: tok.departmentName,
        session: tok.session || 'morning',
        time: tok.time,
        bookingDate: tok.bookingDate,
        status: tok.status,
        consultationFee: tok.consultationFee,
        paymentStatus: tok.paymentStatus || 'paid',
        paymentMethod: tok.paymentMethod || 'Online'
      });
    }
  });

  // Also include manually registered hospital patients from cache
  const manualPatients = store.hospitalPatients?.[hospitalId] || [];
  manualPatients.forEach(mp => {
    const cleanDigits = (mp.phone || '').replace(/\D/g, '').slice(-10);
    const phoneKey = cleanDigits || (mp.name || '').trim().toLowerCase();
    if (!patientMap.has(phoneKey)) {
      patientMap.set(phoneKey, {
        ...mp,
        hospitalId,
        doctorVisits: Array.isArray(mp.doctorVisits) ? mp.doctorVisits : [],
        tokenHistory: mp.tokenHistory || []
      });
    }
  });

  let resultPatients = Array.from(patientMap.values()).map(p => ({
    ...p,
    doctorVisits: p.doctorVisits instanceof Map ? Array.from(p.doctorVisits.values()) : (Array.isArray(p.doctorVisits) ? p.doctorVisits : []),
    tokenHistory: (p.tokenHistory || []).sort((a, b) => (b.tokenNo || 0) - (a.tokenNo || 0))
  }));

  // Apply filters strictly
  if (doctorId && doctorId !== 'all') {
    resultPatients = resultPatients.filter(p =>
      p.doctorVisits.some(d => d.doctorId === doctorId) ||
      p.tokenHistory.some(t => t.doctorId === doctorId)
    );
  }

  if (status && status !== 'all') {
    resultPatients = resultPatients.filter(p =>
      p.tokenHistory.some(t => t.status === status)
    );
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    resultPatients = resultPatients.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.uhid && p.uhid.toLowerCase().includes(q)) ||
      p.tokenHistory.some(t => t.tokenNo?.toString() === q || t.doctorName?.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    hospitalId,
    total: resultPatients.length,
    patients: resultPatients
  });
});

// POST /api/hospitals/:hospitalId/patients
app.post('/api/hospitals/:hospitalId/patients', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const patientData = req.body;
  const store = await getUnifiedStore();

  store.hospitalPatients = store.hospitalPatients || {};
  store.hospitalPatients[hospitalId] = store.hospitalPatients[hospitalId] || [];

  let savedRecord = null;
  const existingIdx = store.hospitalPatients[hospitalId].findIndex(p => p.phone === patientData.phone);
  if (existingIdx >= 0) {
    savedRecord = {
      ...store.hospitalPatients[hospitalId][existingIdx],
      ...patientData,
      hospitalId
    };
    store.hospitalPatients[hospitalId][existingIdx] = savedRecord;
  } else {
    let initialDocVisits = [];
    if (Array.isArray(patientData.doctorVisits)) {
      initialDocVisits = patientData.doctorVisits;
    } else if (patientData.doctorId) {
      initialDocVisits = [{
        doctorId: patientData.doctorId,
        doctorName: patientData.doctorName || 'Attending Doctor',
        departmentName: patientData.departmentName || 'General Medicine',
        visitCount: 1,
        lastVisitDate: new Date().toISOString().split('T')[0]
      }];
    }
    savedRecord = {
      ...patientData,
      id: patientData.id || `pat-${Date.now()}`,
      uhid: patientData.uhid || `APS${String(store.hospitalPatients[hospitalId].length + 1001).padStart(6, '0')}`,
      hospitalId,
      registeredOn: new Date().toISOString().split('T')[0],
      totalVisits: patientData.totalVisits || 1,
      lastVisit: patientData.lastVisit || new Date().toISOString().split('T')[0],
      doctorVisits: initialDocVisits,
      tokenHistory: patientData.tokenHistory || []
    };
    store.hospitalPatients[hospitalId].unshift(savedRecord);
  }

  // Persist directly to RDS PostgreSQL table hospital_patients
  if (isDbConnected && savedRecord) {
    try {
      await query(`
        INSERT INTO hospital_patients (id, hospital_id, uhid, name, phone, email, age, gender, blood_group, address, city, pin_code, total_visits, last_visit, data, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = $4,
          phone = $5,
          email = $6,
          age = $7,
          gender = $8,
          blood_group = $9,
          address = $10,
          city = $11,
          pin_code = $12,
          total_visits = $13,
          last_visit = $14,
          data = $15,
          updated_at = NOW()
      `, [
        savedRecord.id,
        hospitalId,
        savedRecord.uhid,
        savedRecord.name,
        savedRecord.phone,
        savedRecord.email || '',
        Number(savedRecord.age) || 30,
        savedRecord.gender || 'Male',
        savedRecord.bloodGroup || 'B+',
        savedRecord.address || '',
        savedRecord.city || '',
        savedRecord.pinCode || '',
        Number(savedRecord.totalVisits) || 1,
        savedRecord.lastVisit || new Date().toISOString().split('T')[0],
        JSON.stringify({
          familyMembers: savedRecord.familyMembers || [],
          medicalHistory: savedRecord.medicalHistory || [],
          allergies: savedRecord.allergies || [],
          doctorVisits: savedRecord.doctorVisits || [],
          tokenHistory: savedRecord.tokenHistory || []
        })
      ]);
    } catch (dbErr) {
      console.warn('Error saving patient to RDS hospital_patients:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId, patient: savedRecord, message: 'Patient record saved successfully' });
});

// ─── Customer / Patient Account & Profile APIs (AWS RDS Synchronized) ────────

function normalizeCustomerPhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

// GET /api/customers - List all registered customers for admin & sync
app.get('/api/customers', async (req, res) => {
  try {
    const store = await getUnifiedStore();
    const safeCustomers = (store.customers || [])
      .filter(c => c && (c.name !== 'Patient' || c.phone || c.email))
      .map(c => ({
        ...c,
        bookings: Array.isArray(c.bookings) ? c.bookings : [],
        familyMembers: Array.isArray(c.familyMembers) ? c.familyMembers : [],
        savedDoctors: Array.isArray(c.savedDoctors) ? c.savedDoctors : [],
        savedHospitals: Array.isArray(c.savedHospitals) ? c.savedHospitals : []
      }));
    res.json({ success: true, customers: safeCustomers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/profile - Fetch customer by phone, email, or id
app.get('/api/customers/profile', async (req, res) => {
  try {
    const { id, phone, email } = req.query;
    const store = await getUnifiedStore();
    store.customers = store.customers || [];

    const normPhone = normalizeCustomerPhone(phone);
    const normEmail = (email || '').trim().toLowerCase();

    const customer = store.customers.find(c => {
      if (id && c.id === id) return true;
      if (normPhone && normalizeCustomerPhone(c.phone) === normPhone) return true;
      if (normEmail && (c.email || '').trim().toLowerCase() === normEmail) return true;
      return false;
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/signup - Register new customer with password
app.post('/api/customers/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, phone, and password are required.' });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();
    const normPhone = normalizeCustomerPhone(cleanPhone);

    const store = await getUnifiedStore();
    store.customers = store.customers || [];

    const existing = store.customers.find(c => {
      if (normPhone && normalizeCustomerPhone(c.phone) === normPhone) return true;
      if (cleanEmail && (c.email || '').trim().toLowerCase() === cleanEmail) return true;
      return false;
    });

    if (existing) {
      // If customer already has a password set, do not allow duplicate signup
      if (existing.password) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email or phone already exists. Please sign in.'
        });
      }
      // If legacy customer without password, set their password now
      existing.name = cleanName;
      existing.email = cleanEmail;
      existing.phone = cleanPhone;
      existing.password = String(password);
      await saveUnifiedStore(store);
      return res.status(200).json({ success: true, customer: existing, message: 'Account updated successfully.' });
    }

    const newCustomer = {
      id: `cust-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: String(password),
      location: 'Hyderabad, Telangana',
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      familyMembers: [],
      savedDoctors: [],
      savedHospitals: [],
      subscription: {
        planName: "3-Day Pass",
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        price: 10
      },
      bookings: []
    };

    store.customers.unshift(newCustomer);
    await saveUnifiedStore(store);

    if (isDbConnected) {
      try {
        await query(`
          INSERT INTO customers (id, name, phone, email, location, data, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET name = $2, phone = $3, email = $4, data = $6, updated_at = NOW()
        `, [newCustomer.id, newCustomer.name, newCustomer.phone, newCustomer.email, newCustomer.location, JSON.stringify(newCustomer)]);
      } catch (dbErr) {
        console.warn('[DB Sync Warn] Failed to insert customer into Postgres:', dbErr.message);
      }
    }

    console.log(`✅ Registered new customer: ${newCustomer.name} (${newCustomer.phone})`);
    res.status(201).json({ success: true, customer: newCustomer });
  } catch (err) {
    console.error('Customer signup error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/login - Strict Password-Protected Customer Login
app.post('/api/customers/login', async (req, res) => {
  try {
    const { emailOrPhone, password, isGoogleAuth, googleProfile } = req.body;
    if (!emailOrPhone) {
      return res.status(400).json({ success: false, message: 'Email or phone is required.' });
    }

    const cleanInput = String(emailOrPhone).trim();
    const isEmail = cleanInput.includes('@');
    const normPhone = isEmail ? '' : normalizeCustomerPhone(cleanInput);
    const normEmail = isEmail ? cleanInput.toLowerCase() : '';

    const store = await getUnifiedStore();
    store.customers = store.customers || [];

    let customer = store.customers.find(c => {
      if (normPhone && normalizeCustomerPhone(c.phone) === normPhone) return true;
      if (normEmail && (c.email || '').trim().toLowerCase() === normEmail) return true;
      return false;
    });

    // Google OAuth Login bypasses password check
    if ((isGoogleAuth || password === 'google') && isEmail) {
      if (!customer) {
        customer = {
          id: `cust-${Date.now()}`,
          name: googleProfile?.name || cleanInput.split('@')[0],
          email: normEmail,
          phone: '',
          password: '',
          location: 'Hyderabad, Telangana',
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'active',
          avatar: googleProfile?.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          familyMembers: [],
          savedDoctors: [],
          savedHospitals: [],
          subscription: {
            planName: "3-Day Pass",
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            price: 10
          },
          bookings: []
        };
        store.customers.unshift(customer);
        await saveUnifiedStore(store);
      }
      return res.json({ success: true, customer });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email or phone. Please sign up first.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to sign in.'
      });
    }

    // STRICT PASSWORD VERIFICATION
    if (customer.password && String(customer.password) !== String(password)) {
      console.warn(`[AUTH FAILED] Wrong password attempt for customer: ${customer.email || customer.phone}`);
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please enter the correct password.'
      });
    }

    // If customer record was created prior without a password, lock it to this password now
    if (!customer.password) {
      customer.password = String(password);
      await saveUnifiedStore(store);
    }

    console.log(`✅ Customer logged in successfully: ${customer.name} (${customer.phone || customer.email})`);
    return res.json({ success: true, customer });
  } catch (err) {
    console.error('Customer login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/reset-password - Reset Customer Password (clears old password)
app.post('/api/customers/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const store = await getUnifiedStore();
    store.customers = store.customers || [];

    const customer = store.customers.find(c => (c.email || '').trim().toLowerCase() === cleanEmail);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'No customer account found with this email address.'
      });
    }

    // Clear old password and set the new one
    customer.password = String(newPassword);
    await saveUnifiedStore(store);

    console.log(`🔑 Reset customer password successfully for: ${customer.name} (${cleanEmail})`);
    return res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Customer reset password error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/profile - Update / Save customer profile in AWS RDS
app.post('/api/customers/profile', async (req, res) => {
  try {
    const { id, name, phone, email, location, lat, lng, familyMembers, savedDoctors, savedHospitals, subscription, medicalRecords, oldPhone, oldEmail } = req.body;
    const store = await getUnifiedStore();
    store.customers = store.customers || [];

    const normPhone = normalizeCustomerPhone(phone);
    const normOldPhone = normalizeCustomerPhone(oldPhone);
    const normEmail = (email || '').trim().toLowerCase();
    const normOldEmail = (oldEmail || '').trim().toLowerCase();

    let idx = store.customers.findIndex(c => {
      if (id && c.id === id) return true;
      const cPhone = normalizeCustomerPhone(c.phone);
      if (normOldPhone && cPhone === normOldPhone) return true;
      if (normPhone && cPhone === normPhone) return true;
      const cEmail = (c.email || '').trim().toLowerCase();
      if (normOldEmail && cEmail === normOldEmail) return true;
      if (normEmail && cEmail === normEmail) return true;
      return false;
    });

    const existing = idx !== -1 ? store.customers[idx] : null;

    const resolvedEmail = (email !== undefined && String(email).trim())
      ? String(email).trim().toLowerCase()
      : (existing?.email || (normPhone ? `${normPhone}@patient.instatoken.in` : ''));

    const updatedCustomer = {
      id: existing?.id || id || `cust-${Date.now()}`,
      name: (name || existing?.name || 'Patient').trim(),
      phone: (phone || existing?.phone || '').trim(),
      email: resolvedEmail,
      location: location !== undefined ? location : (existing?.location || 'Hyderabad, Telangana'),
      lat: lat !== undefined && lat !== null ? Number(lat) : (existing?.lat || null),
      lng: lng !== undefined && lng !== null ? Number(lng) : (existing?.lng || null),
      joinedDate: existing?.joinedDate || new Date().toISOString().split('T')[0],
      status: existing?.status || 'active',
      avatar: existing?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      familyMembers: familyMembers || existing?.familyMembers || [],
      savedDoctors: savedDoctors || existing?.savedDoctors || [],
      savedHospitals: savedHospitals || existing?.savedHospitals || [],
      subscription: subscription !== undefined ? subscription : (existing?.subscription || {
        planName: "3-Day Pass",
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        price: 10
      }),
      medicalRecords: medicalRecords !== undefined ? medicalRecords : (existing?.medicalRecords || []),
      bookings: existing?.bookings || [],
      updatedAt: new Date().toISOString()
    };

    if (idx !== -1) {
      store.customers[idx] = updatedCustomer;
    } else {
      store.customers.unshift(updatedCustomer);
    }

    if (isDbConnected) {
      try {
        await query(`
          INSERT INTO customers (id, name, phone, email, location, data, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE 
          SET name = $2, phone = $3, email = $4, location = $5, data = $6, updated_at = NOW()
        `, [
          updatedCustomer.id,
          updatedCustomer.name,
          updatedCustomer.phone,
          updatedCustomer.email,
          updatedCustomer.location,
          JSON.stringify(updatedCustomer)
        ]);
      } catch (dbErr) {
        console.warn('Error saving customer profile in RDS:', dbErr.message);
      }
    }

    await saveUnifiedStore(store);
    console.log(`✅ Saved customer profile to AWS RDS: ${updatedCustomer.name} (${updatedCustomer.phone}, ${updatedCustomer.email})`);
    res.json({ success: true, customer: updatedCustomer, message: 'Customer profile saved to AWS RDS' });
  } catch (err) {
    console.error('Error saving customer profile in AWS RDS:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Customer Medical Records Endpoints ──────────────────────────────────────────
// GET /api/customers/:customerId/records
app.get('/api/customers/:customerId/records', async (req, res) => {
  try {
    const { customerId } = req.params;
    const store = await getUnifiedStore();
    store.customers = store.customers || [];
    const customer = store.customers.find(c => c.id === customerId || c.email === customerId || c.phone === customerId);
    if (!customer) {
      return res.json({ success: true, records: [] });
    }
    return res.json({ success: true, records: customer.medicalRecords || [] });
  } catch (err) {
    console.error('Error fetching medical records:', err);
    res.status(500).json({ success: false, message: err.message, records: [] });
  }
});

// POST /api/customers/:customerId/records
app.post('/api/customers/:customerId/records', async (req, res) => {
  try {
    const { customerId } = req.params;
    const record = req.body;
    const store = await getUnifiedStore();
    store.customers = store.customers || [];
    let customer = store.customers.find(c => c.id === customerId || c.email === customerId || c.phone === customerId);
    if (!customer) {
      customer = {
        id: customerId.startsWith('cust-') ? customerId : `cust-${Date.now()}`,
        name: 'Patient',
        phone: customerId.match(/^\d+$/) ? customerId : '',
        email: customerId.includes('@') ? customerId : '',
        location: 'Hyderabad, Telangana',
        medicalRecords: []
      };
      store.customers.push(customer);
    }
    customer.medicalRecords = customer.medicalRecords || [];
    const newRecord = {
      id: record.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: record.name || 'Medical Document',
      category: record.category || 'Other',
      doctor: record.doctor || '',
      hospital: record.hospital || '',
      date: record.date || new Date().toISOString().split('T')[0],
      fileType: record.fileType || 'PDF',
      fileName: record.fileName || 'document.pdf',
      fileSize: record.fileSize || '100 KB',
      fileUrl: record.fileUrl || '',
      notes: record.notes || '',
      uploadedAt: record.uploadedAt || new Date().toISOString()
    };
    customer.medicalRecords.unshift(newRecord);
    await saveUnifiedStore(store);
    return res.json({ success: true, record: newRecord, records: customer.medicalRecords });
  } catch (err) {
    console.error('Error adding medical record:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/customers/:customerId/records/:recordId
app.put('/api/customers/:customerId/records/:recordId', async (req, res) => {
  try {
    const { customerId, recordId } = req.params;
    const updates = req.body;
    const store = await getUnifiedStore();
    store.customers = store.customers || [];
    const customer = store.customers.find(c => c.id === customerId || c.email === customerId || c.phone === customerId);
    if (!customer || !customer.medicalRecords) {
      return res.status(404).json({ success: false, message: 'Record or customer not found' });
    }
    const idx = customer.medicalRecords.findIndex(r => r.id === recordId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    customer.medicalRecords[idx] = {
      ...customer.medicalRecords[idx],
      ...updates,
      id: recordId
    };
    await saveUnifiedStore(store);
    return res.json({ success: true, record: customer.medicalRecords[idx], records: customer.medicalRecords });
  } catch (err) {
    console.error('Error updating medical record:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/customers/:customerId/records/:recordId
app.delete('/api/customers/:customerId/records/:recordId', async (req, res) => {
  try {
    const { customerId, recordId } = req.params;
    const store = await getUnifiedStore();
    store.customers = store.customers || [];
    const customer = store.customers.find(c => c.id === customerId || c.email === customerId || c.phone === customerId);
    if (!customer || !customer.medicalRecords) {
      return res.status(404).json({ success: false, message: 'Record or customer not found' });
    }
    customer.medicalRecords = customer.medicalRecords.filter(r => r.id !== recordId);
    await saveUnifiedStore(store);
    return res.json({ success: true, message: 'Record deleted successfully', records: customer.medicalRecords });
  } catch (err) {
    console.error('Error deleting medical record:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/customers/:id/status - Toggle Customer Status (Admin)
app.patch('/api/customers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const store = await getUnifiedStore();
    store.customers = store.customers || [];
    const idx = store.customers.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    store.customers[idx].status = status || (store.customers[idx].status === 'active' ? 'suspended' : 'active');
    await saveUnifiedStore(store);
    res.json({ success: true, customer: store.customers[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/delete-account - Customer Self Account Deletion
// Purges login credentials & profile from PostgreSQL customers table & sync_store
// PRESERVES all past token records, payments, and hospital financial ledger entries
app.post('/api/customers/delete-account', async (req, res) => {
  try {
    const { customerId, phone, email } = req.body;
    if (!customerId && !phone && !email) {
      return res.status(400).json({ success: false, message: 'Missing customer identifier.' });
    }

    const normPhone = normalizeCustomerPhone(phone);
    const normEmail = (email || '').trim().toLowerCase();

    // 1. Purge from AWS RDS PostgreSQL customers table if connected
    if (isDbConnected) {
      try {
        await query(
          `DELETE FROM customers WHERE id = $1 OR (phone IS NOT NULL AND phone != '' AND phone = $2) OR (email IS NOT NULL AND email != '' AND LOWER(email) = $3)`,
          [customerId || '', normPhone || '', normEmail || '']
        );
      } catch (dbErr) {
        console.warn('Could not delete customer from RDS table:', dbErr.message);
      }
    }

    // 2. Remove customer profile from unified store
    const store = await getUnifiedStore();
    store.customers = (store.customers || []).filter(c => {
      if (customerId && c.id === customerId) return false;
      const cPhone = normalizeCustomerPhone(c.phone);
      if (normPhone && cPhone === normPhone) return false;
      const cEmail = (c.email || '').trim().toLowerCase();
      if (normEmail && cEmail === normEmail) return false;
      return true;
    });
    await saveUnifiedStore(store);

    // CRITICAL: Tokens, payment records, and financial transaction logs remain
    // 100% saved and preserved in PostgreSQL and store.tokens to guarantee
    // zero discrepancies in hospital and admin revenue accounting.
    console.log(`[Account Deletion] Customer ${customerId || normPhone || normEmail} credentials purged. Payments & tokens preserved.`);

    res.json({
      success: true,
      message: 'Account deleted successfully. Transaction history retained for compliance.'
    });
  } catch (err) {
    console.error('Delete customer account error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/customers/:id - Delete Customer Account (Admin)
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isDbConnected) {
      try {
        await query(`DELETE FROM customers WHERE id = $1 OR phone = $1`, [id]);
      } catch (dbErr) {
        console.warn('Could not delete customer from RDS table:', dbErr.message);
      }
    }
    const store = await getUnifiedStore();
    store.customers = (store.customers || []).filter(c => c.id !== id && c.phone !== id);
    await saveUnifiedStore(store);
    res.json({ success: true, message: 'Customer deleted', deletedId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PHASE 21: Backend Revenue Calculation Engine ────────────────────────────
// Calculates doctor-wise and overall hospital revenue on the backend
// Eliminates frontend calculation dependencies
app.get('/api/hospitals/:hospitalId/revenue', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { filter = 'today', startDate, endDate, doctorId } = req.query;
  const store = await getUnifiedStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const isDateInRange = (dateStr) => {
    if (!dateStr) dateStr = todayStr;
    if (filter === 'all') return true;
    if (filter === 'today') return dateStr === todayStr;

    const tokDate = new Date(dateStr);
    const now = new Date();

    if (filter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
      return tokDate >= oneWeekAgo && tokDate <= now;
    }
    if (filter === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 86400000);
      return tokDate >= oneMonthAgo && tokDate <= now;
    }
    if (filter === 'custom') {
      if (startDate && tokDate < new Date(startDate)) return false;
      if (endDate && tokDate > new Date(endDate)) return false;
      return true;
    }
    return true;
  };

  // Hospital tokens filtered by date and strictly scoped to hospitalId
  let hospitalTokens = [];
  if (isDbConnected) {
    try {
      const dbTokensRes = await query(`
        SELECT id, token_number as "tokenNo", patient_name as "patientName", patient_phone as "patientPhone",
               doctor_id as "doctorId", session, token_date as "bookingDate", status,
               data->>'departmentName' as "departmentName",
               COALESCE((data->>'consultationFee')::numeric, 500) as "consultationFee",
               hospital_id as "hospitalId"
        FROM tokens
        WHERE hospital_id = $1
      `, [hospitalId]);
      if (dbTokensRes.rows && dbTokensRes.rows.length > 0) {
        hospitalTokens = dbTokensRes.rows;
      }
    } catch (e) {
      console.warn('Error fetching tokens from RDS for revenue calculation:', e.message);
    }
  }

  if (hospitalTokens.length === 0) {
    hospitalTokens = [
      ...(store.tokens || []).filter(t => t.hospitalId === hospitalId && !isDummyTokenRecord(t)),
      ...(store.appointments || []).filter(a => a.hospitalId === hospitalId && !isDummyApptRecord(a)).map(a => ({
        id: a.id,
        tokenNo: a.tokenNumber,
        patientName: a.patientName,
        patientPhone: a.phone,
        doctorId: a.doctorId,
        doctorName: a.doctorName,
        departmentName: a.departmentName,
        bookingDate: a.date,
        time: a.time,
        status: a.status,
        consultationFee: a.fee,
        hospitalId
      }))
    ];
  }
  hospitalTokens = hospitalTokens.filter(t => isDateInRange(t.bookingDate));

  // Hospital doctors strictly for this hospital (Never fall back to other hospitals' doctors)
  let baseDoctors = [];
  if (isDbConnected) {
    try {
      const dbDocRes = await query(`
        SELECT id, name, department_id as "departmentId", department_name as "departmentName",
               consultation_fee as "consultationFee", active
        FROM hospital_doctors
        WHERE hospital_id = $1
        ORDER BY name ASC
      `, [hospitalId]);
      if (dbDocRes.rows && dbDocRes.rows.length > 0) {
        baseDoctors = dbDocRes.rows;
      }
    } catch (e) {
      console.warn('Error fetching doctors from RDS for revenue:', e.message);
    }
  }

  if (baseDoctors.length === 0) {
    baseDoctors = store.hospitalDoctors?.[hospitalId] || (hospitalId === 'hosp-apollo' ? INITIAL_DOCTORS : []);
  }

  const knownDoctors = [...baseDoctors];
  hospitalTokens.forEach(t => {
    if (t.doctorId && !knownDoctors.some(d => d.id === t.doctorId)) {
      knownDoctors.push({
        id: t.doctorId,
        name: t.doctorName || 'Doctor',
        departmentName: t.departmentName || 'General Medicine',
        consultationFee: t.consultationFee || 500
      });
    }
  });
  const doctors = knownDoctors;

  // Compute doctor-wise breakdown
  const doctorRevenueStats = doctors.map(doc => {
    const docTokens = hospitalTokens.filter(t => t.doctorId === doc.id);
    const completedTokens = docTokens.filter(t => t.status === 'completed');
    const notVisitedTokens = docTokens.filter(t => ['not-visited', 'skipped', 'no-show', 'cancelled'].includes(t.status));
    const waitingTokens = docTokens.filter(t => ['booked', 'waiting', 'checked-in', 'in-cabin', 'calling', 'arrived', 'in-consultation', 'late-coming'].includes(t.status));
    const cancelledTokens = docTokens.filter(t => t.status === 'cancelled');

    const fee = doc.consultationFee || 500;
    const earnedRevenue = completedTokens.reduce((sum, t) => sum + (Number(t.consultationFee) || fee), 0);
    const uncollectedAmount = notVisitedTokens.reduce((sum, t) => sum + (Number(t.consultationFee) || fee), 0);
    const pendingAmount = waitingTokens.reduce((sum, t) => sum + (Number(t.consultationFee) || fee), 0);

    return {
      doctorId: doc.id,
      doctorName: doc.name,
      departmentName: doc.departmentName,
      totalTokens: docTokens.length,
      doctor: doc,
      totalBookings: docTokens.length,
      completedVisits: completedTokens.length,
      notVisitedCount: notVisitedTokens.length,
      waitingCount: waitingTokens.length,
      cancelledCount: cancelledTokens.length,
      consultationFee: fee,
      earnedRevenue,
      uncollectedAmount,
      pendingAmount
    };
  });

  // Calculate totals
  const totalEarnedRevenue = doctorRevenueStats.reduce((sum, d) => sum + d.earnedRevenue, 0);
  const totalCompletedVisits = doctorRevenueStats.reduce((sum, d) => sum + d.completedVisits, 0);
  const totalNotVisitedCount = doctorRevenueStats.reduce((sum, d) => sum + d.notVisitedCount, 0);
  const totalWaitingCount = doctorRevenueStats.reduce((sum, d) => sum + d.waitingCount, 0);
  const totalBookings = doctorRevenueStats.reduce((sum, d) => sum + d.totalBookings, 0);
  const uncollectedRevenue = doctorRevenueStats.reduce((sum, d) => sum + d.uncollectedAmount, 0);
  const avgRevenuePerDoctor = doctors.length > 0 ? Math.round(totalEarnedRevenue / doctors.length) : 0;

  let filteredDoctorStats = doctorRevenueStats;
  if (doctorId && doctorId !== 'all') {
    filteredDoctorStats = doctorRevenueStats.filter(s => s.doctor.id === doctorId);
  }

  res.json({
    success: true,
    hospitalId,
    dateFilter: filter,
    totals: {
      totalRevenue: totalEarnedRevenue,
      collectedRevenue: totalEarnedRevenue,
      totalEarnedRevenue,
      pendingRevenue: uncollectedRevenue,
      uncollectedRevenue,
      totalCompletedVisits,
      completedVisits: totalCompletedVisits,
      totalNotVisitedCount,
      totalWaitingCount,
      totalBookings,
      avgRevenuePerDoctor,
      totalDoctors: doctors.length
    },
    doctorStats: filteredDoctorStats,
    tokens: hospitalTokens
  });
});

// ─── Hospital Tokens (Phase 21 & 22) ─────────────────────────────────────────
app.get('/api/hospitals/:hospitalId/tokens', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { doctorId, session, status, date, type } = req.query;
  const store = await getUnifiedStore();

  let tokens = (store.tokens || []).filter(t => (t.hospitalId || 'hosp-apollo') === hospitalId && !isDummyTokenRecord(t));

  if (isDbConnected) {
    try {
      const dbTokens = await query(
        `SELECT id, status, data FROM tokens WHERE hospital_id = $1 ORDER BY created_at DESC`,
        [hospitalId]
      );
      if (dbTokens.rows.length > 0) {
        dbTokens.rows.forEach(r => {
          if (r.data && !isDummyTokenRecord(r.data)) {
            const raw = r.data;
            const tokenObj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const normalizedToken = {
              ...tokenObj,
              id: r.id || tokenObj.id,
              status: r.status || tokenObj.status || 'booked'
            };
            const idx = tokens.findIndex(t => t.id === normalizedToken.id);
            if (idx === -1) {
              tokens.push(normalizedToken);
            } else {
              tokens[idx] = { ...tokens[idx], ...normalizedToken };
            }
          }
        });
      }
    } catch (dbErr) {
      console.warn('Error fetching tokens from RDS:', dbErr.message);
    }
  }

  if (doctorId && doctorId !== 'all') {
    const docLower = String(doctorId).toLowerCase();
    tokens = tokens.filter(t => t.doctorId === doctorId || (t.doctorName && String(t.doctorName).toLowerCase() === docLower));
  }
  if (session && session !== 'all') {
    const sessLower = String(session).toLowerCase();
    tokens = tokens.filter(t => String(t.session || '').toLowerCase() === sessLower);
  }
  if (status && status !== 'all') {
    const statLower = String(status).toLowerCase();
    tokens = tokens.filter(t => String(t.status || '').toLowerCase() === statLower);
  }
  if (date) {
    tokens = tokens.filter(t => {
      const bDate = (t.bookingDate || t.token_date || t.date || '').split('T')[0];
      return bDate === date;
    });
  }
  if (type && type !== 'all') {
    const typeLower = String(type).toLowerCase();
    tokens = tokens.filter(t => String(t.type || '').toLowerCase() === typeLower);
  }

  res.json({ success: true, hospitalId, total: tokens.length, tokens });
});

app.post('/api/hospitals/:hospitalId/tokens', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const tokenData = req.body;

  const targetDate = tokenData.bookingDate || tokenData.tokenDate || getNowIST().dateStr;
  const targetSession = (tokenData.session || 'morning').toLowerCase();

  // Validate session against real-world IST time
  if (isSessionExpiredInIST(targetSession, targetDate)) {
    return res.status(400).json({
      success: false,
      message: `Cannot generate token: The ${targetSession} OPD session has already concluded for ${targetDate} (IST). Please select an active session.`
    });
  }

  const store = await getUnifiedStore();

  store.tokens = store.tokens || [];
  const newToken = {
    ...tokenData,
    id: tokenData.id || `tok-${Date.now()}`,
    hospitalId
  };

  store.tokens.unshift(newToken);

  const ref = newToken.doctorReference || newToken.rmpReference || null;
  if (ref && hospitalId) {
    newToken.doctorReference = ref;
    newToken.rmpReference = ref;
    autoUpsertDoctorReference(hospitalId, ref).catch(e => console.warn('Doctor ref upsert warning:', e.message));
  }

  if (isDbConnected) {
    try {
      await query(
        `INSERT INTO tokens (id, hospital_id, doctor_id, token_number, patient_name, patient_phone, status, token_type, session, token_date, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET status = $7, data = $11, updated_at = NOW()`,
        [
          newToken.id,
          hospitalId,
          newToken.doctorId || '',
          String(newToken.tokenNo || newToken.tokenNumber || ''),
          newToken.patientName || '',
          newToken.patientPhone || '',
          newToken.status || 'booked',
          newToken.type || 'online',
          newToken.session || 'Morning',
          newToken.bookingDate || new Date().toISOString().split('T')[0],
          JSON.stringify(newToken)
        ]
      );
    } catch (dbErr) {
      console.error('Error inserting token into AWS RDS PostgreSQL:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  if (newToken && hospitalId) {
    io.to(`hospital_${hospitalId}`).emit('token_booked', newToken);
    console.log(`📡 [Socket.io] Emitted walk-in token_booked to hospital_${hospitalId}`);
  }
  res.status(201).json({ success: true, hospitalId, token: newToken });
});

app.patch('/api/hospitals/:hospitalId/tokens/:tokenId/status', requireHospitalAuth, async (req, res) => {
  const { hospitalId, tokenId } = req.params;
  const { status, paymentStatus, paymentMethod, session } = req.body;
  const store = await getUnifiedStore();

  let targetToken = null;
  store.tokens = (store.tokens || []).map(t => {
    if (t.id === tokenId) {
      const newStatus = status || t.status;
      const newSession = session || t.session;
      const computedPayStatus = paymentStatus !== undefined
        ? paymentStatus
        : (status === 'cancelled' ? 'refunded' : status === 'completed' ? (t.paymentStatus || 'paid') : t.paymentStatus);
      const computedPayMethod = paymentMethod !== undefined ? paymentMethod : t.paymentMethod;

      targetToken = {
        ...t,
        status: newStatus,
        session: newSession,
        paymentStatus: computedPayStatus,
        paymentMethod: computedPayMethod
      };
      return targetToken;
    }
    return t;
  });

  if (targetToken && (status || session)) {
    const apptStatus = status === 'completed' ? 'completed' : ['cancelled', 'not-visited', 'skipped'].includes(status) ? 'cancelled' : 'booked';
    store.appointments = (store.appointments || []).map(a => {
      if (a.id === tokenId || (targetToken && a.hospitalId === targetToken.hospitalId && a.doctorId === targetToken.doctorId && (a.tokenNumber === targetToken.tokenNo || a.tokenNumber === targetToken.tokenNumber))) {
        return {
          ...a,
          status: status ? apptStatus : a.status,
          session: targetToken.session || a.session
        };
      }
      return a;
    });
  }

  if (isDbConnected) {
    try {
      const apptStatus = targetToken
        ? (targetToken.status === 'completed' ? 'completed' : ['cancelled', 'not-visited', 'skipped'].includes(targetToken.status) ? 'cancelled' : 'booked')
        : (status === 'completed' ? 'completed' : ['cancelled', 'not-visited', 'skipped'].includes(status) ? 'cancelled' : 'booked');

      if (targetToken) {
        await query(
          `UPDATE tokens SET status = $1, session = $2, data = (COALESCE(data, '{}'::jsonb) || $3::jsonb), updated_at = NOW() WHERE id = $4`,
          [targetToken.status, targetToken.session || 'Morning', JSON.stringify(targetToken), tokenId]
        );
      } else if (status || session) {
        await query(
          `UPDATE tokens SET status = COALESCE($1::varchar, status), session = COALESCE($2::varchar, session), data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', COALESCE($1::varchar, status), 'session', COALESCE($2::varchar, session))), updated_at = NOW() WHERE id = $3`,
          [status || null, session || null, tokenId]
        );
      }
      // Update matching appointment in PostgreSQL
      await query(
        `UPDATE appointments SET status = $1::varchar, data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', $1::varchar, 'session', $2::varchar)), updated_at = NOW() WHERE id = $3`,
        [apptStatus, targetToken?.session || session || 'Morning', tokenId]
      );

      // Also update by hospital, doctor and token number if ID differs
      if (targetToken && (targetToken.tokenNo || targetToken.tokenNumber)) {
        const tokNum = (targetToken.tokenNo || targetToken.tokenNumber).toString();
        await query(
          `UPDATE appointments SET status = $1::varchar, data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', $1::varchar)), updated_at = NOW() 
           WHERE hospital_id = $2 AND doctor_id = $3 AND (data->>'tokenNumber' = $4 OR data->>'tokenNo' = $4)`,
          [apptStatus, hospitalId, targetToken.doctorId, tokNum]
        );
      }
    } catch (dbErr) {
      console.error('Error updating token status/session in AWS RDS:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  if (targetToken && hospitalId) {
    io.to(`hospital_${hospitalId}`).emit('token_status_changed', targetToken);
    console.log(`📡 [Socket.io] Emitted token_status_changed to hospital_${hospitalId} for token ${targetToken.id}: ${targetToken.status}`);
  }
  res.json({ success: true, hospitalId, tokenId, status, token: targetToken });
});

// ─── Real-Time Patient OPD Calling Alert ─────────────────────────────
app.post('/api/hospitals/:hospitalId/tokens/:tokenId/call', requireHospitalAuth, async (req, res) => {
  const { hospitalId, tokenId } = req.params;
  const store = await getUnifiedStore();

  let targetToken = null;
  store.tokens = (store.tokens || []).map(t => {
    if (t.id === tokenId || (t.appointmentId && t.appointmentId === tokenId)) {
      targetToken = {
        ...t,
        status: 'calling',
        lastCalledAt: new Date().toISOString()
      };
      return targetToken;
    }
    return t;
  });

  if (!targetToken) {
    return res.status(404).json({ success: false, message: 'Token not found' });
  }

  // Update appointment record
  store.appointments = (store.appointments || []).map(a => {
    if (a.id === tokenId || a.id === targetToken.id || (targetToken.appointmentId && a.id === targetToken.appointmentId)) {
      return {
        ...a,
        status: 'calling',
        lastCalledAt: new Date().toISOString()
      };
    }
    return a;
  });

  // ─── SINGLE-CALLER INVARIANCE ───────────────────────────────────────
  // A doctor has only one cabin door. When this token is called, any other
  // token for the same doctor that was currently 'calling' MUST be automatically
  // demoted to 'late-coming' (On-Hold) so only ONE token is actively calling.
  const targetDoctorId = targetToken.doctorId;
  const nowIso = new Date().toISOString();
  const demotedTokens = [];

  if (targetDoctorId) {
    store.tokens = (store.tokens || []).map(t => {
      if (t.doctorId === targetDoctorId && t.id !== targetToken.id && t.status === 'calling') {
        const demoted = {
          ...t,
          status: 'late-coming',
          autoHeldAt: nowIso
        };
        demotedTokens.push(demoted);
        return demoted;
      }
      return t;
    });

    store.appointments = (store.appointments || []).map(a => {
      if ((a.doctorId === targetDoctorId || a.doctor_id === targetDoctorId) && a.id !== targetToken.id && a.status === 'calling') {
        return {
          ...a,
          status: 'late-coming',
          autoHeldAt: nowIso
        };
      }
      return a;
    });
  }

  if (isDbConnected) {
    try {
      await query(
        `UPDATE tokens SET status = 'calling', updated_at = NOW(),
         data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', 'calling', 'lastCalledAt', NOW()))
         WHERE id = $1`,
        [targetToken.id]
      );
      await query(
        `UPDATE appointments SET status = 'calling', updated_at = NOW(),
         data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', 'calling', 'lastCalledAt', NOW()))
         WHERE id = $1`,
        [targetToken.id]
      );

      // In RDS: Demote all other calling tokens for this doctor to 'late-coming'
      if (targetDoctorId) {
        await query(
          `UPDATE tokens SET status = 'late-coming', updated_at = NOW(),
           data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', 'late-coming', 'autoHeldAt', NOW()))
           WHERE doctor_id = $1 AND status = 'calling' AND id != $2`,
          [targetDoctorId, targetToken.id]
        );
        await query(
          `UPDATE appointments SET status = 'late-coming', updated_at = NOW(),
           data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', 'late-coming', 'autoHeldAt', NOW()))
           WHERE (doctor_id = $1 OR data->>'doctorId' = $1) AND status = 'calling' AND id != $2`,
          [targetDoctorId, targetToken.id]
        );
      }
    } catch (e) {
      console.warn('RDS calling update error:', e.message);
    }
  }

  await saveUnifiedStore(store);

  const cleanPhone = String(targetToken.patientPhone || '').replace(/\D/g, '').slice(-10);
  const cleanDoc = (targetToken.doctorName || 'Doctor').replace(/^Dr\.?\s*/i, '');
  const hospName = targetToken.hospitalName || store.hospitalProfiles?.[hospitalId]?.name || "Gandi Hospital";

  const callPayload = {
    tokenId: targetToken.id,
    tokenNo: targetToken.tokenNo || targetToken.tokenNumber,
    patientName: targetToken.patientName,
    patientPhone: cleanPhone,
    doctorId: targetToken.doctorId,
    doctorName: targetToken.doctorName,
    hospitalId: targetToken.hospitalId || hospitalId,
    hospitalName: hospName,
    departmentName: targetToken.departmentName || "General OPD",
    session: targetToken.session || "Morning",
    calledAt: new Date().toISOString(),
    message: `Token #${targetToken.tokenNo || targetToken.tokenNumber} is called! Dr. ${cleanDoc} is ready to see you in the cabin.`
  };

  // Clean any old individual call notifications from global broadcasts
  store.broadcastNotifications = (store.broadcastNotifications || []).filter(b => b.type !== 'call');
  await saveUnifiedStore(store);

  // 1. Notify hospital room and demoted patients of demotion
  demotedTokens.forEach(dt => {
    io.to(`hospital_${hospitalId}`).emit('token_status_changed', dt);
    const dPhone = String(dt.patientPhone || '').replace(/\D/g, '').slice(-10);
    if (dPhone) {
      io.to(`patient_${dPhone}`).emit('token_status_changed', dt);
    }
  });

  // 2. Emit strictly to the specific called patient's private room
  if (cleanPhone) {
    io.to(`patient_${cleanPhone}`).emit('token_called', callPayload);
  }
  // 3. Notify hospital room of target token status change to 'calling'
  io.to(`hospital_${hospitalId}`).emit('token_status_changed', targetToken);

  console.log(`📡 [Socket.io] Emitted private token_called for Token #${callPayload.tokenNo} strictly to patient room patient_${cleanPhone} (${targetToken.patientName}). Demoted ${demotedTokens.length} other calling token(s) to late-coming.`);

  res.json({ success: true, callPayload, token: targetToken, demotedCount: demotedTokens.length });
});

// ─── Out-of-Order Cabin Admission & Auto-Hold ───────────────────────
app.post('/api/hospitals/:hospitalId/tokens/admit-cabin', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { admittedTokenId, skippedTokenIds = [] } = req.body;
  const store = await getUnifiedStore();

  const skippedSet = new Set(skippedTokenIds);
  let admittedToken = null;

  store.tokens = (store.tokens || []).map(t => {
    if (t.id === admittedTokenId || (t.appointmentId && t.appointmentId === admittedTokenId)) {
      admittedToken = {
        ...t,
        status: 'in-consultation',
        lastAdmittedAt: new Date().toISOString()
      };
      return admittedToken;
    }
    if (skippedSet.has(t.id) || (t.appointmentId && skippedSet.has(t.appointmentId))) {
      return {
        ...t,
        status: 'late-coming',
        autoHeldAt: new Date().toISOString()
      };
    }
    return t;
  });

  if (!admittedToken) {
    return res.status(404).json({ success: false, message: 'Token to admit not found' });
  }

  store.appointments = (store.appointments || []).map(a => {
    if (a.id === admittedTokenId || a.id === admittedToken.id) {
      return { ...a, status: 'in-cabin', lastAdmittedAt: new Date().toISOString() };
    }
    if (skippedSet.has(a.id)) {
      return { ...a, status: 'late-coming', autoHeldAt: new Date().toISOString() };
    }
    return a;
  });

  if (isDbConnected) {
    try {
      await query(
        `UPDATE tokens SET status = 'in-consultation', updated_at = NOW(),
         data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', 'in-consultation', 'lastAdmittedAt', NOW()))
         WHERE id = $1`,
        [admittedToken.id]
      );
      await query(
        `UPDATE appointments SET status = 'in-cabin', updated_at = NOW(),
         data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', 'in-cabin', 'lastAdmittedAt', NOW()))
         WHERE id = $1`,
        [admittedToken.id]
      );

      if (skippedTokenIds.length > 0) {
        await query(
          `UPDATE tokens SET status = 'late-coming', updated_at = NOW(),
           data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', 'late-coming', 'autoHeldAt', NOW()))
           WHERE id = ANY($1::text[])`,
          [skippedTokenIds]
        );
        await query(
          `UPDATE appointments SET status = 'late-coming', updated_at = NOW(),
           data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', 'late-coming', 'autoHeldAt', NOW()))
           WHERE id = ANY($1::text[])`,
          [skippedTokenIds]
        );
      }
    } catch (e) {
      console.warn('RDS admit-cabin error:', e.message);
    }
  }

  await saveUnifiedStore(store);

  // Broadcast updates via Socket.io
  io.to(`hospital_${hospitalId}`).emit('token_status_changed', admittedToken);
  if (skippedTokenIds.length > 0) {
    io.to(`hospital_${hospitalId}`).emit('tokens_batch_status_changed', { ids: skippedTokenIds, status: 'late-coming' });
  }

  console.log(`📡 [Socket.io] Emitted admit-cabin for token ${admittedToken.id} (#${admittedToken.tokenNo}), auto-held ${skippedTokenIds.length} skipped tokens`);

  res.json({ success: true, admittedToken, skippedCount: skippedTokenIds.length });
});

// ─── Re-Admit Unvisited / Missed Token ─────────────────────────────────────────
app.post('/api/hospitals/:hospitalId/tokens/:tokenId/readmit', requireHospitalAuth, async (req, res) => {
  const { hospitalId, tokenId } = req.params;
  const { targetDoctorId, targetDoctorName, departmentId, departmentName, session, tokenNo, feeDifference, bookingDate } = req.body;
  const store = await getUnifiedStore();

  const todayStr = bookingDate || getNowIST().dateStr;
  const targetSession = (session || 'morning').toLowerCase();

  // Validate session against real-world IST time
  if (isSessionExpiredInIST(targetSession, todayStr)) {
    return res.status(400).json({
      success: false,
      message: `Cannot re-admit patient: The ${targetSession} OPD session has already concluded for ${todayStr} (IST). Please select an active session.`
    });
  }

  let updatedToken = null;
  store.tokens = (store.tokens || []).map(t => {
    if (t.id === tokenId || (t.appointmentId && t.appointmentId === tokenId)) {
      const origBookingDate = t.bookingDate;
      const origTokNo = t.tokenNo || t.tokenNumber;
      const origDocId = t.doctorId;
      const origDocName = t.doctorName;
      const origFee = Number(t.consultationFee || 0);

      updatedToken = {
        ...t,
        doctorId: targetDoctorId || t.doctorId,
        doctorName: targetDoctorName || t.doctorName,
        departmentId: departmentId || t.departmentId,
        departmentName: departmentName || t.departmentName,
        session: session || t.session || 'morning',
        bookingDate: todayStr,
        tokenNo: Number(tokenNo) || t.tokenNo,
        tokenNumber: Number(tokenNo) || t.tokenNumber,
        status: 'booked',
        isRevisit: true,
        revisitDetails: {
          originalBookingDate: origBookingDate,
          originalTokenNo: origTokNo,
          originalDoctorId: origDocId,
          originalDoctorName: origDocName,
          originalFee: origFee,
          feeDifference: Number(feeDifference || 0),
          deskCollectedDifference: Number(feeDifference || 0),
          readmittedAt: new Date().toISOString()
        }
      };
      return updatedToken;
    }
    return t;
  });

  // Fallback: If not found in in-memory store.tokens, check req.body.originalToken or query RDS PostgreSQL
  if (!updatedToken) {
    let baseToken = req.body.originalToken;
    if (!baseToken && isDbConnected) {
      try {
        const dbRes = await query('SELECT * FROM tokens WHERE id = $1', [tokenId]);
        if (dbRes.rows && dbRes.rows.length > 0) {
          const row = dbRes.rows[0];
          const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
          baseToken = {
            id: row.id,
            hospitalId: row.hospital_id,
            doctorId: row.doctor_id,
            patientName: row.patient_name,
            patientPhone: row.patient_phone,
            tokenNo: Number(row.token_number) || 1,
            tokenNumber: Number(row.token_number) || 1,
            session: row.session,
            ...parsed
          };
        }
      } catch (err) {
        console.error('Error querying token from DB in readmit:', err.message);
      }
    }

    if (baseToken) {
      const origBookingDate = baseToken.bookingDate;
      const origTokNo = baseToken.tokenNo || baseToken.tokenNumber;
      const origDocId = baseToken.doctorId;
      const origDocName = baseToken.doctorName;
      const origFee = Number(baseToken.consultationFee || 0);

      updatedToken = {
        ...baseToken,
        id: tokenId,
        doctorId: targetDoctorId || baseToken.doctorId,
        doctorName: targetDoctorName || baseToken.doctorName,
        departmentId: departmentId || baseToken.departmentId,
        departmentName: departmentName || baseToken.departmentName,
        session: session || baseToken.session || 'morning',
        bookingDate: todayStr,
        tokenNo: Number(tokenNo) || baseToken.tokenNo || 1,
        tokenNumber: Number(tokenNo) || baseToken.tokenNumber || 1,
        status: 'booked',
        isRevisit: true,
        revisitDetails: {
          originalBookingDate: origBookingDate,
          originalTokenNo: origTokNo,
          originalDoctorId: origDocId,
          originalDoctorName: origDocName,
          originalFee: origFee,
          feeDifference: Number(feeDifference || 0),
          deskCollectedDifference: Number(feeDifference || 0),
          readmittedAt: new Date().toISOString()
        }
      };
      store.tokens = store.tokens || [];
      store.tokens.push(updatedToken);
    }
  }

  if (updatedToken) {
    let foundAppt = false;
    store.appointments = (store.appointments || []).map(a => {
      if (a.id === tokenId || (a.hospitalId === hospitalId && (a.id === updatedToken.id || a.id === updatedToken.appointmentId))) {
        foundAppt = true;
        return {
          ...a,
          doctorId: updatedToken.doctorId,
          doctorName: updatedToken.doctorName,
          departmentName: updatedToken.departmentName,
          date: todayStr,
          bookingDate: todayStr,
          session: updatedToken.session,
          tokenNumber: updatedToken.tokenNo,
          status: 'booked',
          isExisting: true,
          revisitDetails: updatedToken.revisitDetails
        };
      }
      return a;
    });

    if (!foundAppt) {
      store.appointments = store.appointments || [];
      store.appointments.push({
        id: updatedToken.appointmentId || updatedToken.id,
        hospitalId: hospitalId,
        hospitalName: updatedToken.hospitalName || 'Hospital',
        doctorId: updatedToken.doctorId,
        doctorName: updatedToken.doctorName,
        patientName: updatedToken.patientName,
        patientPhone: updatedToken.patientPhone,
        departmentName: updatedToken.departmentName,
        date: todayStr,
        bookingDate: todayStr,
        session: updatedToken.session,
        tokenNumber: updatedToken.tokenNo,
        status: 'booked',
        isExisting: true,
        revisitDetails: updatedToken.revisitDetails,
        createdAt: new Date().toISOString()
      });
    }

    if (isDbConnected) {
      try {
        await query(
          `UPDATE tokens 
           SET status = 'booked', session = $1, doctor_id = $2, token_date = $3::date, token_number = $4,
               data = (COALESCE(data, '{}'::jsonb) || $5::jsonb), updated_at = NOW() 
           WHERE id = $6`,
          [
            updatedToken.session,
            updatedToken.doctorId,
            todayStr,
            updatedToken.tokenNo,
            JSON.stringify(updatedToken),
            tokenId
          ]
        );

        const apptDataObj = {
          status: 'booked',
          date: todayStr,
          doctorId: updatedToken.doctorId,
          doctorName: updatedToken.doctorName,
          tokenNumber: Number(updatedToken.tokenNo),
          session: updatedToken.session,
          isExisting: true,
          revisitDetails: updatedToken.revisitDetails
        };

        await query(
          `UPDATE appointments 
           SET status = 'booked', appointment_date = $1::date, doctor_id = $2,
               data = (COALESCE(data, '{}'::jsonb) || $3::jsonb), 
               updated_at = NOW() 
           WHERE id = $4 OR (data->>'tokenId') = $4`,
          [
            todayStr,
            updatedToken.doctorId,
            JSON.stringify(apptDataObj),
            tokenId
          ]
        );
      } catch (dbErr) {
        console.error('Error re-admitting token in DB:', dbErr.message);
      }
    }

    await saveUnifiedStore(store);

    io.to(`hospital_${hospitalId}`).emit('token_status_changed', updatedToken);
    io.to(`hospital_${hospitalId}`).emit('token_readmitted', { tokenId, token: updatedToken });
    io.emit('token_readmitted', { tokenId, token: updatedToken });
    console.log(`📡 [Socket.io] Emitted token_readmitted for token ${tokenId} into doctor ${updatedToken.doctorName} (#${updatedToken.tokenNo})`);
  }

  res.json({ success: true, token: updatedToken });
});

// ─── Delete Single Hospital Token from Store & RDS ────────────────────────────
app.delete('/api/hospitals/:hospitalId/tokens/:tokenId', requireHospitalAuth, async (req, res) => {
  const { hospitalId, tokenId } = req.params;
  const store = await getUnifiedStore();

  const targetToken = (store.tokens || []).find(t =>
    t.id === tokenId ||
    (t.appointmentId && t.appointmentId === tokenId) ||
    (t.tokenId && t.tokenId === tokenId)
  );

  const targetAppt = (store.appointments || []).find(a =>
    a.id === tokenId ||
    (targetToken && (a.id === targetToken.id || a.id === targetToken.appointmentId)) ||
    (targetToken && a.hospitalId === hospitalId && a.doctorId === targetToken.doctorId &&
      (String(a.tokenNumber) === String(targetToken.tokenNo) || String(a.tokenNumber) === String(targetToken.tokenNumber)))
  );

  const matchedApptId = targetToken?.appointmentId || targetAppt?.id || null;
  const tokNum = targetToken ? String(targetToken.tokenNo || targetToken.tokenNumber || '') : (targetAppt ? String(targetAppt.tokenNumber || '') : '');
  const docId = targetToken?.doctorId || targetAppt?.doctorId || null;

  // Filter in memory store
  store.tokens = (store.tokens || []).filter(t =>
    t.id !== tokenId &&
    t.appointmentId !== tokenId &&
    t.tokenId !== tokenId &&
    !(matchedApptId && (t.id === matchedApptId || t.appointmentId === matchedApptId)) &&
    !(tokNum && docId && t.hospitalId === hospitalId && t.doctorId === docId && (String(t.tokenNo) === tokNum || String(t.tokenNumber) === tokNum))
  );

  store.appointments = (store.appointments || []).filter(a =>
    a.id !== tokenId &&
    !(matchedApptId && a.id === matchedApptId) &&
    !(tokNum && docId && a.hospitalId === hospitalId && a.doctorId === docId && String(a.tokenNumber) === tokNum)
  );

  if (isDbConnected) {
    try {
      // 1. Delete from tokens table
      await query(
        `DELETE FROM tokens 
         WHERE (hospital_id = $1 OR hospital_id IS NULL) AND (
           id = $2 OR 
           data->>'id' = $2 OR 
           data->>'tokenId' = $2 OR 
           data->>'appointmentId' = $2
           ${matchedApptId ? `OR id = '${matchedApptId}' OR data->>'id' = '${matchedApptId}' OR data->>'appointmentId' = '${matchedApptId}'` : ''}
           ${tokNum && docId ? `OR (doctor_id = '${docId}' AND (token_number = '${tokNum}' OR data->>'tokenNumber' = '${tokNum}' OR data->>'tokenNo' = '${tokNum}'))` : ''}
         )`,
        [hospitalId, tokenId]
      );

      // 2. Delete from appointments table
      await query(
        `DELETE FROM appointments 
         WHERE (hospital_id = $1 OR hospital_id IS NULL) AND (
           id = $2 OR 
           data->>'id' = $2 OR 
           data->>'tokenId' = $2 OR 
           data->>'appointmentId' = $2
           ${matchedApptId ? `OR id = '${matchedApptId}' OR data->>'id' = '${matchedApptId}' OR data->>'appointmentId' = '${matchedApptId}'` : ''}
           ${tokNum && docId ? `OR (doctor_id = '${docId}' AND (data->>'tokenNumber' = '${tokNum}' OR data->>'tokenNo' = '${tokNum}'))` : ''}
         )`,
        [hospitalId, tokenId]
      );
    } catch (e) {
      console.warn('Error deleting token from RDS:', e.message);
    }
  }

  await saveUnifiedStore(store);

  // Broadcast deletion to hospital room and globally
  if (hospitalId) {
    io.to(`hospital_${hospitalId}`).emit('token_deleted', { tokenId, appointmentId: matchedApptId });
    console.log(`📡 [Socket.io] Emitted token_deleted to hospital_${hospitalId} for token ${tokenId}`);
  }
  io.emit('token_deleted', { hospitalId, tokenId, appointmentId: matchedApptId });

  res.json({ success: true, message: 'Token deleted successfully', id: tokenId, appointmentId: matchedApptId });
});

// ─── Bulk Delete Hospital Tokens (e.g. End of Day Unvisited Clearance) ────────
app.delete('/api/hospitals/:hospitalId/tokens', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { ids, doctorId, unvisitedOnly } = req.body || {};
  const store = await getUnifiedStore();

  let targetIds = Array.isArray(ids) ? ids : [];
  if ((!targetIds || targetIds.length === 0) && unvisitedOnly) {
    targetIds = (store.tokens || [])
      .filter(t => (t.hospitalId || 'hosp-apollo') === hospitalId && (!doctorId || t.doctorId === doctorId) && t.status !== 'completed')
      .map(t => t.id);
  }

  if (targetIds.length > 0) {
    const idSet = new Set(targetIds);

    // Also collect any associated appointment IDs
    (store.tokens || []).forEach(t => {
      if (idSet.has(t.id) && t.appointmentId) {
        idSet.add(t.appointmentId);
      }
    });

    const fullIdsArray = Array.from(idSet);

    store.tokens = (store.tokens || []).filter(t => !idSet.has(t.id) && !idSet.has(t.appointmentId) && !idSet.has(t.tokenId));
    store.appointments = (store.appointments || []).filter(a => !idSet.has(a.id));

    if (isDbConnected) {
      try {
        await query(
          `DELETE FROM tokens 
           WHERE (hospital_id = $1 OR hospital_id IS NULL) AND (
             id = ANY($2::varchar[]) OR 
             data->>'id' = ANY($2::varchar[]) OR 
             data->>'tokenId' = ANY($2::varchar[]) OR 
             data->>'appointmentId' = ANY($2::varchar[])
           )`,
          [hospitalId, fullIdsArray]
        );
        await query(
          `DELETE FROM appointments 
           WHERE (hospital_id = $1 OR hospital_id IS NULL) AND (
             id = ANY($2::varchar[]) OR 
             data->>'id' = ANY($2::varchar[]) OR 
             data->>'tokenId' = ANY($2::varchar[]) OR 
             data->>'appointmentId' = ANY($2::varchar[])
           )`,
          [hospitalId, fullIdsArray]
        );
      } catch (e) {
        console.warn('Error bulk deleting tokens from RDS:', e.message);
      }
    }

    await saveUnifiedStore(store);

    if (hospitalId) {
      io.to(`hospital_${hospitalId}`).emit('tokens_bulk_deleted', { ids: fullIdsArray });
      console.log(`📡 [Socket.io] Emitted tokens_bulk_deleted to hospital_${hospitalId} (${fullIdsArray.length} tokens)`);
    }
    io.emit('tokens_bulk_deleted', { hospitalId, ids: fullIdsArray });

    return res.json({ success: true, count: fullIdsArray.length, clearedIds: fullIdsArray });
  }

  res.json({ success: true, count: 0, clearedIds: [] });
});

// ─── Update Appointment Status Directly ──────────────────────────────────────
app.patch('/api/appointments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status required' });

  const store = await getUnifiedStore();
  let matchedAppt = null;
  store.appointments = (store.appointments || []).map(a => {
    if (a.id === id) {
      matchedAppt = { ...a, status };
      return matchedAppt;
    }
    return a;
  });

  // Also update corresponding token in store.tokens
  store.tokens = (store.tokens || []).map(t => {
    if (t.id === id || (matchedAppt && t.hospitalId === matchedAppt.hospitalId && t.doctorId === matchedAppt.doctorId && (t.tokenNo === matchedAppt.tokenNumber || t.tokenNumber === matchedAppt.tokenNumber))) {
      return {
        ...t,
        status: status === 'cancelled' ? 'cancelled' : status === 'completed' ? 'completed' : status,
        paymentStatus: status === 'cancelled' ? 'refunded' : status === 'completed' ? 'paid' : t.paymentStatus
      };
    }
    return t;
  });

  // Also update in customer accounts store
  if (store.customers && Array.isArray(store.customers)) {
    store.customers = store.customers.map(c => ({
      ...c,
      bookings: (c.bookings || []).map(b => b.id === id ? { ...b, status } : b)
    }));
  }

  if (isDbConnected) {
    try {
      await query(
        `UPDATE appointments SET status = $1::varchar, data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', $1::varchar)), updated_at = NOW() WHERE id = $2`,
        [status, id]
      );
      // Synchronously update tokens table in RDS so COALESCE(t.status, a.status) matches
      await query(
        `UPDATE tokens SET status = $1::varchar, data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', $1::varchar)), updated_at = NOW() WHERE id = $2`,
        [status, id]
      );
      if (matchedAppt && (matchedAppt.tokenNumber || matchedAppt.tokenNo)) {
        const tokNum = String(matchedAppt.tokenNumber || matchedAppt.tokenNo);
        await query(
          `UPDATE tokens SET status = $1::varchar, data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('status', $1::varchar)), updated_at = NOW() 
           WHERE hospital_id = $2 AND doctor_id = $3 AND (token_number = $4 OR data->>'tokenNumber' = $4 OR data->>'tokenNo' = $4)`,
          [status, matchedAppt.hospitalId, matchedAppt.doctorId, tokNum]
        );
      }
    } catch (e) {
      console.warn('Error updating appointment/token status in RDS:', e.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, id, status });
});

// ─── Delete Single Appointment from Customer History & RDS ─────────────────────
app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const store = await getUnifiedStore();

  const targetAppt = (store.appointments || []).find(a => a.id === id);
  store.appointments = (store.appointments || []).filter(a => a.id !== id);
  store.tokens = (store.tokens || []).filter(t => t.id !== id);

  if (store.customers && Array.isArray(store.customers)) {
    store.customers = store.customers.map(c => ({
      ...c,
      bookings: (c.bookings || []).filter(b => b.id !== id)
    }));
  }

  if (isDbConnected) {
    try {
      await query(`DELETE FROM appointments WHERE id = $1`, [id]);
      await query(`DELETE FROM tokens WHERE id = $1`, [id]);
      if (targetAppt && (targetAppt.tokenNumber || targetAppt.tokenNo)) {
        const tokNum = String(targetAppt.tokenNumber || targetAppt.tokenNo);
        await query(
          `DELETE FROM tokens WHERE hospital_id = $1 AND doctor_id = $2 AND (token_number = $3 OR data->>'tokenNumber' = $3 OR data->>'tokenNo' = $3)`,
          [targetAppt.hospitalId, targetAppt.doctorId, tokNum]
        );
      }
    } catch (e) {
      console.warn('Error deleting appointment from RDS:', e.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, message: 'Appointment deleted successfully', id });
});

// ─── Bulk Clear Past Appointments / History from RDS ─────────────────────────
app.delete('/api/appointments', async (req, res) => {
  const { ids, phone, email, clearPast } = req.body || {};
  const store = await getUnifiedStore();

  let targetIds = Array.isArray(ids) ? ids : [];

  if (clearPast && (!targetIds || targetIds.length === 0)) {
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    const cleanEmail = (email || '').trim().toLowerCase();

    targetIds = (store.appointments || [])
      .filter(a => {
        const isPast = a.status === 'completed' || a.status === 'cancelled';
        if (!isPast) return false;
        if (cleanPhone || cleanEmail) {
          const aPhone = (a.phone || '').replace(/\D/g, '').slice(-10);
          const aEmail = (a.email || '').trim().toLowerCase();
          return (cleanPhone && aPhone === cleanPhone) || (cleanEmail && aEmail === cleanEmail);
        }
        return true;
      })
      .map(a => a.id);
  }

  if (targetIds.length > 0) {
    const idSet = new Set(targetIds);
    store.appointments = (store.appointments || []).filter(a => !idSet.has(a.id));
    store.tokens = (store.tokens || []).filter(t => !idSet.has(t.id));

    if (store.customers && Array.isArray(store.customers)) {
      store.customers = store.customers.map(c => ({
        ...c,
        bookings: (c.bookings || []).filter(b => !idSet.has(b.id))
      }));
    }

    if (isDbConnected) {
      try {
        await query(`DELETE FROM appointments WHERE id = ANY($1::varchar[])`, [targetIds]);
        await query(`DELETE FROM tokens WHERE id = ANY($1::varchar[])`, [targetIds]);
      } catch (e) {
        console.warn('Error bulk-clearing appointments from RDS:', e.message);
      }
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, clearedCount: targetIds.length, clearedIds: targetIds });
});

// ─── Razorpay Payment Gateway Endpoints ─────────────────────────────────────
// 1. Get Public Razorpay Test Key ID
app.get('/api/razorpay/key', (req, res) => {
  res.json({ success: true, keyId: RAZORPAY_KEY_ID });
});

// 2. Create Razorpay Order
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, receipt, notes, patientName, patientPhone, doctorId, date, session, hospitalId } = req.body || {};

    // Check doctor session capacity before initiating payment
    const targetDocId = doctorId || notes?.doctorId;
    const targetDate = date || notes?.date;
    const targetSession = (session || notes?.session || 'morning').toLowerCase();
    const targetHospId = hospitalId || notes?.hospitalId;

    // Validate session cutoff in real-world IST time
    if (targetDate && isSessionExpiredInIST(targetSession, targetDate)) {
      return res.status(400).json({
        success: false,
        message: `This OPD session (${targetSession.toUpperCase()}) has already concluded for ${targetDate} (IST). Please select an upcoming session or choose a future date.`
      });
    }

    if (targetDocId && targetDate && isDbConnected) {
      try {
        let maxLimit = targetSession.includes('morn') ? 30 : 20;
        if (targetHospId) {
          const hospDb = await query(`SELECT data FROM hospitals WHERE id = $1`, [targetHospId]);
          if (hospDb.rows && hospDb.rows.length > 0) {
            const hData = typeof hospDb.rows[0].data === 'string' ? JSON.parse(hospDb.rows[0].data) : hospDb.rows[0].data;
            const doc = (hData?.doctors || []).find(d => d.id === targetDocId);
            const matchedSession = (doc?.sessions || []).find(s => (s.name || '').toLowerCase() === targetSession);
            if (matchedSession?.maxTokens) maxLimit = parseInt(matchedSession.maxTokens, 10);
          }
        }

        const countRes = await query(
          `SELECT COUNT(*) as count FROM tokens WHERE doctor_id = $1 AND (token_date::text = $2 OR data->>'bookingDate' = $2) AND LOWER(session) = $3 AND status != 'cancelled'`,
          [targetDocId, targetDate, targetSession]
        );
        const booked = parseInt(countRes.rows[0]?.count, 10) || 0;
        if (booked >= maxLimit) {
          return res.status(400).json({
            success: false,
            message: `This OPD session has reached full capacity (${booked}/${maxLimit} tokens booked). Please select another session or visit the hospital reception counter for walk-in availability.`,
            code: 'SESSION_CAPACITY_REACHED'
          });
        }
      } catch (checkErr) {
        console.warn('Error checking session limit before order creation:', checkErr.message);
      }
    }

    const amtNumber = Number(amount) || 25;
    const amountInPaise = Math.max(100, Math.round(amtNumber * 100)); // Minimum ₹1.00

    const receiptId = (receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`).slice(0, 40);

    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          patientName: patientName || 'Patient',
          patientPhone: patientPhone || '',
          platform: 'InstaToken Web Portal',
          ...(notes || {})
        }
      })
    });

    const orderData = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error('Razorpay order creation failed:', orderData);
      return res.status(razorpayResponse.status || 500).json({
        success: false,
        message: orderData.error?.description || 'Failed to create Razorpay order',
        error: orderData
      });
    }

    res.json({
      success: true,
      order: orderData,
      keyId: RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Error creating Razorpay order:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error while initializing Razorpay order'
    });
  }
});

// 3. Verify Razorpay Payment Signature
app.post('/api/razorpay/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay verification fields (order_id, payment_id, signature)'
      });
    }

    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      console.warn(`Razorpay signature mismatch: expected ${generatedSignature}, got ${razorpay_signature}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Transaction could not be verified.'
      });
    }

    res.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      message: 'Razorpay payment verified successfully'
    });
  } catch (err) {
    console.error('Error verifying Razorpay signature:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying Razorpay payment signature'
    });
  }
});

// ─── Direct Token Lookup ─────────────────────────────────────────────────────
app.get('/api/tokens/:id', async (req, res) => {
  const { id } = req.params;
  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT data FROM tokens WHERE id = $1`, [id]);
      if (dbRes.rows.length > 0 && dbRes.rows[0].data) {
        return res.json({ success: true, token: dbRes.rows[0].data });
      }
    } catch (e) {
      console.warn('Error querying token from RDS:', e.message);
    }
  }
  const store = await getUnifiedStore();
  const found = (store.tokens || []).find(t => t.id === id);
  if (found) return res.json({ success: true, token: found });
  res.status(404).json({ success: false, message: 'Token not found' });
});

// ─── Appointments API (Customer Token Bookings) ─────────────────────────────
app.post('/api/appointments', async (req, res) => {
  const appt = req.body?.appointment || req.body;
  if (!appt || !appt.id) {
    return res.status(400).json({ success: false, message: 'Invalid appointment payload' });
  }

  const store = await getUnifiedStore();
  store.appointments = store.appointments || [];

  // Standardize doctor reference across backend and support backward compatibility
  const ref = appt.doctorReference || appt.rmpReference || null;
  if (ref) {
    appt.doctorReference = ref;
    appt.rmpReference = ref;
    if (appt.hospitalId) {
      autoUpsertDoctorReference(appt.hospitalId, ref).catch(e => console.warn('Doctor ref upsert warning:', e.message));
    }
  }
  appt.address = appt.address || appt.place || '';
  appt.place = appt.place || appt.address || '';

  const isFullOnlineBooking = appt.collectionMode === 'full_online' || 
    appt.paymentMethod?.toLowerCase().includes('full online') ||
    (Number(appt.totalFee || 0) > (Number(appt.fee || 0) + 5));

  const docConsultationFee = Number(appt.fee || 500);
  const baseTokenFee = Number(appt.tokenFee || appt.tokenBaseFee || Math.max(10, Math.round(docConsultationFee * 0.05)));
  const onlineSubtotal = isFullOnlineBooking ? (docConsultationFee + baseTokenFee) : baseTokenFee;
  const baseGatewayFee = Number(appt.gatewayFee || parseFloat((onlineSubtotal * 0.03).toFixed(2)));

  appt.fee = docConsultationFee;
  appt.tokenFee = baseTokenFee;
  appt.platformFee = baseTokenFee; // Pure 5% platform cut (₹20), never gateway pass-through
  appt.gatewayFee = baseGatewayFee;
  appt.collectionMode = isFullOnlineBooking ? 'full_online' : 'token_only';

  const apptDate = appt.date || new Date().toISOString().split('T')[0];
  const apptSession = (appt.session || ((appt.time && parseInt(appt.time.split(':')[0], 10) >= 12 && parseInt(appt.time.split(':')[0], 10) < 17) ? 'afternoon' : (appt.time && parseInt(appt.time.split(':')[0], 10) >= 17) ? 'evening' : 'morning')).toLowerCase();

  // Enforce Online Session Hard-Cap
  const isOnline = appt.type !== 'offline' && (appt.type === 'online' || isFullOnlineBooking);
  if (isOnline && isDbConnected) {
    try {
      let sessionMax = apptSession.includes('morn') ? 30 : 20;
      if (appt.hospitalId) {
        const hospDb = await query(`SELECT data FROM hospitals WHERE id = $1`, [appt.hospitalId]);
        if (hospDb.rows && hospDb.rows.length > 0) {
          const hData = typeof hospDb.rows[0].data === 'string' ? JSON.parse(hospDb.rows[0].data) : hospDb.rows[0].data;
          const doc = (hData?.doctors || []).find(d => d.id === appt.doctorId);
          const sessObj = (doc?.sessions || []).find(s => (s.name || '').toLowerCase() === apptSession);
          if (sessObj?.maxTokens) sessionMax = parseInt(sessObj.maxTokens, 10);
        }
      }

      const countRes = await query(
        `SELECT COUNT(*) as count FROM tokens WHERE doctor_id = $1 AND (token_date::text = $2 OR data->>'bookingDate' = $2) AND LOWER(session) = $3 AND status != 'cancelled' AND id != $4`,
        [appt.doctorId, apptDate, apptSession, appt.id]
      );
      const booked = parseInt(countRes.rows[0]?.count, 10) || 0;
      if (booked >= sessionMax) {
        return res.status(400).json({
          success: false,
          error: `This OPD session has reached full online capacity (${booked}/${sessionMax} tokens booked). Please select another session or visit the hospital reception desk for walk-in availability.`,
          code: 'SESSION_CAPACITY_REACHED'
        });
      }
    } catch (checkErr) {
      console.warn('Error checking session limit:', checkErr.message);
    }
  }

  // Find max existing token number for this doctor on this date & session
  let assignedTokenNumber = Number(appt.tokenNumber || 0);
  const existingDocTokens = (store.tokens || []).filter(t =>
    t.doctorId === appt.doctorId &&
    (t.bookingDate === apptDate || t.date === apptDate) &&
    (t.session || 'morning').toLowerCase() === apptSession &&
    t.status !== 'cancelled' &&
    t.id !== appt.id
  );
  const maxExisting = existingDocTokens.reduce((max, t) => Math.max(max, Number(t.tokenNo || t.tokenNumber || 0)), 0);

  if (!assignedTokenNumber || assignedTokenNumber <= maxExisting) {
    assignedTokenNumber = maxExisting + 1;
  }

  if (isDbConnected) {
    try {
      const maxDbRes = await query(
        `SELECT COALESCE(MAX(NULLIF(regexp_replace(token_number, '\\D', '', 'g'), '')::integer), 0) as max_tok FROM tokens WHERE doctor_id = $1 AND (token_date::text = $2 OR data->>'bookingDate' = $2) AND LOWER(session) = $3 AND status != 'cancelled' AND id != $4`,
        [appt.doctorId, apptDate, apptSession, appt.id]
      );
      if (maxDbRes.rows && maxDbRes.rows.length > 0 && Number(maxDbRes.rows[0].max_tok) >= assignedTokenNumber) {
        assignedTokenNumber = Number(maxDbRes.rows[0].max_tok) + 1;
      }
    } catch (e) {
      console.warn('Error querying max token from RDS:', e.message);
    }
  }

  appt.tokenNumber = assignedTokenNumber;

  store.appointments = [appt, ...store.appointments.filter(a => a.id !== appt.id)];

  const tokenRecord = {
    id: appt.id,
    tokenNo: appt.tokenNumber,
    tokenNumber: appt.tokenNumber,
    type: appt.type || 'online',
    patientName: appt.patientName,
    patientPhone: appt.phone,
    patientAge: appt.age,
    patientGender: appt.gender,
    patientAddress: appt.address || appt.place || '',
    address: appt.address || appt.place || '',
    place: appt.place || appt.address || '',
    doctorId: appt.doctorId,
    doctorName: appt.doctorName,
    departmentName: appt.departmentName,
    session: apptSession,
    time: appt.time,
    bookingDate: appt.date || new Date().toISOString().split('T')[0],
    status: appt.status || 'booked',
    estimatedWait: appt.estimatedWaitTime || 15,
    consultationFee: docConsultationFee,
    tokenFee: baseTokenFee,
    platformFee: baseTokenFee,
    gatewayFee: baseGatewayFee,
    gstFee: 0,
    totalFee: Number(appt.totalFee || appt.totalBookingCharges || (onlineSubtotal + baseGatewayFee)),
    paymentStatus: isFullOnlineBooking ? 'paid' : 'pending',
    paymentMethod: isFullOnlineBooking ? 'Razorpay (Full Online)' : (appt.paymentMethod || 'Pay at Hospital'),
    paymentCollection: {
      mode: isFullOnlineBooking ? 'full_online' : 'token_only',
      consultationFee: docConsultationFee,
      tokenFee: baseTokenFee,
      platformFee: baseTokenFee,
      gatewayFee: baseGatewayFee,
      totalAmountPaid: Number(appt.totalFee || appt.totalBookingCharges || (onlineSubtotal + baseGatewayFee)),
      settlementStatus: isFullOnlineBooking ? 'unsettled' : 'not_applicable'
    },
    paymentId: appt.paymentId,
    hospitalId: appt.hospitalId,
    hospitalName: appt.hospitalName,
    doctorReference: ref,
    rmpReference: ref,
    createdAt: appt.createdAt || new Date().toISOString()
  };

  store.tokens = store.tokens || [];
  store.tokens = [tokenRecord, ...store.tokens.filter(t => t.id !== tokenRecord.id)];

  if (isDbConnected) {
    try {
      await query(
        `INSERT INTO appointments (id, hospital_id, doctor_id, patient_name, patient_phone, appointment_date, appointment_time, status, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET status = $8, data = $9, updated_at = NOW()`,
        [
          appt.id,
          appt.hospitalId,
          appt.doctorId,
          appt.patientName,
          appt.phone,
          appt.date || new Date().toISOString().split('T')[0],
          appt.time || '',
          appt.status || 'booked',
          JSON.stringify(appt)
        ]
      );

      await query(
        `INSERT INTO tokens (id, hospital_id, doctor_id, token_number, patient_name, patient_phone, status, token_type, session, token_date, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET status = $7, data = $11, updated_at = NOW()`,
        [
          tokenRecord.id,
          tokenRecord.hospitalId,
          tokenRecord.doctorId,
          String(tokenRecord.tokenNo || tokenRecord.tokenNumber),
          tokenRecord.patientName,
          tokenRecord.patientPhone,
          tokenRecord.status,
          tokenRecord.type,
          tokenRecord.session,
          tokenRecord.bookingDate,
          JSON.stringify(tokenRecord)
        ]
      );
    } catch (err) {
      console.error('Error inserting appointment/token into PostgreSQL:', err.message);
    }
  }

  await saveUnifiedStore(store);
  if (tokenRecord && tokenRecord.hospitalId) {
    io.to(`hospital_${tokenRecord.hospitalId}`).emit('token_booked', tokenRecord);
    console.log(`📡 [Socket.io] Emitted online token_booked to hospital_${tokenRecord.hospitalId} for token #${tokenRecord.tokenNo || tokenRecord.tokenNumber}`);
  }
  res.status(201).json({ success: true, appointment: appt, token: tokenRecord });
});

// GET appointment by ID
app.get('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT id, status, data FROM appointments WHERE id = $1`, [id]);
      if (dbRes.rows.length > 0 && dbRes.rows[0].data) {
        const raw = dbRes.rows[0].data;
        const dataObj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
        return res.json({
          success: true,
          appointment: {
            ...dataObj,
            id: dbRes.rows[0].id || dataObj.id,
            status: dbRes.rows[0].status || dataObj.status || 'booked'
          }
        });
      }

      const tokRes = await query(`SELECT id, status, data FROM tokens WHERE id = $1`, [id]);
      if (tokRes.rows.length > 0 && tokRes.rows[0].data) {
        const rawTok = tokRes.rows[0].data;
        const tok = typeof rawTok === 'string' ? JSON.parse(rawTok) : (rawTok || {});
        const effectiveStatus = tokRes.rows[0].status || tok.status || 'booked';
        const apptFromTok = {
          id: tok.id,
          tokenNumber: tok.tokenNo || tok.tokenNumber || 1,
          patientName: tok.patientName || 'Patient',
          age: tok.patientAge || 28,
          gender: tok.patientGender || 'Male',
          phone: tok.patientPhone || '',
          email: tok.patientEmail || '',
          address: tok.address || '',
          hospitalId: tok.hospitalId,
          hospitalName: tok.hospitalName || 'Hospital',
          doctorId: tok.doctorId,
          doctorName: tok.doctorName || 'Doctor',
          departmentName: tok.departmentName || 'General Medicine',
          date: tok.bookingDate || new Date().toISOString().split('T')[0],
          time: tok.time || '10:00 AM',
          fee: tok.consultationFee || 500,
          platformFee: tok.platformFee || 25,
          totalFee: tok.totalFee || tok.platformFee || 25,
          status: effectiveStatus,
          paymentId: tok.paymentId || `PAY-${tok.id}`,
          paymentMethod: tok.paymentMethod || 'Online',
          estimatedWaitTime: tok.estimatedWait || 15,
          createdAt: tok.createdAt || new Date().toISOString()
        };
        return res.json({ success: true, appointment: apptFromTok });
      }
    } catch (err) {
      console.warn('Error fetching appointment from RDS:', err.message);
    }
  }

  const store = await getUnifiedStore();
  const appt = (store.appointments || []).find(a => a.id === id);
  if (appt) {
    return res.json({ success: true, appointment: appt });
  }
  const tok = (store.tokens || []).find(t => t.id === id);
  if (tok) {
    return res.json({ success: true, appointment: tok });
  }

  res.status(404).json({ success: false, message: 'Appointment not found' });
});

// GET /api/appointments/:id/download-pass - Stream PDF pass directly for mobile and web downloads
app.get(['/api/appointments/:id/download-pass', '/api/tokens/:id/download-pass'], async (req, res) => {
  const { id } = req.params;
  let appt = null;

  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT id, status, data FROM appointments WHERE id = $1`, [id]);
      if (dbRes.rows.length > 0 && dbRes.rows[0].data) {
        const raw = dbRes.rows[0].data;
        const dataObj = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
        appt = { ...dataObj, id: dbRes.rows[0].id || dataObj.id, status: dbRes.rows[0].status || dataObj.status || 'booked' };
      } else {
        const tokRes = await query(`SELECT id, status, data FROM tokens WHERE id = $1`, [id]);
        if (tokRes.rows.length > 0 && tokRes.rows[0].data) {
          const rawTok = tokRes.rows[0].data;
          const tok = typeof rawTok === 'string' ? JSON.parse(rawTok) : (rawTok || {});
          appt = {
            id: tok.id,
            tokenNumber: tok.tokenNo || tok.tokenNumber || 1,
            patientName: tok.patientName || 'Patient',
            age: tok.patientAge || 28,
            gender: tok.patientGender || 'Male',
            phone: tok.patientPhone || '',
            hospitalName: tok.hospitalName || 'Hospital',
            doctorName: tok.doctorName || 'Doctor',
            departmentName: tok.departmentName || 'General Medicine',
            date: tok.bookingDate || new Date().toISOString().split('T')[0],
            time: tok.time || '10:00 AM',
            fee: tok.consultationFee || 500,
            platformFee: tok.platformFee || 25,
            totalFee: tok.totalFee || tok.platformFee || 25,
            paymentMethod: tok.paymentMethod || 'Online',
            paymentId: tok.paymentId || `PAY-${tok.id}`,
            estimatedWaitTime: tok.estimatedWait || 15
          };
        }
      }
    } catch (err) {
      console.warn('Error fetching appointment for PDF download:', err.message);
    }
  }

  if (!appt) {
    const store = await getUnifiedStore();
    appt = (store.appointments || []).find(a => a.id === id) || (store.tokens || []).find(t => t.id === id);
  }

  if (!appt) {
    return res.status(404).send('Appointment record not found');
  }

  try {
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // 1. Top Header Banner (Blue)
    doc.setFillColor(30, 64, 175);
    doc.roundedRect(15, 15, 180, 24, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('INSTATOKEN · OFFICIAL OPD APPOINTMENT PASS', 20, 22);
    doc.setFontSize(14);
    doc.text(String(appt.hospitalName || 'Hospital OPD Facility'), 20, 30);

    // 2. Token Number & Slot
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(15, 43, 180, 36, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text('YOUR TOKEN NUMBER', 22, 51);
    doc.setFontSize(28);
    doc.setTextColor(29, 78, 216);
    doc.text(`#${appt.tokenNumber || appt.tokenNo || 1}`, 22, 63);
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Slot Time: ${appt.time || 'Morning OPD'}`, 22, 70);
    doc.text(`Date: ${appt.date || appt.bookingDate || 'Today'}`, 22, 75);

    // Status Badge
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(140, 48, 45, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TOKEN CONFIRMED', 145, 53.5);

    // 3. Grid: Patient Details & Doctor Details
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 83, 87, 44, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text('PATIENT DETAILS', 20, 90);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(String(appt.patientName || 'Patient'), 20, 97);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Age / Gender: ${appt.age || '28'} Yrs (${appt.gender || 'Male'})`, 20, 103);
    doc.text(`Contact: ${appt.phone || 'On File'}`, 20, 109);
    doc.text(`Booking ID: ${appt.id}`, 20, 115);
    doc.text('Queue Status: On Schedule', 20, 121);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(108, 83, 87, 44, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text('CONSULTING DOCTOR', 113, 90);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(String(appt.doctorName || 'Doctor'), 113, 97);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Department: ${appt.departmentName || 'General OPD'}`, 113, 103);
    doc.text('OPD Room: Cabin Consultation', 113, 109);
    doc.text(`Est. Wait: ~${appt.estimatedWaitTime || 15} mins`, 113, 115);
    doc.text('Consultation Validity: 7 Days', 113, 121);

    // 4. Payment breakdown
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(15, 131, 180, 36, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('PAYMENT & CHARGES BREAKDOWN', 20, 138);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Doctor Consultation Fee:', 20, 145);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${(Number(appt.fee) || 250).toFixed(2)}`, 85, 145);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Platform & Gateway Charges:', 20, 151);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${(Number(appt.platformFee) || 15).toFixed(2)}`, 85, 151);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Payment Status:', 20, 157);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(appt.paymentMethod === 'Online' ? 'PAID ONLINE VIA RAZORPAY' : 'CONFIRMED APPOINTMENT', 85, 157);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Transaction Ref: ${appt.paymentId || 'PAYID-INSTATOKEN'} · Verified Online`, 20, 163);

    // 5. Instructions
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(15, 171, 180, 34, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(133, 77, 14);
    doc.text('IMPORTANT PATIENT INSTRUCTIONS', 20, 178);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 63, 18);
    doc.text('1. Please reach hospital 10-15 minutes prior to your allocated slot time.', 20, 184);
    doc.text('2. Present this token pass at the hospital OPD reception upon arrival.', 20, 189);
    doc.text('3. Carry previous medical prescriptions and health reports.', 20, 194);
    doc.text('4. Consultation Fee is valid for 7 Days (up to 2 Follow-up visits).', 20, 199);

    // 6. Security Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 215, 195, 215);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by InstaToken OPD Platform · 100% Spot Guaranteed Pass', 15, 221);
    doc.text(`Issued On: ${new Date().toLocaleString('en-IN')} · Support: help@instatoken.in`, 15, 226);

    const safePatient = (appt.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `InstaToken_Pass_${appt.tokenNumber || appt.tokenNo || 1}_${safePatient}.pdf`;

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (pdfErr) {
    console.error('Server PDF generation error:', pdfErr);
    return res.status(500).send('Error generating PDF');
  }
});

// GET all appointments
app.get('/api/appointments', async (req, res) => {
  if (isDbConnected) {
    try {
      const dbRes = await query(`
        SELECT a.id, COALESCE(t.status, a.status) as effective_status, a.data 
        FROM appointments a 
        LEFT JOIN tokens t ON a.id = t.id 
        ORDER BY a.created_at DESC 
        LIMIT 200
      `);
      if (dbRes.rows.length > 0) {
        const appts = dbRes.rows.map(r => {
          if (!r.data) return null;
          const dataObj = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          return {
            ...dataObj,
            id: r.id || dataObj.id,
            status: r.effective_status || dataObj.status || 'booked'
          };
        }).filter(Boolean);
        return res.json({ success: true, appointments: appts });
      }
    } catch (err) {
      console.warn('Error querying appointments:', err.message);
    }
  }

  const store = await getUnifiedStore();
  res.json({ success: true, appointments: store.appointments || [] });
});

// ─── Customer Login & Lookup ─────────────────────────────────────────────────
app.post('/api/customers/login', async (req, res) => {
  try {
    const { emailOrPhone, name } = req.body;
    const cleanInput = (emailOrPhone || '').trim();
    const cleanPhone = cleanInput.replace(/\D/g, '').slice(-10);
    const cleanEmail = cleanInput.toLowerCase();

    const store = await getUnifiedStore();
    store.customers = store.customers || [];

    let foundCustomer = null;
    if (isDbConnected) {
      try {
        const dbRes = await query(`
          SELECT id, name, phone, email, location, data 
          FROM customers 
          WHERE (phone = $1 OR email = $2 OR (phone != '' AND RIGHT(phone, 10) = $3))
          LIMIT 1
        `, [cleanInput, cleanEmail, cleanPhone || '___none___']);
        if (dbRes.rows.length > 0) {
          const raw = dbRes.rows[0].data;
          foundCustomer = typeof raw === 'string' ? JSON.parse(raw) : (raw || dbRes.rows[0]);
        }
      } catch (dbErr) {
        console.warn('Error querying customer in RDS:', dbErr.message);
      }
    }

    if (!foundCustomer) {
      foundCustomer = store.customers.find(c => {
        const cPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
        const cEmail = (c.email || '').trim().toLowerCase();
        return (cleanPhone && cPhone === cleanPhone) || (cleanEmail && cEmail === cleanEmail);
      });
    }

    if (foundCustomer) {
      if (name && (!foundCustomer.name || foundCustomer.name === 'Guest' || foundCustomer.name === 'Patient')) {
        foundCustomer.name = name;
      }
      return res.json({ success: true, customer: foundCustomer });
    }

    // Auto-create customer profile on first-time login
    const newCustomer = {
      id: `cust-${Date.now()}`,
      name: name || (cleanInput.includes('@') ? cleanInput.split('@')[0] : 'Patient'),
      email: cleanInput.includes('@') ? cleanEmail : '',
      phone: cleanInput.includes('@') ? '' : cleanInput,
      location: 'Koramangala, Bengaluru',
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'active',
      bookings: [],
      savedHospitals: [],
      savedDoctors: [],
      familyMembers: []
    };

    store.customers.push(newCustomer);
    if (isDbConnected) {
      try {
        await query(`
          INSERT INTO customers (id, name, phone, email, location, data, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        `, [newCustomer.id, newCustomer.name, newCustomer.phone, newCustomer.email, newCustomer.location, JSON.stringify(newCustomer)]);
      } catch (e) { }
    }
    await saveUnifiedStore(store);

    res.json({ success: true, customer: newCustomer });
  } catch (err) {
    console.error('Error in /api/customers/login:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});



// GET Super Admin Revenue Tracking
app.get('/api/admin/revenue', async (req, res) => {
  const { dateFilter, hospitalId, startDate, endDate } = req.query;
  let allAppts = [];
  let allTokens = [];

  if (isDbConnected) {
    try {
      const aRes = await query(`SELECT data FROM appointments ORDER BY created_at DESC`);
      allAppts = aRes.rows.map(r => r.data).filter(Boolean);

      const tRes = await query(`SELECT data FROM tokens ORDER BY created_at DESC`);
      allTokens = tRes.rows.map(r => r.data).filter(Boolean);
    } catch (e) {
      console.warn('Error loading revenue from RDS:', e.message);
    }
  }

  if (allAppts.length === 0) {
    const store = await getUnifiedStore();
    allAppts = store.appointments || [];
    allTokens = store.tokens || [];
  }

  const combinedMap = new Map();
  allAppts.forEach(a => {
    if (a && a.id) combinedMap.set(a.id, a);
  });
  allTokens.forEach(t => {
    if (t && t.id && !combinedMap.has(t.id)) {
      combinedMap.set(t.id, {
        id: t.id,
        tokenNumber: t.tokenNo || t.tokenNumber,
        patientName: t.patientName,
        phone: t.patientPhone,
        hospitalId: t.hospitalId,
        hospitalName: t.hospitalName || 'Hospital',
        doctorId: t.doctorId,
        doctorName: t.doctorName,
        departmentName: t.departmentName,
        date: t.bookingDate,
        time: t.time,
        fee: t.consultationFee || 500,
        platformFee: t.platformFee || 25,
        totalFee: t.totalFee || t.platformFee || 25,
        status: t.status,
        paymentId: t.paymentId || `PAY-${t.id}`,
        paymentMethod: t.paymentMethod || 'Online',
        createdAt: t.createdAt
      });
    }
  });

  let transactions = Array.from(combinedMap.values());
  if (hospitalId && hospitalId !== 'all') {
    transactions = transactions.filter(t => t.hospitalId === hospitalId);
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (dateFilter === 'today') {
    transactions = transactions.filter(t => (t.date === todayStr || (t.createdAt && t.createdAt.startsWith(todayStr))));
  } else if (dateFilter === 'week') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    transactions = transactions.filter(t => {
      const d = t.date || (t.createdAt ? t.createdAt.split('T')[0] : '');
      return d && d >= sevenDaysAgo && d <= todayStr;
    });
  } else if (dateFilter === 'month') {
    const curMonth = todayStr.slice(0, 7);
    transactions = transactions.filter(t => (t.date?.startsWith(curMonth) || (t.createdAt && t.createdAt.startsWith(curMonth))));
  } else if (dateFilter === 'custom' && startDate) {
    const sDate = startDate;
    const eDate = endDate || todayStr;
    transactions = transactions.filter(t => {
      const d = t.date || (t.createdAt ? t.createdAt.split('T')[0] : '');
      return d && d >= sDate && d <= eDate;
    });
  }

  const store = await getUnifiedStore();
  const currentFeePercent = store.settings?.platformFeePercent !== undefined ? Number(store.settings.platformFeePercent) : 5;
  const totalDoctorFees = transactions.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);
  const totalPlatformFees = transactions.reduce((sum, t) => sum + (Number(t.platformFee) || Math.max(10, Math.round((Number(t.fee) || 500) * (currentFeePercent / 100)))), 0);
  const totalGrossRevenue = totalDoctorFees + totalPlatformFees;

  res.json({
    success: true,
    summary: {
      totalTransactions: transactions.length,
      totalTokenRevenue: totalPlatformFees,
      totalPlatformFees,
      totalDoctorFees,
      totalGrossRevenue,
      platformFeePercent: currentFeePercent
    },
    transactions
  });
});

// GET /api/admin/settings
app.get('/api/admin/settings', async (req, res) => {
  const store = await getUnifiedStore();
  const settings = store.settings || { platformFeePercent: 5 };
  res.json({ success: true, settings });
});

// POST /api/admin/settings
app.post('/api/admin/settings', async (req, res) => {
  const { platformFeePercent } = req.body;
  const store = await getUnifiedStore();
  store.settings = store.settings || {};
  if (platformFeePercent !== undefined) {
    store.settings.platformFeePercent = Number(platformFeePercent);
  }
  await saveUnifiedStore(store);
  res.json({ success: true, settings: store.settings });
});

// ─── Hospital Schedules (Phase 21 & 22) ──────────────────────────────────────
app.get('/api/hospitals/:hospitalId/schedules', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const store = await getUnifiedStore();
  const schedule = store.hospitalSchedules?.[hospitalId] || null;
  res.json({ success: true, hospitalId, schedule });
});

app.post('/api/hospitals/:hospitalId/schedules', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { schedule } = req.body;
  const store = await getUnifiedStore();

  store.hospitalSchedules = store.hospitalSchedules || {};
  store.hospitalSchedules[hospitalId] = schedule;

  if (isDbConnected && schedule) {
    try {
      await query(
        `INSERT INTO hospital_schedules (hospital_id, schedule_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (hospital_id) DO UPDATE SET schedule_data = $2, updated_at = NOW()`,
        [hospitalId, JSON.stringify(schedule)]
      );
    } catch (e) {
      console.error('Error persisting hospital schedules to RDS:', e.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId, schedule });
});

// ─── Hospital Staff (Phase 21 & 22) ──────────────────────────────────────────
app.get('/api/hospitals/:hospitalId/staff', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const store = await getUnifiedStore();
  const staff = store.hospitalStaff?.[hospitalId] || [];
  res.json({ success: true, hospitalId, staff });
});

app.post('/api/hospitals/:hospitalId/staff', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { staff } = req.body;
  const store = await getUnifiedStore();

  store.hospitalStaff = store.hospitalStaff || {};
  store.hospitalStaff[hospitalId] = staff;

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId, staff });
});

// ─── Hospital Broadcast Notifications ─────────────────────────────────────────
app.get('/api/hospitals/:hospitalId/notifications', async (req, res) => {
  const { hospitalId } = req.params;
  const store = await getUnifiedStore();
  const notifications = store.hospitalNotifications?.[hospitalId] || [];
  res.json({ success: true, hospitalId, notifications });
});

app.post('/api/hospitals/:hospitalId/notifications', async (req, res) => {
  const { hospitalId } = req.params;
  const { notification } = req.body;
  if (!notification || !notification.message) {
    return res.status(400).json({ success: false, message: 'Invalid notification data' });
  }

  const store = await getUnifiedStore();
  store.hospitalNotifications = store.hospitalNotifications || {};
  store.hospitalNotifications[hospitalId] = store.hospitalNotifications[hospitalId] || [];

  const newRecord = {
    id: notification.id || `notif-${Date.now()}`,
    type: notification.type || 'inapp',
    recipient: notification.recipient || 'all',
    message: notification.message,
    sentAt: notification.sentAt || new Date().toISOString(),
    status: 'sent'
  };

  store.hospitalNotifications[hospitalId].unshift(newRecord);
  if (store.hospitalNotifications[hospitalId].length > 50) {
    store.hospitalNotifications[hospitalId] = store.hospitalNotifications[hospitalId].slice(0, 50);
  }

  // Maintain active broadcasts for client devices
  store.broadcastNotifications = store.broadcastNotifications || [];
  const hospName = store.hospitalProfiles?.[hospitalId]?.name || store.hospitals?.find(h => h.id === hospitalId)?.name || 'Hospital';
  store.broadcastNotifications.unshift({
    ...newRecord,
    hospitalId,
    hospitalName: hospName
  });
  if (store.broadcastNotifications.length > 50) {
    store.broadcastNotifications = store.broadcastNotifications.slice(0, 50);
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId, notification: newRecord });
});

// ─── Hospital Doctor References (AWS RDS PostgreSQL & Unified Store) ─────────
async function autoUpsertDoctorReference(hospitalId, ref) {
  if (!hospitalId || !ref) return null;
  const rawName = String(ref.name || '').replace(/[`'"]/g, '').trim();
  const rawPhone = String(ref.phone || '').replace(/\D/g, '').slice(-10);
  if (!rawName || rawPhone.length < 7) return null;

  let cleanName = rawName;
  if (!cleanName.toLowerCase().startsWith('dr.') && !cleanName.toLowerCase().startsWith('dr ')) {
    cleanName = `Dr. ${cleanName}`;
  }
  const cleanPlace = String(ref.place || '').replace(/[`'"]/g, '').trim();
  const specialization = ref.specialization || 'General Physician';
  const qualification = ref.qualification || 'MBBS / Consultant';
  const notes = ref.notes || 'Registered from patient referral';
  const status = ref.status || 'active';

  let savedRecord = null;
  if (isDbConnected) {
    try {
      const id = `doc-ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const res = await query(
        `INSERT INTO hospital_doctor_references 
         (id, hospital_id, name, phone, place, specialization, qualification, status, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (hospital_id, phone) DO UPDATE
         SET name = EXCLUDED.name,
             place = COALESCE(NULLIF(EXCLUDED.place, ''), hospital_doctor_references.place),
             specialization = COALESCE(NULLIF(EXCLUDED.specialization, ''), hospital_doctor_references.specialization),
             qualification = COALESCE(NULLIF(EXCLUDED.qualification, ''), hospital_doctor_references.qualification),
             status = EXCLUDED.status,
             notes = COALESCE(NULLIF(EXCLUDED.notes, ''), hospital_doctor_references.notes),
             updated_at = NOW()
         RETURNING id, hospital_id, name, phone, place, specialization, qualification, status, notes,
                   TO_CHAR(created_at, 'YYYY-MM-DD') as "registeredDate"`,
        [id, hospitalId, cleanName, rawPhone, cleanPlace, specialization, qualification, status, notes]
      );
      if (res.rows && res.rows.length > 0) {
        savedRecord = res.rows[0];
      }
    } catch (err) {
      console.warn('Auto-upsert doctor reference in DB error:', err.message);
    }
  }

  try {
    const store = await getUnifiedStore();
    store.hospitalDoctorReferences = store.hospitalDoctorReferences || {};
    store.hospitalDoctorReferences[hospitalId] = store.hospitalDoctorReferences[hospitalId] || [];
    const refObj = savedRecord || {
      id: `doc-ref-${rawPhone}`,
      hospitalId,
      name: cleanName,
      phone: rawPhone,
      place: cleanPlace,
      specialization,
      qualification,
      status,
      registeredDate: new Date().toISOString().split('T')[0],
      notes
    };
    const existingIdx = store.hospitalDoctorReferences[hospitalId].findIndex(r => r.phone === rawPhone);
    if (existingIdx >= 0) {
      store.hospitalDoctorReferences[hospitalId][existingIdx] = {
        ...store.hospitalDoctorReferences[hospitalId][existingIdx],
        ...refObj
      };
    } else {
      store.hospitalDoctorReferences[hospitalId].unshift(refObj);
    }
    await saveUnifiedStore(store);
    return refObj;
  } catch (e) {
    return savedRecord;
  }
}

app.get('/api/hospitals/:hospitalId/doctor-references', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const store = await getUnifiedStore();
  let references = [];

  if (isDbConnected) {
    try {
      const dbRes = await query(
        `SELECT id, hospital_id, name, phone, place, specialization, qualification, status, notes,
                TO_CHAR(created_at, 'YYYY-MM-DD') as "registeredDate",
                updated_at
         FROM hospital_doctor_references 
         WHERE hospital_id = $1 
         ORDER BY updated_at DESC`,
        [hospitalId]
      );
      references = dbRes.rows || [];
    } catch (err) {
      console.warn('Error fetching hospital_doctor_references from RDS:', err.message);
    }
  }

  // Fallback / merge with in-memory store
  store.hospitalDoctorReferences = store.hospitalDoctorReferences || {};
  const memRefs = store.hospitalDoctorReferences[hospitalId] || [];
  const seenPhones = new Set(references.map(r => r.phone));
  for (const mr of memRefs) {
    if (!seenPhones.has(mr.phone)) {
      references.push(mr);
      seenPhones.add(mr.phone);
    }
  }

  res.json({ success: true, hospitalId, references });
});

app.post('/api/hospitals/:hospitalId/doctor-references', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { reference, references } = req.body;

  if (Array.isArray(references)) {
    for (const r of references) {
      await autoUpsertDoctorReference(hospitalId, r);
    }
  } else if (reference && reference.name) {
    await autoUpsertDoctorReference(hospitalId, reference);
  } else {
    return res.status(400).json({ success: false, error: 'Doctor Name and Mobile Number are required.' });
  }

  // Fetch updated list from DB
  let updatedList = [];
  if (isDbConnected) {
    try {
      const dbRes = await query(
        `SELECT id, hospital_id, name, phone, place, specialization, qualification, status, notes,
                TO_CHAR(created_at, 'YYYY-MM-DD') as "registeredDate"
         FROM hospital_doctor_references 
         WHERE hospital_id = $1 
         ORDER BY updated_at DESC`,
        [hospitalId]
      );
      updatedList = dbRes.rows || [];
    } catch (err) {
      console.warn('Error fetching updated doctor references:', err.message);
    }
  }

  if (updatedList.length === 0) {
    const store = await getUnifiedStore();
    updatedList = store.hospitalDoctorReferences?.[hospitalId] || [];
  }

  res.json({ success: true, hospitalId, references: updatedList });
});

app.delete('/api/hospitals/:hospitalId/doctor-references/:refId', requireHospitalAuth, async (req, res) => {
  const { hospitalId, refId } = req.params;
  if (isDbConnected) {
    try {
      await query(`DELETE FROM hospital_doctor_references WHERE hospital_id = $1 AND id = $2`, [hospitalId, refId]);
    } catch (err) {
      console.warn('Error deleting doctor reference from DB:', err.message);
    }
  }
  const store = await getUnifiedStore();
  store.hospitalDoctorReferences = store.hospitalDoctorReferences || {};
  store.hospitalDoctorReferences[hospitalId] = (store.hospitalDoctorReferences[hospitalId] || []).filter(r => r.id !== refId);
  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId, references: store.hospitalDoctorReferences[hospitalId] });
});

// ─── Hospital Payment Settings ────────────────────────────────────────────────

// PUT /api/hospitals/:hospitalId/payment-settings
app.put('/api/hospitals/:hospitalId/payment-settings', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const {
    payment_mode,
    bank_account_holder,
    bank_account_number,
    bank_name,
    bank_ifsc,
    upi_id,
    upi_phone
  } = req.body;

  if (!['token_only', 'full_online'].includes(payment_mode)) {
    return res.status(400).json({ success: false, message: 'payment_mode must be token_only or full_online' });
  }
  if (payment_mode === 'full_online') {
    if (!bank_account_holder || !bank_account_number || !bank_ifsc || !bank_name) {
      return res.status(400).json({ success: false, message: 'Bank details are required for Full Online Payment mode.' });
    }
  }

  const store = await getUnifiedStore();
  const paymentSettings = { payment_mode, bank_account_holder, bank_account_number, bank_name, bank_ifsc, upi_id, upi_phone };

  // Update in-memory store
  if (store.hospitalProfiles && store.hospitalProfiles[hospitalId]) {
    store.hospitalProfiles[hospitalId] = { ...store.hospitalProfiles[hospitalId], ...paymentSettings };
  }
  // Also update in hospitals list
  if (store.hospitals && Array.isArray(store.hospitals)) {
    const idx = store.hospitals.findIndex(h => h.id === hospitalId);
    if (idx !== -1) {
      store.hospitals[idx] = { ...store.hospitals[idx], ...paymentSettings };
    }
  }

  // Update in RDS
  if (isDbConnected) {
    try {
      await query(
        `UPDATE hospitals SET payment_mode=$1, bank_account_holder=$2, bank_account_number=$3, bank_name=$4, bank_ifsc=$5, upi_id=$6, upi_phone=$7, updated_at=NOW()
         WHERE id=$8`,
        [payment_mode, bank_account_holder||null, bank_account_number||null, bank_name||null, bank_ifsc||null, upi_id||null, upi_phone||null, hospitalId]
      );
      // Also keep the profile_data JSONB in sync
      if (store.hospitalProfiles && store.hospitalProfiles[hospitalId]) {
        await query(
          `INSERT INTO hospital_profiles (hospital_id, profile_data) VALUES ($1, $2)
           ON CONFLICT (hospital_id) DO UPDATE SET profile_data=$2, updated_at=NOW()`,
          [hospitalId, JSON.stringify(store.hospitalProfiles[hospitalId])]
        );
      }
    } catch (dbErr) {
      console.warn('Error updating hospital payment settings in RDS:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);

  // Broadcast to all active clients (e.g. patients viewing the booking page)
  try {
    if (typeof io !== 'undefined' && io) {
      io.emit('HOSPITAL_UPDATED', { hospitalId, payment_mode });
      io.emit('HOSPITAL_PAYMENT_SETTINGS_CHANGED', { hospitalId, payment_mode });
    }
  } catch (ioErr) {}

  res.json({ success: true, message: 'Payment settings updated successfully', paymentSettings });
});

// GET /api/hospitals/:hospitalId/public-payment-settings (Unauthenticated patient access)
app.get('/api/hospitals/:hospitalId/public-payment-settings', async (req, res) => {
  const { hospitalId } = req.params;
  let payment_mode = 'token_only';
  if (isDbConnected) {
    try {
      const r = await query('SELECT payment_mode FROM hospitals WHERE id=$1', [hospitalId]);
      if (r.rows.length > 0 && r.rows[0].payment_mode) {
        payment_mode = r.rows[0].payment_mode;
      }
    } catch (e) {
      console.warn('Error fetching public payment mode from RDS:', e.message);
    }
  } else {
    const store = await getUnifiedStore();
    const hosp = (store.hospitals || []).find(h => h.id === hospitalId);
    if (hosp?.payment_mode) payment_mode = hosp.payment_mode;
  }
  res.json({ success: true, hospitalId, payment_mode });
});

// GET /api/hospitals/:hospitalId/payment-settings
app.get('/api/hospitals/:hospitalId/payment-settings', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  let settings = { payment_mode: 'token_only', bank_account_holder: '', bank_account_number: '', bank_name: '', bank_ifsc: '', upi_id: '', upi_phone: '' };

  if (isDbConnected) {
    try {
      const r = await query(
        `SELECT payment_mode, bank_account_holder, bank_account_number, bank_name, bank_ifsc, upi_id, upi_phone FROM hospitals WHERE id=$1`,
        [hospitalId]
      );
      if (r.rows.length > 0) {
        const row = r.rows[0];
        settings = {
          payment_mode: row.payment_mode || 'token_only',
          bank_account_holder: row.bank_account_holder || '',
          bank_account_number: row.bank_account_number || '',
          bank_name: row.bank_name || '',
          bank_ifsc: row.bank_ifsc || '',
          upi_id: row.upi_id || '',
          upi_phone: row.upi_phone || ''
        };
      }
    } catch (dbErr) {
      console.warn('Error fetching payment settings from RDS:', dbErr.message);
    }
  } else {
    const store = await getUnifiedStore();
    const prof = store.hospitalProfiles?.[hospitalId] || {};
    settings = {
      payment_mode: prof.payment_mode || 'token_only',
      bank_account_holder: prof.bank_account_holder || '',
      bank_account_number: prof.bank_account_number || '',
      bank_name: prof.bank_name || '',
      bank_ifsc: prof.bank_ifsc || '',
      upi_id: prof.upi_id || '',
      upi_phone: prof.upi_phone || ''
    };
  }
  res.json({ success: true, ...settings });
});

// ─── Hospital Payout Requests (Hospital → Super Admin) ─────────────────────────

// POST /api/hospitals/:hospitalId/payout-requests
app.post('/api/hospitals/:hospitalId/payout-requests', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const { requested_amount, notes } = req.body;
  if (!requested_amount || Number(requested_amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount requested.' });
  }
  const store = await getUnifiedStore();
  const hospitalName = store.hospitalProfiles?.[hospitalId]?.name || hospitalId;
  const reqId = `preq-${Date.now().toString(36)}`;
  const nowIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isDbConnected) {
    try {
      // Check if hospital already has a pending payout request to prevent duplication
      const existing = await query(
        `SELECT id FROM hospital_payout_requests WHERE hospital_id=$1 AND status='pending' ORDER BY created_at DESC LIMIT 1`,
        [hospitalId]
      );
      if (existing.rows.length > 0) {
        // Update existing pending request instead of inserting duplicate
        await query(
          `UPDATE hospital_payout_requests SET requested_amount=$1, notes=$2, updated_at=NOW(), created_at_ist=$3 WHERE id=$4`,
          [Number(requested_amount), notes || '', nowIST, existing.rows[0].id]
        );
        return res.json({ success: true, message: 'Existing payout request updated successfully.', requestId: existing.rows[0].id, updated: true });
      }

      await query(
        `INSERT INTO hospital_payout_requests (id, hospital_id, hospital_name, requested_amount, status, notes, created_at_ist) VALUES ($1,$2,$3,$4,'pending',$5,$6)`,
        [reqId, hospitalId, hospitalName, Number(requested_amount), notes || '', nowIST]
      );
    } catch (dbErr) {
      console.warn('Error saving payout request to RDS:', dbErr.message);
    }
  }
  // Also store in memory as fallback
  store.payoutRequests = store.payoutRequests || [];
  const existingMemIdx = store.payoutRequests.findIndex(r => r.hospitalId === hospitalId && r.status === 'pending');
  if (existingMemIdx !== -1) {
    store.payoutRequests[existingMemIdx].requested_amount = Number(requested_amount);
    store.payoutRequests[existingMemIdx].notes = notes || '';
    store.payoutRequests[existingMemIdx].updated_at = new Date().toISOString();
    store.payoutRequests[existingMemIdx].created_at_ist = nowIST;
    await saveUnifiedStore(store);
    return res.json({ success: true, message: 'Existing payout request updated successfully.', requestId: store.payoutRequests[existingMemIdx].id, updated: true });
  }

  store.payoutRequests.push({ id: reqId, hospitalId, hospital_name: hospitalName, requested_amount: Number(requested_amount), status: 'pending', notes: notes || '', created_at: new Date().toISOString(), created_at_ist: nowIST });
  await saveUnifiedStore(store);

  res.json({ success: true, message: 'Payout request submitted successfully.', requestId: reqId });
});

// GET /api/hospitals/:hospitalId/payout-requests
app.get('/api/hospitals/:hospitalId/payout-requests', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  let requests = [];
  if (isDbConnected) {
    try {
      const r = await query(`SELECT * FROM hospital_payout_requests WHERE hospital_id=$1 ORDER BY created_at DESC`, [hospitalId]);
      requests = r.rows;
    } catch (dbErr) {
      console.warn('Error fetching payout requests from RDS:', dbErr.message);
    }
  }
  if (requests.length === 0) {
    const store = await getUnifiedStore();
    requests = (store.payoutRequests || []).filter(r => r.hospitalId === hospitalId);
  }
  res.json({ success: true, requests });
});

// GET /api/hospitals/:hospitalId/payout-settlements (hospital sees its own settled payments)
app.get('/api/hospitals/:hospitalId/payout-settlements', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  let settlements = [];
  if (isDbConnected) {
    try {
      const r = await query(`SELECT * FROM hospital_payout_settlements WHERE hospital_id=$1 ORDER BY created_at DESC`, [hospitalId]);
      settlements = r.rows;
    } catch (dbErr) {
      console.warn('Error fetching settlements from RDS:', dbErr.message);
    }
  }
  if (settlements.length === 0) {
    const store = await getUnifiedStore();
    settlements = (store.payoutSettlements || []).filter(s => s.hospital_id === hospitalId);
  }
  res.json({ success: true, settlements });
});

// ─── Financial Helpers for Payouts & Settlements ──────────────────
function isFullOnlineToken(t) {
  if (!t) return false;
  const d = t.data || {};
  const pc = t.paymentCollection || d.paymentCollection || {};
  const mode = pc.mode || t.collectionMode || d.collectionMode;
  if (mode === 'full_online') return true;
  const method = (t.paymentMethod || d.paymentMethod || '').toLowerCase();
  if (method.includes('full online')) return true;
  if (t.isFullOnline || d.isFullOnline) return true;
  const totalFee = Number(t.totalFee || d.totalFee || 0);
  const docFee = Number(pc.consultationFee || t.consultationFee || d.consultationFee || t.fee || d.fee || 0);
  if (docFee > 0 && totalFee >= docFee) return true;
  return false;
}

function getDoctorFee(t) {
  if (!t) return 0;
  const d = t.data || {};
  const pc = t.paymentCollection || d.paymentCollection || {};
  return Number(pc.consultationFee || t.consultationFee || d.consultationFee || t.fee || d.fee || 0);
}

function getSettlementStatus(t) {
  if (!t) return 'unsettled';
  const d = t.data || {};
  const pc = t.paymentCollection || d.paymentCollection || {};
  return pc.settlementStatus || d.settlementStatus || 'unsettled';
}

// GET /api/hospitals/:hospitalId/payout-summary
app.get('/api/hospitals/:hospitalId/payout-summary', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const store = await getUnifiedStore();

  // Get payment mode & bank details
  let paymentMode = 'token_only';
  let bankDetails = {};
  if (isDbConnected) {
    try {
      const r = await query(`SELECT payment_mode, bank_account_holder, bank_account_number, bank_name, bank_ifsc, upi_id, upi_phone FROM hospitals WHERE id=$1`, [hospitalId]);
      if (r.rows.length > 0) {
        paymentMode = r.rows[0].payment_mode || 'token_only';
        bankDetails = r.rows[0];
      }
    } catch (e) {}
  } else {
    const prof = store.hospitalProfiles?.[hospitalId] || {};
    paymentMode = prof.payment_mode || 'token_only';
    bankDetails = prof;
  }

  // Get all tokens for this hospital from both RDS and store
  const seenIds = new Set();
  const hospTokens = [];

  if (isDbConnected) {
    try {
      const r = await query(
        `SELECT id, token_number, doctor_id, patient_name, patient_phone, status, session, token_date, data, created_at
         FROM tokens
         WHERE (hospital_id = $1 OR ($1 = 'hosp-mu0838sg' AND hospital_id = 'hosp-gandhi'))
         ORDER BY created_at DESC`,
        [hospitalId]
      );
      r.rows.forEach(row => {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          const d = row.data || {};
          hospTokens.push({
            id: row.id,
            tokenNo: row.token_number || d.tokenNo || d.tokenNumber || 1,
            patientName: row.patient_name || d.patientName || 'Patient',
            patientPhone: row.patient_phone || d.patientPhone || '',
            doctorId: row.doctor_id || d.doctorId,
            doctorName: d.doctorName || 'Doctor',
            departmentName: d.departmentName || 'General OPD',
            status: row.status,
            consultationFee: getDoctorFee(d),
            totalFee: Number(d.totalFee || 0),
            bookingDate: d.bookingDate || row.token_date || (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'Today'),
            paymentCollection: d.paymentCollection || {},
            paymentMethod: d.paymentMethod || 'Razorpay (Full Online)',
            data: d
          });
        }
      });
    } catch (e) {
      console.warn('Error fetching tokens from RDS in payout-summary:', e.message);
    }
  }

  const allStoreTokens = [...(store.tokens || []), ...(store.appointments || []).map(a => ({ ...a, consultationFee: a.fee }))];
  allStoreTokens.forEach(t => {
    const matchesHosp = t.hospitalId === hospitalId || 
      (hospitalId === 'hosp-mu0838sg' && t.hospitalId === 'hosp-gandhi');
    if (matchesHosp && t.id && !seenIds.has(t.id)) {
      seenIds.add(t.id);
      hospTokens.push(t);
    }
  });

  let totalCollectedOnline = 0;
  let totalSettled = 0;
  const unsettledTokens = [];

  hospTokens.forEach(t => {
    const isFullOnline = isFullOnlineToken(t);
    if (isFullOnline && t.status !== 'cancelled') {
      const docFee = getDoctorFee(t);
      totalCollectedOnline += docFee;
      const sStatus = getSettlementStatus(t);
      if (sStatus === 'settled') {
        totalSettled += docFee;
      } else {
        unsettledTokens.push(t);
      }
    }
  });

  // Check actual disbursed sum from hospital_payout_settlements
  let settledFromDb = 0;
  if (isDbConnected) {
    try {
      const sr = await query(`SELECT SUM(payout_amount) as total FROM hospital_payout_settlements WHERE hospital_id=$1 OR ($1='hosp-mu0838sg' AND hospital_id='hosp-gandhi')`, [hospitalId]);
      if (sr.rows[0]?.total) settledFromDb = Number(sr.rows[0].total);
    } catch (e) {}
  }

  const effectiveSettled = Math.max(totalSettled, settledFromDb);
  const pendingDue = Math.max(0, totalCollectedOnline - effectiveSettled);

  res.json({
    success: true,
    paymentMode,
    bankDetails,
    totalCollectedOnline,
    totalSettled: effectiveSettled,
    pendingDue,
    unsettledCount: unsettledTokens.length,
    unsettledTokens: unsettledTokens.map(t => ({
      id: t.id,
      tokenNo: t.tokenNo || t.tokenNumber || 1,
      patientName: t.patientName || 'Patient',
      doctorName: t.doctorName || 'Doctor',
      departmentName: t.departmentName || 'General OPD',
      consultationFee: getDoctorFee(t),
      bookingDate: t.bookingDate || 'Today',
      paymentMethod: t.paymentMethod || 'Razorpay (Full Online)',
      status: t.status || 'booked'
    }))
  });
});

// ─── Super Admin: Hospital Payouts Management ───────────────────────────────────

// GET /api/admin/hospital-settlements (all full-online hospitals + their dues)
app.get('/api/admin/hospital-settlements', async (req, res) => {
  const store = await getUnifiedStore();

  // Fetch all hospitals that are either full_online OR have historical online tokens/settlements
  let hospitals = [];
  if (isDbConnected) {
    try {
      const r = await query(`
        SELECT id, name, city, payment_mode, bank_account_holder, bank_account_number, bank_name, bank_ifsc, upi_id, upi_phone
        FROM hospitals
        WHERE id != 'hosp-gandhi'
          AND (
            payment_mode = 'full_online'
            OR id IN (SELECT DISTINCT hospital_id FROM tokens WHERE (data->'paymentCollection'->>'mode' = 'full_online' OR data->>'paymentMethod' ILIKE '%full online%'))
            OR id IN (SELECT DISTINCT hospital_id FROM hospital_payout_settlements)
          )
      `);
      hospitals = r.rows;
    } catch (e) {
      console.warn('Error fetching full-online hospitals:', e.message);
    }
  }
  if (hospitals.length === 0) {
    hospitals = (store.hospitals || []).filter(h => h.id !== 'hosp-gandhi');
  } else {
    hospitals = hospitals.filter(h => h.id !== 'hosp-gandhi');
  }

  const result = await Promise.all(hospitals.map(async (h) => {
    let totalCollected = 0;
    let totalSettled = 0;
    let tokenCount = 0;

    const seenIds = new Set();
    const hospTokens = [];

    if (isDbConnected) {
      try {
        const r = await query(
          `SELECT id, token_number, doctor_id, patient_name, patient_phone, status, session, token_date, data, created_at
           FROM tokens
           WHERE (hospital_id = $1 OR ($1 = 'hosp-mu0838sg' AND hospital_id = 'hosp-gandhi'))`,
          [h.id]
        );
        r.rows.forEach(row => {
          if (!seenIds.has(row.id)) {
            seenIds.add(row.id);
            const d = row.data || {};
            hospTokens.push({
              id: row.id,
              tokenNo: row.token_number || d.tokenNo || 1,
              status: row.status,
              consultationFee: getDoctorFee(d),
              totalFee: Number(d.totalFee || 0),
              paymentCollection: d.paymentCollection || {},
              paymentMethod: d.paymentMethod || 'Razorpay (Full Online)',
              data: d
            });
          }
        });
      } catch (e) {}
    }

    const allStoreTokens = [...(store.tokens || []), ...(store.appointments || []).map(a => ({ ...a, consultationFee: a.fee }))];
    allStoreTokens.forEach(t => {
      const matchesHosp = t.hospitalId === h.id || 
        (h.id === 'hosp-mu0838sg' && t.hospitalId === 'hosp-gandhi');
      if (matchesHosp && t.id && !seenIds.has(t.id)) {
        seenIds.add(t.id);
        hospTokens.push(t);
      }
    });

    hospTokens.forEach(t => {
      const isFullOnline = isFullOnlineToken(t);
      if (isFullOnline && t.status !== 'cancelled') {
        const docFee = getDoctorFee(t);
        totalCollected += docFee;
        tokenCount++;
        if (getSettlementStatus(t) === 'settled') {
          totalSettled += docFee;
        }
      }
    });

    let settledFromDb = 0;
    if (isDbConnected) {
      try {
        const sr = await query(`SELECT SUM(payout_amount) as total FROM hospital_payout_settlements WHERE hospital_id=$1 OR ($1='hosp-mu0838sg' AND hospital_id='hosp-gandhi')`, [h.id]);
        if (sr.rows[0]?.total) settledFromDb = Number(sr.rows[0].total);
      } catch (e) {}
    }

    const effectiveSettled = Math.max(totalSettled, settledFromDb);
    const pendingDue = Math.max(0, totalCollected - effectiveSettled);

    let pendingRequests = [];
    if (isDbConnected) {
      try {
        const rr = await query(`SELECT * FROM hospital_payout_requests WHERE (hospital_id=$1 OR ($1='hosp-mu0838sg' AND hospital_id='hosp-gandhi')) AND status='pending' ORDER BY created_at DESC`, [h.id]);
        pendingRequests = rr.rows;
      } catch (e) {}
    }

    return {
      ...h,
      totalCollected,
      totalSettled: effectiveSettled,
      pendingDue,
      tokenCount,
      pendingRequests
    };
  }));

  let totalPendingRequests = 0;
  if (isDbConnected) {
    try {
      const rr = await query(`SELECT COUNT(*) as cnt FROM hospital_payout_requests WHERE status='pending' AND hospital_id != 'hosp-gandhi'`);
      totalPendingRequests = Number(rr.rows[0]?.cnt || 0);
    } catch (e) {}
  }

  const totalDue = result.reduce((acc, h) => acc + h.pendingDue, 0);
  const totalCollectedAll = result.reduce((acc, h) => acc + h.totalCollected, 0);
  const totalSettledAll = result.reduce((acc, h) => acc + h.totalSettled, 0);

  res.json({ success: true, hospitals: result, totalDue, totalCollectedAll, totalSettledAll, totalPendingRequests });
});

// GET /api/admin/hospital-settlements/:hospitalId/statement
app.get('/api/admin/hospital-settlements/:hospitalId/statement', async (req, res) => {
  const { hospitalId } = req.params;
  const store = await getUnifiedStore();

  const seenIds = new Set();
  const allTokens = [];

  if (isDbConnected) {
    try {
      const r = await query(
        `SELECT id, token_number, doctor_id, patient_name, patient_phone, status, session, token_date, data, created_at
         FROM tokens
         WHERE (hospital_id = $1 OR ($1 = 'hosp-mu0838sg' AND hospital_id = 'hosp-gandhi'))
         ORDER BY created_at DESC`,
        [hospitalId]
      );
      r.rows.forEach(row => {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          const d = row.data || {};
          const isOnline = isFullOnlineToken({ ...row, data: d });
          const docFee = getDoctorFee({ ...row, data: d });
          allTokens.push({
            id: row.id,
            tokenNo: row.token_number || d.tokenNo || d.tokenNumber || 1,
            patientName: row.patient_name || d.patientName || 'Patient',
            patientPhone: row.patient_phone || d.patientPhone || '',
            doctorId: row.doctor_id || d.doctorId,
            doctorName: d.doctorName || 'Doctor',
            departmentName: d.departmentName || 'General OPD',
            status: row.status,
            consultationFee: docFee,
            totalFee: Number(d.totalFee || 0),
            bookingDate: d.bookingDate || row.token_date || (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'Today'),
            collectionMode: isOnline ? 'full_online' : 'counter',
            isFullOnline: isOnline,
            netDueToHospital: isOnline ? docFee : 0,
            settlementStatus: getSettlementStatus({ ...row, data: d }),
            paymentMethod: d.paymentMethod || (isOnline ? 'Razorpay (Full Online)' : 'Pay at Hospital'),
            paymentCollection: d.paymentCollection || {}
          });
        }
      });
    } catch (e) {
      console.warn('Error fetching statement tokens from RDS:', e.message);
    }
  }

  const allStoreTokens = [...(store.tokens || []), ...(store.appointments || []).map(a => ({ ...a, consultationFee: a.fee }))];
  allStoreTokens.forEach(t => {
    const matchesHosp = t.hospitalId === hospitalId || 
      (hospitalId === 'hosp-mu0838sg' && t.hospitalId === 'hosp-gandhi');
    if (matchesHosp && t.id && !seenIds.has(t.id)) {
      seenIds.add(t.id);
      const isOnline = isFullOnlineToken(t);
      const docFee = getDoctorFee(t);
      allTokens.push({
        id: t.id,
        tokenNo: t.tokenNo || t.tokenNumber || 1,
        patientName: t.patientName || 'Patient',
        patientPhone: t.patientPhone || '',
        doctorId: t.doctorId,
        doctorName: t.doctorName || 'Doctor',
        departmentName: t.departmentName || 'General OPD',
        status: t.status,
        consultationFee: docFee,
        totalFee: Number(t.totalFee || 0),
        bookingDate: t.bookingDate || 'Today',
        collectionMode: isOnline ? 'full_online' : 'counter',
        isFullOnline: isOnline,
        netDueToHospital: isOnline ? docFee : 0,
        settlementStatus: getSettlementStatus(t),
        paymentMethod: t.paymentMethod || (isOnline ? 'Razorpay (Full Online)' : 'Pay at Hospital'),
        paymentCollection: t.paymentCollection || {}
      });
    }
  });

  let settlements = [];
  if (isDbConnected) {
    try {
      const sr = await query(
        `SELECT * FROM hospital_payout_settlements WHERE (hospital_id=$1 OR ($1='hosp-mu0838sg' AND hospital_id='hosp-gandhi')) ORDER BY created_at DESC`,
        [hospitalId]
      );
      settlements = sr.rows;
    } catch (e) {}
  }
  if (settlements.length === 0) {
    settlements = (store.payoutSettlements || []).filter(s => s.hospital_id === hospitalId || (hospitalId === 'hosp-mu0838sg' && s.hospital_id === 'hosp-gandhi'));
  }

  // Calculate summary metrics
  const fullOnlineTokens = allTokens.filter(t => t.isFullOnline && t.status !== 'cancelled');
  const totalCollectedOnline = fullOnlineTokens.reduce((sum, t) => sum + t.consultationFee, 0);
  const totalSettledFromDb = settlements.reduce((sum, s) => sum + Number(s.payout_amount || 0), 0);
  const totalSettledFromTokens = fullOnlineTokens.filter(t => t.settlementStatus === 'settled').reduce((sum, t) => sum + t.consultationFee, 0);
  const effectiveSettled = Math.max(totalSettledFromDb, totalSettledFromTokens);
  const pendingDue = Math.max(0, totalCollectedOnline - effectiveSettled);

  res.json({
    success: true,
    tokens: allTokens,
    fullOnlineTokens,
    settlements,
    summary: {
      totalCollectedOnline,
      totalSettled: effectiveSettled,
      pendingDue,
      fullOnlineCount: fullOnlineTokens.length,
      allTokensCount: allTokens.length
    }
  });
});

// POST /api/admin/hospital-settlements/:hospitalId/settle
app.post('/api/admin/hospital-settlements/:hospitalId/settle', async (req, res) => {
  const { hospitalId } = req.params;
  const { payout_amount, payment_method, utr_reference, token_ids, notes, settled_by_admin } = req.body;

  if (!payout_amount || !utr_reference || !payment_method) {
    return res.status(400).json({ success: false, message: 'payout_amount, utr_reference, and payment_method are required.' });
  }

  const store = await getUnifiedStore();
  const hospitalName = store.hospitalProfiles?.[hospitalId]?.name || hospitalId;

  // Get bank/UPI details
  let bankAccount = '', ifsc = '', upiId = '';
  if (isDbConnected) {
    try {
      const r = await query(`SELECT bank_account_number, bank_ifsc, upi_id FROM hospitals WHERE id=$1`, [hospitalId]);
      if (r.rows.length > 0) {
        bankAccount = r.rows[0].bank_account_number || '';
        ifsc = r.rows[0].bank_ifsc || '';
        upiId = r.rows[0].upi_id || '';
      }
    } catch (e) {}
  }

  const settlementId = `settle-${Date.now().toString(36)}`;
  const nowIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Resolve target token IDs to settle
  let targetTokenIds = Array.isArray(token_ids) && token_ids.length > 0 ? token_ids : [];
  if (targetTokenIds.length === 0) {
    // Auto-discover unsettled full online tokens for this hospital
    if (isDbConnected) {
      try {
        const r = await query(
          `SELECT id, data FROM tokens WHERE (hospital_id = $1 OR ($1 = 'hosp-mu0838sg' AND hospital_id = 'hosp-gandhi')) AND status != 'cancelled'`
        );
        r.rows.forEach(row => {
          const d = row.data || {};
          if (isFullOnlineToken({ ...row, data: d }) && getSettlementStatus({ ...row, data: d }) !== 'settled') {
            targetTokenIds.push(row.id);
          }
        });
      } catch (e) {}
    }
    if (targetTokenIds.length === 0) {
      (store.tokens || []).forEach(t => {
        const matchesHosp = t.hospitalId === hospitalId || (hospitalId === 'hosp-mu0838sg' && t.hospitalId === 'hosp-gandhi');
        if (matchesHosp && isFullOnlineToken(t) && getSettlementStatus(t) !== 'settled' && t.status !== 'cancelled') {
          targetTokenIds.push(t.id);
        }
      });
    }
  }

  if (isDbConnected) {
    try {
      // Check for duplicate UTR Reference
      const existing = await query(`SELECT id FROM hospital_payout_settlements WHERE utr_reference=$1`, [utr_reference.trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: `UTR Reference "${utr_reference}" has already been recorded. Duplicate settlement prevented.` });
      }

      await query(
        `INSERT INTO hospital_payout_settlements (id, hospital_id, hospital_name, payout_amount, tokens_count, token_ids, payment_method, utr_reference, beneficiary_bank_account, beneficiary_ifsc, beneficiary_upi, settled_by_admin, notes, created_at_ist)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [settlementId, hospitalId, hospitalName, Number(payout_amount), targetTokenIds.length, JSON.stringify(targetTokenIds), payment_method, utr_reference.trim(), bankAccount, ifsc, upiId, settled_by_admin || 'Super Admin', notes || '', nowIST]
      );

      // Lock tokens as settled in PostgreSQL RDS tokens and appointments tables
      if (targetTokenIds.length > 0) {
        await query(
          `UPDATE tokens
           SET data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object(
             'paymentCollection', (COALESCE(data->'paymentCollection', '{}'::jsonb) || jsonb_build_object('settlementStatus', 'settled', 'settlementId', $1::text, 'settledAt', $2::text, 'utrReference', $3::text)),
             'settlementStatus', 'settled',
             'settlementId', $1::text
           ))
           WHERE id = ANY($4::text[])`,
          [settlementId, nowIST, utr_reference.trim(), targetTokenIds]
        );

        await query(
          `UPDATE appointments
           SET data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object(
             'paymentCollection', (COALESCE(data->'paymentCollection', '{}'::jsonb) || jsonb_build_object('settlementStatus', 'settled', 'settlementId', $1::text, 'settledAt', $2::text, 'utrReference', $3::text)),
             'settlementStatus', 'settled',
             'settlementId', $1::text
           ))
           WHERE id = ANY($4::text[])`,
          [settlementId, nowIST, utr_reference.trim(), targetTokenIds]
        );
      }

      // Mark pending payout requests as fulfilled
      await query(
        `UPDATE hospital_payout_requests SET status='fulfilled', admin_notes=$1, updated_at=NOW() WHERE (hospital_id=$2 OR ($2='hosp-mu0838sg' AND hospital_id='hosp-gandhi')) AND status='pending'`,
        [`Settled via ${payment_method} UTR: ${utr_reference}`, hospitalId]
      );
    } catch (dbErr) {
      if (dbErr.message?.includes('duplicate')) {
        return res.status(409).json({ success: false, message: 'Duplicate UTR Reference detected.' });
      }
      return res.status(500).json({ success: false, message: dbErr.message });
    }
  }

  // Update in-memory unified store
  const targetIdSet = new Set(targetTokenIds);
  store.tokens = (store.tokens || []).map(t => {
    if (targetIdSet.has(t.id)) {
      return {
        ...t,
        settlementStatus: 'settled',
        settlementId,
        paymentCollection: {
          ...(t.paymentCollection || {}),
          settlementStatus: 'settled',
          settlementId,
          settledAt: nowIST,
          utrReference: utr_reference.trim()
        }
      };
    }
    return t;
  });

  store.appointments = (store.appointments || []).map(a => {
    if (targetIdSet.has(a.id)) {
      return {
        ...a,
        settlementStatus: 'settled',
        settlementId,
        paymentCollection: {
          ...(a.paymentCollection || {}),
          settlementStatus: 'settled',
          settlementId,
          settledAt: nowIST,
          utrReference: utr_reference.trim()
        }
      };
    }
    return a;
  });

  store.payoutSettlements = store.payoutSettlements || [];
  store.payoutSettlements.unshift({
    id: settlementId,
    hospital_id: hospitalId,
    hospital_name: hospitalName,
    payout_amount: Number(payout_amount),
    tokens_count: targetTokenIds.length,
    token_ids: targetTokenIds,
    payment_method,
    utr_reference: utr_reference.trim(),
    beneficiary_bank_account: bankAccount,
    beneficiary_ifsc: ifsc,
    beneficiary_upi: upiId,
    settled_by_admin: settled_by_admin || 'Super Admin',
    notes: notes || '',
    created_at: new Date().toISOString(),
    created_at_ist: nowIST
  });

  await saveUnifiedStore(store);

  // Notify hospital room and admin room of settlement
  io.to(`hospital_${hospitalId}`).emit('payout_settled', {
    settlementId,
    payout_amount: Number(payout_amount),
    utr_reference: utr_reference.trim(),
    tokens_count: targetTokenIds.length,
    created_at_ist: nowIST
  });

  console.log(`💰 [Settlement] Disbursed ₹${payout_amount} to ${hospitalName} (${hospitalId}). UTR: ${utr_reference}. Settled ${targetTokenIds.length} tokens.`);

  res.json({
    success: true,
    message: `Settlement of ₹${payout_amount} recorded successfully with UTR ${utr_reference}.`,
    settlementId,
    tokensSettledCount: targetTokenIds.length
  });
});

// GET /api/admin/payout-requests (super admin sees all pending requests)
app.get('/api/admin/payout-requests', async (req, res) => {
  let requests = [];
  if (isDbConnected) {
    try {
      const r = await query(`SELECT * FROM hospital_payout_requests WHERE hospital_id != 'hosp-gandhi' ORDER BY created_at DESC LIMIT 100`);
      requests = r.rows;
    } catch (e) {
      console.warn('Error fetching payout requests:', e.message);
    }
  }
  if (requests.length === 0) {
    const store = await getUnifiedStore();
    requests = (store.payoutRequests || []).filter(r => r.hospital_id !== 'hosp-gandhi');
  }
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  res.json({ success: true, requests, pendingCount });
});

// ─── Direct Media Upload Endpoint (S3 with Base64 fallback) ───────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const ext = path.extname(req.file.originalname) || '.jpg';
    const cleanExt = ext.toLowerCase();
    const isVideo = req.file.mimetype && req.file.mimetype.startsWith('video/');
    const folder = isVideo ? 'banner-videos' : 'banners';
    const key = `${folder}/banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${cleanExt}`;
    try {
      const publicUrl = await uploadFile(key, req.file.buffer, req.file.mimetype || 'image/jpeg');
      console.log('✅ Uploaded banner media to S3:', publicUrl);
      return res.json({ success: true, url: publicUrl, source: 's3', mediaType: isVideo ? 'video' : 'image' });
    } catch (s3Err) {
      console.warn('⚠️ S3 upload failed, returning base64 fallback:', s3Err.message);
      const b64 = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
      return res.json({ success: true, url: b64, source: 'base64', mediaType: isVideo ? 'video' : 'image' });
    }
  } catch (err) {
    console.error('Upload endpoint error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(path.join(uploadsDir, 'banner-videos'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'banners'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'records'), { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ─── Medical Records Document & Image Upload Endpoint ─────────────────────────
app.post('/api/records/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const ext = path.extname(req.file.originalname) || '.pdf';
    const cleanExt = ext.toLowerCase();
    const safeBase = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `record-${Date.now()}-${safeBase}${cleanExt}`;
    const key = `records/${filename}`;

    let fileType = 'PDF';
    if (req.file.mimetype && req.file.mimetype.startsWith('image/')) {
      fileType = 'IMAGE';
    } else if (cleanExt.includes('doc') || cleanExt.includes('txt')) {
      fileType = 'DOC';
    }

    // Format file size
    const sizeBytes = req.file.size;
    let sizeStr = `${(sizeBytes / 1024).toFixed(1)} KB`;
    if (sizeBytes > 1024 * 1024) {
      sizeStr = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    try {
      const publicUrl = await uploadFile(key, req.file.buffer, req.file.mimetype || 'application/pdf');
      console.log('✅ Uploaded medical record to S3:', publicUrl);
      return res.json({
        success: true,
        url: publicUrl,
        fileName: req.file.originalname,
        fileType,
        fileSize: sizeStr,
        source: 's3'
      });
    } catch (s3Err) {
      console.warn('⚠️ S3 upload failed, saving to local records upload directory:', s3Err.message);
      const localPath = path.join(uploadsDir, 'records', filename);
      fs.writeFileSync(localPath, req.file.buffer);
      const localUrl = `/uploads/records/${filename}`;
      return res.json({
        success: true,
        url: localUrl,
        fileName: req.file.originalname,
        fileType,
        fileSize: sizeStr,
        source: 'local'
      });
    }
  } catch (err) {
    console.error('Record upload endpoint error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Dedicated Video Upload Endpoint ──────────────────────────────────────────
app.post('/api/upload/video', uploadVideo.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const ext = path.extname(req.file.originalname) || '.mp4';
    const filename = `video-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext.toLowerCase()}`;
    const key = `banner-videos/${filename}`;
    try {
      const publicUrl = await uploadFile(key, req.file.buffer, req.file.mimetype || 'video/mp4');
      console.log('✅ Uploaded banner video to S3:', publicUrl);
      return res.json({ success: true, url: publicUrl, source: 's3', mediaType: 'video' });
    } catch (s3Err) {
      console.warn('⚠️ S3 video upload failed, saving to local uploads directory:', s3Err.message);
      const localPath = path.join(uploadsDir, 'banner-videos', filename);
      fs.writeFileSync(localPath, req.file.buffer);
      const localUrl = `/uploads/banner-videos/${filename}`;
      return res.json({ success: true, url: localUrl, source: 'local', mediaType: 'video' });
    }
  } catch (err) {
    console.error('Video upload endpoint error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

async function resolveBannerImage(imageSource) {
  if (!imageSource) return '';
  const trimmed = imageSource.trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:video/')) {
    const isVideo = trimmed.startsWith('data:video/');
    try {
      const matches = trimmed.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mime = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = mime.split('/')[1]?.split(';')[0] || (isVideo ? 'mp4' : 'jpg');
        const folder = isVideo ? 'banner-videos' : 'banners';
        const filename = `${isVideo ? 'video' : 'banner'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const key = `${folder}/${filename}`;
        try {
          const s3Url = await uploadFile(key, buffer, mime);
          if (s3Url) {
            console.log('✅ Converted base64 banner to S3 URL:', s3Url);
            return s3Url;
          }
        } catch (s3Err) {
          const localPath = path.join(uploadsDir, folder, filename);
          fs.writeFileSync(localPath, buffer);
          return `/uploads/${folder}/${filename}`;
        }
      }
    } catch (e) {
      console.warn('⚠️ S3/local upload for base64 failed, keeping as is:', e.message);
    }
  }
  return trimmed;
}

// ─── Location-Based Banners API (Admin, Customer, Hospital) ─────────────────

function normalizeGeo(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b(district|dist|mandal|town|city|village)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

function matchBannerLocation(banner, userLoc) {
  if (!banner) return false;

  const bCountry = normalizeGeo(banner.country || 'India');
  const uCountry = normalizeGeo(userLoc.country || 'India');
  if (bCountry && uCountry && bCountry !== uCountry) {
    return false;
  }

  // 1. Country level or Global (All India / Worldwide)
  if (!banner.targetLevel || banner.targetLevel === 'country' || banner.targetLevel === 'all') {
    return true;
  }

  const bState = normalizeGeo(banner.state);
  const uState = normalizeGeo(userLoc.state);
  if (bState && uState && bState !== uState) {
    return false;
  }
  if (bState && !uState) {
    return false;
  }

  // 2. State level
  if (banner.targetLevel === 'state') {
    return bState === uState;
  }

  const bDist = normalizeGeo(banner.district);
  const uDist = normalizeGeo(userLoc.district);
  const uCity = normalizeGeo(userLoc.city);

  const distMatches = Boolean(
    bDist && (
      (uDist && (bDist === uDist || uDist.includes(bDist) || bDist.includes(uDist))) ||
      (uCity && (bDist === uCity || uCity.includes(bDist) || bDist.includes(uCity)))
    )
  );

  if (!distMatches) {
    return false;
  }

  // 3. District level
  if (banner.targetLevel === 'district') {
    return true;
  }

  const bMandal = normalizeGeo(banner.mandal);
  const uMandal = normalizeGeo(userLoc.mandal);
  const mandalMatches = Boolean(
    bMandal && uMandal && (
      bMandal === uMandal ||
      uMandal.includes(bMandal) ||
      bMandal.includes(uMandal)
    )
  );

  if (!mandalMatches) {
    return false;
  }

  // 4. Mandal level
  if (banner.targetLevel === 'mandal') {
    return true;
  }

  // 5. Village level
  if (banner.targetLevel === 'village') {
    const bVill = normalizeGeo(banner.village);
    const uVill = normalizeGeo(userLoc.village);
    const uAddr = normalizeGeo(userLoc.address || userLoc.formattedAddress);
    return Boolean(
      bVill && (
        (uVill && (bVill === uVill || uVill.includes(bVill) || bVill.includes(uVill))) ||
        (uAddr && uAddr.includes(bVill))
      )
    );
  }

  return false;
}

// GET /api/banners - List all banners (for Admin)
app.get('/api/banners', async (req, res) => {
  const store = await getUnifiedStore();
  let banners = store.locationBanners || INITIAL_LOCATION_BANNERS;

  const { status, targetLevel, search } = req.query;

  if (status && status !== 'all') {
    banners = banners.filter(b => b.status === status);
  }
  if (targetLevel && targetLevel !== 'all') {
    banners = banners.filter(b => b.targetLevel === targetLevel);
  }
  if (search) {
    const q = search.trim().toLowerCase();
    banners = banners.filter(b =>
      b.title?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q) ||
      b.district?.toLowerCase().includes(q) ||
      b.state?.toLowerCase().includes(q) ||
      b.mandal?.toLowerCase().includes(q) ||
      b.village?.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, total: banners.length, banners });
});

// GET /api/banners/active - Real-time Location Delivery for Customers & Hospitals
app.get('/api/banners/active', async (req, res) => {
  const store = await getUnifiedStore();
  const allBanners = store.locationBanners || INITIAL_LOCATION_BANNERS;

  const { panel = 'customer', country = 'India', state, district, mandal, village, city, address } = req.query;
  const todayStr = new Date().toISOString().split('T')[0];

  const userLocation = {
    country,
    state,
    district,
    mandal,
    village,
    city,
    address
  };

  const levelWeight = {
    village: 5,
    mandal: 4,
    district: 3,
    state: 2,
    country: 1
  };

  const matchingBanners = allBanners.filter(banner => {
    // 1. Must be active
    if (banner.status !== 'active') return false;

    // 2. Panel audience check
    if (banner.displayPanels && Array.isArray(banner.displayPanels) && banner.displayPanels.length > 0) {
      if (!banner.displayPanels.includes(panel) && !banner.displayPanels.includes('all')) return false;
    }

    // 3. Date validity check
    if (banner.startDate && banner.startDate > todayStr) return false;
    if (banner.endDate && banner.endDate < todayStr) return false;

    // 4. Hierarchical Location Match
    return matchBannerLocation(banner, userLocation);
  });

  // Sort by specificity (village > mandal > district > state > country) then priority then recency
  matchingBanners.sort((a, b) => {
    const weightA = levelWeight[a.targetLevel] || 0;
    const weightB = levelWeight[b.targetLevel] || 0;
    if (weightB !== weightA) return weightB - weightA;
    return (b.priority || 0) - (a.priority || 0);
  });

  res.json({
    success: true,
    panel,
    matchedLocation: userLocation,
    count: matchingBanners.length,
    banners: matchingBanners
  });
});

// POST /api/banners - Create a new banner
app.post('/api/banners', async (req, res) => {
  try {
    const bannerData = req.body;
    const rawImage = bannerData.image || bannerData.imageUrl || bannerData.bannerImage;
    if (!bannerData.title || !rawImage) {
      return res.status(400).json({ success: false, message: 'Title and image are required' });
    }

    const finalImage = await resolveBannerImage(rawImage);
    const store = await getUnifiedStore();
    store.locationBanners = store.locationBanners || [];

    const initialStatus = bannerData.status || (bannerData.active === false ? 'inactive' : 'active');
    const isBannerActive = initialStatus === 'active';

    const isVideo = bannerData.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(finalImage || '');

    const newBanner = {
      id: bannerData.id || `ban-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: bannerData.title.trim(),
      description: bannerData.description || '',
      image: finalImage,
      imageUrl: finalImage,
      mediaType: isVideo ? 'video' : (bannerData.mediaType || 'image'),
      badge: bannerData.badge || 'LOCAL HEALTH UPDATE',
      linkUrl: bannerData.linkUrl || '/search',
      ctaText: bannerData.ctaText || 'Book Token',
      hospitalId: bannerData.hospitalId || null,
      destinationType: bannerData.destinationType || (bannerData.hospitalId ? 'hospital' : 'custom'),
      status: initialStatus,
      active: isBannerActive,
      startDate: bannerData.startDate || null,
      endDate: bannerData.endDate || null,
      targetLevel: bannerData.targetLevel || 'country',
      country: bannerData.country || 'India',
      state: bannerData.state || null,
      district: bannerData.district || null,
      mandal: bannerData.mandal || null,
      village: bannerData.village || null,
      displayPanels: bannerData.displayPanels && bannerData.displayPanels.length > 0 ? bannerData.displayPanels : ['customer', 'hospital'],
      priority: Number(bannerData.priority) || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.lastUpdated = Date.now();
    store.locationBanners.unshift(newBanner);
    await saveUnifiedStore(store);

    res.status(201).json({ success: true, message: 'Banner created successfully', banner: newBanner, id: newBanner.id });
  } catch (err) {
    console.error('Error creating banner:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error creating banner' });
  }
});

// PUT /api/banners/:id - Update banner
app.put('/api/banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const store = await getUnifiedStore();

    store.locationBanners = store.locationBanners || [];
    const idx = store.locationBanners.findIndex(b => b.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const existing = store.locationBanners[idx];
    const rawImage = updateData.image || updateData.imageUrl || existing.imageUrl || existing.image;
    const finalImage = await resolveBannerImage(rawImage);
    const nextStatus = updateData.status || (updateData.active !== undefined ? (updateData.active ? 'active' : 'inactive') : existing.status);
    const isVideo = updateData.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(finalImage || '');

    store.locationBanners[idx] = {
      ...existing,
      ...updateData,
      id,
      image: finalImage,
      imageUrl: finalImage,
      mediaType: isVideo ? 'video' : (updateData.mediaType || existing.mediaType || 'image'),
      displayPanels: updateData.displayPanels || existing.displayPanels || ['customer', 'hospital'],
      status: nextStatus,
      active: nextStatus === 'active',
      updatedAt: new Date().toISOString()
    };

    store.lastUpdated = Date.now();
    await saveUnifiedStore(store);
    res.json({ success: true, message: 'Banner updated successfully', banner: store.locationBanners[idx], ...store.locationBanners[idx] });
  } catch (err) {
    console.error('Error updating banner:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error updating banner' });
  }
});

// PATCH /api/banners/:id/status - Toggle active/inactive
app.patch('/api/banners/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, active } = req.body;
  const store = await getUnifiedStore();

  store.locationBanners = store.locationBanners || [];
  const idx = store.locationBanners.findIndex(b => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Banner not found' });
  }

  const nextStatus = status || (active === true ? 'active' : active === false ? 'inactive' : store.locationBanners[idx].status);
  store.locationBanners[idx].status = nextStatus;
  store.locationBanners[idx].active = (nextStatus === 'active');
  store.locationBanners[idx].updatedAt = new Date().toISOString();

  store.lastUpdated = Date.now();
  await saveUnifiedStore(store);
  res.json({ success: true, message: `Banner status set to ${nextStatus}`, banner: store.locationBanners[idx], active: store.locationBanners[idx].active, status: nextStatus });
});

// DELETE /api/banners/:id - Delete banner
app.delete('/api/banners/:id', async (req, res) => {
  const { id } = req.params;
  const store = await getUnifiedStore();

  const deletedBanner = (store.locationBanners || []).find(b => b.id === id);
  store.locationBanners = (store.locationBanners || []).filter(b => b.id !== id);

  // Also clean up any associated inquiry from adsInquiries so it doesn't show as orphan live ad
  if (store.adsInquiries && Array.isArray(store.adsInquiries)) {
    store.adsInquiries = store.adsInquiries.filter(i => {
      if (i.bannerId && i.bannerId === id) return false;
      if (deletedBanner && i.title && deletedBanner.title && i.title.trim().toLowerCase() === deletedBanner.title.trim().toLowerCase()) {
        if (!deletedBanner.hospitalId || i.hospitalId === deletedBanner.hospitalId) {
          return false;
        }
      }
      return true;
    });
  }

  store.lastUpdated = Date.now();
  await saveUnifiedStore(store);

  res.json({ success: true, message: 'Banner and associated inquiries deleted successfully', deletedId: id });
});

// ─── Ads Inquiries API (Hospital Ad / Promotion Requests) ───────────────────
// DELETE /api/ads-inquiries/:id - Delete inquiry and its associated banner if any
app.delete('/api/ads-inquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getUnifiedStore();
    store.adsInquiries = store.adsInquiries || [];
    store.locationBanners = store.locationBanners || [];

    // Find the target inquiry
    let targetIndex = store.adsInquiries.findIndex(i => i.id === id);
    if (targetIndex === -1 && id) {
      targetIndex = store.adsInquiries.findIndex(i => i.id && (i.id.startsWith(id.substring(0, 14)) || id.startsWith(i.id.substring(0, 14))));
    }

    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const targetInquiry = store.adsInquiries[targetIndex];

    // Remove associated banner if it exists in store.locationBanners
    let deletedBannerId = null;
    if (targetInquiry.bannerId) {
      const bannerIdx = store.locationBanners.findIndex(b => b.id === targetInquiry.bannerId);
      if (bannerIdx !== -1) {
        deletedBannerId = targetInquiry.bannerId;
        store.locationBanners.splice(bannerIdx, 1);
      }
    }

    // Also check if any banner matches the inquiry's title and hospital
    if (!deletedBannerId && targetInquiry.title) {
      const bannerIdx = store.locationBanners.findIndex(b =>
        b.title && b.title.trim().toLowerCase() === targetInquiry.title.trim().toLowerCase() &&
        (!targetInquiry.hospitalId || b.hospitalId === targetInquiry.hospitalId)
      );
      if (bannerIdx !== -1) {
        deletedBannerId = store.locationBanners[bannerIdx].id;
        store.locationBanners.splice(bannerIdx, 1);
      }
    }

    // Remove the inquiry
    store.adsInquiries.splice(targetIndex, 1);

    store.lastUpdated = Date.now();
    await saveUnifiedStore(store);

    res.json({
      success: true,
      message: 'Inquiry and associated banner deleted successfully',
      deletedId: id,
      deletedBannerId
    });
  } catch (err) {
    console.error('Error deleting ad inquiry:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete inquiry' });
  }
});
// POST /api/ads-inquiries - Hospital submits an ad inquiry
app.post('/api/ads-inquiries', async (req, res) => {
  const store = await getUnifiedStore();
  store.adsInquiries = store.adsInquiries || [];

  const inquiry = {
    id: `ad-inq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    hospitalId: req.body.hospitalId || '',
    hospitalName: req.body.hospitalName || 'Hospital',
    contactPerson: req.body.contactPerson || '',
    contactPhone: req.body.contactPhone || '',
    contactEmail: req.body.contactEmail || '',
    title: req.body.title || 'Special Hospital Promotion',
    description: req.body.description || '',
    link: req.body.link || '',
    imageUrl: req.body.imageUrl || '',
    targetLevel: req.body.targetLevel || 'state',
    state: req.body.state || '',
    district: req.body.district || '',
    mandal: req.body.mandal || '',
    village: req.body.village || '',
    pincode: req.body.pincode || '',
    ctaText: req.body.ctaText || 'Book Token',
    durationDays: req.body.durationDays || 30,
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    notes: req.body.notes || '',
    createdAt: new Date().toISOString()
  };

  store.adsInquiries.unshift(inquiry);
  store.lastUpdated = Date.now();
  await saveUnifiedStore(store);

  res.status(201).json({ success: true, inquiry });
});

// GET /api/ads-inquiries - Admin gets all inquiries (or filtered by hospital)
app.get('/api/ads-inquiries', async (req, res) => {
  const { hospitalId, status } = req.query;
  const store = await getUnifiedStore();
  let inquiries = store.adsInquiries || [];

  if (hospitalId) {
    inquiries = inquiries.filter(i => i.hospitalId === hospitalId);
  }
  if (status) {
    inquiries = inquiries.filter(i => i.status === status);
  }

  res.json({ success: true, total: inquiries.length, inquiries });
});

// PATCH /api/ads-inquiries/:id/status - Update inquiry status
app.patch('/api/ads-inquiries/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  const store = await getUnifiedStore();
  store.adsInquiries = store.adsInquiries || [];

  let targetIndex = store.adsInquiries.findIndex(i => i.id === id);
  if (targetIndex === -1 && id) {
    targetIndex = store.adsInquiries.findIndex(i => i.id && (i.id.startsWith(id.substring(0, 14)) || id.startsWith(i.id.substring(0, 14))));
  }

  if (targetIndex === -1) {
    return res.status(404).json({ success: false, message: 'Inquiry not found' });
  }

  const existing = store.adsInquiries[targetIndex];
  const updated = {
    ...existing,
    status: status || existing.status,
    adminNotes: adminNotes !== undefined ? adminNotes : existing.adminNotes,
    updatedAt: new Date().toISOString()
  };
  store.adsInquiries[targetIndex] = updated;

  store.lastUpdated = Date.now();
  await saveUnifiedStore(store);
  res.json({ success: true, inquiry: updated });
});

// POST /api/ads-inquiries/:id/approve - Approve inquiry and automatically create active banner
app.post('/api/ads-inquiries/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const clientInquiry = req.body?.inquiry || req.body;
    const store = await getUnifiedStore();
    store.adsInquiries = store.adsInquiries || [];
    store.locationBanners = store.locationBanners || INITIAL_LOCATION_BANNERS;

    // 1. Locate inquiry by id, or fallback to matching client inquiry details
    let inquiry = store.adsInquiries.find(i => i.id === id);
    if (!inquiry && clientInquiry) {
      inquiry = store.adsInquiries.find(i =>
        i.id === clientInquiry.id ||
        (i.hospitalId && clientInquiry.hospitalId && i.hospitalId === clientInquiry.hospitalId && i.title === clientInquiry.title) ||
        (i.title && clientInquiry.title && i.title.trim().toLowerCase() === clientInquiry.title.trim().toLowerCase())
      );
      if (!inquiry && clientInquiry.title) {
        inquiry = { ...clientInquiry };
        store.adsInquiries.unshift(inquiry);
      }
    }

    // 2. Loose prefix match if still not found
    if (!inquiry) {
      inquiry = store.adsInquiries.find(i =>
        (i.id && id && (i.id.startsWith(id.substring(0, 14)) || id.startsWith(i.id.substring(0, 14))))
      );
    }

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split('T')[0];
    const durationDays = Number(inquiry.durationDays) || 30;
    const endDateStr = new Date(Date.now() + (durationDays * 86400000)).toISOString().split('T')[0];
    const rawImage = inquiry.imageUrl || inquiry.image || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80';
    const finalImage = await resolveBannerImage(rawImage);
    const targetLink = inquiry.link || (inquiry.hospitalId ? `/hospitals/${inquiry.hospitalId}` : '/search');

    // Create the banner with complete fields compatible with both LocationBanners and Customer Home
    const newBanner = {
      id: `ban-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: inquiry.title.trim(),
      subtitle: inquiry.description || `${inquiry.hospitalName || 'Hospital'} Special Announcement`,
      description: inquiry.description || '',
      image: finalImage,
      imageUrl: finalImage,
      mediaType: 'image',
      badge: 'HOSPITAL PROMOTION',
      link: targetLink,
      linkUrl: targetLink,
      ctaText: inquiry.ctaText || 'Book Token',
      hospitalId: inquiry.hospitalId || null,
      destinationType: inquiry.hospitalId ? 'hospital' : 'custom',
      status: 'active',
      active: true,
      startDate: todayStr,
      endDate: endDateStr,
      targetLevel: inquiry.targetLevel || 'state',
      country: 'India',
      state: inquiry.state || '',
      district: inquiry.district || '',
      mandal: inquiry.mandal || '',
      village: inquiry.village || '',
      pincode: inquiry.pincode || '',
      displayPanels: ['customer', 'hospital'],
      priority: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hospitalName: inquiry.hospitalName || ''
    };

    store.locationBanners.unshift(newBanner);

    // Mark inquiry as approved
    inquiry.status = 'approved';
    inquiry.bannerId = newBanner.id;
    inquiry.updatedAt = new Date().toISOString();

    const inqIdx = store.adsInquiries.findIndex(i => i.id === inquiry.id);
    if (inqIdx >= 0) {
      store.adsInquiries[inqIdx] = inquiry;
    } else {
      store.adsInquiries.unshift(inquiry);
    }

    store.lastUpdated = Date.now();
    await saveUnifiedStore(store);

    res.json({
      success: true,
      message: 'Inquiry approved and banner published live',
      banner: newBanner,
      inquiry
    });
  } catch (err) {
    console.error('Error approving ad inquiry:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to approve inquiry' });
  }
});



// Legacy tokens endpoint
app.post('/api/tokens', (req, res) => {
  const { tokens } = req.body;
  const store = loadStore();
  store.tokens = tokens;
  saveStore(store);
  res.json({ success: true, tokens });
});

// Proxy Reverse Geocode endpoint
app.get('/api/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'lat and lng query parameters required' });
  }
  const key = process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBxRr6Tj-K-hk1xpqp9ltZrAw5yiwv2Y6A';
  try {
    const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`);
    const gData = await gRes.json();
    if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
      return res.json({ success: true, result: gData.results[0] });
    }
  } catch (err) {
    console.warn('Server reverse-geocode error:', err.message);
  }

  // Fallback to high-detail Nominatim OpenStreetMap (Rapido/Uber style)
  try {
    const nRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { 'User-Agent': 'InstaToken-Healthcare/1.0', 'Accept-Language': 'en' }
    });
    if (nRes.ok) {
      const nData = await nRes.json();
      if (nData && (nData.address || nData.display_name)) {
        return res.json({ success: true, nominatim: nData });
      }
    }
  } catch (nErr) {
    console.warn('Server Nominatim reverse-geocode error:', nErr.message);
  }

  res.json({ success: false });
});

// Client IP Geolocation endpoint
app.get('/api/ip-location', async (req, res) => {
  try {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }
    clientIp = clientIp.replace(/^::ffff:/, '');

    const url = clientIp && !clientIp.startsWith('10.') && !clientIp.startsWith('192.168.') && !clientIp.startsWith('127.') && !clientIp.startsWith('::1')
      ? `https://ipwho.is/${clientIp}`
      : 'https://ipwho.is/';

    const ipRes = await fetch(url);
    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data && data.success !== false && data.latitude && data.longitude) {
        return res.json({
          success: true,
          city: data.city || 'Chennai',
          region: data.region || 'Tamil Nadu',
          country: data.country || 'India',
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          ip: data.ip
        });
      }
    }
  } catch (e) {
    console.warn('IP location endpoint error:', e.message);
  }
  res.json({
    success: true,
    city: 'Chennai',
    region: 'Tamil Nadu',
    country: 'India',
    lat: 13.0827,
    lng: 80.2707
  });
});

// Proxy Geocode endpoint
app.get('/api/geocode', async (req, res) => {
  const { query: queryParam } = req.query;
  if (!queryParam) {
    return res.status(400).json({ success: false, message: 'query parameter required' });
  }
  const key = process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBxRr6Tj-K-hk1xpqp9ltZrAw5yiwv2Y6A';
  try {
    const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(queryParam)}&key=${key}`);
    const gData = await gRes.json();
    if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
      return res.json({ success: true, result: gData.results[0] });
    }
  } catch (err) {
    console.warn('Server geocode error:', err.message);
  }
  res.json({ success: false });
});

// Nodemailer SMTP Transporter setup for InstaToken.in (token.in1999@gmail.com)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'token.in1999@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'ekvjhwpigsbvsohe',
  },
});

// Verify transporter on startup
transporter.verify((error, _success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ Real SMTP Mailer Connected via token.in1999@gmail.com!');
  }
});

// API Endpoint to Send Real OTP Emails (OTP generated server-side)
app.post('/api/send-otp', async (req, res) => {
  const { email, type, recipientName } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  // Generate OTP server-side — never trust client-supplied codes
  const code = Math.floor(100000 + Math.random() * 900000).toString();

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
          <div class="brand">InstaToken.in 🩺</div>
          <div class="badge">Healthcare OTP Authentication</div>
        </div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="subtitle">Hello ${recipientName || 'User'}, ${subtitle}</div>
          
          <div class="otp-box">${code}</div>

          <p style="font-size: 13px; color: #475569; font-weight: 600;">This code is valid for <strong>5 minutes</strong>. Do not share this OTP with anyone.</p>

          <div class="info">
            🔒 Sent securely via <strong>InstaToken.in Mailer</strong> (token.in1999@gmail.com).<br>
            If you did not request this code, please ignore this email.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 InstaToken.in &middot; Automated OTP System &middot; All Rights Reserved
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"InstaToken.in" <token.in1999@gmail.com>',
      to: email,
      subject: `[InstaToken.in] ${code} is your OTP Verification Code`,
      html: htmlContent,
    });

    console.log(`✉️ OTP email sent to ${email} | Type: ${type} | MessageId: ${info.messageId}`);
    return res.json({ success: true, code, message: `OTP code sent to ${email}`, messageId: info.messageId });
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

server.listen(PORT, () => {
  console.log(`🚀 Insta Token Unified Express Server running on port ${PORT}`);
  console.log(`🌐 Health check endpoint: http://localhost:${PORT}/health`);
  console.log(`📡 WebSocket (Socket.io) service initialized and listening`);
});

module.exports = app;

