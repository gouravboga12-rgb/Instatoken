import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { Mail, Phone, Lock, User, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login, signup } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'otp'>('login');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (mode === 'login') {
        if (!emailOrPhone || !password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        login(emailOrPhone, password);
        onSuccess();
      } else if (mode === 'otp') {
        if (!emailOrPhone || !otp) {
          setError('Please enter mobile number and 4-digit OTP');
          setLoading(false);
          return;
        }
        login(emailOrPhone, otp);
        onSuccess();
      } else {
        if (!name || !email || !phone || !password || !confirmPassword) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        signup(name, email, phone);
        onSuccess();
      }
      setLoading(false);
    }, 800);
  };

  const fillDemoCreds = (role: 'patient' | 'admin') => {
    if (role === 'admin') {
      setEmailOrPhone('admin@instatoken.com');
      setPassword('admin');
      setMode('login');
    } else {
      setEmailOrPhone('patient@example.com');
      setPassword('password');
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
      {/* Split visual layout card for desktop */}
      <div className="w-full max-w-md md:max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100/80 overflow-hidden md:grid md:grid-cols-12 md:h-[600px]">
        
        {/* Left Side Graphic Panel (Desktop only, col-span-5) */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-tr from-blue-600 to-sky-500 flex-col justify-between p-8 text-white relative">
          {/* Decorative ambient blobs */}
          <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-[-50px] right-[-50px] w-48 h-48 bg-white/10 rounded-full blur-2xl" />

          {/* Branding logo */}
          <div className="flex items-center gap-2 z-10">
            <div className="bg-white p-1.5 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
              <Activity size={20} />
            </div>
            <span className="font-heading font-black text-lg tracking-tight">InstaToken</span>
          </div>

          {/* Main Visual Callout */}
          <div className="z-10 space-y-4">
            <h2 className="text-2xl font-black font-heading leading-tight tracking-tight">Skip the waiting line. Save the time.</h2>
            <p className="text-blue-100 text-xs leading-relaxed">Book digital OPD tokens at top clinics and hospitals near you. Monitor queues live on your screen and walk in just in time for your checkup.</p>
            
            <div className="space-y-2 pt-2 text-xs font-semibold">
              <div className="flex items-center gap-2 text-blue-50">
                <CheckCircle2 size={14} className="text-white" />
                <span>Real-Time Queue Countdown</span>
              </div>
              <div className="flex items-center gap-2 text-blue-50">
                <CheckCircle2 size={14} className="text-white" />
                <span>Instant Digital Token Generation</span>
              </div>
              <div className="flex items-center gap-2 text-blue-50">
                <CheckCircle2 size={14} className="text-white" />
                <span>Secure UPI & Card Merchant Payments</span>
              </div>
            </div>
          </div>

          <span className="text-[10px] text-blue-100 z-10 font-mono tracking-wider">v1.2.0-STABLE</span>
        </div>

        {/* Right Side Login form card (Col-span-7) */}
        <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-center bg-white">
          <div className="w-full">
            {/* Logo header (mobile only) */}
            <div className="flex flex-col items-center mb-6 md:hidden">
              <div className="bg-blue-600 p-3.5 rounded-2xl shadow-lg shadow-blue-500/20 mb-3 flex items-center justify-center">
                <Activity size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight font-heading">InstaToken</h2>
              <p className="text-slate-400 text-xs mt-1">Skip the Line. Save the Time.</p>
            </div>

            {/* Desktop form title */}
            <div className="hidden md:block mb-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight font-heading">
                {mode === 'login' ? 'Sign In to Account' : mode === 'otp' ? 'Login with OTP' : 'Register Patient'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">Access appointments, book OPD tokens and view live statuses.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'otp') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {mode === 'otp' ? 'Mobile Number' : 'Email Address or Mobile'}
                  </label>
                  <div className="relative">
                    {mode === 'otp' || !emailOrPhone.includes('@') && emailOrPhone !== '' ? (
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    ) : (
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                    <input 
                      type="text" 
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder={mode === 'otp' ? "+91 98765 43210" : "name@email.com or mobile"}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {mode !== 'otp' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                    {mode === 'login' && (
                      <button 
                        type="button"
                        className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                        onClick={() => alert("Verification code sent to email/mobile.")}
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {mode === 'otp' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification Code</label>
                    <button 
                      type="button"
                      className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                      onClick={() => alert("Verification code resent.")}
                    >
                      Resend
                    </button>
                  </div>
                  <input 
                    type="text" 
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-digit OTP"
                    className="w-full text-center tracking-[1em] font-mono py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                isLoading={loading} 
                fullWidth 
                className="py-2 mt-2 rounded-xl text-xs font-bold"
              >
                {mode === 'login' ? 'Sign In' : mode === 'otp' ? 'Verify & Login' : 'Create Account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* Social Logins */}
            <div className="mb-4">
              <button 
                onClick={() => { login('google-user@gmail.com', 'google'); onSuccess(); }}
                className="flex w-full items-center justify-center gap-2 py-2 px-3 border border-slate-150 rounded-xl bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.64 15.04 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99c.9-2.7 3.42-4.51 6.76-4.51z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"/>
                  <path fill="#FBBC05" d="M5.24 10.55c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.39 7.01C.5 8.81 0 10.84 0 12.99s.5 4.18 1.39 5.98l3.85-2.99c-.24-.72-.38-1.49-.38-2.28z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.18.79-2.69 1.26-4.26 1.26-3.34 0-5.86-1.81-6.76-4.51L1.39 16.96C3.37 20.35 7.35 23 12 23z"/>
                </svg>
                Google
              </button>
            </div>

            {/* Toggle Controls */}
            <div className="space-y-2 text-center">
              {mode === 'login' ? (
                <>
                  <button 
                    type="button" 
                    onClick={() => setMode('otp')}
                    className="text-xs text-blue-600 font-bold hover:underline block w-full cursor-pointer"
                  >
                    Login with Mobile OTP
                  </button>
                  <p className="text-xs text-slate-500">
                    New to InstaToken?{' '}
                    <button 
                      type="button" 
                      onClick={() => setMode('signup')}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Register Now
                    </button>
                  </p>
                </>
              ) : mode === 'otp' ? (
                <p className="text-xs text-slate-500">
                  Want to use password?{' '}
                  <button 
                    type="button" 
                    onClick={() => setMode('login')}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Login with Email
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    onClick={() => setMode('login')}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>

            {/* Demo buttons */}
            <div className="mt-6 p-3 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-2 justify-between">
              <button 
                type="button"
                onClick={() => fillDemoCreds('patient')}
                className="flex-1 text-center py-1.5 px-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 cursor-pointer"
              >
                Patient Demo
              </button>
              <button 
                type="button"
                onClick={() => fillDemoCreds('admin')}
                className="flex-1 text-center py-1.5 px-2 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-900 cursor-pointer"
              >
                Admin Demo
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
