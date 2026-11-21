import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  User, 
  UserPlus, 
  Phone, 
  ChevronDown, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Mail, 
  Zap, 
  Headphones 
} from 'lucide-react';
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

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form fields
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Switch tabs cleanly
  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setStep('form');
    setError('');
    setOtpDigits(['', '', '', '', '', '']);
  };

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

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name to register.');
      return;
    }

    const clean10 = normalizePhoneInput(phone);
    if (!clean10 || clean10.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await sendSmsOtpClient(clean10, 'customer_auth', mode);
      if (!res.success) {
        if (res.notFound) {
          setError('No registered account found with this mobile number. Please click "Register Patient" to sign up first.');
        } else if (res.alreadyExists) {
          setError('An account with this mobile number already exists. Please switch to "Sign In" to continue.');
        } else {
          setError(res.message || 'Failed to send OTP SMS. Please try again.');
        }
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

  // Verify OTP and complete login / signup
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const clean10 = normalizePhoneInput(phone);
      const res = await loginWithPhoneOtp(clean10, code, name.trim(), email.trim(), mode);

      if (res.needName) {
        setMode('signup');
        setStep('form');
        setError('Please enter your full name to complete registration.');
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
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

  // Native Android Google Sign-In Listener for Mobile App (bottom sheet bridge)
  useEffect(() => {
    (window as any).__handleNativeGoogleLogin = async (profile: any) => {
      if (profile?.email) {
        setLoading(true);
        setGoogleLoading(true);
        setError('');
        try {
          await login(profile.email, 'google', profile.name || profile.given_name, true, profile);
          onSuccess();
        } catch (err: any) {
          setError(err?.message || 'Native Google Sign-In failed.');
        } finally {
          setLoading(false);
          setGoogleLoading(false);
        }
      }
    };
    return () => {
      delete (window as any).__handleNativeGoogleLogin;
    };
  }, [login, onSuccess]);

  // Reusable Form Content (used in both Mobile View and Desktop View)
  const renderFormContent = () => (
    <div>
      {/* Prominent Tab Switcher matching Reference UI: Pill Container */}
      {step === 'form' && (
        <div className="bg-[#eef3fc] p-1.5 rounded-full flex gap-1 mb-5 shadow-inner">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 px-3 rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-[#1762ea] via-[#1457d5] to-[#104ecf] text-white shadow-md shadow-blue-600/30'
                : 'text-[#1e3a8a] hover:text-[#0f172a] bg-transparent'
            }`}
          >
            <User className={`w-4 h-4 ${mode === 'login' ? 'fill-white text-white' : 'text-[#1e3a8a]'}`} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2.5 px-3 rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-[#1762ea] via-[#1457d5] to-[#104ecf] text-white shadow-md shadow-blue-600/30'
                : 'text-[#1e3a8a] hover:text-[#0f172a] bg-transparent'
            }`}
          >
            <UserPlus className={`w-4 h-4 ${mode === 'signup' ? 'text-white' : 'text-[#1e3a8a]'}`} />
            <span>Register Patient</span>
          </button>
        </div>
      )}

      {/* Main Heading & Green Curved Accent Swoosh */}
      <div className="text-center mb-4">
        <h2 className="text-2xl sm:text-[27px] font-black text-[#0f172a] tracking-tight leading-tight font-heading">
          {step === 'otp'
            ? 'Verify 6-Digit OTP'
            : 'Skip the Line. Save the Time.'}
        </h2>

        {step === 'form' && (
          <div className="flex justify-center -mt-0.5 mb-1.5">
            <img 
              src="/accent_swoosh.png" 
              alt="" 
              className="w-44 sm:w-52 h-auto object-contain select-none pointer-events-none" 
            />
          </div>
        )}

        <p className="text-slate-500 text-xs sm:text-[13px] font-medium leading-relaxed max-w-xs mx-auto mt-1">
          {step === 'otp'
            ? `Enter the 6-digit OTP code sent to +91 ${normalizePhoneInput(phone)}.`
            : mode === 'login'
            ? 'Enter your registered mobile number to receive your sign-in OTP.'
            : 'Fill your details to create your patient account instantly.'}
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50/90 border border-red-200 rounded-2xl text-red-700 text-xs flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span className="leading-relaxed font-semibold">{error}</span>
          </div>
          {step === 'form' && mode === 'login' && error.includes('Register Patient') && (
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5 mt-1"
            >
              <span>Click here to Register as Patient</span>
              <ArrowRight size={13} />
            </button>
          )}
          {step === 'form' && mode === 'signup' && error.includes('Sign In') && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5 mt-1"
            >
              <span>Click here to Sign In</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* STEP 1: FORM INPUT (LOGIN OR SIGNUP) */}
      {step === 'form' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          {/* Full Name in signup mode */}
          {mode === 'signup' && (
            <div className="space-y-1.5 text-left">
              <label className="block text-xs sm:text-[13px] font-black text-[#0f172a] font-heading tracking-tight">
                Full Name *
              </label>
              <div className="relative flex items-center bg-[#f8faff] border border-blue-200/90 rounded-2xl px-3.5 py-3 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 focus-within:bg-white transition-all shadow-xs">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="h-5 w-[1.5px] bg-slate-200 mx-3 shrink-0" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gourav"
                  required
                  autoFocus
                  className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none tracking-wide"
                />
              </div>
            </div>
          )}

          {/* Mobile Number Field with +91 country selector */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs sm:text-[13px] font-black text-[#0f172a] font-heading tracking-tight">
              Mobile Number *
            </label>
            <div className="relative flex items-center bg-[#f8faff] border border-blue-200/90 rounded-2xl px-3.5 py-3 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 focus-within:bg-white transition-all shadow-xs">
              <Phone className="w-4 h-4 text-blue-600 fill-blue-600 shrink-0" />
              <span className="text-sm font-black text-slate-800 ml-2 select-none">+91</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-700 ml-1 shrink-0" />
              <div className="h-5 w-[1.5px] bg-slate-200 mx-3 shrink-0" />
              <input 
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10 digit mobile number"
                maxLength={10}
                required
                autoFocus={mode === 'login'}
                className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none tracking-wide"
              />
            </div>
          </div>

          {/* Optional Email in signup mode */}
          {mode === 'signup' && (
            <div className="space-y-1.5 text-left">
              <label className="block text-xs sm:text-[13px] font-black text-[#0f172a] font-heading tracking-tight">
                Email Address (Optional)
              </label>
              <div className="relative flex items-center bg-[#f8faff] border border-blue-200/90 rounded-2xl px-3.5 py-3 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 focus-within:bg-white transition-all shadow-xs">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="h-5 w-[1.5px] bg-slate-200 mx-3 shrink-0" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none tracking-wide"
                />
              </div>
            </div>
          )}

          {/* Primary CTA Button: Get Sign-In OTP */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#1762ea] via-[#1457d5] to-[#0f4fd8] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/45 hover:from-[#1556d0] hover:to-[#0d44be] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-70 mt-4 font-heading tracking-wide"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Get Sign-In OTP' : 'Send OTP & Register'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black text-[#0f172a] font-heading tracking-tight">
                Enter 6-Digit OTP Code
              </label>
              <button
                type="button"
                onClick={() => setStep('form')}
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
                  className="w-11 h-12 sm:w-12 sm:h-13 text-center text-lg sm:text-xl font-black text-slate-800 bg-[#f8faff] border border-blue-200/90 rounded-2xl focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-xs"
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
                Resend OTP in <strong className="text-slate-700 font-mono font-bold">{timer}s</strong>
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-bold">Valid for 10 mins</span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#1762ea] via-[#1457d5] to-[#0f4fd8] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/45 hover:from-[#1556d0] hover:to-[#0d44be] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-70 font-heading tracking-wide"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>{mode === 'login' ? 'Verify OTP & Sign In' : 'Verify OTP & Complete Registration'}</span>
            )}
          </button>
        </form>
      )}

      {/* Toggle Links between Sign In and Register */}
      {step === 'form' && (
        <div className="mt-3 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-slate-500 font-medium">
              New patient?{' '}
              <button 
                type="button" 
                onClick={() => switchMode('signup')}
                className="text-blue-600 font-bold hover:underline cursor-pointer border-none bg-transparent"
              >
                Register Patient Here
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500 font-medium">
              Already registered?{' '}
              <button 
                type="button" 
                onClick={() => switchMode('login')}
                className="text-blue-600 font-bold hover:underline cursor-pointer border-none bg-transparent"
              >
                Sign In with Mobile
              </button>
            </p>
          )}
        </div>
      )}

      {/* OR Divider matching Reference UI */}
      <div className="relative flex py-3.5 items-center">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="flex-shrink mx-3 text-slate-400 text-xs font-black uppercase tracking-widest font-heading">OR</span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>

      {/* Continue with Google button */}
      <div>
        <button 
          type="button"
          onClick={() => {
            if ((window as any).ReactNativeWebView) {
              (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'GOOGLE_SIGN_IN' }));
            } else {
              triggerGoogleLogin();
            }
          }}
          disabled={loading || googleLoading}
          className="w-full py-3 px-4 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50/90 hover:border-slate-300 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.64 15.04 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99c.9-2.7 3.42-4.51 6.76-4.51z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"/>
            <path fill="#FBBC05" d="M5.24 10.55c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.39 7.01C.5 8.81 0 10.84 0 12.99s.5 4.18 1.39 5.98l3.85-2.99c-.24-.72-.38-1.49-.38-2.28z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.18.79-2.69 1.26-4.26 1.26-3.34 0-5.86-1.81-6.76-4.51L1.39 16.96C3.37 20.35 7.35 23 12 23z"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Trust Badge matching Reference UI */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
        <div className="w-5 h-5 rounded-md bg-[#16a34a] text-white flex items-center justify-center shadow-xs shrink-0">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
        <span>Secure &amp; Reliable</span>
        <span className="text-[#16a34a] font-black">•</span>
        <span className="text-slate-700 font-semibold">No password required</span>
      </div>

      {/* Razorpay Compliance Legal Links */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
          Terms &amp; Conditions
        </a>
        <span>•</span>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
          Privacy Policy
        </a>
        <span>•</span>
        <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
          Refund Policy
        </a>
        <span>•</span>
        <a href="/contact" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
          Contact Us
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf2fc] via-[#f4f8fd] to-[#f8fbff] flex flex-col justify-between items-center relative overflow-x-hidden selection:bg-blue-100">
      
      {/* =========================================================================
          MOBILE & TABLET VIEW (< lg) - Fits cleanly on screen without scrolling
          ========================================================================= */}
      <div className="w-full flex-1 flex flex-col justify-between items-center lg:hidden px-4 py-3 min-h-[100dvh]">
        {/* Top Minimal Branding Header */}
        <div className="w-full text-center pt-2 pb-1 shrink-0">
          <div className="inline-flex items-center gap-2">
            <span className="text-xl font-black text-[#0f52ba] tracking-tight font-heading">Insta<span className="text-[#10b981]">Token</span></span>
          </div>
        </div>

        {/* Floating White Card */}
        <div className="w-full max-w-[420px] my-auto">
          <div className="bg-white rounded-[24px] p-5 shadow-[0_12px_36px_-6px_rgba(15,45,130,0.12)] border border-blue-100/80">
            {renderFormContent()}
          </div>
        </div>

        {/* Mobile Legal Strip */}
        <div className="w-full py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10.5px] text-slate-400 font-medium shrink-0">
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Terms &amp; Conditions</a>
          <span>•</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Refunds</a>
          <span>•</span>
          <a href="/contact" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Contact</a>
        </div>
      </div>


      {/* =========================================================================
          DESKTOP VIEW (lg+) - Split Card Layout with Refreshed Branding & Matching Theme
          ========================================================================= */}
      <div className="hidden lg:flex w-full flex-1 items-center justify-center p-8">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100/90 overflow-hidden grid grid-cols-12 min-h-[660px]">
          
          {/* Left Graphic Panel */}
          <div className="col-span-5 bg-gradient-to-b from-[#eaf2fc] to-slate-50 flex flex-col justify-between overflow-hidden border-r border-slate-100 pb-8">
            <div className="relative overflow-hidden bg-gradient-to-r from-[#0047b3] via-[#005cdb] to-[#0047b3]">
              <img 
                src="/mobile_login_hero.png" 
                alt="InstaToken - Smart Queue. Better Care" 
                className="w-full h-auto block select-none" 
              />
            </div>

            {/* Overlapping Carousel of Specialties */}
            <div className="-mt-6 relative z-10 px-4 pointer-events-none">
              <div className="w-full overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-blue-100 shadow-lg">
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
                        <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden shadow-xs border border-slate-100 hover:scale-105 transition-all duration-300 bg-slate-100 flex items-center justify-center">
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

            {/* Feature Badges matching Reference UI */}
            <div className="px-6 space-y-3 mt-4">
              <h3 className="text-[11px] font-black text-[#0f172a] uppercase tracking-wider font-heading">Features included:</h3>
              <div className="space-y-2.5 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#16a34a] shrink-0">
                    <Zap className="w-3 h-3 fill-[#16a34a]" />
                  </div>
                  <span>Instant Mobile Number OTP Access</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#16a34a] shrink-0">
                    <ShieldCheck className="w-3 h-3 fill-[#16a34a] text-white" />
                  </div>
                  <span>100% Secure &amp; SMS-Verified Patient Records</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#16a34a] shrink-0">
                    <Headphones className="w-3 h-3 text-[#16a34a]" />
                  </div>
                  <span>Real-Time Live OPD Queue Tracking &amp; 24×7 Support</span>
                </div>
              </div>
            </div>

            <div className="px-6 flex justify-between items-center text-[9px] text-slate-400 font-mono tracking-wider">
              <span>SECURE OTP AUTH</span>
              <span>SMART QUEUE SYSTEM</span>
            </div>
          </div>

          {/* Right Side Form (Col-span-7) */}
          <div className="col-span-7 p-8 md:p-10 flex flex-col justify-center bg-white overflow-y-auto">
            {renderFormContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
