import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, AlertTriangle, CheckCircle, Navigation, PhoneCall, Calendar, Building2 } from 'lucide-react';

export const LiveTokenStatus: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { appointments, hospitals } = useApp();
  const navigate = useNavigate();

  const appointment = appointments.find(a => a.id === appointmentId);

  // Find doctor and hospital associated with this booking
  const hospital = hospitals.find(h => h.id === appointment?.hospitalId);
  const doctor = hospital?.doctors.find(d => d.id === appointment?.doctorId);

  if (!appointment || !hospital || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 max-w-md mx-auto">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500 mb-4">Active queue record not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Calculate remaining queue metrics
  const currentToken = doctor.currentQueue;
  const userToken = appointment.tokenNumber;
  const patientsAhead = Math.max(0, userToken - currentToken - 1);
  const remainingWaitTime = patientsAhead * doctor.estimatedWaitPerPatient;

  // Determine current status step
  let step = 1; // 1: Checked In, 2: In Waiting Area, 3: Next Up, 4: In Consultation / Served
  if (currentToken === userToken) {
    step = 4;
  } else if (currentToken === userToken - 1) {
    step = 3;
  } else if (currentToken < userToken - 1 && currentToken > 0) {
    step = 2;
  } else if (currentToken >= userToken) {
    step = 4; // Already served
  }

  const stepsList = [
    { num: 1, label: "Token Confirmed", desc: "Checked in digitally" },
    { num: 2, label: "In Waiting Area", desc: `${patientsAhead} patients ahead` },
    { num: 3, label: "Next to Cabin", desc: "Prepare to enter" },
    { num: 4, label: "In Consultation", desc: "Doctor is ready" }
  ];

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-6 w-full flex flex-col justify-between">
      
      {/* Scrollable Content */}
      <div className="px-5 py-6 flex-1">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 md:bg-white md:p-4 md:rounded-2xl md:shadow-xs border-b border-slate-100">
          <button 
            onClick={() => navigate('/')}
            className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors bg-white shadow-xs cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">Live Queue Tracker</h2>
            <p className="text-[10px] text-slate-400 font-semibold">{appointment.hospitalName} • Dr. {appointment.doctorName}</p>
          </div>
        </div>

        <div className="md:grid md:grid-cols-12 md:gap-8 items-start">
          
          {/* Left Column: Big Live Dashboard */}
          <div className="md:col-span-5 space-y-4 mb-5 md:mb-0">
            {/* Big Live Dashboard */}
            <Card className="p-6 border-none shadow-xl bg-white text-center relative overflow-hidden flex flex-col items-center">
              
              {/* Pulsing Live indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5 text-[9px] font-bold text-red-600 animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                LIVE QUEUE
              </div>

              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-4">Cabin Entry Wait Estimation</p>
              
              {/* Waiting estimation dial */}
              <div className="my-6 relative w-36 h-36 rounded-full border-4 border-slate-100 flex flex-col items-center justify-center bg-slate-50 shadow-inner">
                {step === 4 ? (
                  <>
                    <CheckCircle size={36} className="text-emerald-500 stroke-[2.5] mb-1.5 animate-bounce" />
                    <span className="text-[10px] font-black text-emerald-600">Your Turn Now!</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-black text-slate-800 tracking-tight font-heading">{remainingWaitTime}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">minutes left</span>
                  </>
                )}
              </div>

              {/* OPD Token Numbers Info */}
              <div className="grid grid-cols-2 gap-4 w-full border-t border-slate-100 pt-4 mt-2">
                <div className="border-r border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Active Token</span>
                  <span className="text-2xl font-black text-slate-800 font-heading block mt-0.5 animate-pulse">{currentToken || '--'}</span>
                  <span className="text-[8px] text-slate-400">Currently in cabin</span>
                </div>
                
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Your Token</span>
                  <span className="text-2xl font-black text-blue-600 font-heading block mt-0.5">{userToken}</span>
                  <span className="text-[8px] text-slate-400">Assigned OPD slot</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Queue Progress Stepper & Actions */}
          <div className="md:col-span-7 space-y-5">
            {/* Live Queue Stepper */}
            <Card className="p-5 border-none shadow-xs bg-white">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Queue Progress Journey</h3>
          
          <div className="relative pl-6 space-y-5 border-l-2 border-slate-100">
            {stepsList.map((st) => {
              const isActive = step === st.num;
              const isPassed = step > st.num;

              return (
                <div key={st.num} className="relative">
                  {/* Bullet */}
                  <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                    isActive 
                      ? 'bg-blue-600 border-blue-600 ring-4 ring-blue-100 scale-110' 
                      : isPassed 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : 'bg-white border-slate-200'
                  }`}>
                    {isPassed && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>

                  {/* Text */}
                  <div>
                    <h4 className={`text-xs font-bold leading-none ${isActive ? 'text-slate-800 font-extrabold' : isPassed ? 'text-slate-500' : 'text-slate-400'}`}>
                      {st.label}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Dynamic warning alert based on wait */}
        {step === 3 && (
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-3xl flex gap-3 text-orange-800">
            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5 animate-bounce" size={18} />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-orange-900">Please Wait Near Cabin</p>
              <p className="text-[10px] text-orange-700 leading-relaxed mt-0.5">
                The doctor is serving the patient right before you. Please arrive at Doctor Cabin #{doctor.id.slice(-1)} immediately to avoid token skip.
              </p>
            </div>
          </div>
        )}

        {/* Consultation Validity Notice */}
        <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-900 font-bold">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar size={15} className="text-emerald-600 shrink-0" />
            <span className="truncate">Consultation Validity: {appointment.date} — 24 Jul 2026 (7 Days)</span>
          </div>
          <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0">7 DAYS VALID</span>
        </div>

        {/* Hospital contact info / actions footer */}
        <div className="pt-2 space-y-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <a 
              href={`tel:${hospital.contact}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 border border-slate-200 hover:border-slate-300 rounded-2xl bg-white text-slate-700 text-xs font-extrabold hover:bg-slate-50 transition-all cursor-pointer shadow-2xs min-w-0"
            >
              <PhoneCall size={14} className="text-blue-600 shrink-0" />
              <span className="truncate">Call Reception</span>
            </a>

            <a 
              href={`https://www.google.com/maps?q=${hospital.lat},${hospital.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 border border-slate-200 hover:border-slate-300 rounded-2xl bg-white text-slate-700 text-xs font-extrabold hover:bg-slate-50 transition-all cursor-pointer shadow-2xs min-w-0"
            >
              <Navigation size={14} className="text-blue-600 shrink-0" />
              <span className="truncate">Get Directions</span>
            </a>

            <button 
              onClick={() => navigate(`/hospital/${hospital.id}`)}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-2.5 px-3 border border-slate-200 hover:border-slate-300 rounded-2xl bg-white text-slate-700 text-xs font-extrabold hover:bg-slate-50 transition-all cursor-pointer shadow-2xs min-w-0"
            >
              <Building2 size={14} className="text-blue-600 shrink-0" />
              <span className="truncate">View Hospital</span>
            </button>
          </div>

          <Button 
            variant="outline" 
            size="lg" 
            fullWidth 
            onClick={() => navigate('/bookings')}
            className="py-2.5 text-xs text-slate-600 font-extrabold border-slate-200 rounded-2xl cursor-pointer"
          >
            View My Bookings
          </Button>
        </div>

          </div>
        </div>

      </div>

    </div>
  );
};
