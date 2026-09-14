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
  sessions?: SessionConfig[];
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
  status: 'booked' | 'checked-in' | 'completed' | 'cancelled' | 'waiting' | 'skipped' | 'not-visited' | 'calling' | 'late-coming' | 'arrived' | 'in-consultation';
  queuePosition: number;
  estimatedWait: number; // minutes
  consultationFee: number;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  paymentMethod: string;
  isRevisit: boolean;
  revisitValidUpto?: string;
  notes?: string;
  hospitalId?: string;
  isExisting?: boolean;
  rmpReference?: { name: string; phone: string } | null;
}

export interface DoctorVisitSummary {
  doctorId: string;
  doctorName: string;
  departmentName: string;
  visitCount: number;
  lastVisitDate: string;
}

export interface PatientRecord {
  id: string;
  uhid: string;
  hospitalId?: string;
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
  tokenHistory: any[];
  doctorVisits?: DoctorVisitSummary[];
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

export interface StaffAttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'half-day' | 'leave';
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

export interface HospitalStaffMember {
  id: string;
  employeeId: string;
  name: string;
  photo: string;
  phone: string;
  email: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  shift: 'Morning' | 'Evening' | 'Night' | 'General';
  joiningDate: string;
  salary: number;
  employmentType: 'Full-time' | 'Part-time' | 'Contract';
  status: 'active' | 'on-leave' | 'inactive';
  attendance: StaffAttendanceRecord[];
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
  hospitalLogin: (email: string, password: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
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
    patientName: string;
    patientPhone: string;
    patientAge: number;
    patientGender: string;
    address?: string;
    departmentId: string;
    doctorId: string;
    session: 'morning' | 'afternoon' | 'evening';
    isRevisit?: boolean;
    notes?: string;
  }) => TokenRecord;
  updateTokenStatus: (id: string, status: TokenRecord['status']) => void;
  cancelToken: (id: string) => void;
  deleteToken: (id: string) => void;

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

  // Staff & Employees
  staff: HospitalStaffMember[];
  addStaffMember: (member: Omit<HospitalStaffMember, 'id' | 'attendance'>) => void;
  updateStaffMember: (id: string, updates: Partial<HospitalStaffMember>) => void;
  deleteStaffMember: (id: string) => void;
  markStaffAttendance: (staffId: string, date: string, status: StaffAttendanceRecord['status'], checkIn?: string, checkOut?: string, notes?: string) => void;

  // Profile & Hospital Switcher
  updateHospitalProfile: (updates: Partial<HospitalProfile>) => void;
  switchHospital: (hospitalId: string) => void;
  availableHospitals: { id: string; name: string; category?: string }[];

  // Phase 20-22 Additions: Access Control, Backend Revenue & Patients
  authToken: string;
  fetchPatients: (doctorId?: string, search?: string, status?: string) => Promise<PatientRecord[]>;
  fetchHospitalRevenue: (filter?: string, startDate?: string, endDate?: string, doctorId?: string) => Promise<{ totals: any; doctorStats: any[] }>;
}

// ─── Mock credentials (Single Official Reference Demo Hospital) ───────────────

const MOCK_CREDENTIALS = [
  { email: 'admin@apollo.com', password: 'password', userId: 'huser-apollo' }
];

const MOCK_USERS: HospitalUser[] = [
  { id: 'huser-apollo', name: 'Dr. Rajesh Kumar', email: 'admin@apollo.com', role: 'owner', hospitalId: 'hosp-apollo', hospitalName: 'Apollo Spectra Hospital', avatar: '', isOnline: true }
];


// ─── Initial Mock Data ────────────────────────────────────────────────────────

const INITIAL_PROFILE: HospitalProfile = {
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

export const INITIAL_DEPARTMENTS: HospitalDepartment[] = [
  { id: 'dept-cardio', name: 'Cardiology', icon: '❤️', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-neuro', name: 'Neurology', icon: '🧠', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-ortho', name: 'Orthopedics', icon: '🦴', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-pedia', name: 'Pediatrics', icon: '👶', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-gynaec', name: 'Gynecology', icon: '🌸', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-general', name: 'General Medicine', icon: '🩺', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-eye', name: 'Ophthalmology', icon: '👁️', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-dental', name: 'Dental', icon: '🦷', headDoctor: '', totalDoctors: 0, active: true },
];

export function ensureDefaultDepartments(existingDepts?: HospitalDepartment[] | null): HospitalDepartment[] {
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

const INITIAL_DOCTORS: HospitalDoctor[] = [
  {
    id: 'doc-arvind', name: 'Dr. Arvind Sharma', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    qualification: 'MD, DM (Cardiology), FACC', specialization: 'Interventional Cardiologist',
    departmentId: 'dept-cardio', departmentName: 'Cardiology', experience: 16,
    consultationFee: 800, languages: ['Hindi', 'English', 'Kannada'], gender: 'Male',
    biography: 'Dr. Arvind is a leading interventional cardiologist with 16+ years of experience.',
    opdDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    opdStartTime: '09:00 AM', opdEndTime: '04:00 PM',
    consultationDuration: 15, maxTokensPerDay: 50,
    onlineConsult: true, offlineConsult: true, active: true, rating: 4.9, totalPatients: 4820,
    sessions: [
      { id: 'sess-arvind-1', name: 'Morning', startTime: '09:00 AM', endTime: '04:00 PM', maxTokens: 40, consultationDuration: 15, breakTime: 5, active: true },
      { id: 'sess-arvind-2', name: 'Evening', startTime: '05:00 PM', endTime: '09:00 PM', maxTokens: 35, consultationDuration: 15, breakTime: 5, active: true },
    ]
  },
  {
    id: 'doc-sarah', name: 'Dr. Sarah Jenkins', photo: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=400&auto=format&fit=crop&q=80',
    qualification: 'MBBS, DM (Neurology)', specialization: 'Consultant Neurologist',
    departmentId: 'dept-neuro', departmentName: 'Neurology', experience: 12,
    consultationFee: 1000, languages: ['English', 'Hindi'], gender: 'Female',
    biography: 'Dr. Sarah specializes in epilepsy, stroke management and cognitive disorders.',
    opdDays: ['Mon', 'Wed', 'Fri'],
    opdStartTime: '01:30 PM', opdEndTime: '08:30 PM',
    consultationDuration: 20, maxTokensPerDay: 30,
    onlineConsult: true, offlineConsult: true, active: true, rating: 4.7, totalPatients: 2140,
    sessions: [
      { id: 'sess-sarah-1', name: 'Afternoon', startTime: '01:30 PM', endTime: '05:30 PM', maxTokens: 25, consultationDuration: 20, breakTime: 5, active: true },
      { id: 'sess-sarah-2', name: 'Evening', startTime: '06:00 PM', endTime: '08:30 PM', maxTokens: 15, consultationDuration: 20, breakTime: 5, active: true },
    ]
  },
  {
    id: 'doc-ramesh', name: 'Dr. Ramesh Patel', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
    qualification: 'MS (Ortho), MCh (Ortho)', specialization: 'Joint Replacement Specialist',
    departmentId: 'dept-ortho', departmentName: 'Orthopedics', experience: 18,
    consultationFee: 900, languages: ['Gujarati', 'Hindi', 'English'], gender: 'Male',
    biography: 'Dr. Ramesh is a pioneer in minimally invasive joint replacement surgery.',
    opdDays: ['Tue', 'Thu', 'Sat'],
    opdStartTime: '09:30 AM', opdEndTime: '01:30 PM',
    consultationDuration: 15, maxTokensPerDay: 40,
    onlineConsult: true, offlineConsult: true, active: true, rating: 4.8, totalPatients: 3300,
    sessions: [
      { id: 'sess-ramesh-1', name: 'Morning', startTime: '09:30 AM', endTime: '01:30 PM', maxTokens: 40, consultationDuration: 15, breakTime: 5, active: true },
    ]
  },
  {
    id: 'doc-anjali', name: 'Dr. Anjali Sharma', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
    qualification: 'MD (Pediatrics), Fellowship in Neonatology', specialization: 'Pediatrician',
    departmentId: 'dept-pedia', departmentName: 'Pediatrics', experience: 10,
    consultationFee: 700, languages: ['Hindi', 'English', 'Telugu'], gender: 'Female',
    biography: 'Dr. Anjali specializes in neonatal care and childhood developmental disorders.',
    opdDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    opdStartTime: '09:00 AM', opdEndTime: '05:00 PM',
    consultationDuration: 12, maxTokensPerDay: 60,
    onlineConsult: true, offlineConsult: true, active: true, rating: 4.8, totalPatients: 5600,
    sessions: [
      { id: 'sess-anjali-1', name: 'Morning', startTime: '09:00 AM', endTime: '01:00 PM', maxTokens: 35, consultationDuration: 12, breakTime: 5, active: true },
      { id: 'sess-anjali-2', name: 'Afternoon', startTime: '02:00 PM', endTime: '05:00 PM', maxTokens: 25, consultationDuration: 12, breakTime: 5, active: true },
    ]
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
    sessions: [
      { id: 'sess-vivek-1', name: 'Evening', startTime: '05:00 PM', endTime: '09:00 PM', maxTokens: 30, consultationDuration: 15, breakTime: 5, active: true },
    ]
  },
];

const INITIAL_SCHEDULE: ScheduleConfig = {
  sessions: [
    { id: 'sess-morning', name: 'Morning', startTime: '09:00 AM', endTime: '04:00 PM', maxTokens: 50, consultationDuration: 12, breakTime: 5, active: true },
    { id: 'sess-afternoon', name: 'Afternoon', startTime: '01:00 PM', endTime: '05:00 PM', maxTokens: 50, consultationDuration: 12, breakTime: 5, active: true },
    { id: 'sess-evening', name: 'Evening', startTime: '05:00 PM', endTime: '10:00 PM', maxTokens: 50, consultationDuration: 12, breakTime: 5, active: true },
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

const INITIAL_STAFF: HospitalStaffMember[] = [
  {
    id: 'staff-1',
    employeeId: 'EMP-1001',
    name: 'Pooja Verma',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    phone: '+91 98450 12345',
    email: 'pooja.verma@apollospectra.com',
    departmentId: 'dept-general',
    departmentName: 'General OPD',
    designation: 'Senior OPD Receptionist',
    shift: 'Morning',
    joiningDate: '2022-03-15',
    salary: 28000,
    employmentType: 'Full-time',
    status: 'active',
    attendance: [
      { date: new Date().toISOString().split('T')[0], status: 'present', checkIn: '08:45 AM' }
    ]
  },
  {
    id: 'staff-2',
    employeeId: 'EMP-1002',
    name: 'Sunita Deshmukh',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    phone: '+91 98450 67890',
    email: 'sunita.d@apollospectra.com',
    departmentId: 'dept-cardio',
    departmentName: 'Cardiology',
    designation: 'Lead OPD Nurse',
    shift: 'Morning',
    joiningDate: '2021-08-10',
    salary: 35000,
    employmentType: 'Full-time',
    status: 'active',
    attendance: [
      { date: new Date().toISOString().split('T')[0], status: 'present', checkIn: '08:50 AM' }
    ]
  },
  {
    id: 'staff-3',
    employeeId: 'EMP-1003',
    name: 'Kiran Rao',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    phone: '+91 98450 99887',
    email: 'kiran.rao@apollospectra.com',
    departmentId: 'dept-ortho',
    departmentName: 'Orthopedics',
    designation: 'Patient Queue Coordinator',
    shift: 'Evening',
    joiningDate: '2023-01-20',
    salary: 24000,
    employmentType: 'Full-time',
    status: 'active',
    attendance: [
      { date: new Date().toISOString().split('T')[0], status: 'present', checkIn: '01:55 PM' }
    ]
  }
];

const isDummyToken = (t: any) =>
  !t ||
  ['tok-101', 'tok-102', 'tok-103', 'tok-104', 'tok-105', 'tok-106', 'tok-107', 'tok-108', 'tok-98', 'tok-99', 'tok-100', 'tok-1001'].includes(t.id) ||
  ['Rahul Kumar', 'Priya Sharma', 'Mohan Reddy', 'Ananya Patel', 'Ramesh Kumar', 'Neha Singh', 'Mohan Das', 'Lakshmi Devi', 'Suresh Reddy', 'Kavitha Rao', 'Arun Verma', 'Guest Patient'].includes(t.patientName);

const isDummyPatient = (p: any) =>
  !p ||
  ['pat-1', 'pat-2', 'pat-3', 'pat-4', 'pat-5'].includes(p.id) ||
  ['APS001234', 'APS001235', 'APS001236', 'APS001237', 'APS001238'].includes(p.uhid) ||
  ['Rahul Kumar', 'Priya Sharma', 'Mohan Reddy', 'Ananya Patel', 'Ramesh Kumar'].includes(p.name);

// ─── Context ──────────────────────────────────────────────────────────────────

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export const useHospital = () => {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error('useHospital must be used within HospitalProvider');
  return ctx;
};

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hospitals, updateHospital, updateHospitalDoctors, updateHospitalDepartments, getOrCreateCustomerAccount } = useApp();

  const [hospitalUser, setHospitalUser] = useState<HospitalUser | null>(() => {
    const saved = localStorage.getItem('insta_hospital_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [hospitalProfile, setHospitalProfile] = useState<HospitalProfile>(() => {
    const curHospId = localStorage.getItem('insta_current_hospital_id');
    if (!curHospId) {
      return {
        id: '',
        name: '',
        logo: '',
        coverImage: '',
        gallery: [],
        type: 'General Hospital',
        ownershipType: 'Private',
        registrationNumber: '',
        accreditation: '',
        gstNumber: '',
        licenseNumber: '',
        phone: '',
        whatsapp: '',
        email: '',
        website: '',
        emergencyNumber: '',
        address: '',
        area: '',
        city: '',
        state: '',
        pinCode: '',
        country: 'India',
        lat: 17.3850,
        lng: 78.4867,
        about: '',
        mission: '',
        vision: '',
        brandColor: '#2563EB',
        facilities: [],
        emergencyServices: [],
        timings: []
      };
    }
    const saved = localStorage.getItem(`insta_hospital_profile_${curHospId}`) || localStorage.getItem('insta_hospital_profile');
    if (saved) {
      try {
        const prof = JSON.parse(saved);
        if (prof.id === curHospId) return prof;
      } catch (e) {}
    }
    if (curHospId === 'hosp-apollo') {
      return INITIAL_PROFILE;
    }
    return {
      id: curHospId,
      name: '',
      logo: '',
      coverImage: '',
      gallery: [],
      type: 'General Hospital',
      ownershipType: 'Private',
      registrationNumber: '',
      accreditation: '',
      gstNumber: '',
      licenseNumber: '',
      phone: '',
      whatsapp: '',
      email: '',
      website: '',
      emergencyNumber: '',
      address: '',
      area: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India',
      lat: 17.3850,
      lng: 78.4867,
      about: '',
      mission: '',
      vision: '',
      brandColor: '#2563EB',
      facilities: [],
      emergencyServices: [],
      timings: []
    };
  });

  const targetHospId = hospitalUser?.hospitalId || hospitalProfile?.id || localStorage.getItem('insta_current_hospital_id') || '';

  const [departments, setDepartments] = useState<HospitalDepartment[]>(() => {
    const curHospId = localStorage.getItem('insta_current_hospital_id') || '';
    if (!curHospId) return ensureDefaultDepartments([]);
    const saved = localStorage.getItem(`insta_hospital_departments_${curHospId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((d: any) => ({
            ...d,
            icon: d.icon || '🩺',
            active: d.active !== false
          }));
          return ensureDefaultDepartments(mapped);
        }
      } catch (e) {}
    }
    return ensureDefaultDepartments([]);
  });

  const [doctors, setDoctors] = useState<HospitalDoctor[]>(() => {
    const curHospId = localStorage.getItem('insta_current_hospital_id') || '';
    if (!curHospId) return [];
    const saved = localStorage.getItem(`insta_hospital_doctors_${curHospId}`);
    if (saved) {
      try {
        const parsed: HospitalDoctor[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {}
    }
    // Only Apollo Spectra Hospital has default reference doctors
    if (curHospId === 'hosp-apollo') {
      return INITIAL_DOCTORS;
    }
    // All other hospital accounts start with their own doctors
    return [];
  });

  const [staff, setStaff] = useState<HospitalStaffMember[]>(() => {
    const curHospId = localStorage.getItem('insta_current_hospital_id') || '';
    if (!curHospId) return [];
    const saved = localStorage.getItem(`insta_hospital_staff_${curHospId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return curHospId === 'hosp-apollo' ? INITIAL_STAFF : [];
  });

  const [tokens, setTokens] = useState<TokenRecord[]>(() => {
    const curHospId = localStorage.getItem('insta_current_hospital_id') || '';
    if (!curHospId) return [];
    const saved = localStorage.getItem(`insta_hospital_tokens_${curHospId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(t => !isDummyToken(t));
          return clean;
        }
      } catch (e) {}
    }
    return [];
  });

  const [patients, setPatients] = useState<PatientRecord[]>(() => {
    const curHospId = localStorage.getItem('insta_current_hospital_id') || '';
    if (!curHospId) return [];
    const saved = localStorage.getItem(`insta_hospital_patients_${curHospId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(p => !isDummyPatient(p));
          return clean;
        }
      } catch (e) {}
    }
    return [];
  });

  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(() => {
    const curHospId = localStorage.getItem('insta_current_hospital_id') || '';
    if (!curHospId) return INITIAL_SCHEDULE;
    const saved = localStorage.getItem(`insta_hospital_schedule_${curHospId}`);
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
  });

  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [authToken, setAuthToken] = useState<string>(() => {
    return localStorage.getItem('insta_hospital_auth_token') || `htok_${targetHospId}_default`;
  });

  // Dynamic fetch of hospital patients strictly for current hospital (Phase 20)
  const fetchPatients = async (doctorId?: string, search?: string, status?: string): Promise<PatientRecord[]> => {
    try {
      const params = new URLSearchParams();
      if (doctorId && doctorId !== 'all') params.append('doctorId', doctorId);
      if (search) params.append('search', search);
      if (status && status !== 'all') params.append('status', status);

      const res = await fetch(`/api/hospitals/${targetHospId}/patients?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-hospital-token': authToken
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.patients)) {
        setPatients(data.patients);
        localStorage.setItem(`insta_hospital_patients_${targetHospId}`, JSON.stringify(data.patients));
        localStorage.setItem('insta_hospital_patients', JSON.stringify(data.patients));
        return data.patients;
      }
    } catch (err) {
      console.warn('Could not fetch patients from backend:', err);
    }
    return patients;
  };

  // Dynamic backend revenue calculation engine (Phase 21)
  const fetchHospitalRevenue = async (filter = 'today', startDate?: string, endDate?: string, doctorId?: string) => {
    try {
      const params = new URLSearchParams();
      params.append('filter', filter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (doctorId && doctorId !== 'all') params.append('doctorId', doctorId);

      const res = await fetch(`/api/hospitals/${targetHospId}/revenue?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-hospital-token': authToken
        }
      });
      const data = await res.json();
      if (data.success) {
        return { totals: data.totals, doctorStats: data.doctorStats };
      }
    } catch (err) {
      console.warn('Could not fetch revenue from backend:', err);
    }
    return { totals: null, doctorStats: [] };
  };

  // Auto-fetch patients, tokens, doctors, departments, schedules for current hospital directly from AWS RDS
  useEffect(() => {
    if (!targetHospId || !hospitalUser || !authToken) return;

    fetchPatients();

    // 1. Fetch live tokens
    fetch(`/api/hospitals/${targetHospId}/tokens`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-hospital-token': authToken
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.tokens)) {
          setTokens(data.tokens.filter((t: any) => !isDummyToken(t)));
          localStorage.setItem(`insta_hospital_tokens_${targetHospId}`, JSON.stringify(data.tokens));
        }
      })
      .catch(err => console.warn('Could not fetch tokens from AWS RDS:', err));

    // 2. Fetch live doctors strictly for this hospital
    fetch(`/api/hospitals/${targetHospId}/doctors`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-hospital-token': authToken
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.doctors)) {
          setDoctors(data.doctors);
          localStorage.setItem(`insta_hospital_doctors_${targetHospId}`, JSON.stringify(data.doctors));
        }
      })
      .catch(err => console.warn('Could not fetch doctors from AWS RDS:', err));

    // 3. Fetch live departments strictly for this hospital
    fetch(`/api/hospitals/${targetHospId}/departments`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-hospital-token': authToken
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.departments)) {
          setDepartments(data.departments);
          localStorage.setItem(`insta_hospital_departments_${targetHospId}`, JSON.stringify(data.departments));
        }
      })
      .catch(err => console.warn('Could not fetch departments from AWS RDS:', err));

    // 4. Fetch live schedules
    fetch(`/api/hospitals/${targetHospId}/schedules`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-hospital-token': authToken
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.schedule) {
          setScheduleConfig(data.schedule);
          localStorage.setItem('insta_hospital_schedule', JSON.stringify(data.schedule));
        }
      })
      .catch(err => console.warn('Could not fetch schedules from AWS RDS:', err));
  }, [targetHospId, authToken, hospitalUser]);

  // ─── Cross-tab & Real-time Global Sync ─────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeGlobalSync((event) => {
      if ((event.type === 'TOKEN_BOOKED' || event.type === 'HOSPITAL_TOKEN_CREATED') && (event.data?.appointment || event.data?.token)) {
        const payload = event.data.token || event.data.appointment;
        const appt = event.data.appointment || event.data.token;
        setTokens(prev => {
          if (prev.some(t => t.id === payload.id) || isDummyToken(payload)) return prev;
          const newTok: TokenRecord = {
            id: payload.id,
            tokenNo: payload.tokenNo || payload.tokenNumber || 1,
            type: payload.type || 'online',
            patientName: payload.patientName,
            patientPhone: payload.patientPhone || payload.phone || '',
            patientAge: payload.patientAge || payload.age || 28,
            patientGender: payload.patientGender || payload.gender || 'Male',
            doctorId: payload.doctorId,
            doctorName: payload.doctorName,
            departmentId: payload.departmentId || 'dept-general',
            departmentName: payload.departmentName || 'General Medicine',
            session: payload.session || 'morning',
            time: payload.time || '10:00 AM',
            bookingDate: payload.bookingDate || payload.date || new Date().toISOString().split('T')[0],
            status: payload.status || 'booked',
            queuePosition: Math.max(1, prev.filter(t => t.doctorId === payload.doctorId && ['booked','waiting','checked-in'].includes(t.status)).length + 1),
            estimatedWait: payload.estimatedWait || payload.estimatedWaitTime || 15,
            consultationFee: payload.consultationFee || payload.fee || 500,
            paymentStatus: payload.paymentStatus || 'paid',
            paymentMethod: payload.paymentMethod || 'Online',
            isRevisit: false,
            hospitalId: payload.hospitalId || targetHospId
          };
          const updated = [newTok, ...prev];
          localStorage.setItem('insta_hospital_tokens', JSON.stringify(updated));
          return updated;
        });

        // Also update patient record in hospital context (Phase 20)
        setPatients(prev => {
          const exists = prev.some(p => p.phone === appt.phone);
          const tokenSummary = {
            id: appt.id,
            tokenNo: appt.tokenNumber,
            type: 'online',
            doctorId: appt.doctorId,
            doctorName: appt.doctorName,
            departmentName: appt.departmentName,
            session: 'morning',
            time: appt.time,
            bookingDate: appt.date,
            status: 'booked',
            consultationFee: appt.fee,
            paymentStatus: 'paid',
            paymentMethod: appt.paymentMethod || 'Online'
          };
          if (exists) {
            return prev.map(p => p.phone === appt.phone ? {
              ...p,
              totalVisits: (p.totalVisits || 0) + 1,
              lastVisit: appt.date,
              tokenHistory: [tokenSummary, ...(p.tokenHistory || [])]
            } : p);
          }
          const newPat: PatientRecord = {
            id: `pat-${Date.now()}`,
            uhid: `APS${String(prev.length + 1001).padStart(6, '0')}`,
            hospitalId: targetHospId,
            name: appt.patientName,
            phone: appt.phone,
            email: appt.email || '',
            age: appt.age,
            gender: appt.gender,
            bloodGroup: 'B+',
            address: appt.address || '',
            city: hospitalProfile?.city || 'Bengaluru',
            pinCode: hospitalProfile?.pinCode || '',
            registeredOn: appt.date,
            totalVisits: 1,
            lastVisit: appt.date,
            familyMembers: [],
            medicalHistory: [],
            allergies: [],
            tokenHistory: [tokenSummary],
            doctorVisits: [{ doctorId: appt.doctorId, doctorName: appt.doctorName, departmentName: appt.departmentName, visitCount: 1, lastVisitDate: appt.date }]
          };
          return [newPat, ...prev];
        });
      } else if (event.type === 'STORAGE_CHANGED' || event.type === 'CLOUD_SYNC_UPDATED' || event.type === 'HOSPITAL_DOCTORS_UPDATED' || event.type === 'HOSPITAL_PROFILE_UPDATED' || event.type === 'HOSPITAL_DEPARTMENTS_UPDATED' || event.type === 'HOSPITAL_TOKENS_UPDATED') {
        const curHospId = targetHospId;
        if (!curHospId) return;
        const savedDocs = localStorage.getItem(`insta_hospital_doctors_${curHospId}`);
        if (savedDocs) {
          try {
            const parsed = JSON.parse(savedDocs);
            if (Array.isArray(parsed)) {
              setDoctors(prev => (JSON.stringify(prev) !== savedDocs ? parsed : prev));
            }
          } catch (e) {}
        }

        const savedProfile = localStorage.getItem(`insta_hospital_profile_${curHospId}`);
        if (savedProfile) {
          try { 
            const parsedProf = JSON.parse(savedProfile);
            setHospitalProfile(prev => (JSON.stringify(prev) !== savedProfile ? parsedProf : prev));
          } catch (e) {}
        }
        const savedDepts = localStorage.getItem(`insta_hospital_departments_${curHospId}`);
        if (savedDepts) {
          try {
            const parsed = JSON.parse(savedDepts);
            if (Array.isArray(parsed)) {
              setDepartments(prev => (JSON.stringify(prev) !== savedDepts ? parsed.map((d: any) => ({
                ...d,
                icon: d.icon || '🩺',
                active: d.active !== false
              })) : prev));
            }
          } catch (e) {}
        }
        const savedToks = localStorage.getItem(`insta_hospital_tokens_${curHospId}`);
        if (savedToks) {
          try {
            const parsed = JSON.parse(savedToks);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter(t => !isDummyToken(t));
              setTokens(prev => (JSON.stringify(prev) !== JSON.stringify(clean) ? clean : prev));
            }
          } catch (e) {}
        }
      }
    });

    return unsubscribe;
  }, []);

  // ─── Local Sync to localStorage ──────────────────────────────
  useEffect(() => {
    if (!targetHospId || !hospitalUser) return;
    localStorage.setItem('insta_hospital_profile', JSON.stringify(hospitalProfile));
    localStorage.setItem(`insta_hospital_profile_${targetHospId}`, JSON.stringify(hospitalProfile));
  }, [hospitalProfile, targetHospId, hospitalUser]);

  // Fetch latest saved profile from backend on mount so we never rely on stale defaults
  useEffect(() => {
    if (!targetHospId || !hospitalUser) return;
    fetch('/api/hospitals')
      .then(res => res.json())
      .then(data => {
        if (data?.store?.hospitalProfiles) {
          const prof = data.store.hospitalProfiles[targetHospId];
          if (prof && prof.address) {
            setHospitalProfile(prev => ({ ...prev, ...prof }));
            localStorage.setItem('insta_hospital_profile', JSON.stringify(prof));
            localStorage.setItem(`insta_hospital_profile_${targetHospId}`, JSON.stringify(prof));
          }
        }
      })
      .catch(err => console.warn('Could not load hospital profile from server:', err));
  }, [targetHospId, hospitalUser]);

  useEffect(() => {
    if (!targetHospId || !hospitalUser) return;
    localStorage.setItem(`insta_hospital_doctors_${targetHospId}`, JSON.stringify(doctors));
  }, [doctors, targetHospId, hospitalUser]);

  useEffect(() => {
    if (!targetHospId || !hospitalUser) return;
    localStorage.setItem(`insta_hospital_departments_${targetHospId}`, JSON.stringify(departments));
  }, [departments, targetHospId, hospitalUser]);

  useEffect(() => {
    if (!targetHospId || !hospitalUser) return;
    localStorage.setItem('insta_hospital_tokens', JSON.stringify(tokens));
  }, [tokens, targetHospId, hospitalUser]);

  useEffect(() => {
    localStorage.setItem('insta_hospital_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('insta_hospital_schedule', JSON.stringify(scheduleConfig));
  }, [scheduleConfig]);

  useEffect(() => {
    localStorage.setItem('insta_hospital_staff', JSON.stringify(staff));
  }, [staff]);

  // Auth (Phase 22) - Strict Password Authentication
  const hospitalLogin = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // 1. Attempt live backend authentication
    try {
      const res = await fetch('/api/auth/hospital-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token && data.user) {
        setAuthToken(data.token);
        localStorage.setItem('insta_hospital_auth_token', data.token);
        const u: HospitalUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          hospitalId: data.user.hospitalId,
          hospitalName: data.user.hospitalName,
          avatar: '',
          isOnline: true
        };
        setHospitalUser(u);
        localStorage.setItem('insta_hospital_user', JSON.stringify(u));
        localStorage.setItem('insta_current_hospital_id', data.user.hospitalId);
        switchHospital(data.user.hospitalId);
        return { success: true, message: 'Login successful' };
      } else if (!res.ok) {
        return { success: false, message: data.message || 'Invalid email or password.' };
      }
    } catch (e) {
      console.warn('Backend hospital login unreachable, checking local credentials:', e);
    }

    // 2. Local verification against custom saved credentials + mock credentials
    const savedCustomCredsRaw = localStorage.getItem('insta_hospital_credentials');
    const customCreds = savedCustomCredsRaw ? JSON.parse(savedCustomCredsRaw) : [];
    const allCreds = [...customCreds, ...MOCK_CREDENTIALS];

    const cred = allCreds.find(c => (c.email || '').toLowerCase() === cleanEmail);
    if (!cred) {
      return { success: false, message: 'Invalid email or password.' };
    }
    const isMatch = String(cred.password) === cleanPassword || (cleanEmail === 'admin@apollo.com' && cleanPassword === 'password');
    if (!isMatch) {
      return { success: false, message: 'Incorrect password. Please enter the correct password.' };
    }

    const matchedUser: HospitalUser = (cred.userId ? MOCK_USERS.find(u => u.id === cred.userId) : null) || {
      id: `huser-${cred.hospitalId || 'admin'}`,
      name: cred.name || cred.hospitalName || 'Hospital Admin',
      email: cred.email,
      role: cred.role || 'owner',
      hospitalId: cred.hospitalId || '',
      hospitalName: cred.hospitalName || 'Partner Hospital',
      avatar: '',
      isOnline: true
    };

    if (!matchedUser.hospitalId) {
      return { success: false, message: 'Hospital account not linked to a valid hospital ID.' };
    }

    const token = `htok_${matchedUser.hospitalId}_default`;
    setAuthToken(token);
    localStorage.setItem('insta_hospital_auth_token', token);
    localStorage.setItem('insta_hospital_user', JSON.stringify(matchedUser));
    localStorage.setItem('insta_current_hospital_id', matchedUser.hospitalId);
    setHospitalUser(matchedUser);
    switchHospital(matchedUser.hospitalId);
    return { success: true, message: 'Login successful.' };
  };

  const hospitalLogout = () => {
    setHospitalUser(null);
    setAuthToken('');
    localStorage.removeItem('insta_hospital_auth_token');
    localStorage.removeItem('insta_hospital_user');
    localStorage.removeItem('insta_current_hospital_id');
    setActiveSection('dashboard');
  };

  // Helper to sync doctors changes to AppContext (website patient side) and AWS backend
  const syncDoctorsGlobally = (updatedDocs: HospitalDoctor[]) => {
    const hospId = targetHospId || hospitalUser?.hospitalId || localStorage.getItem('insta_current_hospital_id') || 'hosp-apollo';
    const token = authToken || localStorage.getItem('insta_hospital_auth_token') || `htok_${hospId}_default`;

    try {
      localStorage.setItem(`insta_hospital_doctors_${hospId}`, JSON.stringify(updatedDocs));
    } catch (e) {
      console.warn('Could not cache doctors to localStorage:', e);
    }

    const patientDocs: Doctor[] = updatedDocs.filter(d => d.active !== false).map(d => {
      const docSessions = (d.sessions && d.sessions.length > 0)
        ? d.sessions
        : [
            { id: `sess-${d.id}-1`, name: 'Morning', startTime: d.opdStartTime || '09:00 AM', endTime: '01:00 PM', maxTokens: Math.round(((Number(d.maxTokensPerDay) || 50) * 0.6)) || 30, consultationDuration: Number(d.consultationDuration) || 15, breakTime: 5, active: true },
            { id: `sess-${d.id}-2`, name: 'Evening', startTime: '05:00 PM', endTime: d.opdEndTime || '09:00 PM', maxTokens: Math.round(((Number(d.maxTokensPerDay) || 50) * 0.4)) || 20, consultationDuration: Number(d.consultationDuration) || 15, breakTime: 5, active: true }
          ];

      return {
        id: d.id,
        name: d.name,
        specialty: d.specialization || d.departmentName || 'Specialist',
        departmentId: d.departmentId || 'dept-general',
        qualification: d.qualification || 'MBBS, MD',
        experience: Number(d.experience) || 5,
        consultationFee: Number(d.consultationFee) || 500,
        rating: Number(d.rating) || 5.0,
        reviewsCount: Number(d.totalPatients) || 100,
        image: d.photo || '',
        availability: {
          days: (d.opdDays && d.opdDays.length > 0) ? d.opdDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          slots: docSessions.filter(s => s.active !== false).map(s => `${s.startTime} - ${s.endTime}`)
        },
        currentQueue: 0,
        nextAvailableToken: 1,
        estimatedWaitPerPatient: Number(d.consultationDuration) || 15,
        sessions: docSessions.map(s => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          maxTokens: s.maxTokens,
          consultationDuration: s.consultationDuration,
          breakTime: s.breakTime,
          active: s.active !== false
        }))
      };
    });

    // Update AppContext hospital directly so website user side reflects immediately!
    if (updateHospitalDoctors) {
      try {
        updateHospitalDoctors(hospId, patientDocs);
      } catch (err) {
        console.warn('Could not update AppContext doctors directly:', err);
      }
    }

    // Post to backend doctors endpoint
    fetch(`/api/hospitals/${hospId}/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ doctors: updatedDocs })
    }).catch(e => console.warn('Failed to sync doctors to server:', e));

    // Also sync to global sync endpoint
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalDoctors: { [hospId]: updatedDocs }
      })
    }).catch(() => {});

    broadcastGlobalSync('HOSPITAL_DOCTORS_UPDATED', {
      hospitalId: hospId,
      doctors: patientDocs,
      rawDoctors: updatedDocs
    });
  };

  // Helper to sync departments changes to AppContext and AWS backend
  const syncDepartmentsGlobally = (updatedDepts: HospitalDepartment[]) => {
    const hospId = targetHospId || hospitalUser?.hospitalId || localStorage.getItem('insta_current_hospital_id') || 'hosp-apollo';
    const token = authToken || localStorage.getItem('insta_hospital_auth_token') || `htok_${hospId}_default`;

    try {
      localStorage.setItem(`insta_hospital_departments_${hospId}`, JSON.stringify(updatedDepts));
    } catch (e) {
      console.warn('Could not cache departments to localStorage:', e);
    }

    const patientDepts = updatedDepts.filter(d => d.active !== false).map(d => ({
      id: d.id,
      name: d.name,
      icon: d.icon || '🩺'
    }));

    if (updateHospitalDepartments) {
      try {
        updateHospitalDepartments(hospId, patientDepts);
      } catch (err) {
        console.warn('Could not update AppContext departments directly:', err);
      }
    }

    fetch(`/api/hospitals/${hospId}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ departments: updatedDepts })
    }).catch(e => console.warn('Failed to sync departments to server:', e));

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalDepartments: { [hospId]: updatedDepts }
      })
    }).catch(() => {});

    broadcastGlobalSync('HOSPITAL_DEPARTMENTS_UPDATED', {
      hospitalId: hospId,
      departments: patientDepts,
      rawDepartments: updatedDepts
    });
  };

  // Doctors
  const addDoctor = (doc: Omit<HospitalDoctor, 'id' | 'totalPatients' | 'rating'>) => {
    let updatedDocsList: HospitalDoctor[] = [];
    setDoctors(prev => {
      const newDocId = `doc-${Date.now()}`;
      const sessions = doc.sessions && doc.sessions.length > 0 ? doc.sessions : [
        { id: `sess-${newDocId}-1`, name: 'Morning', startTime: doc.opdStartTime || '09:00 AM', endTime: doc.opdEndTime || '01:00 PM', maxTokens: Math.round(((Number(doc.maxTokensPerDay) || 50) * 0.6)) || 30, consultationDuration: Number(doc.consultationDuration) || 15, breakTime: 5, active: true },
        { id: `sess-${newDocId}-2`, name: 'Evening', startTime: '05:00 PM', endTime: '09:00 PM', maxTokens: Math.round(((Number(doc.maxTokensPerDay) || 50) * 0.4)) || 20, consultationDuration: Number(doc.consultationDuration) || 15, breakTime: 5, active: true }
      ];
      const newDoc: HospitalDoctor = {
        ...doc,
        id: newDocId,
        totalPatients: 0,
        rating: 5.0,
        sessions
      };
      const updated = [...prev, newDoc];
      updatedDocsList = updated;
      return updated;
    });
    if (updatedDocsList.length > 0) {
      syncDoctorsGlobally(updatedDocsList);
    }
  };

  const updateDoctor = (id: string, updates: Partial<HospitalDoctor>) => {
    let updatedDocsList: HospitalDoctor[] = [];
    setDoctors(prev => {
      const updated = prev.map(d => {
        if (d.id !== id) return d;
        const merged = { ...d, ...updates };
        if (!merged.sessions || merged.sessions.length === 0 || updates.opdStartTime || updates.opdEndTime) {
          merged.sessions = [
            { id: `sess-${d.id}-1`, name: 'Morning', startTime: merged.opdStartTime || '09:00 AM', endTime: '01:00 PM', maxTokens: Math.round((Number(merged.maxTokensPerDay || 50) * 0.6)) || 30, consultationDuration: Number(merged.consultationDuration || 15), breakTime: 5, active: true },
            { id: `sess-${d.id}-2`, name: 'Evening', startTime: '05:00 PM', endTime: merged.opdEndTime || '09:00 PM', maxTokens: Math.round((Number(merged.maxTokensPerDay || 50) * 0.4)) || 20, consultationDuration: Number(merged.consultationDuration || 15), breakTime: 5, active: true }
          ];
        }
        return merged;
      });
      updatedDocsList = updated;
      return updated;
    });
    if (updatedDocsList.length > 0) {
      syncDoctorsGlobally(updatedDocsList);
    }
  };

  const deleteDoctor = (id: string) => {
    let updatedDocsList: HospitalDoctor[] = [];
    setDoctors(prev => {
      const updated = prev.filter(d => d.id !== id);
      updatedDocsList = updated;
      return updated;
    });
    if (updatedDocsList.length >= 0) {
      syncDoctorsGlobally(updatedDocsList);
    }
    const hospId = targetHospId || hospitalUser?.hospitalId || localStorage.getItem('insta_current_hospital_id') || 'hosp-apollo';
    const token = authToken || localStorage.getItem('insta_hospital_auth_token') || `htok_${hospId}_default`;
    fetch(`/api/hospitals/${hospId}/doctors/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(e => console.warn('Failed to delete doctor on AWS RDS:', e));
  };

  const toggleDoctorActive = (id: string) => {
    let updatedDocsList: HospitalDoctor[] = [];
    setDoctors(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, active: !d.active } : d);
      updatedDocsList = updated;
      return updated;
    });
    if (updatedDocsList.length > 0) {
      syncDoctorsGlobally(updatedDocsList);
    }
  };

  // Departments
  const addDepartment = (dept: Omit<HospitalDepartment, 'id'>) => {
    let updatedDeptsList: HospitalDepartment[] = [];
    setDepartments(prev => {
      const updated = [...prev, { ...dept, id: `dept-${Date.now()}` }];
      updatedDeptsList = updated;
      return updated;
    });
    if (updatedDeptsList.length > 0) {
      syncDepartmentsGlobally(updatedDeptsList);
    }
  };

  const updateDepartment = (id: string, updates: Partial<HospitalDepartment>) => {
    let updatedDeptsList: HospitalDepartment[] = [];
    setDepartments(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, ...updates } : d);
      updatedDeptsList = updated;
      return updated;
    });
    if (updatedDeptsList.length > 0) {
      syncDepartmentsGlobally(updatedDeptsList);
    }
  };

  const deleteDepartment = (id: string) => {
    let updatedDeptsList: HospitalDepartment[] = [];
    setDepartments(prev => {
      const updated = prev.filter(d => d.id !== id);
      updatedDeptsList = updated;
      return updated;
    });
    if (updatedDeptsList.length >= 0) {
      syncDepartmentsGlobally(updatedDeptsList);
    }
    const hospId = targetHospId || hospitalUser?.hospitalId || localStorage.getItem('insta_current_hospital_id') || 'hosp-apollo';
    const token = authToken || localStorage.getItem('insta_hospital_auth_token') || `htok_${hospId}_default`;
    fetch(`/api/hospitals/${hospId}/departments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(e => console.warn('Failed to delete department on AWS RDS:', e));
  };

  const toggleDepartmentActive = (id: string) => {
    let updatedDeptsList: HospitalDepartment[] = [];
    setDepartments(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, active: !d.active } : d);
      updatedDeptsList = updated;
      return updated;
    });
    if (updatedDeptsList.length > 0) {
      syncDepartmentsGlobally(updatedDeptsList);
    }
  };

  // Staff & Employees
  const addStaffMember = (member: Omit<HospitalStaffMember, 'id' | 'attendance'>) => {
    const newStaff: HospitalStaffMember = {
      ...member,
      id: `staff-${Date.now()}`,
      attendance: [
        { date: new Date().toISOString().split('T')[0], status: 'present', checkIn: '09:00 AM' }
      ]
    };
    setStaff(prev => [newStaff, ...prev]);
  };

  const updateStaffMember = (id: string, updates: Partial<HospitalStaffMember>) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStaffMember = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const markStaffAttendance = (
    staffId: string,
    date: string,
    status: StaffAttendanceRecord['status'],
    checkIn?: string,
    checkOut?: string,
    notes?: string
  ) => {
    setStaff(prev => prev.map(s => {
      if (s.id !== staffId) return s;
      const existingIdx = s.attendance.findIndex(a => a.date === date);
      let updatedAttendance = [...s.attendance];
      if (existingIdx >= 0) {
        updatedAttendance[existingIdx] = {
          ...updatedAttendance[existingIdx],
          status,
          checkIn: checkIn || updatedAttendance[existingIdx].checkIn,
          checkOut: checkOut || updatedAttendance[existingIdx].checkOut,
          notes: notes || updatedAttendance[existingIdx].notes
        };
      } else {
        updatedAttendance.push({ date, status, checkIn, checkOut, notes });
      }
      return { ...s, attendance: updatedAttendance };
    }));
  };

  // Tokens
  const generateWalkInToken = (form: {
    patientName: string;
    patientPhone: string;
    patientAge: number;
    patientGender: string;
    address?: string;
    departmentId: string;
    doctorId: string;
    session: 'morning' | 'afternoon' | 'evening';
    isRevisit?: boolean;
    notes?: string;
  }): TokenRecord => {
    const maxToken = tokens.length > 0 ? Math.max(...tokens.map(t => t.tokenNo || 0)) : 0;
    const doctor = doctors.find(d => d.id === form.doctorId);
    const dept = departments.find(d => d.id === form.departmentId);
    const waitingInSession = tokens.filter(t => t.session === form.session && ['booked','waiting','checked-in'].includes(t.status)).length;
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newToken: TokenRecord = {
      id: `tok-${Date.now()}`,
      tokenNo: maxToken + 1,
      type: 'offline',
      patientName: form.patientName,
      patientPhone: form.patientPhone,
      patientAge: form.patientAge,
      patientGender: form.patientGender,
      doctorId: form.doctorId,
      doctorName: doctor?.name || '',
      departmentId: form.departmentId,
      departmentName: dept?.name || '',
      session: form.session,
      time: timeStr,
      bookingDate: todayStr,
      status: 'booked',
      queuePosition: waitingInSession + 1,
      estimatedWait: (waitingInSession + 1) * (doctor?.consultationDuration || 12),
      consultationFee: doctor?.consultationFee || 0,
      paymentStatus: 'pending',
      paymentMethod: 'Cash',
      isRevisit: false,
      hospitalId: targetHospId
    };

    const updated = [newToken, ...tokens];
    setTokens(updated);
    localStorage.setItem('insta_hospital_tokens', JSON.stringify(updated));
    localStorage.setItem(`insta_hospital_tokens_${targetHospId}`, JSON.stringify(updated));

    // Post token to backend with authorization header (Phase 21 & 22)
    fetch(`/api/hospitals/${targetHospId}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(newToken)
    }).catch(() => {});

    // Automatically create / link patient customer account
    if (getOrCreateCustomerAccount) {
      getOrCreateCustomerAccount(form.patientName, form.patientPhone);
    }

    // Also sync as appointment into patient appointment store
    try {
      const savedAppts = localStorage.getItem('insta_appointments');
      const curAppts = savedAppts ? JSON.parse(savedAppts) : [];
      const newAppt = {
        id: newToken.id,
        tokenNumber: newToken.tokenNo,
        patientName: newToken.patientName,
        age: newToken.patientAge,
        gender: newToken.patientGender,
        phone: newToken.patientPhone,
        email: '',
        address: form.address || '',
        hospitalId: targetHospId,
        hospitalName: hospitalProfile?.name || 'Apollo Spectra Hospital',
        doctorId: newToken.doctorId,
        doctorName: newToken.doctorName,
        departmentName: newToken.departmentName,
        date: todayStr,
        time: timeStr,
        fee: newToken.consultationFee,
        status: 'booked' as const,
        paymentId: `OFFLINE-${newToken.tokenNo}`,
        paymentMethod: 'Counter / Walk-in Cash',
        estimatedWaitTime: newToken.estimatedWait,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('insta_appointments', JSON.stringify([newAppt, ...curAppts]));
    } catch (e) {}

    // Register / update hospital patient record (Phase 20)
    setPatients(prev => {
      const exists = prev.some(p => p.phone === form.patientPhone);
      if (exists) {
        const updatedPatients = prev.map(p => p.phone === form.patientPhone ? {
          ...p,
          totalVisits: (p.totalVisits || 0) + 1,
          lastVisit: todayStr,
          tokenHistory: [newToken, ...(p.tokenHistory || [])],
          doctorVisits: p.doctorVisits ? (
            p.doctorVisits.some(d => d.doctorId === form.doctorId)
              ? p.doctorVisits.map(d => d.doctorId === form.doctorId ? { ...d, visitCount: d.visitCount + 1, lastVisitDate: todayStr } : d)
              : [...p.doctorVisits, { doctorId: form.doctorId, doctorName: doctor?.name || '', departmentName: dept?.name || '', visitCount: 1, lastVisitDate: todayStr }]
          ) : [{ doctorId: form.doctorId, doctorName: doctor?.name || '', departmentName: dept?.name || '', visitCount: 1, lastVisitDate: todayStr }]
        } : p);
        localStorage.setItem(`insta_hospital_patients_${targetHospId}`, JSON.stringify(updatedPatients));
        localStorage.setItem('insta_hospital_patients', JSON.stringify(updatedPatients));
        return updatedPatients;
      }
      const uhid = `APS${String(prev.length + 1001).padStart(6, '0')}`;
      const newPat: PatientRecord = {
        id: `pat-${Date.now()}`,
        uhid,
        hospitalId: targetHospId,
        name: form.patientName,
        phone: form.patientPhone,
        email: '',
        age: form.patientAge,
        gender: form.patientGender,
        bloodGroup: 'O+',
        address: form.address || '',
        city: hospitalProfile?.city || 'Bengaluru',
        pinCode: hospitalProfile?.pinCode || '',
        registeredOn: todayStr,
        totalVisits: 1,
        lastVisit: todayStr,
        familyMembers: [],
        medicalHistory: [],
        allergies: [],
        tokenHistory: [newToken],
        doctorVisits: [{ doctorId: form.doctorId, doctorName: doctor?.name || '', departmentName: dept?.name || '', visitCount: 1, lastVisitDate: todayStr }]
      };
      const updatedPatients = [newPat, ...prev];
      localStorage.setItem(`insta_hospital_patients_${targetHospId}`, JSON.stringify(updatedPatients));
      localStorage.setItem('insta_hospital_patients', JSON.stringify(updatedPatients));

      fetch(`/api/hospitals/${targetHospId}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(newPat)
      }).catch(() => {});

      return updatedPatients;
    });

    broadcastGlobalSync('HOSPITAL_TOKENS_UPDATED', updated);
    return newToken;
  };

  const updateTokenStatus = (id: string, status: TokenRecord['status']) => {
    setTokens(prev => {
      const updated = prev.map(t => t.id === id ? {
        ...t,
        status,
        paymentStatus: status === 'cancelled' ? ('refunded' as const) : status === 'completed' ? ('paid' as const) : t.paymentStatus
      } : t);
      localStorage.setItem('insta_hospital_tokens', JSON.stringify(updated));
      localStorage.setItem(`insta_hospital_tokens_${targetHospId}`, JSON.stringify(updated));
      broadcastGlobalSync('HOSPITAL_TOKENS_UPDATED', updated);
      return updated;
    });

    // Post status update to backend (Phase 21 & 22)
    fetch(`/api/hospitals/${targetHospId}/tokens/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status })
    }).catch(() => {});
  };

  const cancelToken = (id: string) => {
    updateTokenStatus(id, 'cancelled');
  };

  const deleteToken = (id: string) => {
    setTokens(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('insta_hospital_tokens', JSON.stringify(updated));
      localStorage.setItem(`insta_hospital_tokens_${targetHospId}`, JSON.stringify(updated));
      broadcastGlobalSync('HOSPITAL_TOKENS_UPDATED', updated);
      return updated;
    });
  };

  // Patients (Phase 20)
  const addPatient = (p: Omit<PatientRecord, 'id' | 'uhid' | 'registeredOn' | 'totalVisits' | 'lastVisit' | 'tokenHistory'>) => {
    const uhid = `APS${String(patients.length + 1001).padStart(6, '0')}`;
    const newPat: PatientRecord = {
      ...p,
      id: `pat-${Date.now()}`,
      uhid,
      hospitalId: targetHospId,
      registeredOn: new Date().toISOString().split('T')[0],
      totalVisits: 0,
      lastVisit: '',
      tokenHistory: [],
      doctorVisits: p.doctorVisits || []
    };
    const updated = [newPat, ...patients];
    setPatients(updated);
    localStorage.setItem(`insta_hospital_patients_${targetHospId}`, JSON.stringify(updated));
    localStorage.setItem('insta_hospital_patients', JSON.stringify(updated));

    fetch(`/api/hospitals/${targetHospId}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(newPat)
    }).catch(() => {});
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
  const updateScheduleConfig = (config: Partial<ScheduleConfig>) => {
    setScheduleConfig(prev => {
      const updated = { ...prev, ...config };
      localStorage.setItem('insta_hospital_schedule', JSON.stringify(updated));
      fetch(`/api/hospitals/${targetHospId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ schedule: updated })
      }).catch(e => console.warn('Failed to save schedule to AWS RDS:', e));
      broadcastGlobalSync('HOSPITAL_SCHEDULE_UPDATED', updated);
      return updated;
    });
  };
  const updateSession = (id: string, updates: Partial<SessionConfig>) => {
    setScheduleConfig(prev => {
      const updated = {
        ...prev,
        sessions: prev.sessions.map(s => s.id === id ? { ...s, ...updates } : s)
      };
      localStorage.setItem('insta_hospital_schedule', JSON.stringify(updated));
      fetch(`/api/hospitals/${targetHospId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ schedule: updated })
      }).catch(e => console.warn('Failed to save session to AWS RDS:', e));
      broadcastGlobalSync('HOSPITAL_SCHEDULE_UPDATED', updated);
      return updated;
    });
  };

  // Notifications
  const sendNotification = (msg: Omit<NotificationMessage, 'id' | 'sentAt' | 'status'>) => {
    setNotifications(prev => [...prev, { ...msg, id: `notif-${Date.now()}`, sentAt: new Date().toISOString(), status: 'sent' }]);
  };

  const availableHospitals = (hospitals || []).map(h => ({ id: h.id, name: h.name, category: h.category }));

  const switchHospital = (hospId: string) => {
    const target = hospitals.find(h => h.id === hospId);
    if (!target) return;

    const newAuthToken = `htok_${hospId}_default`;
    setAuthToken(newAuthToken);
    localStorage.setItem('insta_hospital_auth_token', newAuthToken);

    let customProf: HospitalProfile | null = null;
    const savedCustom = localStorage.getItem(`insta_hospital_profile_${hospId}`);
    if (savedCustom) {
      try { customProf = JSON.parse(savedCustom); } catch (e) {}
    }

    const newProfile: HospitalProfile = customProf || (hospId === 'hosp-apollo' ? {
      ...INITIAL_PROFILE,
      id: target.id,
      name: target.name,
      type: target.category || 'Multi Speciality',
      address: target.address,
      lat: target.lat,
      lng: target.lng,
      phone: target.contact || '+91 80 4668 8888',
      about: target.about || INITIAL_PROFILE.about,
      facilities: target.facilities || INITIAL_PROFILE.facilities,
      coverImage: target.image || INITIAL_PROFILE.coverImage,
      logo: target.image || INITIAL_PROFILE.logo,
    } : {
      id: target.id,
      name: target.name,
      logo: target.image || '',
      coverImage: target.image || '',
      gallery: [],
      type: target.category || 'Multi Speciality',
      ownershipType: 'Private',
      registrationNumber: `REG-${target.id}`,
      accreditation: 'NABH Verified',
      gstNumber: '',
      licenseNumber: '',
      phone: target.contact || '',
      whatsapp: '',
      email: target.email || '',
      website: '',
      emergencyNumber: target.contact || '',
      address: target.address || '',
      area: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India',
      lat: target.lat || 17.3850,
      lng: target.lng || 78.4867,
      about: target.about || `${target.name} provides comprehensive healthcare and OPD services.`,
      mission: 'To deliver compassionate and accessible healthcare.',
      vision: 'To be a center of clinical excellence.',
      brandColor: '#2563EB',
      facilities: (target.facilities && target.facilities.length > 0) ? target.facilities : [
        '24x7 Emergency & Trauma',
        'Intensive Care Unit (ICU)',
        '24x7 In-House Pharmacy',
        'Advanced Diagnostics & Lab',
        'Ambulance Service'
      ],
      emergencyServices: ['Emergency Care', 'Trauma Care'],
      timings: [
        { day: 'Mon', open: '09:00', close: '18:00' },
        { day: 'Tue', open: '09:00', close: '18:00' },
        { day: 'Wed', open: '09:00', close: '18:00' },
        { day: 'Thu', open: '09:00', close: '18:00' },
        { day: 'Fri', open: '09:00', close: '18:00' },
        { day: 'Sat', open: '09:00', close: '14:00' },
        { day: 'Sun', open: '10:00', close: '13:00' },
      ]
    });

    setHospitalProfile(newProfile);
    localStorage.setItem('insta_hospital_profile', JSON.stringify(newProfile));
    localStorage.setItem(`insta_hospital_profile_${hospId}`, JSON.stringify(newProfile));

    setHospitalUser(prev => ({
      id: `huser-${target.id}`,
      name: prev?.name || target.name || 'Hospital Admin',
      email: prev?.email || `admin@${target.id.replace('hosp-', '')}.com`,
      role: 'owner',
      hospitalId: target.id,
      hospitalName: target.name,
      avatar: prev?.avatar || '',
      isOnline: true
    }));

    // Isolate patients & tokens strictly for the newly active hospital (Phase 20 & 22)
    fetch(`/api/hospitals/${hospId}/patients`, {
      headers: { 'Authorization': `Bearer ${newAuthToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.patients)) {
          setPatients(data.patients);
          localStorage.setItem(`insta_hospital_patients_${hospId}`, JSON.stringify(data.patients));
        } else {
          const savedPats = localStorage.getItem(`insta_hospital_patients_${hospId}`);
          setPatients(savedPats ? JSON.parse(savedPats) : []);
        }
      })
      .catch(() => {
        const savedPats = localStorage.getItem(`insta_hospital_patients_${hospId}`);
        setPatients(savedPats ? JSON.parse(savedPats) : []);
      });

    // Isolate tokens for this hospital
    fetch(`/api/hospitals/${hospId}/tokens`, {
      headers: { 'Authorization': `Bearer ${newAuthToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.tokens)) {
          setTokens(data.tokens);
          localStorage.setItem(`insta_hospital_tokens_${hospId}`, JSON.stringify(data.tokens));
        }
      })
      .catch(() => {});

    localStorage.setItem('insta_current_hospital_id', hospId);

    // Isolate doctors strictly for this hospital
    const savedDocs = localStorage.getItem(`insta_hospital_doctors_${hospId}`);
    if (savedDocs) {
      try {
        setDoctors(JSON.parse(savedDocs));
      } catch (e) {
        setDoctors(hospId === 'hosp-apollo' ? INITIAL_DOCTORS : []);
      }
    } else if (hospId === 'hosp-apollo') {
      setDoctors(INITIAL_DOCTORS);
    } else if (target && target.doctors && target.doctors.length > 0) {
      const convertedDocs: HospitalDoctor[] = target.doctors.map(d => ({
        id: d.id,
        name: d.name,
        photo: d.image,
        qualification: d.qualification,
        specialization: d.specialty,
        departmentId: d.departmentId,
        departmentName: d.specialty,
        experience: d.experience,
        consultationFee: d.consultationFee,
        languages: ['English', 'Hindi'],
        gender: 'Male',
        biography: `${d.name} is a medical specialist with ${d.experience} years of clinical expertise.`,
        opdDays: d.availability?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        opdStartTime: '09:00 AM',
        opdEndTime: '05:00 PM',
        consultationDuration: d.estimatedWaitPerPatient || 15,
        maxTokensPerDay: 50,
        onlineConsult: true,
        offlineConsult: true,
        active: true,
        rating: d.rating || 5.0,
        totalPatients: d.reviewsCount || 0,
        sessions: (d.sessions || []).map((s, idx) => ({
          id: s.id || `sess-${idx}`,
          name: s.name || 'General Session',
          startTime: s.startTime || '09:00 AM',
          endTime: s.endTime || '01:00 PM',
          maxTokens: s.maxTokens || 25,
          consultationDuration: s.consultationDuration || 15,
          breakTime: s.breakTime || 0,
          active: s.active !== false
        }))
      }));
      setDoctors(convertedDocs);
      localStorage.setItem(`insta_hospital_doctors_${hospId}`, JSON.stringify(convertedDocs));
    } else {
      // New or other hospital starts with clean 0 doctors!
      setDoctors([]);
    }

    // Also fetch live doctors from backend for this hospital
    fetch(`/api/hospitals/${hospId}/doctors`, {
      headers: { 'Authorization': `Bearer ${newAuthToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.doctors)) {
          setDoctors(data.doctors);
          localStorage.setItem(`insta_hospital_doctors_${hospId}`, JSON.stringify(data.doctors));
        }
      })
      .catch(() => {});

    // Isolate departments strictly for this hospital
    const savedDepts = localStorage.getItem(`insta_hospital_departments_${hospId}`);
    if (savedDepts) {
      try {
        const parsed = JSON.parse(savedDepts);
        const finalDepts = ensureDefaultDepartments(parsed);
        setDepartments(finalDepts);
        localStorage.setItem(`insta_hospital_departments_${hospId}`, JSON.stringify(finalDepts));
      } catch (e) {
        const depts = ensureDefaultDepartments([]);
        setDepartments(depts);
        localStorage.setItem(`insta_hospital_departments_${hospId}`, JSON.stringify(depts));
      }
    } else if (target && target.departments && target.departments.length > 0) {
      const convertedDepts: HospitalDepartment[] = target.departments.map(dep => ({
        id: dep.id,
        name: dep.name,
        icon: dep.icon || '🩺',
        headDoctor: '',
        totalDoctors: (target.doctors || []).filter(d => d.departmentId === dep.id).length,
        active: true
      }));
      const finalDepts = ensureDefaultDepartments(convertedDepts);
      setDepartments(finalDepts);
      localStorage.setItem(`insta_hospital_departments_${hospId}`, JSON.stringify(finalDepts));
    } else {
      const depts = ensureDefaultDepartments([]);
      setDepartments(depts);
      localStorage.setItem(`insta_hospital_departments_${hospId}`, JSON.stringify(depts));
    }

    // Also fetch live departments from backend for this hospital
    fetch(`/api/hospitals/${hospId}/departments`, {
      headers: { 'Authorization': `Bearer ${newAuthToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.departments)) {
          const finalDepts = ensureDefaultDepartments(data.departments);
          setDepartments(finalDepts);
          localStorage.setItem(`insta_hospital_departments_${hospId}`, JSON.stringify(finalDepts));
        }
      })
      .catch(() => {});

    broadcastGlobalSync('HOSPITAL_PROFILE_UPDATED', newProfile);
  };

  // Profile
  const updateHospitalProfile = (updates: Partial<HospitalProfile>) => {
    setHospitalProfile(prev => {
      const updated = { ...prev, ...updates };
      const activeId = updated.id || targetHospId;
      localStorage.setItem('insta_hospital_profile', JSON.stringify(updated));
      localStorage.setItem(`insta_hospital_profile_${activeId}`, JSON.stringify(updated));

      // Also update hospitalUser name immediately
      if (updated.name) {
        setHospitalUser(currUser => currUser ? { ...currUser, hospitalName: updated.name } : null);
      }

      // Update AppContext hospital directly so website user side reflects immediately!
      if (updateHospital) {
        updateHospital(activeId, {
          name: updated.name,
          category: updated.type || (updated as any).category,
          address: updated.address,
          contact: updated.phone || updated.emergencyNumber,
          about: updated.about,
          facilities: updated.facilities,
          image: updated.coverImage || updated.logo,
          lat: updated.lat !== undefined ? Number(updated.lat) : undefined,
          lng: updated.lng !== undefined ? Number(updated.lng) : undefined,
        });
      }

      // Post immediately to backend endpoint with authorization header
      fetch(`/api/hospitals/${activeId}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ profile: updated })
      }).catch(e => console.warn('Failed to post profile to backend:', e));

      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalProfiles: { [activeId]: updated }
        })
      }).catch(() => {});

      broadcastGlobalSync('HOSPITAL_PROFILE_UPDATED', { hospitalId: activeId, profile: updated });
      broadcastGlobalSync('HOSPITAL_UPDATED', { hospitalId: activeId, updates: updated });
      return updated;
    });
  };

  return (
    <HospitalContext.Provider value={{
      hospitalUser, hospitalProfile, departments, doctors, staff, tokens, patients,
      scheduleConfig, notifications, activeSection, sidebarCollapsed,
      hospitalLogin, hospitalLogout,
      setActiveSection, setSidebarCollapsed,
      addDoctor, updateDoctor, deleteDoctor, toggleDoctorActive,
      addDepartment, updateDepartment, deleteDepartment, toggleDepartmentActive,
      addStaffMember, updateStaffMember, deleteStaffMember, markStaffAttendance,
      generateWalkInToken, updateTokenStatus, cancelToken, deleteToken,
      addPatient, updatePatient, searchPatients, validateToken,
      updateScheduleConfig, updateSession,
      sendNotification,
      updateHospitalProfile,
      switchHospital,
      availableHospitals,
      authToken,
      fetchPatients,
      fetchHospitalRevenue
    }}>
      {children}
    </HospitalContext.Provider>
  );
};
