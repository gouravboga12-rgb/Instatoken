import React, { useState, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import {
  Banknote, Clock, CheckCircle2, AlertCircle, Send,
  Copy, RefreshCw,
  Building2, Smartphone, TrendingUp, X
} from 'lucide-react';

interface PayoutSummary {
  paymentMode: string;
  bankDetails: { bank_account_holder?: string; bank_account_number?: string; bank_name?: string; bank_ifsc?: string; upi_id?: string; upi_phone?: string };
  totalCollectedOnline: number;
  totalSettled: number;
  pendingDue: number;
  unsettledCount: number;
  unsettledTokens?: Array<{
    id: string;
    tokenNo: number | string;
    patientName: string;
    doctorName: string;
    departmentName: string;
    consultationFee: number;
    bookingDate: string;
    paymentMethod: string;
    status: string;
  }>;
}

interface Settlement {
  id: string;
  payout_amount: number;
  payment_method: string;
  utr_reference: string;
  beneficiary_bank_account?: string;
  created_at_ist: string;
}

interface PayoutRequest {
  id: string;
  requested_amount: number;
  status: string;
  notes: string;
  created_at_ist: string;
  created_at: string;
}

const toIST = (d: string) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';

export const HospitalPayouts: React.FC = () => {
  const { hospitalProfile, authToken } = useHospital();
  const hospitalId = hospitalProfile?.id;

  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'requests'>('pending');

  // Request Payout Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestError, setRequestError] = useState('');

  // Copy helper
  const [copied, setCopied] = useState('');
  const copyToClipboard = (val: string, label: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const fetchData = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const [sumRes, setRes, reqRes] = await Promise.all([
        fetch(`/api/hospitals/${hospitalId}/payout-summary`, { headers }),
        fetch(`/api/hospitals/${hospitalId}/payout-settlements`, { headers }),
        fetch(`/api/hospitals/${hospitalId}/payout-requests`, { headers }),
      ]);
      const sumData = await sumRes.json();
      const setData = await setRes.json();
      const reqData = await reqRes.json();
      if (sumData.success) setSummary(sumData);
      if (setData.success) setSettlements(setData.settlements || []);
      if (reqData.success) setRequests(reqData.requests || []);
    } catch (e) {
      console.warn('Error fetching payout data:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [hospitalId]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');
    const amt = parseFloat(requestAmount);
    if (!amt || amt <= 0) { setRequestError('Enter a valid amount.'); return; }
    if (summary && amt > summary.pendingDue) { setRequestError(`Amount cannot exceed pending due ₹${summary.pendingDue.toFixed(2)}.`); return; }
    setRequestLoading(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`/api/hospitals/${hospitalId}/payout-requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ requested_amount: amt, notes: requestNotes })
      });
      const data = await res.json();
      if (data.success) {
        setRequestSuccess('Payout request submitted! InstaToken admin will process within 2–3 business days.');
        setRequestAmount(''); setRequestNotes('');
        await fetchData();
        setTimeout(() => { setShowRequestModal(false); setRequestSuccess(''); }, 3000);
      } else {
        setRequestError(data.message || 'Failed to submit request.');
      }
    } catch (e) {
      setRequestError('Network error. Please try again.');
    }
    setRequestLoading(false);
  };

  const bd = summary?.bankDetails || {};
  const isFullOnline = summary?.paymentMode === 'full_online';

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-3">
        <RefreshCw size={28} className="animate-spin text-blue-500 mx-auto" />
        <p className="text-sm font-bold text-slate-500">Loading payout data...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">InstaToken Payouts & Settlements</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {isFullOnline
              ? 'Full Online Payment enabled · Doctor fees collected online & remitted to your bank.'
              : 'Standard mode · Only token booking fees collected online. Doctor fees paid at cabin.'}
          </p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer border-solid">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Not Full-Online Banner */}
      {!isFullOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-black text-amber-900">Full Online Payment Not Enabled</h3>
            <p className="text-xs text-amber-700 font-medium mt-1">
              Your hospital is currently on <strong>Pay at Hospital</strong> mode. Patients pay the doctor consultation fee directly at your cabin.
              To collect consultation fees online via InstaToken, enable <strong>Full Online Payment</strong> in <strong>Settings → Payout & Online Payments</strong>.
            </p>
          </div>
        </div>
      )}

      {isFullOnline && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Collected Online</span>
              <div className="text-3xl font-black text-slate-800 mt-1">₹{(summary?.totalCollectedOnline || 0).toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Doctor fees from full-online bookings</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Cleared to Bank</span>
              <div className="text-3xl font-black text-emerald-600 mt-1">₹{(summary?.totalSettled || 0).toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Already sent to your account</p>
            </div>
            <div className={`rounded-2xl p-5 shadow-xs border ${(summary?.pendingDue || 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending Due from InstaToken</span>
              <div className={`text-3xl font-black mt-1 ${(summary?.pendingDue || 0) > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                ₹{(summary?.pendingDue || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {(summary?.pendingDue || 0) > 0 ? `${summary?.unsettledCount || 0} visits pending settlement` : 'All dues cleared ✓'}
              </p>
            </div>
          </div>

          {/* Bank Details Card + Request Payout */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-600" />
                  Registered Payout Bank Account
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {bd.bank_name && (
                    <div>
                      <span className="text-slate-400 font-bold block">Bank Name</span>
                      <span className="text-slate-800 font-black">{bd.bank_name}</span>
                    </div>
                  )}
                  {bd.bank_account_holder && (
                    <div>
                      <span className="text-slate-400 font-bold block">Account Holder</span>
                      <span className="text-slate-800 font-black">{bd.bank_account_holder}</span>
                    </div>
                  )}
                  {bd.bank_account_number && (
                    <div>
                      <span className="text-slate-400 font-bold block">Account Number</span>
                      <span className="text-slate-800 font-black font-mono">
                        {'•'.repeat(bd.bank_account_number.length - 4) + bd.bank_account_number.slice(-4)}
                      </span>
                    </div>
                  )}
                  {bd.bank_ifsc && (
                    <div>
                      <span className="text-slate-400 font-bold block">IFSC Code</span>
                      <span className="text-slate-800 font-black font-mono flex items-center gap-1.5">
                        {bd.bank_ifsc}
                        <button onClick={() => copyToClipboard(bd.bank_ifsc!, 'ifsc')} className="text-blue-500 hover:text-blue-700 cursor-pointer border-none bg-transparent p-0">
                          <Copy size={11} />
                        </button>
                        {copied === 'ifsc' && <span className="text-emerald-600 text-[10px] font-bold">Copied!</span>}
                      </span>
                    </div>
                  )}
                  {bd.upi_id && (
                    <div className="flex items-center gap-1.5">
                      <div>
                        <span className="text-slate-400 font-bold block flex items-center gap-1"><Smartphone size={10} /> UPI ID</span>
                        <span className="text-slate-800 font-black flex items-center gap-1.5">
                          {bd.upi_id}
                          <button onClick={() => copyToClipboard(bd.upi_id!, 'upi')} className="text-blue-500 hover:text-blue-700 cursor-pointer border-none bg-transparent p-0">
                            <Copy size={11} />
                          </button>
                          {copied === 'upi' && <span className="text-emerald-600 text-[10px] font-bold">Copied!</span>}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {!bd.bank_account_number && !bd.upi_id && (
                  <p className="text-xs text-amber-600 font-bold mt-2">
                    ⚠️ No bank details found. Please add them in Settings → Payout & Online Payments.
                  </p>
                )}
              </div>

              {/* Request Payout Button */}
              {(summary?.pendingDue || 0) > 0 && (
                <button
                  onClick={() => { setShowRequestModal(true); setRequestAmount(String(summary?.pendingDue || '')); }}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer border-none transition-colors shrink-0"
                >
                  <Send size={14} />
                  Request Payout (₹{(summary?.pendingDue || 0).toLocaleString('en-IN')})
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-100">
              {(['pending', 'history', 'requests'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-none ${
                    activeTab === tab ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'pending' ? `Pending Visits (${summary?.unsettledCount || 0})` : tab === 'history' ? `Payout History (${settlements.length})` : `My Requests (${requests.length})`}
                </button>
              ))}
            </div>

            {/* Tab: Pending Visits */}
            {activeTab === 'pending' && (
              <div className="p-4">
                {(summary?.unsettledCount || 0) === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-black text-slate-700">All dues cleared!</p>
                    <p className="text-xs text-slate-400 mt-1">InstaToken has settled all pending doctor consultation fees.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 font-semibold mb-2">
                      These are doctor consultation fees collected online from patients, pending transfer to your bank.
                    </p>
                    {summary?.unsettledTokens && summary.unsettledTokens.length > 0 ? (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {summary.unsettledTokens.map((t) => (
                          <div key={t.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-xl text-xs shrink-0">
                                #{t.tokenNo}
                              </span>
                              <div>
                                <h4 className="font-black text-slate-900 text-sm">{t.patientName}</h4>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {t.doctorName} · <span className="text-blue-600 font-semibold">{t.departmentName}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-slate-900 text-base">₹{t.consultationFee}</span>
                              <span className="text-[9.5px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full block mt-0.5 border border-blue-100">
                                ● Due to Hospital
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-400 font-semibold">
                        <TrendingUp size={24} className="mx-auto mb-2 text-slate-300" />
                        Detailed per-token breakdown will appear here.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Payout History */}
            {activeTab === 'history' && (
              <div className="p-4">
                {settlements.length === 0 ? (
                  <div className="text-center py-10">
                    <Banknote size={32} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-500">No settlements yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Payouts from InstaToken will appear here once processed.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settlements.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <div>
                          <div className="text-sm font-black text-emerald-800">₹{Number(s.payout_amount).toLocaleString('en-IN')} Received</div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {s.payment_method} · UTR: <span className="font-mono font-bold text-slate-700">{s.utr_reference}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">{s.created_at_ist}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-700 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={10} /> Settled
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: My Requests */}
            {activeTab === 'requests' && (
              <div className="p-4">
                {requests.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock size={32} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-500">No payout requests yet.</p>
                    <p className="text-xs text-slate-400 mt-1">When you request a payout, it will appear here with its status.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                          <div className="text-sm font-black text-slate-800">₹{Number(r.requested_amount).toLocaleString('en-IN')} Requested</div>
                          {r.notes && <div className="text-[11px] text-slate-500 font-medium mt-0.5">{r.notes}</div>}
                          <div className="text-[11px] text-slate-400 font-medium">{r.created_at_ist || toIST(r.created_at)}</div>
                        </div>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                          r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          r.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {r.status === 'pending' ? '⏳ Processing' : r.status === 'fulfilled' ? '✓ Fulfilled' : r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">Request Payout from InstaToken</h3>
              <button onClick={() => setShowRequestModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400">
                <X size={16} />
              </button>
            </div>

            {requestSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-black text-emerald-800">{requestSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Total Pending Due</span>
                    <span className="text-amber-700 font-black">₹{(summary?.pendingDue || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {bd.bank_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Transfer To</span>
                      <span className="text-slate-700 font-black">{bd.bank_name} · ****{bd.bank_account_number?.slice(-4)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Amount to Request (₹) *</label>
                  <input
                    type="number"
                    value={requestAmount}
                    onChange={e => setRequestAmount(e.target.value)}
                    max={summary?.pendingDue}
                    min="1"
                    step="1"
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Note (Optional)</label>
                  <input
                    type="text"
                    value={requestNotes}
                    onChange={e => setRequestNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                    placeholder="e.g. Urgent - month-end pharmacy purchase"
                  />
                </div>

                {requestError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-semibold">
                    <AlertCircle size={13} /> {requestError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={requestLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none text-xs"
                >
                  {requestLoading ? 'Submitting...' : <><Send size={14} /> Submit Payout Request</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
