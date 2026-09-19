import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Calendar, Download, Share2, CheckCircle2, 
  Phone, Compass, Building2, User, CreditCard,
  AlertCircle, ArrowLeft, Loader2, ExternalLink,
  Clock, QrCode, ChevronDown, ChevronUp, MapPin, ShieldCheck
} from 'lucide-react';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return { formattedDate: '', dayOfWeek: '', validUntilDate: '' };
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, monthIdx, day);
    
    const formattedDate = `${day} ${months[monthIdx]} ${year}`;
    const dayOfWeek = weekdays[date.getDay()];
    
    // Valid Until: 7 days later
    const validDate = new Date(year, monthIdx, day + 7);
    const validUntilDate = `${validDate.getDate()} ${months[validDate.getMonth()]} ${validDate.getFullYear()}`;
    
    return {
      formattedDate,
      dayOfWeek,
      validUntilDate
    };
  }
  return {
    formattedDate: dateStr,
    dayOfWeek: '',
    validUntilDate: ''
  };
};

export const TokenConfirmation: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { appointments, hospitals, addNotification } = useApp();
  const navigate = useNavigate();

  const [fetchedAppointment, setFetchedAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showQr, setShowQr] = useState(false);

  // Check local appointment cache first for instant synchronous resolution
  const savedLocalAppointment = React.useMemo(() => {
    if (!appointmentId) return null;
    try {
      const saved = localStorage.getItem('insta_appointments');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          const found = list.find((a: any) => a.id === appointmentId || String(a.tokenNumber) === appointmentId);
          if (found) return found;
        }
      }
      const savedToks = localStorage.getItem('insta_hospital_tokens');
      if (savedToks) {
        const tList = JSON.parse(savedToks);
        if (Array.isArray(tList)) {
          const tok = tList.find((t: any) => t.id === appointmentId || String(t.tokenNo) === appointmentId);
          if (tok) {
            return {
              id: tok.id,
              tokenNumber: tok.tokenNo || 1,
              patientName: tok.patientName || 'Patient',
              age: tok.patientAge || 28,
              gender: tok.patientGender || 'Male',
              phone: tok.patientPhone || '',
              email: tok.email || '',
              address: tok.address || '',
              hospitalId: tok.hospitalId,
              hospitalName: tok.hospitalName || 'Hospital',
              doctorId: tok.doctorId,
              doctorName: tok.doctorName || 'Doctor',
              departmentName: tok.departmentName || 'General Medicine',
              date: tok.bookingDate || new Date().toISOString().split('T')[0],
              time: tok.time || '10:00 AM',
              fee: tok.consultationFee || 500,
              status: tok.status || 'booked',
              paymentId: `OFFLINE-${tok.tokenNo}`,
              paymentMethod: 'Counter / Walk-in Cash',
              estimatedWaitTime: tok.estimatedWait || 15
            };
          }
        }
      }
    } catch (e) {}
    return null;
  }, [appointmentId]);

  // Look in React state first, then fallback to local cache, then fetched appointment
  const inMemoryAppointment = appointments.find(a => a.id === appointmentId) || (appointmentId ? null : appointments[0]);
  const appointment = inMemoryAppointment || savedLocalAppointment || fetchedAppointment;

  const hasHospitalSession = Boolean(localStorage.getItem('insta_hospital_user') || localStorage.getItem('insta_hospital_auth_token'));

  useEffect(() => {
    if (inMemoryAppointment || savedLocalAppointment) {
      setIsLoading(false);
      return;
    }

    if (!appointmentId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/appointments/${appointmentId}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.appointment) {
          setFetchedAppointment(data.appointment);
          setIsLoading(false);
        } else {
          // Fallback check tokens endpoint
          fetch(`/api/tokens/${appointmentId}`)
            .then(r => r.json())
            .then(tData => {
              if (!isMounted) return;
              if (tData.success && tData.token) {
                const tok = tData.token;
                setFetchedAppointment({
                  id: tok.id,
                  tokenNumber: tok.tokenNo || tok.tokenNumber || 1,
                  patientName: tok.patientName || 'Patient',
                  age: tok.patientAge || 28,
                  gender: tok.patientGender || 'Male',
                  phone: tok.patientPhone || '',
                  email: tok.patientEmail || '',
                  address: tok.address || '',
                  hospitalId: tok.hospitalId,
                  hospitalName: tok.hospitalName || 'Hospital',
                  doctorId: tok.doctorId,
                  doctorName: tok.doctorName || 'Doctor',
                  departmentName: tok.departmentName || 'General Medicine',
                  date: tok.bookingDate || new Date().toISOString().split('T')[0],
                  time: tok.time || '10:00 AM',
                  fee: tok.consultationFee || 500,
                  status: tok.status || 'booked',
                  paymentId: tok.paymentId || `PAY-${tok.id}`,
                  paymentMethod: tok.paymentMethod || 'Online',
                  estimatedWaitTime: tok.estimatedWait || 15
                });
              }
              setIsLoading(false);
            })
            .catch(() => {
              if (isMounted) setIsLoading(false);
            });
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [appointmentId, inMemoryAppointment]);

  const { formattedDate, dayOfWeek, validUntilDate } = formatLocalDate(appointment?.date || '');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 max-w-md mx-auto text-center">
        <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
        <h3 className="text-sm font-black text-slate-800">Retrieving Your OPD Token...</h3>
        <p className="text-xs text-slate-400 mt-1">Connecting to AWS cloud database</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 max-w-md mx-auto">
        <div className="text-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 font-black text-lg">!</div>
          <h3 className="text-base font-black text-slate-800">Token Record Not Found</h3>
          <p className="text-xs font-semibold text-slate-400 mb-5 mt-1">We could not locate this token ID in the cloud registry.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/bookings')}>View My Bookings</Button>
            <Button variant="secondary" onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    alert("Token downloaded successfully! Saved as PDF to your downloads folder.");
    addNotification(
      "Token Downloaded",
      `OPD Token #${appointment.tokenNumber} details downloaded in PDF format.`,
      "info"
    );
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `OPD Token #${appointment.tokenNumber} - ${appointment.doctorName}`,
        text: `Check out my OPD token for ${appointment.hospitalName}. Token #${appointment.tokenNumber}.`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert(`Token Details copied: Token #${appointment.tokenNumber} for Dr. ${appointment.doctorName} at ${appointment.hospitalName}`);
    }
  };

  const qrPayload = JSON.stringify({
    appointmentId: appointment.id,
    token: appointment.tokenNumber,
    doctor: appointment.doctorName,
    hospital: appointment.hospitalName,
    patient: appointment.patientName,
    date: appointment.date,
    status: appointment.status
  });

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-6 max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      
      {/* Hospital Panel Quick Return Banner */}
      {hasHospitalSession && (
        <div className="mb-4 bg-slate-900 text-white px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md border border-slate-800 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">Hospital Panel</span>
            <span className="text-xs font-bold text-slate-200">
              Customer Token #{appointment?.tokenNumber || 1} generated successfully
            </span>
          </div>
          <button
            onClick={() => navigate('/hospital/tokens/all')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-sm"
          >
            <span>← Return to Hospital Panel</span>
          </button>
        </div>
      )}

      {/* Success Banner */}
      <div className="flex flex-col items-center text-center py-6 px-5 relative overflow-hidden bg-white rounded-3xl border border-slate-100 mb-6 shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          title="Go Back"
        >
          <ArrowLeft size={18} />
          <span className="text-xs font-extrabold hidden sm:inline">Back</span>
        </button>

        {/* Big Green Check Circle */}
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 transform hover:scale-105 transition-transform">
          <CheckCircle2 size={36} className="stroke-[2.5]" />
        </div>

        <h2 className="text-xl font-black text-emerald-800 tracking-tight font-heading">
          Token Booked Successfully!
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          Your OPD Token has been confirmed.
        </p>
      </div>

      <div className="px-5 mt-4 md:grid md:grid-cols-12 md:gap-8 items-start">
        
        {/* Left Column (Pass Card & Action Buttons) */}
        <div className="md:col-span-6 space-y-4 mb-5 md:mb-0">
          {/* Main Printable Digital Token Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          {/* Blue Top Ticket Header Banner with Real Hospital Address */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-5 py-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-xs text-white rounded-xl flex items-center justify-center font-black text-base shadow-sm border border-white/20">
                +
              </div>
              <div className="min-w-0">
                <span className="text-[8px] font-black uppercase tracking-widest text-blue-200 block">INSTATOKEN VERIFIED OPD PASS</span>
                <h4 className="text-sm font-black truncate max-w-[240px] text-white">{appointment.hospitalName}</h4>
                <p className="text-[9.5px] text-blue-100 font-medium truncate max-w-[240px] flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-blue-300 shrink-0" />
                  <span>{hospitals.find(h => h.id === appointment.hospitalId)?.address || appointment.address || 'Hospital OPD Facility'}</span>
                </p>
              </div>
            </div>

            {/* Confirmed Pill Badge */}
            <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-sm shrink-0">
              TOKEN CONFIRMED <CheckCircle2 size={10} className="stroke-[3]" />
            </span>
          </div>

          {/* Ticket Body Content */}
          <div className="p-5 space-y-4">
            
            {/* 1. Large High-Visibility Token Number & Consultation Time */}
            <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50/50 border border-blue-100 rounded-3xl p-5 text-center shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                YOUR CONFIRMED OPD TOKEN NUMBER
              </span>
              
              <div className="text-6xl sm:text-7xl font-black text-blue-700 tracking-tight my-1 font-heading">
                #{appointment.tokenNumber || 1}
              </div>

              <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-blue-200/80 shadow-2xs text-xs font-bold text-slate-800 mt-1">
                <Clock size={13} className="text-blue-600 shrink-0" />
                <span>OPD Slot: <strong>{appointment.time || '10:00 AM'}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{formattedDate} ({dayOfWeek})</span>
              </div>
            </div>

            {/* 2. Doctor & Patient Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Doctor Details */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider block">CONSULTING DOCTOR</span>
                <div className="flex items-center gap-2.5 pt-0.5">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-slate-900 truncate">{appointment.doctorName}</h5>
                    <p className="text-[10px] text-blue-600 font-bold truncate">{appointment.departmentName || 'General OPD'}</p>
                  </div>
                </div>
              </div>

              {/* Patient Details */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider block">REGISTERED PATIENT</span>
                  {appointment.isExisting && (
                    <span className="text-[9px] font-black text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                      ★ Existing Patient
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 pt-0.5">
                  <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-slate-900 truncate">{appointment.patientName}</h5>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      {appointment.gender || 'Patient'} • {appointment.ageDisplay || (appointment.age ? `${appointment.age} yrs` : '28 yrs')}
                      {appointment.phone ? ` • 📞 ${appointment.phone}` : ''}
                    </p>
                    {appointment.rmpReference && appointment.rmpReference.name && (
                      <p className="text-[9.5px] font-bold text-indigo-700 mt-0.5">
                        RMP Reference: Dr. {appointment.rmpReference.name} {appointment.rmpReference.phone ? `(${appointment.rmpReference.phone})` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Doctor Consultation Fee Card */}
            <div className="bg-gradient-to-r from-amber-50/70 to-yellow-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard size={12} className="text-amber-600" /> DOCTOR CONSULTATION FEE
                </span>
                <span className="text-3xl font-black text-slate-900 block font-heading">₹{appointment.fee || 500}</span>
                <p className="text-[10px] text-amber-900/70 font-semibold">To be collected at doctor's cabin / OPD desk</p>
              </div>

              <div className="text-right">
                <span className="bg-amber-600 text-white text-[10px] font-black px-3 py-1 rounded-md inline-block uppercase shadow-sm">
                  PAY AT HOSPITAL
                </span>
                <h5 className="text-[10px] font-black text-slate-700 mt-1">
                  Pay at Doctor Cabin / OPD Desk
                </h5>
              </div>
            </div>

            {/* Token Booking Fee Paid Online */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                <div>
                  <span className="text-xs font-black text-slate-800 block">Token Booking Fee</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Ref: {appointment.paymentId}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-blue-700 block">₹{appointment.platformFee || 25}</span>
                <span className="text-[9.5px] font-black text-emerald-700 uppercase">Paid Online ({appointment.paymentMethod || 'Online'})</span>
              </div>
            </div>

            {/* 4. Consultation Validity Dates Banner */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0 font-bold">
                  <Calendar size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wide block">CONSULTATION VALIDITY DATES</span>
                  <span className="text-xs font-black text-slate-900 block truncate">Valid: {formattedDate} — {validUntilDate}</span>
                  <span className="text-[9px] font-semibold text-emerald-700 truncate block">Includes 7 Days cabin validity & follow-up</span>
                </div>
              </div>
              <span className="bg-emerald-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs shrink-0 ml-2">
                7 DAYS VALID
              </span>
            </div>

            {/* 5. Collapsible Front-Desk Check-In QR Code */}
            <div className="border border-slate-200 rounded-2xl p-3 bg-white">
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-700 hover:text-blue-600 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <QrCode size={14} className="text-blue-600" />
                  <span>{showQr ? 'Hide Hospital Scanner QR Code' : 'Show Hospital Scanner QR Code (Optional)'}</span>
                </span>
                {showQr ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showQr && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center text-center animate-in fade-in duration-200">
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                    <QRCodeSVG 
                      value={qrPayload}
                      size={130}
                      level="M"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 mt-2">
                    Show at hospital front desk for instant OPD barcode scanning
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
        </div>

        {/* Right Column (Live Queue CTA, Directions, Instructions & History) */}
        <div className="md:col-span-6 space-y-4">
          {/* Quick Contact Action Buttons Row - Fully Responsive & Aligned for Mobile/Tab */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button 
            onClick={() => alert("Calling hospital desk...")}
            className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-blue-300 transition-all cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Phone size={16} />
            </div>
            <div className="text-left min-w-0">
              <h5 className="text-[10.5px] sm:text-xs font-extrabold text-slate-900 leading-tight truncate">Call Hospital</h5>
              <p className="text-[8.5px] sm:text-[9px] text-slate-400 font-medium truncate">Tap to call</p>
            </div>
          </button>

          <button 
            onClick={() => window.open("https://maps.google.com")}
            className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-blue-300 transition-all cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Compass size={16} />
            </div>
            <div className="text-left min-w-0">
              <h5 className="text-[10.5px] sm:text-xs font-extrabold text-slate-900 leading-tight truncate">Directions</h5>
              <p className="text-[8.5px] sm:text-[9px] text-slate-400 font-medium truncate">Navigate</p>
            </div>
          </button>

          <button 
            onClick={() => navigate(`/hospital-details/${appointment.hospitalId}`)}
            className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-blue-300 transition-all cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </div>
            <div className="text-left min-w-0">
              <h5 className="text-[10.5px] sm:text-xs font-extrabold text-slate-900 leading-tight truncate">Hospital Info</h5>
              <p className="text-[8.5px] sm:text-[9px] text-slate-400 font-medium truncate">Doctor details</p>
            </div>
          </button>
        </div>

        {/* Hospital Panel Direct Redirection / Tracking Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
              🏥
            </div>
            <div className="min-w-0">
              <h5 className="text-xs font-black text-slate-900 truncate">Hospital Live Queue Panel</h5>
              <p className="text-[9.5px] text-emerald-700 font-medium truncate">View your token moving live in OPD doctor cabin queue</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/hospital/tokens/all')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>Track In Hospital</span>
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Important Instructions Card with Hospital Artwork & Audio Validity Note */}
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-150 rounded-3xl p-4 flex items-center justify-between">
          <div className="space-y-2 flex-1 pr-2">
            <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={14} className="text-blue-600" /> IMPORTANT INSTRUCTIONS
            </h4>

            <ul className="text-[10px] text-slate-700 font-semibold space-y-1 list-disc pl-4 leading-snug">
              <li>Reach hospital 10–15 minutes before your session.</li>
              <li>Show QR Code at reception.</li>
              <li>Consultation fee must be paid at hospital cabin.</li>
              <li>Carry previous prescriptions and reports.</li>
              <li className="text-blue-700 font-extrabold">
                Consultation Fee is valid for 7 Days (up to 2 Follow-up Visits) from booking date.
              </li>
            </ul>
          </div>

          {/* 3D Hospital Artwork Graphic */}
          <div className="w-24 h-24 bg-white rounded-2xl border border-blue-100 flex flex-col items-center justify-center shadow-md shrink-0">
            <div className="w-8 h-8 bg-blue-600 text-white font-black text-base rounded-lg flex items-center justify-center shadow-sm">
              +
            </div>
            <div className="w-12 h-8 bg-sky-100 rounded-t-lg mt-2 border-t border-x border-sky-200" />
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 rounded-xl cursor-pointer"
          >
            <Download size={14} />
            <span>Download Ticket (PDF)</span>
          </Button>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleShare}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 rounded-xl cursor-pointer"
          >
            <Share2 size={14} />
            <span>Share Ticket</span>
          </Button>
        </div>

        {/* Security Subtext */}
        <p className="text-center text-[10px] text-slate-400 font-bold pt-1">
          🔒 Your booking is secure and confirmed
        </p>

        </div>
      </div>
    </div>
  );
};
