import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

export const ReportsAnalytics: React.FC = () => {
  const { tokens, doctors } = useHospital();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Compute mock reports based on live metrics
  const total = tokens.length;
  const cancelled = tokens.filter(t => t.status === 'cancelled').length;
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
  
  const totalRevenue = tokens
    .filter(t => t.paymentStatus === 'paid')
    .reduce((acc, curr) => acc + curr.consultationFee, 0);

  const avgWait = 25; // mins mock

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Reports & Diagnostics</h2>
          <p className="text-xs text-slate-400 mt-1">Audit operational efficiency, doctor footprints, and financial settlements</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 shrink-0 self-start">
          {['daily', 'weekly', 'monthly'].map(r => (
            <button
              key={r}
              onClick={() => setReportType(r as any)}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer capitalize transition-all border-none ${
                reportType === r ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Metric Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Settled revenue', val: `₹${totalRevenue.toLocaleString()}`, change: '+12.4%', sub: 'vs last window', color: 'text-emerald-500' },
          { label: 'OPD Appointments', val: total, change: '+18.2%', sub: 'bookings made', color: 'text-blue-500' },
          { label: 'Cancellation Rate', val: `${cancelRate}%`, change: '-2.1%', sub: 'patient drops', color: 'text-red-500' },
          { label: 'Avg Waiting Queue', val: `${avgWait}m`, change: '-4 mins', sub: 'cabin latency', color: 'text-purple-500' }
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{s.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-800">{s.val}</h3>
              <span className={`text-[10px] font-bold ${s.color}`}>{s.change}</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-0.5 block">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left chart placeholders */}
        <div className="xl:col-span-2 space-y-6">
          {/* Hourly Peak occupancy chart */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wide mb-5">Peak OPD Load Hours</h4>
            <div className="flex items-end justify-between h-48 gap-2 pt-6 border-b border-slate-100 px-2">
              {[
                { hr: '09:00', load: 45 }, { hr: '10:00', load: 80 }, { hr: '11:00', load: 95 }, { hr: '12:00', load: 70 },
                { hr: '01:00', load: 30 }, { hr: '02:00', load: 50 }, { hr: '03:00', load: 60 }, { hr: '04:00', load: 75 },
                { hr: '05:00', load: 90 }, { hr: '06:00', load: 85 }, { hr: '07:00', load: 55 }, { hr: '08:00', load: 25 }
              ].map(h => (
                <div key={h.hr} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                  <div className="w-full bg-blue-600 rounded-t-lg transition-all group-hover:bg-blue-750 relative" style={{ height: `${h.load}%` }}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-slate-900 text-white rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {h.load}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-450 font-bold tracking-tight">{h.hr}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Performance Summary */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Doctor Performance Analytics</h4>
            <div className="space-y-3">
              {doctors.map(d => {
                const docTokens = tokens.filter(t => t.doctorId === d.id);
                const docRevenue = docTokens.filter(t => t.paymentStatus === 'paid').reduce((acc, curr) => acc + curr.consultationFee, 0);
                const docLoad = docTokens.length;
                return (
                  <div key={d.id} className="flex items-center justify-between text-xs py-3 border-b border-slate-50 last:border-none">
                    <div>
                      <p className="font-bold text-slate-800">{d.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{d.specialization}</p>
                    </div>
                    <div className="flex gap-8 text-right">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Bookings</span>
                        <span className="text-slate-800 font-extrabold">{docLoad} tokens</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Revenue</span>
                        <span className="text-emerald-600 font-extrabold">₹{docRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Download Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Download Audits</h3>
            <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">Generate structured exports of current clinical logs</p>
            
            <div className="space-y-2">
              {[
                { label: 'Patient Footprint Report', format: 'PDF', icon: <FileText className="text-red-500" size={16} /> },
                { label: 'Financial Settlement Ledger', format: 'Excel', icon: <FileSpreadsheet className="text-emerald-500" size={16} /> },
                { label: 'Queue Cancel/Wait Analytics', format: 'CSV', icon: <FileSpreadsheet className="text-blue-500" size={16} /> }
              ].map(d => (
                <button
                  key={d.label}
                  className="w-full flex items-center justify-between border border-slate-100 hover:border-slate-200 hover:bg-slate-50 p-3 rounded-2xl transition-all cursor-pointer bg-white"
                >
                  <div className="flex items-center gap-2 text-left">
                    {d.icon}
                    <div>
                      <p className="text-xs font-bold text-slate-700">{d.label}</p>
                      <p className="text-[9px] text-slate-450">Download file in {d.format} format</p>
                    </div>
                  </div>
                  <Download size={14} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
