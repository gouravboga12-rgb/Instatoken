import React, { createContext, useContext, useState, useEffect } from 'react';
import { HOSPITALS, DEPARTMENTS, HEALTH_ARTICLES } from '../utils/mockData';
import type { Hospital, Doctor, HealthArticle } from '../utils/mockData';

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  gender: string;
  relationship: string;
}

export interface Subscription {
  planName: string;
  expiresAt: string;
  price: number;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: 'patient' | 'admin';
  savedHospitals: string[];
  familyMembers: FamilyMember[];
  subscription: Subscription | null;
}

export interface Appointment {
  id: string;
  tokenNumber: number;
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  departmentName: string;
  date: string;
  time: string;
  fee: number;
  status: 'booked' | 'completed' | 'cancelled';
  paymentId: string;
  paymentMethod: string;
  estimatedWaitTime: number; // in minutes
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: string;
  read: boolean;
}

interface AppContextType {
  user: UserProfile | null;
  hospitals: Hospital[];
  articles: HealthArticle[];
  appointments: Appointment[];
  notifications: AppNotification[];
  currentLocation: string;
  setCurrentLocation: (loc: string) => void;
  login: (emailOrPhone: string, passwordOrOtp: string) => boolean;
  signup: (name: string, email: string, phone: string) => boolean;
  logout: () => void;
  addFamilyMember: (name: string, age: number, gender: string, relationship: string) => void;
  removeFamilyMember: (id: string) => void;
  toggleSaveHospital: (hospitalId: string) => void;
  bookToken: (
    patientDetails: { name: string; age: number; gender: string; phone: string; email: string; address: string },
    hospitalId: string,
    doctorId: string,
    date: string,
    time: string,
    paymentMethod: string
  ) => Appointment;
  cancelAppointment: (id: string) => void;
  advanceQueue: (hospitalId: string, doctorId: string) => void;
  addHospital: (hospital: Omit<Hospital, 'id' | 'rating' | 'reviewsCount' | 'distance' | 'doctors'>) => void;
  addDoctor: (hospitalId: string, doctor: Omit<Doctor, 'id' | 'rating' | 'reviewsCount' | 'currentQueue' | 'nextAvailableToken'>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info' | 'warning') => void;
  clearNotifications: () => void;
  markNotificationsAsRead: () => void;
  purchaseSubscription: (planName: string, price: number, durationDays: number) => void;
  detectAndSetLocation: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- States ---
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('insta_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.subscription === undefined) {
        parsed.subscription = {
          planName: "3-Day Pass",
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          price: 10
        };
      }
      return parsed;
    }
    return {
      name: "Guest Patient",
      email: "patient@example.com",
      phone: "+91 9876543210",
      role: "patient",
      savedHospitals: ["hosp-apollo"],
      familyMembers: [
        { id: "fam-1", name: "Ramesh Sharma", age: 58, gender: "Male", relationship: "Father" },
        { id: "fam-2", name: "Kanta Sharma", age: 52, gender: "Female", relationship: "Mother" }
      ],
      subscription: {
        planName: "3-Day Pass",
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        price: 10
      }
    };
  });

  const [hospitals, setHospitals] = useState<Hospital[]>(() => {
    const saved = localStorage.getItem('insta_hospitals');
    return saved ? JSON.parse(saved) : HOSPITALS;
  });

  const [articles] = useState<HealthArticle[]>(HEALTH_ARTICLES);

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('insta_appointments');
    return saved ? JSON.parse(saved) : [
      {
        id: "tok-1001",
        tokenNumber: 4,
        patientName: "Guest Patient",
        age: 28,
        gender: "Male",
        phone: "+91 9876543210",
        email: "patient@example.com",
        address: "Koramangala, Bengaluru",
        hospitalId: "hosp-apollo",
        hospitalName: "Apollo Spectra Hospital",
        doctorId: "doc-arvind",
        doctorName: "Dr. Arvind Sharma",
        departmentName: "Cardiology",
        date: new Date().toISOString().split('T')[0],
        time: "10:30 AM",
        fee: 800,
        status: "completed",
        paymentId: "PAYID-7849204",
        paymentMethod: "UPI",
        estimatedWaitTime: 0,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('insta_notifications');
    return saved ? JSON.parse(saved) : [
      {
        id: "notif-1",
        title: "Welcome to InstaToken!",
        message: "Book digital OPD tokens and skip waiting lines at hospitals near you.",
        type: "info",
        timestamp: new Date().toLocaleString(),
        read: false
      }
    ];
  });

  const [currentLocation, setCurrentLocation] = useState<string>(() => {
    return localStorage.getItem('insta_location') || "Koramangala, Bengaluru";
  });

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('insta_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('insta_hospitals', JSON.stringify(hospitals));
  }, [hospitals]);

  useEffect(() => {
    localStorage.setItem('insta_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('insta_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('insta_location', currentLocation);
  }, [currentLocation]);

  // --- Dynamic Simulation: Advance Queue in Background ---
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulating a live hospital system where random doctor queues advance
      setHospitals(prevHospitals => {
        return prevHospitals.map(hosp => {
          // 25% chance a random doctor in this hospital moves to next token
          const updatedDoctors = hosp.doctors.map(doc => {
            if (Math.random() < 0.15 && doc.currentQueue < doc.nextAvailableToken - 1) {
              const newCurrent = doc.currentQueue + 1;
              // Check if any active user appointments match this doctor & token
              setTimeout(() => {
                const affectedAppts = appointments.filter(
                  appt => appt.hospitalId === hosp.id && appt.doctorId === doc.id && appt.tokenNumber === newCurrent && appt.status === 'booked'
                );
                affectedAppts.forEach(appt => {
                  addNotification(
                    "Your Turn is Next!",
                    `Token #${appt.tokenNumber} for Dr. ${doc.name} at ${hosp.name} is now ACTIVE. Please proceed to the cabin.`,
                    "warning"
                  );
                });
              }, 100);

              return { ...doc, currentQueue: newCurrent };
            }
            return doc;
          });
          return { ...hosp, doctors: updatedDoctors };
        });
      });
    }, 45000); // Check/advance every 45s

    return () => clearInterval(interval);
  }, [appointments]);

  // --- Auth Functions ---
  const login = (emailOrPhone: string, passwordOrOtp: string): boolean => {
    if (emailOrPhone.includes('admin') || passwordOrOtp === 'admin') {
      setUser({
        name: "Admin Officer",
        email: "admin@instatoken.com",
        phone: "+91 9999999999",
        role: "admin",
        savedHospitals: [],
        familyMembers: [],
        subscription: null
      });
      addNotification("Logged in as Admin", "Welcome to the InstaToken Central Command.", "success");
      return true;
    } else {
      setUser({
        name: "Guest Patient",
        email: emailOrPhone.includes('@') ? emailOrPhone : "patient@example.com",
        phone: !emailOrPhone.includes('@') ? emailOrPhone : "+91 9876543210",
        role: "patient",
        savedHospitals: ["hosp-apollo"],
        familyMembers: [
          { id: "fam-1", name: "Ramesh Sharma", age: 58, gender: "Male", relationship: "Father" },
          { id: "fam-2", name: "Kanta Sharma", age: 52, gender: "Female", relationship: "Mother" }
        ],
        subscription: {
          planName: "3-Day Pass",
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          price: 10
        }
      });
      addNotification("Logged in Successfully", "Welcome back! Keep track of your booking history.", "success");
      return true;
    }
  };

  const signup = (name: string, email: string, phone: string): boolean => {
    setUser({
      name,
      email,
      phone,
      role: 'patient',
      savedHospitals: [],
      familyMembers: [],
      subscription: null
    });
    addNotification("Account Created", `Welcome ${name}! Start booking digital OPD tokens now.`, "success");
    return true;
  };

  const logout = () => {
    setUser(null);
    addNotification("Logged Out", "You have successfully logged out of your account.", "info");
  };

  // --- Profile / Family Members ---
  const addFamilyMember = (name: string, age: number, gender: string, relationship: string) => {
    if (!user) return;
    const newMember: FamilyMember = {
      id: `fam-${Date.now()}`,
      name,
      age,
      gender,
      relationship
    };
    setUser(prev => prev ? {
      ...prev,
      familyMembers: [...prev.familyMembers, newMember]
    } : null);
    addNotification("Family Member Added", `${name} has been added to your profile.`, "success");
  };

  const removeFamilyMember = (id: string) => {
    if (!user) return;
    setUser(prev => prev ? {
      ...prev,
      familyMembers: prev.familyMembers.filter(m => m.id !== id)
    } : null);
    addNotification("Family Member Removed", "The family member details were removed.", "info");
  };

  const toggleSaveHospital = (hospitalId: string) => {
    if (!user) return;
    const isSaved = user.savedHospitals.includes(hospitalId);
    const updated = isSaved
      ? user.savedHospitals.filter(id => id !== hospitalId)
      : [...user.savedHospitals, hospitalId];

    setUser(prev => prev ? { ...prev, savedHospitals: updated } : null);
    addNotification(
      isSaved ? "Removed from Favorites" : "Added to Favorites",
      isSaved ? "Hospital removed from your saved list." : "Hospital bookmarked for quick booking.",
      "info"
    );
  };

  // --- Book Token ---
  const bookToken = (
    patientDetails: { name: string; age: number; gender: string; phone: string; email: string; address: string },
    hospitalId: string,
    doctorId: string,
    date: string,
    time: string,
    paymentMethod: string
  ): Appointment => {
    const targetHosp = hospitals.find(h => h.id === hospitalId);
    const targetDoc = targetHosp?.doctors.find(d => d.id === doctorId);

    if (!targetHosp || !targetDoc) {
      throw new Error("Hospital or Doctor not found");
    }

    const tokenAssigned = targetDoc.nextAvailableToken;
    const patientsAhead = tokenAssigned - targetDoc.currentQueue - 1;
    const computedWaitTime = Math.max(0, patientsAhead * targetDoc.estimatedWaitPerPatient);

    const newAppt: Appointment = {
      id: `tok-${Date.now().toString().slice(-4)}`,
      tokenNumber: tokenAssigned,
      patientName: patientDetails.name,
      age: patientDetails.age,
      gender: patientDetails.gender,
      phone: patientDetails.phone,
      email: patientDetails.email,
      address: patientDetails.address,
      hospitalId,
      hospitalName: targetHosp.name,
      doctorId,
      doctorName: targetDoc.name,
      departmentName: DEPARTMENTS.find(d => d.id === targetDoc.departmentId)?.name || "General Medicine",
      date,
      time,
      fee: targetDoc.consultationFee,
      status: 'booked',
      paymentId: `PAYID-${Math.floor(1000000 + Math.random() * 9000000)}`,
      paymentMethod,
      estimatedWaitTime: computedWaitTime,
      createdAt: new Date().toISOString()
    };

    // Update doctor's token state in the local hospital store
    setHospitals(prev => prev.map(h => {
      if (h.id === hospitalId) {
        return {
          ...h,
          doctors: h.doctors.map(d => {
            if (d.id === doctorId) {
              return { ...d, nextAvailableToken: d.nextAvailableToken + 1 };
            }
            return d;
          })
        };
      }
      return h;
    }));

    setAppointments(prev => [newAppt, ...prev]);

    addNotification(
      "OPD Token Booked!",
      `Your token #${tokenAssigned} for Dr. ${targetDoc.name} is confirmed. Est. wait: ${computedWaitTime} mins.`,
      "success"
    );

    return newAppt;
  };

  const cancelAppointment = (id: string) => {
    setAppointments(prev => prev.map(appt => {
      if (appt.id === id) {
        // Send notification
        addNotification(
          "Appointment Cancelled",
          `Token #${appt.tokenNumber} for Dr. ${appt.doctorName} was cancelled. Refund processed.`,
          "warning"
        );
        return { ...appt, status: 'cancelled' };
      }
      return appt;
    }));
  };

  // --- Admin Methods ---
  const advanceQueue = (hospitalId: string, doctorId: string) => {
    setHospitals(prev => prev.map(h => {
      if (h.id === hospitalId) {
        return {
          ...h,
          doctors: h.doctors.map(d => {
            if (d.id === doctorId) {
              const nextQueue = d.currentQueue + 1;
              if (nextQueue >= d.nextAvailableToken) {
                // Queue empty
                addNotification("Queue Empty", `All patients served for Dr. ${d.name}.`, "info");
                return d;
              }

              // Notify the patient whose token is now current
              setTimeout(() => {
                const matched = appointments.find(
                  appt => appt.hospitalId === hospitalId && appt.doctorId === doctorId && appt.tokenNumber === nextQueue && appt.status === 'booked'
                );
                if (matched) {
                  addNotification(
                    "Your Turn Now!",
                    `Dr. ${d.name} is calling Token #${nextQueue}. Please proceed inside.`,
                    "warning"
                  );
                }
              }, 100);

              return { ...d, currentQueue: nextQueue };
            }
            return d;
          })
        };
      }
      return h;
    }));
  };

  const addHospital = (hosp: Omit<Hospital, 'id' | 'rating' | 'reviewsCount' | 'distance' | 'doctors'>) => {
    const newHosp: Hospital = {
      ...hosp,
      id: `hosp-${Date.now()}`,
      rating: 5.0,
      reviewsCount: 1,
      distance: parseFloat((Math.random() * 5 + 1).toFixed(1)),
      doctors: []
    };
    setHospitals(prev => [...prev, newHosp]);
    addNotification("Hospital Registered", `${hosp.name} added to the platform.`, "success");
  };

  const addDoctor = (hospitalId: string, doc: Omit<Doctor, 'id' | 'rating' | 'reviewsCount' | 'currentQueue' | 'nextAvailableToken'>) => {
    const newDoc: Doctor = {
      ...doc,
      id: `doc-${Date.now()}`,
      rating: 5.0,
      reviewsCount: 1,
      currentQueue: 0,
      nextAvailableToken: 1
    };

    setHospitals(prev => prev.map(h => {
      if (h.id === hospitalId) {
        return {
          ...h,
          doctors: [...h.doctors, newDoc]
        };
      }
      return h;
    }));
    addNotification("Doctor Registered", `Dr. ${doc.name} assigned to hospital.`, "success");
  };

  // --- Notification Helpers ---
  const addNotification = (title: string, message: string, type: 'success' | 'info' | 'warning') => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const purchaseSubscription = (planName: string, price: number, durationDays: number) => {
    if (!user) return;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    setUser(prev => prev ? {
      ...prev,
      subscription: {
        planName,
        expiresAt,
        price
      }
    } : null);
    addNotification(
      "Booking Pass Active", 
      `Your ${planName} is now active. Expires on ${new Date(expiresAt).toLocaleDateString()}.`, 
      "success"
    );
  };

  // Haversine formula — geodesic distance in km between two coordinates
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // City centroids mapped to our location picker labels
  const CITY_CENTROIDS = [
    { label: "Koramangala, Bengaluru", lat: 12.9352, lng: 77.6244 },
    { label: "HSR Layout, Bengaluru", lat: 12.9081, lng: 77.6476 },
    { label: "Gachibowli, Hyderabad", lat: 17.4401, lng: 78.3489 },
    { label: "ITI Road, Vijayawada", lat: 16.5062, lng: 80.6480 },
    { label: "Ram Nagar, Visakhapatnam", lat: 17.7230, lng: 83.3012 },
    { label: "Indiranagar, Bengaluru", lat: 12.9784, lng: 77.6408 },
    { label: "Jayanagar, Bengaluru", lat: 12.9258, lng: 77.5933 },
  ];

  const detectAndSetLocation = () => {
    if (!navigator.geolocation) {
      addNotification("Location Error", "Your browser does not support GPS location detection.", "warning");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let nearest = CITY_CENTROIDS[0];
        let minDist = haversineDistance(latitude, longitude, nearest.lat, nearest.lng);
        for (const city of CITY_CENTROIDS) {
          const dist = haversineDistance(latitude, longitude, city.lat, city.lng);
          if (dist < minDist) {
            minDist = dist;
            nearest = city;
          }
        }
        setCurrentLocation(nearest.label);
        addNotification(
          "Location Detected",
          `Your area has been set to ${nearest.label} (${Math.round(minDist)} km from GPS position).`,
          "success"
        );
      },
      (err) => {
        const msg = err.code === 1
          ? "Location permission was denied. Please allow access in browser settings."
          : "Unable to retrieve your location. Please try again.";
        addNotification("Location Error", msg, "warning");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <AppContext.Provider value={{
      user,
      hospitals,
      articles,
      appointments,
      notifications,
      currentLocation,
      setCurrentLocation,
      login,
      signup,
      logout,
      addFamilyMember,
      removeFamilyMember,
      toggleSaveHospital,
      bookToken,
      cancelAppointment,
      advanceQueue,
      addHospital,
      addDoctor,
      addNotification,
      clearNotifications,
      markNotificationsAsRead,
      purchaseSubscription,
      detectAndSetLocation
    }}>
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
