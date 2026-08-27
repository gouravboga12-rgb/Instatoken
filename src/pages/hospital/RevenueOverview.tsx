import React, { useState, useMemo } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalDoctor } from '../../context/HospitalContext';
import {
  DollarSign, TrendingUp, ChevronRight,
  Search, Clock, CheckCircle2,
  Stethoscope, X
} from 'lucide-react';

export const RevenueOverview: React.FC = () => {
  const { doctors, tokens } = useHospital();

  // Filters State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchDoctor, setSearchDoctor] = useState('');

  // Selected Doctor for Detailed History Modal / Drawer
  const [selectedDoctor, setSelectedDoctor] = useState<HospitalDoctor | null>(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState('all');

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

  // Aggregate stats per doctor
  const doctorRevenueStats = useMemo(() => {
    return doctors.map(doc => {
      const docTokens = dateFilteredTokens.filter(t => t.doctorId === doc.id);
      const completedTokens = docTokens.filter(t => t.status === 'completed');
      const paidTokens = docTokens.filter(t => t.paymentStatus === 'paid');
      const pendingTokens = docTokens.filter(t => t.paymentStatus === 'pending');

      const fee = doc.consultationFee || 500;
      const completedRevenue = completedTokens.reduce((acc, t) => acc + (t.consultationFee || fee), 0);
      const paidRevenue = paidTokens.reduce((acc, t) => acc + (t.consultationFee || fee), 0);
      const pendingRevenue = pendingTokens.reduce((acc, t) => acc + (t.consultationFee || fee), 0);

      return {
        doctor: doc,
        totalBookings: docTokens.length,
        completedVisits: completedTokens.length,
        paidVisits: paidTokens.length,
        pendingVisits: pendingTokens.length,
        consultationFee: fee,
        earnedRevenue: paidRevenue || completedRevenue,
        pendingAmount: pendingRevenue
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
  const totalPendingAmount = doctorRevenueStats.reduce((acc, d) => acc + d.pendingAmount, 0);
  const avgRevenuePerDoctor = doctors.length > 0 ? Math.round(totalEarnedRevenue / doctors.length) : 0;

  // Detailed tokens for selected doctor
  const selectedDoctorTokens = useMemo(() => {
    if (!selectedDoctor) return [];
    return dateFilteredTokens.filter(t => {
      if (t.doctorId !== selectedDoctor.id) return false;
      if (detailStatusFilter !== 'all' && t.status !== detailStatusFilter) return false;
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
                Dynamic backend-calculated consultation collections, visit counts, and doctor revenue drilldown.
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
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Realized Revenue</span>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">₹{totalEarnedRevenue.toLocaleString()}</h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">
              {totalCompletedVisits} Completed Visits
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Completed Consultations</span>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{totalCompletedVisits}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Across all doctor cabins</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pending Desk Collections</span>
            <h3 className="text-3xl font-black text-amber-600 mt-1">₹{totalPendingAmount.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Pay-at-counter tokens</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Avg Revenue Per Doctor</span>
            <h3 className="text-3xl font-black text-purple-600 mt-1">₹{avgRevenuePerDoctor.toLocaleString()}</h3>
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
              <span>Doctor-Wise Revenue Breakdown</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Click any doctor row to view their granular patient-by-patient revenue ledger</p>
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
                <th className="px-4 py-3.5 text-center">Completed Visits</th>
                <th className="px-4 py-3.5 text-center">Consultation Fee</th>
                <th className="px-4 py-3.5 text-right">Earned Revenue</th>
                <th className="px-4 py-3.5 text-right">Pending Amount</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {filteredDoctorStats.map(({ doctor, completedVisits, totalBookings, consultationFee, earnedRevenue, pendingAmount }) => (
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
                    <span className="font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-full text-xs">
                      {completedVisits} <span className="text-[10px] text-slate-400 font-semibold">/ {totalBookings}</span>
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center font-extrabold text-slate-800">
                    ₹{consultationFee}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <span className="font-black text-emerald-600 text-sm">
                      ₹{earnedRevenue.toLocaleString()}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <span className={`font-bold text-xs ${pendingAmount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      ₹{pendingAmount.toLocaleString()}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedDoctor(doctor); }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 ml-auto border-none cursor-pointer"
                    >
                      <span>Details</span>
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
                <td className="px-4 py-4 text-center text-sm">{totalCompletedVisits} Visits</td>
                <td className="px-4 py-4 text-center">—</td>
                <td className="px-4 py-4 text-right text-emerald-700 text-base">₹{totalEarnedRevenue.toLocaleString()}</td>
                <td className="px-4 py-4 text-right text-amber-700 text-sm">₹{totalPendingAmount.toLocaleString()}</td>
                <td className="px-5 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Doctor Revenue Detail Modal / Drawer ───────────────────────────── */}
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
                    {selectedDoctor.specialization} · Fee: ₹{selectedDoctor.consultationFee}
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
                <select
                  value={detailStatusFilter}
                  onChange={e => setDetailStatusFilter(e.target.value)}
                  className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none"
                >
                  <option value="all">All Visits ({selectedDoctorTokens.length})</option>
                  <option value="completed">Completed / Visited</option>
                  <option value="booked">Booked / Waiting</option>
                  <option value="skipped">Skipped</option>
                </select>
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
                    <th className="px-3.5 py-3">Patient</th>
                    <th className="px-3.5 py-3">Date & Session</th>
                    <th className="px-3.5 py-3">Source</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3 text-right">Fee / Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {selectedDoctorTokens.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="px-3.5 py-3 font-mono font-extrabold text-slate-800">
                        #{t.tokenNo}
                      </td>
                      <td className="px-3.5 py-3">
                        <p className="font-extrabold text-slate-800">{t.patientName}</p>
                        <p className="text-[10px] text-slate-400">{t.patientPhone} · {t.patientAge}Y</p>
                      </td>
                      <td className="px-3.5 py-3">
                        <p className="font-bold text-slate-700 capitalize">{t.session || 'Morning'}</p>
                        <p className="text-[10px] text-slate-400">{t.bookingDate || todayStr} {t.time}</p>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          t.type === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {t.type === 'online' ? 'Customer App' : 'Desk'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                          t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'checked-in' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <span className="font-black text-slate-900 text-xs block">₹{t.consultationFee || selectedDoctor.consultationFee}</span>
                        <span className={`text-[9px] font-bold capitalize ${t.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {t.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {selectedDoctorTokens.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-semibold">
                        No transactions found for {selectedDoctor.name} in this time window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-500">
                Total Visits: {selectedDoctorTokens.length} · Total Revenue: <strong className="text-emerald-700">₹{selectedDoctorTokens.reduce((acc, t) => acc + (t.consultationFee || selectedDoctor.consultationFee || 0), 0)}</strong>
              </span>

              <button
                onClick={() => setSelectedDoctor(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold cursor-pointer border-none"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
