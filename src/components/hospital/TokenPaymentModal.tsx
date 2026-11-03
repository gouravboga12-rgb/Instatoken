import React, { useState, useEffect } from 'react';
import type { TokenRecord } from '../../context/HospitalContext';
import { Wallet, CheckCircle, CreditCard, Banknote, X, AlertCircle } from 'lucide-react';

interface TokenPaymentModalProps {
  isOpen: boolean;
  token: TokenRecord | null;
  title?: string;
  subtitle?: string;
  confirmButtonText?: string;
  onClose: () => void;
  onSave: (paymentStatus: 'paid' | 'pending', paymentMethod: string) => void;
}

export const TokenPaymentModal: React.FC<TokenPaymentModalProps> = ({
  isOpen,
  token,
  title = 'Payment Details',
  subtitle = 'Select payment status and payment method',
  confirmButtonText = 'Save & Update Payment',
  onClose,
  onSave
}) => {
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'Online' | 'Cash'>('Online');

  useEffect(() => {
    if (token) {
      if (token.paymentStatus === 'paid') {
        setPaymentStatus('paid');
      } else {
        // If uncollected/pending, default to paid so staff can quickly collect,
        // or keep pending if they choose Not Paid
        setPaymentStatus('paid');
      }

      if (token.paymentMethod && token.paymentMethod.toLowerCase().includes('cash')) {
        setPaymentMethod('Cash');
      } else {
        setPaymentMethod('Online');
      }
    }
  }, [token, isOpen]);

  if (!isOpen || !token) return null;

  const handleSave = () => {
    const finalMethod = paymentStatus === 'paid' 
      ? (paymentMethod === 'Cash' ? 'Cash' : 'Online (UPI / Card / Net Banking)')
      : 'Unpaid / Pending';
    onSave(paymentStatus, finalMethod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header matching image styling */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Wallet size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        {/* Token and Patient Info Banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
              Token #{token.tokenNo}
            </span>
            <span className="font-extrabold text-slate-700">{token.patientName}</span>
            <span className="text-slate-400">· Dr. {token.doctorName}</span>
          </div>
          <div className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            Fee: ₹{token.consultationFee || 500}
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-5">
          {/* Payment Status Section */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 block">
              Payment Status *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Paid Option */}
              <div
                onClick={() => setPaymentStatus('paid')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  paymentStatus === 'paid'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    paymentStatus === 'paid' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <CheckCircle size={16} />
                  </div>
                  <span className={`text-xs font-extrabold ${paymentStatus === 'paid' ? 'text-emerald-950' : 'text-slate-700'}`}>
                    Paid
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  paymentStatus === 'paid' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}>
                  {paymentStatus === 'paid' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>

              {/* Not Paid Option */}
              <div
                onClick={() => setPaymentStatus('pending')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  paymentStatus === 'pending'
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-xl border border-slate-300 flex items-center justify-center ${
                    paymentStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'
                  }`}>
                    <div className="w-2.5 h-2.5 rounded-full border border-slate-400" />
                  </div>
                  <span className={`text-xs font-extrabold ${paymentStatus === 'pending' ? 'text-amber-950' : 'text-slate-700'}`}>
                    Not Paid
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  paymentStatus === 'pending' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}>
                  {paymentStatus === 'pending' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 block">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Online Option */}
              <div
                onClick={() => setPaymentMethod('Online')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  paymentMethod === 'Online'
                    ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    paymentMethod === 'Online' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <span className={`text-xs font-extrabold block leading-tight ${paymentMethod === 'Online' ? 'text-blue-950' : 'text-slate-700'}`}>
                      Online
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-medium block">
                      (UPI / Card / Net Banking)
                    </span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  paymentMethod === 'Online' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}>
                  {paymentMethod === 'Online' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>

              {/* Cash Option */}
              <div
                onClick={() => setPaymentMethod('Cash')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  paymentMethod === 'Cash'
                    ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    paymentMethod === 'Cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Banknote size={16} />
                  </div>
                  <span className={`text-xs font-extrabold ${paymentMethod === 'Cash' ? 'text-blue-950' : 'text-slate-700'}`}>
                    Cash
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'Cash' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}>
                  {paymentMethod === 'Cash' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>
            </div>
            {paymentStatus === 'pending' && (
              <p className="text-[10.5px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle size={12} />
                Marking as "Not Paid" will keep fee payment pending until collected at hospital.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-sm shadow-blue-500/20 transition-colors flex items-center gap-1.5"
          >
            <CheckCircle size={14} />
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
