import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import type { TokenRecord } from '../../context/HospitalContext';
import {
  CheckCircle, Clock, Play,
  XCircle, Calendar, Search,
  Printer, Eye, Phone, Wifi, WifiOff
} from 'lucide-react';

export const DoctorTokenScreen: React.FC<{ doctorIdProp?: string }> = ({ doctorIdProp }) => {
  const params = useParams<{ doctorId: string }>();
  const doctorId = doctorIdProp || params.doctorId;
  const { doctors, tokens, updateTokenStatus, scheduleConfig } = useHospital();
  const navigate = useNavigate();

  const doctor = doctors.find(d => d.id === doctorId);

  // Filters State
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'completed' | 'skipped' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'yesterday' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('all');

  // Token detail modal
  const [viewToken, setViewToken] = useState<TokenRecord | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Filter Tokens strictly for this Doctor
  const doctorTokens = useMemo(() => {
    return tokens.filter(t => t.doctorId === doctorId);
  }, [tokens, doctorId]);

  const filteredTokens = useMemo(() => {
    return doctorTokens.filter(t => {
      // 1. Status Tab
      if (statusTab === 'active' && !['booked', 'waiting', 'checked-in'].includes(t.status)) return false;
      if (statusTab === 'completed' && t.status !== 'completed') return false;
      if (statusTab === 'skipped' && t.status !== 'skipped') return false;
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

  // Metrics specifically for this Doctor
  const activeQueue = doctorTokens.filter(t => ['booked', 'waiting', 'checked-in'].includes(t.status) && (t.bookingDate === todayStr || !t.bookingDate));
  const completedToday = doctorTokens.filter(t => t.status === 'completed' && (t.bookingDate === todayStr || !t.bookingDate));
  const skippedToday = doctorTokens.filter(t => t.status === 'skipped' && (t.bookingDate === todayStr || !t.bookingDate));
  const todayDoctorRevenue = completedToday.reduce((acc, t) => acc + (t.consultationFee || doctor?.consultationFee || 0), 0);

  // Currently Serving Token in cabin (first checked-in or waiting)
  const currentlyServing = activeQueue.find(t => t.status === 'checked-in') || activeQueue[0];

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
    if (tokenId) {
      updateTokenStatus(tokenId, 'checked-in');
    } else if (activeQueue.length > 0) {
      updateTokenStatus(activeQueue[0].id, 'checked-in');
    }
  };

  const handleCompleteToken = (id: string) => {
    updateTokenStatus(id, 'completed');
  };

  const handleSkipToken = (id: string) => {
    updateTokenStatus(id, 'skipped');
  };

  const handleCancelToken = (id: string) => {
    updateTokenStatus(id, 'cancelled');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
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
                Dedicated Token Screen
              </span>
            </div>
            <p className="text-xs text-blue-600 font-bold mt-1">
              {doctor.specialization} · {doctor.departmentName}
            </p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              OPD: {doctor.opdStartTime} – {doctor.opdEndTime} · Fee: <strong className="text-slate-700">₹{doctor.consultationFee}</strong> · Duration: {doctor.consultationDuration}m
            </p>
          </div>
        </div>

        {/* Quick KPI pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
          <div className="bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-2xl text-center">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Active Queue</span>
            <span className="text-lg font-black text-amber-600">{activeQueue.length}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-2xl text-center">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Completed</span>
            <span className="text-lg font-black text-emerald-600">{completedToday.length}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-2xl text-center">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Skipped</span>
            <span className="text-lg font-black text-slate-600">{skippedToday.length}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-2xl text-center">
            <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Today's Revenue</span>
            <span className="text-lg font-black text-emerald-700">₹{todayDoctorRevenue}</span>
          </div>
        </div>
      </div>

      {/* ── Live Cabin Serving Panel ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Cabin Consultation Status</span>
          </div>

          {currentlyServing ? (
            <div className="pt-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-amber-400 tracking-tight">Token #{currentlyServing.tokenNo}</span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                  currentlyServing.type === 'online' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {currentlyServing.type === 'online' ? '📱 Customer Booked' : '🏥 Hospital Walk-in'}
                </span>
              </div>
              <p className="text-sm font-extrabold text-white mt-1">
                {currentlyServing.patientName} <span className="text-slate-400 text-xs font-semibold">({currentlyServing.patientGender}, {currentlyServing.patientAge} Yrs · {currentlyServing.patientPhone})</span>
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Session: <span className="text-slate-200 capitalize font-bold">{currentlyServing.session}</span> · Slot Time: {currentlyServing.time}
              </p>
            </div>
          ) : (
            <div className="pt-2 text-slate-400 text-sm font-bold">
              Cabin is currently idle. No waiting patients in today's active queue.
            </div>
          )}
        </div>

        {/* Action Controls for Live Cabin */}
        <div className="flex flex-wrap items-center gap-3">
          {currentlyServing && (
            <>
              <button
                onClick={() => handleCompleteToken(currentlyServing.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border-none transition-all shadow-md shadow-emerald-600/30"
              >
                <CheckCircle size={15} /> Mark Visited / Completed
              </button>

              <button
                onClick={() => handleSkipToken(currentlyServing.id)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
              >
                <Clock size={15} /> Skip / Absent
              </button>
            </>
          )}

          <button
            onClick={() => handleCallNext()}
            disabled={activeQueue.length === 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border-none transition-all shadow-md shadow-blue-600/30"
          >
            <Play size={14} /> Call Next Patient
          </button>
        </div>
      </div>

      {/* ── Main Tokens Table with Filter Controls ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-5 border-b border-slate-100 space-y-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {[
                { id: 'all', label: 'All Tokens', count: doctorTokens.length },
                { id: 'active', label: 'Active Queue', count: activeQueue.length },
                { id: 'completed', label: 'Visited / Done', count: completedToday.length },
                { id: 'skipped', label: 'Not Visited / Skipped', count: skippedToday.length },
                { id: 'cancelled', label: 'Cancelled', count: doctorTokens.filter(t => t.status === 'cancelled').length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border-none ${
                    statusTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100 text-xs">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer border-none ${
                  sourceFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                All Sources
              </button>
              <button
                onClick={() => setSourceFilter('online')}
                className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer border-none flex items-center gap-1 ${
                  sourceFilter === 'online' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                <Wifi size={11} /> Customer Booked
              </button>
              <button
                onClick={() => setSourceFilter('offline')}
                className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer border-none flex items-center gap-1 ${
                  sourceFilter === 'offline' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                <WifiOff size={11} /> Hospital Added
              </button>
            </div>
          </div>

          {/* Date & Search Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Calendar size={13} /> Date:
              </span>
              {(['today', 'tomorrow', 'yesterday', 'all'] as const).map(df => (
                <button
                  key={df}
                  onClick={() => setDateFilter(df)}
                  className={`px-3 py-1.5 rounded-xl capitalize font-bold cursor-pointer border transition-all ${
                    dateFilter === df
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {df}
                </button>
              ))}

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer border transition-all ${
                    dateFilter === 'custom'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Custom Date
                </button>
                {dateFilter === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                )}
              </div>
            </div>

            {/* Search Input & Session filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedSessionFilter}
                onChange={e => setSelectedSessionFilter(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer outline-none"
              >
                <option value="all">All Sessions</option>
                {scheduleConfig.sessions.map(s => (
                  <option key={s.id} value={s.name.toLowerCase()}>{s.name} Session</option>
                ))}
              </select>

              <div className="relative">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search token, patient..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none w-48 focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Token No.</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Session / Date</th>
                <th className="px-4 py-3.5">Fee & Payment</th>
                <th className="px-4 py-3.5">Queue Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTokens.map((tok) => {
                const isCurrent = currentlyServing?.id === tok.id;
                return (
                  <tr
                    key={tok.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isCurrent ? 'bg-amber-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-sm">#{tok.tokenNo}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            In Cabin
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit ${
                        tok.type === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {tok.type === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                        {tok.type === 'online' ? 'Customer App' : 'Hospital Desk'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-extrabold text-slate-800 leading-none">{tok.patientName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {tok.patientGender}, {tok.patientAge} Y · <Phone size={10} className="inline mr-0.5" />{tok.patientPhone}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-700 capitalize">{tok.session} Session</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{tok.bookingDate || todayStr} · {tok.time}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-extrabold text-slate-800">₹{tok.consultationFee || doctor.consultationFee}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded capitalize ${
                        tok.paymentStatus === 'paid' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                      }`}>
                        {tok.paymentStatus} ({tok.paymentMethod || 'Cash'})
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full capitalize ${
                        tok.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        tok.status === 'checked-in' ? 'bg-amber-100 text-amber-700' :
                        tok.status === 'skipped' ? 'bg-slate-200 text-slate-700' :
                        tok.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {tok.status === 'checked-in' ? 'In Cabin' : tok.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {tok.status !== 'completed' && tok.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCallNext(tok.id)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-[11px] cursor-pointer transition-colors border border-blue-200"
                            title="Call to Cabin"
                          >
                            Call
                          </button>
                        )}

                        {tok.status !== 'completed' && (
                          <button
                            onClick={() => handleCompleteToken(tok.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer border-none"
                            title="Mark Completed"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => setViewToken(tok)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer border-none"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>

                        {tok.status !== 'cancelled' && tok.status !== 'completed' && (
                          <button
                            onClick={() => handleCancelToken(tok.id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg cursor-pointer border-none"
                            title="Cancel Token"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTokens.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-semibold">
                    No tokens found matching the selected filters for {doctor.name}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Token Modal */}
      {viewToken && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">Token Details #{viewToken.tokenNo}</h3>
                <p className="text-xs text-slate-400 font-semibold">Consulting: {doctor.name}</p>
              </div>
              <button
                onClick={() => setViewToken(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Name</span>
                  <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{viewToken.patientName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                  <span className="font-bold text-slate-700 mt-0.5 block">{viewToken.patientPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Demographics</span>
                  <span className="font-bold text-slate-700 mt-0.5 block">{viewToken.patientGender}, {viewToken.patientAge} Years</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Booking Source</span>
                  <span className="font-bold text-blue-600 mt-0.5 block capitalize">{viewToken.type} ({viewToken.type === 'online' ? 'Customer App' : 'Desk Counter'})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Consultation Fee</span>
                  <span className="text-sm font-black text-slate-900 mt-0.5 block">₹{viewToken.consultationFee}</span>
                </div>
                <div className="border border-slate-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Status</span>
                  <span className="text-xs font-black text-emerald-600 mt-0.5 block capitalize">{viewToken.paymentStatus} ({viewToken.paymentMethod})</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={13} /> Print Slip
              </button>
              <button
                onClick={() => setViewToken(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer border-none shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
