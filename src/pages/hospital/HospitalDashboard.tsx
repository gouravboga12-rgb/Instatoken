import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import {
  Wifi, WifiOff, Users, Plus, Eye, Edit3, Trash2, TrendingUp,
  Bell, Send, ChevronRight, CheckCircle,
  Zap, ShieldCheck, Printer, Search, ChevronLeft
} from 'lucide-react';

const StatCardSparkline: React.FC<{
  title: string;
  value: string | number;
  sub: string;
  trend: string;
  color: string;
  type: 'add' | 'online' | 'offline' | 'total';
  onAddClick?: () => void;
}> = ({ title, value, sub, trend, color, type, onAddClick }) => {
  if (type === 'add') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Plus size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Add New Token</h3>
            <p className="text-[11px] text-slate-400 font-semibold">{sub}</p>
          </div>
        </div>
        <button
          onClick={onAddClick}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm shadow-blue-500/20 border-none"
        >
          <Plus size={14} /> Add Token
        </button>
      </div>
    );
  }

  // Sparkline data generators
  const sparkData = type === 'online' 
    ? [20, 24, 22, 28, 30, 29, 34] 
    : type === 'offline' 
    ? [18, 20, 19, 22, 25, 24, 27] 
    : [38, 44, 41, 50, 55, 53, 61];

  const maxVal = Math.max(...sparkData);
  const minVal = Math.min(...sparkData);
  const points = sparkData.map((val, idx) => {
    const x = (idx / (sparkData.length - 1)) * 120;
    const y = 35 - ((val - minVal) / (maxVal - minVal || 1)) * 25;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = type === 'online' ? '#10b981' : type === 'offline' ? '#3b82f6' : '#8b5cf6';
  const fillColor = type === 'online' ? '#d1fae5' : type === 'offline' ? '#dbeafe' : '#ede9fe';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-700">{title}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{sub}</p>
        </div>
        <div className={`p-2 rounded-xl ${color}`}>
          {type === 'online' ? <Wifi size={16} /> : type === 'offline' ? <WifiOff size={16} /> : <Users size={16} />}
        </div>
      </div>

      <div className="flex items-end justify-between mt-3">
        <div>
          <div className="text-2xl font-black text-slate-800">{value}</div>
          <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5 mt-0.5">
            <TrendingUp size={10} /> {trend}
          </span>
        </div>

        {/* Mini SVG Sparkline */}
        <div className="w-28 h-9 shrink-0">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 120 40">
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
            <polygon
              fill={fillColor}
              opacity="0.4"
              points={`0,40 ${points} 120,40`}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

const TokenRow: React.FC<{ token: any; onView: (t: any) => void }> = ({ token, onView }) => {
  const statusConfig: Record<string, { label: string; cls: string }> = {
    booked: { label: 'Booked', cls: 'bg-emerald-100 text-emerald-700 font-bold' },
    'checked-in': { label: 'Checked In', cls: 'bg-blue-100 text-blue-700 font-bold' },
    completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-800 font-bold' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 font-bold' },
    waiting: { label: 'Waiting', cls: 'bg-amber-100 text-amber-700 font-bold' },
    skipped: { label: 'Skipped', cls: 'bg-slate-100 text-slate-600 font-bold' },
  };
  const s = statusConfig[token.status] || statusConfig.booked;

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors text-xs">
      <td className="px-4 py-3 font-extrabold text-slate-800">{token.tokenNo}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit ${
          token.type === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
        }`}>
          {token.type === 'online' ? 'Online' : 'Offline'}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="font-extrabold text-slate-800 leading-none">{token.patientName}</p>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
          {token.patientPhone} | {token.patientGender} | {token.patientAge} Y
        </p>
      </td>
      <td className="px-4 py-3">
        <p className="font-bold text-slate-700">{token.doctorName}</p>
        <p className="text-[10px] text-slate-400 font-semibold">{token.departmentName}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-bold text-slate-700 capitalize">{token.session}</p>
        <p className="text-[10px] text-slate-400 font-semibold">
          {token.session === 'morning' ? '09:00 AM - 01:00 PM' : token.session === 'afternoon' ? '01:00 PM - 05:00 PM' : '05:00 PM - 09:00 PM'}
        </p>
      </td>
      <td className="px-4 py-3 font-bold text-slate-700">{token.time}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onView(token)}
          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border-none"
          title="View Details"
        >
          <Eye size={15} />
        </button>
      </td>
    </tr>
  );
};

export const HospitalDashboard: React.FC = () => {
  const { tokens, doctors, scheduleConfig, setActiveSection, validateToken } = useHospital();
  const navigate = useNavigate();

  const [tokenFilter, setTokenFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [doctorFilter, setDoctorFilter] = useState('All Doctors');
  const [sessionFilter, setSessionFilter] = useState('All Sessions');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchTokenQuery, setSearchTokenQuery] = useState('');

  // Right Column Widgets State
  const [notifMsg, setNotifMsg] = useState('');
  const [notifTarget, setNotifTarget] = useState<'all' | 'custom'>('all');
  const [notifSuccess, setNotifSuccess] = useState(false);

  // Prescription Print Widget State
  const [prescriptionTokenNo, setPrescriptionTokenNo] = useState('');
  const [prescriptionResult, setPrescriptionResult] = useState<any>(null);
  const [prescriptionError, setPrescriptionError] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Token Validation Revisit Widget State
  const [revisitTokenNo, setRevisitTokenNo] = useState('');
  const [revisitResult, setRevisitResult] = useState<any>(null);
  const [revisitError, setRevisitError] = useState('');

  // Counts
  const onlineCount = tokens.filter(t => t.type === 'online').length;
  const offlineCount = tokens.filter(t => t.type === 'offline').length;
  const totalToday = tokens.length;

  const filteredTokens = tokens.filter(t => {
    if (tokenFilter === 'online' && t.type !== 'online') return false;
    if (tokenFilter === 'offline' && t.type !== 'offline') return false;
    if (doctorFilter !== 'All Doctors' && t.doctorName !== doctorFilter) return false;
    if (sessionFilter !== 'All Sessions' && t.session !== sessionFilter.toLowerCase()) return false;
    if (statusFilter !== 'All Status' && t.status !== statusFilter.toLowerCase()) return false;
    if (searchTokenQuery.trim()) {
      const q = searchTokenQuery.toLowerCase();
      return (
        t.tokenNo.toString().includes(q) ||
        t.patientName.toLowerCase().includes(q) ||
        t.patientPhone.includes(q) ||
        t.doctorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleFetchPrescription = () => {
    setPrescriptionError('');
    if (!prescriptionTokenNo) return;
    const t = validateToken(parseInt(prescriptionTokenNo));
    if (t) {
      setPrescriptionResult(t);
    } else {
      setPrescriptionResult(null);
      setPrescriptionError('Token not found. Check token number.');
    }
  };

  const handleValidateRevisit = () => {
    setRevisitError('');
    if (!revisitTokenNo) return;
    const t = validateToken(parseInt(revisitTokenNo));
    if (t) {
      setRevisitResult(t);
    } else {
      setRevisitResult(null);
      setRevisitError('Token invalid or not found.');
    }
  };

  const handleSendPushNotif = () => {
    if (!notifMsg.trim()) return;
    setNotifSuccess(true);
    setTimeout(() => {
      setNotifSuccess(false);
      setNotifMsg('');
    }, 2500);
  };

  const handleNavSection = (section: string, path: string) => {
    setActiveSection(section);
    navigate(path);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── TOP STAT CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSparkline
          type="add"
          title="Add New Token"
          value=""
          sub="Add Offline / Walk-in Token"
          trend=""
          color=""
          onAddClick={() => handleNavSection('add-token', '/hospital/tokens/add')}
        />
        <StatCardSparkline
          type="online"
          title="Online Tokens"
          value={onlineCount}
          sub="Today's Online Bookings"
          trend={`${onlineCount} active`}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCardSparkline
          type="offline"
          title="Offline Tokens"
          value={offlineCount}
          sub="Today's Walk-in Tokens"
          trend={`${offlineCount} active`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCardSparkline
          type="total"
          title="Total Tokens Today"
          value={totalToday}
          sub="Online + Offline"
          trend={`${totalToday} registered`}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── MAIN DASHBOARD CONTENT (2 Columns) ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN (8 cols): Tokens Table + Bottom Cards */}
        <div className="xl:col-span-8 space-y-6">
          {/* TOKENS TABLE CONTAINER */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {/* Header Tabs & Filters Bar */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button
                    onClick={() => setTokenFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none ${
                      tokenFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All Tokens ({totalToday})
                  </button>
                  <button
                    onClick={() => setTokenFilter('online')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none ${
                      tokenFilter === 'online' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Online ({onlineCount})
                  </button>
                  <button
                    onClick={() => setTokenFilter('offline')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none ${
                      tokenFilter === 'offline' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Offline ({offlineCount})
                  </button>
                </div>

                {/* Dropdown Filters & Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={doctorFilter}
                    onChange={e => setDoctorFilter(e.target.value)}
                    className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer outline-none"
                  >
                    <option>All Doctors</option>
                    {doctors.map(d => <option key={d.id}>{d.name}</option>)}
                  </select>

                  <select
                    value={sessionFilter}
                    onChange={e => setSessionFilter(e.target.value)}
                    className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer outline-none"
                  >
                    <option>All Sessions</option>
                    <option>Morning</option>
                    <option>Afternoon</option>
                    <option>Evening</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer outline-none"
                  >
                    <option>All Status</option>
                    <option>Booked</option>
                    <option>Checked-in</option>
                    <option>Completed</option>
                    <option>Waiting</option>
                    <option>Cancelled</option>
                  </select>

                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Token, Patient..."
                      value={searchTokenQuery}
                      onChange={e => setSearchTokenQuery(e.target.value)}
                      className="pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none w-44 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Token No.</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Patient Details</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.slice(0, 7).map(t => (
                    <TokenRow key={t.id} token={t} onView={tok => handleNavSection('all-tokens', `/hospital/tokens/all?id=${tok.id}`)} />
                  ))}
                  {filteredTokens.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-xs text-slate-400 font-semibold">
                        No tokens matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Showing 1 to {Math.min(7, filteredTokens.length)} of {filteredTokens.length} entries</span>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer border-none">
                  <ChevronLeft size={14} />
                </button>
                <button className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer border-none">1</button>
                <button className="w-6 h-6 rounded-lg hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center cursor-pointer border-none">2</button>
                <button className="w-6 h-6 rounded-lg hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center cursor-pointer border-none">3</button>
                <span className="text-slate-400 px-1">...</span>
                <button className="w-6 h-6 rounded-lg hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center cursor-pointer border-none">9</button>
                <button className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer border-none">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* ── BOTTOM GRID (3 Cards Side-by-Side: Doctors, Auto Scheduling, Session & Schedule Overview) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Doctors Management Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Doctors Management</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">Manage your hospital doctors</p>
                  </div>
                  <button
                    onClick={() => handleNavSection('doctors', '/hospital/doctors')}
                    className="bg-blue-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer border-none hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={10} /> Add Doctor
                  </button>
                </div>

                <div className="space-y-3">
                  {doctors.slice(0, 3).map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                        {doc.name.split(' ').slice(-1)[0].charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-800 truncate">{doc.name}</p>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${doc.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {doc.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-blue-600 truncate">{doc.specialization}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{doc.qualification} · Fee: ₹{doc.consultationFee}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button className="p-1 hover:bg-blue-100 rounded-md text-slate-400 hover:text-blue-600 cursor-pointer border-none">
                          <Edit3 size={11} />
                        </button>
                        <button className="p-1 hover:bg-red-100 rounded-md text-slate-400 hover:text-red-600 cursor-pointer border-none">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleNavSection('doctors', '/hospital/doctors')}
                className="mt-4 text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 cursor-pointer border-none bg-transparent"
              >
                View All Doctors <ChevronRight size={12} />
              </button>
            </div>

            {/* 2. Automatic Scheduling Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Automatic Scheduling</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">Like BookMyShow - Patients book in advance</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs py-1">
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-semibold">Booking Open Days</span>
                    <span className="font-extrabold text-slate-800">{scheduleConfig.bookingOpensDaysBefore || 3} Days from Today</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-semibold">Max Advance Booking</span>
                    <span className="font-extrabold text-slate-800">{scheduleConfig.advanceBookingLimit || 7} Days</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-semibold">Session Type</span>
                    <span className="font-extrabold text-slate-800">Morning / Afternoon / Evening</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-semibold">Auto Token Generation</span>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-semibold">Token Continuity</span>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-semibold">Buffer Time Between Sessions</span>
                    <span className="font-extrabold text-slate-800">{scheduleConfig.bufferTime || 15} Minutes</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleNavSection('auto-schedule', '/hospital/auto-schedule')}
                className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border-none transition-colors"
              >
                <Zap size={13} className="text-amber-400" /> Configure Schedule
              </button>
            </div>

            {/* 3. Session & Schedule Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 mb-2">Session & Schedule Overview</h4>

                <div className="space-y-2 mb-3">
                  {[
                    { name: 'Morning', time: '09:00 AM - 01:00 PM', tokens: 50, booked: 28, pct: 56 },
                    { name: 'Afternoon', time: '01:00 PM - 05:00 PM', tokens: 50, booked: 18, pct: 36 },
                    { name: 'Evening', time: '05:00 PM - 09:00 PM', tokens: 50, booked: 15, pct: 30 },
                  ].map((sess) => (
                    <div key={sess.name} className="bg-slate-50 p-2 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-extrabold text-slate-800">
                        <span>{sess.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{sess.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                        <span>Tokens: {sess.tokens}</span>
                        <span>Booked: {sess.booked} ({sess.pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${sess.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Booking Calendar Header */}
                <div className="border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-700 mb-1.5">
                    <span>Booking Calendar</span>
                    <span className="text-slate-400 text-[10px]">May 2024</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px]">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="font-extrabold text-slate-400">{d}</div>
                    ))}
                    {[19, 20, 21, 22, 23, 24, 25].map(day => (
                      <div
                        key={day}
                        className={`py-1 rounded-md font-extrabold ${
                          day === 23 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (4 cols): Quick Widget Stack (Push Notification, Today's Schedule, Prescription Print, Token Validation Revisit) ── */}
        <div className="xl:col-span-4 space-y-4">
          {/* 1. Push Notification Widget */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Bell size={15} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">Push Notification</h4>
                <p className="text-[10px] text-slate-400 font-semibold">Send notification to patients</p>
              </div>
            </div>

            <textarea
              rows={3}
              value={notifMsg}
              onChange={e => setNotifMsg(e.target.value)}
              placeholder="Type your message here..."
              maxLength={160}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 transition-all resize-none text-slate-700"
            />
            <div className="text-[10px] text-slate-400 font-semibold text-right mt-0.5">
              {notifMsg.length}/160
            </div>

            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-black text-slate-600 uppercase">Send To</p>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="sendTo"
                    checked={notifTarget === 'all'}
                    onChange={() => setNotifTarget('all')}
                    className="accent-blue-600"
                  />
                  <span>All Patients</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="sendTo"
                    checked={notifTarget === 'custom'}
                    onChange={() => setNotifTarget('custom')}
                    className="accent-blue-600"
                  />
                  <span>Custom Numbers</span>
                </label>
              </div>
            </div>

            {notifSuccess && (
              <p className="text-[10px] font-bold text-emerald-600 mt-2 bg-emerald-50 p-1.5 rounded-lg text-center">
                ✓ Notification sent successfully!
              </p>
            )}

            <button
              onClick={handleSendPushNotif}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-xs transition-colors"
            >
              <Send size={13} /> Send Notification
            </button>
          </div>

          {/* 2. Today's Schedule Widget */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-slate-800">Today's Schedule</h4>
              <button
                onClick={() => handleNavSection('sessions', '/hospital/schedule')}
                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Dr. Rahul Verma', spec: 'Cardiologist', time: '09:00 AM - 01:00 PM', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { name: 'Dr. Anjali Sharma', spec: 'Pediatrician', time: '01:00 PM - 05:00 PM', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { name: 'Dr. Vivek Singh', spec: 'Orthopedic', time: '05:00 PM - 09:00 PM', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              ].map((sch) => (
                <div key={sch.name} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div>
                    <p className="text-xs font-black text-slate-800 leading-none">{sch.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{sch.spec}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${sch.color}`}>
                    {sch.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Prescription Print Widget */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Printer size={15} />
              </div>
              <h4 className="text-xs font-black text-slate-800">Prescription Print</h4>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Enter Token Number"
                value={prescriptionTokenNo}
                onChange={e => setPrescriptionTokenNo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetchPrescription()}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              />
              <button
                onClick={handleFetchPrescription}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer border-none transition-colors"
              >
                Fetch
              </button>
            </div>

            {prescriptionError && (
              <p className="text-[10px] font-bold text-red-500 mt-2">{prescriptionError}</p>
            )}

            {prescriptionResult && (
              <div className="mt-3 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-1">
                <div className="flex items-center justify-between font-black text-slate-800">
                  <span>{prescriptionResult.patientName}</span>
                  <span className="text-blue-600">Token #{prescriptionResult.tokenNo}</span>
                </div>
                <p className="text-[10px] text-slate-500">{prescriptionResult.doctorName} · {prescriptionResult.departmentName}</p>
              </div>
            )}

            <button
              onClick={() => {
                if (prescriptionResult) {
                  setShowPrintModal(true);
                } else if (prescriptionTokenNo) {
                  handleFetchPrescription();
                  setShowPrintModal(true);
                } else {
                  setPrescriptionError('Please enter token number first.');
                }
              }}
              className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-xs transition-colors"
            >
              <Printer size={13} /> Print Prescription
            </button>
          </div>

          {/* 4. Token Validation (Revisit) Widget */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <ShieldCheck size={15} />
              </div>
              <h4 className="text-xs font-black text-slate-800">Token Validation (Revisit)</h4>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Enter Token Number"
                value={revisitTokenNo}
                onChange={e => setRevisitTokenNo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleValidateRevisit()}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              />
              <button
                onClick={handleValidateRevisit}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer border-none transition-colors"
              >
                Validate
              </button>
            </div>

            {revisitError && (
              <p className="text-[10px] font-bold text-red-500 mt-2">{revisitError}</p>
            )}

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50 text-slate-500 font-semibold">
                <span>Free Revisit Validity</span>
                <span className="font-extrabold text-slate-800">3 Days</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 text-slate-500 font-semibold">
                <span>Token No.</span>
                <span className="font-extrabold text-slate-800">{revisitResult ? revisitResult.tokenNo : '101'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 text-slate-500 font-semibold">
                <span>Valid Upto</span>
                <span className="font-extrabold text-slate-800">{revisitResult?.revisitValidUpto || '26 May 2024'}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-700 font-black text-xs">
              <CheckCircle size={14} className="text-emerald-600" />
              <span>Token is Valid for Revisit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINT PRESCRIPTION MODAL MOCK ── */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Prescription Print Preview</h3>
                <p className="text-xs text-slate-400 font-semibold">InstaToken Hospital OPD Receipt</p>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-lg p-1 cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 text-xs mb-4">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-black text-blue-600 text-sm">Apollo Spectra Hospital</h4>
                  <p className="text-[10px] text-slate-500">Koramangala, Bengaluru · Ph: +91 80 4668 8888</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-slate-800">Token #{prescriptionResult?.tokenNo || '101'}</span>
                  <p className="text-[9px] text-emerald-600 font-bold">Checked-In</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600 font-semibold">
                <div>Patient: <span className="font-extrabold text-slate-800">{prescriptionResult?.patientName || 'Rahul Kumar'}</span></div>
                <div>Age/Gender: <span className="font-extrabold text-slate-800">{prescriptionResult?.patientAge || 28}Y / {prescriptionResult?.patientGender || 'M'}</span></div>
                <div>Doctor: <span className="font-extrabold text-slate-800">{prescriptionResult?.doctorName || 'Dr. Rahul Verma'}</span></div>
                <div>Dept: <span className="font-extrabold text-slate-800">{prescriptionResult?.departmentName || 'Cardiology'}</span></div>
                <div>Date: <span className="font-extrabold text-slate-800">{new Date().toLocaleDateString('en-IN')}</span></div>
                <div>Time Slot: <span className="font-extrabold text-slate-800">{prescriptionResult?.time || '09:15 AM'}</span></div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-[11px]">
                <p className="font-black text-slate-700 mb-1">Rx / Doctor Notes & Prescription:</p>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-500 font-mono text-[10px] space-y-1">
                  <p>1. Tab. Paracetamol 500mg — 1-0-1 (3 Days)</p>
                  <p>2. Tab. Pantoprazole 40mg — 1-0-0 (5 Days before food)</p>
                  <p>3. Syr. Multivitamin — 1 tsp twice daily</p>
                  <p className="text-slate-400 mt-2 italic">Follow up after 3 days with token validation revisit code.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2.5 rounded-xl cursor-pointer border-none"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowPrintModal(false);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-xs"
              >
                <Printer size={14} /> Send to Printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
