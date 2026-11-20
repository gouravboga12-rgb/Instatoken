import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { Hospital, Appointment, MedicalRecord, Doctor } from '../types';
import { useAuth } from './AuthContext';

interface AppContextType {
  hospitals: Hospital[];
  loading: boolean;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  myBookings: Appointment[];
  activeToken: Appointment | null;
  refreshHospitals: () => Promise<void>;
  bookAppointment: (bookingData: any) => Promise<{ success: boolean; appointment?: Appointment; message?: string }>;
  cancelAppointment: (id: string) => Promise<boolean>;
  records: MedicalRecord[];
  addRecord: (record: Omit<MedicalRecord, 'id' | 'uploadedAt'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const [myBookings, setMyBookings] = useState<Appointment[]>([]);
  const [activeToken, setActiveToken] = useState<Appointment | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchHospitals(),
      loadStoredBookings(),
      loadStoredRecords(),
    ]);
    setLoading(false);
  };

  const fetchHospitals = async () => {
    try {
      const res = await apiClient.get('/cloud-sync');
      if (res.data && res.data.hospitals) {
        setHospitals(res.data.hospitals);
      } else {
        const fallback = await apiClient.get('/hospitals');
        if (fallback.data) {
          setHospitals(fallback.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch hospitals from server, checking fallback:', err);
    }
  };

  const loadStoredBookings = async () => {
    try {
      const stored = await AsyncStorage.getItem(`user_bookings_${user?.id || 'guest'}`);
      if (stored) {
        const parsed: Appointment[] = JSON.parse(stored);
        setMyBookings(parsed);
        // Find latest active booking
        const active = parsed.find(b => b.status === 'booked' || b.status === 'waiting' || b.status === 'calling');
        setActiveToken(active || null);
      }
    } catch (e) {
      console.warn('Error reading bookings:', e);
    }
  };

  const loadStoredRecords = async () => {
    try {
      const stored = await AsyncStorage.getItem(`user_records_${user?.id || 'guest'}`);
      if (stored) {
        setRecords(JSON.parse(stored));
      } else {
        // Default initial demo prescription
        const initial: MedicalRecord[] = [
          {
            id: 'rec-1',
            name: 'General Consultation Prescription',
            category: 'Prescription',
            doctor: 'Dr. Gaurav Boga',
            hospital: 'Gandi Hospital',
            date: '20 Nov 2026',
            fileType: 'PDF',
            fileName: 'Prescription_GandiHospital.pdf',
            uploadedAt: new Date().toISOString(),
          }
        ];
        setRecords(initial);
      }
    } catch (e) {
      console.warn('Error reading records:', e);
    }
  };

  const bookAppointment = async (bookingData: any) => {
    try {
      const res = await apiClient.post('/appointments', bookingData);
      if (res.data && (res.data.success || res.data.appointment)) {
        const appt: Appointment = res.data.appointment || {
          ...bookingData,
          id: res.data.id || `apt-${Date.now()}`,
          tokenNumber: res.data.tokenNumber || Math.floor(Math.random() * 30) + 1,
          status: 'booked',
        };

        const updated = [appt, ...myBookings];
        setMyBookings(updated);
        setActiveToken(appt);
        await AsyncStorage.setItem(`user_bookings_${user?.id || 'guest'}`, JSON.stringify(updated));
        return { success: true, appointment: appt };
      }
      return { success: false, message: res.data?.message || 'Booking failed' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Could not complete booking. Please try again.',
      };
    }
  };

  const cancelAppointment = async (id: string) => {
    try {
      await apiClient.delete(`/appointments/${id}`);
    } catch (e) {
      // ignore
    }
    const updated = myBookings.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b);
    setMyBookings(updated);
    if (activeToken?.id === id) {
      setActiveToken(null);
    }
    await AsyncStorage.setItem(`user_bookings_${user?.id || 'guest'}`, JSON.stringify(updated));
    return true;
  };

  const addRecord = async (record: Omit<MedicalRecord, 'id' | 'uploadedAt'>) => {
    const newRec: MedicalRecord = {
      ...record,
      id: `rec-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    const updated = [newRec, ...records];
    setRecords(updated);
    await AsyncStorage.setItem(`user_records_${user?.id || 'guest'}`, JSON.stringify(updated));
  };

  return (
    <AppContext.Provider
      value={{
        hospitals,
        loading,
        selectedCity,
        setSelectedCity,
        myBookings,
        activeToken,
        refreshHospitals: fetchHospitals,
        bookAppointment,
        cancelAppointment,
        records,
        addRecord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
