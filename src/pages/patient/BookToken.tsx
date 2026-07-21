import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, User, Phone, 
  MapPin, ShieldCheck, Sun, Moon, Ticket, ArrowRight, Zap, Users,
  ChevronDown, Heart, Info
} from 'lucide-react';

export const BookToken: React.FC = () => {
  const { hospitalId, doctorId } = useParams<{ hospitalId: string; doctorId: string }>();
  const { hospitals, user, toggleSaveDoctor } = useApp();
  const navigate = useNavigate();
  const patientFormRef = useRef<HTMLDivElement>(null);

  const hospital = hospitals.find(h => h.id === hospitalId) || hospitals[0];
  const doctor = hospital?.doctors.find(d => d.id === doctorId) || hospital?.doctors[0];

  // States
  const [selectedDate, setSelectedDate] = useState<string>('2026-07-17');
  const [selectedSession, setSelectedSession] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Night'>('Morning');

  const sessionOptions = [
    { id: 'Morning', title: 'Morning', timing: '10:00 AM - 12:00 PM', icon: <Sun size={20} />, activeClass: 'bg-amber-50/70 border-amber-400', iconBg: 'bg-amber-100 text-amber-600' },
    { id: 'Afternoon', title: 'Afternoon', timing: '01:00 PM - 04:00 PM', icon: <Sun size={20} className="text-orange-500" />, activeClass: 'bg-orange-50/70 border-orange-400', iconBg: 'bg-orange-100 text-orange-600' },
    { id: 'Evening', title: 'Evening', timing: '05:00 PM - 09:00 PM', icon: <Moon size={20} />, activeClass: 'bg-blue-50/70 border-blue-500', iconBg: 'bg-blue-100 text-blue-600' },
    { id: 'Night', title: 'Night', timing: '09:00 PM - 12:00 AM', icon: <Moon size={20} className="text-indigo-600" />, activeClass: 'bg-indigo-50/70 border-indigo-500', iconBg: 'bg-indigo-100 text-indigo-600' }
  ];
  
  // Patient details form
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState<string>('28');
  const [gender, setGender] = useState<string>('Male');
  const [phone, setPhone] = useState(user?.phone || '+91 9876543210');
  const [place, setPlace] = useState('Vijayawada');
  const [isExisting, setIsExisting] = useState(false);
  
  const [error, setError] = useState('');

  // Smooth auto-scroll to patient details form after user views date & session options
  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientFormRef.current) {
        patientFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 700);
    return () => clearTimeout(timer);
  }, []);

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

  // Generate date pills
  const dateOptions = [
    { label: 'Today', dayNum: '17', month: 'Jul', dateStr: '2026-07-17' },
    { label: 'Sat', dayNum: '18', month: 'Jul', dateStr: '2026-07-18' },
    { label: 'Sun', dayNum: '19', month: 'Jul', dateStr: '2026-07-19' },
    { label: 'Mon', dayNum: '20', month: 'Jul', dateStr: '2026-07-20' },
    { label: 'Tue', dayNum: '21', month: 'Jul', dateStr: '2026-07-21' }
  ];

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
      isExisting
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
                    <MapPin size={10} /> {hospital.distance} km away
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

        {/* Step Guidance Banner for clear session/date identification & auto-scroll */}
        <div className="bg-blue-50/90 border border-blue-200 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-blue-950 font-bold shadow-2xs">
          <Info size={18} className="text-blue-600 shrink-0" />
          <span><b>Step 1:</b> Select your OPD <b>Date</b> & <b>Slot Session</b> below, then complete patient details.</span>
        </div>

        <form onSubmit={handleProceedToBooking} className="space-y-5">
          
          {/* Section 1: Select Date matching Image 3 */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <CalendarIcon size={16} className="text-blue-600" />
                <span>1. Select Date</span>
              </h4>
              <button type="button" className="text-xs text-blue-600 font-extrabold hover:underline flex items-center gap-1">
                <span>View Calendar</span>
                <CalendarIcon size={12} />
              </button>
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
          <div ref={patientFormRef} className="scroll-mt-24">
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

              {/* Existing Patient Checkbox */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
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

            </div>
          </div>

          {/* Platform Charge Info Note (User Audio Request: ₹10 platform fee paid directly) */}
          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-900">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-blue-600 shrink-0" />
              <span>Platform Service Fee: ₹10</span>
            </div>
            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md">INSTANT TOKEN</span>
          </div>

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
