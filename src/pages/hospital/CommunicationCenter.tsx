import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Send, Bell, Smartphone, CheckCircle, RefreshCw, Trash2, Zap, ShieldCheck, AlertCircle } from 'lucide-react';

export const CommunicationCenter: React.FC = () => {
  const { sendNotification, notifications, tokens, clearHospitalNotifications } = useHospital();
  
  const [activeTab, setActiveTab] = useState<'inapp' | 'push'>('inapp');
  
  const [form, setForm] = useState({
    recipientGroup: 'all',
    customNumbers: '',
    message: ''
  });

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'inapp' | 'push'>('all');

  // Device Web Push Notification Permission state
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPushPermission(res);
        if (res === 'granted') {
          new Notification('InstaToken Push Activated', {
            body: '✅ Push notifications enabled for this device. Live hospital announcements will pop up here.',
            icon: '/favicon.png'
          });
        }
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }
  };

  const handleTestPush = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('InstaToken • Push Notification Test', {
          body: '✅ Device push notifications are operational and delivering live to this device!',
          icon: '/favicon.png'
        });
      } else {
        requestPushPermission();
      }
    }
  };

  // Group counts based on live data
  const waitingCount = tokens.filter(t => ['booked','waiting','checked-in'].includes(t.status)).length;
  const todayCount = tokens.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) return;

    setSending(true);
    setSuccess(false);

    // If push notification is selected and permission is default, request permission
    if (activeTab === 'push' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      requestPushPermission();
    }

    setTimeout(() => {
      sendNotification({
        type: activeTab,
        recipient: form.recipientGroup === 'custom' ? form.customNumbers : form.recipientGroup,
        message: form.message
      });
      setSending(false);
      setSuccess(true);
      setForm(prev => ({ ...prev, message: '' }));
      setTimeout(() => setSuccess(false), 3500);
    }, 400);
  };

  const getRecipientLabel = (group: string) => {
    switch (group) {
      case 'all': return 'All Registered Patients';
      case 'waiting': return `Today's Waiting Patients (${waitingCount})`;
      case 'today': return `All Today's Scheduled Patients (${todayCount})`;
      default: return 'Custom Mobile Numbers';
    }
  };

  const filteredTransmissions = notifications.filter(n => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Communication & Notifications</h2>
          <p className="text-xs text-slate-400 mt-1">Broadcast system alerts, queue updates, or custom reminders to patient apps and website</p>
        </div>

        {/* Device Push Status Pill */}
        <div className="flex items-center gap-2">
          {pushPermission === 'granted' ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-extrabold text-emerald-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Device Push Active</span>
              <button
                type="button"
                onClick={handleTestPush}
                className="ml-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-lg cursor-pointer border-none font-black"
                title="Send a test push alert to this screen"
              >
                Test Push
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={requestPushPermission}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-extrabold text-blue-700 shadow-2xs cursor-pointer transition-all"
            >
              <Smartphone size={13} className="text-blue-600" />
              <span>Enable Device Push Alerts</span>
            </button>
          )}
        </div>
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

      {/* Push Notice Alert Banner */}
      {activeTab === 'push' && pushPermission !== 'granted' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>To allow broadcasted push notifications to pop up on desktop and mobile screens, enable device permission.</span>
          </div>
          <button
            type="button"
            onClick={requestPushPermission}
            className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black px-3 py-1 rounded-xl cursor-pointer border-none shrink-0 shadow-2xs"
          >
            Allow Permission
          </button>
        </div>
      )}

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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Notification Message</label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  activeTab === 'inapp' ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'
                }`}>
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
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none font-medium text-slate-800"
              />
              <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
                <span className="font-semibold">Characters: {form.message.length}</span>
                <span>{activeTab === 'inapp' ? 'Instant broadcast to active web & app users' : 'External mobile & browser push broadcast'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap">
              <button
                type="submit"
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/10 transition-all"
              >
                {sending ? <RefreshCw className="animate-spin" size={13} /> : <Send size={13} />}
                {sending ? 'Broadcasting...' : activeTab === 'inapp' ? 'Send In-App Notification' : 'Send External Push Notification'}
              </button>

              {activeTab === 'push' && pushPermission === 'granted' && (
                <button
                  type="button"
                  onClick={handleTestPush}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-xl cursor-pointer border-none text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Zap size={13} className="text-amber-500" /> Test Push on this Screen
                </button>
              )}

              {success && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle size={14} /> Notification Broadcasted Successfully!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Right Broadcast logs */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Recent Transmissions</h3>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearHospitalNotifications}
                  className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                  title="Clear transmission logs"
                >
                  <Trash2 size={11} /> Clear All
                </button>
              )}
            </div>

            {/* Filter pills */}
            {notifications.length > 0 && (
              <div className="flex gap-1.5 pb-1">
                {(['all', 'inapp', 'push'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterType(tab)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      filterType === tab ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'inapp' ? 'In-App' : 'Push'}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredTransmissions.map(n => (
                <div key={n.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`font-extrabold capitalize text-[11px] flex items-center gap-1 ${
                      n.type === 'push' ? 'text-purple-600' : 'text-blue-600'
                    }`}>
                      {n.type === 'push' ? <Smartphone size={11} /> : <Bell size={11} />}
                      {n.type === 'inapp' ? 'In-App Alert' : n.type === 'push' ? 'Device Push' : n.type}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">{new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-3 font-medium">{n.message}</p>
                  <div className="flex justify-between text-[10px] pt-1 border-t border-slate-200/50">
                    <span className="text-slate-400 font-semibold">{getRecipientLabel(n.recipient)}</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                      <ShieldCheck size={11} /> Delivered
                    </span>
                  </div>
                </div>
              ))}
              {filteredTransmissions.length === 0 && (
                <p className="text-center text-[10px] text-slate-400 py-10 font-bold">
                  {notifications.length === 0 ? 'No messages broadcasted yet' : 'No transmissions matching filter'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
