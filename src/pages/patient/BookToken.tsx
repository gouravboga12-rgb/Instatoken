import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateDistanceKm } from '../../utils/googleMaps';
import { subscribeGlobalSync } from '../../utils/syncBus';
import { Button } from '../../components/ui/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, User, Phone, 
  MapPin, ShieldCheck, Sun, Moon, Ticket, ArrowRight, Zap, Users,
  ChevronDown, Heart, Stethoscope, UserX
} from 'lucide-react';

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
  const { hospitals, user, toggleSaveDoctor, platformFeePercent, userCoords } = useApp();
  const navigate = useNavigate();

  const hospital = hospitals.find(h => h.id === hospitalId) || hospitals[0];
  const doctor = hospital?.doctors.find(d => d.id === doctorId) || hospital?.doctors[0];

  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeGlobalSync(() => {
      setSyncVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

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
  }

  const sessionOptions: SessionOptionItem[] = useMemo(() => {
    return activeSessionsList.map((s: any) => {
      const isMorning = s.name.toLowerCase().includes('morn');
      const isAfternoon = s.name.toLowerCase().includes('after');
      return {
        id: s.name,
        title: `${s.name} OPD`,
        timing: `${s.startTime} - ${s.endTime}`,
        icon: isMorning ? <Sun size={20} /> : isAfternoon ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />,
        activeClass: isMorning ? 'bg-amber-50/70 border-amber-400' : isAfternoon ? 'bg-orange-50/70 border-orange-400' : 'bg-blue-50/70 border-blue-500',
        iconBg: isMorning ? 'bg-amber-100 text-amber-600' : isAfternoon ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
      };
    });
  }, [activeSessionsList]);

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

  // Resolve Hospital Booking Rules
  const [scheduleConfig, setScheduleConfig] = useState<{
    bookingOpensDaysBefore: number;
    advanceBookingLimit: number;
  }>(() => {
    try {
      const saved = localStorage.getItem(`insta_hospital_schedule_${hospitalId}`) || localStorage.getItem('insta_hospital_schedule');
      if (saved) {
        const p = JSON.parse(saved);
        return {
          bookingOpensDaysBefore: Number(p.bookingOpensDaysBefore) || 3,
          advanceBookingLimit: Number(p.advanceBookingLimit) || 7
        };
      }
    } catch (e) {}
    return { bookingOpensDaysBefore: 3, advanceBookingLimit: 7 };
  });

  useEffect(() => {
    if (!hospitalId) return;
    fetch(`/api/hospitals/${hospitalId}/schedules`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.schedule) {
          setScheduleConfig({
            bookingOpensDaysBefore: Number(data.schedule.bookingOpensDaysBefore) || 3,
            advanceBookingLimit: Number(data.schedule.advanceBookingLimit) || 7
          });
        }
      })
      .catch(() => {});
  }, [hospitalId, syncVersion]);

  // How many days into the future slots can be booked
  const maxBookingDays = useMemo(() => {
    const openDays = Number(scheduleConfig?.bookingOpensDaysBefore) || 3;
    const maxDays = Number(scheduleConfig?.advanceBookingLimit) || 7;
    return Math.max(1, Math.min(openDays, maxDays));
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
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [selectedSession, setSelectedSession] = useState<string>(activeSessionsList[0]?.name || 'Morning');
  
  // Patient details form
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState<string>('');
  const [ageUnit, setAgeUnit] = useState<'Years' | 'Months' | 'Days'>('Years');
  const [gender, setGender] = useState<string>('Male');
  const [phone, setPhone] = useState(user?.phone || '');
  const [place, setPlace] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [showRmpFields, setShowRmpFields] = useState(false);
  const [rmpName, setRmpName] = useState('');
  const [rmpPhone, setRmpPhone] = useState('');
  
  const [error, setError] = useState('');

  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const handleProceedToBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isDoctorOnlineAvailable) {
      setError(`Dr. ${doctor?.name || 'Doctor'} is currently unavailable for online token booking at this hospital.`);
      return;
    }

    if (!name.trim()) {
      setError('Please enter patient name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter mobile number');
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

    const ageVal = parseInt(age) || 0;
    const computedAgeDisplay = age ? `${age} ${ageUnit}` : '28 Years';

    const patientDetails = {
      name,
      age: ageVal,
      ageUnit,
      ageDisplay: computedAgeDisplay,
      gender,
      phone,
      email: user?.email || 'patient@example.com',
      address: place,
      isExisting,
      rmpReference: showRmpFields ? { name: rmpName, phone: rmpPhone } : null
    };

    const activeSessionObj = sessionOptions.find(s => s.id === selectedSession);
    const slotTime = activeSessionObj ? `${activeSessionObj.title} (${activeSessionObj.timing})` : '10:00 AM - 12:00 PM';

    const docFee = doctor.consultationFee || 500;
    const platFee = Math.max(10, Math.round(docFee * ((platformFeePercent || 5) / 100)));

    // Navigate to Razorpay/UPI Payment Gateway - only collecting token fee online
    navigate('/payment', {
      state: {
        patientDetails,
        hospitalId: hospital.id,
        doctorId: doctor.id,
        date: selectedDate,
        time: slotTime,
        fee: docFee,
        tokenFee: platFee,
        subscriptionPlan: { name: "OPD Token Booking Fee", price: platFee, days: 3 }
      }
    });
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
                return (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedSession(s.id as any)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isActive 
                        ? 'bg-amber-50/60 border-amber-400 shadow-2xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 ${s.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                        {s.icon}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-extrabold text-slate-900 truncate">{s.title}</h5>
                        <p className="text-[9px] text-slate-500 font-semibold truncate">{s.timing}</p>
                      </div>
                    </div>

                    {/* Radio Circle */}
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-1 ${
                      isActive ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Patient Details Section matching Image 48 */}
          <div>
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
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-600 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Mobile Number & Age in 2 columns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mobile Number *"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-600 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Age with Years dropdown */}
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-600 transition-all">
                  <CalendarIcon size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input 
                    type="number" 
                    inputMode="numeric"
                    min="1"
                    max={ageUnit === 'Days' ? 365 : 120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Age"
                    className="w-full min-w-0 pl-8 pr-1 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              </div>

              {/* Gender & Place in 2 columns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <User size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full pl-8 pr-6 py-2 text-xs font-semibold text-slate-800 bg-transparent focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input 
                    type="text" 
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="Enter your place"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-600 focus:outline-none transition-all placeholder:text-slate-400"
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
                    + Add RMP Reference (Optional)
                  </label>
                </div>

                {showRmpFields && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">RMP Name</label>
                      <input 
                        type="text" 
                        value={rmpName} 
                        onChange={(e) => setRmpName(e.target.value)}
                        placeholder="Doctor/RMP name"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">RMP Phone</label>
                      <input 
                        type="tel" 
                        value={rmpPhone} 
                        onChange={(e) => setRmpPhone(e.target.value)}
                        placeholder="Phone number"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clear fee breakdown matching Image 48 */}
          {(() => {
            const docFee = doctor.consultationFee || 500;
            const platFee = Math.max(10, Math.round(docFee * ((platformFeePercent || 5) / 100)));

            return (
              <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 rounded-2xl space-y-2 text-xs font-bold text-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Stethoscope size={13} className="text-blue-600" />
                    <span className="text-[11px]">Doctor Consultation Fee</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-xs">₹{docFee}</span>
                    <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Pay at Hospital
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <Zap size={13} className="text-blue-600" />
                    <span className="text-[11px]">Platform Booking Fee ({platformFeePercent || 5}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-blue-700 text-xs">₹{platFee}</span>
                    <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Pay Online Now
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-slate-900 block text-xs">Total Payable Now</span>
                    <span className="text-[9px] text-slate-500 font-medium">Token fee only • Consultation fee of ₹{docFee} payable at hospital</span>
                  </div>
                  <span className="font-black text-blue-700 text-base">₹{platFee}</span>
                </div>
              </div>
            );
          })()}

          {/* Big prominent Book button matching Image 48 */}
          <button 
            type="submit"
            disabled={!isDoctorOnlineAvailable}
            className={`w-full rounded-full p-2 flex items-center justify-between shadow-lg transition-all ${
              !isDoctorOnlineAvailable
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {/* Left Ticket Circle */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner ${
              !isDoctorOnlineAvailable ? 'bg-slate-200 text-slate-400' : 'bg-white text-blue-600'
            }`}>
              <Ticket size={20} />
            </div>

            {/* Center Text */}
            <div className="text-center px-2">
              <h4 className="text-sm font-black tracking-tight leading-tight">
                {!isDoctorOnlineAvailable 
                  ? 'Doctor Unavailable for Booking' 
                  : `Book Token • Pay ₹${Math.max(10, Math.round((doctor.consultationFee || 500) * ((platformFeePercent || 5) / 100)))}`
                }
              </h4>
              <p className={`text-[9.5px] font-medium ${!isDoctorOnlineAvailable ? 'text-slate-500' : 'text-blue-100'}`}>
                {!isDoctorOnlineAvailable ? 'Consultations suspended by clinic' : 'OPD spot confirmed • Doctor fee payable at hospital'}
              </p>
            </div>

            {/* Right Arrow Circle */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner ${
              !isDoctorOnlineAvailable ? 'bg-slate-200 text-slate-400' : 'bg-white text-blue-600'
            }`}>
              <ArrowRight size={20} />
            </div>
          </button>

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
