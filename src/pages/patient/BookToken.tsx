import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateDistanceKm, reverseGeocode } from '../../utils/googleMaps';
import { subscribeGlobalSync } from '../../utils/syncBus';
import { isSessionExpiredInIST } from '../../utils/timeZone';
import { Button } from '../../components/ui/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, User, Phone, 
  MapPin, ShieldCheck, Sun, Moon, Zap, Users,
  ChevronDown, Heart, Stethoscope, UserX, Receipt, Info, Lock, Building2,
  Navigation, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Helper to ensure Razorpay checkout script is loaded
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdaysList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getTodayDateStr = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
};

const formatDateOption = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, monthIdx, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = d.toDateString() === today.toDateString();

    return {
      label: isToday ? 'Today' : weekdaysList[d.getDay()],
      dayNum: String(day),
      month: monthsList[monthIdx],
      dateStr: dateStr
    };
  }
  return null;
};



export const BookToken: React.FC = () => {
  const { hospitalId, doctorId } = useParams<{ hospitalId: string; doctorId: string }>();
  const { hospitals, user, toggleSaveDoctor, platformFeePercent, userCoords, currentLocation, bookToken, purchaseSubscription } = useApp();
  const navigate = useNavigate();

  const hospital = hospitals.find(h => h.id === hospitalId) || hospitals[0];
  const doctor = hospital?.doctors.find(d => d.id === doctorId) || hospital?.doctors[0];

  const [syncVersion, setSyncVersion] = useState(0);
  const [livePaymentMode, setLivePaymentMode] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeGlobalSync((event: any) => {
      setSyncVersion(v => v + 1);
      if (event?.type === 'HOSPITAL_UPDATED' && event?.payload?.payment_mode) {
        setLivePaymentMode(event.payload.payment_mode);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch real-time payment mode directly from backend on mount and sync changes
  useEffect(() => {
    if (!hospitalId) return;
    let isMounted = true;
    fetch(`/api/hospitals/${hospitalId}/public-payment-settings`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.payment_mode) {
          setLivePaymentMode(data.payment_mode);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [hospitalId, syncVersion]);

  // Dynamic Sessions prioritized per Doctor
  const activeSessionsList = useMemo(() => {
    // 1. Check localStorage insta_hospital_doctors for this specific doctor first
    if (typeof window !== 'undefined' && doctor?.id) {
      try {
        const savedDocs = localStorage.getItem('insta_hospital_doctors');
        if (savedDocs) {
          const parsed = JSON.parse(savedDocs);
          const found = parsed.find((d: any) => d.id === doctor.id);
          if (found?.sessions && found.sessions.length > 0) {
            const acts = found.sessions.filter((s: any) => s.active);
            if (acts.length > 0) return acts;
          }
        }
      } catch (e) {}
    }

    // 2. Prioritize direct doctor-specific sessions
    if (doctor?.sessions && doctor.sessions.length > 0) {
      const acts = doctor.sessions.filter((s: any) => s.active);
      if (acts.length > 0) return acts;
    }

    // 3. Fallback to general hospital schedule if available
    const rawSchedule = typeof window !== 'undefined' ? localStorage.getItem('insta_hospital_schedule') : null;
    if (rawSchedule) {
      try {
        const parsed = JSON.parse(rawSchedule);
        if (parsed?.sessions?.length > 0) {
          const acts = parsed.sessions.filter((s: any) => s.active);
          if (acts.length > 0) return acts;
        }
      } catch (e) {}
    }

    return [
      { id: 'sess-1', name: 'Morning', startTime: '09:00 AM', endTime: '01:00 PM', active: true },
      { id: 'sess-2', name: 'Evening', startTime: '05:00 PM', endTime: '09:00 PM', active: true },
    ];
  }, [doctor, hospitals, syncVersion]);

  interface SessionOptionItem {
    id: string;
    title: string;
    timing: string;
    icon: React.ReactNode;
    activeClass: string;
    iconBg: string;
    isFull: boolean;
    isExpired: boolean;
    booked: number;
    max: number;
    remaining: number;
  }

  // States
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());

  // Session Capacities: { [sessionLowerName]: { max, booked, remaining, isFull } }
  const [sessionCapacities, setSessionCapacities] = useState<Record<string, { max: number; booked: number; remaining: number; isFull: boolean }>>({});

  const sessionOptions: SessionOptionItem[] = useMemo(() => {
    return activeSessionsList.map((s: any) => {
      const isMorning = s.name.toLowerCase().includes('morn');
      const isAfternoon = s.name.toLowerCase().includes('after');
      const cap = sessionCapacities[s.name.toLowerCase()];
      const isFull = cap?.isFull || false;
      const booked = cap?.booked ?? 0;
      const max = cap?.max ?? s.maxTokens ?? (isMorning ? 30 : 20);
      const remaining = cap?.remaining ?? Math.max(0, max - booked);
      const isExpired = isSessionExpiredInIST(s.endTime || s.timing || s.name, selectedDate);

      return {
        id: s.name,
        title: `${s.name} OPD`,
        timing: `${s.startTime} - ${s.endTime}`,
        icon: isMorning ? <Sun size={20} /> : isAfternoon ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />,
        activeClass: isMorning ? 'bg-amber-50/70 border-amber-400' : isAfternoon ? 'bg-orange-50/70 border-orange-400' : 'bg-blue-50/70 border-blue-500',
        iconBg: isMorning ? 'bg-amber-100 text-amber-600' : isAfternoon ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600',
        isFull,
        isExpired,
        booked,
        max,
        remaining
      };
    });
  }, [activeSessionsList, sessionCapacities, selectedDate]);

  // Resolve doctor's configured working days
  const doctorWorkingDays: string[] = useMemo(() => {
    // 1. Direct doctor opdDays
    if (Array.isArray(doctor?.opdDays) && doctor.opdDays.length > 0) return doctor.opdDays;
    // 2. Doctor availability.days
    if (Array.isArray(doctor?.availability?.days) && doctor.availability.days.length > 0) return doctor.availability.days;
    // 3. Check local storage for this hospital's doctors
    if (typeof window !== 'undefined' && hospitalId && doctor?.id) {
      try {
        const savedDocs = localStorage.getItem(`insta_hospital_doctors_${hospitalId}`) || localStorage.getItem('insta_hospital_doctors');
        if (savedDocs) {
          const parsed = JSON.parse(savedDocs);
          const found = parsed.find((d: any) => d.id === doctor.id);
          if (found?.opdDays && Array.isArray(found.opdDays) && found.opdDays.length > 0) {
            return found.opdDays;
          }
        }
      } catch (e) {}
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [doctor, hospitalId, syncVersion]);

  // Resolve Hospital Booking Rules (Unified Single Advance Booking Window)
  const [scheduleConfig, setScheduleConfig] = useState<{
    advanceBookingLimit: number;
  }>(() => {
    try {
      const saved = localStorage.getItem(`insta_hospital_schedule_${hospitalId}`) || localStorage.getItem('insta_hospital_schedule');
      if (saved) {
        const p = JSON.parse(saved);
        return {
          advanceBookingLimit: Number(p.advanceBookingLimit || p.bookingOpensDaysBefore) || 7
        };
      }
    } catch (e) {}
    return { advanceBookingLimit: 7 };
  });

  useEffect(() => {
    if (!hospitalId) return;
    fetch(`/api/hospitals/${hospitalId}/schedules`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.schedule) {
          setScheduleConfig({
            advanceBookingLimit: Number(data.schedule.advanceBookingLimit || data.schedule.bookingOpensDaysBefore) || 7
          });
        }
      })
      .catch(() => {});
  }, [hospitalId, syncVersion]);

  // How many days into the future slots can be booked (Single Unified Setting)
  const maxBookingDays = useMemo(() => {
    return Math.max(1, Number(scheduleConfig?.advanceBookingLimit) || 7);
  }, [scheduleConfig]);

  const maxAllowedDateStr = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + (maxBookingDays - 1));
    const year = d.getFullYear();
    const monthVal = String(d.getMonth() + 1).padStart(2, '0');
    const dateNumVal = String(d.getDate()).padStart(2, '0');
    return `${year}-${monthVal}-${dateNumVal}`;
  }, [maxBookingDays]);

  const isDoctorAvailableOnDate = (dateStr: string): boolean => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return true;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const dayName = weekdaysList[d.getDay()];
    return doctorWorkingDays.includes(dayName);
  };

  // Check if this particular doctor is marked as unavailable or app bookings disabled
  const isDoctorOnlineAvailable = useMemo(() => {
    if (!doctor) return true;
    if (typeof window !== 'undefined' && hospitalId && doctor?.id) {
      try {
        const savedDocs = localStorage.getItem(`insta_hospital_doctors_${hospitalId}`) || localStorage.getItem('insta_hospital_doctors');
        if (savedDocs) {
          const parsed = JSON.parse(savedDocs);
          const found = parsed.find((d: any) => d.id === doctor.id);
          if (found) {
            if (found.active === false || found.onlineConsult === false) {
              return false;
            }
          }
        }
      } catch (e) {}
    }
    if (doctor.active === false || doctor.onlineConsult === false) {
      return false;
    }
    return true;
  }, [doctor, hospitalId, syncVersion]);

  // States
  const [selectedSession, setSelectedSession] = useState<string>(activeSessionsList[0]?.name || 'Morning');
  
  // Auto-switch to next active non-expired session if current selection has ended
  useEffect(() => {
    const active = sessionOptions.find(s => s.id === selectedSession);
    if (active?.isExpired) {
      const nextOpen = sessionOptions.find(s => !s.isExpired && !s.isFull) || sessionOptions.find(s => !s.isExpired);
      if (nextOpen) {
        setSelectedSession(nextOpen.id);
      }
    }
  }, [selectedDate, sessionOptions, selectedSession]);
  
  // Patient details form
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState<string>('');
  const [ageUnit, setAgeUnit] = useState<'Years' | 'Months' | 'Days'>('Years');
  const [gender, setGender] = useState<string>('Male');
  const [phone, setPhone] = useState(() => (user?.phone || '').replace(/\D/g, '').slice(-10));
  const [place, setPlace] = useState(user?.address || user?.location || currentLocation || '');
  const [isExisting, setIsExisting] = useState(false);
  const [showRmpFields, setShowRmpFields] = useState(false);
  const [rmpName, setRmpName] = useState('');
  const [rmpPhone, setRmpPhone] = useState('');
  const [rmpPlace, setRmpPlace] = useState('');
  
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: boolean; phone?: boolean; age?: boolean; place?: boolean }>({});
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // Fetch real-time session capacities and availability
  useEffect(() => {
    if (!hospitalId || !doctor?.id || !selectedDate) return;
    fetch(`/api/hospitals/${hospitalId}/doctors/${doctor.id}/session-capacity?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.sessions)) {
          const map: Record<string, any> = {};
          data.sessions.forEach((s: any) => {
            map[(s.name || '').toLowerCase()] = {
              max: s.maxTokens,
              booked: s.bookedTokens,
              remaining: s.remainingSlots,
              isFull: s.isFull
            };
          });
          setSessionCapacities(map);
        }
      })
      .catch(() => {});
  }, [hospitalId, doctor?.id, selectedDate, syncVersion]);

  // Auto-detect current place using Reverse Geocoding
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingLocation(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const placeName = await reverseGeocode(latitude, longitude);
          if (placeName && placeName !== 'Current Location') {
            setPlace(placeName);
            setFieldErrors(prev => ({ ...prev, place: false }));
          } else if (currentLocation) {
            setPlace(currentLocation);
            setFieldErrors(prev => ({ ...prev, place: false }));
          } else {
            setPlace('Current Location');
          }
        } catch (err) {
          console.warn('Reverse geocode error:', err);
          if (currentLocation) {
            setPlace(currentLocation);
            setFieldErrors(prev => ({ ...prev, place: false }));
          }
        } finally {
          setIsDetectingLocation(false);
        }
      },
      async (geoErr) => {
        console.warn('Geolocation error:', geoErr);
        try {
          const res = await fetch('/api/ip-location');
          if (res.ok) {
            const data = await res.json();
            if (data && data.city) {
              const placeName = `${data.city}, ${data.region || ''}`.trim().replace(/,\s*$/, '');
              setPlace(placeName);
              setFieldErrors(prev => ({ ...prev, place: false }));
              setIsDetectingLocation(false);
              return;
            }
          }
        } catch (e) {}

        try {
          const directRes = await fetch('https://ipwho.is/');
          if (directRes.ok) {
            const d = await directRes.json();
            if (d && d.city) {
              const placeName = `${d.city}, ${d.region || ''}`.trim().replace(/,\s*$/, '');
              setPlace(placeName);
              setFieldErrors(prev => ({ ...prev, place: false }));
              setIsDetectingLocation(false);
              return;
            }
          }
        } catch (e) {}

        setIsDetectingLocation(false);
        if (currentLocation) {
          setPlace(currentLocation);
          setFieldErrors(prev => ({ ...prev, place: false }));
        } else {
          setError('Location access unavailable. Please enter your town or address manually.');
        }
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, up to 10 characters
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: false }));
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, up to 3 characters
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 3);
    setAge(digitsOnly);
    if (fieldErrors.age) setFieldErrors(prev => ({ ...prev, age: false }));
  };

  const dateInputRef = useRef<HTMLInputElement>(null);
  const patientDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Immediately reset scroll to top so doctor info and date selection are clearly seen
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    // 2. Auto-scroll slowly from top down to the form
    const timer = setTimeout(() => {
      if (patientDetailsRef.current) {
        patientDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [hospitalId, doctorId]);

  // Generate date pills dynamically constrained by hospital booking window and doctor's schedule
  const dateOptions = useMemo(() => {
    const pills = [];
    for (let i = 0; i < maxBookingDays; i++) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() + i);

      const year = d.getFullYear();
      const monthVal = String(d.getMonth() + 1).padStart(2, '0');
      const dateNumVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${monthVal}-${dateNumVal}`;
      const weekdayName = weekdaysList[d.getDay()];
      const isWorking = doctorWorkingDays.includes(weekdayName);

      pills.push({
        label: i === 0 ? 'Today' : weekdayName,
        dayNum: String(d.getDate()),
        month: monthsList[d.getMonth()],
        dateStr,
        isWorking,
        weekdayName
      });
    }

    const exists = pills.some(p => p.dateStr === selectedDate);
    if (!exists && selectedDate && selectedDate >= getTodayDateStr() && selectedDate <= maxAllowedDateStr) {
      const customPill = formatDateOption(selectedDate);
      if (customPill) {
        const parts = selectedDate.split('-');
        const cd = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const weekdayName = weekdaysList[cd.getDay()];
        const isWorking = doctorWorkingDays.includes(weekdayName);
        pills.push({ ...customPill, isWorking, weekdayName });
      }
    }
    return pills;
  }, [maxBookingDays, doctorWorkingDays, selectedDate, maxAllowedDateStr]);

  // 3-day compact date pills matching Image 48
  const displayDateOptions = useMemo(() => {
    const first3 = dateOptions.slice(0, 3);
    if (selectedDate && !first3.some(p => p.dateStr === selectedDate)) {
      const match = dateOptions.find(p => p.dateStr === selectedDate);
      if (match) {
        return [...first3.slice(0, 2), match];
      }
    }
    return first3;
  }, [dateOptions, selectedDate]);

  // Auto-switch away from doctor's off-day or dates exceeding the booking window
  useEffect(() => {
    if (!selectedDate) {
      const firstAvailable = dateOptions.find(p => p.isWorking);
      if (firstAvailable) setSelectedDate(firstAvailable.dateStr);
      return;
    }
    if (selectedDate > maxAllowedDateStr || !isDoctorAvailableOnDate(selectedDate)) {
      const firstAvailable = dateOptions.find(p => p.isWorking);
      if (firstAvailable) {
        setSelectedDate(firstAvailable.dateStr);
      }
    }
  }, [selectedDate, maxAllowedDateStr, dateOptions, doctorWorkingDays]);

  if (!hospital || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white max-w-md mx-auto">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500 mb-4">Doctor or Hospital not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (hospital.status === 'disabled') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white max-w-md mx-auto">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto font-black text-xl">⚠️</div>
          <h3 className="text-base font-black text-slate-800">Hospital Account Disabled</h3>
          <p className="text-xs font-semibold text-slate-500">Token booking for {hospital.name} is currently suspended by administration.</p>
          <Button onClick={() => navigate('/')} className="mt-2">Back to Home</Button>
        </div>
      </div>
    );
  }

  const handleOpenCalendar = () => {
    if (dateInputRef.current) {
      if ('showPicker' in dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const handleProceedToBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaymentProcessing) return;
    setError('');
    setFieldErrors({});

    if (!isDoctorOnlineAvailable) {
      setError(`Dr. ${doctor?.name || 'Doctor'} is currently unavailable for online token booking at this hospital.`);
      return;
    }

    // 1. Patient Name Validation
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter patient full name (at least 2 letters)');
      setFieldErrors({ name: true });
      patientDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Mobile Number Validation (Strictly 10 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      setFieldErrors({ phone: true });
      patientDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Mobile number must start with 6, 7, 8, or 9');
      setFieldErrors({ phone: true });
      patientDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 3. Age Validation (Strictly required, > 0)
    const ageVal = parseInt(age, 10);
    if (!age.trim() || isNaN(ageVal) || ageVal <= 0) {
      setError('Please enter patient age');
      setFieldErrors({ age: true });
      patientDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (ageUnit === 'Years' && ageVal > 120) {
      setError('Please enter a valid age (1 - 120 Years)');
      setFieldErrors({ age: true });
      patientDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 4. Place Validation (Strictly required)
    if (!place.trim()) {
      setError('Please enter your place or tap Auto to detect');
      setFieldErrors({ place: true });
      patientDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!isDoctorAvailableOnDate(selectedDate)) {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      setError(`Dr. ${doctor.name} is not available on ${weekdaysList[d.getDay()]}s (Doctor Off). Please select an active OPD day.`);
      return;
    }
    if (selectedDate > maxAllowedDateStr) {
      setError(`Selected date exceeds the hospital's advance booking window of ${maxBookingDays} days.`);
      return;
    }

    const computedAgeDisplay = `${ageVal} ${ageUnit}`;

    const effectivePaymentMode = livePaymentMode || hospital?.payment_mode || (hospital as any)?.paymentMode || 'token_only';
    const isFullOnline = effectivePaymentMode === 'full_online';
    const docFee = doctor.consultationFee || 500;
    const tokenFee = Math.max(10, Math.round(docFee * ((platformFeePercent || 5) / 100)));
    
    // Unified 3% Payment Gateway Engine (Base Amount + 3% Gateway Fee)
    const onlineBase = isFullOnline ? (docFee + tokenFee) : tokenFee;
    const gatewayFee = parseFloat((onlineBase * 0.03).toFixed(2));
    const totalPayable = parseFloat((onlineBase + gatewayFee).toFixed(2));

    const ref = showRmpFields && rmpName.trim() ? { 
      name: rmpName.trim(), 
      phone: rmpPhone.trim(), 
      place: rmpPlace.trim() || place.trim() || 'Adoni' 
    } : null;

    const patientDetails = {
      name: name.trim(),
      age: ageVal,
      ageUnit,
      ageDisplay: computedAgeDisplay,
      gender,
      phone: cleanPhone,
      email: user?.email || 'patient@example.com',
      address: place.trim(),
      place: place.trim(),
      isExisting,
      doctorReference: ref,
      rmpReference: ref,
      tokenBaseFee: tokenFee,
      tokenFee: tokenFee,
      platformFee: tokenFee, // InstaToken platform margin (5% token fee), strictly excluding 3% gateway charge
      gatewayFee: gatewayFee,
      gstFee: 0,
      totalBookingCharges: totalPayable
    };

    const activeSessionObj = sessionOptions.find(s => s.id === selectedSession);
    if (activeSessionObj?.isExpired) {
      setError(`The ${activeSessionObj.title} has already concluded for ${selectedDate} (IST). Please choose an upcoming active session or select a future date.`);
      return;
    }
    if (activeSessionObj?.isFull) {
      setError(`The ${activeSessionObj.title} is completely full (${activeSessionObj.booked}/${activeSessionObj.max} tokens booked). Please choose another session or visit the hospital reception counter for walk-in availability.`);
      return;
    }

    const slotTime = activeSessionObj ? `${activeSessionObj.title} (${activeSessionObj.timing})` : '10:00 AM - 12:00 PM';
    const planTitle = isFullOnline ? "Doctor Consultation + Booking Fee" : "InstaToken Booking Charges";

    // Direct 1-Click Razorpay Payment Gateway Launch (No intermediate page)
    setIsPaymentProcessing(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error("Unable to load Razorpay payment gateway SDK. Please check your internet connection.");
      }

      // 1. Create Order on Backend
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPayable,
          receipt: `tok_${Date.now().toString().slice(-8)}`,
          patientName: name.trim(),
          patientPhone: cleanPhone,
          doctorId: doctor.id,
          date: selectedDate,
          session: selectedSession,
          hospitalId: hospital.id,
          notes: {
            hospitalId: hospital.id,
            doctorId: doctor.id,
            slotDate: selectedDate,
            slotTime: slotTime,
            session: selectedSession,
            planName: planTitle
          }
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success || !orderData.order) {
        throw new Error(orderData.message || 'Failed to create payment order.');
      }

      const { order, keyId } = orderData;

      // 2. Open Razorpay Checkout Modal Directly on Current Screen
      const options = {
        key: keyId || 'rzp_test_ThOMWcFfdTPNme',
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'InstaToken Healthcare',
        description: `${isFullOnline ? 'Consultation + Token Fee' : 'OPD Token Fee'} - Dr. ${doctor.name}`,
        image: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
        order_id: order.id,
        prefill: {
          name: name.trim(),
          contact: cleanPhone,
          email: user?.email || 'patient@instatoken.in'
        },
        notes: {
          hospitalId: hospital.id,
          doctorId: doctor.id,
          slotDate: selectedDate
        },
        theme: {
          color: '#2563EB' // Brand blue
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsPaymentProcessing(false);
          }
        },
        handler: async (response: any) => {
          try {
            setIsPaymentProcessing(true);

            // 3. Verify Payment Signature on Backend
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(verifyData.message || 'Payment signature verification failed.');
            }

            // 4. Confetti Celebration
            try {
              confetti({
                particleCount: 160,
                spread: 80,
                origin: { y: 0.6 }
              });
            } catch (e) {}

            // 5. Activate booking pass
            purchaseSubscription(planTitle, totalPayable, 3);

            // 6. Complete token booking directly
            const appointmentCreated = await bookToken(
              patientDetails,
              hospital.id,
              doctor.id,
              selectedDate,
              slotTime,
              'RAZORPAY',
              response.razorpay_payment_id
            );

            setIsPaymentProcessing(false);
            navigate(`/confirmation/${appointmentCreated.id}`);
          } catch (err: any) {
            console.error('Payment confirmation error:', err);
            setError(err.message || 'Payment verification failed. Please contact hospital support.');
            setIsPaymentProcessing(false);
          }
        }
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on('payment.failed', (failResponse: any) => {
        console.error('Razorpay payment failed:', failResponse.error);
        setError(`Payment Failed: ${failResponse.error?.description || failResponse.error?.reason || 'Transaction declined.'}`);
        setIsPaymentProcessing(false);
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error('Razorpay initiation error:', err);
      setError(err.message || 'Failed to initialize payment gateway. Please try again.');
      setIsPaymentProcessing(false);
    }
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-8 w-full">
      
      {/* Top Header Bar matching Image 48 */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-100 z-30 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight font-heading leading-tight">Book Doctor OPD Token</h2>
            <p className="text-[9.5px] text-slate-400 font-bold leading-none">Quick • Easy • Secure</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold shrink-0">
          <ShieldCheck size={13} />
          <span>100% Guaranteed Spot</span>
        </div>
      </div>

      <div className="max-w-md sm:max-w-lg lg:max-w-xl mx-auto px-4 mt-3 space-y-3.5">
        
        {/* Doctor Summary Card matching Image 48 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Doctor Avatar Circle */}
            <div className="w-13 h-13 rounded-full overflow-hidden shrink-0 border-2 border-blue-100 bg-blue-50">
              <img 
                src={doctor.image} 
                alt={doctor.name} 
                className="w-full h-full object-cover" 
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=EFF6FF&color=2563EB&size=100&bold=true`; }}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 leading-tight truncate">{doctor.name}</h3>
                <button 
                  type="button"
                  onClick={() => toggleSaveDoctor(doctor.id)}
                  className="p-1 rounded-lg hover:bg-red-50 text-slate-400 transition-colors cursor-pointer shrink-0 ml-1"
                  title={user?.savedDoctors?.includes(doctor.id) ? "Remove from Favourite Doctors" : "Add to Favourite Doctors"}
                >
                  <Heart size={15} className={user?.savedDoctors?.includes(doctor.id) ? "text-red-500 fill-red-500" : "text-slate-400 hover:text-red-400"} />
                </button>
              </div>
              <p className="text-[11px] text-blue-600 font-extrabold truncate">{doctor.specialty}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">{hospital.name}</p>

              {/* Rating & Distance Badges */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="bg-amber-50 text-amber-700 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-100">
                  ★ {doctor.rating} ({doctor.reviewsCount})
                </span>
                <span className="bg-blue-50 text-blue-700 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-blue-100">
                  <MapPin size={10} /> {(userCoords && hospital?.lat && hospital?.lng) ? calculateDistanceKm(userCoords.lat, userCoords.lng, hospital.lat, hospital.lng) : (hospital?.distance || 2.5)} km away
                </span>
              </div>
            </div>
          </div>

          {/* Consultation Fee Breakdown row */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-2.5 text-xs">
            <span className="text-[11px] text-slate-600 font-medium">Consultation Fee (Pay at hospital)</span>
            <span className="text-base font-black text-slate-900">₹{doctor.consultationFee}</span>
          </div>
        </div>

        {!isDoctorOnlineAvailable && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-start gap-2.5 shadow-2xs">
            <UserX size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-rose-900">Dr. {doctor?.name || 'Doctor'} is Currently Unavailable</p>
              <p className="text-[10.5px] text-rose-700 mt-0.5 font-medium leading-tight">
                The hospital has temporarily marked this doctor off-duty or closed app bookings.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleProceedToBooking} className="space-y-3.5">
          
          {/* Select Date matching Image 48 */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <CalendarIcon size={14} className="text-blue-600" />
                <span>Select Date</span>
              </h4>
              <div className="relative">
                <button 
                  type="button" 
                  onClick={handleOpenCalendar}
                  className="text-[11px] text-blue-600 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Calendar</span>
                  <CalendarIcon size={11} />
                </button>
                <input 
                  ref={dateInputRef}
                  type="date"
                  min={getTodayDateStr()}
                  max={maxAllowedDateStr}
                  value={selectedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val < getTodayDateStr()) {
                      setError('Cannot select past dates.');
                      return;
                    }
                    if (val > maxAllowedDateStr) {
                      setError(`Advance booking is only allowed up to ${maxBookingDays} days in advance for this hospital (${maxAllowedDateStr}).`);
                      return;
                    }
                    if (!isDoctorAvailableOnDate(val)) {
                      const parts = val.split('-');
                      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                      setError(`Dr. ${doctor.name} is not available on ${weekdaysList[d.getDay()]}s (Doctor Off). Please select an active OPD day.`);
                      return;
                    }
                    setSelectedDate(val);
                    setError('');
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>

            {/* 3-day pills matching Image 48 */}
            <div className="grid grid-cols-3 gap-2">
              {displayDateOptions.map((dt) => {
                const isActive = selectedDate === dt.dateStr;
                const isWorking = dt.isWorking;

                return (
                  <button
                    key={dt.dateStr}
                    type="button"
                    disabled={!isWorking}
                    onClick={() => {
                      if (!isWorking) {
                        setError(`Dr. ${doctor.name} is not available on ${dt.weekdayName}s (Doctor Off).`);
                        return;
                      }
                      setSelectedDate(dt.dateStr);
                      setError('');
                    }}
                    className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                      !isWorking
                        ? 'bg-slate-50/70 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        : isActive 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02] cursor-pointer' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer'
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isActive ? 'text-white' : !isWorking ? 'text-slate-400' : 'text-slate-500'}`}>
                      {dt.label}
                    </span>
                    <span className={`text-base font-black leading-tight mt-0.5 ${!isWorking ? 'text-slate-400 line-through decoration-slate-300' : ''}`}>
                      {dt.dayNum}
                    </span>
                    <span className={`text-[9.5px] font-extrabold ${isActive ? 'text-blue-100' : !isWorking ? 'text-rose-500' : 'text-slate-400'}`}>
                      {!isWorking ? 'Off' : dt.month}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Session matching Image 48 */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 mb-1.5">
              <Clock size={14} className="text-blue-600" />
              <span>Select Session</span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {sessionOptions.map((s) => {
                const isActive = selectedSession === s.id;
                const isFull = s.isFull;
                const isExpired = s.isExpired;
                const isDisabled = isFull || isExpired;
                return (
                  <div 
                    key={s.id}
                    onClick={() => {
                      if (isExpired) {
                        setError(`The ${s.title} has already concluded for today (${s.timing} IST). Please choose an upcoming session or select a future date.`);
                        return;
                      }
                      if (isFull) {
                        setError(`The ${s.title} is completely full (${s.booked}/${s.max} tokens booked). Please choose another session or visit the hospital reception counter for walk-in availability.`);
                        return;
                      }
                      setSelectedSession(s.id as any);
                      setError('');
                    }}
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isDisabled
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : isActive 
                          ? 'bg-amber-50/60 border-amber-400 shadow-2xs cursor-pointer' 
                          : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 ${isDisabled ? 'bg-slate-200 text-slate-500' : s.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                        {s.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-extrabold text-slate-900 truncate">{s.title}</h5>
                          {isExpired ? (
                            <span className="text-[8.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                              Ended
                            </span>
                          ) : isFull ? (
                            <span className="text-[8.5px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                              Full ({s.booked}/{s.max})
                            </span>
                          ) : s.booked > 0 ? (
                            <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                              {s.remaining} left
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[9px] text-slate-500 font-semibold truncate">{s.timing}</p>
                      </div>
                    </div>

                    {/* Radio Circle */}
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-1 ${
                      isDisabled 
                        ? 'border-slate-300 bg-slate-100' 
                        : isActive 
                          ? 'border-blue-600 bg-blue-600' 
                          : 'border-slate-300'
                    }`}>
                      {!isDisabled && isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Patient Details Section matching Image 48 */}
          <div ref={patientDetailsRef} className="scroll-mt-16">
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 mb-1.5">
              <User size={14} className="text-blue-600" />
              <span>Patient Details</span>
            </h4>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
              {/* Full Name */}
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: false }));
                  }}
                  placeholder="Full Name *"
                  className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none transition-all placeholder:text-slate-400 ${
                    fieldErrors.name ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-200 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* Mobile Number (Full width) */}
              <div className={`relative flex items-center bg-white border rounded-xl overflow-hidden transition-all ${
                fieldErrors.phone ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-200 focus-within:border-blue-600'
              }`}>
                <div className="flex items-center pl-2.5 pr-1.5 text-slate-500 font-bold text-xs select-none shrink-0 border-r border-slate-100">
                  <Phone size={13} className="mr-1 text-slate-400" />
                  <span>+91</span>
                </div>
                <input 
                  type="tel" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="10-digit Mobile *"
                  className="w-full pl-2.5 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Age & Gender in 2 columns */}
              <div className="grid grid-cols-2 gap-2">
                {/* Age with Years dropdown */}
                <div className={`relative flex items-center bg-white border rounded-xl overflow-hidden transition-all ${
                  fieldErrors.age ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-200 focus-within:border-blue-600'
                }`}>
                  <CalendarIcon size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input 
                    type="text" 
                    inputMode="numeric"
                    maxLength={3}
                    value={age}
                    onChange={handleAgeChange}
                    placeholder="Age *"
                    className="w-full min-w-0 pl-8 pr-1 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  <div className="relative shrink-0 flex items-center pr-1.5">
                    <select
                      value={ageUnit}
                      onChange={(e) => setAgeUnit(e.target.value as any)}
                      className="text-[11px] font-bold text-blue-600 bg-transparent pr-4 focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="Years">Years</option>
                      <option value="Months">Months</option>
                      <option value="Days">Days</option>
                    </select>
                    <ChevronDown size={11} className="absolute right-1 text-blue-600 pointer-events-none" />
                  </div>
                </div>

                {/* Gender */}
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-600 transition-all">
                  <User size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full pl-8 pr-7 py-2.5 text-xs font-semibold text-slate-800 bg-transparent focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Row 4: Patient Town / City / Address with Auto-Detect Button in header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <MapPin size={12} className="text-blue-600" />
                    <span>Town / City / Patient Address *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    title="Auto-detect current location"
                    className="flex items-center gap-1 text-[10.5px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200/80 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isDetectingLocation ? (
                      <Loader2 size={11} className="animate-spin text-blue-600" />
                    ) : (
                      <Navigation size={11} className="text-blue-600" />
                    )}
                    <span>{isDetectingLocation ? 'Locating...' : 'Auto Detect'}</span>
                  </button>
                </div>

                <div className={`relative flex items-center bg-white border rounded-xl overflow-hidden transition-all shadow-2xs ${
                  fieldErrors.place ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-200 focus-within:border-blue-600'
                }`}>
                  <MapPin size={15} className="absolute left-3 text-blue-600 pointer-events-none shrink-0" />
                  <input 
                    type="text" 
                    value={place}
                    onChange={(e) => {
                      setPlace(e.target.value);
                      if (fieldErrors.place) setFieldErrors(prev => ({ ...prev, place: false }));
                    }}
                    placeholder="Enter your town, village, or address *"
                    className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="existingPatient"
                    checked={isExisting}
                    onChange={(e) => setIsExisting(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="existingPatient" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                    Existing Patient <span className="text-[10px] font-medium text-slate-400">(Visited this hospital before)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="addRmpReference"
                    checked={showRmpFields}
                    onChange={(e) => setShowRmpFields(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="addRmpReference" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                    + Add Doctor Reference (Optional)
                  </label>
                </div>

                {showRmpFields && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Referring Doctor Name *</label>
                      <input 
                        type="text" 
                        value={rmpName} 
                        onChange={(e) => setRmpName(e.target.value)}
                        placeholder="Dr. Srinivas / Doctor Name"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Doctor Mobile Number</label>
                      <input 
                        type="tel" 
                        value={rmpPhone} 
                        onChange={(e) => setRmpPhone(e.target.value)}
                        placeholder="10-digit mobile"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Place / Village</label>
                      <input 
                        type="text" 
                        value={rmpPlace} 
                        onChange={(e) => setRmpPlace(e.target.value)}
                        placeholder="e.g. Adoni, Yemmiganur"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Exact fee breakdown matching Image copy 78.png */}
          {(() => {
            const effectivePaymentMode = livePaymentMode || hospital?.payment_mode || (hospital as any)?.paymentMode || 'token_only';
    const isFullOnline = effectivePaymentMode === 'full_online';
            const docFee = doctor.consultationFee || 500;
            const tokenFee = Math.max(10, Math.round(docFee * ((platformFeePercent || 5) / 100)));
            const onlineBase = isFullOnline ? (docFee + tokenFee) : tokenFee;
            const platformFee = parseFloat((onlineBase * 0.03).toFixed(2));
            const totalPayable = parseFloat((onlineBase + platformFee).toFixed(2));

            return (
              <div className="space-y-3">
                {/* 1. Doctor Consultation Fee Card */}
                <div className={`border rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-2xs ${
                  isFullOnline ? 'bg-blue-50/80 border-blue-200/90' : 'bg-emerald-50/80 border-emerald-200/90'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isFullOnline ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-black text-slate-900">Doctor Consultation Fee</h4>
                        <Info size={13} className="text-slate-400" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {isFullOnline ? 'Pay online now with InstaToken.' : 'Pay directly at hospital cabin / desk.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900 font-heading block">₹{docFee.toFixed(2)}</span>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-0.5 ${
                      isFullOnline ? 'bg-blue-700 text-white' : 'bg-emerald-700 text-white'
                    }`}>
                      {isFullOnline ? <ShieldCheck size={10} /> : <Building2 size={10} />}
                      {isFullOnline ? 'Pay Online' : 'Pay at Hospital'}
                    </span>
                  </div>
                </div>

                {/* 2. InstaToken Booking Charges Card */}
                <div className="bg-blue-50/60 border border-blue-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-3 pb-3 border-b border-blue-100">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {isFullOnline ? 'Full Online Booking Breakdown' : 'InstaToken Token Booking Charges'}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {isFullOnline ? 'Doctor consultation fee + token charges' : 'This is for our token booking service.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {isFullOnline && (
                      <div className="flex justify-between items-center text-slate-700 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>Doctor Consultation Fee</span>
                        </div>
                        <span className="font-black text-slate-900">₹{docFee.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-slate-700 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span>Token Fee</span>
                        <Info size={12} className="text-slate-400" />
                      </div>
                      <span className="font-black text-slate-900">₹{tokenFee.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span>Platform Fee (incl. GST)</span>
                        <Info size={12} className="text-slate-400" />
                      </div>
                      <span className="font-black text-slate-900">₹{platformFee.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-blue-200 pt-3">
                      <div>
                        <span className="text-sm font-black text-slate-900 block leading-tight">Total Payable Now</span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {isFullOnline ? '(Full Consultation + Token & Platform Charges)' : '(Token & Platform Charges Paid Online)'}
                        </span>
                      </div>
                      <span className="text-2xl font-black text-blue-700 font-heading">₹{totalPayable.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Big Action Button matching Image 78 */}
                <button 
                  type="submit"
                  disabled={!isDoctorOnlineAvailable || isPaymentProcessing}
                  className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 font-black text-sm text-white shadow-lg transition-all cursor-pointer ${
                    !isDoctorOnlineAvailable || isPaymentProcessing
                      ? 'bg-blue-400 text-white/90 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 transform hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {isPaymentProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-white" />
                      <span>Connecting Payment Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Pay ₹{totalPayable.toFixed(2)} and Confirm Booking →</span>
                    </>
                  )}
                </button>
              </div>
            );
          })()}

          {/* Bottom Trust Indicators */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck size={16} className="text-blue-600 mb-0.5" />
              <span className="text-[9.5px] font-extrabold text-slate-800">100% Secure</span>
              <span className="text-[8px] text-slate-400 font-medium">Your data is safe</span>
            </div>

            <div className="flex flex-col items-center border-x border-slate-200">
              <Zap size={16} className="text-blue-600 mb-0.5" />
              <span className="text-[9.5px] font-extrabold text-slate-800">Ultra Fast</span>
              <span className="text-[8px] text-slate-400 font-medium">Book in 30 seconds</span>
            </div>

            <div className="flex flex-col items-center">
              <Users size={16} className="text-blue-600 mb-0.5" />
              <span className="text-[9.5px] font-extrabold text-slate-800">Trusted by 1M+</span>
              <span className="text-[8px] text-slate-400 font-medium">Happy patients</span>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
