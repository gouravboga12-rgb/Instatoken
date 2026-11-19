import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Search, DollarSign, RefreshCw, Clock, Wallet, CreditCard } from 'lucide-react';

export const BillingPayments: React.FC = () => {
  const { tokens } = useHospital();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const dateFilteredTokens = tokens.filter(t => {
    if (dateFilter === 'all') return true;
    const bDate = (t.bookingDate || '').split('T')[0];
    if (dateFilter === 'today') return bDate === todayStr;
    const tokDate = new Date(bDate || todayStr);
    const now = new Date();
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
      return tokDate >= oneWeekAgo && tokDate <= now;
    }
    if (dateFilter === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 86400000);
      return tokDate >= oneMonthAgo && tokDate <= now;
    }
    return true;
  });

  // Calculating dynamic finance metrics
  const totalRevenue = dateFilteredTokens
    .filter(t => t.paymentStatus === 'paid')
    .reduce((acc, curr) => acc + (Number(curr.consultationFee) || 0), 0);

  const pendingRevenue = dateFilteredTokens
    .filter(t => t.paymentStatus === 'pending')
    .reduce((acc, curr) => acc + (Number(curr.consultationFee) || 0), 0);

  const refundedRevenue = dateFilteredTokens
    .filter(t => t.paymentStatus === 'refunded')
    .reduce((acc, curr) => acc + (Number(curr.consultationFee) || 0), 0);

  const onlineCollected = dateFilteredTokens
    .filter(t => t.paymentStatus === 'paid' && (t.paymentMethod?.toLowerCase().includes('online') || t.paymentMethod?.toLowerCase().includes('razorpay') || t.paymentMethod?.toLowerCase().includes('upi')))
    .reduce((acc, curr) => acc + (Number(curr.consultationFee) || 0), 0);

  const cashCollected = dateFilteredTokens
    .filter(t => t.paymentStatus === 'paid' && (t.paymentMethod?.toLowerCase().includes('cash') || !t.paymentMethod || t.paymentMethod?.toLowerCase().includes('counter')))
    .reduce((acc, curr) => acc + (Number(curr.consultationFee) || 0), 0);

  const filteredPayments = dateFilteredTokens.filter(t => {
    const matchesSearch =
      (t.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.patientPhone || '').includes(search) ||
      (t.doctorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.id || '').includes(search) ||
      String(t.tokenNo).includes(search);
    const matchesStatus = statusFilter === 'All' || (t.paymentStatus || 'pending').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const paymentStatusColors: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    refunded: 'bg-red-100 text-red-700 border-red-200'
  };

  const dateLabel = dateFilter === 'today' ? "Today's" : dateFilter === 'week' ? "This Week's" : dateFilter === 'month' ? "This Month's" : "Total";

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800">Billing & Transactions</h2>
          <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">Real-time ledger of patient consultation fee collections, modes, and refunds</p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex bg-slate-100 rounded-xl p-1 shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
          {[
            { key: 'all', label: 'All Time' },
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' }
          ].map(d => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDateFilter(d.key as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border-none shrink-0 ${
                dateFilter === d.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Finance Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          { label: `${dateLabel} Collected`, val: `₹${totalRevenue.toLocaleString()}`, sub: `₹${onlineCollected.toLocaleString()} Online · ₹${cashCollected.toLocaleString()} Cash`, icon: <DollarSign size={18} />, color: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Pending Cabin Fee', val: `₹${pendingRevenue.toLocaleString()}`, sub: 'Pay-at-Hospital Desk', icon: <Clock size={18} />, color: 'bg-amber-500/10 text-amber-600' },
          { label: 'Online Collections', val: `₹${onlineCollected.toLocaleString()}`, sub: 'Razorpay / UPI Full Online', icon: <CreditCard size={18} />, color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Refunded / Cancelled', val: `₹${refundedRevenue.toLocaleString()}`, sub: 'Cancelled Appointments', icon: <RefreshCw size={18} />, color: 'bg-red-500/10 text-red-600' }
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{s.label}</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{s.val}</h3>
              <span className="text-[10px] text-slate-400 mt-1 block truncate max-w-[160px] sm:max-w-none">{s.sub}</span>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-xl ${s.color} shrink-0`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Main Full-Width Payments Table */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, phone, doctor, token #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
            />
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 shrink-0 overflow-x-auto">
            {['All', 'Paid', 'Pending', 'Refunded'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border-none shrink-0 ${
                  statusFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[750px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Token / Txn', 'Patient Details', 'Doctor & Specialty', 'Consultation Fee', 'Payment Mode', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-medium">
                      No billing records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => {
                    const payMethod = p.paymentMethod || (p.paymentStatus === 'paid' ? 'Online / Desk' : 'Pay at Hospital');
                    const isOnline = payMethod.toLowerCase().includes('online') || payMethod.toLowerCase().includes('razorpay') || payMethod.toLowerCase().includes('upi');

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-blue-600">#{p.tokenNo}</span>
                            <span className="text-[9.5px] text-slate-400 font-mono">({(p.id || '').slice(-6)})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800 leading-none">{p.patientName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.patientPhone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700 leading-none">{p.doctorName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.departmentName}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-black text-sm">
                          ₹{p.consultationFee || 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isOnline
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isOnline ? <CreditCard size={10} /> : <Wallet size={10} />}
                            <span>{payMethod.replace(/\s*\(.*\)/, '')}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[9.5px] font-bold px-2.5 py-0.5 border rounded-full capitalize ${paymentStatusColors[p.paymentStatus] || 'bg-slate-100 text-slate-700'}`}>
                            {p.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {p.bookingDate || todayStr} {p.time ? `· ${p.time}` : ''}
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
    </div>
  );
};
