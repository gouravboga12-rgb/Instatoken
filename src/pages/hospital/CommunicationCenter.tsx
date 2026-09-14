import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Send, Bell, Smartphone, CheckCircle, RefreshCw } from 'lucide-react';

export const CommunicationCenter: React.FC = () => {
  const { sendNotification, notifications, tokens } = useHospital();
  
  const [activeTab, setActiveTab] = useState<'inapp' | 'push'>('inapp');
  
  const [form, setForm] = useState({
    recipientGroup: 'all',
    customNumbers: '',
    message: ''
  });

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  // Group counts based on live data
  const waitingCount = tokens.filter(t => ['booked','waiting','checked-in'].includes(t.status)).length;
  const todayCount = tokens.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) return;

    setSending(true);
    setSuccess(false);

    // Simulate Broadcast API Call
    setTimeout(() => {
      sendNotification({
        type: activeTab,
        recipient: form.recipientGroup === 'custom' ? form.customNumbers : form.recipientGroup,
        message: form.message
      });
      setSending(false);
      setSuccess(true);
      setForm(prev => ({ ...prev, message: '' }));
      setTimeout(() => setSuccess(false), 2500);
    }, 500);
  };

  const getRecipientLabel = (group: string) => {
    switch (group) {
      case 'all': return 'All Registered Patients';
      case 'waiting': return `Today's Waiting Patients (${waitingCount})`;
      case 'today': return `All Today's Scheduled Patients (${todayCount})`;
      default: return 'Custom Recipients';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800">Communication & Notifications</h2>
        <p className="text-xs text-slate-400 mt-1">Broadcast system alerts, queue updates, or custom reminders to patient apps and website</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-2xl p-1 self-start flex-wrap gap-1">
        {[
          { id: 'inapp', label: 'App & Website In-App Alert', icon: <Bell size={13} /> },
          { id: 'push', label: 'External Device Push Notification', icon: <Smartphone size={13} className="text-blue-500" /> }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setActiveTab(t.id as any); setSuccess(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer border-none transition-all ${
              activeTab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Form */}
        <div className="xl:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Recipient Category</label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { id: 'all', label: 'All Patients' },
                  { id: 'waiting', label: `Waiting List (${waitingCount})` },
                  { id: 'today', label: `Today's List (${todayCount})` },
                  { id: 'custom', label: 'Custom Mobile Numbers' }
                ].map(r => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setForm(f => ({ ...f, recipientGroup: r.id }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      form.recipientGroup === r.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {form.recipientGroup === 'custom' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Mobile Numbers (Comma separated)</label>
                <input
                  type="text"
                  required
                  value={form.customNumbers}
                  onChange={e => setForm(f => ({ ...f, customNumbers: e.target.value }))}
                  placeholder="e.g. +919876543210, +919123456780"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Notification Message</label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {activeTab === 'inapp' ? 'In-App Web & App Notice' : 'External Device Push Notification'}
                </span>
              </div>
              <textarea
                required
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={5}
                placeholder={activeTab === 'inapp' 
                  ? 'Type your in-app notification message here (displays in patient notification bell & top alert bar)...' 
                  : 'Type your external push notification broadcast (delivers as device OS / mobile push notice)...'
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none font-medium"
              />
              <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
                <span className="font-semibold">Characters: {form.message.length}</span>
                <span>{activeTab === 'inapp' ? 'Instant broadcast to active web & app users' : 'External mobile & browser push broadcast'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/10"
              >
                {sending ? <RefreshCw className="animate-spin" size={13} /> : <Send size={13} />}
                {sending ? 'Broadcasting...' : activeTab === 'inapp' ? 'Send In-App Notification' : 'Send External Push Notification'}
              </button>
              {success && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle size={14} /> Notification Broadcasted Successfully
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Right Broadcast logs */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Recent Transmissions</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {notifications.map(n => (
                <div key={n.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold capitalize text-blue-600">
                      {n.type === 'inapp' ? 'In-App Web & App' : n.type === 'push' ? 'External Device Push' : n.type} Alert
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">{new Date(n.sentAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{n.message}</p>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">{getRecipientLabel(n.recipient)}</span>
                    <span className="text-emerald-600 font-bold">✓ Delivered</span>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-center text-[10px] text-slate-400 py-10">No messages broadcasted yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
