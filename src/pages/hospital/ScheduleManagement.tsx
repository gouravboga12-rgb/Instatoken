import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalDoctor } from '../../context/HospitalContext';
import { Save, Check, Stethoscope, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ScheduleManagement: React.FC<{ tab?: string }> = () => {
  const { doctors, updateDoctor } = useHospital();
  const navigate = useNavigate();

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || '');

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId) || doctors[0];

  // Per-Doctor Schedule Form
  const [scheduleForm, setScheduleForm] = useState({
    opdDays: selectedDoctor?.opdDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    opdStartTime: selectedDoctor?.opdStartTime || '09:00 AM',
    opdEndTime: selectedDoctor?.opdEndTime || '01:00 PM',
    consultationDuration: String(selectedDoctor?.consultationDuration || 15),
    maxTokensPerDay: String(selectedDoctor?.maxTokensPerDay || 50),
    onlineConsult: selectedDoctor?.onlineConsult ?? true,
    offlineConsult: selectedDoctor?.offlineConsult ?? true
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSelectDoctor = (doc: HospitalDoctor) => {
    setSelectedDoctorId(doc.id);
    setScheduleForm({
      opdDays: doc.opdDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      opdStartTime: doc.opdStartTime || '09:00 AM',
      opdEndTime: doc.opdEndTime || '01:00 PM',
      consultationDuration: String(doc.consultationDuration || 15),
      maxTokensPerDay: String(doc.maxTokensPerDay || 50),
      onlineConsult: doc.onlineConsult ?? true,
      offlineConsult: doc.offlineConsult ?? true
    });
  };

  const handleDayToggle = (day: string) => {
    setScheduleForm(prev => {
      const exists = prev.opdDays.includes(day);
      const newDays = exists ? prev.opdDays.filter(d => d !== day) : [...prev.opdDays, day];
      return { ...prev, opdDays: newDays.length > 0 ? newDays : [day] };
    });
  };

  const handleSaveDoctorSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    updateDoctor(selectedDoctor.id, {
      opdDays: scheduleForm.opdDays,
      opdStartTime: scheduleForm.opdStartTime,
      opdEndTime: scheduleForm.opdEndTime,
      consultationDuration: parseInt(scheduleForm.consultationDuration) || 15,
      maxTokensPerDay: parseInt(scheduleForm.maxTokensPerDay) || 50,
      onlineConsult: scheduleForm.onlineConsult,
      offlineConsult: scheduleForm.offlineConsult
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm shadow-blue-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-tight">Doctor OPD Shifts & Weekly Schedules</h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Configure doctor-wise working days, shift hours, and consultation limits synchronized with customer bookings.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/hospital/tokens/manage')}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer border-none transition-colors"
        >
          <span>Global Token Sessions</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>Doctor schedule updated! Customer booking slots and hospital queues are updated immediately.</span>
        </div>
      )}

      {/* Main Grid: Doctor Selector + Schedule Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Doctor Selection (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope size={14} className="text-blue-600" />
            <span>Select Doctor ({doctors.length})</span>
          </h2>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {doctors.map(doc => {
              const isSelected = doc.id === (selectedDoctor?.id || selectedDoctorId);
              return (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDoctor(doc)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 shadow-sm text-blue-900'
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <img
                    src={doc.photo || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80'}
                    alt={doc.name}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-xs truncate leading-tight">{doc.name}</p>
                    <p className="text-[10px] text-blue-600 font-bold truncate mt-0.5">{doc.specialization}</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                      {doc.opdDays?.join(', ') || 'Mon-Fri'} · {doc.opdStartTime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Schedule Editor for Selected Doctor (8 cols) */}
        <div className="lg:col-span-8">
          {selectedDoctor ? (
            <form onSubmit={handleSaveDoctorSchedule} className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-6">
              {/* Doctor Details Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedDoctor.photo || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80'}
                    alt={selectedDoctor.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="text-base font-black text-slate-800">{selectedDoctor.name}</h3>
                    <p className="text-xs text-blue-600 font-bold">
                      {selectedDoctor.specialization} · {selectedDoctor.departmentName} · Fee: ₹{selectedDoctor.consultationFee}
                    </p>
                  </div>
                </div>
              </div>

              {/* Working Days Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Available OPD Working Days *</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(d => {
                    const isSelected = scheduleForm.opdDays.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => handleDayToggle(d)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">OPD Shift Start Time *</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.opdStartTime}
                    onChange={e => setScheduleForm({ ...scheduleForm, opdStartTime: e.target.value })}
                    placeholder="e.g. 09:00 AM"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">OPD Shift End Time *</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.opdEndTime}
                    onChange={e => setScheduleForm({ ...scheduleForm, opdEndTime: e.target.value })}
                    placeholder="e.g. 01:00 PM"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* Duration and Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Avg Consultation Duration (Mins)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={scheduleForm.consultationDuration}
                    onChange={e => setScheduleForm({ ...scheduleForm, consultationDuration: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">Used to estimate live queue waiting times</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Max Token Capacity Per Day</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={scheduleForm.maxTokensPerDay}
                    onChange={e => setScheduleForm({ ...scheduleForm, maxTokensPerDay: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* Consultation Modes */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleForm.onlineConsult}
                    onChange={e => setScheduleForm({ ...scheduleForm, onlineConsult: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Accept Online Patient Bookings</span>
                    <span className="text-[10px] text-slate-400 font-medium">Enable on Customer Portal</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleForm.offlineConsult}
                    onChange={e => setScheduleForm({ ...scheduleForm, offlineConsult: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Accept Walk-in Counter Tokens</span>
                    <span className="text-[10px] text-slate-400 font-medium">Enable in Hospital Add Token</span>
                  </div>
                </label>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer border-none shadow-sm shadow-blue-500/20 transition-all"
                >
                  <Save size={14} /> Save {selectedDoctor.name}'s Schedule
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center text-slate-400 text-xs font-semibold">
              Select a doctor from the left to view and customize their schedule.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
