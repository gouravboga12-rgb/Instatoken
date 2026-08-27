import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import { useApp } from '../../context/AppContext';
import type { TokenRecord, PatientRecord } from '../../context/HospitalContext';
import {
  Plus, Search, XCircle, CheckCircle, Wifi, WifiOff,
  Printer, X, Calendar, AlertCircle, UserPlus, User, Phone, Mail,
  MapPin, Droplets, FileText, Check, ArrowRight
} from 'lucide-react';

const statusColors: Record<string, string> = {
  booked: 'bg-blue-50 text-blue-700 border border-blue-200',
  'checked-in': 'bg-amber-50 text-amber-700 border border-amber-200',
  waiting: 'bg-purple-50 text-purple-700 border border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
  skipped: 'bg-slate-100 text-slate-600 border border-slate-200',
};

// ─── Create Customer / Patient Account Modal ─────────────────────────────────
const CreateCustomerModal: React.FC<{
  onClose: () => void;
  onSuccess: (patient: PatientRecord) => void;
}> = ({ onClose, onSuccess }) => {
  const { addPatient, hospitalProfile } = useHospital();
  const { getOrCreateCustomerAccount } = useApp();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male',
    bloodGroup: 'O+',
    address: '',
    city: hospitalProfile?.city || 'Bengaluru',
    pinCode: hospitalProfile?.pinCode || '560095',
    medicalHistory: '',
    allergies: ''
  });

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.age) {
      setError('Please fill in all mandatory fields (Name, Phone, Age).');
      return;
    }

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const newPat = {
      name: form.name.trim(),
      phone: cleanPhone,
      email: form.email.trim(),
      age: parseInt(form.age, 10) || 25,
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      address: form.address.trim(),
      city: form.city.trim(),
      pinCode: form.pinCode.trim(),
      familyMembers: [],
      medicalHistory: form.medicalHistory ? [form.medicalHistory.trim()] : [],
      allergies: form.allergies ? [form.allergies.trim()] : []
    };

    addPatient(newPat);

    // Also link customer account in user store
    if (getOrCreateCustomerAccount) {
      getOrCreateCustomerAccount(form.name.trim(), cleanPhone);
    }

    const registeredPat: PatientRecord = {
      ...newPat,
      id: `pat-${Date.now()}`,
      uhid: `APS${Math.floor(100000 + Math.random() * 900000)}`,
      registeredOn: new Date().toISOString().split('T')[0],
      totalVisits: 0,
      lastVisit: '',
      tokenHistory: []
    };

    onSuccess(registeredPat);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Create Customer Account</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Register patient for hospital OPD and mobile app login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400 font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Patient Full Name *</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">10-Digit Mobile Number *</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="9876543210"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="ramesh@example.com"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Age *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={form.age}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  placeholder="35"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Gender *</label>
                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white font-bold"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Blood Group</label>
              <div className="relative">
                <Droplets size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={form.bloodGroup}
                  onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white font-bold"
                >
                  <option>A+</option><option>A-</option>
                  <option>B+</option><option>B-</option>
                  <option>O+</option><option>O-</option>
                  <option>AB+</option><option>AB-</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Residential Address</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Koramangala 4th Block"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Known Medical Conditions / Allergies</label>
            <div className="relative">
              <FileText size={13} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                rows={2}
                value={form.medicalHistory}
                onChange={e => setForm({ ...form, medicalHistory: e.target.value })}
                placeholder="e.g. Hypertension, Diabetic, Penicillin allergy (optional)"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer border-none shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Check size={14} /> Register & Select Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Direct Walk-in Token Generator Component ─────────────────────────────
const WalkInGenerator: React.FC<{
  onCreated?: (token: TokenRecord) => void;
  onRequestCreateAccount?: () => void;
}> = ({ onCreated, onRequestCreateAccount }) => {
  const { generateWalkInToken, doctors, departments, scheduleConfig, patients } = useHospital();
  const { user, customers, appointments } = useApp();

  const [form, setForm] = useState({
    patientName: '',
    patientPhone: '',
    patientAge: '',
    patientGender: 'Male',
    address: '',
    departmentId: '',
    doctorId: '',
    session: 'morning' as 'morning' | 'afternoon' | 'evening',
    isRevisit: false,
    selectedPatientUhid: ''
  });

  const [generated, setGenerated] = useState<TokenRecord | null>(null);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Patient Search State
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Combined Pool of All Registered Patients, App Accounts, and Past Bookings
  const allSearchablePatients = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      phone: string;
      email?: string;
      age?: number;
      gender?: string;
      address?: string;
      uhid?: string;
      source: string;
    }> = [];

    const seenPhones = new Set<string>();

    const addEntry = (item: { id: string; name: string; phone: string; email?: string; age?: number; gender?: string; address?: string; uhid?: string; source: string }) => {
      if (!item.name && !item.phone) return;
      const cleanPhone = (item.phone || '').replace(/\D/g, '').slice(-10);
      const key = cleanPhone || item.id;
      if (key && seenPhones.has(key)) return;
      if (key) seenPhones.add(key);
      list.push({
        ...item,
        phone: item.phone || '',
        name: item.name || 'Patient'
      });
    };

    // 1. Hospital Patients Database
    (patients || []).forEach(p => {
      addEntry({
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email,
        age: p.age,
        gender: p.gender,
        address: p.address || p.city,
        uhid: p.uhid,
        source: 'Hospital Patient'
      });
    });

    // 2. Active Customer Profile (App User)
    if (user && user.phone) {
      addEntry({
        id: 'user-active-profile',
        name: user.name || 'Customer',
        phone: user.phone,
        email: user.email,
        age: 28,
        gender: 'Male',
        address: user.address || user.location || '',
        uhid: 'CUST-' + user.phone.replace(/\D/g, '').slice(-4),
        source: 'Customer App'
      });
    }

    // 3. Registered Customer Accounts
    (customers || []).forEach(c => {
      addEntry({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        age: 30,
        gender: 'Male',
        address: c.location || '',
        uhid: 'CUST-' + (c.phone ? c.phone.replace(/\D/g, '').slice(-4) : 'USER'),
        source: 'Customer Account'
      });
    });

    // 4. Past Appointments
    (appointments || []).forEach(a => {
      if (a.patientName && a.phone) {
        addEntry({
          id: `appt-${a.id}`,
          name: a.patientName,
          phone: a.phone,
          email: a.email,
          age: a.age,
          gender: a.gender,
          address: a.address,
          uhid: 'APT-' + a.phone.replace(/\D/g, '').slice(-4),
          source: 'Booking Record'
        });
      }
    });

    return list;
  }, [patients, user, customers, appointments]);

  const matchedPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return [];
    const rawQ = patientSearchQuery.toLowerCase().trim();
    const digitQ = rawQ.replace(/\D/g, '');

    return allSearchablePatients.filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pEmail = (p.email || '').toLowerCase();
      const pUhid = (p.uhid || '').toLowerCase();
      const pPhone = (p.phone || '').replace(/\D/g, '');

      const matchName = pName.includes(rawQ);
      const matchEmail = pEmail.includes(rawQ);
      const matchUhid = pUhid.includes(rawQ);
      const matchPhone = (digitQ.length >= 2 && pPhone.includes(digitQ)) || (p.phone && p.phone.includes(rawQ));

      return matchName || matchEmail || matchUhid || matchPhone;
    }).slice(0, 8);
  }, [allSearchablePatients, patientSearchQuery]);

  const handleSelectPatient = (p: { name: string; phone: string; age?: number; gender?: string; address?: string; uhid?: string }) => {
    const rawPhone = (p.phone || '').replace(/\D/g, '').slice(-10);
    setForm(prev => ({
      ...prev,
      patientName: p.name,
      patientPhone: rawPhone,
      patientAge: String(p.age || 30),
      patientGender: p.gender || 'Male',
      address: p.address || '',
      selectedPatientUhid: p.uhid || `APS${Math.floor(100000 + Math.random() * 900000)}`
    }));
    setPatientSearchQuery('');
    setShowSearchResults(false);
    setSuccessToast(`Auto-filled details for ${p.name} (${rawPhone})`);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const handleClearSelectedPatient = () => {
    setForm(prev => ({
      ...prev,
      patientName: '',
      patientPhone: '',
      patientAge: '',
      patientGender: 'Male',
      address: '',
      selectedPatientUhid: ''
    }));
  };

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
      isRevisit: false,
      selectedPatientUhid: ''
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 max-w-3xl space-y-5">
      {/* Search Existing Patient Section */}
      {!generated && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
              <Search size={14} className="text-blue-600" />
              <span>Search Existing Patient Database</span>
            </span>
            {onRequestCreateAccount && (
              <button
                type="button"
                onClick={onRequestCreateAccount}
                className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-xl cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <UserPlus size={12} /> + Create Customer Account
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by Patient Name, Phone (+91...), Email, or UHID..."
              value={patientSearchQuery}
              onChange={e => {
                setPatientSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-blue-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold placeholder:font-medium text-slate-800"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />

            {/* Auto-suggest Dropdown */}
            {showSearchResults && matchedPatients.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
                {matchedPatients.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="p-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.2 rounded-full">
                          UHID: {p.uhid}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
                        <span>Phone: {p.phone}</span>
                        {p.email && <span>· {p.email}</span>}
                        <span>· {p.age}y, {p.gender}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all">
                      Select <ArrowRight size={11} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Patient Banner */}
          {form.selectedPatientUhid && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Existing Patient: <strong>{form.patientName}</strong> (UHID: {form.selectedPatientUhid})</span>
              </div>
              <button
                type="button"
                onClick={handleClearSelectedPatient}
                className="text-[10px] font-extrabold text-emerald-700 hover:text-red-600 cursor-pointer underline"
              >
                Clear / New Patient
              </button>
            </div>
          )}

          {successToast && (
            <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 animate-fadeIn">
              <Check size={13} /> {successToast}
            </div>
          )}
        </div>
      )}

      {!generated ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl cursor-pointer border-none shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Generate & Assign Token
            </button>
          </div>
        </form>
      ) : (
        /* Generated Token Receipt Preview */
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-600 shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm">Token Generated Successfully!</h4>
              <p className="text-xs text-emerald-700 mt-0.5">Token is now active in doctor's cabin queue.</p>
            </div>
          </div>

          {/* Printable Ticket */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center space-y-4 max-w-md mx-auto">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Apollo Spectra Hospital</div>
            <div className="text-xs text-slate-600 font-medium">Walk-in OPD Queue Slip</div>

            <div className="py-3 border-y border-dashed border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">YOUR TOKEN NUMBER</span>
              <span className="text-6xl font-black text-blue-600 tracking-tight">#{generated.tokenNo}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">PATIENT</span>
                <span className="font-extrabold text-slate-800">{generated.patientName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">PHONE</span>
                <span className="font-extrabold text-slate-800">{generated.patientPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">DOCTOR</span>
                <span className="font-extrabold text-slate-800">{generated.doctorName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">SESSION</span>
                <span className="font-extrabold text-slate-800 uppercase">{generated.session} OPD</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">QUEUE POSITION</span>
                <span className="font-extrabold text-blue-600">#{generated.queuePosition} in line</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">CONSULTATION FEE</span>
                <span className="font-extrabold text-emerald-600">₹{generated.consultationFee}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
              Generated on {generated.bookingDate} at {generated.time}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer border-none flex items-center gap-2"
            >
              <Printer size={14} /> Print Token Slip
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl cursor-pointer border-none flex items-center gap-2"
            >
              <Plus size={14} /> Generate Another Token
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Token Management Table Component ─────────────────────────────────────
const TokenTable: React.FC<{
  tokens: TokenRecord[];
  title: string;
  subtitle: string;
  onAddClick: () => void;
}> = ({
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

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
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

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar size={13} className="text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 ml-1"
                title="Clear date"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="booked">Booked / Waiting</option>
            <option value="checked-in">In-Cabin</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search token #, patient name, phone, doctor..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Token #</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Doctor & Dept</th>
              <th className="py-3 px-4">Session & Time</th>
              <th className="py-3 px-4">Queue</th>
              <th className="py-3 px-4">Fee</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                  No tokens matching the filters.
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-black text-slate-800 text-sm">#{t.tokenNo}</span>
                  </td>
                  <td className="py-3 px-4">
                    {t.type === 'online' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        <Wifi size={10} /> Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <WifiOff size={10} /> Walk-in
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{t.patientName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.patientPhone} · {t.patientAge}y, {t.patientGender}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{t.doctorName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.departmentName}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-700 capitalize">{t.session} OPD</p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.time} · {t.bookingDate}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-black text-blue-600">#{t.queuePosition}</span>
                    <span className="text-[10px] text-slate-400 block">{t.estimatedWait}m wait</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800">₹{t.consultationFee}</span>
                    <span className={`text-[9px] font-bold block ${t.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {t.paymentStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${statusColors[t.status] || 'bg-slate-100 text-slate-600'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {['booked', 'waiting'].includes(t.status) && (
                        <button
                          onClick={() => updateTokenStatus(t.id, 'checked-in')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none"
                        >
                          Check In
                        </button>
                      )}
                      {t.status === 'checked-in' && (
                        <button
                          onClick={() => updateTokenStatus(t.id, 'completed')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none"
                        >
                          Complete
                        </button>
                      )}
                      {t.status !== 'completed' && t.status !== 'cancelled' && (
                        <button
                          onClick={() => cancelToken(t.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                          title="Cancel token"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
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

// ─── Walk-In Modal Wrapper ────────────────────────────────────────────────
const WalkInModal: React.FC<{ onClose: () => void; onRequestCreateAccount: () => void }> = ({ onClose, onRequestCreateAccount }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer border-none"
      >
        <X size={18} />
      </button>
      <WalkInGenerator onCreated={() => {}} onRequestCreateAccount={onRequestCreateAccount} />
    </div>
  </div>
);

// ─── Main TokenManagement Component ───────────────────────────────────────
export const TokenManagement: React.FC = () => {
  const location = useLocation();
  const { tokens } = useHospital();
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);

  const getTokenSet = () => {
    const path = location.pathname;
    if (path.includes('online')) {
      return {
        title: 'Online Booked Tokens',
        subtitle: 'Tokens scheduled via mobile customer app & web portal',
        toks: tokens.filter(t => t.type === 'online')
      };
    }
    if (path.includes('offline')) {
      return {
        title: 'Hospital Counter Walk-in Tokens',
        subtitle: 'Tokens registered at hospital desk counter',
        toks: tokens.filter(t => t.type === 'offline')
      };
    }
    if (path.includes('today')) {
      const today = new Date().toISOString().split('T')[0];
      return {
        title: "Today's Live Tokens",
        subtitle: `Tokens booked for today (${today})`,
        toks: tokens.filter(t => t.bookingDate === today || !t.bookingDate)
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">Add Walk-in Token</h2>
            <p className="text-xs text-slate-400 mt-1">
              Register an offline / walk-in patient and immediately assign a queue token number
            </p>
          </div>

          <button
            onClick={() => setShowCreateCustomerModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl cursor-pointer border-none shadow-sm shadow-blue-500/20 flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <UserPlus size={15} /> + Create Customer Account
          </button>
        </div>

        <WalkInGenerator onRequestCreateAccount={() => setShowCreateCustomerModal(true)} />

        {showCreateCustomerModal && (
          <CreateCustomerModal
            onClose={() => setShowCreateCustomerModal(false)}
            onSuccess={() => {
              setShowCreateCustomerModal(false);
            }}
          />
        )}
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateCustomerModal(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs shadow-2xs"
          >
            <UserPlus size={14} className="text-blue-600" /> Create Customer Account
          </button>
          <button
            onClick={() => setShowWalkInModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/20 self-start sm:self-auto"
          >
            <Plus size={14} /> Add Walk-in Token
          </button>
        </div>
      </div>

      <TokenTable
        tokens={tokenSet.toks}
        title={tokenSet.title}
        subtitle={tokenSet.subtitle}
        onAddClick={() => setShowWalkInModal(true)}
      />

      {showWalkInModal && (
        <WalkInModal
          onClose={() => setShowWalkInModal(false)}
          onRequestCreateAccount={() => {
            setShowWalkInModal(false);
            setShowCreateCustomerModal(true);
          }}
        />
      )}

      {showCreateCustomerModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateCustomerModal(false)}
          onSuccess={() => {
            setShowCreateCustomerModal(false);
          }}
        />
      )}
    </div>
  );
};
