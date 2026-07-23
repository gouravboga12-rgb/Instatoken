import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Calendar, Download, Share2, CheckCircle2, 
  Phone, Compass, Building2, User, Sun, CreditCard,
  AlertCircle, ArrowLeft
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
  const { appointments, addNotification } = useApp();
  const navigate = useNavigate();

  const appointment = appointments.find(a => a.id === appointmentId) || appointments[0];
  const { formattedDate, dayOfWeek, validUntilDate } = formatLocalDate(appointment?.date || '');

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 max-w-md mx-auto">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500 mb-4">Token record not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
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
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-6 max-w-5xl mx-auto">
      
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
          {/* Main Printable Digital Token Card matching Image 4 */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          {/* Blue Top Ticket Header Banner */}
          <div className="bg-blue-600 px-5 py-3.5 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white text-blue-600 rounded-lg flex items-center justify-center font-black text-sm shadow-sm">
                +
              </div>
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-blue-100 block">INSTATOKEN OFFICIAL</span>
                <h4 className="text-xs font-black truncate max-w-[220px]">{appointment.hospitalName}</h4>
                <p className="text-[9px] text-blue-100 font-medium">Kurnool Road, Adoni, Andhra Pradesh</p>
              </div>
            </div>

            {/* Paid Pill Badge */}
            <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              PAID <CheckCircle2 size={10} className="stroke-[3]" />
            </span>
          </div>

          {/* Ticket Body Content */}
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 items-center border-b border-slate-100 pb-5">
              
              {/* Left Column: Token #8 & QR Code */}
              <div className="flex flex-col items-center text-center pr-3 border-r border-slate-100">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">YOUR OPD TOKEN</span>
                <span className="text-6xl font-black text-blue-600 tracking-tight my-1 font-heading">
                  {appointment.tokenNumber || 8}
                </span>

                {/* QR Code Container */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl my-2 shadow-inner">
                  <QRCodeSVG 
                    value={qrPayload}
                    size={105}
                    level="M"
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-400">Token ID: ITK-0262</span>
              </div>

              {/* Right Column: Doctor, Patient, Session, Date */}
              <div className="space-y-3 pl-1">
                
                {/* Doctor */}
                <div>
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-wide">DOCTOR</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                      <User size={14} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900 leading-tight">{appointment.doctorName}</h5>
                      <p className="text-[9.5px] text-slate-400 font-semibold">{appointment.departmentName}</p>
                    </div>
                  </div>
                </div>

                {/* Patient */}
                <div>
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-wide">PATIENT</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                      <User size={14} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900 leading-tight">{appointment.patientName}</h5>
                      <p className="text-[9.5px] text-slate-400 font-semibold">{appointment.gender} • {appointment.age} yrs</p>
                    </div>
                  </div>
                </div>

                {/* Session Card (Green Tint) */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 flex items-center gap-2">
                  <Sun size={18} className="text-amber-500 shrink-0" />
                  <div>
                    <span className="text-[8px] font-extrabold text-emerald-800 uppercase block">SESSION</span>
                    <span className="text-[10px] font-black text-emerald-700 block">{appointment.time || 'Morning Session'}</span>
                  </div>
                </div>

                {/* Date Card (Blue Tint) */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-600 shrink-0" />
                  <div>
                    <span className="text-[8px] font-extrabold text-blue-800 uppercase block">DATE</span>
                    <span className="text-[10px] font-black text-blue-700 block">{formattedDate}</span>
                    <span className="text-[8px] text-slate-500 font-bold">{dayOfWeek}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Doctor Consultation Fee Card (Matching Image 4) */}
            <div className="mt-4 bg-gradient-to-r from-amber-50/70 to-yellow-50/70 border border-blue-400 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard size={12} className="text-blue-600" /> DOCTOR CONSULTATION FEE
                </span>
                <span className="text-3xl font-black text-blue-600 block font-heading">₹{appointment.fee || 800}</span>
              </div>

              <div className="text-right">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-md inline-block uppercase shadow-sm">
                  PAY AT HOSPITAL
                </span>
                <h5 className="text-[10px] font-black text-slate-900 mt-1">PAY AT HOSPITAL</h5>
              </div>
            </div>

            {/* Consultation Validity Dates Banner */}
            <div className="mt-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
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
            onClick={() => navigate(`/hospital/${appointment.hospitalId}`)}
            className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-blue-300 transition-all cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </div>
            <div className="text-left min-w-0">
              <h5 className="text-[10.5px] sm:text-xs font-extrabold text-slate-900 leading-tight truncate">View Hospital</h5>
              <p className="text-[8.5px] sm:text-[9px] text-slate-400 font-medium truncate">Details</p>
            </div>
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
