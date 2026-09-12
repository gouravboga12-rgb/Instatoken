require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// AWS & DB Integrations
const { query, testConnection } = require('./config/db');
const { generateUploadUrl, uploadFile, deleteFile } = require('./config/s3');

const app = express();
const PORT = process.env.PORT || 5000;

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
testConnection().then((connected) => {
  isDbConnected = connected;
  if (connected) {
    console.log('⚡ Active Data Layer: AWS RDS PostgreSQL');
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
  id: 'hosp-apollo', name: 'Apollo Spectra Hospital', logo: '', coverImage: '',
  registrationNumber: 'KA/HOS/2009/04521', accreditation: 'NABH Accredited',
  gstNumber: '29AABCA1234K1Z5', licenseNumber: 'KA-MED-2009-1234',
  type: 'Multi Speciality', ownershipType: 'Private',
  phone: '+91 80 4668 8888', whatsapp: '+91 98765 43210',
  email: 'info@apollospectra.com', website: 'www.apollospectra.com', emergencyNumber: '+91 80 4668 9999',
  country: 'India', state: 'Telangana', city: 'Hyderabad', area: 'Kothapet Pratap Nagar',
  address: '15-57/2, RAMkrishna Raju Residency, Pratap Nagar, Kothapet, Hyderabad, Telangana 500060, India', pinCode: '500060',
  lat: 17.37336200634615, lng: 78.53855589118986,
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
  { id: 'dept-eye', name: 'Ophthalmology', icon: '👁️', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-dental', name: 'Dental', icon: '🦷', headDoctor: '', totalDoctors: 0, active: true },
];

const INITIAL_HOSPITALS = [
  {
    id: "hosp-apollo",
    name: "Apollo Spectra Hospital",
    category: "Multi Speciality",
    rating: 4.8,
    reviewsCount: 1240,
    distance: 1.8,
    baseWaitingTime: 20,
    address: "15-57/2, RAMkrishna Raju Residency, Pratap Nagar, Kothapet, Hyderabad, Telangana 500060, India",
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
    about: "Apollo Spectra is a state-of-the-art multi-specialty hospital committed to bringing you the best clinical outcomes in a simplified, service-oriented environment.",
    facilities: ["24/7 Emergency", "ICU", "Pharmacy", "Ambulance", "Lab Testing", "Cafeteria"],
    contact: "+91 80 4668 8888",
    lat: 17.37336200634615,
    lng: 78.53855589118986
  },
  {
    id: "hosp-rainbow",
    name: "Rainbow Children's Hospital",
    category: "Children Hospital",
    rating: 4.7,
    reviewsCount: 932,
    distance: 3.2,
    baseWaitingTime: 15,
    address: "HSR Layout Sector 2, Bengaluru",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
    about: "Leading pediatric and maternal healthcare hospital with dedicated neonatal ICU and pediatric emergency services.",
    facilities: ["Pediatric ICU", "24/7 Emergency", "Pharmacy", "NICU", "Vaccination Center"],
    contact: "+91 80 4241 1234",
    lat: 12.9116,
    lng: 77.6474
  },
  {
    id: "hosp-fortis",
    name: "Fortis Hospital",
    category: "Cardiology",
    rating: 4.6,
    reviewsCount: 884,
    distance: 5.4,
    baseWaitingTime: 45,
    address: "Bannerghatta Road, Bengaluru",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80",
    about: "Comprehensive tertiary care hospital renowned for cardiology, cardiac surgery, and oncology excellence.",
    facilities: ["Cath Lab", "ICU", "Blood Bank", "24/7 Trauma", "MRI & CT Scan"],
    contact: "+91 80 6621 4444",
    lat: 12.8942,
    lng: 77.5986
  },
  {
    id: "hosp-nethra",
    name: "Narayana Nethralaya",
    category: "Eye Hospital",
    rating: 4.9,
    reviewsCount: 1650,
    distance: 4.1,
    baseWaitingTime: 35,
    address: "Indiranagar 100ft Road, Bengaluru",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80",
    about: "Premier super-specialty eye care hospital providing state-of-the-art diagnostic and surgical facilities.",
    facilities: ["Lasik Laser", "Retina Clinic", "Cornea Bank", "Pharmacy", "Optical Shop"],
    contact: "+91 80 6612 1618",
    lat: 12.9784,
    lng: 77.6408
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
app.get('/health', async (req, res) => {
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
    availability: d.availability || {
      days: Array.isArray(d.opdDays) && d.opdDays.length > 0 ? d.opdDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      slots: Array.isArray(d.sessions) && d.sessions.length > 0
        ? d.sessions.filter(s => s.active !== false).map(s => `${s.startTime} - ${s.endTime}`)
        : ['09:00 AM - 01:00 PM', '05:00 PM - 09:00 PM']
    },
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
      if (store.hospitalDepartments && store.hospitalDepartments[hosp.id] && store.hospitalDepartments[hosp.id].length > 0) {
        hosp.departments = mapHospitalDeptsToPublic(store.hospitalDepartments[hosp.id]);
      }
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

        // Merge live hospitals and profiles from PostgreSQL
        try {
          const hospRows = await query(`SELECT id, data FROM hospitals`);
          if (hospRows.rows.length > 0) {
            store.hospitals = store.hospitals || [];
            hospRows.rows.forEach(r => {
              if (r.data) {
                const idx = store.hospitals.findIndex(h => h.id === r.id);
                if (idx === -1) store.hospitals.push(r.data);
                else store.hospitals[idx] = { ...store.hospitals[idx], ...r.data };
              }
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
  if (!fileStore.hospitalProfiles || fileStore.hospitalProfiles['hosp-apollo']?.address === STALE_MOCK_APOLLO_ADDRESS) {
    fileStore.hospitalProfiles = { ...fileStore.hospitalProfiles, 'hosp-apollo': INITIAL_PROFILE };
  }
  ensureHospitalProfilesSynced(fileStore);
  return fileStore;
}

async function saveUnifiedStore(store) {
  ensureHospitalProfilesSynced(store);
  if (isDbConnected) {
    try {
      const res = await query(
        `INSERT INTO sync_store (key, data, last_updated) 
         VALUES ('global_store', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET data = $1, last_updated = NOW() RETURNING key`,
        [JSON.stringify(store)]
      );
    } catch (e) {
      console.error('Error syncing to RDS:', e.message);
    }
  } else {
    saveStore(store);
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
    };
    return res.json(isolatedStore);
  }

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
    about: profile.about,
    facilities: profile.facilities,
    image: profile.coverImage || profile.logo,
    gallery: profile.gallery || [],
    lat: profile.lat !== undefined ? Number(profile.lat) : undefined,
    lng: profile.lng !== undefined ? Number(profile.lng) : undefined
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
  const { hospitals, hospitalDoctors, hospitalProfiles, hospitalDepartments, tokens, appointments, customers } = req.body;

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
    hospitals.forEach(incomingHosp => {
      if (!incomingHosp || !incomingHosp.id) return;
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
  { hospitalId: 'hosp-apollo', email: 'admin@apollo.com', password: 'password', role: 'owner', name: 'Dr. Rajesh Kumar', hospitalName: 'Apollo Spectra Hospital' },
  { hospitalId: 'hosp-apollo', email: 'apollo@hospital.com', password: 'password123', role: 'owner', name: 'Dr. Rajesh Kumar', hospitalName: 'Apollo Spectra Hospital' },
  { hospitalId: 'hosp-rainbow', email: 'admin@rainbow.com', password: 'password', role: 'owner', name: 'Dr. Ramesh Babu', hospitalName: "Rainbow Children's Hospital" },
  { hospitalId: 'hosp-fortis', email: 'admin@fortis.com', password: 'password', role: 'owner', name: 'Dr. Sanjay Sharma', hospitalName: 'Fortis Hospital' },
  { hospitalId: 'hosp-fortis', email: 'fortis@hospital.com', password: 'password123', role: 'owner', name: 'Dr. Sanjay Sharma', hospitalName: 'Fortis Hospital' },
  { hospitalId: 'hosp-nethra', email: 'admin@nethra.com', password: 'password', role: 'owner', name: 'Dr. Bhujang Shetty', hospitalName: 'Narayana Nethralaya' },
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

  // Auto-accept default demo token pattern if restarted
  if (!session && tokenStr.startsWith('htok_')) {
    const parts = tokenStr.split('_');
    const hospId = parts[1] || 'hosp-apollo';
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

  if (activeCred.password !== password) {
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
  const { name, email, password, phone, city, address, category, registrationNumber } = req.body;
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
    ...INITIAL_PROFILE,
    id: newHospitalId,
    name,
    email,
    phone: phone || '',
    city: city || 'Bengaluru',
    address: address || '',
    type: category || 'Multi Speciality',
    registrationNumber: registrationNumber || `REG-${Date.now()}`
  };

  store.hospitalProfiles = store.hospitalProfiles || {};
  store.hospitalProfiles[newHospitalId] = newProfile;
  syncProfileToHospitalsList(store, newHospitalId, newProfile);

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

    // 2. Remove associated profiles, doctors, depts, schedules
    if (store.hospitalProfiles) delete store.hospitalProfiles[id];
    if (store.hospitalDoctors) delete store.hospitalDoctors[id];
    if (store.hospitalDepartments) delete store.hospitalDepartments[id];
    if (store.hospitalSchedules) delete store.hospitalSchedules[id];
    if (store.hospitalStaff) delete store.hospitalStaff[id];
    if (store.hospitalPatients) delete store.hospitalPatients[id];

    // 3. Purge from relational PostgreSQL tables if connected
    if (isDbConnected) {
      try {
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
    console.log(`✅ Permanently deleted hospital ${id} from AWS RDS`);
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
          try { extra = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {}); } catch(e){}
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
          try { extra = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {}); } catch(e){}
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
    departments = store.hospitalDepartments?.[id] || (id === 'hosp-apollo' ? INITIAL_DEPARTMENTS : []);
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
           ON CONFLICT (id) DO UPDATE SET name = $3, icon = $4, active = $7, data = $8`,
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

  // 1. Gather all tokens and bookings belonging exclusively to this hospital
  const allHospitalTokens = [
    ...(store.tokens || []).filter(t => (t.hospitalId || 'hosp-apollo') === hospitalId && !isDummyTokenRecord(t)),
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
      session: parseInt((a.time || '09:00').split(':')[0], 10) < 12 ? 'morning' : 'evening',
      time: a.time,
      bookingDate: a.date,
      status: a.status,
      consultationFee: a.fee,
      paymentStatus: a.status === 'cancelled' ? 'refunded' : 'paid',
      paymentMethod: a.paymentMethod || 'Online',
      hospitalId
    }))
  ];

  // 2. Build unique patient map from actual bookings & tokens
  const patientMap = new Map();

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
        city: store.hospitalProfiles?.[hospitalId]?.city || 'Bengaluru',
        pinCode: store.hospitalProfiles?.[hospitalId]?.pinCode || '',
        registeredOn: tok.bookingDate || new Date().toISOString().split('T')[0],
        totalVisits: 0,
        lastVisit: tok.bookingDate || '',
        doctorVisits: new Map(), // doctorId -> { doctorId, doctorName, departmentName, visitCount, lastVisitDate }
        tokenHistory: []
      });
    }

    const p = patientMap.get(phoneKey);
    p.totalVisits += 1;
    if (!p.lastVisit || new Date(tok.bookingDate) > new Date(p.lastVisit)) {
      p.lastVisit = tok.bookingDate;
    }

    // Connect Doctor Relationship
    if (tok.doctorId) {
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
    }

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
  });

  // Also include manually registered hospital patients
  const manualPatients = store.hospitalPatients?.[hospitalId] || [];
  manualPatients.forEach(mp => {
    const cleanDigits = (mp.phone || '').replace(/\D/g, '').slice(-10);
    const phoneKey = cleanDigits || (mp.name || '').trim().toLowerCase();
    if (!patientMap.has(phoneKey)) {
      const docMap = new Map();
      if (Array.isArray(mp.doctorVisits)) {
        mp.doctorVisits.forEach(v => docMap.set(v.doctorId, v));
      } else if (mp.doctorId) {
        docMap.set(mp.doctorId, {
          doctorId: mp.doctorId,
          doctorName: mp.doctorName || 'Attending Doctor',
          departmentName: mp.departmentName || 'General Medicine',
          visitCount: 1,
          lastVisitDate: mp.registeredOn || new Date().toISOString().split('T')[0]
        });
      }
      patientMap.set(phoneKey, {
        ...mp,
        hospitalId,
        doctorVisits: docMap,
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
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.uhid.toLowerCase().includes(q) ||
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

  const existingIdx = store.hospitalPatients[hospitalId].findIndex(p => p.phone === patientData.phone);
  if (existingIdx >= 0) {
    store.hospitalPatients[hospitalId][existingIdx] = {
      ...store.hospitalPatients[hospitalId][existingIdx],
      ...patientData,
      hospitalId
    };
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
    const newPat = {
      ...patientData,
      id: `pat-${Date.now()}`,
      uhid: patientData.uhid || `APS${String(store.hospitalPatients[hospitalId].length + 1001).padStart(6, '0')}`,
      hospitalId,
      registeredOn: new Date().toISOString().split('T')[0],
      totalVisits: patientData.totalVisits || 1,
      lastVisit: patientData.lastVisit || new Date().toISOString().split('T')[0],
      doctorVisits: initialDocVisits,
      tokenHistory: patientData.tokenHistory || []
    };
    store.hospitalPatients[hospitalId].unshift(newPat);
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId, message: 'Patient record saved successfully' });
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
    const { id, name, phone, email, location, lat, lng, familyMembers, savedDoctors, savedHospitals, subscription, oldPhone, oldEmail } = req.body;
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

    const updatedCustomer = {
      id: existing?.id || id || `cust-${Date.now()}`,
      name: (name || existing?.name || 'Patient').trim(),
      phone: (phone || existing?.phone || '').trim(),
      email: (email || existing?.email || '').trim(),
      location: location !== undefined ? location : (existing?.location || 'Hyderabad, Telangana'),
      lat: lat !== undefined ? Number(lat) : existing?.lat,
      lng: lng !== undefined ? Number(lng) : existing?.lng,
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
      bookings: existing?.bookings || []
    };

    if (idx !== -1) {
      store.customers[idx] = updatedCustomer;
    } else {
      store.customers.unshift(updatedCustomer);
    }

    await saveUnifiedStore(store);
    console.log(`✅ Saved customer profile to AWS RDS: ${updatedCustomer.name} (${updatedCustomer.phone})`);
    res.json({ success: true, customer: updatedCustomer, message: 'Customer profile saved to AWS RDS' });
  } catch (err) {
    console.error('Error saving customer profile in AWS RDS:', err);
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

// DELETE /api/customers/:id - Delete Customer Account (Admin)
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getUnifiedStore();
    store.customers = (store.customers || []).filter(c => c.id !== id);
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

  // Hospital tokens filtered by date
  const hospitalTokens = [
    ...(store.tokens || []).filter(t => (t.hospitalId || 'hosp-apollo') === hospitalId && !isDummyTokenRecord(t)),
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
  ].filter(t => isDateInRange(t.bookingDate));

  // Hospital doctors (including any active doctors assigned in tokens/bookings)
  const baseDoctors = store.hospitalDoctors?.[hospitalId] || INITIAL_DOCTORS;
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
        `SELECT data FROM tokens WHERE hospital_id = $1 ORDER BY created_at DESC`,
        [hospitalId]
      );
      if (dbTokens.rows.length > 0) {
        dbTokens.rows.forEach(r => {
          if (r.data && !isDummyTokenRecord(r.data)) {
            const idx = tokens.findIndex(t => t.id === r.data.id);
            if (idx === -1) {
              tokens.push(r.data);
            } else {
              tokens[idx] = { ...tokens[idx], ...r.data };
            }
          }
        });
      }
    } catch (dbErr) {
      console.warn('Error fetching tokens from RDS:', dbErr.message);
    }
  }

  if (doctorId && doctorId !== 'all') tokens = tokens.filter(t => t.doctorId === doctorId);
  if (session && session !== 'all') tokens = tokens.filter(t => t.session === session);
  if (status && status !== 'all') tokens = tokens.filter(t => t.status === status);
  if (date) tokens = tokens.filter(t => t.bookingDate === date);
  if (type && type !== 'all') tokens = tokens.filter(t => t.type === type);

  res.json({ success: true, hospitalId, total: tokens.length, tokens });
});

app.post('/api/hospitals/:hospitalId/tokens', requireHospitalAuth, async (req, res) => {
  const { hospitalId } = req.params;
  const tokenData = req.body;
  const store = await getUnifiedStore();

  store.tokens = store.tokens || [];
  const newToken = {
    ...tokenData,
    id: tokenData.id || `tok-${Date.now()}`,
    hospitalId
  };

  store.tokens.unshift(newToken);

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
  res.status(201).json({ success: true, hospitalId, token: newToken });
});

app.patch('/api/hospitals/:hospitalId/tokens/:tokenId/status', requireHospitalAuth, async (req, res) => {
  const { hospitalId, tokenId } = req.params;
  const { status } = req.body;
  const store = await getUnifiedStore();

  let targetToken = null;
  store.tokens = (store.tokens || []).map(t => {
    if (t.id === tokenId) {
      targetToken = {
        ...t,
        status,
        paymentStatus: status === 'cancelled' ? 'refunded' : status === 'completed' ? 'paid' : t.paymentStatus
      };
      return targetToken;
    }
    return t;
  });

  if (isDbConnected) {
    try {
      if (targetToken) {
        await query(
          `UPDATE tokens SET status = $1, data = $2, updated_at = NOW() WHERE id = $3`,
          [status, JSON.stringify(targetToken), tokenId]
        );
      } else {
        await query(
          `UPDATE tokens SET status = $1, updated_at = NOW() WHERE id = $2`,
          [status, tokenId]
        );
      }
      await query(
        `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, tokenId]
      );
    } catch (dbErr) {
      console.error('Error updating token status in AWS RDS:', dbErr.message);
    }
  }

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId, tokenId, status, token: targetToken });
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
  const appt = req.body;
  if (!appt || !appt.id) {
    return res.status(400).json({ success: false, message: 'Invalid appointment payload' });
  }

  const store = await getUnifiedStore();
  store.appointments = store.appointments || [];
  store.appointments = [appt, ...store.appointments.filter(a => a.id !== appt.id)];

  const tokenRecord = {
    id: appt.id,
    tokenNo: appt.tokenNumber,
    tokenNumber: appt.tokenNumber,
    type: 'online',
    patientName: appt.patientName,
    patientPhone: appt.phone,
    patientAge: appt.age,
    patientGender: appt.gender,
    doctorId: appt.doctorId,
    doctorName: appt.doctorName,
    departmentName: appt.departmentName,
    session: (appt.time && parseInt(appt.time.split(':')[0], 10) >= 12 && parseInt(appt.time.split(':')[0], 10) < 17) ? 'afternoon' : (appt.time && parseInt(appt.time.split(':')[0], 10) >= 17) ? 'evening' : 'morning',
    time: appt.time,
    bookingDate: appt.date || new Date().toISOString().split('T')[0],
    status: appt.status || 'booked',
    estimatedWait: appt.estimatedWaitTime || 15,
    consultationFee: appt.fee || 500,
    platformFee: appt.platformFee || 25,
    totalFee: appt.totalFee || 525,
    paymentStatus: 'paid',
    paymentMethod: appt.paymentMethod || 'Online',
    paymentId: appt.paymentId,
    hospitalId: appt.hospitalId,
    hospitalName: appt.hospitalName,
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
  res.status(201).json({ success: true, appointment: appt, token: tokenRecord });
});

// GET appointment by ID
app.get('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT data FROM appointments WHERE id = $1`, [id]);
      if (dbRes.rows.length > 0 && dbRes.rows[0].data) {
        return res.json({ success: true, appointment: dbRes.rows[0].data });
      }

      const tokRes = await query(`SELECT data FROM tokens WHERE id = $1`, [id]);
      if (tokRes.rows.length > 0 && tokRes.rows[0].data) {
        const tok = tokRes.rows[0].data;
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
          totalFee: (tok.consultationFee || 500) + (tok.platformFee || 25),
          status: tok.status || 'booked',
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

// GET all appointments
app.get('/api/appointments', async (req, res) => {
  if (isDbConnected) {
    try {
      const dbRes = await query(`SELECT data FROM appointments ORDER BY created_at DESC`);
      if (dbRes.rows.length > 0) {
        const appts = dbRes.rows.map(r => r.data).filter(Boolean);
        return res.json({ success: true, appointments: appts });
      }
    } catch (err) {
      console.warn('Error querying appointments:', err.message);
    }
  }

  const store = await getUnifiedStore();
  res.json({ success: true, appointments: store.appointments || [] });
});

// GET Super Admin Revenue Tracking
app.get('/api/admin/revenue', async (req, res) => {
  const { dateFilter, hospitalId } = req.query;
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
        totalFee: (t.consultationFee || 500) + (t.platformFee || 25),
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

  const todayStr = new Date().toISOString().split('T')[0];
  if (dateFilter === 'today') {
    transactions = transactions.filter(t => (t.date === todayStr || (t.createdAt && t.createdAt.startsWith(todayStr))));
  } else if (dateFilter === 'month') {
    const curMonth = todayStr.slice(0, 7);
    transactions = transactions.filter(t => (t.date?.startsWith(curMonth) || (t.createdAt && t.createdAt.startsWith(curMonth))));
  }

  const totalGrossRevenue = transactions.reduce((sum, t) => sum + (Number(t.totalFee) || (Number(t.fee) || 0) + (Number(t.platformFee) || 25)), 0);
  const totalPlatformFees = transactions.reduce((sum, t) => sum + (Number(t.platformFee) || Math.max(10, Math.round((Number(t.fee) || 500) * 0.05))), 0);
  const totalDoctorFees = transactions.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);

  res.json({
    success: true,
    summary: {
      totalTransactions: transactions.length,
      totalGrossRevenue,
      totalPlatformFees,
      totalDoctorFees,
      platformFeePercent: 5
    },
    transactions
  });
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
app.use('/uploads', express.static(uploadsDir));

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
      const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
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

  store.locationBanners = (store.locationBanners || []).filter(b => b.id !== id);
  store.lastUpdated = Date.now();
  await saveUnifiedStore(store);

  res.json({ success: true, message: 'Banner deleted successfully', deletedId: id });
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
  res.json({ success: false });
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
transporter.verify((error, success) => {
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

app.listen(PORT, () => {
  console.log(`🚀 Insta Token Unified Express Server running on port ${PORT}`);
  console.log(`🌐 Health check endpoint: http://localhost:${PORT}/health`);
});

module.exports = app;

