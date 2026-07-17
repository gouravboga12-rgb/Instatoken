import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, Download, Share2, ArrowRight, Home, CheckCircle2 } from 'lucide-react';

export const TokenConfirmation: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { appointments, addNotification } = useApp();
  const navigate = useNavigate();

  const appointment = appointments.find(a => a.id === appointmentId);

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
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:bg-transparent md:pb-6 max-w-2xl mx-auto flex flex-col justify-between">
      
      {/* Scrollable Content */}
      <div className="px-5 py-6 flex-1">
        
        {/* Success Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-emerald-100 p-2.5 rounded-full mb-3 flex items-center justify-center text-emerald-600 animate-scale-in">
            <CheckCircle2 size={32} className="stroke-[2.5]" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight font-heading">Token Booked!</h2>
          <p className="text-slate-400 text-xs mt-1">Your payment was authenticated successfully.</p>
        </div>

        {/* Ticket Outer Wrapper */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden relative">
          
          {/* Ticket Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-4 flex justify-between items-center text-white">
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-blue-100">InstaToken Official</p>
              <h4 className="text-xs font-extrabold truncate max-w-[200px] mt-0.5">{appointment.hospitalName}</h4>
            </div>
            <Badge variant="green" className="bg-emerald-500/20 text-emerald-100 border-none px-2.5 py-0.5 rounded-md">
              PAID
            </Badge>
          </div>

          <div className="p-6 flex flex-col items-center border-b border-dashed border-slate-200 relative">
            
            {/* Token Block */}
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">Your OPD Token</div>
            <div className="text-5xl font-black text-blue-600 tracking-tight font-heading">{appointment.tokenNumber}</div>
            
            {/* QR Code Container */}
            <div className="p-4 border border-slate-100 rounded-3xl bg-slate-50 my-5 shadow-inner">
              <QRCodeSVG 
                value={qrPayload}
                size={120}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-[9px] text-slate-400 font-mono">ID: {appointment.id}</p>

            {/* Dotted cut mock marks (ticket punch holes) */}
            <div className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-slate-50 rounded-full border border-slate-100" />
            <div className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-slate-50 rounded-full border border-slate-100" />
          </div>

          {/* Ticket Body details */}
          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Doctor</p>
                <p className="font-extrabold text-slate-700 mt-0.5">{appointment.doctorName}</p>
                <p className="text-[10px] text-blue-600 font-medium">{appointment.departmentName}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Patient</p>
                <p className="font-extrabold text-slate-700 mt-0.5">{appointment.patientName}</p>
                <p className="text-[10px] text-slate-400">{appointment.gender}, {appointment.age} yrs</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
              <div className="flex items-start gap-2">
                <Calendar size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Date</p>
                  <p className="font-semibold text-slate-700">{appointment.date}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Expected Slot</p>
                  <p className="font-semibold text-slate-700">{appointment.time}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Booking Pass Fee</p>
                <p className="font-semibold text-slate-700 mt-0.5">₹{appointment.paymentMethod === "ACTIVE_PASS" ? "0.00" : "10.00"} (Paid)</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">Consultation Fee</p>
                <p className="font-extrabold text-blue-600 mt-0.5">₹{appointment.fee.toFixed(2)}</p>
                <p className="text-[8.5px] text-slate-400 font-extrabold uppercase mt-0.5">Pay at Hospital Cabin</p>
              </div>
            </div>

            {/* Waiting estimate banner */}
            <div className="p-3 bg-emerald-50 rounded-2xl flex items-center justify-between text-emerald-800 font-bold text-[10px]">
              <span>Estimated Cabin Entry Wait:</span>
              <span className="text-emerald-700 text-xs font-black">{appointment.estimatedWaitTime} minutes</span>
            </div>
          </div>

        </div>

        {/* Action icons row */}
        <div className="grid grid-cols-2 gap-3.5 my-6">
          <button 
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 hover:border-slate-300 rounded-xl bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download size={14} />
            Download PDF
          </button>
          
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 hover:border-slate-300 rounded-xl bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Share2 size={14} />
            Share Ticket
          </button>
        </div>

      </div>

      {/* Persistent Button Footer */}
      <div className="px-5 pb-6 space-y-3">
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth 
          onClick={() => navigate(`/livestatus/${appointment.id}`)}
          className="py-3 flex items-center justify-center gap-2 font-bold"
        >
          <span>Track Live OPD Queue</span>
          <ArrowRight size={16} />
        </Button>

        <button 
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-500 font-bold hover:text-blue-600 transition-colors cursor-pointer"
        >
          <Home size={14} />
          Back to Home Page
        </button>
      </div>

    </div>
  );
};
