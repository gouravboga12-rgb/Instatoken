import React, { useState, useMemo } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Users, UserCheck, Search, Plus, X, Phone, MapPin, 
  ChevronLeft, ChevronRight, Stethoscope, Download
} from 'lucide-react';

export const DoctorReferences: React.FC = () => {
  const { doctorReferences, addDoctorReference, tokens, hospitalProfile } = useHospital();
  const { appointments } = useApp();

  // Unified Search & Global Date Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Selected Doctor for Slide-Over Drawer
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [drawerPatientSearch, setDrawerPatientSearch] = useState('');

  // Main Table Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Slide-Over Drawer Pagination
  const [drawerPage, setDrawerPage] = useState(1);
  const drawerItemsPerPage = 7;

  // Add Referring Doctor Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocPlace, setNewDocPlace] = useState('');
  const [newDocSpecialization, setNewDocSpecialization] = useState('General Physician');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [newDocStatus, setNewDocStatus] = useState<'active' | 'inactive'>('active');

  // Dates helpers (Asia/Kolkata timezone safe)
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thisMonthStr = todayStr.slice(0, 7);

  // 1. Gather all patient referral records from both tokens and appointments (strictly scoped to this hospital)
  const allReferredRecords = useMemo(() => {
    const list: Array<{
      id: string;
      tokenNo: string | number;
      patientName: string;
      patientPhone: string;
      patientAge?: number | string;
      patientGender?: string;
      place: string;
      referralDate: string;
      referralTime?: string;
      doctorRefName: string;
      doctorRefPhone: string;
      doctorRefPlace?: string;
      status: string;
      doctorName: string;
      departmentName?: string;
    }> = [];

    const seenIds = new Set<string>();
    const curHospId = hospitalProfile?.id;

    // A. Hospital Live Tokens
    (tokens || []).forEach(t => {
      const ref = t.doctorReference || (t as any).rmpReference;
      if (ref && ref.name && String(ref.name).trim()) {
        const id = t.id || `tok-${t.tokenNo}`;
        seenIds.add(id);
        const rawName = String(ref.name).replace(/[`'"]/g, '').trim();
        const cleanRefName = (rawName.toLowerCase().startsWith('dr.') || rawName.toLowerCase().startsWith('dr '))
          ? rawName
          : `Dr. ${rawName}`;

        list.push({
          id,
          tokenNo: t.tokenNo ? `T${String(t.tokenNo).padStart(3, '0')}` : `#${t.queuePosition || 1}`,
          patientName: t.patientName || 'Patient',
          patientPhone: t.patientPhone || '',
          patientAge: (t as any).patientAge || (t as any).age,
          patientGender: (t as any).patientGender || (t as any).gender,
          place: (t as any).patientAddress || (t as any).address || (t as any).place || ref.place || hospitalProfile?.city || 'Local',
          referralDate: t.bookingDate || (t as any).date || todayStr,
          referralTime: (t as any).time || '',
          doctorRefName: cleanRefName,
          doctorRefPhone: String(ref.phone || '').replace(/\D/g, '').slice(-10),
          doctorRefPlace: ref.place || '',
          status: t.status || 'booked',
          doctorName: t.doctorName || 'Doctor',
          departmentName: t.departmentName || 'General OPD'
        });
      }
    });

    // B. Online App Appointments (strictly scoped to this hospital)
    (appointments || []).filter(a => !curHospId || a.hospitalId === curHospId).forEach(a => {
      const ref = (a as any).doctorReference || (a as any).rmpReference;
      if (ref && ref.name && String(ref.name).trim() && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        const rawName = String(ref.name).replace(/[`'"]/g, '').trim();
        const cleanRefName = (rawName.toLowerCase().startsWith('dr.') || rawName.toLowerCase().startsWith('dr '))
          ? rawName
          : `Dr. ${rawName}`;

        list.push({
          id: a.id,
          tokenNo: `T${String(a.tokenNumber).padStart(3, '0')}`,
          patientName: a.patientName,
          patientPhone: a.phone,
          patientAge: a.age,
          patientGender: a.gender,
          place: a.address || (a as any).place || ref.place || hospitalProfile?.city || 'Local',
          referralDate: a.date || (a.createdAt ? a.createdAt.split('T')[0] : todayStr),
          referralTime: a.time || '',
          doctorRefName: cleanRefName,
          doctorRefPhone: String(ref.phone || '').replace(/\D/g, '').slice(-10),
          doctorRefPlace: ref.place || '',
          status: a.status || 'booked',
          doctorName: a.doctorName || 'Doctor',
          departmentName: a.departmentName || 'General OPD'
        });
      }
    });

    return list;
  }, [tokens, appointments, todayStr, hospitalProfile]);

  // 2. Filter referrals by global date filter
  const dateFilteredReferrals = useMemo(() => {
    return allReferredRecords.filter(r => {
      const d = r.referralDate;
      if (dateFilter === 'today') return d === todayStr;
      if (dateFilter === 'yesterday') return d === yesterdayStr;
      if (dateFilter === '7days') return d >= sevenDaysAgoStr && d <= todayStr;
      if (dateFilter === 'month') return d.startsWith(thisMonthStr);
      if (dateFilter === 'custom' && customStartDate) {
        const end = customEndDate || todayStr;
        return d >= customStartDate && d <= end;
      }
      return true;
    });
  }, [allReferredRecords, dateFilter, todayStr, yesterdayStr, sevenDaysAgoStr, thisMonthStr, customStartDate, customEndDate]);

  // 3. Aggregate referral counts and latest referral date per doctor phone / name
  const doctorReferralStats = useMemo(() => {
    const stats: Record<string, { count: number; lastDate: string }> = {};

    dateFilteredReferrals.forEach(r => {
      const keyPhone = r.doctorRefPhone ? `phone_${r.doctorRefPhone}` : '';
      const keyName = `name_${r.doctorRefName.toLowerCase().replace(/^dr\.?\s*/i, '').trim()}`;

      const keys = [keyPhone, keyName].filter(Boolean);
      keys.forEach(k => {
        if (!stats[k]) {
          stats[k] = { count: 0, lastDate: r.referralDate };
        }
        stats[k].count += 1;
        if (r.referralDate > stats[k].lastDate) {
          stats[k].lastDate = r.referralDate;
        }
      });
    });

    return stats;
  }, [dateFilteredReferrals]);

  // 4. Combine registered doctors with patient-entered doctors (clean, deduped, 0 demo data)
  const unifiedDoctorList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      phone: string;
      place: string;
      specialization: string;
      qualification: string;
      status: 'active' | 'inactive';
      registeredDate: string;
      notes?: string;
    }> = [];

    const seenPhones = new Set<string>();
    const seenNames = new Set<string>();

    // A. Add doctors pre-registered in hospital_doctor_references
    (doctorReferences || []).forEach(d => {
      const cleanPhone = String(d.phone || '').replace(/\D/g, '').slice(-10);
      const rawName = String(d.name || '').replace(/[`'"]/g, '').trim();
      const cleanName = (rawName.toLowerCase().startsWith('dr.') || rawName.toLowerCase().startsWith('dr '))
        ? rawName
        : `Dr. ${rawName}`;
      const normName = cleanName.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

      if (cleanPhone) seenPhones.add(cleanPhone);
      if (normName) seenNames.add(normName);

      list.push({
        id: d.id,
        name: cleanName,
        phone: cleanPhone || d.phone,
        place: d.place || 'Local Clinic',
        specialization: d.specialization || 'General Physician',
        qualification: d.qualification || 'MBBS / Consultant',
        status: d.status || 'active',
        registeredDate: d.registeredDate || todayStr,
        notes: d.notes || ''
      });
    });

    // B. Add any doctor references from live patient bookings not yet in list
    allReferredRecords.forEach(r => {
      const cleanPhone = String(r.doctorRefPhone || '').replace(/\D/g, '').slice(-10);
      const normName = r.doctorRefName.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

      const alreadyExists = (cleanPhone && seenPhones.has(cleanPhone)) || (normName && seenNames.has(normName));

      if (!alreadyExists && (cleanPhone || normName)) {
        if (cleanPhone) seenPhones.add(cleanPhone);
        if (normName) seenNames.add(normName);

        list.push({
          id: `ref-auto-${cleanPhone || normName}`,
          name: r.doctorRefName,
          phone: cleanPhone || '',
          place: r.doctorRefPlace || r.place || 'Local Clinic',
          specialization: 'Referring Physician',
          qualification: 'Consulting Doctor',
          status: 'active',
          registeredDate: r.referralDate || todayStr,
          notes: 'Registered via patient token booking'
        });
      }
    });

    return list;
  }, [doctorReferences, allReferredRecords, todayStr]);

  // 5. Global Filtered Doctors List (matches doctor name, phone, place, or referred patient)
  const filteredDoctors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return unifiedDoctorList;

    return unifiedDoctorList.filter(doc => {
      const matchDocName = doc.name.toLowerCase().includes(q);
      const matchPhone = doc.phone.includes(q);
      const matchPlace = doc.place.toLowerCase().includes(q);
      const matchSpec = (doc.specialization || '').toLowerCase().includes(q);

      // Check if any of this doctor's referred patients match the query
      const matchPatient = dateFilteredReferrals.some(r => {
        const matchesThisDoctor = (doc.phone && r.doctorRefPhone === doc.phone) ||
          r.doctorRefName.toLowerCase().includes(doc.name.toLowerCase().replace(/^dr\.?\s*/i, '').trim());
        if (!matchesThisDoctor) return false;
        return r.patientName.toLowerCase().includes(q) || r.patientPhone.includes(q) || r.place.toLowerCase().includes(q);
      });

      return matchDocName || matchPhone || matchPlace || matchSpec || matchPatient;
    });
  }, [unifiedDoctorList, searchQuery, dateFilteredReferrals]);

  // Helper to get referral stats for a doctor
  const getDoctorStats = (doc: { name: string; phone: string }) => {
    const cleanPhone = String(doc.phone || '').replace(/\D/g, '').slice(-10);
    const normName = doc.name.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

    const byPhone = cleanPhone ? doctorReferralStats[`phone_${cleanPhone}`] : null;
    const byName = normName ? doctorReferralStats[`name_${normName}`] : null;

    const count = byPhone ? byPhone.count : (byName ? byName.count : 0);
    const lastDate = byPhone?.lastDate || byName?.lastDate || null;
    return { count, lastDate };
  };

  // Selected Doctor for Slide-Over Drawer
  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return unifiedDoctorList.find(d => d.id === selectedDoctorId) || null;
  }, [unifiedDoctorList, selectedDoctorId]);

  // Patients Referred by the Selected Doctor
  const selectedDoctorPatients = useMemo(() => {
    if (!selectedDoctor) return [];
    const cleanPhone = String(selectedDoctor.phone || '').replace(/\D/g, '').slice(-10);
    const normName = selectedDoctor.name.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

    const list = dateFilteredReferrals.filter(r => {
      const matchPhone = cleanPhone && r.doctorRefPhone && r.doctorRefPhone === cleanPhone;
      const matchName = normName && r.doctorRefName.toLowerCase().includes(normName);
      return matchPhone || matchName;
    });

    const pq = drawerPatientSearch.toLowerCase().trim();
    if (!pq) return list;

    return list.filter(p => 
      p.patientName.toLowerCase().includes(pq) ||
      p.patientPhone.includes(pq) ||
      p.place.toLowerCase().includes(pq) ||
      String(p.tokenNo).toLowerCase().includes(pq)
    );
  }, [selectedDoctor, dateFilteredReferrals, drawerPatientSearch]);

  // Add Referring Doctor Form Submit
  const handleAddDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newDocName.trim().replace(/[`'"]/g, '');
    const cleanPhone = newDocPhone.trim().replace(/\D/g, '').slice(-10);
    const cleanPlace = newDocPlace.trim().replace(/[`'"]/g, '');

    if (!cleanName || cleanPhone.length < 10 || !cleanPlace) {
      alert('Please enter a valid Doctor Full Name, 10-digit Mobile Number, and Clinic/Place.');
      return;
    }

    const formattedName = (cleanName.toLowerCase().startsWith('dr.') || cleanName.toLowerCase().startsWith('dr '))
      ? cleanName
      : `Dr. ${cleanName}`;

    addDoctorReference({
      name: formattedName,
      phone: cleanPhone,
      place: cleanPlace,
      specialization: newDocSpecialization,
      qualification: 'MBBS / Consultant',
      status: newDocStatus,
      notes: newDocNotes.trim()
    });

    setShowAddModal(false);
    setNewDocName('');
    setNewDocPhone('');
    setNewDocPlace('');
    setNewDocNotes('');
    setNewDocSpecialization('General Physician');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const rows = [
      ['Doctor Name', 'Mobile Number', 'Clinic / Place', 'Specialization', 'Total Referred Patients', 'Last Referral Date']
    ];

    filteredDoctors.forEach(d => {
      const { count, lastDate } = getDoctorStats(d);
      rows.push([
        `"${d.name}"`,
        `"${d.phone}"`,
        `"${d.place}"`,
        `"${d.specialization}"`,
        String(count),
        `"${lastDate || 'None'}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `doctor_references_${hospitalProfile?.id || 'hospital'}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination Math
  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage) || 1;
  const paginatedDoctors = filteredDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalDrawerPages = Math.ceil(selectedDoctorPatients.length / drawerItemsPerPage) || 1;
  const paginatedDrawerPatients = selectedDoctorPatients.slice((drawerPage - 1) * drawerItemsPerPage, drawerPage * drawerItemsPerPage);

  // Total KPIs
  const totalReferringDoctorsCount = unifiedDoctorList.length;
  const totalReferredPatientsCount = dateFilteredReferrals.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
              Doctor References
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-200/60">
              Referring Network
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Track referring doctors and inspect patients referred to your hospital OPD in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            title="Export Doctor References to CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 sm:px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all border-none"
          >
            <Plus size={16} />
            <span>+ Add Referring Doctor</span>
          </button>
        </div>
      </div>

      {/* ── TOP 2 SUMMARY CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Total Referring Doctors */}
        <Card className="p-5 border-none shadow-xs bg-white rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Users size={26} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block">
              Total Referring Doctors
            </span>
            <span className="text-3xl font-black text-slate-900 font-heading block mt-0.5">
              {totalReferringDoctorsCount}
            </span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Active network of referring physicians & regional clinics
            </span>
          </div>
        </Card>

        {/* Card 2: Total Patients Referred */}
        <Card className="p-5 border-none shadow-xs bg-white rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
            <UserCheck size={26} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block">
              Total Patients Referred
            </span>
            <span className="text-3xl font-black text-slate-900 font-heading block mt-0.5">
              {totalReferredPatientsCount}
            </span>
            <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              Verified via digital OPD tokens & walk-in registrations
            </span>
          </div>
        </Card>
      </div>

      {/* ── UNIFIED FILTER & SEARCH BAR ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctor name, mobile, clinic place, or patient..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 hidden lg:inline">
            Date Filter:
          </span>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => {
                setDateFilter(f.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                dateFilter === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 pt-1 sm:pt-0 w-full sm:w-auto">
            <input 
              type="date"
              value={customStartDate}
              onChange={e => {
                setCustomStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <input 
              type="date"
              value={customEndDate}
              onChange={e => {
                setCustomEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
            />
          </div>
        )}
      </div>

      {/* ── FULL-WIDTH DOCTOR REFERENCES ROSTER TABLE ───────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Referring Doctors Roster
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Click 'View Patients' on any doctor to see the exact patient referrals and token records
            </p>
          </div>
          <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/50">
            {filteredDoctors.length} Doctors Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[750px]">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 w-12 text-center">#</th>
                <th className="px-5 py-4">Referring Doctor</th>
                <th className="px-5 py-4">Specialization / Role</th>
                <th className="px-5 py-4">Mobile Number</th>
                <th className="px-5 py-4">Clinic / Place</th>
                <th className="px-5 py-4 text-center">Patients Referred</th>
                <th className="px-5 py-4">Last Referral</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDoctors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2.5">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                        <Stethoscope size={24} />
                      </div>
                      <p className="font-extrabold text-slate-800 text-sm">No Referring Doctors Found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery 
                          ? `No doctors or referrals matched your search for "${searchQuery}".` 
                          : 'Register referring doctors using the button below or wait for patients to input their doctor reference during token booking.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                      >
                        + Add Referring Doctor
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDoctors.map((doc, idx) => {
                  const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                  const { count, lastDate } = getDoctorStats(doc);
                  const isSelected = selectedDoctorId === doc.id;

                  return (
                    <tr 
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoctorId(doc.id);
                        setDrawerPage(1);
                        setDrawerPatientSearch('');
                      }}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-5 py-4 text-center font-bold text-slate-400">
                        {rowNum}
                      </td>

                      {/* Doctor Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-black flex items-center justify-center shrink-0 text-xs shadow-2xs border border-blue-200/50">
                            {doc.name.replace(/^Dr\.?\s*/i, '').charAt(0) || 'D'}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-xs leading-tight">
                              {doc.name}
                            </p>
                            <span className="text-[10px] text-emerald-600 font-bold inline-block mt-0.5">
                              ● Active Partner
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Specialization */}
                      <td className="px-5 py-4 font-bold text-slate-700">
                        <span className="inline-block bg-slate-100 text-slate-800 text-[11px] px-2.5 py-0.5 rounded-md">
                          {doc.specialization || 'General Physician'}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="px-5 py-4 font-bold text-slate-700">
                        <a 
                          href={`tel:${doc.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="text-slate-800 hover:text-blue-600 flex items-center gap-1.5 transition-colors no-underline"
                        >
                          <Phone size={12} className="text-emerald-500 shrink-0" />
                          <span>{doc.phone}</span>
                        </a>
                      </td>

                      {/* Clinic / Place */}
                      <td className="px-5 py-4 font-bold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-blue-500 shrink-0" />
                          <span>{doc.place}</span>
                        </div>
                      </td>

                      {/* Patients Referred Badge */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                          count > 0 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {count} {count === 1 ? 'Patient' : 'Patients'}
                        </span>
                      </td>

                      {/* Last Referral Date */}
                      <td className="px-5 py-4 text-slate-500 font-semibold text-[11px] whitespace-nowrap">
                        {lastDate ? lastDate : <span className="text-slate-400 italic">No visits in period</span>}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoctorId(doc.id);
                            setDrawerPage(1);
                            setDrawerPatientSearch('');
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-xs' 
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          View Patients
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40">
          <span>
            Showing {Math.min(1, filteredDoctors.length)} to {Math.min(currentPage * itemsPerPage, filteredDoctors.length)} of {filteredDoctors.length} Doctors
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold cursor-pointer border-none ${
                  currentPage === page ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SLIDE-OVER DRAWER: REFERRED PATIENTS DIRECTORY ───────────────────── */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setSelectedDoctorId(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right duration-200">
              
              {/* Drawer Top Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <Stethoscope size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 font-heading">
                        {selectedDoctor.name}
                      </h3>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone size={12} className="text-blue-500" /> {selectedDoctor.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-rose-500" /> {selectedDoctor.place}
                      </span>
                      <span className="text-blue-700 font-black">
                        • {selectedDoctor.specialization}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Total Referred
                    </span>
                    <span className="text-xl font-black text-blue-700 block">
                      {getDoctorStats(selectedDoctor).count}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDoctorId(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer border-none bg-transparent"
                    title="Close Drawer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Drawer Search & Count Bar */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patient name, mobile, place or token..."
                    value={drawerPatientSearch}
                    onChange={e => {
                      setDrawerPatientSearch(e.target.value);
                      setDrawerPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  {selectedDoctorPatients.length} Patients
                </span>
              </div>

              {/* Drawer Patients Table */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-3 w-8 text-center">#</th>
                        <th className="px-3.5 py-3">Patient</th>
                        <th className="px-3.5 py-3">Mobile & Place</th>
                        <th className="px-3.5 py-3 text-center">Token</th>
                        <th className="px-3.5 py-3">Consulted Doctor</th>
                        <th className="px-3.5 py-3 text-right">Referral Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {paginatedDrawerPatients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            <p className="font-bold text-xs text-slate-600">No Referred Patients Found</p>
                            <p className="text-[11px] mt-1">
                              {drawerPatientSearch 
                                ? 'No patients match your search filter.' 
                                : 'No patients have been referred by this doctor for the selected date range.'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        paginatedDrawerPatients.map((p, idx) => {
                          const pNum = (drawerPage - 1) * drawerItemsPerPage + idx + 1;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3.5 py-3 text-center text-slate-400 font-bold">
                                {pNum}
                              </td>
                              <td className="px-3.5 py-3">
                                <p className="font-black text-slate-900 text-xs">
                                  {p.patientName}
                                </p>
                                {(p.patientAge || p.patientGender) && (
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {p.patientAge ? `${p.patientAge} Y` : ''} {p.patientGender || ''}
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-3">
                                <p className="font-bold text-slate-700 text-xs">
                                  {p.patientPhone}
                                </p>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} className="text-blue-500 shrink-0" />
                                  {p.place}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-center">
                                <span className="font-black text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded text-[11px]">
                                  {p.tokenNo}
                                </span>
                              </td>
                              <td className="px-3.5 py-3">
                                <p className="font-bold text-slate-800 text-xs leading-tight">
                                  {p.doctorName}
                                </p>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {p.departmentName}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-right">
                                <span className="font-bold text-slate-700 text-xs block whitespace-nowrap">
                                  {p.referralDate}
                                </span>
                                {p.referralTime && (
                                  <span className="text-[10px] text-slate-400 font-medium block">
                                    {p.referralTime}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Drawer Pagination Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <span>
                  Showing {Math.min(1, selectedDoctorPatients.length)} to {Math.min(drawerPage * drawerItemsPerPage, selectedDoctorPatients.length)} of {selectedDoctorPatients.length} Patients
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={drawerPage <= 1}
                    onClick={() => setDrawerPage(p => p - 1)}
                    className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalDrawerPages }, (_, i) => i + 1).slice(0, 5).map(pg => (
                    <button
                      key={pg}
                      onClick={() => setDrawerPage(pg)}
                      className={`w-6 h-6 rounded text-xs font-bold cursor-pointer border-none ${
                        drawerPage === pg ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    disabled={drawerPage >= totalDrawerPages}
                    onClick={() => setDrawerPage(p => p + 1)}
                    className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD REFERRING DOCTOR ────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Add Referring Doctor</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Register a local clinic or partner physician</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer border-none bg-transparent"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Srinivas Rao"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={newDocPhone}
                    onChange={e => setNewDocPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Clinic / Place *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kurnool, Adoni"
                    value={newDocPlace}
                    onChange={e => setNewDocPlace(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Specialization
                  </label>
                  <select
                    value={newDocSpecialization}
                    onChange={e => setNewDocSpecialization(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-xs cursor-pointer"
                  >
                    <option value="General Physician">General Physician</option>
                    <option value="Consultant Physician">Consultant Physician</option>
                    <option value="Pediatrician">Pediatrician</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                    <option value="Gynecologist">Gynecologist</option>
                    <option value="Family Doctor">Family Doctor</option>
                    <option value="Partner Clinic">Partner Clinic</option>
                    <option value="Other Specialist">Other Specialist</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Status
                  </label>
                  <select
                    value={newDocStatus}
                    onChange={e => setNewDocStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-xs cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinic address or referral arrangement notes..."
                  value={newDocNotes}
                  onChange={e => setNewDocNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 resize-none font-medium text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-xs px-5 font-black shadow-xs"
                >
                  Save Referring Doctor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
