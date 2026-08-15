import React, { useState, useEffect } from 'react';
import { Mail, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { sendOTPEmail, verifyOTPCode, type OTPRecord } from '../../utils/otpService';

interface OTPModalProps {
  isOpen: boolean;
  email: string;
  type: OTPRecord['type'];
  recipientName?: string;
  onSuccess: () => void;
  onClose: () => void;
  title?: string;
}

export const OTPModal: React.FC<OTPModalProps> = ({
  isOpen,
  email,
  type,
  recipientName = 'User',
  onSuccess,
  onClose,
  title = 'Email Verification Required',
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentCode, setSentCode] = useState<string>('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (isOpen && email) {
      dispatchOTP();
    }
  }, [isOpen, email]);

  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const dispatchOTP = async () => {
    setLoading(true);
    setError('');
    const res = await sendOTPEmail(email, type, recipientName);
    setLoading(false);
    setSentCode(res.code);
    setTimer(60);
    setCanResend(false);
  };

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);

    // Auto focus next input box
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = digits.join('');
    if (enteredCode.length < 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      const result = verifyOTPCode(email, enteredCode, type);
      setLoading(false);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.message);
      }
    }, 500);
  };

  const fillDemoCode = () => {
    if (sentCode) {
      setDigits(sentCode.split(''));
    } else {
      setDigits(['1', '2', '3', '4', '5', '6']);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2.5 rounded-2xl border border-white/20">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">Insta Token Security</span>
              <h3 className="text-xl font-black text-white">{title}</h3>
            </div>
          </div>

          <p className="text-xs text-blue-100 mt-2">
            We sent a 6-digit OTP code to <strong className="text-white underline">{email}</strong>
          </p>
        </div>

        {/* Sender Info Notice */}
        <div className="bg-blue-50/70 px-6 py-2.5 border-b border-blue-100 flex items-center justify-between text-[11px] font-semibold text-blue-700">
          <div className="flex items-center gap-1.5">
            <Mail size={13} className="text-blue-600 shrink-0" />
            <span>From: <strong>token.in1999@gmail.com</strong></span>
          </div>
          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Insta Token SMTP</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerify} className="p-6 space-y-5">
          {/* OTP Code Display Pill for Testing */}
          {sentCode && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold text-[11px]">Your OTP Code: <strong className="text-blue-600 font-mono tracking-wider">{sentCode}</strong></span>
              <button
                type="button"
                onClick={fillDemoCode}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg border-none cursor-pointer"
              >
                Auto Fill
              </button>
            </div>
          )}

          {/* 6 Digit Inputs */}
          <div>
            <label className="block text-center text-xs font-bold text-slate-600 mb-3">
              Enter the 6-digit code sent to your email
            </label>
            <div className="flex justify-center gap-2">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-digit-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                  className="w-11 h-13 text-center text-xl font-black text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-semibold">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 text-sm border-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Verify & Proceed ✓</>
            )}
          </button>

          {/* Resend & Timer */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-semibold border-t border-slate-100">
            <span>Didn't receive code?</span>
            {canResend ? (
              <button
                type="button"
                onClick={dispatchOTP}
                className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent"
              >
                <RefreshCw size={13} /> Resend OTP
              </button>
            ) : (
              <span className="text-slate-400 font-mono text-[11px]">Resend in {timer}s</span>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};
