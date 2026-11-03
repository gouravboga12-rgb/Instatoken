import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import { Activity, AlertCircle, ArrowRight, Building2, Shield, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import { sendSmsOtpClient, normalizePhoneInput } from '../../utils/otpService';

export const HospitalLogin: React.FC = () => {
  const { hospitalLoginWithOtp } = useHospital();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const clean10 = normalizePhoneInput(phone);
    if (!clean10 || clean10.length !== 10) {
      setError('Please enter a valid 10-digit registered mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await sendSmsOtpClient(clean10, 'hospital_auth');
      if (!res.success) {
        setError(res.message || 'Failed to send OTP to this number.');
        return;
      }
      setStep('otp');
      setTimer(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        document.getElementById('hospital-otp-0')?.focus();
      }, 150);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const onlyDigits = val.replace(/\D/g, '');
    if (onlyDigits.length > 1) {
      const chars = onlyDigits.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      chars.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(index + chars.length, 5);
      document.getElementById(`hospital-otp-${nextIdx}`)?.focus();
      return;
    }

    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    if (val && index < 5) {
      document.getElementById(`hospital-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`hospital-otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const clean = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    if (clean.length === 0) return;

    const newDigits = ['', '', '', '', '', ''];
    clean.forEach((d, i) => {
      newDigits[i] = d;
    });
    setOtpDigits(newDigits);
    const targetIdx = Math.min(clean.length, 5);
    document.getElementById(`hospital-otp-${targetIdx}`)?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const clean10 = normalizePhoneInput(phone);
      const res = await hospitalLoginWithOtp(clean10, code);
      if (res.success) {
        navigate('/hospital/dashboard');
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Login verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left Panel – Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 animate-pulse" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-white/5 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-24 left-1/4 w-64 h-64 rounded-full bg-white/5 animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl border border-white/20">
              <Activity size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">InstaToken</h1>
              <p className="text-blue-200 text-xs font-semibold">Hospital Management System</p>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-xs font-bold text-white mb-6">
              <Shield size={12} />
              Hospital Admin Portal
            </div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight mb-4">
              Direct OTP Access for<br />
              <span className="text-blue-200">Hospital Administration</span>
            </h2>
            <p className="text-blue-100 text-base leading-relaxed max-w-md">
              Secure passwordless access protected by Indian Telecom DLT OTP. Manage queues, doctors, walk-ins, and revenue seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['Live Queue Monitor', 'Walk-in Token Generator', 'Doctor Schedules', 'Patient Records', 'Revenue Reports', 'Communication Center'].map(f => (
              <span key={f} className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[{ label: 'Hospitals', val: '200+' }, { label: 'Tokens Today', val: '12K+' }, { label: 'DLT Header', val: 'ITOKEN' }].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-white">{s.val}</div>
              <div className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel – Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-lg font-black text-slate-800">InstaToken</span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={18} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Hospital Portal</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {step === 'phone' ? 'Hospital Sign In' : 'Verify Mobile OTP'}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              {step === 'phone'
                ? 'Enter your registered hospital administrator mobile number'
                : `Enter the 6-digit OTP code sent to +91 ${normalizePhoneInput(phone)}`}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Admin Mobile Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-sm font-extrabold text-slate-500 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    maxLength={10}
                    required
                    autoFocus
                    className="w-full pl-13 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-slate-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send DLT OTP <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700">Enter 6-Digit OTP</label>
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1 border-none bg-transparent"
                  >
                    <ArrowLeft size={12} />
                    <span>Change Mobile</span>
                  </button>
                </div>

                <div className="flex gap-2 justify-between">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`hospital-otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      className="w-11 h-12 md:w-12 md:h-13 text-center text-lg font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-blue-600 font-bold hover:underline cursor-pointer border-none bg-transparent flex items-center gap-1"
                  >
                    <RefreshCw size={13} />
                    <span>Resend OTP Code</span>
                  </button>
                ) : (
                  <span className="text-slate-400 font-medium">
                    Resend OTP in <strong className="text-slate-700 font-mono">{timer}s</strong>
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-bold">Valid for 10 mins</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Verify & Enter Dashboard <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs">
            <span className="text-slate-500 font-semibold">New Hospital? </span>
            <button
              onClick={() => navigate('/hospital-signup')}
              className="text-blue-600 font-extrabold hover:underline cursor-pointer border-none bg-transparent"
            >
              Register Your Hospital
            </button>
          </div>

          <div className="mt-4 text-center">
            <a href="/#/" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">
              ← Back to Patient Portal
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Protected by TRAI DLT OTP Authentication &middot; Sender ITOKEN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
