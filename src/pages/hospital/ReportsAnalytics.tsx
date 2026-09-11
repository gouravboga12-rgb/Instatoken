import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Download, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';

export const ReportsAnalytics: React.FC = () => {
  const { tokens, doctors } = useHospital();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Compute live metrics based on real tokens
  const total = tokens.length;
  const completed = tokens.filter(t => t.status === 'completed').length;
  const cancelled = tokens.filter(t => t.status === 'cancelled').length;
  const waiting = tokens.filter(t => ['booked', 'waiting', 'checked-in', 'in-cabin', 'calling', 'late-coming'].includes(t.status)).length;
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
  
  // Strict revenue integrity: realized revenue from completed consultations
  const totalRevenue = tokens
    .filter(t => t.status === 'completed' || t.paymentStatus === 'paid')
    .reduce((acc, curr) => acc + (Number(curr.consultationFee) || 0), 0);

  const avgWait = tokens.length > 0
    ? Math.round(tokens.reduce((acc, curr) => acc + (Number(curr.estimatedWait) || 15), 0) / tokens.length)
    : 15;

  // Compute actual hourly load from tokens
  const hourSlots = ['09:00', '10:00', '11:00', '12:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00'];
  const hourlyCounts = hourSlots.map(slot => {
    const slotHour = parseInt(slot.split(':')[0], 10);
    const count = tokens.filter(t => {
      if (!t.time) return false;
      const tHour = parseInt(t.time.split(':')[0], 10);
      return tHour === slotHour || tHour === (slotHour % 12);
    }).length;
    return { hr: slot, count };
  });

  const maxCount = Math.max(1, ...hourlyCounts.map(h => h.count));
  const hourlyDistribution = hourlyCounts.map(h => ({
    hr: h.hr,
    count: h.count,
    load: Math.round((h.count / maxCount) * 100)
  }));

  // Export functions
  const downloadCSV = (filename: string, rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadNotice(`✓ Downloaded ${filename}`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const handleDownloadFootprint = () => {
    const header = ['Token #', 'Patient Name', 'Phone', 'Age', 'Gender', 'Doctor', 'Department', 'Date', 'Time', 'Status'];
    const rows = tokens.map(t => [
      String(t.tokenNo ?? ''),
      t.patientName || '',
      t.patientPhone || '',
      String(t.patientAge || ''),
      t.patientGender || '',
      t.doctorName || '',
      t.departmentName || '',
      t.bookingDate || '',
      t.time || '',
      t.status || ''
    ]);
    downloadCSV(`Patient_Footprint_Report_${new Date().toISOString().split('T')[0]}.csv`, [header, ...rows]);
  };

  const handleDownloadLedger = () => {
    const header = ['Token #', 'Patient Name', 'Doctor', 'Department', 'Consultation Fee', 'Payment Status', 'Payment Method', 'Date'];
    const rows = tokens.map(t => [
      String(t.tokenNo ?? ''),
      t.patientName || '',
      t.doctorName || '',
      t.departmentName || '',
      String(t.consultationFee || 0),
      t.paymentStatus || 'paid',
      t.paymentMethod || 'Online',
      t.bookingDate || ''
    ]);
    downloadCSV(`Financial_Settlement_Ledger_${new Date().toISOString().split('T')[0]}.csv`, [header, ...rows]);
  };

  const handleDownloadQueue = () => {
    const header = ['Doctor ID', 'Doctor Name', 'Department', 'Total Tokens', 'Completed', 'Waiting', 'Cancelled', 'Realized Revenue (INR)'];
    const rows = doctors.map(d => {
      const dToks = tokens.filter(t => t.doctorId === d.id);
      const dCompleted = dToks.filter(t => t.status === 'completed').length;
      const dWaiting = dToks.filter(t => ['booked', 'waiting', 'checked-in', 'in-cabin'].includes(t.status)).length;
      const dCancelled = dToks.filter(t => t.status === 'cancelled').length;
      const dRev = dToks.filter(t => t.status === 'completed' || t.paymentStatus === 'paid').reduce((s, t) => s + (t.consultationFee || 0), 0);
      return [d.id, d.name, d.specialization || d.departmentName || '', String(dToks.length), String(dCompleted), String(dWaiting), String(dCancelled), String(dRev)];
    });
    downloadCSV(`Queue_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`, [header, ...rows]);
  };

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

      {downloadNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {downloadNotice}
        </div>
      )}

      {/* Overview Metric Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Settled Revenue', val: `₹${totalRevenue.toLocaleString('en-IN')}`, change: `${completed} Completed`, sub: 'realized clinical revenue', color: 'text-emerald-500' },
          { label: 'Total OPD Tokens', val: total, change: `${waiting} Active`, sub: 'total tokens logged', color: 'text-blue-500' },
          { label: 'Cancellation Rate', val: `${cancelRate}%`, change: `${cancelled} Cancelled`, sub: 'patient dropped tokens', color: 'text-red-500' },
          { label: 'Avg Waiting Queue', val: `${avgWait}m`, change: `${waiting} in queue`, sub: 'estimated cabin latency', color: 'text-purple-500' }
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
        {/* Left chart */}
        <div className="xl:col-span-2 space-y-6">
          {/* Hourly Peak occupancy chart */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wide">OPD Load by Hours</h4>
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {total} Tokens Tracked
              </span>
            </div>
            <div className="flex items-end justify-between h-48 gap-2 pt-6 border-b border-slate-100 px-2">
              {hourlyDistribution.map(h => (
                <div key={h.hr} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                  <div
                    className="w-full bg-blue-600 rounded-t-lg transition-all group-hover:bg-blue-700 relative min-h-[4px]"
                    style={{ height: `${Math.max(4, h.load)}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-slate-900 text-white rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {h.count} tokens
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold tracking-tight">{h.hr}</span>
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
                const docRevenue = docTokens
                  .filter(t => t.status === 'completed' || t.paymentStatus === 'paid')
                  .reduce((acc, curr) => acc + (Number(curr.consultationFee) || 0), 0);
                const docCompleted = docTokens.filter(t => t.status === 'completed').length;
                const docLoad = docTokens.length;
                return (
                  <div key={d.id} className="flex items-center justify-between text-xs py-3 border-b border-slate-50 last:border-none">
                    <div>
                      <p className="font-bold text-slate-800">{d.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{d.specialization || d.departmentName}</p>
                    </div>
                    <div className="flex gap-8 text-right">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Bookings</span>
                        <span className="text-slate-800 font-extrabold">{docLoad} ({docCompleted} done)</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Realized Revenue</span>
                        <span className="text-emerald-600 font-extrabold">₹{docRevenue.toLocaleString('en-IN')}</span>
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
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">Generate structured exports of current clinical logs and financial records</p>
            
            <div className="space-y-2">
              <button
                onClick={handleDownloadFootprint}
                className="w-full flex items-center justify-between border border-slate-100 hover:border-slate-200 hover:bg-slate-50 p-3 rounded-2xl transition-all cursor-pointer bg-white"
              >
                <div className="flex items-center gap-2 text-left">
                  <FileText className="text-red-500" size={16} />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Patient Footprint Report</p>
                    <p className="text-[9px] text-slate-400">Download CSV of all patient visits</p>
                  </div>
                </div>
                <Download size={14} className="text-slate-400" />
              </button>

              <button
                onClick={handleDownloadLedger}
                className="w-full flex items-center justify-between border border-slate-100 hover:border-slate-200 hover:bg-slate-50 p-3 rounded-2xl transition-all cursor-pointer bg-white"
              >
                <div className="flex items-center gap-2 text-left">
                  <FileSpreadsheet className="text-emerald-500" size={16} />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Financial Settlement Ledger</p>
                    <p className="text-[9px] text-slate-400">Download CSV of financial settlements</p>
                  </div>
                </div>
                <Download size={14} className="text-slate-400" />
              </button>

              <button
                onClick={handleDownloadQueue}
                className="w-full flex items-center justify-between border border-slate-100 hover:border-slate-200 hover:bg-slate-50 p-3 rounded-2xl transition-all cursor-pointer bg-white"
              >
                <div className="flex items-center gap-2 text-left">
                  <FileSpreadsheet className="text-blue-500" size={16} />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Queue & Doctor Analytics</p>
                    <p className="text-[9px] text-slate-400">Download CSV of doctor-wise metrics</p>
                  </div>
                </div>
                <Download size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
