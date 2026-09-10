import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { PatientRecord } from '../../context/HospitalContext';
import {
  Search, Plus, Calendar, User, Phone, MapPin, ShieldAlert, FileText,
  Stethoscope, Users, CheckCircle2, Clock, Ticket,
  RefreshCw, Filter
} from 'lucide-react';

export const PatientManagement: React.FC = () => {
  const { patients, addPatient, tokens, doctors, generateWalkInToken, fetchPatients, hospitalProfile } = useHospital();

  const [search, setSearch] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickTokenModal, setShowQuickTokenModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New Patient Form
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male',
    bloodGroup: 'B+',
    address: '',
    city: hospitalProfile?.city || 'Bengaluru',
    pinCode: hospitalProfile?.pinCode || '',
    familyMembers: [] as { name: string; relation: string; age: number }[],
    medicalHistory: '',
    allergies: '',
    // Optional immediate token issuance
    issueTokenNow: false,
    doctorId: doctors[0]?.id || '',
    session: 'morning' as 'morning' | 'afternoon' | 'evening'
  });

  // Quick Token Form for Selected Patient
  const [quickTokenDoctorId, setQuickTokenDoctorId] = useState(doctors[0]?.id || '');
  const [quickTokenSession, setQuickTokenSession] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  const todayStr = new Date().toISOString().split('T')[0];

  // Refresh patients from backend on demand
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPatients(selectedDoctorFilter, search, selectedStatusFilter);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchPatients(selectedDoctorFilter, search, selectedStatusFilter);
  }, [selectedDoctorFilter, selectedStatusFilter]);

  // Filter patients based on search, doctor, and status
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPhone = p.phone.includes(q);
        const matchesUhid = p.uhid.toLowerCase().includes(q);
        const matchesToken = (p.tokenHistory || []).some((t: any) =>
          (typeof t === 'object' && (t.tokenNo?.toString() === q || t.doctorName?.toLowerCase().includes(q))) ||
          (typeof t === 'string' && t.includes(q))
        );
        if (!matchesName && !matchesPhone && !matchesUhid && !matchesToken) return false;
      }

      // 2. Doctor Filter (Phase 20 requirement: Hospital -> Doctor -> Token -> Customer)
      if (selectedDoctorFilter !== 'all') {
        const hasDoctor = (p.doctorVisits || []).some(dv => dv.doctorId === selectedDoctorFilter) ||
          tokens.some(t => t.patientPhone === p.phone && t.doctorId === selectedDoctorFilter);
        if (!hasDoctor) return false;
      }

      // 3. Status Filter
      if (selectedStatusFilter !== 'all') {
        const patientTokens = tokens.filter(t => t.patientPhone === p.phone);
        if (selectedStatusFilter === 'today') {
          const hasToday = patientTokens.some(t => t.bookingDate === todayStr);
          if (!hasToday) return false;
        } else if (selectedStatusFilter === 'completed') {
          const hasCompleted = patientTokens.some(t => t.status === 'completed');
          if (!hasCompleted) return false;
        } else if (selectedStatusFilter === 'waiting') {
          const hasWaiting = patientTokens.some(t => ['booked', 'waiting', 'checked-in', 'in-cabin'].includes(t.status));
          if (!hasWaiting) return false;
        }
      }

      return true;
    });
  }, [patients, search, selectedDoctorFilter, selectedStatusFilter, tokens, todayStr]);

  // Keep selected patient synchronized with updated records
  useEffect(() => {
    if (selectedPatient) {
      const updated = patients.find(p => p.phone === selectedPatient.phone || p.id === selectedPatient.id);
      if (updated) setSelectedPatient(updated);
    } else if (filteredPatients.length > 0 && !selectedPatient) {
      setSelectedPatient(filteredPatients[0]);
    }
  }, [patients, filteredPatients]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = {
      name: newPatient.name,
      phone: newPatient.phone,
      email: newPatient.email,
      age: parseInt(newPatient.age) || 30,
      gender: newPatient.gender,
      bloodGroup: newPatient.bloodGroup,
      address: newPatient.address,
      city: newPatient.city || 'Bengaluru',
      pinCode: newPatient.pinCode,
      familyMembers: newPatient.familyMembers,
      medicalHistory: newPatient.medicalHistory ? newPatient.medicalHistory.split(',').map(m => m.trim()) : [],
      allergies: newPatient.allergies ? newPatient.allergies.split(',').map(a => a.trim()) : []
    };

    addPatient(formatted);

    // If user checked "Issue Token Immediately", issue walk-in token
    if (newPatient.issueTokenNow && newPatient.doctorId) {
      const doc = doctors.find(d => d.id === newPatient.doctorId);
      generateWalkInToken({
        patientName: newPatient.name,
        patientPhone: newPatient.phone,
        patientAge: parseInt(newPatient.age) || 30,
        patientGender: newPatient.gender,
        address: newPatient.address,
        departmentId: doc?.departmentId || 'dept-general',
        doctorId: newPatient.doctorId,
        session: newPatient.session
      });
    }

    setShowAddModal(false);
    setNewPatient({
      name: '', phone: '', email: '', age: '', gender: 'Male', bloodGroup: 'B+',
      address: '', city: hospitalProfile?.city || 'Bengaluru', pinCode: hospitalProfile?.pinCode || '',
      familyMembers: [], medicalHistory: '', allergies: '',
      issueTokenNow: false, doctorId: doctors[0]?.id || '', session: 'morning'
    });
  };

  const handleQuickIssueToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const doc = doctors.find(d => d.id === quickTokenDoctorId);

    generateWalkInToken({
      patientName: selectedPatient.name,
      patientPhone: selectedPatient.phone,
      patientAge: selectedPatient.age,
      patientGender: selectedPatient.gender,
      address: selectedPatient.address,
      departmentId: doc?.departmentId || 'dept-general',
      doctorId: quickTokenDoctorId,
      session: quickTokenSession
    });

    setShowQuickTokenModal(false);
  };

  // Compute metrics
  const totalHospitalPatients = patients.length;
  const completedVisitsCount = tokens.filter(t => t.status === 'completed').length;
  const activeTodayCount = tokens.filter(t => ['booked', 'waiting', 'checked-in', 'in-cabin'].includes(t.status) && t.bookingDate === todayStr).length;

  return (
    <div className="p-6 space-y-6">
      {/* ─── Top Stats Bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hospital Patients</p>
            <h3 className="text-xl font-black text-slate-800">{totalHospitalPatients}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Consultations</p>
            <h3 className="text-xl font-black text-slate-800">{completedVisitsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Visits Today</p>
            <h3 className="text-xl font-black text-slate-800">{activeTodayCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
            <Stethoscope size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Doctors</p>
            <h3 className="text-xl font-black text-slate-800">{doctors.filter(d => d.active).length}</h3>
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">Hospital Patient Records</h2>
            <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
              {hospitalProfile?.name || 'Partner Hospital'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Connected to Doctor Consultations, OPD Tokens, and Customer Accounts · Isolated by Hospital
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl cursor-pointer text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
            title="Refresh from backend"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-1.5 text-xs shadow-md shadow-blue-500/10 transition-all"
          >
            <Plus size={14} /> Register New Patient
          </button>
        </div>
      </div>

      {/* ─── Filters & Search Bar ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by UHID, Patient Name, Phone, Token #, Doctor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50 font-medium"
          />
        </div>

        {/* Doctor Filter (Phase 20 Requirement) */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 shrink-0">
            <Stethoscope size={14} className="text-blue-500" />
            <span className="hidden lg:inline">Doctor:</span>
          </div>
          <select
            value={selectedDoctorFilter}
            onChange={e => setSelectedDoctorFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 outline-none focus:border-blue-500 cursor-pointer min-w-[160px]"
          >
            <option value="all">All Doctors ({doctors.length})</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.departmentName || d.specialization})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 shrink-0">
            <Filter size={14} className="text-blue-500" />
            <span className="hidden lg:inline">Status:</span>
          </div>
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 outline-none focus:border-blue-500 cursor-pointer min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="today">Visited / Booked Today</option>
            <option value="completed">Completed Consultations</option>
            <option value="waiting">Waiting / Active Queue</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ─── Left: Patient List (2 cols on xl) ─────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    {['UHID', 'Patient Details', 'Contact', 'Attending Doctors', 'Visits', 'Last Visit', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400 text-xs">
                        <Users size={36} className="mx-auto mb-2 text-slate-300 opacity-60" />
                        <p className="font-bold">No hospital patient records found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {selectedDoctorFilter !== 'all' ? 'No patients have booked consultations with the selected doctor.' : 'Patients will automatically appear here as tokens are booked or registered.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map(p => {
                      const isSelected = selectedPatient?.id === p.id || selectedPatient?.phone === p.phone;
                      // Derive attending doctors
                      const attendingDocs = p.doctorVisits && p.doctorVisits.length > 0
                        ? p.doctorVisits
                        : tokens.filter(t => t.patientPhone === p.phone).map(t => ({
                            doctorId: t.doctorId,
                            doctorName: t.doctorName,
                            departmentName: t.departmentName,
                            visitCount: 1,
                            lastVisitDate: t.bookingDate
                          }));

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPatient(p)}
                          className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="px-4 py-3.5 font-black text-xs text-blue-600 font-mono">
                            {p.uhid}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-800 text-xs leading-tight">{p.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{p.gender} · {p.age} Yrs · {p.bloodGroup}</p>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                            <p className="font-semibold text-slate-700">{p.phone}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{p.city || 'Bengaluru'}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {attendingDocs.slice(0, 2).map((d, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md"
                                >
                                  <Stethoscope size={9} className="text-blue-500" />
                                  {d.doctorName?.replace('Dr. ', '')} {d.visitCount > 1 ? `(${d.visitCount})` : ''}
                                </span>
                              ))}
                              {attendingDocs.length > 2 && (
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                  +{attendingDocs.length - 2}
                                </span>
                              )}
                              {attendingDocs.length === 0 && (
                                <span className="text-[10px] text-slate-400 italic">No visits</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-black text-slate-700">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">
                              {p.totalVisits || 1}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
                            {p.lastVisit || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPatient(p);
                              }}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold rounded-lg text-[10px] cursor-pointer transition-all border border-blue-200 hover:border-blue-600"
                            >
                              View File
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── Right: Selected Patient Details Card (Phase 20) ───────────── */}
        <div>
          {selectedPatient ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5 sticky top-6">
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-blue-100">
                    {selectedPatient.uhid}
                  </span>
                  <h3 className="text-lg font-black text-slate-800 mt-2">{selectedPatient.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {selectedPatient.gender} · {selectedPatient.age} Years · Blood Group <strong className="text-red-600">{selectedPatient.bloodGroup}</strong>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-md shadow-blue-500/20">
                  {selectedPatient.name.charAt(0)}
                </div>
              </div>

              {/* Quick Actions for Patient */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuickTokenModal(true)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10 transition-all"
                >
                  <Ticket size={13} /> Issue Walk-in Token
                </button>
              </div>

              {/* Contact Info */}
              <div className="border-t border-b border-slate-100 py-3.5 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700">{selectedPatient.phone}</span>
                </div>
                {selectedPatient.email && (
                  <div className="flex items-center gap-2.5">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span>{selectedPatient.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <span>Registered: <strong>{selectedPatient.registeredOn || '2026-09-01'}</strong> · Visits: <strong>{selectedPatient.totalVisits || 1}</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-500 text-[11px] leading-relaxed">
                    {selectedPatient.address ? `${selectedPatient.address}, ` : ''}{selectedPatient.city || 'Bengaluru'} {selectedPatient.pinCode}
                  </span>
                </div>
              </div>

              {/* Attending Doctors Summary (Phase 20) */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                  <Stethoscope size={12} className="text-blue-500" />
                  Doctor Consultations at this Hospital
                </span>
                <div className="space-y-1.5">
                  {((selectedPatient.doctorVisits && selectedPatient.doctorVisits.length > 0)
                    ? selectedPatient.doctorVisits
                    : doctors.slice(0, 1).map(d => ({
                        doctorId: d.id,
                        doctorName: d.name,
                        departmentName: d.departmentName || d.specialization,
                        visitCount: 1,
                        lastVisitDate: selectedPatient.lastVisit || todayStr
                      }))
                  ).map((dv, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 text-[11px]">{dv.doctorName}</p>
                        <p className="text-[10px] text-slate-400">{dv.departmentName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full block">
                          {dv.visitCount} {dv.visitCount === 1 ? 'Visit' : 'Visits'}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Last: {dv.lastVisitDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Medical History */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Medical Conditions</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedPatient.medicalHistory || []).map(m => (
                    <span key={m} className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <FileText size={10} className="text-slate-400" /> {m}
                    </span>
                  ))}
                  {(!selectedPatient.medicalHistory || selectedPatient.medicalHistory.length === 0) && (
                    <span className="text-xs text-slate-400 italic">No prior conditions declared</span>
                  )}
                </div>
              </div>

              {/* Allergies */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2 text-red-500 flex items-center gap-1">
                  <ShieldAlert size={12} /> Allergies / Critical Alerts
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedPatient.allergies || []).map(a => (
                    <span key={a} className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <ShieldAlert size={10} className="text-red-500" /> {a}
                    </span>
                  ))}
                  {(!selectedPatient.allergies || selectedPatient.allergies.length === 0) && (
                    <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                      No known drug or food allergies
                    </span>
                  )}
                </div>
              </div>

              {/* Token Appointment History (Phase 20 & 21) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Linked Token & Booking History
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {tokens.filter(t => t.patientPhone === selectedPatient.phone).length} records
                  </span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {tokens.filter(t => t.patientPhone === selectedPatient.phone).length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No token records for this patient yet.</p>
                  ) : (
                    tokens.filter(t => t.patientPhone === selectedPatient.phone).map(tok => (
                      <div
                        key={tok.id}
                        className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-slate-200 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-800 text-[11px]">Token #{tok.tokenNo}</span>
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${tok.type === 'offline' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                              {tok.type || 'online'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{tok.doctorName} · {tok.departmentName}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{tok.bookingDate} · {tok.time}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-block uppercase tracking-wider ${
                            tok.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            tok.status === 'checked-in' ? 'bg-blue-100 text-blue-700' :
                            tok.status === 'waiting' ? 'bg-amber-100 text-amber-700' :
                            tok.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {tok.status}
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-700 block mt-1">₹{tok.consultationFee}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-slate-400 py-24 text-xs">
              <User size={36} className="mx-auto mb-2 text-slate-300 opacity-60" />
              <p className="font-bold text-slate-600">No Patient Selected</p>
              <p className="text-[11px] text-slate-400 mt-1">Select a patient from the list to view their complete history and doctor appointments.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── QUICK ISSUE TOKEN MODAL FOR SELECTED PATIENT ───────────────── */}
      {showQuickTokenModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">Issue Walk-in Token</h3>
                <p className="text-xs text-slate-400 mt-0.5">For {selectedPatient.name} ({selectedPatient.uhid})</p>
              </div>
              <button onClick={() => setShowQuickTokenModal(false)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400">✕</button>
            </div>
            <form onSubmit={handleQuickIssueToken} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Attending Doctor *</label>
                <select
                  value={quickTokenDoctorId}
                  onChange={e => setQuickTokenDoctorId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.departmentName || d.specialization} (₹{d.consultationFee})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select OPD Session *</label>
                <select
                  value={quickTokenSession}
                  onChange={e => setQuickTokenSession(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="morning">Morning Session (09:00 AM - 01:00 PM)</option>
                  <option value="afternoon">Afternoon Session (01:00 PM - 05:00 PM)</option>
                  <option value="evening">Evening Session (05:00 PM - 09:00 PM)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowQuickTokenModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer">Generate Token</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REGISTER PATIENT MODAL ─────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">Register New Patient</h3>
                <p className="text-xs text-slate-400 mt-0.5">Hospital: {hospitalProfile?.name || 'Partner Hospital'}</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400">✕</button>
            </div>
            <form onSubmit={handleRegister} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Full Name *</label>
                  <input type="text" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} placeholder="e.g. Anand Kumar" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone *</label>
                  <input type="tel" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} placeholder="10 digit mobile" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Email</label>
                  <input type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} placeholder="e.g. anand@email.com" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Age</label>
                  <input type="number" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} placeholder="35" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Blood Group</label>
                  <select value={newPatient.bloodGroup} onChange={e => setNewPatient({...newPatient, bloodGroup: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white">
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Complete Address</label>
                  <input type="text" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} placeholder="Area, Building name..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Medical History (comma separated)</label>
                  <input type="text" value={newPatient.medicalHistory} onChange={e => setNewPatient({...newPatient, medicalHistory: e.target.value})} placeholder="e.g. Asthma, Hypertension" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Allergies (comma separated)</label>
                  <input type="text" value={newPatient.allergies} onChange={e => setNewPatient({...newPatient, allergies: e.target.value})} placeholder="e.g. Penicillin, Peanuts" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>

                {/* Immediate Token Issuance Option */}
                <div className="col-span-2 bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPatient.issueTokenNow}
                      onChange={e => setNewPatient({...newPatient, issueTokenNow: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">Issue an OPD token for this patient immediately</span>
                  </label>

                  {newPatient.issueTokenNow && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Doctor</label>
                        <select
                          value={newPatient.doctorId}
                          onChange={e => setNewPatient({...newPatient, doctorId: e.target.value})}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          {doctors.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.departmentName})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Session</label>
                        <select
                          value={newPatient.session}
                          onChange={e => setNewPatient({...newPatient, session: e.target.value as any})}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                          <option value="evening">Evening</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer">Register Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
