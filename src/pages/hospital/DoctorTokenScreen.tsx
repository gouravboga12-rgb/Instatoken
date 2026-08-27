import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import type { TokenRecord } from '../../context/HospitalContext';
import {
  CheckCircle, Clock, Play,
  XCircle, Calendar, Search, Tv,
  Printer, Eye, Phone, Wifi, WifiOff,
  Volume2, Stethoscope, Sparkles, X, UserX, Trash2
} from 'lucide-react';

export const DoctorTokenScreen: React.FC<{ doctorIdProp?: string }> = ({ doctorIdProp }) => {
  const params = useParams<{ doctorId: string }>();
  const doctorId = doctorIdProp || params.doctorId;
  const { doctors, tokens, updateTokenStatus, deleteToken, hospitalProfile } = useHospital();
  const navigate = useNavigate();

  const doctor = doctors.find(d => d.id === doctorId) || doctors[0];

  // Filters State
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'completed' | 'not-visited' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'yesterday' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('all');

  // Modals & Full-Screen TV Display Mode
  const [viewToken, setViewToken] = useState<TokenRecord | null>(null);
  const [printToken, setPrintToken] = useState<TokenRecord | null>(null);
  const [tvMode, setTvMode] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Web Audio Calling Chime
  const playCallChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  // Filter Tokens strictly for this Doctor
  const doctorTokens = useMemo(() => {
    return tokens.filter(t => t.doctorId === doctor?.id);
  }, [tokens, doctor?.id]);

  const filteredTokens = useMemo(() => {
    return doctorTokens.filter(t => {
      // 1. Status Tab
      if (statusTab === 'active' && !['booked', 'waiting', 'checked-in'].includes(t.status)) return false;
      if (statusTab === 'completed' && t.status !== 'completed') return false;
      if (statusTab === 'not-visited' && !['not-visited', 'skipped'].includes(t.status)) return false;
      if (statusTab === 'cancelled' && t.status !== 'cancelled') return false;

      // 2. Date Filter
      const tDate = t.bookingDate || todayStr;
      if (dateFilter === 'today' && tDate !== todayStr) return false;
      if (dateFilter === 'tomorrow' && tDate !== tomorrowStr) return false;
      if (dateFilter === 'yesterday' && tDate !== yesterdayStr) return false;
      if (dateFilter === 'custom' && customDate && tDate !== customDate) return false;

      // 3. Source Filter
      if (sourceFilter === 'online' && t.type !== 'online') return false;
      if (sourceFilter === 'offline' && t.type !== 'offline') return false;

      // 4. Session Filter
      if (selectedSessionFilter !== 'all' && t.session?.toLowerCase() !== selectedSessionFilter.toLowerCase()) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.tokenNo.toString().includes(q) ||
          t.patientName.toLowerCase().includes(q) ||
          t.patientPhone.includes(q) ||
          t.id.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [doctorTokens, statusTab, dateFilter, customDate, sourceFilter, selectedSessionFilter, searchQuery, todayStr, tomorrowStr, yesterdayStr]);

  // Metrics specifically for this Doctor (Revenue strictly from completed/visited tokens)
  const activeQueue = doctorTokens.filter(t => ['booked', 'waiting', 'checked-in'].includes(t.status) && (t.bookingDate === todayStr || !t.bookingDate));
  const inConsultation = activeQueue.find(t => t.status === 'checked-in');
  const nextInLine = activeQueue.filter(t => t.id !== inConsultation?.id);
  const completedToday = doctorTokens.filter(t => t.status === 'completed' && (t.bookingDate === todayStr || !t.bookingDate));
  const notVisitedToday = doctorTokens.filter(t => ['not-visited', 'skipped'].includes(t.status) && (t.bookingDate === todayStr || !t.bookingDate));
  const todayDoctorRevenue = completedToday.reduce((acc, t) => acc + (t.consultationFee || doctor?.consultationFee || 0), 0);

  if (!doctor) {
    return (
      <div className="p-8 text-center max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm mt-12 space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto font-black text-xl">
          ⚠️
        </div>
        <h3 className="text-base font-black text-slate-800">Doctor Screen Not Found</h3>
        <p className="text-xs text-slate-400 font-semibold">The requested doctor is either inactive, removed, or has no active cabin screen.</p>
        <button
          onClick={() => navigate('/hospital/doctors')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer border-none"
        >
          Back to Doctors Management
        </button>
      </div>
    );
  }

  const handleCallNext = (tokenId?: string) => {
    playCallChime();
    if (tokenId) {
      updateTokenStatus(tokenId, 'checked-in');
    } else if (nextInLine.length > 0) {
      updateTokenStatus(nextInLine[0].id, 'checked-in');
    } else if (activeQueue.length > 0) {
      updateTokenStatus(activeQueue[0].id, 'checked-in');
    }
  };

  const handleCompleteToken = (id: string) => {
    updateTokenStatus(id, 'completed');
  };

  const handleMarkNotVisited = (id: string) => {
    updateTokenStatus(id, 'not-visited');
  };

  const handleRecallToken = (id: string) => {
    updateTokenStatus(id, 'checked-in');
    playCallChime();
  };

  const handleReleaseSlot = (id: string) => {
    if (window.confirm('Release / delete this unvisited token slot so it becomes available to book again?')) {
      deleteToken(id);
    }
  };

  const handleCancelToken = (id: string) => {
    updateTokenStatus(id, 'cancelled');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Doctor Cabin Switcher Tabs ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope size={14} className="text-blue-600" />
            <span>Doctor Cabin Token Monitors ({doctors.length} Doctors Available)</span>
          </span>
          <button
            onClick={() => setTvMode(true)}
            className="text-xs font-bold px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-1.5 cursor-pointer border-none transition-colors"
          >
            <Tv size={13} /> Fullscreen TV Display
          </button>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {doctors.map(doc => {
            const isSelected = doctor.id === doc.id;
            const docWaiting = tokens.filter(t => t.doctorId === doc.id && ['booked', 'waiting', 'checked-in'].includes(t.status) && (t.bookingDate === todayStr || !t.bookingDate)).length;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => navigate(`/hospital/tokens/doctor/${doc.id}`)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2.5 shrink-0 cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <img
                  src={doc.photo || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80'}
                  alt={doc.name}
                  className="w-5 h-5 rounded-full object-cover border border-white/40"
                />
                <span>{doc.name}</span>
                {docWaiting > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'
                  }`}>
                    {docWaiting}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Top Doctor Banner Header ──────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={doctor.photo || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80'}
              alt={doctor.name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs"
            />
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${doctor.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-800 leading-none">{doctor.name}</h1>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
                {doctor.specialization} · Cabin Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Dept: <strong className="text-slate-600">{doctor.departmentName}</strong> · Fee: <strong className="text-emerald-600">₹{doctor.consultationFee}</strong> · Avg Consult: <strong className="text-slate-600">{doctor.consultationDuration} mins</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
          <button
            onClick={() => handleCallNext()}
            disabled={activeQueue.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs cursor-pointer border-none shadow-sm shadow-blue-500/20 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Volume2 size={15} /> Call Next Patient
          </button>
          <button
            onClick={() => navigate(`/hospital/tokens/add?doctorId=${doctor.id}&departmentId=${doctor.departmentId || ''}`)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-extrabold text-xs cursor-pointer border-none shadow-xs flex items-center gap-1.5"
          >
            Add Walk-in Token
          </button>
        </div>
      </div>

      {/* ── Key Metrics Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Waiting in Queue</span>
            <span className="text-2xl font-black text-slate-800">{activeQueue.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Visited Today</span>
            <span className="text-2xl font-black text-emerald-600">{completedToday.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <UserX size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Not Visited / Absent</span>
            <span className="text-2xl font-black text-amber-600">{notVisitedToday.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <Sparkles size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Today's Earned Revenue</span>
            <span className="text-2xl font-black text-slate-800">₹{todayDoctorRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ── Active Cabin Display (Spotlight Hero) ─────────────────────────── */}
      <div className="bg-linear-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Current Active Token in Cabin
              </span>
            </div>

            {inConsultation ? (
              <div>
                <div className="flex items-baseline gap-4">
                  <span className="text-6xl font-black tracking-tight text-white">
                    #{inConsultation.tokenNo}
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-white">{inConsultation.patientName}</h2>
                    <p className="text-xs text-blue-200 font-semibold">
                      {inConsultation.patientAge} Yrs · {inConsultation.patientGender} · Phone: {inConsultation.patientPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-slate-300">
                  <span className="bg-white/10 px-3 py-1 rounded-xl font-bold">
                    Session: {inConsultation.session?.toUpperCase()} OPD
                  </span>
                  <span className="bg-white/10 px-3 py-1 rounded-xl font-bold">
                    Booked at: {inConsultation.time}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-xl font-black">
                    Fee: ₹{inConsultation.consultationFee} ({inConsultation.paymentStatus.toUpperCase()})
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-3">
                <h2 className="text-2xl font-black text-white/90">Doctor Cabin is Ready</h2>
                <p className="text-xs text-slate-300 font-semibold mt-1">
                  No patient currently in consultation. Click "Call Next Patient" to bring in the next token in line.
                </p>
              </div>
            )}
          </div>

          {/* Quick Cabin Controls */}
          {inConsultation && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => handleCompleteToken(inConsultation.id)}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs cursor-pointer border-none shadow-sm flex items-center justify-center gap-2 transition-colors"
                title="Mark Visited / Done (Adds to Doctor Revenue)"
              >
                <CheckCircle size={16} /> Mark Visited / Done
              </button>

              <button
                onClick={() => handleMarkNotVisited(inConsultation.id)}
                className="px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-2xl font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                title="Patient absent or skipped - moves to Not Visited list (No revenue counted)"
              >
                <UserX size={15} /> Mark Not Visited
              </button>

              <button
                onClick={() => setPrintToken(inConsultation)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl cursor-pointer border-none flex items-center justify-center transition-colors"
                title="Print Slip"
              >
                <Printer size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters & Search Toolbar ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'all', label: `All (${doctorTokens.length})` },
              { key: 'active', label: `Waiting / In Cabin (${activeQueue.length})` },
              { key: 'completed', label: `Visited (${completedToday.length})` },
              { key: 'not-visited', label: `Not Visited / Absent (${notVisitedToday.length})` },
              { key: 'cancelled', label: `Cancelled (${doctorTokens.filter(t => t.status === 'cancelled').length})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all shrink-0 ${
                  statusTab === tab.key
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search token #, patient name, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
            />
          </div>
        </div>

        {/* Secondary Filter Badges (Date + Source + Session) */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100 text-xs">
          {/* Date Selector */}
          <div className="flex items-center gap-1">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Date:</span>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-bold outline-none bg-white text-slate-700"
            >
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="yesterday">Yesterday</option>
              <option value="all">All Dates</option>
              <option value="custom">Custom Date</option>
            </select>
            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold outline-none"
              />
            )}
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Source:</span>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as any)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-bold outline-none bg-white text-slate-700"
            >
              <option value="all">All Sources</option>
              <option value="online">Online App</option>
              <option value="offline">Hospital Counter</option>
            </select>
          </div>

          {/* Session Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Session:</span>
            <select
              value={selectedSessionFilter}
              onChange={e => setSelectedSessionFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-bold outline-none bg-white text-slate-700"
            >
              <option value="all">All Sessions</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Token Queue Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Token #</th>
                <th className="py-3.5 px-4">Patient Details</th>
                <th className="py-3.5 px-4">Session & Time</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Fee & Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No tokens found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTokens.map(tok => {
                  const isCurrent = inConsultation?.id === tok.id;
                  const isNotVisited = ['not-visited', 'skipped'].includes(tok.status);
                  const isCompleted = tok.status === 'completed';

                  return (
                    <tr
                      key={tok.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-blue-50/50' : isNotVisited ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isNotVisited
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          #{tok.tokenNo}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800">{tok.patientName}</div>
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                          <span>{tok.patientAge}y, {tok.patientGender}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Phone size={10} /> {tok.patientPhone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-700 capitalize">{tok.session} OPD</span>
                        <span className="text-[10px] text-slate-400 block font-medium">{tok.time} · {tok.bookingDate}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {tok.type === 'online' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            <Wifi size={10} /> Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            <WifiOff size={10} /> Walk-in
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800">₹{tok.consultationFee}</div>
                        <span className={`text-[9px] font-black uppercase ${
                          tok.status === 'completed'
                            ? 'text-emerald-600'
                            : isNotVisited
                            ? 'text-amber-600'
                            : tok.paymentStatus === 'paid'
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}>
                          {tok.status === 'completed' ? 'Earned' : isNotVisited ? 'Uncollected' : tok.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          tok.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : tok.status === 'checked-in'
                            ? 'bg-blue-600 text-white'
                            : isNotVisited
                            ? 'bg-amber-100 text-amber-700'
                            : tok.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {tok.status === 'checked-in' ? 'In Cabin' : tok.status === 'completed' ? 'Visited' : isNotVisited ? 'Not Visited' : tok.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {['booked', 'waiting'].includes(tok.status) && (
                            <button
                              onClick={() => handleCallNext(tok.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1"
                              title="Call this patient into cabin"
                            >
                              <Play size={11} /> Call
                            </button>
                          )}

                          {tok.status === 'checked-in' && (
                            <button
                              onClick={() => handleCompleteToken(tok.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1"
                              title="Complete consultation (adds to revenue)"
                            >
                              <CheckCircle size={11} /> Visited
                            </button>
                          )}

                          {['booked', 'waiting', 'checked-in'].includes(tok.status) && (
                            <button
                              onClick={() => handleMarkNotVisited(tok.id)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                              title="Mark as Not Visited / Absent"
                            >
                              <UserX size={11} /> Not Visited
                            </button>
                          )}

                          {isNotVisited && (
                            <>
                              <button
                                onClick={() => handleCompleteToken(tok.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1"
                                title="Patient arrived late - mark as visited and add revenue"
                              >
                                <CheckCircle size={11} /> Mark Visited
                              </button>
                              <button
                                onClick={() => handleRecallToken(tok.id)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                                title="Re-call into cabin"
                              >
                                <Play size={11} /> Call Cabin
                              </button>
                              <button
                                onClick={() => handleReleaseSlot(tok.id)}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                                title="Cancel / delete and release slot"
                              >
                                <Trash2 size={11} /> Release Slot
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setPrintToken(tok)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Print Token Slip"
                          >
                            <Printer size={13} />
                          </button>

                          <button
                            onClick={() => setViewToken(tok)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="View Details"
                          >
                            <Eye size={13} />
                          </button>

                          {['booked', 'waiting'].includes(tok.status) && (
                            <button
                              onClick={() => handleCancelToken(tok.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              title="Cancel Token"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Waiting Room / TV Display Modal ───────────────────────────────── */}
      {tvMode && (
        <div className="fixed inset-0 bg-slate-950 text-white z-50 p-8 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl">
                🏥
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{hospitalProfile?.name || 'Apollo Spectra Hospital'}</h1>
                <p className="text-sm text-blue-300 font-bold">OPD Cabin Monitor · {doctor.name} ({doctor.specialization})</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xl font-black text-emerald-400">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-slate-400 font-bold">{new Date().toDateString()}</div>
              </div>
              <button
                onClick={() => setTvMode(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer border-none"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Big TV Screen Center Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto">
            {/* Now Serving Big Box (8 cols) */}
            <div className="lg:col-span-8 bg-linear-to-br from-blue-900/60 to-slate-900 border-2 border-blue-500/40 rounded-3xl p-10 flex flex-col justify-center items-center text-center space-y-4 shadow-2xl">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm uppercase tracking-widest border border-emerald-500/30 animate-pulse">
                NOW SERVING IN CABIN
              </span>

              {inConsultation ? (
                <>
                  <div className="text-9xl font-black tracking-tight text-white drop-shadow-lg">
                    #{inConsultation.tokenNo}
                  </div>
                  <h2 className="text-4xl font-black text-white">{inConsultation.patientName}</h2>
                  <p className="text-lg text-blue-200 font-bold">
                    Session: {inConsultation.session.toUpperCase()} OPD · Doctor: {doctor.name}
                  </p>
                </>
              ) : (
                <div className="py-12">
                  <div className="text-6xl font-black text-slate-500">CABIN READY</div>
                  <p className="text-lg text-slate-400 font-bold mt-2">Doctor will call the next patient shortly</p>
                </div>
              )}
            </div>

            {/* Next in line column (4 cols) */}
            <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-white/10">
                  NEXT IN LINE ({nextInLine.length})
                </h3>

                <div className="space-y-3">
                  {nextInLine.slice(0, 5).map((tok, idx) => (
                    <div key={tok.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-300 font-black flex items-center justify-center text-sm">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-extrabold text-sm text-white">#{tok.tokenNo} · {tok.patientName}</div>
                          <div className="text-[10px] text-slate-400">{tok.patientAge}y · {tok.patientGender}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400">Waiting</span>
                    </div>
                  ))}

                  {nextInLine.length === 0 && (
                    <p className="text-xs text-slate-500 font-bold text-center py-6">No more patients waiting in queue.</p>
                  )}
                </div>
              </div>

              <div className="text-center pt-4 border-t border-white/10 text-xs text-slate-400 font-medium">
                Please be seated. Your token will be called on this screen.
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 font-semibold border-t border-white/10 pt-3">
            InstaToken Live Cabin Queue System · Turn-by-Turn Real-Time Sync
          </div>
        </div>
      )}

      {/* ── Token Detail Modal ────────────────────────────────────────────── */}
      {viewToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">Token #{viewToken.tokenNo}</h3>
                <span className="text-[10px] text-slate-400 font-semibold">{viewToken.id}</span>
              </div>
              <button
                onClick={() => setViewToken(null)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Patient Name:</span>
                <strong className="text-slate-800 font-black">{viewToken.patientName}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Age & Gender:</span>
                <strong className="text-slate-800">{viewToken.patientAge} Years · {viewToken.patientGender}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Mobile Phone:</span>
                <strong className="text-slate-800">{viewToken.patientPhone}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Doctor:</span>
                <strong className="text-blue-600">{viewToken.doctorName}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">OPD Session:</span>
                <strong className="text-slate-800 uppercase">{viewToken.session} ({viewToken.time})</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Consultation Fee:</span>
                <strong className="text-emerald-600 font-black">₹{viewToken.consultationFee} ({viewToken.paymentStatus})</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Current Status:</span>
                <strong className="text-blue-600 uppercase font-black">{viewToken.status}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewToken(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const t = viewToken;
                  setViewToken(null);
                  setPrintToken(t);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1.5"
              >
                <Printer size={13} /> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Slip Modal ──────────────────────────────────────────────── */}
      {printToken && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Print OPD Token Receipt</h3>
              <button
                onClick={() => setPrintToken(null)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Thermal Print Slip Preview */}
            <div id="print-token-receipt" className="border border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50 text-center space-y-3">
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider">{hospitalProfile?.name}</div>
              <div className="text-[10px] text-slate-500">{hospitalProfile?.address}</div>

              <div className="py-2 border-y border-dashed border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">TOKEN NUMBER</span>
                <span className="text-5xl font-black text-slate-900 tracking-tight">#{printToken.tokenNo}</span>
              </div>

              <div className="text-left text-xs space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-extrabold text-slate-800">{printToken.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Age / Gender:</span>
                  <span className="font-semibold text-slate-700">{printToken.patientAge} Yrs / {printToken.patientGender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Doctor:</span>
                  <span className="font-extrabold text-blue-600">{printToken.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Session:</span>
                  <span className="font-semibold text-slate-700 capitalize">{printToken.session} OPD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fee:</span>
                  <span className="font-black text-emerald-600">₹{printToken.consultationFee} ({printToken.paymentStatus})</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
                Please present this token at the doctor's cabin when called.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintToken(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1.5"
              >
                <Printer size={13} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
