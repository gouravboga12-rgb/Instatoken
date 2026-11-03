import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { User, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, ShieldCheck, ArrowLeft } from 'lucide-react';
import { sendSmsOtpClient, normalizePhoneInput } from '../../utils/otpService';
import { useGoogleLogin } from '@react-oauth/google';

interface LoginProps {
  onSuccess: () => void;
}

const specializations = [
  { name: "Cardiology", image: "/cardiology.webp", fallback: "/cardiology.png" },
  { name: "Dermatology", image: "/dermatology.webp", fallback: "/dermatology.png" },
  { name: "Orthopedics", image: "/orthopedics.webp", fallback: "/orthopedics.png" },
  { name: "Pediatrics", image: "/pediatrics.webp", fallback: "/pediatrics.png" },
  { name: "Dentistry", image: "/dentistry.webp", fallback: "/dentistry.png" },
  { name: "Neurology", image: "/neurology.webp", fallback: "/neurology.png" },
  { name: "Ophthalmology", image: "/ophthalmology.webp", fallback: "/ophthalmology.png" },
];

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login, loginWithPhoneOtp } = useApp();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: any = null;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const clean10 = normalizePhoneInput(phone);
    if (!clean10 || clean10.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await sendSmsOtpClient(clean10, 'customer_auth');
      if (!res.success) {
        setError(res.message || 'Failed to send OTP SMS. Please try again.');
        return;
      }
      setStep('otp');
      setTimer(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        document.getElementById('otp-digit-0')?.focus();
      }, 150);
    } catch (err: any) {
      setError(err?.message || 'Unable to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
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
      document.getElementById(`otp-digit-${nextIdx}`)?.focus();
      return;
    }

    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    if (val && index < 5) {
      document.getElementById(`otp-digit-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`otp-digit-${index - 1}`)?.focus();
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
    document.getElementById(`otp-digit-${targetIdx}`)?.focus();
  };

  // Verify OTP and complete login / check if new user
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const clean10 = normalizePhoneInput(phone);
      const res = await loginWithPhoneOtp(clean10, code, name);

      if (res.needName) {
        setStep('name');
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle final name submission for new user
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    const code = otpDigits.join('').trim();
    setLoading(true);
    try {
      const clean10 = normalizePhoneInput(phone);
      await loginWithPhoneOtp(clean10, code, name.trim());
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  // Optional Google OAuth support
  const [googleLoading, setGoogleLoading] = useState(false);
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setGoogleLoading(true);
      setError('');
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();
        if (profile?.email) {
          await login(profile.email, 'google', profile.name || profile.given_name, true, profile);
          onSuccess();
        } else {
          setError('Could not retrieve email from Google profile.');
        }
      } catch (err: any) {
        setError(err?.message || 'Google Sign-In failed.');
      } finally {
        setLoading(false);
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setLoading(false);
      setGoogleLoading(false);
      setError('Google Sign-In was cancelled.');
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-center p-0 md:p-8">
      {/* Split visual layout card for desktop */}
      <div className="w-full max-w-md md:max-w-4xl bg-white md:rounded-3xl shadow-none md:shadow-2xl border-0 md:border border-slate-100/80 md:overflow-hidden md:grid md:grid-cols-12 md:min-h-[640px]">
        
        {/* Left Side Graphic Panel (Desktop only, col-span-5) */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-b from-blue-50 to-slate-50 flex-col justify-between overflow-hidden border-r border-slate-100 pb-8">
          <div 
            className="relative bg-cover bg-center text-white flex flex-col justify-between p-6 h-[220px]"
            style={{ backgroundImage: `linear-gradient(to bottom, rgba(37, 99, 235, 0.95), rgba(29, 78, 216, 0.90)), url('https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&q=80')` }}
          >
            <div className="absolute top-[-50px] left-[-50px] w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between w-full z-10">
              <img src="/logo.png" className="h-8 object-contain" alt="InstaToken logo" />
            </div>
            <div className="z-10">
              <h2 className="text-lg font-black tracking-tight text-white/95">InstaToken</h2>
              <p className="text-[10px] text-blue-100 font-bold">Direct Mobile OTP Access</p>
            </div>
          </div>

          {/* Overlapping Carousel of Specialties */}
          <div className="-mt-8 relative z-10 px-4 pointer-events-none">
            <div className="w-full overflow-hidden bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-slate-100 shadow-lg">
              <div className="relative w-full overflow-hidden py-1">
                <style>{`
                  @keyframes marquee-desktop {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-616px); }
                  }
                  .animate-marquee-desktop {
                    display: flex;
                    gap: 16px;
                    animation: marquee-desktop 25s linear infinite;
                  }
                  .animate-marquee-desktop:hover {
                    animation-play-state: paused;
                  }
                `}</style>
                <div className="animate-marquee-desktop">
                  {[...specializations, ...specializations].map((spec, index) => (
                    <div 
                      key={index}
                      className="flex-shrink-0 flex flex-col items-center w-[72px] text-center"
                    >
                      <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:scale-105 transition-all duration-300 bg-slate-100 flex items-center justify-center">
                        <img 
                          src={spec.image} 
                          alt={spec.name} 
                          loading="eager"
                          fetchPriority="high"
                          decoding="async"
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== spec.fallback) {
                              target.src = spec.fallback;
                            }
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 tracking-tight mt-1.5 block truncate w-full">{spec.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature Bullet points */}
          <div className="px-6 space-y-3 mt-4">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Features included:</h3>
            <div className="space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>Instant Mobile Number OTP Login</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>TRAI DLT Verified Telecom SMS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>Real-Time Live Queue Countdown</span>
              </div>
            </div>
          </div>

          <div className="px-6 flex justify-between items-center text-[9px] text-slate-400 font-mono tracking-wider">
            <span>SECURE DLT AUTH</span>
            <span>DLT-ITOKEN</span>
          </div>
        </div>

        {/* Right Side Login form card (Col-span-7) */}
        <div className="md:col-span-7 p-0 md:p-10 flex flex-col justify-center bg-white md:overflow-y-auto">
          {/* Top visual graphic header (mobile only) */}
          <div className="md:hidden w-full flex flex-col bg-white pb-6">
            <div 
              className="relative bg-cover bg-center text-white flex flex-col justify-between p-5 h-[180px]"
              style={{ backgroundImage: `linear-gradient(to bottom, rgba(37, 99, 235, 0.95), rgba(29, 78, 216, 0.90)), url('https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&q=80')` }}
            >
              <div className="flex items-center justify-between w-full z-10">
                <img src="/logo.png" className="h-7 object-contain" alt="InstaToken logo" />
              </div>
              <div className="z-10 pb-4">
                <h2 className="text-base font-black tracking-tight text-white">InstaToken</h2>
                <p className="text-[9px] text-blue-100 font-semibold">Direct Mobile OTP Access</p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-0">
            {/* Header titles */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
                <ShieldCheck size={16} />
                <span>DLT SMS Verification</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight font-heading">
                {step === 'phone' && 'Welcome to InstaToken'}
                {step === 'otp' && 'Verify Mobile OTP'}
                {step === 'name' && 'Almost There!'}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {step === 'phone' && 'Enter your 10-digit mobile number to login or register instantly.'}
                {step === 'otp' && `Enter the 6-digit OTP code sent to +91 ${normalizePhoneInput(phone)}.`}
                {step === 'name' && 'Please enter your full name to finish your account setup.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: MOBILE NUMBER INPUT */}
            {step === 'phone' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-extrabold text-slate-500 select-none">
                      +91
                    </span>
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98765 43210"
                      maxLength={10}
                      autoFocus
                      required
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold tracking-wide text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  isLoading={loading} 
                  fullWidth 
                  className="py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>Get OTP</span>
                  <ArrowRight size={15} />
                </Button>
              </form>
            )}

            {/* STEP 2: 6-DIGIT OTP INPUT */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Enter 6-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="text-xs text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1 border-none bg-transparent"
                    >
                      <ArrowLeft size={12} />
                      <span>Change Number</span>
                    </button>
                  </div>

                  {/* Digit Boxes */}
                  <div className="flex gap-2 justify-between">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-digit-${idx}`}
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

                <Button 
                  type="submit" 
                  variant="primary" 
                  isLoading={loading} 
                  fullWidth 
                  className="py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all"
                >
                  Verify & Continue
                </Button>
              </form>
            )}

            {/* STEP 3: NAME PROMPT FOR FIRST-TIME REGISTRATION */}
            {step === 'name' && (
              <form onSubmit={handleCompleteRegistration} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      autoFocus
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  isLoading={loading} 
                  fullWidth 
                  className="py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all"
                >
                  Complete Registration & Sign In
                </Button>
              </form>
            )}

            {/* Divider & Google option */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="mb-4">
              <button 
                type="button"
                onClick={() => triggerGoogleLogin()}
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-xs disabled:opacity-60"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.64 15.04 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99c.9-2.7 3.42-4.51 6.76-4.51z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"/>
                  <path fill="#FBBC05" d="M5.24 10.55c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.39 7.01C.5 8.81 0 10.84 0 12.99s.5 4.18 1.39 5.98l3.85-2.99c-.24-.72-.38-1.49-.38-2.28z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.18.79-2.69 1.26-4.26 1.26-3.34 0-5.86-1.81-6.76-4.51L1.39 16.96C3.37 20.35 7.35 23 12 23z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Secure data badge */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <span>Direct mobile SIM authentication &middot; No password required</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
