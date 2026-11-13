import React, { useState, useMemo } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  Users, UserCheck, Search, Plus, X, Phone, MapPin, 
  Calendar, ChevronLeft, ChevronRight, Stethoscope
} from 'lucide-react';

export const DoctorReferences: React.FC = () => {
  const { doctorReferences, addDoctorReference, tokens, hospitalProfile } = useHospital();
  const { appointments } = useApp();

  // Search & Main Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Selected Doctor for Side Drawer Details
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(doctorReferences[0]?.id || null);

  // Sub-table search & date filter in side drawer
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDateRange, setPatientDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Pagination for main table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Pagination for sub-table (patients)
  const [patientPage, setPatientPage] = useState(1);
  const patientItemsPerPage = 7;

  // Add Doctor Reference Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocPlace, setNewDocPlace] = useState('');
  const [newDocQual, setNewDocQual] = useState('RMP / General Practitioner');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [newDocStatus, setNewDocStatus] = useState<'active' | 'inactive'>('active');

  // Dates helpers
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thisMonthStr = todayStr.slice(0, 7);

  // Combine and deduplicate token and appointment records that have doctor references
  const allReferredRecords = useMemo(() => {
    const list: Array<{
      id: string;
      tokenNo: string | number;
      patientName: string;
      patientPhone: string;
      place: string;
      referralDate: string;
      doctorRefName: string;
      doctorRefPhone: string;
      doctorRefPlace?: string;
      status: string;
      doctorName: string;
    }> = [];

    const seenIds = new Set<string>();

    // 1. Hospital Tokens
    (tokens || []).forEach(t => {
      const ref = t.doctorReference || t.rmpReference;
      if (ref && ref.name && ref.name.trim()) {
        const id = t.id || `tok-${t.tokenNo}`;
        seenIds.add(id);
        list.push({
          id,
          tokenNo: t.tokenNo ? `T${String(t.tokenNo).padStart(3, '0')}` : `#${t.queuePosition || 1}`,
          patientName: t.patientName || 'Patient',
          patientPhone: t.patientPhone || '',
          place: (t as any).address || ref.place || hospitalProfile?.city || 'Hyderabad',
          referralDate: t.bookingDate || todayStr,
          doctorRefName: ref.name.trim(),
          doctorRefPhone: ref.phone || '',
          doctorRefPlace: ref.place || '',
          status: t.status || 'booked',
          doctorName: t.doctorName || ''
        });
      }
    });

    // 2. Online App Appointments (strictly scoped to this hospital)
    const curHospId = hospitalProfile?.id;
    (appointments || []).filter(a => !curHospId || a.hospitalId === curHospId).forEach(a => {
      const ref = (a as any).doctorReference || (a as any).rmpReference;
      if (ref && ref.name && ref.name.trim() && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        list.push({
          id: a.id,
          tokenNo: `T${String(a.tokenNumber).padStart(3, '0')}`,
          patientName: a.patientName,
          patientPhone: a.phone,
          place: a.address || ref.place || hospitalProfile?.city || 'Hyderabad',
          referralDate: a.date || (a.createdAt ? a.createdAt.split('T')[0] : todayStr),
          doctorRefName: ref.name.trim(),
          doctorRefPhone: ref.phone || '',
          doctorRefPlace: ref.place || '',
          status: a.status || 'booked',
          doctorName: a.doctorName || ''
        });
      }
    });

    return list;
  }, [tokens, appointments, todayStr, hospitalProfile]);

  // Filter records by main date filter
  const dateFilteredRecords = useMemo(() => {
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

  // Aggregate stats per Referring Doctor
  const doctorReferralCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dateFilteredRecords.forEach(r => {
      const norm = r.doctorRefName.toLowerCase().replace(/^(dr\.|rmp\.)\s*/, '').trim();
      counts[norm] = (counts[norm] || 0) + 1;
    });
    return counts;
  }, [dateFilteredRecords]);

  // Combine hospital registered references with any unique doctor references entered during patient bookings
  const allHospitalDoctors = useMemo(() => {
    const list = [...doctorReferences];
    const seenNames = new Set(list.map(d => d.name.toLowerCase().replace(/^(dr\.|rmp\.)\s*/, '').trim()));

    allReferredRecords.forEach(r => {
      const normName = r.doctorRefName.toLowerCase().replace(/^(dr\.|rmp\.)\s*/, '').trim();
      if (normName && !seenNames.has(normName)) {
        seenNames.add(normName);
        list.push({
          id: `booking-ref-${normName}`,
          name: r.doctorRefName,
          phone: r.doctorRefPhone || '',
          place: r.doctorRefPlace || r.place || '',
          qualification: 'RMP / Referring Practitioner',
          status: 'active',
          registeredDate: r.referralDate || todayStr,
          notes: 'Added from patient token booking'
        });
      }
    });

    return list;
  }, [doctorReferences, allReferredRecords, todayStr]);

  // Filtered Doctor References list
  const filteredDoctors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allHospitalDoctors.filter(d => {
      const matchName = d.name.toLowerCase().includes(q);
      const matchPhone = d.phone.includes(q);
      const matchPlace = d.place.toLowerCase().includes(q);
      return matchName || matchPhone || matchPlace;
    });
  }, [allHospitalDoctors, searchQuery]);

  // Total KPIs (Strictly Real-time, 0 demo data)
  const totalReferringDoctors = allHospitalDoctors.length;
  const totalPatientsReferred = dateFilteredRecords.length;

  // Active selected doctor
  const selectedDoctor = useMemo(() => {
    return allHospitalDoctors.find(d => d.id === selectedDoctorId) || allHospitalDoctors[0] || null;
  }, [allHospitalDoctors, selectedDoctorId]);

  // Patients referred by selected doctor (Strictly Real-time, 0 baseline mock patients)
  const selectedDoctorPatients = useMemo(() => {
    if (!selectedDoctor) return [];
    const normDoc = selectedDoctor.name.toLowerCase().replace(/^(dr\.|rmp\.)\s*/, '').trim();

    // Only live patients
    const livePatients = dateFilteredRecords.filter(r => {
      const rNorm = r.doctorRefName.toLowerCase().replace(/^(dr\.|rmp\.)\s*/, '').trim();
      return rNorm === normDoc || (selectedDoctor.phone && r.doctorRefPhone && r.doctorRefPhone === selectedDoctor.phone);
    });

    // Filter by sub-table search
    const pq = patientSearch.toLowerCase().trim();
    return livePatients.filter(p => {
      const matchName = p.patientName.toLowerCase().includes(pq);
      const matchPhone = p.patientPhone.includes(pq);
      const matchPlace = (p.place || '').toLowerCase().includes(pq);
      return matchName || matchPhone || matchPlace;
    });
  }, [selectedDoctor, dateFilteredRecords, patientSearch]);

  const getDoctorCount = (doc: any) => {
    const norm = doc.name.toLowerCase().replace(/^(dr\.|rmp\.)\s*/, '').trim();
    return doctorReferralCounts[norm] || 0;
  };

  const handleAddDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocPhone.trim() || !newDocPlace.trim()) {
      alert('Please fill in Doctor Name, Mobile Number and Place/Village.');
      return;
    }

    addDoctorReference({
      name: newDocName.trim().startsWith('Dr.') ? newDocName.trim() : `Dr. ${newDocName.trim()}`,
      phone: newDocPhone.trim().replace(/\D/g, '').slice(-10),
      place: newDocPlace.trim(),
      qualification: newDocQual,
      status: newDocStatus,
      notes: newDocNotes.trim()
    });

    setShowAddModal(false);
    setNewDocName('');
    setNewDocPhone('');
    setNewDocPlace('');
    setNewDocNotes('');
  };

  // Pagination slicing
  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage) || 1;
  const paginatedDoctors = filteredDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPatientPages = Math.ceil(selectedDoctorPatients.length / patientItemsPerPage) || 1;
  const paginatedPatients = selectedDoctorPatients.slice((patientPage - 1) * patientItemsPerPage, patientPage * patientItemsPerPage);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* ── TOP HEADER (Matching Image 79) ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
              Doctor References
            </h1>
            <Badge variant="blue" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black uppercase">
              RMP Referrals
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage Doctor references and view patients referred by each doctor. Hospital panel members can verify referred bookings separately.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all border-none"
        >
          <Plus size={16} />
          <span>+ Add Doctor Reference</span>
        </button>
      </div>

      {/* ── 2 TOP STAT CARDS (Matching Image 79) ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Total Referring Doctors */}
        <Card className="p-5 border-none shadow-xs bg-white rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Users size={26} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block">
              Total Referring Doctors / RMPs
            </span>
            <span className="text-3xl font-black text-slate-900 font-heading block mt-0.5">
              {totalReferringDoctors}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              ● Active referral network across regional clinics
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
              {totalPatientsReferred}
            </span>
            <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
              ● Verified via online booking pass & walk-in tokens
            </span>
          </div>
        </Card>
      </div>

      {/* ── DATE-WISE FILTER BAR ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctor name, mobile number or place..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
          />
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
            <Calendar size={13} /> Filter:
          </span>
          {(['all', 'today', 'yesterday', '7days', 'month', 'custom'] as const).map(pill => (
            <button
              key={pill}
              onClick={() => setDateFilter(pill)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                dateFilter === pill ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {pill === 'all' ? 'All Time' : pill === 'today' ? 'Today' : pill === 'yesterday' ? 'Yesterday' : pill === '7days' ? 'Last 7 Days' : pill === 'month' ? 'This Month' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 text-xs">
            <input 
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
            />
            <span className="text-slate-400">to</span>
            <input 
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
            />
          </div>
        )}
      </div>

      {/* ── MAIN 2-COLUMN VIEW: RMP TABLE (LEFT) + DETAILS DRAWER (RIGHT) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Doctor Reference Directory Table */}
        <div className={selectedDoctor ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Doctor References Roster
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Click 'View Patients' on any doctor to inspect patient referrals
                </p>
              </div>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                {filteredDoctors.length} Registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5">Doctor / RMP Name</th>
                    <th className="px-4 py-3.5">Mobile Number</th>
                    <th className="px-4 py-3.5">Place / Village</th>
                    <th className="px-4 py-3.5 text-center">Total Patients Referred</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="max-w-xs mx-auto space-y-2">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                            <Stethoscope size={24} />
                          </div>
                          <p className="font-extrabold text-slate-800 text-xs">No Referring Doctors Found</p>
                          <p className="text-[11px] text-slate-400">
                            Add your hospital's referring RMPs and clinics, or wait for patients to enter a doctor reference during booking.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                          >
                            + Add Doctor Reference
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDoctors.map((doc, idx) => {
                    const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isSelected = selectedDoctor?.id === doc.id;
                    const count = getDoctorCount(doc);

                    return (
                      <tr 
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center font-bold text-slate-400">
                          {rowNum}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 text-xs">
                              {doc.name.replace(/^(Dr\.|RMP)\s*/i, '').charAt(0) || 'D'}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs leading-tight">
                                {doc.name}
                              </p>
                              <span className="text-[9.5px] text-slate-400 font-medium">
                                {doc.qualification || 'RMP'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-700">
                          <a 
                            href={`tel:${doc.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors no-underline"
                          >
                            <Phone size={11} className="text-emerald-500 shrink-0" />
                            <span>{doc.phone}</span>
                          </a>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-blue-500 shrink-0" />
                            <span>{doc.place}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-blue-100/70 text-blue-800">
                            {count}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDoctorId(doc.id);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
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
                  }))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Matching Image 79) */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {Math.min(1, filteredDoctors.length)} to {Math.min(currentPage * itemsPerPage, filteredDoctors.length)} of {filteredDoctors.length} Doctors
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold cursor-pointer border-none ${
                      currentPage === page ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Split Details Drawer (Matching Image 79) */}
        {selectedDoctor && (
          <div className="lg:col-span-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-5">
              
              {/* Drawer Top Header with Close (X) */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Doctor Details & Referred Patients
                </h3>
                <button
                  onClick={() => setSelectedDoctorId(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Profile Card (Matching Image 79) */}
              <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 text-blue-600 font-black text-base flex items-center justify-center shrink-0 shadow-2xs">
                    <Stethoscope size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 text-sm leading-tight">
                        {selectedDoctor.name}
                      </h4>
                      <span className="text-[9.5px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone size={11} className="text-blue-500" /> {selectedDoctor.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-rose-500" /> {selectedDoctor.place}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Total Referred
                  </span>
                  <span className="text-2xl font-black text-blue-700 font-heading block mt-0.5">
                    {getDoctorCount(selectedDoctor)}
                  </span>
                </div>
              </div>

              {/* Sub-Section: Patients Referred by Dr. [Name] */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Patients Referred by {selectedDoctor.name}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    {selectedDoctorPatients.length} records
                  </span>
                </div>

                {/* Sub-Search and Sub-Date Filter Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search patient name, mobile or place..."
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-[11px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={patientDateRange}
                    onChange={e => setPatientDateRange(e.target.value as any)}
                    className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">Select Date Range</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                  </select>
                </div>

                {/* Patient Referrals Sub-Table (Matching Image 79) */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2.5 w-8 text-center">#</th>
                          <th className="px-3 py-2.5">Patient Name</th>
                          <th className="px-3 py-2.5">Mobile Number</th>
                          <th className="px-3 py-2.5">Place / Village</th>
                          <th className="px-3 py-2.5 text-center">Token No.</th>
                          <th className="px-3 py-2.5 text-right">Referral Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {paginatedPatients.map((p, idx) => {
                          const pNum = (patientPage - 1) * patientItemsPerPage + idx + 1;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3 py-2.5 text-center text-slate-400 font-bold">
                                {pNum}
                              </td>
                              <td className="px-3 py-2.5 font-bold text-slate-900">
                                {p.patientName}
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-slate-600">
                                {p.patientPhone}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {p.place}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                                  {p.tokenNo}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-500 whitespace-nowrap">
                                {p.referralDate}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Sub-table Pagination */}
                  <div className="p-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 bg-slate-50/50">
                    <span>
                      Showing {Math.min(1, selectedDoctorPatients.length)} to {Math.min(patientPage * patientItemsPerPage, selectedDoctorPatients.length)} of {selectedDoctorPatients.length} patients
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={patientPage <= 1}
                        onClick={() => setPatientPage(p => p - 1)}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      {Array.from({ length: totalPatientPages }, (_, i) => i + 1).slice(0, 5).map(pg => (
                        <button
                          key={pg}
                          onClick={() => setPatientPage(pg)}
                          className={`w-5 h-5 rounded text-[10px] font-bold cursor-pointer border-none ${
                            patientPage === pg ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {pg}
                        </button>
                      ))}
                      <button
                        disabled={patientPage >= totalPatientPages}
                        onClick={() => setPatientPage(p => p + 1)}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ── MODAL: ADD DOCTOR REFERENCE ───────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Add Doctor Reference</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Register referring doctor or RMP partner</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer border-none bg-transparent"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                  Doctor / RMP Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Srinivas"
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
                    placeholder="10-digit mobile"
                    value={newDocPhone}
                    onChange={e => setNewDocPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Place / Village *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adoni, Yemmiganur"
                    value={newDocPlace}
                    onChange={e => setNewDocPlace(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Designation / Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RMP, MBBS, Rural Practitioner"
                    value={newDocQual}
                    onChange={e => setNewDocQual(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Status
                  </label>
                  <select
                    value={newDocStatus}
                    onChange={e => setNewDocStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinic address or reference arrangement notes..."
                  value={newDocNotes}
                  onChange={e => setNewDocNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 resize-none font-medium"
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
                  Save Doctor Reference
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
