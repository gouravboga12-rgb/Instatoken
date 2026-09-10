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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
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

function ensureHospitalProfilesSynced(store) {
  if (!store || !store.hospitalProfiles) return;
  Object.entries(store.hospitalProfiles).forEach(([id, prof]) => {
    if (prof && (prof.address || prof.name)) {
      syncProfileToHospitalsList(store, id, prof);
    }
  });
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
        if (!store.locationBanners || !Array.isArray(store.locationBanners) || store.locationBanners.length === 0) {
          store.locationBanners = INITIAL_LOCATION_BANNERS;
        }

        // Seamlessly preserve any data saved during initial connection warmup
        const local = loadStore();
        if (local.locationBanners && Array.isArray(local.locationBanners)) {
          local.locationBanners.forEach(lb => {
            if (!store.locationBanners.some(sb => sb.id === lb.id)) {
              store.locationBanners.push(lb);
            }
          });
        }
        if (local.hospitalPatients) {
          Object.keys(local.hospitalPatients).forEach(hId => {
            store.hospitalPatients[hId] = store.hospitalPatients[hId] || [];
            (local.hospitalPatients[hId] || []).forEach(lp => {
              if (!store.hospitalPatients[hId].some(rp => rp.phone === lp.phone)) {
                store.hospitalPatients[hId].push(lp);
              }
            });
          });
        }
        if (local.tokens && Array.isArray(local.tokens)) {
          local.tokens.forEach(lt => {
            if (!store.tokens.some(rt => rt.id === lt.id)) {
              store.tokens.push(lt);
            }
          });
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
  saveStore(store);
  if (isDbConnected) {
    try {
      console.log('Saving unified store to RDS... Apollo addr:', store.hospitals?.find(h => h.id === 'hosp-apollo')?.address);
      const res = await query(
        `INSERT INTO sync_store (key, data, last_updated) 
         VALUES ('global_store', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET data = $1, last_updated = NOW() RETURNING key`,
        [JSON.stringify(store)]
      );
      console.log('Saved to RDS successfully:', res.rowCount);
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
  const { hospitals, hospitalDoctors, hospitalProfiles, hospitalDepartments, tokens, appointments } = req.body;

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

  // Protect hospitals list from stale mock data overwrites
  if (hospitals && Array.isArray(hospitals)) {
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
    });
    store.hospitals = hospitals;
  }

  if (hospitalDoctors) store.hospitalDoctors = { ...store.hospitalDoctors, ...hospitalDoctors };
  ensureHospitalProfilesSynced(store);

  if (hospitalDepartments) store.hospitalDepartments = { ...store.hospitalDepartments, ...hospitalDepartments };
  if (tokens) store.tokens = tokens.filter(t => !isDummyTokenRecord(t));
  if (appointments) store.appointments = appointments.filter(a => !isDummyApptRecord(a));

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
    const hospId = parts[1];
    const matched = DEFAULT_HOSPITAL_CREDENTIALS.find(c => c.hospitalId === hospId);
    if (matched) {
      session = {
        token: tokenStr,
        hospitalId: matched.hospitalId,
        hospitalName: matched.hospitalName,
        email: matched.email,
        role: matched.role,
        name: matched.name,
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

// POST /api/auth/hospital-login
app.post('/api/auth/hospital-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const store = await getUnifiedStore();
  const credentialsList = [
    ...DEFAULT_HOSPITAL_CREDENTIALS,
    ...(store.hospitalCredentials || [])
  ];

  const matched = credentialsList.find(c => c.email.toLowerCase() === email.toLowerCase() && c.password === password);
  if (!matched) {
    return res.status(401).json({ success: false, message: 'Invalid hospital credentials.' });
  }

  const session = generateSessionToken(matched);
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

// GET /api/auth/hospital-me
app.get('/api/auth/hospital-me', requireHospitalAuth, (req, res) => {
  res.json({ success: true, session: req.hospitalSession });
});

// ─── Hospitals List (Public for Patient booking) ──────────────────────────────
app.get('/api/hospitals', async (req, res) => {
  const store = await getUnifiedStore();
  res.json({ success: true, hospitals: store.hospitals, store });
});

// ─── Hospital Doctors (Phase 21 & 22) ────────────────────────────────────────
app.get('/api/hospitals/:id/doctors', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  const store = await getUnifiedStore();
  const doctors = store.hospitalDoctors?.[id] || [];
  res.json({ success: true, hospitalId: id, doctors });
});

app.post('/api/hospitals/:id/doctors', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  const { doctors } = req.body;
  const store = await getUnifiedStore();

  store.hospitalDoctors = store.hospitalDoctors || {};
  store.hospitalDoctors[id] = doctors;

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, doctors });
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

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, profile, hospitals: store.hospitals });
});

// ─── Hospital Departments (Phase 21 & 22) ────────────────────────────────────
app.get('/api/hospitals/:id/departments', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  const store = await getUnifiedStore();
  const departments = store.hospitalDepartments?.[id] || [];
  res.json({ success: true, hospitalId: id, departments });
});

app.post('/api/hospitals/:id/departments', requireHospitalAuth, async (req, res) => {
  const { id } = req.params;
  const { departments } = req.body;
  const store = await getUnifiedStore();

  store.hospitalDepartments = store.hospitalDepartments || {};
  store.hospitalDepartments[id] = departments;

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId: id, departments });
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
    const phoneKey = tok.patientPhone || tok.patientName;

    if (!patientMap.has(phoneKey)) {
      patientMap.set(phoneKey, {
        id: `pat-${hospitalId}-${phoneKey.replace(/\D/g, '') || Math.random().toString(36).substring(2, 7)}`,
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
    if (!patientMap.has(mp.phone)) {
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
      patientMap.set(mp.phone, {
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
    const notVisitedTokens = docTokens.filter(t => ['not-visited', 'skipped'].includes(t.status));
    const waitingTokens = docTokens.filter(t => ['booked', 'waiting', 'checked-in', 'in-cabin'].includes(t.status));
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
  await saveUnifiedStore(store);

  res.status(201).json({ success: true, hospitalId, token: newToken });
});

app.patch('/api/hospitals/:hospitalId/tokens/:tokenId/status', requireHospitalAuth, async (req, res) => {
  const { hospitalId, tokenId } = req.params;
  const { status } = req.body;
  const store = await getUnifiedStore();

  store.tokens = (store.tokens || []).map(t => {
    if (t.id === tokenId && (t.hospitalId || 'hosp-apollo') === hospitalId) {
      return {
        ...t,
        status,
        paymentStatus: status === 'cancelled' ? 'refunded' : status === 'completed' ? 'paid' : t.paymentStatus
      };
    }
    return t;
  });

  await saveUnifiedStore(store);
  res.json({ success: true, hospitalId, tokenId, status });
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

  // 1. Country level
  if (banner.targetLevel === 'country') {
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
    if (banner.displayPanels && Array.isArray(banner.displayPanels)) {
      if (!banner.displayPanels.includes(panel)) return false;
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
  const bannerData = req.body;
  const imageSource = bannerData.image || bannerData.imageUrl || bannerData.bannerImage;
  if (!bannerData.title || !imageSource) {
    return res.status(400).json({ success: false, message: 'Title and image are required' });
  }

  const store = await getUnifiedStore();
  store.locationBanners = store.locationBanners || [];

  const initialStatus = bannerData.status || (bannerData.active === false ? 'inactive' : 'active');
  const isBannerActive = initialStatus === 'active';

  const newBanner = {
    id: bannerData.id || `ban-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    title: bannerData.title.trim(),
    description: bannerData.description || '',
    image: imageSource.trim(),
    imageUrl: imageSource.trim(),
    badge: bannerData.badge || 'LOCAL HEALTH UPDATE',
    linkUrl: bannerData.linkUrl || '/search',
    ctaText: bannerData.ctaText || 'Book Token',
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
    displayPanels: bannerData.displayPanels || ['customer'],
    priority: Number(bannerData.priority) || 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.locationBanners.unshift(newBanner);
  await saveUnifiedStore(store);

  res.status(201).json({ success: true, message: 'Banner created successfully', banner: newBanner, id: newBanner.id });
});

// PUT /api/banners/:id - Update banner
app.put('/api/banners/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const store = await getUnifiedStore();

  store.locationBanners = store.locationBanners || [];
  const idx = store.locationBanners.findIndex(b => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Banner not found' });
  }

  const existing = store.locationBanners[idx];
  const imageSource = updateData.image || updateData.imageUrl || existing.imageUrl || existing.image;
  const nextStatus = updateData.status || (updateData.active !== undefined ? (updateData.active ? 'active' : 'inactive') : existing.status);

  store.locationBanners[idx] = {
    ...existing,
    ...updateData,
    id,
    image: imageSource,
    imageUrl: imageSource,
    status: nextStatus,
    active: nextStatus === 'active',
    updatedAt: new Date().toISOString()
  };

  await saveUnifiedStore(store);
  res.json({ success: true, message: 'Banner updated successfully', banner: store.locationBanners[idx], ...store.locationBanners[idx] });
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

  await saveUnifiedStore(store);
  res.json({ success: true, message: `Banner status set to ${nextStatus}`, banner: store.locationBanners[idx], active: store.locationBanners[idx].active, status: nextStatus });
});

// DELETE /api/banners/:id - Delete banner
app.delete('/api/banners/:id', async (req, res) => {
  const { id } = req.params;
  const store = await getUnifiedStore();

  store.locationBanners = (store.locationBanners || []).filter(b => b.id !== id);
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
  console.log(`🌐 Health check endpoint: http://localhost:${PORT}/health`);
});

module.exports = app;

