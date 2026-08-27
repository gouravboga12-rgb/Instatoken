import React, { useState, useMemo } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalDoctor } from '../../context/HospitalContext';
import {
  DollarSign, TrendingUp, ChevronRight,
  Search, CheckCircle2,
  Stethoscope, X, UserX, CheckCircle, Trash2
} from 'lucide-react';

export const RevenueOverview: React.FC = () => {
  const { doctors, tokens, updateTokenStatus, deleteToken } = useHospital();

  // Filters State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchDoctor, setSearchDoctor] = useState('');

  // Selected Doctor for Detailed History Modal / Drawer
  const [selectedDoctor, setSelectedDoctor] = useState<HospitalDoctor | null>(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState<'all' | 'visited' | 'not-visited' | 'waiting'>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper date checker
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) dateStr = todayStr;
    if (dateFilter === 'all') return true;
    if (dateFilter === 'today') return dateStr === todayStr;

    const tokDate = new Date(dateStr);
    const now = new Date();

    if (dateFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
      return tokDate >= oneWeekAgo && tokDate <= now;
    }
    if (dateFilter === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 86400000);
      return tokDate >= oneMonthAgo && tokDate <= now;
    }
    if (dateFilter === 'custom') {
      if (customStartDate && tokDate < new Date(customStartDate)) return false;
      if (customEndDate && tokDate > new Date(customEndDate)) return false;
      return true;
    }
    return true;
  };

  // Filtered tokens based on active date range
  const dateFilteredTokens = useMemo(() => {
    return tokens.filter(t => isDateInFilter(t.bookingDate));
  }, [tokens, dateFilter, customStartDate, customEndDate]);

  // Aggregate stats per doctor strictly based on completed/visited tokens
  const doctorRevenueStats = useMemo(() => {
    return doctors.map(doc => {
      const docTokens = dateFilteredTokens.filter(t => t.doctorId === doc.id);
      const completedTokens = docTokens.filter(t => t.status === 'completed');
      const notVisitedTokens = docTokens.filter(t => ['not-visited', 'skipped'].includes(t.status));
      const waitingTokens = docTokens.filter(t => ['booked', 'waiting', 'checked-in'].includes(t.status));

      const fee = doc.consultationFee || 500;
      // Revenue is strictly from visited consultations
      const earnedRevenue = completedTokens.reduce((acc, t) => acc + (t.consultationFee || fee), 0);
      const uncollectedAmount = notVisitedTokens.reduce((acc, t) => acc + (t.consultationFee || fee), 0);

      return {
        doctor: doc,
        totalBookings: docTokens.length,
        completedVisits: completedTokens.length,
        notVisitedCount: notVisitedTokens.length,
        waitingCount: waitingTokens.length,
        consultationFee: fee,
        earnedRevenue,
        uncollectedAmount
      };
    });
  }, [doctors, dateFilteredTokens]);

  const filteredDoctorStats = useMemo(() => {
    if (!searchDoctor.trim()) return doctorRevenueStats;
    const q = searchDoctor.toLowerCase();
    return doctorRevenueStats.filter(s =>
      s.doctor.name.toLowerCase().includes(q) ||
      s.doctor.specialization.toLowerCase().includes(q) ||
      s.doctor.departmentName.toLowerCase().includes(q)
    );
  }, [doctorRevenueStats, searchDoctor]);

  // Global Totals
  const totalEarnedRevenue = doctorRevenueStats.reduce((acc, d) => acc + d.earnedRevenue, 0);
  const totalCompletedVisits = doctorRevenueStats.reduce((acc, d) => acc + d.completedVisits, 0);
  const totalNotVisitedCount = doctorRevenueStats.reduce((acc, d) => acc + d.notVisitedCount, 0);
  const avgRevenuePerDoctor = doctors.length > 0 ? Math.round(totalEarnedRevenue / doctors.length) : 0;

  // Detailed tokens for selected doctor
  const selectedDoctorTokens = useMemo(() => {
    if (!selectedDoctor) return [];
    return dateFilteredTokens.filter(t => {
      if (t.doctorId !== selectedDoctor.id) return false;
      if (detailStatusFilter === 'visited' && t.status !== 'completed') return false;
      if (detailStatusFilter === 'not-visited' && !['not-visited', 'skipped'].includes(t.status)) return false;
      if (detailStatusFilter === 'waiting' && !['booked', 'waiting', 'checked-in'].includes(t.status)) return false;

      if (detailSearch.trim()) {
        const q = detailSearch.toLowerCase();
        return (
          t.patientName.toLowerCase().includes(q) ||
          t.patientPhone.includes(q) ||
          t.tokenNo.toString().includes(q)
        );
      }
      return true;
    });
  }, [selectedDoctor, dateFilteredTokens, detailStatusFilter, detailSearch]);

  const selectedDoctorCompletedTokens = useMemo(() => {
    if (!selectedDoctor) return [];
    return dateFilteredTokens.filter(t => t.doctorId === selectedDoctor.id && t.status === 'completed');
  }, [selectedDoctor, dateFilteredTokens]);

  const selectedDoctorEarnedRevenue = useMemo(() => {
    if (!selectedDoctor) return 0;
    return selectedDoctorCompletedTokens.reduce((acc, t) => acc + (t.consultationFee || selectedDoctor.consultationFee || 0), 0);
  }, [selectedDoctor, selectedDoctorCompletedTokens]);

  const handleMarkVisitedFromModal = (tokenId: string) => {
    updateTokenStatus(tokenId, 'completed');
  };

  const handleReleaseSlotFromModal = (tokenId: string) => {
    if (window.confirm('Are you sure you want to release this token slot?')) {
      deleteToken(tokenId);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm shadow-emerald-500/20">
              <DollarSign size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-tight">Revenue Overview & Doctor Financial Ledger</h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Calculated strictly on completed / visited consultations according to hospital business rules.
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          {(['today', 'week', 'month', 'all', 'custom'] as const).map(df => (
            <button
              key={df}
              onClick={() => setDateFilter(df)}
              className={`px-3 py-1.5 rounded-xl text-xs capitalize font-extrabold cursor-pointer transition-all border-none ${
                dateFilter === df
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {df === 'today' ? "Today" : df === 'week' ? "This Week" : df === 'month' ? "This Month" : df === 'all' ? "All Time" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      {dateFilter === 'custom' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 animate-fadeIn">
          <span>From:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={e => setCustomStartDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none font-medium"
          />
          <span>To:</span>
          <input
            type="date"
            value={customEndDate}
            onChange={e => setCustomEndDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none font-medium"
          />
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Realized Earned Revenue</span>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">₹{totalEarnedRevenue.toLocaleString('en-IN')}</h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">
              {totalCompletedVisits} Visited Consultations
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Visited Patients</span>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{totalCompletedVisits}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Successfully consulted</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Not Visited / Absent</span>
            <h3 className="text-3xl font-black text-amber-600 mt-1">{totalNotVisitedCount}</h3>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
              ₹0 Revenue Counted
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <UserX size={24} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Avg Revenue Per Doctor</span>
            <h3 className="text-3xl font-black text-purple-600 mt-1">₹{avgRevenuePerDoctor.toLocaleString('en-IN')}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">{doctors.length} active doctors</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* ── Doctor-Wise Revenue Breakdown Table ───────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Stethoscope size={16} className="text-blue-600" />
              <span>Doctor-Wise Revenue Breakdown (Phase 10)</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Click any doctor row to view patient-by-patient revenue ledger</p>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by doctor name..."
              value={searchDoctor}
              onChange={e => setSearchDoctor(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none w-56 focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Doctor Name & Specialty</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5 text-center">Visited / Completed</th>
                <th className="px-4 py-3.5 text-center">Not Visited / Absent</th>
                <th className="px-4 py-3.5 text-center">Consultation Fee</th>
                <th className="px-4 py-3.5 text-right">Earned Revenue</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {filteredDoctorStats.map(({ doctor, completedVisits, notVisitedCount, totalBookings, consultationFee, earnedRevenue }) => (
                <tr
                  key={doctor.id}
                  onClick={() => setSelectedDoctor(doctor)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={doctor.photo || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80'}
                        alt={doctor.name}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <p className="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors leading-tight">
                          {doctor.name}
                        </p>
                        <p className="text-[11px] text-blue-600 font-bold mt-0.5">{doctor.specialization}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="font-semibold text-slate-600">{doctor.departmentName}</span>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className="font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs">
                      {completedVisits} <span className="text-[10px] text-slate-400 font-semibold">/ {totalBookings}</span>
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className={`font-extrabold px-3 py-1 rounded-full text-xs ${
                      notVisitedCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {notVisitedCount} Absent
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center font-extrabold text-slate-800">
                    ₹{consultationFee}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <span className="font-black text-emerald-600 text-sm">
                      ₹{earnedRevenue.toLocaleString('en-IN')}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedDoctor(doctor); }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 ml-auto border-none cursor-pointer"
                    >
                      <span>History</span>
                      <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredDoctorStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-semibold">
                    No doctor records found matching search.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-black text-slate-900">
              <tr>
                <td className="px-5 py-4 text-sm" colSpan={2}>
                  Hospital Overall Totals
                </td>
                <td className="px-4 py-4 text-center text-sm text-emerald-700">{totalCompletedVisits} Visited</td>
                <td className="px-4 py-4 text-center text-sm text-amber-700">{totalNotVisitedCount} Absent</td>
                <td className="px-4 py-4 text-center">—</td>
                <td className="px-4 py-4 text-right text-emerald-700 text-base">₹{totalEarnedRevenue.toLocaleString('en-IN')}</td>
                <td className="px-5 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Doctor Revenue Detail Modal / Drawer (Phase 11) ─────────────────── */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={selectedDoctor.photo || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80'}
                  alt={selectedDoctor.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                />
                <div>
                  <h3 className="text-base font-black text-slate-800">{selectedDoctor.name} — Revenue History</h3>
                  <p className="text-xs text-blue-600 font-bold">
                    {selectedDoctor.specialization} · Fee: ₹{selectedDoctor.consultationFee} · Realized Revenue: <strong className="text-emerald-700 font-black">₹{selectedDoctorEarnedRevenue.toLocaleString('en-IN')}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer border-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Sub-bar */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailStatusFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer border transition-all ${
                    detailStatusFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  All ({dateFilteredTokens.filter(t => t.doctorId === selectedDoctor.id).length})
                </button>
                <button
                  onClick={() => setDetailStatusFilter('visited')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer border transition-all ${
                    detailStatusFilter === 'visited' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  Visited ({dateFilteredTokens.filter(t => t.doctorId === selectedDoctor.id && t.status === 'completed').length})
                </button>
                <button
                  onClick={() => setDetailStatusFilter('not-visited')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer border transition-all ${
                    detailStatusFilter === 'not-visited' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  Not Visited ({dateFilteredTokens.filter(t => t.doctorId === selectedDoctor.id && ['not-visited', 'skipped'].includes(t.status)).length})
                </button>
                <button
                  onClick={() => setDetailStatusFilter('waiting')}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer border transition-all ${
                    detailStatusFilter === 'waiting' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  In Queue / Waiting
                </button>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient, phone..."
                  value={detailSearch}
                  onChange={e => setDetailSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none w-52 font-medium"
                />
              </div>
            </div>

            {/* Modal Body: Transactions List */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3">Token No.</th>
                    <th className="px-3.5 py-3">Patient Details</th>
                    <th className="px-3.5 py-3">Date & Session</th>
                    <th className="px-3.5 py-3">Visit Status</th>
                    <th className="px-3.5 py-3 text-right">Consultation Fee</th>
                    <th className="px-3.5 py-3 text-right">Revenue Counted</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {selectedDoctorTokens.map(t => {
                    const isVisited = t.status === 'completed';
                    const isNotVisited = ['not-visited', 'skipped'].includes(t.status);
                    const fee = t.consultationFee || selectedDoctor.consultationFee || 500;

                    return (
                      <tr key={t.id} className={`hover:bg-slate-50/70 ${isVisited ? 'bg-emerald-50/20' : isNotVisited ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-3.5 py-3 font-mono font-extrabold text-slate-800">
                          #{t.tokenNo}
                        </td>
                        <td className="px-3.5 py-3">
                          <p className="font-extrabold text-slate-800">{t.patientName}</p>
                          <p className="text-[10px] text-slate-400">{t.patientPhone} · {t.patientAge}Y, {t.patientGender}</p>
                        </td>
                        <td className="px-3.5 py-3">
                          <p className="font-bold text-slate-700 capitalize">{t.session || 'Morning'} OPD</p>
                          <p className="text-[10px] text-slate-400">{t.bookingDate || todayStr} at {t.time}</p>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isVisited
                              ? 'bg-emerald-100 text-emerald-800'
                              : isNotVisited
                              ? 'bg-amber-100 text-amber-800'
                              : t.status === 'checked-in'
                              ? 'bg-blue-600 text-white'
                              : t.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isVisited ? 'Visited' : isNotVisited ? 'Not Visited' : t.status === 'checked-in' ? 'In Cabin' : t.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-extrabold text-slate-800">
                          ₹{fee}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          {isVisited ? (
                            <span className="font-black text-emerald-600 text-xs">
                              +₹{fee}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">
                              ₹0 (Excluded)
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isVisited && (
                              <button
                                onClick={() => handleMarkVisitedFromModal(t.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer border-none shadow-2xs flex items-center gap-1"
                                title="Mark as Visited to include in revenue"
                              >
                                <CheckCircle size={10} /> Mark Visited
                              </button>
                            )}
                            {isNotVisited && (
                              <button
                                onClick={() => handleReleaseSlotFromModal(t.id)}
                                className="px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg cursor-pointer border border-red-200"
                                title="Release / delete token slot"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {selectedDoctorTokens.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-semibold">
                        No transactions found for {selectedDoctor.name} matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-600">
                Visited: <strong className="text-emerald-700">{selectedDoctorCompletedTokens.length}</strong> · Realized Revenue: <strong className="text-emerald-700">₹{selectedDoctorEarnedRevenue.toLocaleString('en-IN')}</strong>
              </span>

              <button
                onClick={() => setSelectedDoctor(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold cursor-pointer border-none"
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
