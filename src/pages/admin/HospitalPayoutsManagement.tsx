import React, { useState, useEffect } from 'react';
import {
  Banknote, CheckCircle2, Clock, Copy,
  RefreshCw, Search, Send, X, AlertCircle
} from 'lucide-react';

interface HospitalSettlementRecord {
  id: string;
  name: string;
  city: string;
  payment_mode: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  upi_id?: string;
  upi_phone?: string;
  totalCollected: number;
  totalSettled: number;
  pendingDue: number;
  tokenCount: number;
  pendingRequests?: any[];
}

export const HospitalPayoutsManagement: React.FC = () => {
  const [hospitals, setHospitals] = useState<HospitalSettlementRecord[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [totalCollectedAll, setTotalCollectedAll] = useState(0);
  const [totalSettledAll, setTotalSettledAll] = useState(0);
  const [totalPendingRequests, setTotalPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'hospitals' | 'history' | 'requests'>('hospitals');

  // Settle Modal State
  const [settleTarget, setSettleTarget] = useState<HospitalSettlementRecord | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'NEFT' | 'IMPS' | 'RTGS' | 'UPI'>('NEFT');
  const [utrReference, setUtrReference] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState('');
  const [settleSuccess, setSettleSuccess] = useState('');

  // Statement Modal State
  const [statementTarget, setStatementTarget] = useState<HospitalSettlementRecord | null>(null);
  const [statementTokens, setStatementTokens] = useState<any[]>([]);
  const [statementSettlements, setStatementSettlements] = useState<any[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState('');
  const copyText = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    });
  };

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hospital-settlements');
      const data = await res.json();
      if (data.success) {
        setHospitals(data.hospitals || []);
        setTotalDue(data.totalDue || 0);
        setTotalCollectedAll(data.totalCollectedAll || 0);
        setTotalSettledAll(data.totalSettledAll || 0);
        setTotalPendingRequests(data.totalPendingRequests || 0);
      }
    } catch (e) {
      console.warn('Error fetching admin hospital settlements:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  // Open Settle Modal
  const openSettleModal = (h: HospitalSettlementRecord, prefilledAmt?: number) => {
    setSettleTarget(h);
    setPayoutAmount(String(prefilledAmt !== undefined ? prefilledAmt : h.pendingDue));
    setPaymentMethod('NEFT');
    setUtrReference('');
    setSettleNotes('');
    setSettleError('');
    setSettleSuccess('');
  };

  // Submit Settlement
  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTarget) return;
    const amt = parseFloat(payoutAmount);
    if (!amt || amt <= 0) {
      setSettleError('Please enter a valid payout amount.');
      return;
    }
    if (!utrReference.trim()) {
      setSettleError('Bank UTR / Transaction Reference Number is strictly required.');
      return;
    }

    setSettleLoading(true);
    setSettleError('');
    try {
      const res = await fetch(`/api/admin/hospital-settlements/${settleTarget.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_amount: amt,
          payment_method: paymentMethod,
          utr_reference: utrReference.trim(),
          notes: settleNotes.trim(),
          settled_by_admin: 'Super Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettleSuccess(data.message || `Payout of ₹${amt} recorded successfully.`);
        await fetchSettlements();
        setTimeout(() => {
          setSettleTarget(null);
          setSettleSuccess('');
        }, 2500);
      } else {
        setSettleError(data.message || 'Settlement failed.');
      }
    } catch (e: any) {
      setSettleError(e.message || 'Network error.');
    }
    setSettleLoading(false);
  };

  // Open Statement Modal
  const openStatementModal = async (h: HospitalSettlementRecord) => {
    setStatementTarget(h);
    setStatementLoading(true);
    try {
      const res = await fetch(`/api/admin/hospital-settlements/${h.id}/statement`);
      const data = await res.json();
      if (data.success) {
        setStatementTokens(data.tokens || []);
        setStatementSettlements(data.settlements || []);
      }
    } catch (e) {
      console.warn('Error fetching hospital statement:', e);
    }
    setStatementLoading(false);
  };

  // Filtered hospitals
  const filteredHospitals = hospitals.filter(h => {
    const q = searchQuery.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q) || (h.bank_name || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Banknote className="text-emerald-400" size={22} />
            <span>Hospital Full Online Payments & Settlements</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Doctor consultation fees collected from patient advance bookings · Settle dues to hospital bank accounts
          </p>
        </div>

        <button
          onClick={fetchSettlements}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer self-start sm:self-auto transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Online Doctor Fees</span>
          <div className="text-2xl font-black text-white mt-1">₹{totalCollectedAll.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Collected via Razorpay</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Remitted to Hospitals</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">₹{totalSettledAll.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Cleared via Bank / UPI</p>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 shadow-sm bg-linear-to-br from-slate-900 to-amber-950/20">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Net Due Across Hospitals</span>
          <div className="text-2xl font-black text-amber-300 mt-1">₹{totalDue.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-amber-400/80 font-medium mt-0.5">Pending disbursement</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Enrolled Full-Online Hospitals</span>
          <div className="text-2xl font-black text-blue-400 mt-1">{hospitals.length}</div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {hospitals.filter(h => h.pendingRequests && h.pendingRequests.length > 0).length > 0 ? (
              <span className="text-amber-400 font-bold">
                {hospitals.filter(h => h.pendingRequests && h.pendingRequests.length > 0).length} hospital(s) requesting payout
                {totalPendingRequests > hospitals.filter(h => h.pendingRequests && h.pendingRequests.length > 0).length ? ` (${totalPendingRequests} submissions)` : ''}
              </span>
            ) : (
              'All payout requests processed'
            )}
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveSubTab('hospitals')}
          className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeSubTab === 'hospitals'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Hospital Due Ledger ({filteredHospitals.length})
        </button>
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeSubTab === 'requests'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Hospital Payout Requests</span>
          {hospitals.filter(h => h.pendingRequests && h.pendingRequests.length > 0).length > 0 && (
            <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {hospitals.filter(h => h.pendingRequests && h.pendingRequests.length > 0).length}
            </span>
          )}
        </button>
      </div>

      {/* Hospital Due Ledger Table */}
      {activeSubTab === 'hospitals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search hospital or city..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-xs text-slate-400 font-bold">
              Showing {filteredHospitals.length} hospital(s) with Full Online Payment
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Hospital</th>
                  <th className="py-3 px-4">Bank Account Details</th>
                  <th className="py-3 px-4">UPI Details</th>
                  <th className="py-3 px-4 text-right">Collected (₹)</th>
                  <th className="py-3 px-4 text-right">Cleared (₹)</th>
                  <th className="py-3 px-4 text-right">Pending Due (₹)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 font-bold">
                      No hospitals with Full Online Payment found.
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map(h => (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Hospital info */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-white text-sm">{h.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{h.city} · ID: {h.id}</div>
                        {h.pendingRequests && h.pendingRequests.length > 0 && (
                          <span className="inline-flex items-center gap-1 mt-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30">
                            <Clock size={10} /> Requested ₹{Number(h.pendingRequests[0].requested_amount).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      {/* Bank Details */}
                      <td className="py-3.5 px-4 font-mono">
                        {h.bank_account_number ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div className="text-slate-300 font-bold">{h.bank_name || 'Bank'}</div>
                            <div className="text-slate-400">
                              A/C: <span className="text-white font-bold">{h.bank_account_number}</span>
                              <button
                                onClick={() => copyText(h.bank_account_number!, `${h.id}-ac`)}
                                className="ml-1 text-blue-400 hover:text-blue-300 cursor-pointer bg-transparent border-none p-0 inline-flex align-middle"
                              >
                                <Copy size={11} />
                              </button>
                              {copiedKey === `${h.id}-ac` && <span className="text-emerald-400 text-[9px] ml-1">Copied!</span>}
                            </div>
                            <div className="text-slate-400">
                              IFSC: <span className="text-emerald-400 font-bold">{h.bank_ifsc}</span>
                              <button
                                onClick={() => copyText(h.bank_ifsc!, `${h.id}-ifsc`)}
                                className="ml-1 text-blue-400 hover:text-blue-300 cursor-pointer bg-transparent border-none p-0 inline-flex align-middle"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{h.bank_account_holder}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No bank details added</span>
                        )}
                      </td>

                      {/* UPI Details */}
                      <td className="py-3.5 px-4">
                        {h.upi_id ? (
                          <div className="text-[11px]">
                            <div className="font-bold text-white flex items-center gap-1">
                              <span>{h.upi_id}</span>
                              <button
                                onClick={() => copyText(h.upi_id!, `${h.id}-upi`)}
                                className="text-blue-400 hover:text-blue-300 cursor-pointer bg-transparent border-none p-0 inline-flex"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                            {copiedKey === `${h.id}-upi` && <span className="text-emerald-400 text-[9px]">Copied!</span>}
                            {h.upi_phone && <div className="text-slate-400 text-[10px]">Phone: {h.upi_phone}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No UPI added</span>
                        )}
                      </td>

                      {/* Financials */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-200">
                        ₹{h.totalCollected.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                        ₹{h.totalSettled.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-xl font-black text-xs ${
                          h.pendingDue > 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          ₹{h.pendingDue.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openSettleModal(h)}
                            disabled={h.pendingDue <= 0}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 cursor-pointer border-none ${
                              h.pendingDue > 0
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Send size={11} />
                            <span>Record Payout</span>
                          </button>
                          <button
                            onClick={() => openStatementModal(h)}
                            className="px-2.5 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors"
                          >
                            Statement
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hospital Payout Requests View */}
      {activeSubTab === 'requests' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">On-Demand Payout Requests from Hospitals</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hospitals submit these requests when they need funds cleared. Each hospital is consolidated into a single card to prevent duplicate payouts.
            </p>
          </div>

          <div className="space-y-3">
            {hospitals.filter(h => h.pendingRequests && h.pendingRequests.length > 0).length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-bold">
                No active payout requests from hospitals.
              </div>
            ) : (
              hospitals
                .filter(h => h.pendingRequests && h.pendingRequests.length > 0)
                .map(h => {
                  const reqList = h.pendingRequests || [];
                  const repeatCount = reqList.length;
                  const isRepeated = repeatCount > 1;
                  const latestReq = reqList[0] || {};
                  const requestedAmt = Number(latestReq.requested_amount || h.pendingDue);
                  const submittedTime = latestReq.created_at_ist || (latestReq.created_at ? new Date(latestReq.created_at).toLocaleString('en-IN') : 'Recently');

                  return (
                    <div
                      key={h.id}
                      className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isRepeated
                          ? 'bg-amber-950/20 border-2 border-amber-500/50 shadow-md shadow-amber-500/5'
                          : 'bg-slate-800/60 border border-amber-500/30'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-sm sm:text-base">{h.name}</span>
                          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                            Pending Settlement
                          </span>

                          {isRepeated && (
                            <span className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <span>Requested {repeatCount} Times</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-300">
                          Requested Amount: <strong className="text-amber-300 text-sm sm:text-base font-mono font-black">₹{requestedAmt.toLocaleString('en-IN')}</strong>
                          {latestReq.notes && <span className="ml-2 text-slate-400">· "{latestReq.notes}"</span>}
                        </div>

                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1">
                          <span>Latest Request: <strong className="text-slate-400">{submittedTime}</strong></span>
                          {isRepeated && (
                            <span className="text-rose-400 font-bold ml-1">
                              · (Hospital submitted {repeatCount} requests for this same pending balance. Single payout covers all.)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => openSettleModal(h, requestedAmt)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-md cursor-pointer border-none transition-all flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto"
                      >
                        <Send size={13} />
                        <span>Settle Now</span>
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Record Payout Settlement Modal */}
      {settleTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Record Payout Settlement</h3>
                <p className="text-xs text-slate-400">{settleTarget.name} · {settleTarget.city}</p>
              </div>
              <button
                onClick={() => setSettleTarget(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {settleSuccess ? (
              <div className="bg-emerald-500/20 border border-emerald-500/40 p-5 rounded-2xl text-center space-y-2">
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                <p className="text-sm font-black text-emerald-300">{settleSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmSettlement} className="space-y-3.5">
                {/* Beneficiary Details Box */}
                <div className="bg-slate-800/80 rounded-2xl p-3.5 text-xs space-y-1.5 border border-slate-700">
                  <div className="text-[10px] uppercase font-black text-slate-400">Target Beneficiary Account</div>
                  <div className="text-white font-bold">{settleTarget.bank_name || 'Bank'} · A/C: {settleTarget.bank_account_number}</div>
                  <div className="text-emerald-400 font-mono text-[11px]">IFSC: {settleTarget.bank_ifsc}</div>
                  {settleTarget.upi_id && <div className="text-blue-300 font-mono text-[11px]">UPI: {settleTarget.upi_id}</div>}
                  <div className="text-amber-400 font-black pt-1 border-t border-slate-700/60">
                    Outstanding Due: ₹{settleTarget.pendingDue.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Disbursed Amount (₹) *</label>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                    required
                    min="1"
                    step="0.01"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-black text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Payment Method *</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="NEFT">NEFT</option>
                      <option value="IMPS">IMPS</option>
                      <option value="RTGS">RTGS</option>
                      <option value="UPI">UPI Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Bank UTR / Txn Ref # *</label>
                    <input
                      type="text"
                      value={utrReference}
                      onChange={e => setUtrReference(e.target.value)}
                      placeholder="e.g. 412390128912"
                      required
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Admin Notes (Optional)</label>
                  <input
                    type="text"
                    value={settleNotes}
                    onChange={e => setSettleNotes(e.target.value)}
                    placeholder="e.g. Cleared via HDFC Corporate Portal"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {settleError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={14} />
                    {settleError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSettleTarget(null)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settleLoading}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer border-none flex items-center justify-center gap-1.5"
                  >
                    {settleLoading ? 'Recording...' : <><CheckCircle2 size={14} /> Confirm & Mark Settled</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Hospital Statement Drawer / Modal */}
      {statementTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col p-6 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">{statementTarget.name} — Financial Statement</h3>
                <p className="text-xs text-slate-400">Audit trail of advance patient tokens & past settlement disbursements</p>
              </div>
              <button
                onClick={() => setStatementTarget(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {statementLoading ? (
              <div className="py-16 text-center">
                <RefreshCw size={28} className="animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold">Loading statement data...</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Collected Online</span>
                    <strong className="text-white font-black text-sm">₹{statementTarget.totalCollected.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Settled</span>
                    <strong className="text-emerald-400 font-black text-sm">₹{statementTarget.totalSettled.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pending Due</span>
                    <strong className="text-amber-300 font-black text-sm">₹{statementTarget.pendingDue.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Past Settlements Log */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Past Payout Disbursements ({statementSettlements.length})</h4>
                  {statementSettlements.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No payouts disbursed yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {statementSettlements.map((s: any) => (
                        <div key={s.id} className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <div className="font-black text-emerald-300">₹{Number(s.payout_amount).toLocaleString('en-IN')}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {s.payment_method} · UTR: <span className="font-mono text-white font-bold">{s.utr_reference}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">{s.created_at_ist}</div>
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                            Settled ✓
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tokens List */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Patient Advance Bookings ({statementTokens.length})</h4>
                  {statementTokens.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No completed full-online tokens recorded.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-[10px] uppercase text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Token #</th>
                            <th className="py-2.5 px-3">Patient</th>
                            <th className="py-2.5 px-3">Doctor</th>
                            <th className="py-2.5 px-3">Date (IST)</th>
                            <th className="py-2.5 px-3 text-right">Fee (₹)</th>
                            <th className="py-2.5 px-3 text-center">Settlement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {statementTokens.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 font-mono font-bold text-white">#{t.tokenNo || t.tokenNumber}</td>
                              <td className="py-2 px-3 font-medium text-slate-200">{t.patientName}</td>
                              <td className="py-2 px-3 text-slate-400">{t.doctorName}</td>
                              <td className="py-2 px-3 text-slate-400 text-[11px]">{t.bookingDate || t.date}</td>
                              <td className="py-2 px-3 text-right font-black text-white">₹{t.consultationFee || 500}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  t.paymentCollection?.settlementStatus === 'settled'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {t.paymentCollection?.settlementStatus === 'settled' ? 'Settled' : 'Unsettled'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
