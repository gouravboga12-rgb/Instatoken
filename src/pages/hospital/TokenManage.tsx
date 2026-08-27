import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { SessionConfig } from '../../context/HospitalContext';
import {
  Clock, Plus, Trash2, Edit3, Save, Check,
  Sliders, Zap, Users
} from 'lucide-react';

export const TokenManage: React.FC = () => {
  const { scheduleConfig, updateScheduleConfig, updateSession, doctors } = useHospital();

  // Session Form State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessForm, setSessForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    maxTokens: '50',
    consultationDuration: '15',
    breakTime: '5',
    active: true
  });

  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [newSess, setNewSess] = useState({
    name: 'Night Emergency',
    startTime: '09:00 PM',
    endTime: '11:30 PM',
    maxTokens: '30',
    consultationDuration: '15',
    breakTime: '5',
    active: true
  });

  // Global Config Form State
  const [rulesForm, setRulesForm] = useState({
    bookingOpensDaysBefore: String(scheduleConfig.bookingOpensDaysBefore || 3),
    advanceBookingLimit: String(scheduleConfig.advanceBookingLimit || 7),
    bufferTime: String(scheduleConfig.bufferTime || 15),
    dailyTokenLimit: String(scheduleConfig.dailyTokenLimit || 150),
    walkInPercentage: String(scheduleConfig.walkInPercentage || 50),
    onlinePercentage: String(scheduleConfig.onlinePercentage || 50),
    emergencySlots: String(scheduleConfig.emergencySlots || 5),
    autoContinuity: scheduleConfig.autoContinuity ?? true
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sessionSaveSuccess, setSessionSaveSuccess] = useState(false);

  const startEditSession = (sess: SessionConfig) => {
    setEditingSessionId(sess.id);
    setSessForm({
      name: sess.name,
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
      name: sessForm.name,
      startTime: sessForm.startTime,
      endTime: sessForm.endTime,
      maxTokens: parseInt(sessForm.maxTokens) || 50,
      consultationDuration: parseInt(sessForm.consultationDuration) || 15,
      breakTime: parseInt(sessForm.breakTime) || 5,
      active: sessForm.active
    });
    setEditingSessionId(null);
    setSessionSaveSuccess(true);
    setTimeout(() => setSessionSaveSuccess(false), 2500);
  };

  const handleToggleSessionActive = (sess: SessionConfig) => {
    updateSession(sess.id, { active: !sess.active });
    setSessionSaveSuccess(true);
    setTimeout(() => setSessionSaveSuccess(false), 2000);
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `sess-${Date.now()}`;
    const newSessionObj: SessionConfig = {
      id: newId,
      name: newSess.name,
      startTime: newSess.startTime,
      endTime: newSess.endTime,
      maxTokens: parseInt(newSess.maxTokens) || 40,
      consultationDuration: parseInt(newSess.consultationDuration) || 15,
      breakTime: parseInt(newSess.breakTime) || 5,
      active: newSess.active
    };

    const updatedSessions = [...scheduleConfig.sessions, newSessionObj];
    updateScheduleConfig({ sessions: updatedSessions });
    setShowAddSessionModal(false);
    setSessionSaveSuccess(true);
    setTimeout(() => setSessionSaveSuccess(false), 2500);
  };

  const handleDeleteSession = (id: string) => {
    if (scheduleConfig.sessions.length <= 1) {
      alert('Hospital must maintain at least one active OPD session.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this session?')) {
      const updated = scheduleConfig.sessions.filter(s => s.id !== id);
      updateScheduleConfig({ sessions: updated });
      setSessionSaveSuccess(true);
      setTimeout(() => setSessionSaveSuccess(false), 2000);
    }
  };

  const handleSaveGlobalRules = (e: React.FormEvent) => {
    e.preventDefault();
    updateScheduleConfig({
      bookingOpensDaysBefore: parseInt(rulesForm.bookingOpensDaysBefore) || 3,
      advanceBookingLimit: parseInt(rulesForm.advanceBookingLimit) || 7,
      bufferTime: parseInt(rulesForm.bufferTime) || 15,
      dailyTokenLimit: parseInt(rulesForm.dailyTokenLimit) || 150,
      walkInPercentage: parseInt(rulesForm.walkInPercentage) || 50,
      onlinePercentage: parseInt(rulesForm.onlinePercentage) || 50,
      emergencySlots: parseInt(rulesForm.emergencySlots) || 5,
      autoContinuity: rulesForm.autoContinuity
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm shadow-blue-500/20">
              <Sliders size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-tight">Token Management & Session Configuration</h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Central Single Source of Truth — changes instantly synchronize to Hospital Add Token and Customer Booking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setShowAddSessionModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm shadow-blue-500/20 transition-all cursor-pointer border-none"
          >
            <Plus size={14} /> Add OPD Session
          </button>
        </div>
      </div>

      {sessionSaveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>Session settings updated! All changes are live across Customer Booking & Hospital Add Token screens.</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Configured OPD Sessions */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <span>Configured OPD Sessions ({scheduleConfig.sessions.length})</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">Synchronized with customer booking cards</span>
          </div>

          <div className="space-y-4">
            {scheduleConfig.sessions.map((sess) => {
              const isEditing = editingSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  className={`bg-white rounded-3xl border transition-all p-5 shadow-xs ${
                    sess.active ? 'border-slate-100 hover:shadow-md' : 'border-slate-200 bg-slate-50/70 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                        sess.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {sess.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-800 text-sm">{sess.name} OPD Session</h3>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            sess.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {sess.active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          Timing: <strong className="text-slate-700">{sess.startTime} - {sess.endTime}</strong> · Max Capacity: <strong className="text-slate-700">{sess.maxTokens} Tokens</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSessionActive(sess)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer border transition-all ${
                          sess.active
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {sess.active ? 'Disable' : 'Enable'}
                      </button>

                      {isEditing ? (
                        <button
                          onClick={() => handleSessionSave(sess.id)}
                          className="bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer border-none flex items-center gap-1 hover:bg-blue-700 shadow-xs"
                        >
                          <Save size={13} /> Save
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditSession(sess)}
                          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer transition-colors"
                          title="Edit Session"
                        >
                          <Edit3 size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSession(sess.id)}
                        className="p-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-xl cursor-pointer transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Session Name</label>
                        <input
                          type="text"
                          value={sessForm.name}
                          onChange={e => setSessForm({ ...sessForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Start Time (e.g. 09:00 AM)</label>
                        <input
                          type="text"
                          value={sessForm.startTime}
                          onChange={e => setSessForm({ ...sessForm, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">End Time (e.g. 01:00 PM)</label>
                        <input
                          type="text"
                          value={sessForm.endTime}
                          onChange={e => setSessForm({ ...sessForm, endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Max Tokens Per Doctor</label>
                        <input
                          type="number"
                          value={sessForm.maxTokens}
                          onChange={e => setSessForm({ ...sessForm, maxTokens: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Consultation Time (Mins)</label>
                        <input
                          type="number"
                          value={sessForm.consultationDuration}
                          onChange={e => setSessForm({ ...sessForm, consultationDuration: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Buffer / Break (Mins)</label>
                        <input
                          type="number"
                          value={sessForm.breakTime}
                          onChange={e => setSessForm({ ...sessForm, breakTime: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">OPD Window</span>
                        <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">{sess.startTime} – {sess.endTime}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Max Token Limit</span>
                        <span className="font-extrabold text-blue-600 text-xs mt-0.5 block">{sess.maxTokens} Tokens</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Est. Duration</span>
                        <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">{sess.consultationDuration} mins/patient</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Buffer Gap</span>
                        <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">{sess.breakTime} mins</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (4 cols): Global Booking & Token Rules */}
        <div className="xl:col-span-4 space-y-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <span>Global Token Rules</span>
          </h2>

          <form onSubmit={handleSaveGlobalRules} className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Advance Booking Open Days</label>
              <input
                type="number"
                min={1}
                max={30}
                value={rulesForm.bookingOpensDaysBefore}
                onChange={e => setRulesForm({ ...rulesForm, bookingOpensDaysBefore: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 font-medium">How many days in advance customer can view slots</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Max Advance Booking Window (Days)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={rulesForm.advanceBookingLimit}
                onChange={e => setRulesForm({ ...rulesForm, advanceBookingLimit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Walk-in Quota %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rulesForm.walkInPercentage}
                  onChange={e => setRulesForm({ ...rulesForm, walkInPercentage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Online Quota %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rulesForm.onlinePercentage}
                  onChange={e => setRulesForm({ ...rulesForm, onlinePercentage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Emergency Reserved Tokens</label>
              <input
                type="number"
                min={0}
                max={20}
                value={rulesForm.emergencySlots}
                onChange={e => setRulesForm({ ...rulesForm, emergencySlots: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 font-medium">Slots held for priority emergency walk-ins</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border-none transition-colors shadow-sm"
              >
                <Save size={13} /> Save Global Token Rules
              </button>
            </div>

            {saveSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
                <Check size={14} /> Saved & Synced Successfully
              </div>
            )}
          </form>

          {/* Quick Doctor Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users size={14} className="text-blue-600" />
              <span>Active Doctors ({doctors.filter(d => d.active).length})</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Sessions configured above apply dynamically to all active hospital doctors.
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {doctors.filter(d => d.active).map(d => (
                <div key={d.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                  <span className="font-extrabold text-slate-800 truncate">{d.name}</span>
                  <span className="text-[10px] text-blue-600 font-bold">₹{d.consultationFee}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800">Add New OPD Session</h3>
              <button
                onClick={() => setShowAddSessionModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSession} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Session Name *</label>
                <input
                  type="text"
                  required
                  value={newSess.name}
                  onChange={e => setNewSess({ ...newSess, name: e.target.value })}
                  placeholder="e.g. Afternoon OPD or Night Shift"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Start Time *</label>
                  <input
                    type="text"
                    required
                    value={newSess.startTime}
                    onChange={e => setNewSess({ ...newSess, startTime: e.target.value })}
                    placeholder="02:00 PM"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">End Time *</label>
                  <input
                    type="text"
                    required
                    value={newSess.endTime}
                    onChange={e => setNewSess({ ...newSess, endTime: e.target.value })}
                    placeholder="06:00 PM"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Max Tokens *</label>
                  <input
                    type="number"
                    required
                    value={newSess.maxTokens}
                    onChange={e => setNewSess({ ...newSess, maxTokens: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Consultation Time (Mins)</label>
                  <input
                    type="number"
                    required
                    value={newSess.consultationDuration}
                    onChange={e => setNewSess({ ...newSess, consultationDuration: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer border-none shadow-sm shadow-blue-500/20"
                >
                  Add Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
