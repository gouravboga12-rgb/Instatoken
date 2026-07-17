import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Check, UserPlus, AlertCircle, Sparkles, Zap } from 'lucide-react';

export const BookToken: React.FC = () => {
  const { hospitalId, doctorId } = useParams<{ hospitalId: string; doctorId: string }>();
  const { hospitals, user, bookToken } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const activePass = user?.subscription && new Date(user.subscription.expiresAt) > new Date();
    if (!activePass) {
      navigate(`/plans?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [user, navigate, location]);

  const hospital = hospitals.find(h => h.id === hospitalId);
  const doctor = hospital?.doctors.find(d => d.id === doctorId);

  // States
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [patientSource, setPatientSource] = useState<'self' | 'family' | 'new'>('self');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  
  // Patient details form
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState<string>('28');
  const [gender, setGender] = useState<string>('Male');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('Koramangala, Bengaluru');
  const [isExisting, setIsExisting] = useState(true);
  
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

  // Generate next 5 dates for calendar select
  const getDates = () => {
    const dates = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      const dayName = daysOfWeek[d.getDay()];
      // Check if doctor works on this day (Availability days)
      const isAvailable = doctor.availability.days.includes(dayName);

      dates.push({
        isoString: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        dayName,
        monthName: months[d.getMonth()],
        isAvailable
      });
    }
    return dates;
  };

  const datesList = getDates();

  // Set initial date if not set
  if (!selectedDate && datesList.length > 0) {
    const firstAvailable = datesList.find(d => d.isAvailable);
    if (firstAvailable) {
      setSelectedDate(firstAvailable.isoString);
    }
  }

  const handleFamilySelect = (memberId: string) => {
    const member = user?.familyMembers.find(m => m.id === memberId);
    if (member) {
      setSelectedFamilyId(memberId);
      setName(member.name);
      setAge(member.age.toString());
      setGender(member.gender);
      setPhone(user?.phone || '');
      setEmail(user?.email || '');
    }
  };

  const handlePatientTypeChange = (type: 'self' | 'family' | 'new') => {
    setPatientSource(type);
    setError('');
    
    if (type === 'self' && user) {
      setName(user.name);
      setAge('28');
      setGender('Male');
      setPhone(user.phone);
      setEmail(user.email);
    } else if (type === 'family') {
      if (user?.familyMembers && user.familyMembers.length > 0) {
        handleFamilySelect(user.familyMembers[0].id);
      } else {
        setName('');
        setAge('');
        setGender('Male');
      }
    } else {
      setName('');
      setAge('');
      setGender('Male');
      setPhone('');
      setEmail('');
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedDate) {
      setError('Please select an appointment date');
      return;
    }
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }
    if (!name || !age || !phone || !email) {
      setError('Please fill in all patient fields');
      return;
    }

    const patientDetails = {
      name,
      age: parseInt(age),
      gender,
      phone,
      email,
      address,
      isExisting
    };

    try {
      const appt = bookToken(
        patientDetails,
        hospital.id,
        doctor.id,
        selectedDate,
        selectedSlot,
        "ACTIVE_PASS"
      );
      
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      }).catch(() => {});

      navigate(`/confirmation/${appt.id}`);
    } catch (err) {
      alert("Booking failed. Please try again.");
    }
  };

  // Calculate live token queue metrics
  const tokensAhead = Math.max(0, doctor.nextAvailableToken - doctor.currentQueue - 1);
  const queueTimeEst = tokensAhead * doctor.estimatedWaitPerPatient;

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:bg-transparent md:pb-6 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">Configure Booking</h2>
      </div>

      <div className="px-5 mt-4">
        
        {/* Doctor Summary Card */}
        <Card className="flex items-center gap-3.5 mb-5 border-none shadow-xs bg-gradient-to-r from-blue-600 to-sky-600 text-white p-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/20">
            <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight">{doctor.name}</h3>
            <p className="text-[10px] text-blue-100 font-medium">{doctor.specialty}</p>
            <p className="text-[9px] text-white/80 line-clamp-1 mt-0.5">{hospital.name}</p>
          </div>
        </Card>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleProceedToPayment} className="space-y-5">
          
          {/* Calendar Picker */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">Select Appointment Date</label>
            <div className="grid grid-cols-5 gap-2">
              {datesList.map((dt) => (
                <button
                  key={dt.isoString}
                  type="button"
                  disabled={!dt.isAvailable}
                  onClick={() => setSelectedDate(dt.isoString)}
                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                    !dt.isAvailable 
                      ? 'bg-slate-100 border-transparent text-slate-300 pointer-events-none' 
                      : selectedDate === dt.isoString
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10 scale-105'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[8px] font-semibold uppercase">{dt.dayName}</span>
                  <span className="text-sm font-black mt-0.5">{dt.dayNum}</span>
                  <span className="text-[8px] mt-0.5">{dt.monthName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slot Grid */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">Available Slots</label>
            <div className="grid grid-cols-4 gap-2">
              {doctor.availability.slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2 text-[10px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    selectedSlot === slot
                      ? 'bg-slate-800 border-slate-800 text-white'
                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Patient Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">Who is the Patient?</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => handlePatientTypeChange('self')}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${patientSource === 'self' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Self
              </button>
              <button
                type="button"
                onClick={() => handlePatientTypeChange('family')}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${patientSource === 'family' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Family Member
              </button>
              <button
                type="button"
                onClick={() => handlePatientTypeChange('new')}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${patientSource === 'new' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Add Details
              </button>
            </div>

            {patientSource === 'family' && (
              <div className="mb-3">
                {user?.familyMembers && user.familyMembers.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {user.familyMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleFamilySelect(m.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 transition-all ${selectedFamilyId === m.id ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-500'}`}
                      >
                        {m.name} ({m.relationship})
                        {selectedFamilyId === m.id && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-white border border-slate-100 rounded-2xl flex flex-col items-center">
                    <p className="text-[10px] text-slate-400 font-semibold mb-2">No family members registered</p>
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <UserPlus size={12} /> Add Family Member
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Age"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile number"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Address</label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full Address"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Existing Patient Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-slate-700">Existing Patient?</label>
                <p className="text-[9px] text-slate-400">Have you visited this hospital before?</p>
              </div>
              <input 
                type="checkbox" 
                checked={isExisting}
                onChange={(e) => setIsExisting(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Queue Wait Time Analytics Alert */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-3xl flex gap-3">
            <Clock className="text-emerald-600 mt-0.5 shrink-0 animate-pulse" size={18} />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">Queue Time Indicator</p>
              <p className="text-[10px] text-emerald-700 leading-relaxed mt-0.5 font-semibold">
                Token Assigned will be approx. <strong>#{doctor.nextAvailableToken}</strong>. 
                There are <strong>{tokensAhead} patients</strong> in line before you. Estimated waiting time is <strong>{queueTimeEst} minutes</strong>.
              </p>
            </div>
          </div>

          {/* Platform Subscription Billing Details */}
          {user?.subscription && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-3xl flex items-start gap-3">
              <Zap className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-blue-800">Active Booking Pass Detected</p>
                <p className="text-[10px] text-blue-700 leading-normal mt-0.5 font-semibold">
                  Your <strong>{user.subscription.planName}</strong> is active (expires on {new Date(user.subscription.expiresAt).toLocaleDateString()}). Platform booking fee is fully covered.
                </p>
                <p className="text-[9.5px] text-slate-500 mt-1 font-bold">Doctor OPD consultation fee of ₹{doctor.consultationFee} is payable directly at the hospital cabin.</p>
              </div>
            </div>
          )}

          {/* Checkout Submit */}
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            fullWidth 
            className="py-3 mt-4 text-sm font-bold flex items-center justify-center gap-2"
          >
            <span>Confirm & Generate Token (Free)</span>
            <Sparkles size={16} />
          </Button>

        </form>

      </div>
    </div>
  );
};
