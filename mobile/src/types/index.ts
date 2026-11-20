export interface DoctorSession {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxTokens?: number;
  consultationDuration?: number;
  breakTime?: number;
  active: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  departmentId: string;
  qualification: string;
  experience: number;
  consultationFee: number;
  rating: number;
  reviewsCount: number;
  image: string;
  availability: {
    days: string[];
    slots: string[];
  };
  currentQueue: number;
  nextAvailableToken: number;
  estimatedWaitPerPatient: number;
  sessions?: DoctorSession[];
  opdDays?: string[];
  active?: boolean;
}

export interface Department {
  id: string;
  name: string;
  icon: string;
}

export interface Hospital {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category: string;
  rating: number;
  reviewsCount: number;
  distance: number;
  baseWaitingTime: number;
  address: string;
  image: string;
  gallery?: string[];
  about?: string;
  facilities?: string[];
  departments: Department[];
  doctors: Doctor[];
  timings?: string;
  contact?: string;
  emergencyContact?: string;
  whatsapp?: string;
  city?: string;
  village?: string;
  area?: string;
  lat: number;
  lng: number;
  payment_mode?: 'token_only' | 'full_online' | string;
  paymentMode?: 'token_only' | 'full_online' | string;
}

export interface Appointment {
  id: string;
  tokenNumber: number;
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  departmentName: string;
  date: string;
  time: string;
  fee: number;
  tokenFee?: number;
  platformFee?: number;
  totalFee?: number;
  collectionMode?: 'full_online' | 'token_only';
  status: 'booked' | 'waiting' | 'calling' | 'checked-in' | 'in-cabin' | 'completed' | 'cancelled';
  session?: 'morning' | 'afternoon' | 'evening' | string;
  paymentId?: string;
  paymentMethod?: string;
  estimatedWaitTime?: number;
  bookingRef?: string;
}

export interface MedicalRecord {
  id: string;
  name: string;
  category: 'Prescription' | 'Lab Test' | 'Consultation' | 'Scan & X-Ray' | 'Discharge Summary' | 'Other';
  doctor: string;
  hospital: string;
  date: string;
  fileType: 'PDF' | 'IMAGE' | 'DOC';
  fileName: string;
  fileSize?: string;
  fileUrl?: string;
  notes?: string;
  uploadedAt: string;
}

export interface UserAccount {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: 'patient' | 'hospital';
  hospitalId?: string;
}
