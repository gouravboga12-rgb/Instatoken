import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { SessionConfig } from '../../context/HospitalContext';
import { Clock, Zap, Edit3, Save, Check, AlertCircle } from 'lucide-react';

interface ScheduleManagementProps {
  tab?: 'sessions' | 'auto';
}

export const ScheduleManagement: React.FC<ScheduleManagementProps> = ({ tab: initialTab = 'sessions' }) => {
  const { scheduleConfig, updateScheduleConfig, updateSession } = useHospital();
  const [activeTab, setActiveTab] = useState<'sessions' | 'auto'>(initialTab);

  // Auto Scheduling state forms
  const [autoForm, setAutoForm] = useState({
    bookingOpensDaysBefore: String(scheduleConfig.bookingOpensDaysBefore),
    advanceBookingLimit: String(scheduleConfig.advanceBookingLimit),
    bufferTime: String(scheduleConfig.bufferTime),
    dailyTokenLimit: String(scheduleConfig.dailyTokenLimit),
    walkInPercentage: String(scheduleConfig.walkInPercentage),
    onlinePercentage: String(scheduleConfig.onlinePercentage),
    emergencySlots: String(scheduleConfig.emergencySlots),
    autoContinuity: scheduleConfig.autoContinuity
  });

  const [savingAuto, setSavingAuto] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit Session Form state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessForm, setSessForm] = useState({
    startTime: '',
    endTime: '',
    maxTokens: '50',
    consultationDuration: '15',
    breakTime: '5',
    active: true
  });

  const handleAutoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAuto(true);
    setSaveSuccess(false);
    
    // Simulate API delay
    setTimeout(() => {
      updateScheduleConfig({
        bookingOpensDaysBefore: parseInt(autoForm.bookingOpensDaysBefore),
        advanceBookingLimit: parseInt(autoForm.advanceBookingLimit),
        bufferTime: parseInt(autoForm.bufferTime),
        dailyTokenLimit: parseInt(autoForm.dailyTokenLimit),
        walkInPercentage: parseInt(autoForm.walkInPercentage),
        onlinePercentage: parseInt(autoForm.onlinePercentage),
        emergencySlots: parseInt(autoForm.emergencySlots),
        autoContinuity: autoForm.autoContinuity
      });
      setSavingAuto(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 500);
  };

  const startEditSession = (sess: SessionConfig) => {
    setEditingSessionId(sess.id);
    setSessForm({
      startTime: sess.startTime,
      endTime: sess.endTime,
      maxTokens: String(sess.maxTokens),
      consultationDuration: String(sess.consultationDuration),
      breakTime: String(sess.breakTime),
      active: sess.active
    });
  };

  const handleSessionSave = (id: string) => {
    updateSession(id, {
      startTime: sessForm.startTime,
      endTime: sessForm.endTime,
      maxTokens: parseInt(sessForm.maxTokens),
      consultationDuration: parseInt(sessForm.consultationDuration),
      breakTime: parseInt(sessForm.breakTime),
      active: sessForm.active
    });
    setEditingSessionId(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">OPD Shift Scheduler</h2>
          <p className="text-xs text-slate-400 mt-1">Configure morning/evening cabins and automatic token availability</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all border-none ${
              activeTab === 'sessions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            OPD Sessions
          </button>
          <button
            onClick={() => setActiveTab('auto')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all border-none ${
              activeTab === 'auto' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Auto Booking Rules
          </button>
        </div>
      </div>

      {/* ─── OPD SESSIONS TAB ────────────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            {scheduleConfig.sessions.map(sess => {
              const isEditing = editingSessionId === sess.id;
              return (
                <div key={sess.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 text-blue-600 p-2 rounded-xl"><Clock size={16} /></div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{sess.name} Session</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">{sess.startTime} - {sess.endTime}</p>
                      </div>
                    </div>
                    
                    {isEditing ? (
                      <button
                        onClick={() => handleSessionSave(sess.id)}
                        className="bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer border-none flex items-center gap-1 hover:bg-blue-700 transition-colors"
                      >
                        <Save size={12} /> Save
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditSession(sess)}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-50 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Start Time</label>
                        <input type="text" value={sessForm.startTime} onChange={e => setSessForm({...sessForm, startTime: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">End Time</label>
                        <input type="text" value={sessForm.endTime} onChange={e => setSessForm({...sessForm, endTime: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Max Tokens</label>
                        <input type="number" value={sessForm.maxTokens} onChange={e => setSessForm({...sessForm, maxTokens: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Consultation Time (m)</label>
                        <input type="number" value={sessForm.consultationDuration} onChange={e => setSessForm({...sessForm, consultationDuration: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Break Time (m)</label>
                        <input type="number" value={sessForm.breakTime} onChange={e => setSessForm({...sessForm, breakTime: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5">Status</label>
                        <select value={String(sessForm.active)} onChange={e => setSessForm({...sessForm, active: e.target.value === 'true'})} className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white">
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-50 bg-slate-50 p-4 rounded-2xl text-xs text-slate-655 font-semibold">
                      <div><span className="text-[9px] text-slate-450 uppercase block font-bold tracking-wider">Daily Token Limit</span><span className="text-slate-800 font-extrabold text-sm">{sess.maxTokens}</span></div>
                      <div><span className="text-[9px] text-slate-450 uppercase block font-bold tracking-wider">Avg Consult Time</span><span className="text-slate-800 font-extrabold text-sm">{sess.consultationDuration} mins</span></div>
                      <div><span className="text-[9px] text-slate-450 uppercase block font-bold tracking-wider">Break Duration</span><span className="text-slate-800 font-extrabold text-sm">{sess.breakTime} mins</span></div>
                      <div>
                        <span className="text-[9px] text-slate-450 uppercase block font-bold tracking-wider">Session Status</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${sess.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-655'}`}>
                          {sess.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-slate-500 text-xs leading-relaxed space-y-3">
            <div className="flex gap-2 items-center text-slate-800 font-black mb-1"><AlertCircle className="text-blue-600 shrink-0" size={16} /> <span>Important Note</span></div>
            <p>1. Customizing consultation times will instantly adapt the estimated queue waiting times for patient walk-ins and digital check-ins.</p>
            <p>2. Deactivating a session blocks token assignment for that specific slot immediately.</p>
          </div>
        </div>
      )}

      {/* ─── AUTO SCHEDULING TAB ────────────────────────────────────────── */}
      {activeTab === 'auto' && (
        <form onSubmit={handleAutoSubmit} className="max-w-2xl bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-50">
            <Zap size={18} className="text-blue-600" />
            <div>
              <h3 className="text-sm font-black text-slate-800">OPD Auto Configuration</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Control online slot shares, buffers, and window openings</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Booking Window Opens (Days Before)</label>
              <input type="number" value={autoForm.bookingOpensDaysBefore} onChange={e => setAutoForm({...autoForm, bookingOpensDaysBefore: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Advance Booking Limit (Days)</label>
              <input type="number" value={autoForm.advanceBookingLimit} onChange={e => setAutoForm({...autoForm, advanceBookingLimit: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Emergency/VIP Buffer Slots per Session</label>
              <input type="number" value={autoForm.emergencySlots} onChange={e => setAutoForm({...autoForm, emergencySlots: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Inter-Session Buffer (Minutes)</label>
              <input type="number" value={autoForm.bufferTime} onChange={e => setAutoForm({...autoForm, bufferTime: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Online Token Share (%)</label>
              <input type="number" value={autoForm.onlinePercentage} onChange={e => setAutoForm({...autoForm, onlinePercentage: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Walk-in Token Share (%)</label>
              <input type="number" value={autoForm.walkInPercentage} onChange={e => setAutoForm({...autoForm, walkInPercentage: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                <input type="checkbox" checked={autoForm.autoContinuity} onChange={e => setAutoForm({...autoForm, autoContinuity: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-100 accent-blue-650 h-4 w-4" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Automatic Queue Continuity</span>
                  <span className="text-[10px] text-slate-450 font-semibold block mt-0.5">Continuously sync offline token queue sequence alongside live digital bookings</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingAuto}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/10"
            >
              {savingAuto ? 'Saving Configuration...' : 'Save Configuration'}
            </button>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <Check size={14} /> Saved Successfully
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
