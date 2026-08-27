import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import type { TokenRecord } from '../../context/HospitalContext';
import {
  Plus, Search, XCircle, CheckCircle, Wifi, WifiOff,
  Printer, X, Calendar, AlertCircle
} from 'lucide-react';

const statusColors: Record<string, string> = {
  booked: 'bg-blue-50 text-blue-700 border border-blue-200',
  'checked-in': 'bg-amber-50 text-amber-700 border border-amber-200',
  waiting: 'bg-purple-50 text-purple-700 border border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
  skipped: 'bg-slate-100 text-slate-600 border border-slate-200',
};

// ─── Direct Walk-in Token Generator Component ─────────────────────────────
const WalkInGenerator: React.FC<{ onCreated?: (token: TokenRecord) => void }> = ({ onCreated }) => {
  const { generateWalkInToken, doctors, departments, scheduleConfig } = useHospital();

  const [form, setForm] = useState({
    patientName: '',
    patientPhone: '',
    patientAge: '',
    patientGender: 'Male',
    address: '',
    departmentId: '',
    doctorId: '',
    session: 'morning' as 'morning' | 'afternoon' | 'evening',
    isRevisit: false
  });
  const [generated, setGenerated] = useState<TokenRecord | null>(null);
  const [error, setError] = useState('');

  const activeDepts = departments.filter(d => d.active);
  const availDoctors = form.departmentId
    ? doctors.filter(d => d.departmentId === form.departmentId && d.active)
    : doctors.filter(d => d.active);

  const selectedDoctor = doctors.find(d => d.id === form.doctorId);

  const activeSessions = useMemo(() => {
    if (selectedDoctor?.sessions && selectedDoctor.sessions.length > 0) {
      const acts = selectedDoctor.sessions.filter(s => s.active);
      if (acts.length > 0) return acts;
    }
    return scheduleConfig?.sessions?.filter(s => s.active) || [
      { id: 'sess-1', name: 'Morning', startTime: '09:00 AM', endTime: '01:00 PM', active: true },
      { id: 'sess-2', name: 'Evening', startTime: '05:00 PM', endTime: '09:00 PM', active: true },
    ];
  }, [selectedDoctor, scheduleConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim() || !form.patientPhone.trim() || !form.patientAge || !form.departmentId || !form.doctorId) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    const token = generateWalkInToken({
      patientName: form.patientName.trim(),
      patientPhone: form.patientPhone.trim(),
      patientAge: parseInt(form.patientAge, 10) || 25,
      patientGender: form.patientGender,
      address: form.address.trim(),
      departmentId: form.departmentId,
      doctorId: form.doctorId,
      session: form.session
    });
    setGenerated(token);
    setError('');
    if (onCreated) onCreated(token);
  };

  const handleReset = () => {
    setGenerated(null);
    setForm({
      patientName: '',
      patientPhone: '',
      patientAge: '',
      patientGender: 'Male',
      address: '',
      departmentId: '',
      doctorId: '',
      session: (activeSessions[0]?.name?.toLowerCase() || 'morning') as any,
      isRevisit: false
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 max-w-3xl">
      {!generated ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">Walk-in Patient Token Form</h3>
              <p className="text-xs text-slate-400 mt-0.5">Register walk-in patient and generate instant digital queue slip</p>
            </div>
            <span className="text-[11px] font-extrabold px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
              Counter Offline Token
            </span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Patient Full Name *</label>
              <input
                type="text"
                required
                value={form.patientName}
                onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">10-Digit Mobile Number *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={form.patientPhone}
                onChange={e => setForm(p => ({ ...p, patientPhone: e.target.value.replace(/\D/g, '') }))}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Age (Years) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={form.patientAge}
                  onChange={e => setForm(p => ({ ...p, patientAge: e.target.value }))}
                  placeholder="35"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Gender *</label>
                <select
                  value={form.patientGender}
                  onChange={e => setForm(p => ({ ...p, patientGender: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white font-medium"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Area / Residential Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="e.g. Koramangala 4th Block"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Department *</label>
              <select
                required
                value={form.departmentId}
                onChange={e => setForm(p => ({ ...p, departmentId: e.target.value, doctorId: '' }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white font-medium"
              >
                <option value="">Select Department</option>
                {activeDepts.map(d => (
                  <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Consulting Doctor *</label>
              <select
                required
                value={form.doctorId}
                onChange={e => setForm(p => ({ ...p, doctorId: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white font-medium"
              >
                <option value="">Select Doctor</option>
                {availDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} · ₹{d.consultationFee}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">OPD Session Time *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeSessions.map((s: any) => {
                  const sKey = s.name.toLowerCase();
                  const isSelected = form.session === sKey || form.session === s.name;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setForm(p => ({ ...p, session: sKey as any }))}
                      className={`p-3 rounded-2xl text-xs font-bold cursor-pointer border transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{s.name}</span>
                        <span>{s.name.toLowerCase().includes('morn') ? '🌅' : s.name.toLowerCase().includes('after') ? '☀️' : '🌙'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1">{s.startTime} – {s.endTime}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedDoctor && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">{selectedDoctor.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{selectedDoctor.specialization} · Est. Duration: {selectedDoctor.consultationDuration || 15} mins</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">Consultation Fee</span>
                <span className="text-sm font-black text-blue-600">₹{selectedDoctor.consultationFee}</span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl cursor-pointer border-none shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Generate & Assign Token
            </button>
          </div>
        </form>
      ) : (
        <div className="py-4 text-center space-y-6 animate-in fade-in">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle size={36} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Token Generated Successfully!</h3>
            <p className="text-xs text-slate-400 mt-1">Walk-in token is registered in the hospital live queue</p>
          </div>

          {/* Digital Token Slip Preview */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-6 max-w-md mx-auto shadow-lg text-left relative overflow-hidden">
            <div className="flex justify-between items-start border-b border-white/20 pb-3 mb-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-blue-200">Apollo Spectra Hospital</p>
                <p className="text-xs font-semibold opacity-90">OPD Consultation Slip</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-white/20 rounded-full">Walk-in</span>
            </div>

            <div className="text-center py-2">
              <span className="text-xs text-blue-200 block font-semibold">Token Number</span>
              <h1 className="text-5xl font-black tracking-tight my-1">#{generated.tokenNo}</h1>
              <span className="text-[11px] bg-white/20 px-3 py-1 rounded-full font-bold inline-block capitalize">
                Session: {generated.session}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs">
              <div>
                <span className="text-[10px] text-blue-200 block">Patient Name</span>
                <p className="font-bold truncate">{generated.patientName}</p>
                <p className="text-[10px] text-blue-100">{generated.patientPhone}</p>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 block">Doctor</span>
                <p className="font-bold truncate">{generated.doctorName}</p>
                <p className="text-[10px] text-blue-100">{generated.departmentName}</p>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 block">Queue Position</span>
                <p className="font-bold">#{generated.queuePosition}</p>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 block">Consultation Fee</span>
                <p className="font-bold">₹{generated.consultationFee} (Pay at Cabin)</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer border-none flex items-center justify-center gap-1.5"
            >
              <Printer size={14} /> Print Token Slip
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-xl cursor-pointer border-none"
            >
              + Issue Another Token
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
const WalkInModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer border-none z-10"
        >
          <X size={16} />
        </button>
        <WalkInGenerator onCreated={() => {}} />
      </div>
    </div>
  );
};

// ─── Token Table ──────────────────────────────────────────────────────────────
const TokenTable: React.FC<{ tokens: TokenRecord[]; title: string; subtitle: string; onAddClick: () => void }> = ({
  tokens: toks,
  title,
  subtitle,
  onAddClick
}) => {
  const { updateTokenStatus, cancelToken, departments, doctors } = useHospital();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);

  // Doctor list filtered by department if dept is chosen
  const filteredDocList = deptFilter === 'all'
    ? doctors
    : doctors.filter(d => d.departmentId === deptFilter);

  const filtered = toks.filter(t => {
    const matchesSearch =
      (t.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.patientPhone || '').includes(search) ||
      (t.doctorName || '').toLowerCase().includes(search.toLowerCase()) ||
      String(t.tokenNo).includes(search);

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesDept = deptFilter === 'all' || t.departmentId === deptFilter;
    const matchesDoc = docFilter === 'all' || t.doctorId === docFilter;
    const matchesDate = !dateFilter || t.bookingDate === dateFilter || (!t.bookingDate && dateFilter === new Date().toISOString().split('T')[0]);

    return matchesSearch && matchesStatus && matchesDept && matchesDoc && matchesDate;
  });

  // Calculate filtered stats
  const totalCount = filtered.length;
  const completedCount = filtered.filter(t => t.status === 'completed').length;
  const inCabinCount = filtered.filter(t => t.status === 'checked-in' || (t.status as string) === 'in-cabin').length;
  const cancelledCount = filtered.filter(t => t.status === 'cancelled' || t.status === 'skipped').length;
  const totalRevenue = filtered.reduce((acc, t) => acc + (t.status !== 'cancelled' ? (t.consultationFee || 0) : 0), 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-0">
      {/* Table Header & Summary KPI Strip */}
      <div className="p-5 border-b border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-800 text-sm">{title}</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                {filtered.length} Displayed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddClick}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl cursor-pointer border-none inline-flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
            >
              <Plus size={14} /> Add Walk-in Token
            </button>
          </div>
        </div>

        {/* Analytics Mini Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100/80">
          <div className="bg-slate-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-slate-400">Total Booked</p>
            <p className="text-sm font-black text-slate-800">{totalCount}</p>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-emerald-600">Completed</p>
            <p className="text-sm font-black text-emerald-700">{completedCount}</p>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-amber-600">In-Cabin / Waiting</p>
            <p className="text-sm font-black text-amber-700">{inCabinCount}</p>
          </div>
          <div className="bg-red-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-red-500">Cancelled / Skipped</p>
            <p className="text-sm font-black text-red-600">{cancelledCount}</p>
          </div>
          <div className="bg-purple-50 p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-purple-600">Token Fees</p>
            <p className="text-sm font-black text-purple-700">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Filter Controls: Department, Doctor, Date, Status, Search */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={e => {
              setDeptFilter(e.target.value);
              setDocFilter('all');
            }}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Doctor Filter */}
          <select
            value={docFilter}
            onChange={e => setDocFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">All Doctors</option>
            {filteredDocList.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="checked-in">Checked In / In-Cabin</option>
            <option value="waiting">Waiting</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="skipped">Skipped</option>
          </select>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search token #, patient, phone..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Token #', 'Type', 'Patient Details', 'Doctor & Dept', 'Session / Date', 'Time', 'Fee', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                    <Calendar size={22} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No tokens found in this category</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Tokens booked by customers online or generated at the reception desk will automatically populate here in real-time.
                  </p>
                  <button
                    onClick={onAddClick}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer border-none inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Add Walk-in Token
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-black text-slate-800 text-sm">
                    #{t.tokenNo}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                      t.type === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.type === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {t.type === 'online' ? 'Online' : 'Walk-in'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-slate-800">{t.patientName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{t.patientPhone} · {t.patientGender}, {t.patientAge}Y</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-slate-700">{t.doctorName}</p>
                    <p className="text-[10px] text-blue-600 font-semibold">{t.departmentName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-slate-700 capitalize">{t.session}</p>
                    <p className="text-[10px] text-slate-400">{t.bookingDate || 'Today'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                    {t.time}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-black text-slate-800">₹{t.consultationFee}</p>
                    <span className={`text-[9px] font-bold capitalize ${t.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {t.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full capitalize ${statusColors[t.status] || 'bg-slate-100 text-slate-700'}`}>
                      {t.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {t.status === 'booked' && (
                        <button
                          onClick={() => updateTokenStatus(t.id, 'checked-in')}
                          title="Check In Patient"
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[10px] cursor-pointer border-none transition-colors"
                        >
                          Check In
                        </button>
                      )}
                      {(t.status === 'checked-in' || t.status === 'waiting') && (
                        <button
                          onClick={() => updateTokenStatus(t.id, 'completed')}
                          title="Mark Consultation Completed"
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] cursor-pointer border-none transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      {t.status !== 'completed' && t.status !== 'cancelled' && (
                        <button
                          onClick={() => cancelToken(t.id)}
                          title="Cancel Token"
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer border-none transition-colors"
                        >
                          <XCircle size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => window.print()}
                        title="Print Token Slip"
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer border-none transition-colors"
                      >
                        <Printer size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main TokenManagement View ────────────────────────────────────────────────
export const TokenManagement: React.FC = () => {
  const { tokens } = useHospital();
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const location = useLocation();

  const getTokenSet = () => {
    const path = location.pathname;
    const today = new Date().toISOString().split('T')[0];

    if (path.includes('online')) {
      return {
        title: 'Online Tokens',
        subtitle: 'Real-time patient bookings from the customer app and web portal',
        toks: tokens.filter(t => t.type === 'online')
      };
    }
    if (path.includes('offline')) {
      return {
        title: 'Offline / Walk-in Tokens',
        subtitle: 'Tokens generated directly at the hospital reception counter',
        toks: tokens.filter(t => t.type === 'offline')
      };
    }
    if (path.includes('today')) {
      return {
        title: "Today's Tokens",
        subtitle: `All scheduled OPD consultations for today (${today})`,
        toks: tokens.filter(t => !t.bookingDate || t.bookingDate === today)
      };
    }
    if (path.includes('upcoming')) {
      return {
        title: 'Upcoming Tokens',
        subtitle: 'Advance appointments scheduled for future dates',
        toks: tokens.filter(t => (t.bookingDate && t.bookingDate > today) || (t.status === 'booked' && t.bookingDate >= today))
      };
    }
    if (path.includes('completed')) {
      return {
        title: 'Completed Tokens',
        subtitle: 'Consultations finished and discharged by hospital doctors',
        toks: tokens.filter(t => t.status === 'completed')
      };
    }
    if (path.includes('cancelled')) {
      return {
        title: 'Cancelled Tokens',
        subtitle: 'Appointments cancelled or refunded',
        toks: tokens.filter(t => t.status === 'cancelled')
      };
    }
    if (path.includes('revisit')) {
      return {
        title: 'Revisit Tokens',
        subtitle: 'Follow-up consultations and valid revisit tokens',
        toks: tokens.filter(t => Boolean(t.isRevisit))
      };
    }
    if (path.includes('add')) {
      return null;
    }
    return {
      title: 'All Tokens',
      subtitle: 'Unified repository of all online and walk-in patient tokens',
      toks: tokens
    };
  };

  const tokenSet = getTokenSet();

  // "Add Token" page view
  if (!tokenSet) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-xl font-black text-slate-800">Add Walk-in Token</h2>
          <p className="text-xs text-slate-400 mt-1">
            Register an offline / walk-in patient and immediately assign a queue token number
          </p>
        </div>
        <WalkInGenerator />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">{tokenSet.title}</h2>
          <p className="text-xs text-slate-400 mt-1">{tokenSet.subtitle}</p>
        </div>
        <button
          onClick={() => setShowWalkInModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/20 self-start sm:self-auto"
        >
          <Plus size={14} /> Add Walk-in Token
        </button>
      </div>

      <TokenTable
        tokens={tokenSet.toks}
        title={tokenSet.title}
        subtitle={tokenSet.subtitle}
        onAddClick={() => setShowWalkInModal(true)}
      />

      {showWalkInModal && <WalkInModal onClose={() => setShowWalkInModal(false)} />}
    </div>
  );
};
