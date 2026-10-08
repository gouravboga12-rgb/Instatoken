import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import {
  Users, Ticket, Stethoscope, Wifi, WifiOff,
  UserPlus, Plus, Calendar, Bell,
  CheckCircle2, X, Printer, Play, SkipForward, Pause,
  AlertTriangle
} from 'lucide-react';

export const HospitalDashboard: React.FC = () => {
  const {
    hospitalUser,
    hospitalProfile,
    tokens,
    doctors,
    generateWalkInToken,
    updateTokenStatus
  } = useHospital();
  const navigate = useNavigate();

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInGender, setWalkInGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [walkInAge, setWalkInAge] = useState('32');
  const [walkInDoctorId, setWalkInDoctorId] = useState(doctors[0]?.id || '');
  const [generatedSlip, setGeneratedSlip] = useState<any>(null);

  // Sync walkInDoctorId when doctors load
  useEffect(() => {
    if (doctors.length > 0 && (!walkInDoctorId || !doctors.some(d => d.id === walkInDoctorId))) {
      setWalkInDoctorId(doctors[0].id);
    }
  }, [doctors, walkInDoctorId]);

  // Format greeting & dates
  const rawName = hospitalUser?.name || hospitalProfile?.name || 'Hospital Admin';
  const firstName = rawName.replace(/^Dr\.\s*/i, '').split(' ')[0] || 'Hospital Admin';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dateFormatted = today.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Filter today's tokens accurately from real data
  const isTodayToken = (t: any) => {
    if (!t.bookingDate) return true;
    if (t.bookingDate === todayStr) return true;
    const d = new Date(t.bookingDate);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0] === todayStr || d.toDateString() === today.toDateString();
    }
    return true;
  };

  const todayTokens = useMemo(() => {
    const filtered = tokens.filter(isTodayToken);
    return filtered.length > 0 ? filtered : tokens;
  }, [tokens, todayStr]);

  // Operational metrics (strictly non-revenue)
  const totalTokensCount = todayTokens.length;
  const offlineTokensCount = todayTokens.filter(t => t.type === 'offline').length;
  const onlineTokensCount = todayTokens.filter(t => t.type === 'online').length;
  const onlinePercent = totalTokensCount > 0 ? Math.round((onlineTokensCount / totalTokensCount) * 100) : 0;
  const offlinePercent = totalTokensCount > 0 ? 100 - onlinePercent : 0;

  // Queue tokens
  const queueTokens = useMemo(() => {
    return todayTokens.filter(t =>
      ['booked', 'waiting', 'checked-in', 'calling', 'in-consultation', 'in-consult'].includes(t.status as string)
    );
  }, [todayTokens]);

  const activeDoctorsCount = doctors.filter(d => d.active !== false).length;
  const completedTokensCount = todayTokens.filter(t => t.status === 'completed').length;
  const waitingTokens = queueTokens.filter(t => ['waiting', 'booked'].includes(t.status as string));
  const inConsultToken = queueTokens.find(t => ['checked-in', 'in-consultation', 'in-consult', 'calling'].includes(t.status as string)) || waitingTokens[0];
  const nextTokensInLine = queueTokens.filter(t => t.id !== inConsultToken?.id).slice(0, 4);

  // Handle live queue controls
  const handleCallNext = () => {
    if (waitingTokens.length > 0) {
      updateTokenStatus(waitingTokens[0].id, 'checked-in');
    }
  };

  const handleSkipToken = () => {
    if (inConsultToken) {
      updateTokenStatus(inConsultToken.id, 'skipped');
    }
  };

  const handleHoldToken = () => {
    if (inConsultToken) {
      updateTokenStatus(inConsultToken.id, 'waiting');
    }
  };

  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    const doc = doctors.find(d => d.id === walkInDoctorId) || doctors[0];
    const newToken = generateWalkInToken({
      patientName: walkInName.trim(),
      patientPhone: walkInPhone.trim() || '+91 98450 00000',
      patientGender: walkInGender,
      patientAge: parseInt(walkInAge) || 30,
      doctorId: doc?.id || doctors[0]?.id || '',
      departmentId: doc?.departmentId || 'dept-general',
      session: 'morning'
    });
    setGeneratedSlip(newToken);
  };

  // Recent activity list dynamically generated from actual hospital events
  const recentActivities = useMemo(() => {
    const list: { title: string; subtitle: string; time: string; type: 'online' | 'offline' | 'completed' | 'info' }[] = [];

    tokens.slice(0, 6).forEach(t => {
      if (t.status === 'completed') {
        list.push({
          title: `Token #${t.tokenNo} completed`,
          subtitle: `Dr. ${t.doctorName || 'Doctor'} · ${t.patientName}`,
          time: t.time || 'Today',
          type: 'completed'
        });
      } else if (t.type === 'online') {
        list.push({
          title: `Online token booked`,
          subtitle: `Patient: ${t.patientName} (${t.doctorName || 'Doctor'})`,
          time: t.time || 'Today',
          type: 'online'
        });
      } else {
        list.push({
          title: `Offline patient registered`,
          subtitle: `Patient: ${t.patientName}`,
          time: t.time || 'Today',
          type: 'offline'
        });
      }
    });

    if (list.length === 0) {
      return [
        {
          title: 'OPD Queue Active',
          subtitle: `${activeDoctorsCount} doctors ready for consultations`,
          time: 'Today',
          type: 'info' as const
        }
      ];
    }

    return list.slice(0, 5);
  }, [tokens, activeDoctorsCount]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      
      {/* ─── 1. TOP HEADER & QUICK ACTIONS (Image 75 style) ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-heading leading-tight">
            Good Morning, {firstName} 👋
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Here's what's happening at your hospital today · {dateFormatted}
          </p>
        </div>

        {/* Quick Action Buttons matching Image 75 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/hospital/tokens/add')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer border-none transition-all active:scale-95"
          >
            <Plus size={14} />
            <span>+ Add Token</span>
          </button>

          <button
            onClick={() => {
              setGeneratedSlip(null);
              setShowWalkInModal(true);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
          >
            <UserPlus size={14} className="text-blue-600" />
            <span>Register Patient</span>
          </button>

          <button
            onClick={() => navigate('/hospital/doctors')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
          >
            <Stethoscope size={14} className="text-emerald-600" />
            <span>Add Doctor</span>
          </button>

          <button
            onClick={() => navigate('/hospital/tokens/today')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
          >
            <Calendar size={14} className="text-purple-600" />
            <span>View Today's Tokens</span>
          </button>
        </div>
      </div>

      {/* ─── 2. TOP KPI CARDS (NO REVENUE! Image 75 style) ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Today's Tokens */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <Ticket size={18} />
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Live Today
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none block font-heading">
              {totalTokensCount}
            </span>
            <span className="text-xs font-bold text-slate-500 mt-1 block">Today's Tokens</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Total booked today</span>
          </div>
        </div>

        {/* Card 2: Online Tokens */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <Wifi size={18} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {onlinePercent}% Share
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none block font-heading">
              {onlineTokensCount}
            </span>
            <span className="text-xs font-bold text-slate-500 mt-1 block">Online Tokens</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">App booked tokens</span>
          </div>
        </div>

        {/* Card 3: Offline / Walk-in */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <WifiOff size={18} />
            </div>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              {offlinePercent}% Share
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none block font-heading">
              {offlineTokensCount}
            </span>
            <span className="text-xs font-bold text-slate-500 mt-1 block">Offline / Walk-in</span>
            <span className="text-[10px] text-purple-600 font-bold block mt-0.5">Counter registered</span>
          </div>
        </div>

        {/* Card 4: Patients in Queue */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Users size={18} />
            </div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              In Clinic
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none block font-heading">
              {queueTokens.length}
            </span>
            <span className="text-xs font-bold text-slate-500 mt-1 block">Waiting Patients</span>
            <span className="text-[10px] text-amber-600 font-bold block mt-0.5">{waitingTokens.length} awaiting call</span>
          </div>
        </div>

        {/* Card 5: Active Doctors */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
              <Stethoscope size={18} />
            </div>
            <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              On Duty
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none block font-heading">
              {activeDoctorsCount}
            </span>
            <span className="text-xs font-bold text-slate-500 mt-1 block">Active Doctors</span>
            <span className="text-[10px] text-sky-600 font-bold block mt-0.5">{doctors.length} enrolled total</span>
          </div>
        </div>

      </div>

      {/* ─── 3. ROW: LIVE TOKEN QUEUE + TODAY'S TOKEN STATUS + ACTIVITY ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 3A. Live Token Queue Hero Spotlight (Image 75 style) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-150 p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Live Token Queue</h3>
            </div>
            <button
              onClick={() => navigate('/hospital/tokens/all')}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
            >
              View All
            </button>
          </div>

          {/* Now Serving Big Banner */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 text-center shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">
              Now Serving
            </span>
            <div className="text-4xl font-black font-heading mt-1">
              {inConsultToken ? `#${inConsultToken.tokenNo}` : '—'}
            </div>
            <div className="mt-2 pt-2 border-t border-white/20 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                <span className="text-blue-200 block">Doctor</span>
                <span className="font-extrabold truncate block">{inConsultToken?.doctorName || doctors[0]?.name || 'Available'}</span>
              </div>
              <div>
                <span className="text-blue-200 block">Session</span>
                <span className="font-extrabold capitalize block">{inConsultToken?.session || 'Morning'}</span>
              </div>
              <div>
                <span className="text-blue-200 block">Waiting</span>
                <span className="font-extrabold block">{waitingTokens.length}</span>
              </div>
            </div>
          </div>

          {/* Next Tokens In Line */}
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">
              Next in Line
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {nextTokensInLine.length > 0 ? (
                nextTokensInLine.map((t, idx) => (
                  <React.Fragment key={t.id}>
                    <span className="bg-slate-100 text-slate-800 text-xs font-black px-2.5 py-1 rounded-xl shrink-0">
                      #{t.tokenNo}
                    </span>
                    {idx < nextTokensInLine.length - 1 && (
                      <span className="text-slate-300 font-bold text-xs shrink-0">→</span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="text-xs text-slate-400 font-semibold">No pending queue</span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={handleCallNext}
              disabled={waitingTokens.length === 0}
              className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer border-none shadow-2xs transition-colors"
            >
              <Play size={11} fill="white" />
              <span>Call Next</span>
            </button>
            <button
              onClick={handleSkipToken}
              disabled={!inConsultToken}
              className="py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer border-none shadow-2xs transition-colors"
            >
              <SkipForward size={11} />
              <span>Skip</span>
            </button>
            <button
              onClick={handleHoldToken}
              disabled={!inConsultToken}
              className="py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer border-none shadow-2xs transition-colors"
            >
              <Pause size={11} />
              <span>Hold</span>
            </button>
          </div>
        </div>

        {/* 3B. Today's Token Status Table (Image 75 style) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-150 p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Today's Token Status</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Live status breakdown across departments</p>
            </div>
            <button
              onClick={() => navigate('/hospital/tokens/today')}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
            >
              View All
            </button>
          </div>

          {/* Online vs Offline Channel Split Summary */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wifi size={13} />
              </div>
              <div>
                <span className="text-[9.5px] font-black uppercase text-slate-400 block">Online</span>
                <span className="text-xs font-black text-slate-800">{onlineTokensCount} Tokens ({onlinePercent}%)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users size={13} />
              </div>
              <div>
                <span className="text-[9.5px] font-black uppercase text-slate-400 block">Offline / Walk-in</span>
                <span className="text-xs font-black text-slate-800">{offlineTokensCount} Tokens ({offlinePercent}%)</span>
              </div>
            </div>
          </div>

          {/* Mini Real Token Table */}
          <div className="overflow-x-auto flex-1 max-h-56">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-1.5 font-bold">Token</th>
                  <th className="pb-1.5 font-bold">Patient</th>
                  <th className="pb-1.5 font-bold">Doctor</th>
                  <th className="pb-1.5 font-bold">Type</th>
                  <th className="pb-1.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {todayTokens.slice(0, 5).map(t => {
                  const isDone = t.status === 'completed';
                  const isConsult = ['checked-in', 'in-consultation', 'in-consult'].includes(t.status as string);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 font-black text-slate-800">#{t.tokenNo}</td>
                      <td className="py-2 font-extrabold text-slate-700 truncate max-w-[100px]">{t.patientName}</td>
                      <td className="py-2 text-slate-500 font-semibold truncate max-w-[90px]">{t.doctorName}</td>
                      <td className="py-2">
                        <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded ${t.type === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                          {t.type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                          isDone ? 'bg-emerald-50 text-emerald-700' : isConsult ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {isDone ? 'Done' : isConsult ? 'In Cabin' : 'Waiting'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3C. Today's Activity Feed (Image 75 style) */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-150 p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Today's Activity</h3>
            <span className="text-[10px] font-bold text-slate-400">Live</span>
          </div>

          <div className="divide-y divide-slate-50 space-y-2.5 overflow-y-auto max-h-64 pr-1">
            {recentActivities.map((act, idx) => (
              <div key={idx} className="pt-2 first:pt-0 flex items-start gap-2.5">
                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                  act.type === 'completed' ? 'bg-emerald-500' : act.type === 'online' ? 'bg-blue-500' : 'bg-purple-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-800 leading-tight truncate">{act.title}</p>
                  <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">{act.subtitle}</p>
                </div>
                <span className="text-[9.5px] text-slate-400 font-bold shrink-0">{act.time}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/hospital/communication')}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200/80 text-center"
          >
            Communication Center →
          </button>
        </div>

      </div>

      {/* ─── 4. ROW: TODAY'S DOCTORS + RECENT PATIENTS + SCHEDULE & ALERTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 4A. Today's Doctors Roster (Image 75 style) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-150 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Today's Doctors</h3>
              <p className="text-[10px] text-slate-400 font-semibold">{doctors.length} doctors listed at hospital</p>
            </div>
            <button
              onClick={() => navigate('/hospital/doctors')}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
            >
              Manage All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {doctors.slice(0, 4).map(doc => {
              const docTokens = todayTokens.filter(t => t.doctorId === doc.id);
              const isAvailable = doc.active !== false;

              return (
                <div key={doc.id} className="p-3 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black shrink-0 overflow-hidden">
                      {doc.photo || (doc as any).image ? (
                        <img src={doc.photo || (doc as any).image} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        doc.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 truncate">{doc.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{doc.specialization || (doc as any).specialty || doc.departmentName || 'Specialist'}</p>
                      <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${
                        isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isAvailable ? '● Available' : '○ Off-duty'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-bold">Today: {docTokens.length} Tokens</span>
                    <button
                      onClick={() => navigate(`/hospital/tokens/doctor/${doc.id}`)}
                      className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-600 rounded-lg font-black border border-slate-200 shadow-3xs cursor-pointer"
                    >
                      Cabin Screen →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4B. Recent Patients Queue (Image 75 style) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-150 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Recent Patients</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Live registration queue</p>
            </div>
            <button
              onClick={() => navigate('/hospital/patients')}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
            >
              All Patients
            </button>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-1.5 font-bold">Patient</th>
                  <th className="pb-1.5 font-bold">Doctor</th>
                  <th className="pb-1.5 font-bold">Token</th>
                  <th className="pb-1.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {todayTokens.slice(0, 6).map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5">
                      <span className="font-extrabold text-slate-800 block leading-tight">{t.patientName}</span>
                      <span className="text-[10px] text-slate-400 block">{t.patientPhone || '—'}</span>
                    </td>
                    <td className="py-2.5 text-slate-600 font-semibold truncate max-w-[100px]">{t.doctorName}</td>
                    <td className="py-2.5 font-black text-blue-600">#{t.tokenNo}</td>
                    <td className="py-2.5">
                      <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                        t.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {t.status === 'completed' ? 'Done' : 'Waiting'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4C. OPD Schedule & Notifications (Image 75 style) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Doctor Sessions Mini Schedule */}
          <div className="bg-white rounded-3xl border border-slate-150 p-4 sm:p-5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Doctor Schedule</h3>
              <button
                onClick={() => navigate('/hospital/tokens/manage')}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
              >
                Schedule
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              {doctors.slice(0, 3).map(d => {
                const docTokensCount = todayTokens.filter(t => t.doctorId === d.id).length;
                const limit = d.maxTokensPerDay || 40;
                const remaining = Math.max(0, limit - docTokensCount);

                return (
                  <div key={d.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-800 block text-[11px] truncate max-w-[120px]">{d.name}</span>
                      <span className="text-[9.5px] text-slate-400">Morning &amp; Evening</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-blue-600 text-xs">{docTokensCount}/{limit}</span>
                      <span className="text-[9px] text-emerald-600 font-bold block">{remaining} slots left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real Operational Alerts */}
          <div className="bg-white rounded-3xl border border-slate-150 p-4 sm:p-5 shadow-2xs space-y-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Bell size={13} className="text-amber-500" />
              <span>Queue Alerts &amp; Notes</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-900 text-[11px] font-bold flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                <span>{waitingTokens.length} patients currently waiting in queue.</span>
              </div>
              <div className="p-2 bg-blue-50/70 border border-blue-200/60 rounded-xl text-blue-900 text-[11px] font-bold flex items-center gap-2">
                <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                <span>{completedTokensCount} patients attended today.</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ─── 5. WALK-IN TOKEN MODAL ────────────────────────────────────────── */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UserPlus size={18} />
                </div>
                <h3 className="font-black text-slate-800 text-base">New Walk-in Patient</h3>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer border-none"
              >
                <X size={18} />
              </button>
            </div>

            {!generatedSlip ? (
              <form onSubmit={handleCreateWalkIn} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Varma"
                    value={walkInName}
                    onChange={e => setWalkInName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98450 00000"
                      value={walkInPhone}
                      onChange={e => setWalkInPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Age</label>
                    <input
                      type="number"
                      value={walkInAge}
                      onChange={e => setWalkInAge(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Gender</label>
                    <select
                      value={walkInGender}
                      onChange={e => setWalkInGender(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Assign Doctor</label>
                    <select
                      value={walkInDoctorId}
                      onChange={e => setWalkInDoctorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer border-none mt-2 transition-all active:scale-95"
                >
                  Generate Walk-in Token
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800">Token #{generatedSlip.tokenNo} Created</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Patient: {generatedSlip.patientName} · {generatedSlip.doctorName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border-none"
                  >
                    <Printer size={14} /> Print Slip
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedSlip(null);
                      setWalkInName('');
                      setShowWalkInModal(false);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer border-none"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
