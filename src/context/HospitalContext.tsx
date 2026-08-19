import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApp } from './AppContext';
import type { Doctor } from '../utils/mockData';
import { broadcastGlobalSync, subscribeGlobalSync } from '../utils/syncBus';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HospitalRole = 'owner' | 'admin' | 'receptionist' | 'doctor' | 'accountant' | 'nurse';

export interface HospitalUser {
  id: string;
  name: string;
  email: string;
  role: HospitalRole;
  hospitalId: string;
  hospitalName: string;
  avatar: string;
  isOnline: boolean;
}

export interface HospitalDepartment {
  id: string;
  name: string;
  icon: string;
  headDoctor: string;
  totalDoctors: number;
  active: boolean;
}

export interface HospitalDoctor {
  id: string;
  name: string;
  photo: string;
  qualification: string;
  specialization: string;
  departmentId: string;
  departmentName: string;
  experience: number;
  consultationFee: number;
  languages: string[];
  gender: string;
  biography: string;
  opdDays: string[];
  opdStartTime: string;
  opdEndTime: string;
  consultationDuration: number; // minutes
  maxTokensPerDay: number;
  onlineConsult: boolean;
  offlineConsult: boolean;
  active: boolean;
  rating: number;
  totalPatients: number;
}

export interface TokenRecord {
  id: string;
  tokenNo: number;
  type: 'online' | 'offline';
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  doctorId: string;
  doctorName: string;
  departmentId: string;
  departmentName: string;
  session: 'morning' | 'afternoon' | 'evening';
  time: string;
  bookingDate: string;
  status: 'booked' | 'checked-in' | 'completed' | 'cancelled' | 'waiting' | 'skipped';
  queuePosition: number;
  estimatedWait: number; // minutes
  consultationFee: number;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  paymentMethod: string;
  isRevisit: boolean;
  revisitValidUpto?: string;
  notes?: string;
}

export interface PatientRecord {
  id: string;
  uhid: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: string;
  bloodGroup: string;
  address: string;
  city: string;
  pinCode: string;
  registeredOn: string;
  totalVisits: number;
  lastVisit: string;
  familyMembers: { name: string; relation: string; age: number }[];
  medicalHistory: string[];
  allergies: string[];
  tokenHistory: string[]; // token IDs
}

export interface SessionConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxTokens: number;
  consultationDuration: number;
  breakTime: number;
  active: boolean;
}

export interface ScheduleConfig {
  sessions: SessionConfig[];
  bookingOpensDaysBefore: number;
  advanceBookingLimit: number;
  bufferTime: number;
  dailyTokenLimit: number;
  walkInPercentage: number;
  onlinePercentage: number;
  emergencySlots: number;
  autoContinuity: boolean;
}

export interface NotificationMessage {
  id: string;
  type: 'push' | 'sms' | 'whatsapp' | 'email';
  recipient: string;
  message: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
}

export interface HospitalProfile {
  id: string;
  name: string;
  logo: string;
  coverImage: string;
  registrationNumber: string;
  accreditation: string;
  gstNumber: string;
  licenseNumber: string;
  type: string;
  ownershipType: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  emergencyNumber: string;
  country: string;
  state: string;
  city: string;
  area: string;
  address: string;
  pinCode: string;
  lat: number;
  lng: number;
  about: string;
  mission: string;
  vision: string;
  facilities: string[];
  emergencyServices: string[];
  gallery: string[];
  timings: { day: string; open: string; close: string }[];
  brandColor: string;
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface HospitalContextType {
  hospitalUser: HospitalUser | null;
  hospitalProfile: HospitalProfile | null;
  departments: HospitalDepartment[];
  doctors: HospitalDoctor[];
  tokens: TokenRecord[];
  patients: PatientRecord[];
  scheduleConfig: ScheduleConfig;
  notifications: NotificationMessage[];
  activeSection: string;
  sidebarCollapsed: boolean;

  // Auth
  hospitalLogin: (email: string, password: string) => { success: boolean; message: string };
  hospitalLogout: () => void;

  // Navigation
  setActiveSection: (section: string) => void;
  setSidebarCollapsed: (v: boolean) => void;

  // Doctors
  addDoctor: (doc: Omit<HospitalDoctor, 'id' | 'totalPatients' | 'rating'>) => void;
  updateDoctor: (id: string, updates: Partial<HospitalDoctor>) => void;
  deleteDoctor: (id: string) => void;
  toggleDoctorActive: (id: string) => void;

  // Departments
  addDepartment: (dept: Omit<HospitalDepartment, 'id'>) => void;
  updateDepartment: (id: string, updates: Partial<HospitalDepartment>) => void;
  deleteDepartment: (id: string) => void;
  toggleDepartmentActive: (id: string) => void;

  // Tokens
  generateWalkInToken: (form: {
    patientName: string; patientPhone: string; patientAge: number;
    patientGender: string; address: string; departmentId: string;
    doctorId: string; session: 'morning' | 'afternoon' | 'evening';
  }) => TokenRecord;
  updateTokenStatus: (id: string, status: TokenRecord['status']) => void;
  cancelToken: (id: string) => void;

  // Patients
  addPatient: (p: Omit<PatientRecord, 'id' | 'uhid' | 'registeredOn' | 'totalVisits' | 'lastVisit' | 'tokenHistory'>) => void;
  updatePatient: (id: string, updates: Partial<PatientRecord>) => void;
  searchPatients: (query: string) => PatientRecord[];
  validateToken: (tokenNo: number) => TokenRecord | null;

  // Schedule
  updateScheduleConfig: (config: Partial<ScheduleConfig>) => void;
  updateSession: (id: string, updates: Partial<SessionConfig>) => void;

  // Notifications
  sendNotification: (msg: Omit<NotificationMessage, 'id' | 'sentAt' | 'status'>) => void;

  // Profile
  updateHospitalProfile: (updates: Partial<HospitalProfile>) => void;
}

// ─── Mock credentials ─────────────────────────────────────────────────────────

const MOCK_CREDENTIALS = [
  { email: 'admin@apollo.com', password: 'password', userId: 'huser-1' },
];

const MOCK_USERS: HospitalUser[] = [
  { id: 'huser-1', name: 'Dr. Rajesh Kumar', email: 'admin@apollo.com', role: 'owner', hospitalId: 'hosp-apollo', hospitalName: 'Apollo Spectra Hospital', avatar: '', isOnline: true },
];


// ─── Initial Mock Data ────────────────────────────────────────────────────────

const INITIAL_PROFILE: HospitalProfile = {
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

const INITIAL_DEPARTMENTS: HospitalDepartment[] = [
  { id: 'dept-cardio', name: 'Cardiology', icon: '❤️', headDoctor: 'Dr. Arvind Sharma', totalDoctors: 2, active: true },
  { id: 'dept-neuro', name: 'Neurology', icon: '🧠', headDoctor: 'Dr. Sarah Jenkins', totalDoctors: 1, active: true },
  { id: 'dept-ortho', name: 'Orthopedics', icon: '🦴', headDoctor: 'Dr. Ramesh Patel', totalDoctors: 2, active: true },
  { id: 'dept-pedia', name: 'Pediatrics', icon: '👶', headDoctor: 'Dr. Anjali Sharma', totalDoctors: 1, active: true },
  { id: 'dept-gynaec', name: 'Gynecology', icon: '🌸', headDoctor: 'Dr. Meera Nair', totalDoctors: 1, active: true },
  { id: 'dept-general', name: 'General Medicine', icon: '🩺', headDoctor: 'Dr. Vivek Singh', totalDoctors: 3, active: true },
  { id: 'dept-eye', name: 'Ophthalmology', icon: '👁️', headDoctor: '', totalDoctors: 0, active: false },
  { id: 'dept-dental', name: 'Dental', icon: '🦷', headDoctor: '', totalDoctors: 0, active: false },
];

const INITIAL_DOCTORS: HospitalDoctor[] = [
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

const generateTokens = (): TokenRecord[] => {
  const today = new Date().toISOString().split('T')[0];
  const base = [
    { tokenNo: 101, type: 'online' as const, name: 'Rahul Kumar', phone: '9876543210', age: 28, gender: 'M', docId: 'doc-arvind', docName: 'Dr. Arvind Sharma', deptId: 'dept-cardio', deptName: 'Cardiology', session: 'morning' as const, time: '09:15 AM', status: 'booked' as const, fee: 800 },
    { tokenNo: 102, type: 'online' as const, name: 'Priya Sharma', phone: '9123456780', age: 32, gender: 'F', docId: 'doc-anjali', docName: 'Dr. Anjali Sharma', deptId: 'dept-pedia', deptName: 'Pediatrics', session: 'morning' as const, time: '09:20 AM', status: 'booked' as const, fee: 700 },
    { tokenNo: 103, type: 'offline' as const, name: 'Mohan Reddy', phone: '9988776655', age: 45, gender: 'M', docId: 'doc-vivek', docName: 'Dr. Vivek Singh', deptId: 'dept-ortho', deptName: 'Orthopedics', session: 'morning' as const, time: '09:25 AM', status: 'checked-in' as const, fee: 600 },
    { tokenNo: 104, type: 'online' as const, name: 'Ananya Patel', phone: '9072345678', age: 19, gender: 'F', docId: 'doc-arvind', docName: 'Dr. Arvind Sharma', deptId: 'dept-cardio', deptName: 'Cardiology', session: 'afternoon' as const, time: '01:10 PM', status: 'booked' as const, fee: 800 },
    { tokenNo: 105, type: 'offline' as const, name: 'Ramesh Kumar', phone: '8859001122', age: 50, gender: 'M', docId: 'doc-anjali', docName: 'Dr. Anjali Sharma', deptId: 'dept-pedia', deptName: 'Pediatrics', session: 'afternoon' as const, time: '01:30 PM', status: 'waiting' as const, fee: 700 },
    { tokenNo: 106, type: 'online' as const, name: 'Neha Singh', phone: '9123998871', age: 27, gender: 'F', docId: 'doc-vivek', docName: 'Dr. Vivek Singh', deptId: 'dept-ortho', deptName: 'Orthopedics', session: 'evening' as const, time: '05:05 PM', status: 'booked' as const, fee: 600 },
    { tokenNo: 107, type: 'offline' as const, name: 'Mohan Das', phone: '7776889991', age: 60, gender: 'M', docId: 'doc-arvind', docName: 'Dr. Arvind Sharma', deptId: 'dept-cardio', deptName: 'Cardiology', session: 'evening' as const, time: '05:30 PM', status: 'waiting' as const, fee: 800 },
    { tokenNo: 98, type: 'online' as const, name: 'Lakshmi Devi', phone: '9988001122', age: 42, gender: 'F', docId: 'doc-sarah', docName: 'Dr. Sarah Jenkins', deptId: 'dept-neuro', deptName: 'Neurology', session: 'morning' as const, time: '09:00 AM', status: 'completed' as const, fee: 1000 },
    { tokenNo: 99, type: 'offline' as const, name: 'Suresh Reddy', phone: '9871234567', age: 38, gender: 'M', docId: 'doc-ramesh', docName: 'Dr. Ramesh Patel', deptId: 'dept-ortho', deptName: 'Orthopedics', session: 'morning' as const, time: '09:30 AM', status: 'completed' as const, fee: 900 },
    { tokenNo: 100, type: 'online' as const, name: 'Kavitha Rao', phone: '9900112233', age: 29, gender: 'F', docId: 'doc-anjali', docName: 'Dr. Anjali Sharma', deptId: 'dept-pedia', deptName: 'Pediatrics', session: 'morning' as const, time: '09:00 AM', status: 'completed' as const, fee: 700 },
    { tokenNo: 108, type: 'offline' as const, name: 'Arun Verma', phone: '9812345670', age: 34, gender: 'M', docId: 'doc-vivek', docName: 'Dr. Vivek Singh', deptId: 'dept-ortho', deptName: 'Orthopedics', session: 'morning' as const, time: '10:15 AM', status: 'cancelled' as const, fee: 600 },
  ];
  return base.map((t, i) => ({
    id: `tok-${t.tokenNo}`,
    tokenNo: t.tokenNo, type: t.type,
    patientName: t.name, patientPhone: t.phone, patientAge: t.age, patientGender: t.gender,
    doctorId: t.docId, doctorName: t.docName, departmentId: t.deptId, departmentName: t.deptName,
    session: t.session, time: t.time, bookingDate: today, status: t.status,
    queuePosition: i + 1, estimatedWait: (i + 1) * 12,
    consultationFee: t.fee, paymentStatus: t.status === 'cancelled' ? 'refunded' : t.type === 'online' ? 'paid' : 'pending',
    paymentMethod: t.type === 'online' ? 'Online' : 'Cash',
    isRevisit: t.tokenNo === 101, revisitValidUpto: t.tokenNo === 101 ? '2026-07-25' : undefined,
  }));
};

const INITIAL_PATIENTS: PatientRecord[] = [
  { id: 'pat-1', uhid: 'APS001234', name: 'Rahul Kumar', phone: '9876543210', email: 'rahul@email.com', age: 28, gender: 'Male', bloodGroup: 'B+', address: '12, MG Road', city: 'Bengaluru', pinCode: '560001', registeredOn: '2024-01-15', totalVisits: 4, lastVisit: '2026-07-15', familyMembers: [{ name: 'Sunita Kumar', relation: 'Wife', age: 26 }], medicalHistory: ['Hypertension', 'Diabetes Type 2'], allergies: ['Penicillin'], tokenHistory: ['tok-101'] },
  { id: 'pat-2', uhid: 'APS001235', name: 'Priya Sharma', phone: '9123456780', email: 'priya@email.com', age: 32, gender: 'Female', bloodGroup: 'A+', address: '45, HSR Layout', city: 'Bengaluru', pinCode: '560102', registeredOn: '2024-03-20', totalVisits: 2, lastVisit: '2026-07-10', familyMembers: [], medicalHistory: ['Asthma'], allergies: [], tokenHistory: ['tok-102'] },
  { id: 'pat-3', uhid: 'APS001236', name: 'Mohan Reddy', phone: '9988776655', email: '', age: 45, gender: 'Male', bloodGroup: 'O+', address: '78, Koramangala', city: 'Bengaluru', pinCode: '560034', registeredOn: '2023-11-10', totalVisits: 7, lastVisit: '2026-07-17', familyMembers: [{ name: 'Lakshmi Reddy', relation: 'Wife', age: 42 }, { name: 'Ravi Reddy', relation: 'Son', age: 18 }], medicalHistory: ['Knee Osteoarthritis', 'Hypertension'], allergies: ['Aspirin'], tokenHistory: ['tok-103'] },
  { id: 'pat-4', uhid: 'APS001237', name: 'Ananya Patel', phone: '9072345678', email: 'ananya@email.com', age: 19, gender: 'Female', bloodGroup: 'AB+', address: '23, Indiranagar', city: 'Bengaluru', pinCode: '560038', registeredOn: '2026-05-01', totalVisits: 1, lastVisit: '2026-07-17', familyMembers: [], medicalHistory: [], allergies: [], tokenHistory: ['tok-104'] },
  { id: 'pat-5', uhid: 'APS001238', name: 'Ramesh Kumar', phone: '8859001122', email: '', age: 50, gender: 'Male', bloodGroup: 'B-', address: '99, JP Nagar', city: 'Bengaluru', pinCode: '560078', registeredOn: '2023-06-15', totalVisits: 12, lastVisit: '2026-07-17', familyMembers: [], medicalHistory: ['Type 1 Diabetes', 'Retinopathy'], allergies: [], tokenHistory: ['tok-105'] },
];

const INITIAL_SCHEDULE: ScheduleConfig = {
  sessions: [
    { id: 'sess-morning', name: 'Morning', startTime: '09:00 AM', endTime: '01:00 PM', maxTokens: 50, consultationDuration: 12, breakTime: 5, active: true },
    { id: 'sess-afternoon', name: 'Afternoon', startTime: '01:00 PM', endTime: '05:00 PM', maxTokens: 50, consultationDuration: 12, breakTime: 5, active: true },
    { id: 'sess-evening', name: 'Evening', startTime: '05:00 PM', endTime: '09:00 PM', maxTokens: 50, consultationDuration: 12, breakTime: 5, active: true },
  ],
  bookingOpensDaysBefore: 3,
  advanceBookingLimit: 7,
  bufferTime: 15,
  dailyTokenLimit: 150,
  walkInPercentage: 30,
  onlinePercentage: 70,
  emergencySlots: 5,
  autoContinuity: true,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export const useHospital = () => {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error('useHospital must be used within HospitalProvider');
  return ctx;
};

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { updateHospital, updateHospitalDoctors, updateHospitalDepartments } = useApp();

  const [hospitalUser, setHospitalUser] = useState<HospitalUser | null>(MOCK_USERS[0]);

  const [hospitalProfile, setHospitalProfile] = useState<HospitalProfile>(() => {
    const saved = localStorage.getItem('insta_hospital_profile');
    return saved ? JSON.parse(saved) : INITIAL_PROFILE;
  });

  const [departments, setDepartments] = useState<HospitalDepartment[]>(() => {
    const saved = localStorage.getItem('insta_hospital_departments');
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [doctors, setDoctors] = useState<HospitalDoctor[]>(() => {
    const saved = localStorage.getItem('insta_hospital_doctors');
    return saved ? JSON.parse(saved) : INITIAL_DOCTORS;
  });

  const [tokens, setTokens] = useState<TokenRecord[]>(() => {
    const saved = localStorage.getItem('insta_hospital_tokens');
    return saved ? JSON.parse(saved) : generateTokens();
  });

  const [patients, setPatients] = useState<PatientRecord[]>(() => {
    const saved = localStorage.getItem('insta_hospital_patients');
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });

  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(() => {
    const saved = localStorage.getItem('insta_hospital_schedule');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
  });

  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const targetHospId = hospitalProfile?.id || hospitalUser?.hospitalId || 'hosp-apollo';

  // ─── Cross-tab & Real-time Global Sync ─────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeGlobalSync((event) => {
      if (event.type === 'TOKEN_BOOKED' && event.data?.appointment) {
        const appt = event.data.appointment;
        setTokens(prev => {
          if (prev.some(t => t.id === appt.id)) return prev;
          const newTok: TokenRecord = {
            id: appt.id,
            tokenNo: appt.tokenNumber,
            type: 'online',
            patientName: appt.patientName,
            patientPhone: appt.phone,
            patientAge: appt.age,
            patientGender: appt.gender,
            doctorId: appt.doctorId,
            doctorName: appt.doctorName,
            departmentId: 'dept-general',
            departmentName: appt.departmentName,
            session: 'morning',
            time: appt.time,
            bookingDate: appt.date,
            status: 'booked',
            queuePosition: Math.max(1, prev.filter(t => t.doctorId === appt.doctorId && ['booked','waiting','checked-in'].includes(t.status)).length + 1),
            estimatedWait: appt.estimatedWaitTime || 15,
            consultationFee: appt.fee,
            paymentStatus: 'paid',
            paymentMethod: appt.paymentMethod || 'Online',
            isRevisit: false
          };
          const updated = [newTok, ...prev];
          localStorage.setItem('insta_hospital_tokens', JSON.stringify(updated));
          return updated;
        });
      } else if (event.type === 'STORAGE_CHANGED') {
        const savedDocs = localStorage.getItem('insta_hospital_doctors');
        if (savedDocs) {
          try { setDoctors(JSON.parse(savedDocs)); } catch (e) {}
        }
        const savedProfile = localStorage.getItem('insta_hospital_profile');
        if (savedProfile) {
          try { setHospitalProfile(JSON.parse(savedProfile)); } catch (e) {}
        }
        const savedDepts = localStorage.getItem('insta_hospital_departments');
        if (savedDepts) {
          try { setDepartments(JSON.parse(savedDepts)); } catch (e) {}
        }
        const savedToks = localStorage.getItem('insta_hospital_tokens');
        if (savedToks) {
          try { setTokens(JSON.parse(savedToks)); } catch (e) {}
        }
      }
    });

    return unsubscribe;
  }, []);

  // ─── Global Sync to AppContext & localStorage ──────────────────────────────
  useEffect(() => {
    localStorage.setItem('insta_hospital_profile', JSON.stringify(hospitalProfile));
    if (updateHospital) {
      updateHospital(targetHospId, {
        name: hospitalProfile.name,
        address: hospitalProfile.address,
        contact: hospitalProfile.phone,
        about: hospitalProfile.about,
        facilities: hospitalProfile.facilities,
        image: hospitalProfile.coverImage || hospitalProfile.logo,
      });
    }
    broadcastGlobalSync('HOSPITAL_PROFILE_UPDATED', { hospitalId: targetHospId, profile: hospitalProfile });
  }, [hospitalProfile, targetHospId]);

  useEffect(() => {
    localStorage.setItem('insta_hospital_doctors', JSON.stringify(doctors));
    const mappedAppDoctors: Doctor[] = doctors.map(d => ({
      id: d.id,
      name: d.name,
      specialty: d.specialization || d.departmentName || "Specialist",
      departmentId: d.departmentId || "dept-general",
      qualification: d.qualification || "MBBS",
      experience: Number(d.experience) || 5,
      consultationFee: Number(d.consultationFee) || 500,
      rating: Number(d.rating) || 4.8,
      reviewsCount: Number(d.totalPatients) || 120,
      image: d.photo || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80",
      availability: {
        days: d.opdDays && d.opdDays.length > 0 ? d.opdDays : ["Mon", "Tue", "Wed", "Thu", "Fri"],
        slots: [
          `${d.opdStartTime || '09:00'} AM`,
          "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM",
          `${d.opdEndTime || '17:00'} PM`
        ]
      },
      currentQueue: tokens.filter(t => t.doctorId === d.id && ['completed'].includes(t.status)).length,
      nextAvailableToken: Math.max(1, tokens.filter(t => t.doctorId === d.id).length + 1),
      estimatedWaitPerPatient: Number(d.consultationDuration) || 12,
      active: d.active !== false
    }));

    if (updateHospitalDoctors) {
      updateHospitalDoctors(targetHospId, mappedAppDoctors);
    }
    broadcastGlobalSync('HOSPITAL_DOCTORS_UPDATED', { hospitalId: targetHospId, doctors: mappedAppDoctors });
  }, [doctors, targetHospId, tokens]);

  useEffect(() => {
    localStorage.setItem('insta_hospital_departments', JSON.stringify(departments));
    const mappedDepts = departments.map(d => ({
      id: d.id,
      name: d.name,
      icon: d.icon || '🩺'
    }));
    if (updateHospitalDepartments) {
      updateHospitalDepartments(targetHospId, mappedDepts);
    }
    broadcastGlobalSync('HOSPITAL_DEPARTMENTS_UPDATED', { hospitalId: targetHospId, departments: mappedDepts });
  }, [departments, targetHospId]);

  useEffect(() => {
    localStorage.setItem('insta_hospital_tokens', JSON.stringify(tokens));
  }, [tokens]);

  useEffect(() => {
    localStorage.setItem('insta_hospital_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('insta_hospital_schedule', JSON.stringify(scheduleConfig));
  }, [scheduleConfig]);

  // Auth
  const hospitalLogin = (email: string, password: string) => {
    const cred = MOCK_CREDENTIALS.find(c => c.email === email && c.password === password);
    if (!cred) return { success: false, message: 'Invalid email or password.' };
    const user = MOCK_USERS.find(u => u.id === cred.userId);
    if (!user) return { success: false, message: 'User account not found.' };
    setHospitalUser(user);
    return { success: true, message: 'Login successful.' };
  };

  const hospitalLogout = () => { setHospitalUser(null); setActiveSection('dashboard'); };

  // Doctors
  const addDoctor = (doc: Omit<HospitalDoctor, 'id' | 'totalPatients' | 'rating'>) => {
    setDoctors(prev => [...prev, { ...doc, id: `doc-${Date.now()}`, totalPatients: 0, rating: 0 }]);
  };
  const updateDoctor = (id: string, updates: Partial<HospitalDoctor>) =>
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  const deleteDoctor = (id: string) => setDoctors(prev => prev.filter(d => d.id !== id));
  const toggleDoctorActive = (id: string) =>
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));

  // Departments
  const addDepartment = (dept: Omit<HospitalDepartment, 'id'>) =>
    setDepartments(prev => [...prev, { ...dept, id: `dept-${Date.now()}` }]);
  const updateDepartment = (id: string, updates: Partial<HospitalDepartment>) =>
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  const deleteDepartment = (id: string) => setDepartments(prev => prev.filter(d => d.id !== id));
  const toggleDepartmentActive = (id: string) =>
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));

  // Tokens
  const generateWalkInToken = (form: {
    patientName: string; patientPhone: string; patientAge: number;
    patientGender: string; address: string; departmentId: string;
    doctorId: string; session: 'morning' | 'afternoon' | 'evening';
  }): TokenRecord => {
    const maxToken = Math.max(...tokens.map(t => t.tokenNo), 100);
    const doctor = doctors.find(d => d.id === form.doctorId);
    const dept = departments.find(d => d.id === form.departmentId);
    const waitingInSession = tokens.filter(t => t.session === form.session && ['booked','waiting','checked-in'].includes(t.status)).length;
    const newToken: TokenRecord = {
      id: `tok-${Date.now()}`, tokenNo: maxToken + 1, type: 'offline',
      patientName: form.patientName, patientPhone: form.patientPhone,
      patientAge: form.patientAge, patientGender: form.patientGender,
      doctorId: form.doctorId, doctorName: doctor?.name || '',
      departmentId: form.departmentId, departmentName: dept?.name || '',
      session: form.session, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      bookingDate: new Date().toISOString().split('T')[0],
      status: 'booked', queuePosition: waitingInSession + 1,
      estimatedWait: (waitingInSession + 1) * (doctor?.consultationDuration || 12),
      consultationFee: doctor?.consultationFee || 0, paymentStatus: 'pending', paymentMethod: 'Cash',
      isRevisit: false,
    };
    setTokens(prev => [...prev, newToken]);
    return newToken;
  };

  const updateTokenStatus = (id: string, status: TokenRecord['status']) =>
    setTokens(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  const cancelToken = (id: string) =>
    setTokens(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled', paymentStatus: 'refunded' } : t));

  // Patients
  const addPatient = (p: Omit<PatientRecord, 'id' | 'uhid' | 'registeredOn' | 'totalVisits' | 'lastVisit' | 'tokenHistory'>) => {
    const uhid = `APS${String(patients.length + 1239).padStart(6, '0')}`;
    setPatients(prev => [...prev, { ...p, id: `pat-${Date.now()}`, uhid, registeredOn: new Date().toISOString().split('T')[0], totalVisits: 0, lastVisit: '', tokenHistory: [] }]);
  };
  const updatePatient = (id: string, updates: Partial<PatientRecord>) =>
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  const searchPatients = (query: string): PatientRecord[] => {
    const q = query.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) || p.phone.includes(q) ||
      p.uhid.toLowerCase().includes(q) || p.tokenHistory.some(t => t.includes(q))
    );
  };
  const validateToken = (tokenNo: number): TokenRecord | null =>
    tokens.find(t => t.tokenNo === tokenNo) || null;

  // Schedule
  const updateScheduleConfig = (config: Partial<ScheduleConfig>) =>
    setScheduleConfig(prev => ({ ...prev, ...config }));
  const updateSession = (id: string, updates: Partial<SessionConfig>) =>
    setScheduleConfig(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === id ? { ...s, ...updates } : s)
    }));

  // Notifications
  const sendNotification = (msg: Omit<NotificationMessage, 'id' | 'sentAt' | 'status'>) => {
    setNotifications(prev => [...prev, { ...msg, id: `notif-${Date.now()}`, sentAt: new Date().toISOString(), status: 'sent' }]);
  };

  // Profile
  const updateHospitalProfile = (updates: Partial<HospitalProfile>) =>
    setHospitalProfile(prev => ({ ...prev, ...updates }));

  return (
    <HospitalContext.Provider value={{
      hospitalUser, hospitalProfile, departments, doctors, tokens, patients,
      scheduleConfig, notifications, activeSection, sidebarCollapsed,
      hospitalLogin, hospitalLogout,
      setActiveSection, setSidebarCollapsed,
      addDoctor, updateDoctor, deleteDoctor, toggleDoctorActive,
      addDepartment, updateDepartment, deleteDepartment, toggleDepartmentActive,
      generateWalkInToken, updateTokenStatus, cancelToken,
      addPatient, updatePatient, searchPatients, validateToken,
      updateScheduleConfig, updateSession,
      sendNotification,
      updateHospitalProfile,
    }}>
      {children}
    </HospitalContext.Provider>
  );
};
