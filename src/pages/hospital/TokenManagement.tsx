import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import { useApp } from '../../context/AppContext';
import type { TokenRecord, PatientRecord } from '../../context/HospitalContext';
import {
  Plus, Search, XCircle, CheckCircle, Wifi, WifiOff,
  Printer, X, Calendar, AlertCircle, UserPlus, User, Phone, Mail,
  MapPin, Droplets, FileText, Check, ArrowRight, Volume2, Eye, Clock,
  RotateCcw, CheckCircle2, Stethoscope, MessageSquare
} from 'lucide-react';
import { broadcastGlobalSync } from '../../utils/syncBus';

const statusColors: Record<string, string> = {
  booked: 'bg-blue-50 text-blue-700 border border-blue-200',
  'checked-in': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  arrived: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold',
  'in-consultation': 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold',
  waiting: 'bg-purple-50 text-purple-700 border border-purple-200',
  calling: 'bg-amber-100 text-amber-900 border border-amber-400 font-black animate-pulse',
  'late-coming': 'bg-orange-50 text-orange-700 border border-orange-300 font-bold',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
  skipped: 'bg-slate-100 text-slate-600 border border-slate-200',
  'not-visited': 'bg-rose-50 text-rose-700 border border-rose-200',
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
  initialDoctorId?: string;
  initialDepartmentId?: string;
  initialPatient?: { name: string; phone: string; age?: number; gender?: string; address?: string; uhid?: string };
  onCreated?: (token: TokenRecord) => void;
  onRequestCreateAccount?: () => void;
}> = ({ initialDoctorId, initialDepartmentId, initialPatient, onCreated, onRequestCreateAccount }) => {
  const { generateWalkInToken, doctors, departments, scheduleConfig, patients, hospitalProfile } = useHospital();
  const { user, customers, appointments } = useApp();

  const getInitialDoctorAndDept = useCallback(() => {
    let docId = initialDoctorId || '';
    let deptId = initialDepartmentId || '';

    if (docId) {
      const doc = doctors.find(d => d.id === docId);
      if (doc) {
        if (!deptId || deptId !== doc.departmentId) {
          deptId = doc.departmentId;
        }
      } else {
        docId = '';
      }
    } else if (deptId) {
      const dept = departments.find(d => d.id === deptId);
      if (!dept) {
        deptId = '';
      }
    }
    return { docId, deptId };
  }, [initialDoctorId, initialDepartmentId, doctors, departments]);

  const { docId: resolvedDocId, deptId: resolvedDeptId } = getInitialDoctorAndDept();

  const [form, setForm] = useState({
    patientName: initialPatient?.name || '',
    patientPhone: initialPatient?.phone ? initialPatient.phone.replace(/\D/g, '').slice(-10) : '',
    patientAge: initialPatient?.age ? String(initialPatient.age) : '',
    patientGender: initialPatient?.gender || 'Male',
    address: initialPatient?.address || '',
    departmentId: resolvedDeptId,
    doctorId: resolvedDocId,
    session: 'morning' as 'morning' | 'afternoon' | 'evening',
    isRevisit: Boolean(initialPatient),
    selectedPatientUhid: initialPatient?.uhid || ''
  });

  const [patientAgeUnit, setPatientAgeUnit] = useState<'Years' | 'Months' | 'Days'>('Years');
  const [isExisting, setIsExisting] = useState(Boolean(initialPatient));
  const [showRmpFields, setShowRmpFields] = useState(false);
  const [rmpName, setRmpName] = useState('');
  const [rmpPhone, setRmpPhone] = useState('');

  useEffect(() => {
    if (initialPatient) {
      setForm(prev => ({
        ...prev,
        patientName: initialPatient.name || prev.patientName,
        patientPhone: initialPatient.phone ? initialPatient.phone.replace(/\D/g, '').slice(-10) : prev.patientPhone,
        patientAge: initialPatient.age ? String(initialPatient.age) : prev.patientAge,
        patientGender: initialPatient.gender || prev.patientGender,
        address: initialPatient.address || prev.address,
        selectedPatientUhid: initialPatient.uhid || prev.selectedPatientUhid,
        isRevisit: true
      }));
      setIsExisting(true);
    }
  }, [initialPatient]);

  useEffect(() => {
    if (initialDoctorId || initialDepartmentId) {
      const { docId, deptId } = getInitialDoctorAndDept();
      if (docId || deptId) {
        setForm(prev => ({
          ...prev,
          departmentId: deptId || prev.departmentId,
          doctorId: docId || prev.doctorId
        }));
      }
    }
  }, [initialDoctorId, initialDepartmentId, getInitialDoctorAndDept]);

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
    setIsExisting(true);
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
    setIsExisting(false);
  };

  const activeDepts = departments.filter(d => (d.active !== false) || d.id === form.departmentId);
  const availDoctors = form.departmentId
    ? doctors.filter(d => d.departmentId === form.departmentId)
    : doctors;

  const selectedDoctor = doctors.find(d => d.id === form.doctorId);
  const isSelectedDoctorWalkInUnavailable = selectedDoctor ? (selectedDoctor.active === false || selectedDoctor.offlineConsult === false) : false;

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
    const selDoc = doctors.find(d => d.id === form.doctorId);
    if (selDoc && (selDoc.active === false || selDoc.offlineConsult === false)) {
      setError(`Dr. ${selDoc.name} is currently marked as unavailable for walk-in counter bookings.`);
      return;
    }
    const ageNum = parseInt(form.patientAge, 10) || 0;
    const computedAgeDisplay = form.patientAge ? `${form.patientAge} ${patientAgeUnit}` : '25 Years';
    const token = generateWalkInToken({
      patientName: form.patientName.trim(),
      patientPhone: form.patientPhone.trim(),
      patientAge: ageNum,
      patientAgeUnit,
      patientAgeDisplay: computedAgeDisplay,
      patientGender: form.patientGender,
      address: form.address.trim(),
      departmentId: form.departmentId,
      doctorId: form.doctorId,
      session: form.session,
      isRevisit: Boolean(isExisting || form.isRevisit),
      isExisting: Boolean(isExisting || form.isRevisit),
      rmpReference: showRmpFields && rmpName.trim() ? { name: rmpName.trim(), phone: rmpPhone.trim() } : null
    });
    setGenerated(token);
    setError('');
    if (onCreated) onCreated(token);
  };

  const handleReset = () => {
    setGenerated(null);
    const { docId, deptId } = getInitialDoctorAndDept();
    setForm({
      patientName: '',
      patientPhone: '',
      patientAge: '',
      patientGender: 'Male',
      address: '',
      departmentId: deptId,
      doctorId: docId,
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Age *</label>
                  <span className="text-[10px] font-extrabold text-blue-600">Unit: {patientAgeUnit}</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    required
                    min={1}
                    max={patientAgeUnit === 'Days' ? 365 : 120}
                    value={form.patientAge}
                    onChange={e => setForm(p => ({ ...p, patientAge: e.target.value }))}
                    placeholder={patientAgeUnit === 'Days' ? "e.g. 15" : patientAgeUnit === 'Months' ? "e.g. 6" : "e.g. 35"}
                    className="w-full pl-3.5 pr-20 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <select
                      value={patientAgeUnit}
                      onChange={e => setPatientAgeUnit(e.target.value as 'Years' | 'Months' | 'Days')}
                      className="text-[10px] font-extrabold text-blue-700 bg-white border border-slate-200 rounded-lg py-1 px-1.5 focus:outline-none cursor-pointer shadow-2xs"
                    >
                      <option value="Years">Years</option>
                      <option value="Months">Months</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                </div>
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
                onChange={e => {
                  const deptId = e.target.value;
                  const currentDoc = doctors.find(d => d.id === form.doctorId);
                  const keepDoc = currentDoc && currentDoc.departmentId === deptId;
                  setForm(p => ({ ...p, departmentId: deptId, doctorId: keepDoc ? form.doctorId : '' }));
                }}
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
                onChange={e => {
                  const docId = e.target.value;
                  const doc = doctors.find(d => d.id === docId);
                  setForm(p => ({
                    ...p,
                    doctorId: docId,
                    departmentId: doc?.departmentId || p.departmentId
                  }));
                }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white font-medium"
              >
                <option value="">Select Doctor</option>
                {availDoctors.map(d => {
                  const isDocAvail = d.active !== false && d.offlineConsult !== false;
                  return (
                    <option key={d.id} value={d.id} disabled={!isDocAvail}>
                      {d.name} · ₹{d.consultationFee} {!isDocAvail ? '(Unavailable - Walk-in Closed)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">OPD Session Time *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeSessions.map(s => {
                  const isSel = form.session === (s.name.toLowerCase() as any);
                  return (
                    <div
                      key={s.id}
                      onClick={() => setForm(p => ({ ...p, session: s.name.toLowerCase() as any }))}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSel ? 'border-blue-500 bg-blue-50/60 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <span className="text-xs">{s.name.toLowerCase().includes('morn') ? '🌅' : s.name.toLowerCase().includes('even') ? '🌙' : '☀️'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{s.startTime} – {s.endTime}</div>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isSel ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                        {isSel && <div className="w-1 h-1 bg-white rounded-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Existing Patient & RMP Reference Checkboxes */}
            <div className="sm:col-span-2 space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isExisting}
                    onChange={e => setIsExisting(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Existing Patient? <span className="text-[10px] font-medium text-slate-400">(Visited this hospital before)</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showRmpFields}
                    onChange={e => setShowRmpFields(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    + Add RMP Reference
                  </span>
                </label>
              </div>

              {showRmpFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">RMP Doctor Name *</label>
                    <input
                      type="text"
                      required={showRmpFields}
                      value={rmpName}
                      onChange={e => setRmpName(e.target.value)}
                      placeholder="Dr. RMP Name"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">RMP Mobile Number</label>
                    <input
                      type="tel"
                      value={rmpPhone}
                      onChange={e => setRmpPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedDoctor && (
            <div className={`rounded-2xl p-4 flex items-center justify-between border transition-all ${
              isSelectedDoctorWalkInUnavailable 
                ? 'bg-rose-50/80 border-rose-200' 
                : 'bg-slate-50 border-slate-100'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-800">{selectedDoctor.name}</p>
                  {isSelectedDoctorWalkInUnavailable && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                      ⛔ Walk-in Closed / Doctor Unavailable
                    </span>
                  )}
                </div>
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
              disabled={isSelectedDoctorWalkInUnavailable}
              className={`w-full py-3.5 font-extrabold text-xs rounded-2xl border-none shadow-md transition-all flex items-center justify-center gap-2 ${
                isSelectedDoctorWalkInUnavailable
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-500/20'
              }`}
            >
              <Plus size={16} /> {isSelectedDoctorWalkInUnavailable ? 'Doctor Unavailable for Walk-in' : 'Generate & Assign Token'}
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
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{hospitalProfile?.name || 'Hospital'}</div>
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

// ─── Web Audio Dual-Chime Sound Generator ──────────────────────────────────
const playCallingChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Chime Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // Chime Note 2: A5 (880 Hz) - pleasant chime interval
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.26);
    gain2.gain.setValueAtTime(0.28, now + 0.26);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.26);
    osc2.stop(now + 0.85);
  } catch (err) {
    console.warn('Could not play calling chime:', err);
  }
};

// ─── Call Confirmation Modal Component ─────────────────────────────────────
const CallConfirmationModal: React.FC<{
  token: TokenRecord;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ token, onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center animate-bounce">
              <Volume2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Call Patient Token</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Sound chime & broadcast to digital screens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 font-bold border-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-orange-50/20 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block">Calling Token Number</span>
          <div className="text-5xl font-black text-amber-900 tracking-tight">#{token.tokenNo}</div>
          <div className="pt-2 border-t border-amber-200/60">
            <p className="font-extrabold text-base text-slate-800">{token.patientName}</p>
            <p className="text-xs text-slate-500 font-semibold">{token.patientPhone} · {token.doctorName}</p>
            <p className="text-[11px] text-amber-700 font-bold mt-1 uppercase tracking-wide">
              {token.session} OPD · {token.departmentName}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center font-medium leading-relaxed">
          Confirming will play an audio chime, notify display boards, and update token status to <strong className="text-amber-800 font-bold">Calling</strong>.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer border-none transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs cursor-pointer border-none shadow-md shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all"
          >
            <Volume2 size={16} /> Confirm & Call
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Patient File Modal Component ──────────────────────────────────────────
const PatientFileModal: React.FC<{
  token: TokenRecord;
  allTokens: TokenRecord[];
  onClose: () => void;
}> = ({ token, allTokens, onClose }) => {
  const patientPastTokens = allTokens.filter(t =>
    t.id !== token.id &&
    ((t.patientPhone && t.patientPhone === token.patientPhone) ||
     (t.patientName && t.patientName.toLowerCase() === token.patientName.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-base">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800">{token.patientName}</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                  Token #{token.tokenNo}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${statusColors[token.status] || 'bg-slate-100 text-slate-700'}`}>
                  {token.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Hospital OPD Patient File & Consultation Dossier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer border-none font-bold"
          >
            ✕
          </button>
        </div>

        {/* Patient Profile Card */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Age & Gender</span>
            <span className="font-extrabold text-slate-800">{token.patientAge} Years · {token.patientGender}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Phone</span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Phone size={11} className="text-blue-500" /> {token.patientPhone}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Patient Status</span>
            <span className={`font-extrabold text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 ${token.isExisting ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {token.isExisting ? 'Existing Patient' : 'New Patient'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Registration Type</span>
            <span className="font-extrabold text-slate-800 capitalize flex items-center gap-1">
              {token.type === 'online' ? <Wifi size={11} className="text-blue-500" /> : <WifiOff size={11} className="text-slate-500" />}
              {token.type} OPD
            </span>
          </div>
        </div>

        {/* RMP Reference & Quick Patient Contact */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">RMP Reference / Source</span>
            {token.rmpReference && token.rmpReference.name ? (
              <p className="font-extrabold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <span className="text-blue-700">Dr./RMP: {token.rmpReference.name}</span>
                {token.rmpReference.phone && <span className="text-slate-500 font-medium">({token.rmpReference.phone})</span>}
              </p>
            ) : (
              <p className="text-slate-500 font-medium italic mt-0.5">Direct Registration (No RMP Reference)</p>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {token.patientPhone && (
              <>
                <a
                  href={`tel:${token.patientPhone}`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition-colors no-underline cursor-pointer"
                >
                  <Phone size={12} /> Call Phone
                </a>
                <a
                  href={`https://wa.me/${token.patientPhone.replace(/\D/g, '').length === 10 ? '91' + token.patientPhone.replace(/\D/g, '') : token.patientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${token.patientName}, your token #${token.tokenNo} for Dr. ${token.doctorName} is being called at the hospital. Please proceed to the consultation room.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition-colors no-underline cursor-pointer"
                >
                  <MessageSquare size={12} /> WhatsApp
                </a>
              </>
            )}
          </div>
        </div>

        {/* Current Consultation Details */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Stethoscope size={14} className="text-blue-600" /> Current OPD Consultation Details
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
              <span className="text-[10px] text-slate-400 font-bold block">Consulting Doctor</span>
              <span className="font-black text-slate-800">{token.doctorName}</span>
              <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">{token.departmentName}</span>
            </div>
            <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
              <span className="text-[10px] text-slate-400 font-bold block">OPD Session & Slot</span>
              <span className="font-black text-slate-800 capitalize">{token.session} OPD</span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">{token.time} ({token.bookingDate})</span>
            </div>
            <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
              <span className="text-[10px] text-slate-400 font-bold block">Consultation Fee</span>
              <span className="font-black text-emerald-700 text-base">₹{token.consultationFee}</span>
              <span className={`text-[9px] font-extrabold block mt-0.5 ${token.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {token.paymentStatus.toUpperCase()} via {token.paymentMethod || 'Hospital Desk'}
              </span>
            </div>
          </div>
        </div>

        {/* Doctor Reference & Complaint Notes */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <FileText size={14} className="text-slate-600" /> Chief Complaints & Doctor Reference Notes
          </h4>
          <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 font-medium leading-relaxed">
            {token.notes ? (
              <p>{token.notes}</p>
            ) : (
              <p className="text-slate-400 italic">No specific complaint notes recorded. Standard consultation queue token.</p>
            )}
          </div>
        </div>

        {/* Past Tokens / OPD Visit History */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Clock size={14} className="text-purple-600" /> Past OPD Consultation History ({patientPastTokens.length})
          </h4>
          {patientPastTokens.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">First recorded visit at this hospital.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
              {patientPastTokens.map(pt => (
                <div key={pt.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">Token #{pt.tokenNo} · {pt.doctorName}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">{pt.departmentName} · {pt.bookingDate}</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${statusColors[pt.status] || 'bg-slate-100 text-slate-600'}`}>
                    {pt.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue Status Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Hospital Financial Ledger Policy:</span>
            <span className="text-[11px] text-amber-800">
              Revenue from this consultation is strictly posted to the hospital earnings report only when marked as <strong className="font-black text-emerald-800">Completed</strong>. Calling, skipped, or late-coming tokens remain pending and will not count towards realized revenue.
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer border-none"
          >
            Close File
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Token Management Table Component ─────────────────────────────────────
const TokenTable: React.FC<{
  tokens: TokenRecord[];
  title: string;
  subtitle: string;
  onAddClick: () => void;
  defaultDateFilter?: string;
  isRevisitView?: boolean;
  onIssueFollowUp?: (pat: any) => void;
}> = ({
  tokens: toks,
  title,
  subtitle,
  onAddClick,
  defaultDateFilter,
  isRevisitView,
  onIssueFollowUp
}) => {
  const { updateTokenStatus, cancelToken, departments, doctors, hospitalProfile, patients } = useHospital();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(() => defaultDateFilter !== undefined ? defaultDateFilter : new Date().toISOString().split('T')[0]);

  // Modal states
  const [callConfirmToken, setCallConfirmToken] = useState<TokenRecord | null>(null);
  const [selectedPatientToken, setSelectedPatientToken] = useState<TokenRecord | null>(null);

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
  const callingCount = filtered.filter(t => t.status === 'calling').length;
  const inCabinCount = filtered.filter(t => ['checked-in', 'arrived', 'in-consultation'].includes(t.status)).length;
  const lateComingCount = filtered.filter(t => t.status === 'late-coming').length;

  // STRICT REVENUE INTEGRITY: Revenue is strictly earned ONLY upon completion!
  const totalEarnedRevenue = filtered
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => acc + (t.consultationFee || 0), 0);

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
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100/80">
          <div className="bg-slate-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-slate-400">Total Tokens</p>
            <p className="text-sm font-black text-slate-800">{totalCount}</p>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-amber-600">Calling Now</p>
            <p className="text-sm font-black text-amber-700">{callingCount}</p>
          </div>
          <div className="bg-indigo-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-indigo-600">In-Cabin</p>
            <p className="text-sm font-black text-indigo-700">{inCabinCount}</p>
          </div>
          <div className="bg-orange-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-orange-600">Late / On Hold</p>
            <p className="text-sm font-black text-orange-700">{lateComingCount}</p>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-xl text-center">
            <p className="text-[10px] font-bold text-emerald-600">Completed Visits</p>
            <p className="text-sm font-black text-emerald-700">{completedCount}</p>
          </div>
          <div className="bg-purple-50 p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-purple-600">Realized Revenue</p>
            <p className="text-sm font-black text-purple-700">₹{totalEarnedRevenue.toLocaleString('en-IN')}</p>
            <span className="text-[8px] text-purple-500 font-bold block">Completed Only</span>
          </div>
        </div>

        {/* Late-Coming / On-Hold Banner Notice */}
        {lateComingCount > 0 && (
          <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-orange-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <div>
                <span className="font-extrabold">{lateComingCount} Patient(s) Marked as Late-Coming / On Hold</span>
                <p className="text-[11px] text-orange-700 font-medium">
                  These tokens were skipped to keep queue moving. Once the patient arrives, click <strong className="font-bold">Call Now</strong> to admit them.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('late-coming')}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] rounded-xl border-none cursor-pointer shrink-0"
            >
              View On-Hold Queue
            </button>
          </div>
        )}

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
            <option value="calling">Calling Now</option>
            <option value="checked-in">In-Cabin / Arrived</option>
            <option value="late-coming">Late-Coming (On-Hold)</option>
            <option value="completed">Completed (Visited)</option>
            <option value="not-visited">Not Visited / No-Show</option>
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
              <th className="py-3 px-4">Patient File</th>
              <th className="py-3 px-4">Doctor & Dept</th>
              <th className="py-3 px-4">Session & Time</th>
              <th className="py-3 px-4">Queue</th>
              <th className="py-3 px-4">Fee</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Queue Actions</th>
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
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                        <Wifi size={11} /> Online (App/Web)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                        <WifiOff size={11} /> Offline (Reception)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedPatientToken(t)}
                            className="font-black text-slate-800 hover:text-blue-600 cursor-pointer border-none bg-transparent text-left p-0 transition-colors flex items-center gap-1"
                            title="Click to view complete patient details & medical history"
                          >
                            <span>{t.patientName}</span>
                            <Eye size={12} className="text-blue-500 opacity-60" />
                          </button>
                          {t.isExisting ? (
                            <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-300 inline-flex items-center gap-0.5">
                              ★ Existing Patient
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              New Patient
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {t.patientPhone} · {t.patientAgeDisplay || (t.patientAge ? `${t.patientAge}y` : '')}, {t.patientGender}
                        </p>
                        {t.rmpReference && t.rmpReference.name && (
                          <div className="mt-1">
                            <span className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 inline-flex items-center gap-1">
                              <span>RMP Ref:</span>
                              <strong>Dr. {t.rmpReference.name}</strong>
                              {t.rmpReference.phone && <span className="text-[8.5px] text-indigo-500 font-medium">({t.rmpReference.phone})</span>}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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
                      {t.status === 'calling' ? '🔊 CALLING' : t.status === 'late-coming' ? '⏳ LATE-COMING' : t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {/* Direct Phone Call Button */}
                      {t.patientPhone && (
                        <a
                          href={`tel:${t.patientPhone}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition-colors inline-flex items-center justify-center"
                          title={`Call ${t.patientName} (${t.patientPhone})`}
                        >
                          <Phone size={12} />
                        </a>
                      )}

                      {/* Direct WhatsApp Alert Button */}
                      {t.patientPhone && (
                        <a
                          href={`https://wa.me/${t.patientPhone.replace(/\D/g, '').length === 10 ? '91' + t.patientPhone.replace(/\D/g, '') : t.patientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${t.patientName}, your token #${t.tokenNo} for Dr. ${t.doctorName} at ${hospitalProfile?.name || 'the hospital'} is now being called. Please proceed to the consultation room.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer transition-colors inline-flex items-center justify-center"
                          title={`Send WhatsApp message to ${t.patientName}`}
                        >
                          <MessageSquare size={12} />
                        </a>
                      )}

                      {/* Stage 1: Booked / Waiting -> Call Token or Mark Late */}
                      {['booked', 'waiting'].includes(t.status) && (
                        <>
                          <button
                            type="button"
                            onClick={() => setCallConfirmToken(t)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black cursor-pointer border-none shadow-xs flex items-center gap-1"
                            title="Call Token & Sound Chime"
                          >
                            <Volume2 size={11} /> Call
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTokenStatus(t.id, 'late-coming')}
                            className="px-2 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            title="Patient is late: hold this token so subsequent token can proceed"
                          >
                            Late-Coming
                          </button>
                        </>
                      )}

                      {/* Stage 2: Calling -> Mark Arrived or Skip/Late */}
                      {t.status === 'calling' && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateTokenStatus(t.id, 'in-consultation')}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black cursor-pointer border-none shadow-xs flex items-center gap-1"
                            title="Patient has entered cabin / arrived"
                          >
                            <CheckCircle2 size={11} /> Arrived
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playCallingChime();
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-300 rounded-lg cursor-pointer"
                            title="Re-play calling sound chime"
                          >
                            <Volume2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTokenStatus(t.id, 'late-coming')}
                            className="px-2 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Did not respond: move to late-coming on-hold queue"
                          >
                            Skip / Late
                          </button>
                        </>
                      )}

                      {/* Stage 3: Arrived / In Consultation -> Complete Consultation (triggers revenue) or No-Show */}
                      {['checked-in', 'arrived', 'in-consultation'].includes(t.status) && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateTokenStatus(t.id, 'completed')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer border-none shadow-xs flex items-center gap-1"
                            title="Complete Consultation - Updates Revenue Ledger"
                          >
                            <CheckCircle size={11} /> Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTokenStatus(t.id, 'not-visited')}
                            className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Patient left without consultation: not counted in revenue"
                          >
                            No-Show
                          </button>
                        </>
                      )}

                      {/* Stage 4: Late-Coming -> Re-call now or Mark Not Visited */}
                      {t.status === 'late-coming' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setCallConfirmToken(t)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black cursor-pointer border-none shadow-xs flex items-center gap-1"
                            title="Patient has now reported to desk: call them into cabin"
                          >
                            <Volume2 size={11} /> Call Now
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTokenStatus(t.id, 'not-visited')}
                            className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Did not visit today: exclude from revenue"
                          >
                            Not Visited
                          </button>
                        </>
                      )}

                      {/* Stage 5: Completed -> Revenue Realized Badge */}
                      {t.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                          <CheckCircle size={11} /> Visited (Earned)
                        </span>
                      )}

                      {/* Stage 6: Not-Visited or Skipped -> Allow Reopen if patient shows up late */}
                      {['not-visited', 'skipped'].includes(t.status) && (
                        <button
                          type="button"
                          onClick={() => setCallConfirmToken(t)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer border-none flex items-center gap-1"
                          title="Patient arrived very late: reopen token"
                        >
                          <RotateCcw size={10} /> Re-Open
                        </button>
                      )}

                      {/* Cancel token for active records */}
                      {t.status !== 'completed' && t.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => cancelToken(t.id)}
                          className="p-1 text-slate-300 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                          title="Cancel token"
                        >
                          <XCircle size={13} />
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

      {/* Calling Confirmation Sound Modal */}
      {callConfirmToken && (
        <CallConfirmationModal
          token={callConfirmToken}
          onConfirm={() => {
            playCallingChime();
            updateTokenStatus(callConfirmToken.id, 'calling');
            broadcastGlobalSync('HOSPITAL_TOKEN_CALLED', {
              tokenNo: callConfirmToken.tokenNo,
              patientName: callConfirmToken.patientName,
              doctorName: callConfirmToken.doctorName,
              hospitalName: hospitalProfile?.name,
              hospitalId: callConfirmToken.hospitalId
            });
            setCallConfirmToken(null);
          }}
          onClose={() => setCallConfirmToken(null)}
        />
      )}

      {/* ── Repeat Visiting Patients Directory (Revisit View) ────────────────── */}
      {isRevisitView && (
        <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span>🏥 Repeat Visiting Patients Directory</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                  {((patients || []).filter(p => (p.totalVisits || 1) >= 1).length || toks.length)} Returning Records
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Directory of patients who previously visited this hospital. Issue quick follow-up tokens or contact for reminders.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {((patients && patients.length > 0) ? patients : toks.map((t, idx) => ({
              id: t.id,
              uhid: `APS${String(1001 + idx).padStart(6, '0')}`,
              name: t.patientName,
              phone: t.patientPhone,
              age: t.patientAge,
              gender: t.patientGender,
              address: '',
              totalVisits: 2,
              lastVisit: t.bookingDate,
              doctorVisits: [{ doctorName: t.doctorName }]
            }))).slice(0, 12).map((pat: any) => (
              <div key={pat.id || pat.uhid} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                      <span>{pat.name}</span>
                      <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded">
                        {pat.uhid || 'UHID'}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      📞 {pat.phone} · {pat.age ? `${pat.age}y` : ''} {pat.gender}
                    </p>
                    {pat.lastVisit && (
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Last Visit: {pat.lastVisit} {pat.doctorVisits?.[0]?.doctorName ? `· Dr. ${pat.doctorVisits[0].doctorName}` : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full shrink-0">
                    {pat.totalVisits || 1} {pat.totalVisits === 1 ? 'Visit' : 'Visits'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                  {pat.phone && (
                    <a
                      href={`tel:${pat.phone}`}
                      className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs cursor-pointer inline-flex items-center justify-center transition-colors"
                      title="Call Patient"
                    >
                      <Phone size={13} />
                    </a>
                  )}
                  {pat.phone && (
                    <a
                      href={`https://wa.me/${pat.phone.replace(/\D/g, '').length === 10 ? '91' + pat.phone.replace(/\D/g, '') : pat.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${pat.name}, this is from ${hospitalProfile?.name || 'the hospital'}. You are due for your follow-up consultation. Please let us know if you would like to book a token.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs cursor-pointer inline-flex items-center justify-center transition-colors"
                      title="WhatsApp Follow-up Message"
                    >
                      <MessageSquare size={13} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (onIssueFollowUp) {
                        onIssueFollowUp(pat);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black cursor-pointer border-none shadow-2xs inline-flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus size={12} /> Issue Follow-up Token
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient Dossier / File Modal */}
      {selectedPatientToken && (
        <PatientFileModal
          token={selectedPatientToken}
          allTokens={toks}
          onClose={() => setSelectedPatientToken(null)}
        />
      )}
    </div>
  );
};

// ─── Walk-In Modal Wrapper ────────────────────────────────────────────────
const WalkInModal: React.FC<{ initialPatient?: any; onClose: () => void; onRequestCreateAccount: () => void }> = ({ initialPatient, onClose, onRequestCreateAccount }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer border-none"
        >
          <X size={18} />
        </button>
        <WalkInGenerator
          initialPatient={initialPatient}
          onRequestCreateAccount={onRequestCreateAccount}
        />
      </div>
    </div>
  );
};

// ─── Main TokenManagement Component ───────────────────────────────────────
export const TokenManagement: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { tokens } = useHospital();
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [followUpPatient, setFollowUpPatient] = useState<any>(null);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);

  const initialDoctorId = searchParams.get('doctorId') || (location.state as any)?.doctorId || '';
  const initialDepartmentId = searchParams.get('departmentId') || (location.state as any)?.departmentId || '';

  const getTokenSet = () => {
    const path = location.pathname;
    if (path.includes('online')) {
      return {
        title: 'Online Booked Tokens',
        subtitle: 'Tokens scheduled via mobile customer app & web portal',
        toks: tokens.filter(t => t.type === 'online'),
        defaultDateFilter: undefined,
        isRevisitView: false
      };
    }
    if (path.includes('offline')) {
      return {
        title: 'Hospital Counter Walk-in Tokens',
        subtitle: 'Tokens registered at hospital desk counter',
        toks: tokens.filter(t => t.type === 'offline'),
        defaultDateFilter: undefined,
        isRevisitView: false
      };
    }
    if (path.includes('today')) {
      const today = new Date().toISOString().split('T')[0];
      return {
        title: "Today's Live Tokens",
        subtitle: `Tokens booked for today (${today})`,
        toks: tokens.filter(t => t.bookingDate === today || !t.bookingDate),
        defaultDateFilter: today,
        isRevisitView: false
      };
    }
    if (path.includes('completed')) {
      return {
        title: 'Completed Tokens',
        subtitle: 'Consultations finished and discharged by hospital doctors',
        toks: tokens.filter(t => t.status === 'completed'),
        defaultDateFilter: undefined,
        isRevisitView: false
      };
    }
    if (path.includes('cancelled')) {
      return {
        title: 'Cancelled Tokens',
        subtitle: 'Appointments cancelled or refunded',
        toks: tokens.filter(t => t.status === 'cancelled'),
        defaultDateFilter: undefined,
        isRevisitView: false
      };
    }
    if (path.includes('revisit')) {
      return {
        title: 'Repeat Visiting Patients & Revisit Tokens',
        subtitle: 'Directory of returning patients, follow-up consultations, and valid revisit records',
        toks: tokens.filter(t => Boolean(t.isRevisit || t.isExisting)),
        defaultDateFilter: '',
        isRevisitView: true
      };
    }
    if (path.includes('add')) {
      return null;
    }
    return {
      title: 'All Tokens',
      subtitle: 'Unified repository of all online and walk-in patient tokens',
      toks: tokens,
      defaultDateFilter: undefined,
      isRevisitView: false
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

        <WalkInGenerator
          key={`${initialDoctorId}-${initialDepartmentId}`}
          initialDoctorId={initialDoctorId}
          initialDepartmentId={initialDepartmentId}
          onRequestCreateAccount={() => setShowCreateCustomerModal(true)}
        />

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
            onClick={() => {
              setFollowUpPatient(null);
              setShowWalkInModal(true);
            }}
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
        defaultDateFilter={tokenSet.defaultDateFilter}
        isRevisitView={tokenSet.isRevisitView}
        onIssueFollowUp={(pat) => {
          setFollowUpPatient(pat);
          setShowWalkInModal(true);
        }}
        onAddClick={() => {
          setFollowUpPatient(null);
          setShowWalkInModal(true);
        }}
      />

      {showWalkInModal && (
        <WalkInModal
          initialPatient={followUpPatient}
          onClose={() => {
            setShowWalkInModal(false);
            setFollowUpPatient(null);
          }}
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
