import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import type { TokenRecord } from '../../context/HospitalContext';
import {
  Plus, Search, XCircle, CheckCircle, Wifi, WifiOff,
  Printer, X
} from 'lucide-react';

const statusColors: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-700',
  'checked-in': 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  waiting: 'bg-purple-100 text-purple-700',
  skipped: 'bg-slate-100 text-slate-600',
};

// ─── Walk-in Token Generator Modal ───────────────────────────────────────────
const WalkInModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { generateWalkInToken, doctors, departments } = useHospital();
  const [form, setForm] = useState({
    patientName: '', patientPhone: '', patientAge: '', patientGender: 'Male',
    address: '', departmentId: '', doctorId: '', session: 'morning' as 'morning'|'afternoon'|'evening',
  });
  const [generated, setGenerated] = useState<TokenRecord | null>(null);
  const [error, setError] = useState('');

  const activeDepts = departments.filter(d => d.active);
  const availDoctors = form.departmentId ? doctors.filter(d => d.departmentId === form.departmentId && d.active) : doctors.filter(d => d.active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName || !form.patientPhone || !form.patientAge || !form.departmentId || !form.doctorId) {
      setError('Please fill all required fields.');
      return;
    }
    const token = generateWalkInToken({
      ...form, patientAge: parseInt(form.patientAge),
    });
    setGenerated(token);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-800">Generate Walk-in Token</h3>
            <p className="text-xs text-slate-400 mt-0.5">Register patient and assign token number</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer border-none"><X size={18} /></button>
        </div>

        {!generated ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Patient Name *</label>
                <input type="text" value={form.patientName} onChange={e => setForm(p => ({...p, patientName: e.target.value}))}
                  placeholder="Full name" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Mobile Number *</label>
                <input type="tel" value={form.patientPhone} onChange={e => setForm(p => ({...p, patientPhone: e.target.value}))}
                  placeholder="10-digit mobile" maxLength={10} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Age *</label>
                <input type="number" value={form.patientAge} onChange={e => setForm(p => ({...p, patientAge: e.target.value}))}
                  placeholder="Age" min={1} max={120} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Gender *</label>
                <select value={form.patientGender} onChange={e => setForm(p => ({...p, patientGender: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                  {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Address</label>
                <input type="text" value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))}
                  placeholder="Patient address" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Department *</label>
                <select value={form.departmentId} onChange={e => setForm(p => ({...p, departmentId: e.target.value, doctorId: ''}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white" required>
                  <option value="">Select Department</option>
                  {activeDepts.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Doctor *</label>
                <select value={form.doctorId} onChange={e => setForm(p => ({...p, doctorId: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white" required>
                  <option value="">Select Doctor</option>
                  {availDoctors.map(d => <option key={d.id} value={d.id}>{d.name} (₹{d.consultationFee})</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Session *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['morning','afternoon','evening'] as const).map(s => (
                    <button type="button" key={s} onClick={() => setForm(p => ({...p, session: s}))}
                      className={`py-2.5 rounded-xl text-xs font-bold capitalize cursor-pointer border-2 transition-all ${form.session === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {s === 'morning' ? '🌅 Morning' : s === 'afternoon' ? '☀️ Afternoon' : '🌙 Evening'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm cursor-pointer border-none">Generate Token</button>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">Token Generated!</h3>
            <p className="text-slate-400 text-sm mb-6">Walk-in token has been successfully created</p>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 text-white mb-6">
              <p className="text-sm opacity-75 mb-1">Token Number</p>
              <p className="text-6xl font-black mb-4">#{generated.tokenNo}</p>
              <div className="grid grid-cols-2 gap-3 text-left text-sm">
                <div><p className="opacity-60 text-xs">Patient</p><p className="font-bold">{generated.patientName}</p></div>
                <div><p className="opacity-60 text-xs">Doctor</p><p className="font-bold">{generated.doctorName}</p></div>
                <div><p className="opacity-60 text-xs">Queue Position</p><p className="font-bold">#{generated.queuePosition}</p></div>
                <div><p className="opacity-60 text-xs">Est. Wait</p><p className="font-bold">~{generated.estimatedWait} mins</p></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold cursor-pointer">Close</button>
              <button className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm cursor-pointer border-none flex items-center justify-center gap-2">
                <Printer size={15} /> Print Token
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Token Table ──────────────────────────────────────────────────────────────
const TokenTable: React.FC<{ tokens: TokenRecord[]; title: string }> = ({ tokens: toks, title }) => {
  const { updateTokenStatus, cancelToken } = useHospital();
  const [search, setSearch] = useState('');
  const filtered = toks.filter(t =>
    t.patientName.toLowerCase().includes(search.toLowerCase()) ||
    t.patientPhone.includes(search) ||
    String(t.tokenNo).includes(search)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-black text-slate-800 text-sm">{title} <span className="text-slate-400 font-normal text-xs">({toks.length})</span></h3>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search token, patient, phone..."
            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 w-52" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['#', 'Type', 'Patient', 'Doctor', 'Session', 'Time', 'Fee', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-sm text-slate-400">No tokens found</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-extrabold text-slate-800">{t.tokenNo}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit ${t.type === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    {t.type === 'online' ? <Wifi size={9}/> : <WifiOff size={9}/>} {t.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800">{t.patientName}</p>
                  <p className="text-[10px] text-slate-400">{t.patientPhone} · {t.patientGender},{t.patientAge}Y</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">{t.doctorName}</td>
                <td className="px-4 py-3 text-xs text-slate-600 capitalize">{t.session}</td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-700">{t.time}</td>
                <td className="px-4 py-3 text-xs font-bold text-slate-800">₹{t.consultationFee}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${statusColors[t.status] || 'bg-slate-100 text-slate-700'}`}>
                    {t.status.replace('-',' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {t.status === 'booked' && (
                      <button onClick={() => updateTokenStatus(t.id, 'checked-in')} title="Check In"
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-600 cursor-pointer transition-colors">
                        <CheckCircle size={13} />
                      </button>
                    )}
                    {(t.status === 'booked' || t.status === 'checked-in') && (
                      <button onClick={() => cancelToken(t.id)} title="Cancel"
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer transition-colors">
                        <XCircle size={13} />
                      </button>
                    )}
                    <button title="Print" className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
                      <Printer size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main TokenManagement ─────────────────────────────────────────────────────
export const TokenManagement: React.FC = () => {
  const { tokens } = useHospital();
  const [showWalkIn, setShowWalkIn] = useState(false);
  const location = useLocation();

  const getTokenSet = () => {
    const path = location.pathname;
    if (path.includes('online')) return { title: 'Online Tokens', toks: tokens.filter(t => t.type === 'online') };
    if (path.includes('offline')) return { title: 'Offline / Walk-in Tokens', toks: tokens.filter(t => t.type === 'offline') };
    if (path.includes('today')) return { title: "Today's Tokens", toks: tokens };
    if (path.includes('upcoming')) return { title: 'Upcoming Tokens', toks: tokens.filter(t => t.status === 'booked') };
    if (path.includes('completed')) return { title: 'Completed Tokens', toks: tokens.filter(t => t.status === 'completed') };
    if (path.includes('cancelled')) return { title: 'Cancelled Tokens', toks: tokens.filter(t => t.status === 'cancelled') };
    if (path.includes('revisit')) return { title: 'Revisit Tokens', toks: tokens.filter(t => t.isRevisit) };
    if (path.includes('add')) return null;
    return { title: 'All Tokens', toks: tokens };
  };

  const tokenSet = getTokenSet();

  // Add Token page (walk-in generator)
  if (!tokenSet) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800">Add Walk-in Token</h2>
            <p className="text-xs text-slate-400 mt-1">Generate a token for walk-in / offline patient</p>
          </div>
        </div>
        <div className="max-w-2xl">
          {showWalkIn
            ? <WalkInModal onClose={() => setShowWalkIn(false)} />
            : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus size={36} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Generate Walk-in Token</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  Register a new patient at the reception desk and automatically assign them a token number with queue position.
                </p>
                <button onClick={() => setShowWalkIn(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-2xl cursor-pointer border-none flex items-center gap-2 mx-auto text-sm">
                  <Plus size={16} /> Generate Walk-in Token
                </button>
              </div>
            )
          }
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">{tokenSet.title}</h2>
          <p className="text-xs text-slate-400 mt-1">{tokenSet.toks.length} tokens found</p>
        </div>
        <button onClick={() => setShowWalkIn(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs">
          <Plus size={14} /> Add Walk-in Token
        </button>
      </div>
      <TokenTable tokens={tokenSet.toks} title={tokenSet.title} />
      {showWalkIn && <WalkInModal onClose={() => setShowWalkIn(false)} />}
    </div>
  );
};
