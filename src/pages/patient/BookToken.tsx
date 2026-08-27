import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateDistanceKm } from '../../utils/googleMaps';
import { Button } from '../../components/ui/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, User, Phone, 
  MapPin, ShieldCheck, Sun, Moon, Ticket, ArrowRight, Zap, Users,
  ChevronDown, Heart, Stethoscope
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

const generateDynamicDateOptions = () => {
  const options = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    
    const year = d.getFullYear();
    const monthVal = String(d.getMonth() + 1).padStart(2, '0');
    const dateNumVal = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${monthVal}-${dateNumVal}`;
    
    options.push({
      label: i === 0 ? 'Today' : weekdaysList[d.getDay()],
      dayNum: String(d.getDate()),
      month: monthsList[d.getMonth()],
      dateStr: dateStr
    });
  }
  return options;
};

export const BookToken: React.FC = () => {
  const { hospitalId, doctorId } = useParams<{ hospitalId: string; doctorId: string }>();
  const { hospitals, user, toggleSaveDoctor, platformFeePercent, userCoords } = useApp();
  const navigate = useNavigate();

  const hospital = hospitals.find(h => h.id === hospitalId) || hospitals[0];
  const doctor = hospital?.doctors.find(d => d.id === doctorId) || hospital?.doctors[0];

  // Dynamic Sessions prioritized per Doctor
  const rawSchedule = typeof window !== 'undefined' ? localStorage.getItem('insta_hospital_schedule') : null;
  const activeSessionsList = useMemo(() => {
    // 1. Prioritize direct doctor-specific sessions
    if (doctor?.sessions && doctor.sessions.length > 0) {
      const acts = doctor.sessions.filter((s: any) => s.active);
      if (acts.length > 0) return acts;
    }

    // 2. Check localStorage insta_hospital_doctors for this specific doctor
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

    // 3. Fallback to general hospital schedule if available
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
  }, [doctor, rawSchedule]);

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

  // States
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [selectedSession, setSelectedSession] = useState<string>(activeSessionsList[0]?.name || 'Morning');
  
  // Patient details form
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState<string>('28');
  const [gender, setGender] = useState<string>('Male');
  const [phone, setPhone] = useState(user?.phone || '+91 9876543210');
  const [place, setPlace] = useState('Vijayawada');
  const [isExisting, setIsExisting] = useState(false);
  const [showRmpFields, setShowRmpFields] = useState(false);
  const [rmpName, setRmpName] = useState('');
  const [rmpPhone, setRmpPhone] = useState('');
  
  const [error, setError] = useState('');


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

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Generate date pills dynamically including custom selected date
  const dateOptions = useMemo(() => {
    const basePills = generateDynamicDateOptions();
    const exists = basePills.some(p => p.dateStr === selectedDate);
    if (!exists && selectedDate) {
      const customPill = formatDateOption(selectedDate);
      if (customPill) {
        return [...basePills.slice(0, 4), customPill];
      }
    }
    return basePills;
  }, [selectedDate]);

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

    if (!name.trim()) {
      setError('Please enter patient name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter mobile number');
      return;
    }

    const patientDetails = {
      name,
      age: parseInt(age) || 28,
      gender,
      phone,
      email: user?.email || 'patient@example.com',
      address: place,
      isExisting,
      rmpReference: showRmpFields ? { name: rmpName, phone: rmpPhone } : null
    };

    const activeSessionObj = sessionOptions.find(s => s.id === selectedSession);
    const slotTime = activeSessionObj ? `${activeSessionObj.title} (${activeSessionObj.timing})` : '10:00 AM - 12:00 PM';

    // Navigate to Razorpay/UPI Payment Gateway
    navigate('/payment', {
      state: {
        patientDetails,
        hospitalId: hospital.id,
        doctorId: doctor.id,
        date: selectedDate,
        time: slotTime,
        fee: doctor.consultationFee,
        subscriptionPlan: { name: "OPD Booking Fee", price: 10, days: 3 }
      }
    });
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-6 w-full">
      
      {/* Top Header Bar matching Image 3 */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-3 border-b border-slate-100 z-30 flex items-center justify-between shadow-2xs md:rounded-2xl md:mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight font-heading">Book Doctor OPD Token</h2>
            <p className="text-[10px] text-slate-400 font-bold">Quick • Easy • Secure</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
          <ShieldCheck size={14} />
          <span>100% Guaranteed Spot</span>
        </div>
      </div>

      <div className="px-5 mt-4 md:grid md:grid-cols-12 md:gap-8 items-start">
        
        {/* Left Column (Desktop Only): Doctor Summary Card & Queue Preview */}
        <div className="md:col-span-5 space-y-4 md:sticky md:top-24 mb-5 md:mb-0">
          {/* Doctor Summary Card matching Image 3 */}
          <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-3.5">
              {/* Doctor Avatar Circle */}
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-blue-100 bg-blue-50">
                <img 
                  src={doctor.image} 
                  alt={doctor.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=EFF6FF&color=2563EB&size=100&bold=true`; }}
                />
              </div>
              
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{doctor.name}</h3>
                  <button 
                    onClick={() => toggleSaveDoctor(doctor.id)}
                    className="p-1 rounded-xl hover:bg-red-50 text-slate-400 transition-colors cursor-pointer"
                    title={user?.savedDoctors?.includes(doctor.id) ? "Remove from Favourite Doctors" : "Add to Favourite Doctors"}
                  >
                    <Heart size={16} className={user?.savedDoctors?.includes(doctor.id) ? "text-red-500 fill-red-500" : "text-slate-400 hover:text-red-400"} />
                  </button>
                </div>
                <p className="text-[11px] text-blue-600 font-extrabold">{doctor.specialty}</p>
                <p className="text-[10px] text-slate-400 font-medium">{hospital.name}</p>

                {/* Rating & Distance Badges */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="bg-amber-50 text-amber-700 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-100">
                    ★ {doctor.rating} ({doctor.reviewsCount})
                  </span>
                  <span className="bg-blue-50 text-blue-700 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-blue-100">
                    <MapPin size={10} /> {(userCoords && hospital?.lat && hospital?.lng) ? calculateDistanceKm(userCoords.lat, userCoords.lng, hospital.lat, hospital.lng) : (hospital?.distance || 2.5)} km away
                  </span>
                </div>
              </div>
            </div>

            {/* Consultation Fee Breakdown */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">OPD Consultation Fee</span>
                <span className="text-[9.5px] text-slate-500 font-semibold">Payable at clinic cabin</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900 block">₹{doctor.consultationFee}</span>
              </div>
            </div>
          </div>

          {/* Additional Desktop Banner Card */}
          <div className="hidden md:block bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-md">
            <h4 className="font-extrabold text-xs tracking-wide uppercase mb-1">Instant OPD Token Features</h4>
            <ul className="text-[11px] space-y-2 text-blue-50 font-medium mt-3">
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-300 shrink-0" />
                <span>Live queue tracking from mobile or desktop</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-300 shrink-0" />
                <span>Zero waiting inside crowded hospital halls</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-300 shrink-0" />
                <span>Automated SMS & WhatsApp alerts</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Slot & Patient Form */}
        <div className="md:col-span-7 space-y-5">

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
            {error}
          </div>
        )}


        <form onSubmit={handleProceedToBooking} className="space-y-5">
          
          {/* Section 1: Select Date matching Image 3 */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <CalendarIcon size={16} className="text-blue-600" />
                <span>1. Select Date</span>
              </h4>
              <div className="relative">
                <button 
                  type="button" 
                  onClick={handleOpenCalendar}
                  className="text-xs text-blue-600 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Calendar</span>
                  <CalendarIcon size={12} />
                </button>
                <input 
                  ref={dateInputRef}
                  type="date"
                  min={getTodayDateStr()}
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>

            {/* Horizontal Date Selector Pills */}
            <div className="grid grid-cols-5 gap-2">
              {dateOptions.map((dt) => {
                const isActive = selectedDate === dt.dateStr;
                return (
                  <button
                    key={dt.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dt.dateStr)}
                    className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-105' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{dt.label}</span>
                    <span className="text-lg font-black mt-0.5">{dt.dayNum}</span>
                    <span className={`text-[9px] font-medium ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{dt.month}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Select Session matching Image 3 */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 mb-2.5">
              <Clock size={16} className="text-blue-600" />
              <span>2. Select Session</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {sessionOptions.map((s) => {
                const isActive = selectedSession === s.id;
                return (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedSession(s.id as any)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isActive 
                        ? s.activeClass + ' shadow-xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 ${s.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                        {s.icon}
                      </div>
                      <div>
                        <h5 className="text-xs font-extrabold text-slate-900">{s.title}</h5>
                        <p className="text-[9.5px] text-slate-500 font-semibold mt-0.5">{s.timing}</p>
                      </div>
                    </div>

                    {/* Radio Circle */}
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isActive ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Patient Details Form Fields matching Image 3 */}
          <div className="scroll-mt-24">
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 mb-2.5">
              <User size={16} className="text-blue-600" />
              <span>3. Patient Details</span>
            </h4>

            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-2xs space-y-3.5">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter patient name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">Mobile Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10 digit mobile number"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Age & Gender 2-Column Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">Age</label>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input 
                      type="number" 
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Enter age"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">Gender</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-600 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Place */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">Place</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input 
                    type="text" 
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="Enter your place"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Existing Patient & RMP Reference */}
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="existingPatient"
                      checked={isExisting}
                      onChange={(e) => setIsExisting(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="existingPatient" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Existing Patient? <span className="text-[10px] font-medium text-slate-400">(Visited this hospital before)</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="addRmpReference"
                      checked={showRmpFields}
                      onChange={(e) => setShowRmpFields(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="addRmpReference" className="text-xs font-bold text-slate-700 cursor-pointer">
                      + Add RMP Reference
                    </label>
                  </div>
                </div>

                {showRmpFields && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-150 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">RMP Name</label>
                      <input 
                        type="text" 
                        value={rmpName} 
                        onChange={(e) => setRmpName(e.target.value)}
                        placeholder="Enter doctor/RMP name"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                        required={showRmpFields}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">RMP Phone Number</label>
                      <input 
                        type="tel" 
                        value={rmpPhone} 
                        onChange={(e) => setRmpPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                        required={showRmpFields}
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Platform Charge Info Note (Dynamic Platform Fee Breakdown) */}
          {(() => {
            const docFee = doctor.consultationFee || 500;
            const platFee = Math.max(10, Math.round(docFee * ((platformFeePercent || 5) / 100)));
            const totalPayable = docFee + platFee;

            return (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl space-y-2 text-xs font-bold text-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Stethoscope size={14} className="text-blue-600" />
                    <span>Doctor Consultation Fee</span>
                  </div>
                  <span className="font-extrabold text-slate-900">₹{docFee}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <Zap size={14} className="text-blue-600" />
                    <span>Platform Booking Fee ({platformFeePercent || 5}%)</span>
                  </div>
                  <span className="font-extrabold text-blue-700">₹{platFee}</span>
                </div>

                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-sm">
                  <span className="font-black text-slate-900">Total Payable</span>
                  <span className="font-black text-blue-700 text-base">₹{totalPayable}</span>
                </div>
              </div>
            );
          })()}

          {/* Giant Full-Width Pill CTA Button matching Image 3 */}
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2.5 flex items-center justify-between shadow-xl shadow-blue-500/25 transition-all cursor-pointer transform hover:scale-[1.01]"
          >
            {/* Left Ticket Circle */}
            <div className="w-11 h-11 bg-white text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-inner">
              <Ticket size={22} />
            </div>

            {/* Center Text */}
            <div className="text-center px-2">
              <h4 className="text-base font-black tracking-tight leading-tight">Book Token</h4>
              <p className="text-[10px] text-blue-100 font-medium">Get your token in just a few seconds</p>
            </div>

            {/* Right Arrow Circle */}
            <div className="w-11 h-11 bg-white text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-inner">
              <ArrowRight size={22} />
            </div>
          </button>

          {/* Bottom Trust Indicators matching Image 3 */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck size={18} className="text-blue-600 mb-1" />
              <span className="text-[10px] font-extrabold text-slate-800">100% Secure</span>
              <span className="text-[8px] text-slate-400 font-medium">Your data is safe</span>
            </div>

            <div className="flex flex-col items-center border-x border-slate-200">
              <Zap size={18} className="text-blue-600 mb-1" />
              <span className="text-[10px] font-extrabold text-slate-800">Ultra Fast</span>
              <span className="text-[8px] text-slate-400 font-medium">Book in 30 seconds</span>
            </div>

            <div className="flex flex-col items-center">
              <Users size={18} className="text-blue-600 mb-1" />
              <span className="text-[10px] font-extrabold text-slate-800">Trusted by 1M+</span>
              <span className="text-[8px] text-slate-400 font-medium">Happy patients</span>
            </div>
          </div>

        </form>
        </div>

      </div>
    </div>
  );
};
