import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Search, Download, DollarSign, RefreshCw, Clock } from 'lucide-react';

export const BillingPayments: React.FC = () => {
  const { tokens, doctors } = useHospital();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Calculating dynamic finance metrics
  const totalRevenue = tokens
    .filter(t => t.paymentStatus === 'paid')
    .reduce((acc, curr) => acc + curr.consultationFee, 0);

  const pendingRevenue = tokens
    .filter(t => t.paymentStatus === 'pending')
    .reduce((acc, curr) => acc + curr.consultationFee, 0);

  const refundedRevenue = tokens
    .filter(t => t.paymentStatus === 'refunded')
    .reduce((acc, curr) => acc + curr.consultationFee, 0);

  const filteredPayments = tokens.filter(t => {
    const matchesSearch = t.patientName.toLowerCase().includes(search.toLowerCase()) ||
                          t.patientPhone.includes(search) ||
                          t.id.includes(search);
    const matchesStatus = statusFilter === 'All' || t.paymentStatus === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const paymentStatusColors: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    refunded: 'bg-red-100 text-red-750 border-red-200'
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800">Billing & Transactions</h2>
        <p className="text-xs text-slate-400 mt-1">Manage consultation fee collections, GST breakdowns, and patient refunds</p>
      </div>

      {/* Finance Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Today\'s Total Revenue', val: `₹${totalRevenue.toLocaleString()}`, sub: 'Direct Settlement', icon: <DollarSign size={18} />, color: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Pending Collections', val: `₹${pendingRevenue.toLocaleString()}`, sub: 'Pay-at-Hospital Cabin', icon: <Clock size={18} />, color: 'bg-amber-500/10 text-amber-600' },
          { label: 'Refunded Tokens', val: `₹${refundedRevenue.toLocaleString()}`, sub: 'Cancelled Appointments', icon: <RefreshCw size={18} />, color: 'bg-red-500/10 text-red-600' }
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{s.label}</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{s.val}</h3>
              <span className="text-[10px] text-slate-400 mt-1 block">{s.sub}</span>
            </div>
            <div className={`p-3 rounded-xl ${s.color}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Payments Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
              <input
                type="text"
                placeholder="Search patient, phone, transaction ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
              {['All', 'Paid', 'Pending', 'Refunded'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border-none ${
                    statusFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Txn ID', 'Patient', 'Doc Consultation', 'Fee', 'GST (18%)', 'Total Paid', 'Status', 'Invoice'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(p => {
                    const gst = parseFloat((p.consultationFee * 0.18).toFixed(2));
                    const total = p.consultationFee + gst;
                    return (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-xs">
                        <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{p.id.slice(0, 8)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 leading-none">{p.patientName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.patientPhone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700 leading-none">{p.doctorName}</p>
                          <p className="text-[10px] text-slate-450 mt-0.5">{p.departmentName}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-655 font-bold">₹{p.consultationFee}</td>
                        <td className="px-4 py-3 text-slate-450">₹{gst}</td>
                        <td className="px-4 py-3 text-slate-800 font-extrabold">₹{total}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full capitalize ${paymentStatusColors[p.paymentStatus] || 'bg-slate-100 text-slate-700'}`}>
                            {p.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl cursor-pointer border-none transition-colors" title="Download Tax Invoice">
                            <Download size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Doctor Cabin Fee configuration */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Consultation Fee Settings</h3>
            <div className="space-y-3">
              {doctors.map(doc => (
                <div key={doc.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-none">
                  <div>
                    <p className="font-bold text-slate-800">{doc.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{doc.specialization}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-800 text-sm">₹{doc.consultationFee}</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Base + 18% GST</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
