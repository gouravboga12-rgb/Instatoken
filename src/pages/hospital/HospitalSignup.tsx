import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import { Activity, AlertCircle, ArrowRight, Building2, Shield, CheckCircle2, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import { sendSmsOtpClient, normalizePhoneInput } from '../../utils/otpService';

export const HospitalSignup: React.FC = () => {
  const { hospitalSignupWithOtp } = useHospital();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [hospName, setHospName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [category, setCategory] = useState('Multi Speciality');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [address, setAddress] = useState('');
  const [regNo, setRegNo] = useState('');

  // OTP State for Step 2
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Step 1: Send OTP to Admin Phone
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!hospName.trim()) {
      setError('Please enter your hospital name.');
      return;
    }

    const clean10 = normalizePhoneInput(phone);
    if (!clean10 || clean10.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendSmsOtpClient(clean10, 'hospital_auth');
      if (!res.success) {
        setError(res.message || 'Failed to send OTP SMS to this number.');
        return;
      }
      setStep(2);
      setTimer(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        document.getElementById('hosp-reg-otp-0')?.focus();
      }, 150);
    } catch (err: any) {
      setError(err?.message || 'Failed to reach SMS gateway.');
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
      document.getElementById(`hosp-reg-otp-${nextIdx}`)?.focus();
      return;
    }

    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    if (val && index < 5) {
      document.getElementById(`hosp-reg-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`hosp-reg-otp-${index - 1}`)?.focus();
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
    document.getElementById(`hosp-reg-otp-${targetIdx}`)?.focus();
  };

  // Step 2: Verify OTP and Register Hospital
  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const clean10 = normalizePhoneInput(phone);
      const res = await hospitalSignupWithOtp({
        name: hospName.trim(),
        adminName: adminName.trim() || 'Hospital Administrator',
        phone: clean10,
        otp: code,
        email: email.trim().toLowerCase(),
        city,
        address,
        category,
        registrationNumber: regNo || `KA/HOS/2026/${Math.floor(1000 + Math.random() * 9000)}`
      });

      if (!res.success) {
        setError(res.message || 'Hospital registration failed.');
        setLoading(false);
        return;
      }

      setSuccessMsg(true);
      setTimeout(() => {
        navigate('/hospital/dashboard');
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Hospital registration error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans">
      {/* Left Panel – Branding */}
      <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 animate-pulse" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-indigo-500/10 animate-pulse" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl border border-white/20">
              <Activity size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">InstaToken</h1>
              <p className="text-blue-200 text-xs font-bold">Partner Hospital Registration</p>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-xs font-bold text-white mb-6">
              <Building2 size={13} /> Join InstaToken Healthcare Network
            </div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight mb-4">
              Register Your Hospital<br />
              <span className="text-blue-300">With Direct Mobile OTP</span>
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              Passwordless registration secured by Mobile OTP verification. Instant activation for smart tokens, OPD queue management, and doctor cabins.
            </p>
          </div>

          <div className="space-y-3 max-w-sm">
            {[
              'Direct SIM mobile verification (No passwords)',
              'Zero setup fee · Instant live dashboard',
              'Patients book token online or walk-in',
              'Instant SMS OTP verification alerts',
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-white font-bold bg-white/10 p-2.5 rounded-xl border border-white/10">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-[11px] text-blue-200 font-semibold">
          © 2026 InstaToken Admin · Powered by Smart Healthcare Core
        </div>
      </div>

      {/* Right Panel – Sign Up Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-lg font-black text-slate-800">InstaToken</span>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-blue-600" />
              <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Hospital Registration</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {step === 1 ? 'Register Hospital' : 'Verify Mobile OTP'}
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              {step === 1
                ? 'Fill basic hospital details to receive your verification OTP'
                : `Enter the 6-digit OTP code sent to +91 ${normalizePhoneInput(phone)}`}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold animate-pulse">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Hospital registered! Redirecting to Dashboard...</span>
            </div>
          )}

          {/* STEP 1: HOSPITAL DETAILS */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hospital Name *</label>
                <input
                  type="text"
                  value={hospName}
                  onChange={e => setHospName(e.target.value)}
                  placeholder="Apollo City Hospital"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Admin / Doctor Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="Dr. Rajesh"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50 font-medium"
                  >
                    <option value="Multi Speciality">Multi Speciality</option>
                    <option value="Super Speciality">Super Speciality</option>
                    <option value="Eye Hospital">Eye Hospital</option>
                    <option value="Dental Clinic">Dental Clinic</option>
                    <option value="Children Hospital">Children Hospital</option>
                    <option value="Cardiology Center">Cardiology Center</option>
                    <option value="General Clinic">General Clinic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Admin Mobile Number (For OTP Verification) *</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-extrabold text-slate-500 select-none">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    maxLength={10}
                    required
                    className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50 font-bold tracking-wide"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contact@hospital.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City / Town</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Hyderabad"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Main Road, Near Central Bus Stand"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Registration / License Number (Optional)</label>
                <input
                  type="text"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  placeholder="e.g. TS/HOS/2026/1024"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 text-xs"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send OTP to Admin Phone <ArrowRight size={15} /></>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 2 && (
            <form onSubmit={handleVerifyAndSignup} className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700">Enter 6-Digit OTP</label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1 border-none bg-transparent"
                  >
                    <ArrowLeft size={12} />
                    <span>Edit Hospital Details</span>
                  </button>
                </div>

                <div className="flex gap-2 justify-between">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`hosp-reg-otp-${idx}`}
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 text-xs"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Verify OTP & Activate Hospital <ArrowRight size={15} /></>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs">
            <span className="text-slate-500 font-semibold">Already registered? </span>
            <button
              onClick={() => navigate('/hospital-login')}
              className="text-blue-600 font-extrabold hover:underline cursor-pointer border-none bg-transparent"
            >
              Sign In to Hospital Portal
            </button>
          </div>

          <div className="mt-4 text-center">
            <a href="/#/" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">
              ← Back to Patient Portal
            </a>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Passwordless Security &middot; Instant SMS OTP Verification</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
