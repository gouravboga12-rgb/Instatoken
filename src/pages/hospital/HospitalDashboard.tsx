import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import {
  Wifi, WifiOff, Users, Plus, Eye, Edit3, Trash2, TrendingUp,
  Bell, Send, ChevronRight, CheckCircle,
  Activity, Calendar, Zap, ShieldCheck
} from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string|number; sub: string; icon: React.ReactNode; color: string; trend?: string; chart?: boolean }> = ({ title, value, sub, icon, color, trend, chart }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm relative overflow-hidden`}>
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 ${color} -translate-y-4 translate-x-4`} />
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>{icon}</div>
      {trend && (
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
          <TrendingUp size={9} /> {trend}
        </span>
      )}
    </div>
    <div className="text-2xl font-black text-slate-800">{value}</div>
    <div className="text-xs font-bold text-slate-500 mt-0.5">{title}</div>
    {chart && (
      <div className="flex items-end gap-0.5 mt-2 h-8">
        {[40, 65, 50, 80, 60, 90, 70, 85, 75, 95].map((h, i) => (
          <div key={i} className={`flex-1 rounded-sm ${color} bg-opacity-30`} style={{ height: `${h}%` }} />
        ))}
      </div>
    )}
    <div className="text-[10px] text-slate-400 mt-1">{sub}</div>
  </div>
);

const TokenRow: React.FC<{ token: any }> = ({ token }) => {
  const { updateTokenStatus } = useHospital();
  const statusConfig: Record<string, { label: string; cls: string }> = {
    booked: { label: 'Booked', cls: 'bg-blue-100 text-blue-700' },
    'checked-in': { label: 'Checked In', cls: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
    waiting: { label: 'Waiting', cls: 'bg-purple-100 text-purple-700' },
    skipped: { label: 'Skipped', cls: 'bg-slate-100 text-slate-600' },
  };
  const s = statusConfig[token.status] || statusConfig.booked;

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3">
        <span className="font-extrabold text-slate-800 text-sm">{token.tokenNo}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit ${token.type === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
          {token.type === 'online' ? <Wifi size={9} /> : <WifiOff size={9} />}
          {token.type === 'online' ? 'Online' : 'Offline'}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-800 text-xs leading-none">{token.patientName}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{token.patientPhone} | {token.patientGender} | {token.patientAge}Y</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">{token.doctorName}</p>
        <p className="text-[10px] text-slate-400">{token.departmentName}</p>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-600 font-semibold capitalize">{token.session}</span>
        <p className="text-[10px] text-slate-400">
          {token.session === 'morning' ? '09:00 AM - 01:00 PM' : token.session === 'afternoon' ? '01:00 PM - 05:00 PM' : '05:00 PM - 09:00 PM'}
        </p>
      </td>
      <td className="px-4 py-3 text-xs font-semibold text-slate-700">{token.time}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => updateTokenStatus(token.id, 'checked-in')}
          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
          title="View/Update"
        >
          <Eye size={14} />
        </button>
      </td>
    </tr>
  );
};

export const HospitalDashboard: React.FC = () => {
  const { tokens, doctors, scheduleConfig, setActiveSection } = useHospital();
  const navigate = useNavigate();

  const [tokenFilter, setTokenFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [doctorFilter, setDoctorFilter] = useState('All Doctors');
  const [sessionFilter, setSessionFilter] = useState('All Sessions');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifTarget, setNotifTarget] = useState('all');
  const [tokenValidInput, setTokenValidInput] = useState('');
  const [validResult, setValidResult] = useState<any>(null);
  const { validateToken } = useHospital();

  const today = tokens;
  const onlineCount = today.filter(t => t.type === 'online').length;
  const offlineCount = today.filter(t => t.type === 'offline').length;
  const totalToday = today.length;
  const completedCount = today.filter(t => t.status === 'completed').length;
  const waitingCount = today.filter(t => ['booked','waiting'].includes(t.status)).length;
  const checkedIn = today.filter(t => t.status === 'checked-in').length;

  const filteredTokens = today.filter(t => {
    if (tokenFilter === 'online' && t.type !== 'online') return false;
    if (tokenFilter === 'offline' && t.type !== 'offline') return false;
    if (doctorFilter !== 'All Doctors' && t.doctorName !== doctorFilter) return false;
    if (sessionFilter !== 'All Sessions' && t.session !== sessionFilter.toLowerCase()) return false;
    if (statusFilter !== 'All Status' && t.status !== statusFilter.toLowerCase()) return false;
    return true;
  }).slice(0, 7);

  const handleTokenValidate = () => {
    const tok = validateToken(parseInt(tokenValidInput));
    setValidResult(tok);
  };

  const handleNavSection = (section: string, path: string) => {
    setActiveSection(section);
    navigate(path);
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Top Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Online Tokens" value={onlineCount} sub="Today's Online Bookings" icon={<Wifi size={16} className="text-blue-600" />} color="bg-blue-500" trend="↑12% from yesterday" chart />
        <StatCard title="Offline Tokens" value={offlineCount} sub="Today's Walk-in Tokens" icon={<WifiOff size={16} className="text-indigo-600" />} color="bg-indigo-500" trend="↑8% from yesterday" chart />
        <StatCard title="Total Tokens Today" value={totalToday} sub="Online + Offline" icon={<Users size={16} className="text-purple-600" />} color="bg-purple-500" trend="↑15% from yesterday" chart />
        <StatCard title="Completed" value={completedCount} sub={`${waitingCount} waiting · ${checkedIn} checked in`} icon={<CheckCircle size={16} className="text-emerald-600" />} color="bg-emerald-500" />
      </div>

      {/* ── Main Grid (2-col) ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Token Table (2/3 width) */}
        <div className="xl:col-span-2 space-y-4">
          {/* Add New Token CTA */}
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:shadow-lg hover:shadow-blue-500/20 transition-all"
            onClick={() => handleNavSection('add-token', '/hospital/tokens/add')}
          >
            <div>
              <h3 className="font-black text-white text-sm">Add New Token</h3>
              <p className="text-blue-200 text-xs">Add Offline / Walk-in Token</p>
            </div>
            <button className="bg-white text-blue-600 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer border-none hover:bg-blue-50 transition-colors">
              <Plus size={14} /> Add Token
            </button>
          </div>

          {/* Token Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 pt-3 pb-0 border-b border-slate-50">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {(['all','online','offline'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTokenFilter(f)}
                    className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                      tokenFilter === f ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f === 'all' ? `All Tokens (${totalToday})` : f === 'online' ? `Online (${onlineCount})` : `Offline (${offlineCount})`}
                  </button>
                ))}
                <div className="flex-1" />
                {/* Filter selects */}
                {[
                  { val: doctorFilter, setter: setDoctorFilter, opts: ['All Doctors', ...Array.from(new Set(tokens.map(t => t.doctorName)))] },
                  { val: sessionFilter, setter: setSessionFilter, opts: ['All Sessions', 'Morning', 'Afternoon', 'Evening'] },
                  { val: statusFilter, setter: setStatusFilter, opts: ['All Status', 'Booked', 'Checked-in', 'Completed', 'Cancelled', 'Waiting'] },
                ].map((f, i) => (
                  <select key={i} value={f.val} onChange={e => f.setter(e.target.value)}
                    className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 cursor-pointer outline-none ml-1">
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Token No.', 'Type', 'Patient Details', 'Doctor', 'Session', 'Time', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map(t => <TokenRow key={t.id} token={t} />)}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
              <p className="text-[10px] text-slate-400">Showing {filteredTokens.length} of {totalToday} entries</p>
              <button onClick={() => handleNavSection('all-tokens', '/hospital/tokens/all')} className="text-xs text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1">
                View All <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Bottom 2-col: Doctors + Auto Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Doctors Management mini */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800">Doctors Management</h4>
                  <p className="text-[10px] text-slate-400">Manage your hospital doctors</p>
                </div>
                <button onClick={() => handleNavSection('doctors', '/hospital/doctors')}
                  className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer border-none hover:bg-blue-700 flex items-center gap-1">
                  <Plus size={10} /> Add Doctor
                </button>
              </div>
              <div className="space-y-2">
                {doctors.slice(0, 3).map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs shrink-0">
                      {doc.name.split(' ').pop()?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">{doc.specialization}</p>
                      <p className="text-[9px] text-slate-400">{doc.qualification} · {doc.experience}+ yrs</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${doc.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {doc.active ? 'Active' : 'Inactive'}
                      </span>
                      <p className="text-[9px] text-slate-400">₹{doc.consultationFee}</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 cursor-pointer"><Edit3 size={11} /></button>
                      <button className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => handleNavSection('doctors', '/hospital/doctors')} className="mt-3 w-full text-xs text-blue-600 font-bold flex items-center justify-center gap-1 cursor-pointer py-1 hover:underline">
                View All Doctors <ChevronRight size={12} />
              </button>
            </div>

            {/* Auto Scheduling mini */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800">Automatic Scheduling</h4>
                  <p className="text-[10px] text-slate-400">BookMyShow-style advance booking</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Booking Open Days', val: `${scheduleConfig.bookingOpensDaysBefore} Days from Today` },
                  { label: 'Max Advance Booking', val: `${scheduleConfig.advanceBookingLimit} Days` },
                  { label: 'Session Type', val: 'Morning / Afternoon / Evening' },
                  { label: 'Auto Token Generation', val: 'Enabled', green: true },
                  { label: 'Token Continuity', val: 'Enabled', green: true },
                  { label: 'Buffer Between Sessions', val: `${scheduleConfig.bufferTime} Minutes` },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                    <span className="text-slate-500">{r.label}</span>
                    <span className={`font-bold ${r.green ? 'text-emerald-600' : 'text-slate-800'}`}>{r.val}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => handleNavSection('auto-schedule', '/hospital/auto-schedule')}
                className="mt-3 w-full bg-slate-800 text-white text-xs font-bold py-2 rounded-xl cursor-pointer border-none hover:bg-slate-700 flex items-center justify-center gap-2">
                <Zap size={12} /> Configure Schedule
              </button>
            </div>
          </div>

          {/* Session Overview */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h4 className="text-xs font-black text-slate-800 mb-3">Session & Schedule Overview</h4>
            <div className="grid grid-cols-4 gap-3 mb-4 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
              {['Session', 'Time', 'Tokens', 'Booked'].map(h => <div key={h}>{h}</div>)}
            </div>
            {scheduleConfig.sessions.map(sess => {
              const sessTokens = tokens.filter(t => t.session === sess.name.toLowerCase());
              const booked = sessTokens.filter(t => ['booked','checked-in','waiting'].includes(t.status)).length;
              const pct = Math.round((booked / sess.maxTokens) * 100);
              return (
                <div key={sess.id} className="grid grid-cols-4 gap-3 items-center py-2 border-b border-slate-50">
                  <div className="font-bold text-slate-800 text-xs">{sess.name}</div>
                  <div className="text-[10px] text-slate-500">{sess.startTime} - {sess.endTime}</div>
                  <div className="font-bold text-slate-800 text-xs">{sess.maxTokens}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 shrink-0">{pct}%</span>
                  </div>
                </div>
              );
            })}
            {/* Mini booking calendar */}
            <div className="mt-4">
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="text-[9px] font-bold text-slate-400">{d}</div>
                ))}
                {[19,20,21,22,23,24,25].map((d) => (
                  <button key={d} className={`text-[10px] font-bold py-1 rounded-lg cursor-pointer border-none transition-colors ${d === 23 ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Quick Panels (1/3 width) */}
        <div className="space-y-4">
          {/* Push Notification */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-blue-600" />
              <h4 className="text-xs font-black text-slate-800">Push Notification</h4>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">Send notification to patients</p>
            <textarea
              value={notifMsg}
              onChange={e => setNotifMsg(e.target.value)}
              rows={3}
              placeholder="Type your message here..."
              className="w-full text-xs border border-slate-100 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 bg-slate-50"
            />
            <p className="text-[9px] text-slate-400 text-right mt-1">{notifMsg.length}/160</p>
            <p className="text-[10px] font-bold text-slate-600 mb-1.5 mt-2">Send To</p>
            <div className="flex gap-3 mb-3">
              {['all','custom'].map(t => (
                <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="target" value={t} checked={notifTarget === t} onChange={() => setNotifTarget(t)} className="accent-blue-600" />
                  <span className="text-[10px] font-semibold text-slate-600 capitalize">{t === 'all' ? 'All Patients' : 'Custom Numbers'}</span>
                </label>
              ))}
            </div>
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer border-none flex items-center justify-center gap-2">
              <Send size={12} /> Send Notification
            </button>
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-blue-600" />
                <h4 className="text-xs font-black text-slate-800">Today's Schedule</h4>
              </div>
              <button className="text-[10px] text-blue-600 font-bold cursor-pointer hover:underline">View All</button>
            </div>
            <div className="space-y-2">
              {doctors.slice(0, 3).map((doc, i) => {
                const times = [['09:00 AM', '01:00 PM'], ['01:00 PM', '06:00 PM'], ['05:00 PM', '09:00 PM']];
                const colors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600'];
                return (
                  <div key={doc.id} className={`${colors[i]} rounded-xl p-3 text-white`}>
                    <p className="text-[10px] font-black leading-none">{doc.name}</p>
                    <p className="text-white/70 text-[9px] mt-0.5">{doc.specialization}</p>
                    <p className="text-white/90 text-[10px] font-bold mt-1.5">{times[i][0]} – {times[i][1]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Token Validation (Revisit) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-blue-600" />
              <h4 className="text-xs font-black text-slate-800">Token Validation (Revisit)</h4>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={tokenValidInput}
                onChange={e => setTokenValidInput(e.target.value)}
                placeholder="Enter Token Number"
                className="flex-1 text-xs border border-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
              <button
                onClick={handleTokenValidate}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer border-none"
              >
                Validate
              </button>
            </div>
            {validResult ? (
              <div className="space-y-2">
                {[
                  { label: 'Free Revisit Validity', val: validResult.isRevisit ? '3 Days' : 'N/A' },
                  { label: 'Token No.', val: validResult.tokenNo },
                  { label: 'Valid Upto', val: validResult.revisitValidUpto || '—' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-[10px]">
                    <span className="text-slate-500">{r.label}</span>
                    <span className="font-bold text-slate-800">{r.val}</span>
                  </div>
                ))}
                {validResult.isRevisit && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mt-1">
                    <CheckCircle size={12} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700">Token is Valid for Revisit</span>
                  </div>
                )}
                <button className="w-full bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl cursor-pointer border-none hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                  <Activity size={12} /> Print Prescription
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-[10px] text-slate-400">Enter a token number to validate</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
