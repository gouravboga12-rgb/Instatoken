import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import {
  Users, Ticket, Stethoscope, Wifi,
  UserPlus, Search,
  CheckCircle2, X, Printer, Eye,
  ArrowRight
} from 'lucide-react';

export const HospitalDashboard: React.FC = () => {
  const {
    hospitalUser,
    hospitalProfile,
    tokens,
    doctors,
    generateWalkInToken
  } = useHospital();
  const navigate = useNavigate();

  // Search & Filter state for Today's Queue
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in-cabin' | 'completed'>('all');

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInGender, setWalkInGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [walkInAge, setWalkInAge] = useState('32');
  const [walkInDoctorId, setWalkInDoctorId] = useState(doctors[0]?.id || '');
  const [generatedSlip, setGeneratedSlip] = useState<any>(null);

  // Detail Modal State
  const [selectedTokenDetail, setSelectedTokenDetail] = useState<any>(null);

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
    return tokens.filter(isTodayToken);
  }, [tokens, todayStr]);

  // Operational metrics (100% dynamic)
  const totalTokensCount = todayTokens.length;
  const offlineTokensCount = todayTokens.filter(t => t.type === 'offline').length;
  const onlineTokensCount = todayTokens.filter(t => t.type === 'online').length;

  const waitingTokens = todayTokens.filter(t => ['waiting', 'booked'].includes(t.status as string));
  const inCabinTokens = todayTokens.filter(t =>
    ['checked-in', 'in-consultation', 'in-consult', 'calling', 'arrived'].includes(t.status as string)
  );
  const completedTokens = todayTokens.filter(t => t.status === 'completed');
  const activeDoctors = doctors.filter(d => d.active !== false);

  // Filtered Today's Queue Table list
  const filteredQueue = useMemo(() => {
    return todayTokens.filter(t => {
      // 1. Doctor Filter
      if (selectedDoctorFilter !== 'all' && t.doctorId !== selectedDoctorFilter) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter === 'waiting' && !['waiting', 'booked'].includes(t.status as string)) {
        return false;
      }
      if (statusFilter === 'in-cabin' && !['checked-in', 'in-consultation', 'in-consult', 'calling', 'arrived'].includes(t.status as string)) {
        return false;
      }
      if (statusFilter === 'completed' && t.status !== 'completed') {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tNum = (t.tokenNo || (t as any).tokenNumber || '').toString();
        const pName = (t.patientName || '').toLowerCase();
        const pPhone = (t.patientPhone || '').toLowerCase();
        const dName = (t.doctorName || '').toLowerCase();
        return tNum.includes(q) || pName.includes(q) || pPhone.includes(q) || dName.includes(q);
      }

      return true;
    });
  }, [todayTokens, selectedDoctorFilter, statusFilter, searchQuery]);

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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">

      {/* ─── 1. TOP HEADER & OPERATIONAL ACTIONS ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Hospital Live OPD</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-bold text-slate-500">{dateFormatted}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading mt-1">
            Welcome, {firstName} 👋
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {hospitalProfile?.name || 'Hospital Panel'} · Live queue and OPD doctor operations
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setGeneratedSlip(null);
              setShowWalkInModal(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer border-none transition-all active:scale-95"
          >
            <UserPlus size={15} />
            <span>+ Walk-in Token</span>
          </button>

          <button
            onClick={() => navigate('/hospital/doctors')}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
          >
            <Stethoscope size={15} className="text-emerald-600" />
            <span>+ Add Doctor</span>
          </button>

          <button
            onClick={() => navigate('/hospital/tokens/all')}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
          >
            <Ticket size={15} className="text-purple-600" />
            <span>All Tokens Directory</span>
          </button>
        </div>
      </div>

      {/* ─── 2. OPERATIONAL KPI METRICS (100% Dynamic) ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Today's Tokens */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <Ticket size={20} />
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Today's OPD
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900 leading-none block font-heading">
              {totalTokensCount}
            </span>
            <span className="text-xs font-bold text-slate-700 mt-1.5 block">Today's Tokens</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
              {onlineTokensCount} Online · {offlineTokensCount} Walk-in
            </span>
          </div>
        </div>

        {/* KPI 2: Waiting Queue */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              In Clinic
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900 leading-none block font-heading">
              {waitingTokens.length}
            </span>
            <span className="text-xs font-bold text-slate-700 mt-1.5 block">Waiting in Queue</span>
            <span className="text-[11px] text-amber-600 font-bold block mt-0.5">
              {inCabinTokens.length} currently in cabin
            </span>
          </div>
        </div>

        {/* KPI 3: Visited / Completed */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Completed
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900 leading-none block font-heading">
              {completedTokens.length}
            </span>
            <span className="text-xs font-bold text-slate-700 mt-1.5 block">Visited Today</span>
            <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
              Consultations completed
            </span>
          </div>
        </div>

        {/* KPI 4: Active Doctors */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Stethoscope size={20} />
            </div>
            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              On Duty
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900 leading-none block font-heading">
              {activeDoctors.length}
            </span>
            <span className="text-xs font-bold text-slate-700 mt-1.5 block">Active Doctors</span>
            <span className="text-[11px] text-indigo-600 font-bold block mt-0.5">
              {doctors.length} enrolled total
            </span>
          </div>
        </div>

      </div>

      {/* ─── 3. DOCTOR OPD CABIN STATUS (Live Roster across all Doctors) ──────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Stethoscope size={16} className="text-blue-600" />
              <span>Doctor OPD Cabin Status</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Live consultation status & token queues across all {doctors.length} doctors
            </p>
          </div>
          <button
            onClick={() => navigate('/hospital/doctors')}
            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
          >
            Manage Doctors →
          </button>
        </div>

        {doctors.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Stethoscope size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No doctors registered yet.</p>
            <button
              onClick={() => navigate('/hospital/doctors')}
              className="mt-2 text-xs font-black text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
            >
              + Add First Doctor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {doctors.map(doc => {
              const docTokens = todayTokens.filter(t => t.doctorId === doc.id);
              const docWaiting = docTokens.filter(t => ['waiting', 'booked'].includes(t.status as string)).length;
              const docInCabin = docTokens.filter(t => ['checked-in', 'in-consultation', 'in-consult', 'calling'].includes(t.status as string)).length;
              const docCompleted = docTokens.filter(t => t.status === 'completed').length;
              const isAvailable = doc.active !== false;

              return (
                <div
                  key={doc.id}
                  className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden shadow-xs">
                        {doc.photo || (doc as any).image ? (
                          <img src={doc.photo || (doc as any).image} alt={doc.name} className="w-full h-full object-cover" />
                        ) : (
                          doc.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate">{doc.name}</h4>
                        <p className="text-[10.5px] text-slate-500 font-semibold truncate mt-0.5">
                          {doc.specialization || (doc as any).specialty || doc.departmentName || 'Specialist'}
                        </p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${
                          isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isAvailable ? '● Available' : '○ Off-duty'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Token Numbers breakdown */}
                  <div className="grid grid-cols-3 gap-1.5 bg-white p-2.5 rounded-xl border border-slate-150 text-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Waiting</span>
                      <span className="text-xs font-black text-amber-600">{docWaiting}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">In Cabin</span>
                      <span className="text-xs font-black text-blue-600">{docInCabin}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Done</span>
                      <span className="text-xs font-black text-emerald-600">{docCompleted}</span>
                    </div>
                  </div>

                  {/* Direct link to Cabin Screen */}
                  <button
                    onClick={() => navigate(`/hospital/tokens/doctor/${doc.id}`)}
                    className="w-full py-2 bg-white hover:bg-blue-600 hover:text-white text-blue-600 rounded-xl text-xs font-black border border-blue-200 hover:border-blue-600 shadow-2xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Open Cabin Screen</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 4. TODAY'S LIVE QUEUE TABLE (Comprehensive & Functional) ──────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden p-5 space-y-4">
        
        {/* Table Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Ticket size={16} className="text-blue-600" />
              <span>Today's Live Queue ({filteredQueue.length} Tokens)</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Live patient registration and status across all consultations today
            </p>
          </div>

          {/* Search & Doctor Filter */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search token #, patient, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>

            {/* Doctor Filter Dropdown */}
            <select
              value={selectedDoctorFilter}
              onChange={e => setSelectedDoctorFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">All Doctors ({doctors.length})</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="waiting">Waiting ({waitingTokens.length})</option>
              <option value="in-cabin">In Cabin ({inCabinTokens.length})</option>
              <option value="completed">Visited ({completedTokens.length})</option>
            </select>
          </div>
        </div>

        {/* Live Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Token #</th>
                <th className="py-3 px-4">Patient Details</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Session & Time</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No tokens match the active search or filters for today.
                  </td>
                </tr>
              ) : (
                filteredQueue.map(t => {
                  const isDone = t.status === 'completed';
                  const isCabin = ['checked-in', 'in-consultation', 'in-consult', 'calling'].includes(t.status as string);
                  const isNotVisited = ['not-visited', 'skipped'].includes(t.status as string);
                  const isCancelled = t.status === 'cancelled';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Token # */}
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        #{t.tokenNo || (t as any).tokenNumber}
                      </td>

                      {/* Patient Details */}
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-800 block leading-tight">{t.patientName}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {t.patientAgeDisplay || (t.patientAge ? `${t.patientAge}y` : '')} {t.patientGender ? `· ${t.patientGender}` : ''} {t.patientPhone ? `· ${t.patientPhone}` : ''}
                        </span>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-700 block truncate max-w-[150px]">
                          {t.doctorName || 'Doctor Assigned'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {t.departmentName || 'General OPD'}
                        </span>
                      </td>

                      {/* Session & Time */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-700 capitalize block">
                          {t.session || 'Morning'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {t.time || t.bookingDate || 'Today'}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                          t.type === 'online'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {t.type === 'online' ? <Wifi size={10} /> : <Users size={10} />}
                          <span>{t.type === 'online' ? 'Online App' : 'Walk-in'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCabin
                            ? 'bg-blue-600 text-white'
                            : isNotVisited
                            ? 'bg-amber-100 text-amber-800'
                            : isCancelled
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        }`}>
                          {isDone ? 'Visited' : isCabin ? 'In Cabin' : isNotVisited ? 'Not Visited' : isCancelled ? 'Cancelled' : 'Waiting'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTokenDetail(t)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="View Patient Details"
                          >
                            <Eye size={14} />
                          </button>
                          {t.doctorId && (
                            <button
                              onClick={() => navigate(`/hospital/tokens/doctor/${t.doctorId}`)}
                              className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors"
                              title="Go to Doctor Cabin"
                            >
                              Cabin →
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

      {/* ─── 6. TOKEN DETAIL MODAL ─────────────────────────────────────────── */}
      {selectedTokenDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  #{selectedTokenDetail.tokenNo || selectedTokenDetail.tokenNumber}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">Token Details</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{selectedTokenDetail.type} Token</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTokenDetail(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer border-none"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Patient Name:</span>
                <span className="font-black text-slate-800">{selectedTokenDetail.patientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Phone Number:</span>
                <span className="font-bold text-slate-700">{selectedTokenDetail.patientPhone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Doctor:</span>
                <span className="font-bold text-blue-600">{selectedTokenDetail.doctorName || 'Doctor'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Session & Date:</span>
                <span className="font-bold text-slate-700 capitalize">{selectedTokenDetail.session || 'Morning'} · {selectedTokenDetail.bookingDate || 'Today'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Status:</span>
                <span className="font-black text-slate-800 uppercase">{selectedTokenDetail.status}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-bold">Fee & Payment:</span>
                <span className="font-bold text-emerald-600">₹{selectedTokenDetail.consultationFee || 500} · {selectedTokenDetail.paymentStatus || 'pending'}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTokenDetail(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer border-none"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
