import React, { useState, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Radio, CheckCircle, Play, RefreshCw } from 'lucide-react';

export const LiveQueue: React.FC = () => {
  const { tokens, doctors, updateTokenStatus } = useHospital();
  
  // Real-time ticking clock / wait time simulator
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const int = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(int);
  }, []);

  const todayTokens = tokens;
  
  // Metrics
  const completed = todayTokens.filter(t => t.status === 'completed').length;
  const waiting = todayTokens.filter(t => t.status === 'waiting').length;
  const booked = todayTokens.filter(t => t.status === 'booked').length;
  const checkedIn = todayTokens.filter(t => t.status === 'checked-in').length;
  const totalWaiting = waiting + booked + checkedIn;
  const cancelled = todayTokens.filter(t => t.status === 'cancelled').length;
  const skipped = todayTokens.filter(t => t.status === 'skipped').length;
  
  // Calculate average waiting time dynamically
  const activeWait = Math.round(totalWaiting * 12 / (doctors.filter(d => d.active).length || 1));

  // Find currently running token per doctor (first checked-in/waiting)
  const getDoctorActiveToken = (docId: string) => {
    return todayTokens.find(t => t.doctorId === docId && t.status === 'checked-in') ||
           todayTokens.find(t => t.doctorId === docId && t.status === 'waiting');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">Live OPD Queue Board</h2>
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulse ? 'bg-red-500' : 'bg-red-450'}`} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-650" />
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Real-time cabin monitors and active patient queues</p>
        </div>
        <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 shadow-sm">
          <RefreshCw size={12} className="animate-spin text-blue-600" />
          <span>Syncing automatically</span>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1 lg:col-span-2">
          <Radio size={30} className="absolute right-3 top-3 opacity-15" />
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">Avg Waiting Time</span>
          <h3 className="text-3xl font-black mt-1">~{activeWait} mins</h3>
          <p className="text-[10px] opacity-90 mt-1">Across all active doctor cabins</p>
        </div>

        {[
          { label: 'Active Queue', val: totalWaiting, sub: `${checkedIn} checked-in`, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Completed Today', val: completed, sub: 'Visits concluded', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Skipped', val: skipped, sub: 'Called but absent', color: 'text-slate-600', bg: 'bg-slate-500/10' },
          { label: 'Cancelled', val: cancelled, sub: 'Patient cancelled', color: 'text-red-600', bg: 'bg-red-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{s.label}</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{s.val}</h3>
            <span className={`text-[9px] font-semibold mt-1 block ${s.color}`}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Doctor-wise Cabin Queue Monitors */}
      <div>
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Doctor Cabin Live View</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {doctors.filter(d => d.active).map(doc => {
            const activeToken = getDoctorActiveToken(doc.id);
            const docQueue = todayTokens.filter(t => t.doctorId === doc.id && ['booked','waiting','checked-in'].includes(t.status));
            
            return (
              <div key={doc.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{doc.name}</h4>
                    <p className="text-[10px] text-blue-600 font-extrabold uppercase mt-0.5 tracking-wider">{doc.specialization}</p>
                  </div>
                  <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">Cabin Active</span>
                </div>

                {/* Currently Serving Display */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Serving Token</span>
                    {activeToken ? (
                      <div>
                        <span className="text-3xl font-black text-blue-400">#{activeToken.tokenNo}</span>
                        <p className="text-[10px] text-slate-300 font-semibold mt-0.5 truncate max-w-[150px]">{activeToken.patientName}</p>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-400 block mt-1">No Patient inside</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {activeToken && (
                      <button
                        onClick={() => updateTokenStatus(activeToken.id, 'completed')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl border-none cursor-pointer transition-colors"
                        title="Mark Consult Completed"
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Queue list */}
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Upcoming Queue ({docQueue.length})</span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {docQueue.map((tok, idx) => (
                      <div key={tok.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800">#{tok.tokenNo}</span>
                          <span className="text-slate-600 truncate max-w-[120px]">{tok.patientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full capitalize ${tok.status === 'checked-in' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                            {tok.status.replace('-',' ')}
                          </span>
                          {idx === 0 && (
                            <button
                              onClick={() => updateTokenStatus(tok.id, 'checked-in')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer border-none flex items-center gap-0.5"
                            >
                              Call <Play size={8} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {docQueue.length === 0 && (
                      <p className="text-center text-[10px] text-slate-400 py-4">Queue is empty</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
