import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { SessionConfig, HospitalDoctor } from '../../context/HospitalContext';
import {
  Clock, Plus, Trash2, Edit3, Save, Check,
  Sliders, Zap, Stethoscope
} from 'lucide-react';

export const TokenManage: React.FC = () => {
  const { scheduleConfig, updateScheduleConfig, updateSession, doctors, updateDoctor } = useHospital();

  // Mode: 'doctor' (per-doctor session management) or 'global' (master default sessions)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || 'global');

  const selectedDoctor: HospitalDoctor | undefined = doctors.find(d => d.id === selectedDoctorId);

  // Active sessions for the currently selected view (doctor's own sessions or global hospital sessions)
  const currentSessions: SessionConfig[] = selectedDoctor
    ? (selectedDoctor.sessions && selectedDoctor.sessions.length > 0
        ? selectedDoctor.sessions
        : scheduleConfig.sessions)
    : scheduleConfig.sessions;

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
    name: 'Evening OPD',
    startTime: '05:00 PM',
    endTime: '09:00 PM',
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
    const updatedSess: SessionConfig = {
      id,
      name: sessForm.name,
      startTime: sessForm.startTime,
      endTime: sessForm.endTime,
      maxTokens: parseInt(sessForm.maxTokens) || 50,
      consultationDuration: parseInt(sessForm.consultationDuration) || 15,
      breakTime: parseInt(sessForm.breakTime) || 5,
      active: sessForm.active
    };

    if (selectedDoctor) {
      const docSessions = currentSessions.map(s => s.id === id ? updatedSess : s);
      updateDoctor(selectedDoctor.id, { sessions: docSessions });
    } else {
      updateSession(id, updatedSess);
    }

    setEditingSessionId(null);
    setSessionSaveSuccess(true);
    setTimeout(() => setSessionSaveSuccess(false), 2500);
  };

  const handleToggleSessionActive = (sess: SessionConfig) => {
    if (selectedDoctor) {
      const docSessions = currentSessions.map(s => s.id === sess.id ? { ...s, active: !s.active } : s);
      updateDoctor(selectedDoctor.id, { sessions: docSessions });
    } else {
      updateSession(sess.id, { active: !sess.active });
    }
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

    if (selectedDoctor) {
      const updated = [...currentSessions, newSessionObj];
      updateDoctor(selectedDoctor.id, { sessions: updated });
    } else {
      const updatedSessions = [...scheduleConfig.sessions, newSessionObj];
      updateScheduleConfig({ sessions: updatedSessions });
    }

    setShowAddSessionModal(false);
    setSessionSaveSuccess(true);
    setTimeout(() => setSessionSaveSuccess(false), 2500);
  };

  const handleDeleteSession = (id: string) => {
    if (currentSessions.length <= 1) {
      alert('Must maintain at least one active OPD session.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this session?')) {
      if (selectedDoctor) {
        const updated = currentSessions.filter(s => s.id !== id);
        updateDoctor(selectedDoctor.id, { sessions: updated });
      } else {
        const updated = scheduleConfig.sessions.filter(s => s.id !== id);
        updateScheduleConfig({ sessions: updated });
      }
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
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Sliders size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-tight">
              Doctor-Wise Token Management & Session Timings
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Customize independent session shifts, start/end hours, and token limits per doctor. Synchronized in real-time with customer booking.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddSessionModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer border-none shadow-sm shadow-blue-500/20 flex items-center gap-2 self-start md:self-auto transition-colors"
        >
          <Plus size={15} /> Add Session for {selectedDoctor ? selectedDoctor.name : 'Master'}
        </button>
      </div>

      {sessionSaveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>Doctor sessions updated successfully! Customer side and hospital Add Token now reflect these exact timings.</span>
        </div>
      )}

      {/* Doctor Selector Chips */}
      <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope size={14} className="text-blue-600" />
            <span>Select Doctor to Configure Sessions ({doctors.length} Doctors)</span>
          </span>
          {selectedDoctor && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {currentSessions.filter(s => s.active).length} Active Sessions Configured
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {doctors.map(doc => {
            const isSelected = selectedDoctorId === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setSelectedDoctorId(doc.id);
                  setEditingSessionId(null);
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2.5 shrink-0 cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <img
                  src={doc.photo || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80'}
                  alt={doc.name}
                  className="w-5 h-5 rounded-full object-cover border border-white/40"
                />
                <span>{doc.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {doc.specialization}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Sessions List (Left) + Global Rules (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Doctor Sessions List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-blue-600" />
              <span>
                {selectedDoctor ? `${selectedDoctor.name}'s OPD Sessions (${currentSessions.length})` : 'Configured OPD Sessions'}
              </span>
            </h2>
            <span className="text-[10px] text-slate-400 font-semibold">
              Changes reflect immediately on Customer Doctor Booking
            </span>
          </div>

          <div className="space-y-4">
            {currentSessions.map(sess => {
              const isEditing = editingSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 hover:border-blue-200 transition-all space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                        {sess.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-800">{sess.name} Session</h3>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            sess.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {sess.active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Timing: {sess.startTime} - {sess.endTime} · Max Capacity: {sess.maxTokens} Tokens
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSessionActive(sess)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer border transition-colors ${
                          sess.active
                            ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {sess.active ? 'Disable' : 'Enable'}
                      </button>

                      {isEditing ? (
                        <button
                          onClick={() => handleSessionSave(sess.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer border-none flex items-center gap-1 shadow-sm"
                        >
                          <Save size={12} /> Save
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
                        className="p-2 border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl cursor-pointer transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Session Name</label>
                        <input
                          type="text"
                          value={sessForm.name}
                          onChange={e => setSessForm({ ...sessForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Start Time</label>
                        <input
                          type="text"
                          value={sessForm.startTime}
                          onChange={e => setSessForm({ ...sessForm, startTime: e.target.value })}
                          placeholder="09:00 AM"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">End Time</label>
                        <input
                          type="text"
                          value={sessForm.endTime}
                          onChange={e => setSessForm({ ...sessForm, endTime: e.target.value })}
                          placeholder="01:00 PM"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Max Token Limit</label>
                        <input
                          type="number"
                          value={sessForm.maxTokens}
                          onChange={e => setSessForm({ ...sessForm, maxTokens: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Avg Consult Time (m)</label>
                        <input
                          type="number"
                          value={sessForm.consultationDuration}
                          onChange={e => setSessForm({ ...sessForm, consultationDuration: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Break Time (m)</label>
                        <input
                          type="number"
                          value={sessForm.breakTime}
                          onChange={e => setSessForm({ ...sessForm, breakTime: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">OPD Window</span>
                        <span className="text-xs font-extrabold text-slate-800">{sess.startTime} – {sess.endTime}</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Max Token Limit</span>
                        <span className="text-xs font-extrabold text-blue-600">{sess.maxTokens} Tokens</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Est. Duration</span>
                        <span className="text-xs font-extrabold text-slate-800">{sess.consultationDuration} mins/patient</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Buffer Gap</span>
                        <span className="text-xs font-extrabold text-slate-800">{sess.breakTime} mins</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Global Token Rules (4 cols) */}
        <div className="lg:col-span-4">
          <form onSubmit={handleSaveGlobalRules} className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Zap size={16} className="text-amber-500" />
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Global Token Rules</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Hospital-wide booking policies</p>
              </div>
            </div>

            {saveSuccess && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check size={14} /> Saved Global Rules
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Advance Booking Open Days</label>
              <input
                type="number"
                min={1}
                max={30}
                value={rulesForm.bookingOpensDaysBefore}
                onChange={e => setRulesForm({ ...rulesForm, bookingOpensDaysBefore: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Emergency Reserved Tokens</label>
              <input
                type="number"
                min={0}
                max={50}
                value={rulesForm.emergencySlots}
                onChange={e => setRulesForm({ ...rulesForm, emergencySlots: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 font-medium">Slots held for priority emergency walk-ins</span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer border-none shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Save size={13} /> Save Global Token Rules
            </button>
          </form>
        </div>
      </div>

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800">
                Add OPD Session for {selectedDoctor ? selectedDoctor.name : 'Master'}
              </h3>
              <button
                onClick={() => setShowAddSessionModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSession} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Session Name *</label>
                <input
                  type="text"
                  required
                  value={newSess.name}
                  onChange={e => setNewSess({ ...newSess, name: e.target.value })}
                  placeholder="e.g. Morning OPD / Evening OPD"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
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
                    placeholder="09:00 AM"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">End Time *</label>
                  <input
                    type="text"
                    required
                    value={newSess.endTime}
                    onChange={e => setNewSess({ ...newSess, endTime: e.target.value })}
                    placeholder="01:00 PM"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Max Tokens *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={newSess.maxTokens}
                    onChange={e => setNewSess({ ...newSess, maxTokens: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Consult Time (m)</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={newSess.consultationDuration}
                    onChange={e => setNewSess({ ...newSess, consultationDuration: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-sm shadow-blue-500/20"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
