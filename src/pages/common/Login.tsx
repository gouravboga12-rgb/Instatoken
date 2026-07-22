import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { Mail, Phone, Lock, User, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

const specializations = [
  { name: "Cardiology", image: "/cardiology.png" },
  { name: "Dermatology", image: "/dermatology.png" },
  { name: "Orthopedics", image: "/orthopedics.png" },
  { name: "Pediatrics", image: "/pediatrics.png" },
  { name: "Dentistry", image: "/dentistry.png" },
  { name: "Neurology", image: "/neurology.png" },
  { name: "Ophthalmology", image: "/ophthalmology.png" },
];

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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-center p-0 md:p-8">
      {/* Split visual layout card for desktop */}
      <div className="w-full max-w-md md:max-w-4xl bg-white md:rounded-3xl shadow-none md:shadow-2xl border-0 md:border border-slate-100/80 md:overflow-hidden md:grid md:grid-cols-12 md:min-h-[640px]">
        
        {/* Left Side Graphic Panel (Desktop only, col-span-5) */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-b from-blue-50 to-slate-50 flex-col justify-between overflow-hidden border-r border-slate-100 pb-8">
          {/* Header block with hospital backdrop */}
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
              <p className="text-[10px] text-blue-100 font-bold">Book Your Hospital Token in Minutes</p>
            </div>
          </div>

          {/* Overlapping Carousel of Specialties */}
          <div className="-mt-8 relative z-10 px-4 pointer-events-none">
            <div className="w-full overflow-hidden bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-slate-100 shadow-lg">
              <div className="relative w-full overflow-hidden py-1">
                {/* Style tag for marquee animation */}
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
                  {/* Duplicated list to create infinite marquee effect without empty spaces */}
                  {[...specializations, ...specializations].map((spec, index) => (
                    <div 
                      key={index}
                      className="flex-shrink-0 flex flex-col items-center w-[72px] text-center"
                    >
                      <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:scale-105 transition-all duration-300">
                        <img src={spec.image} alt={spec.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 tracking-tight mt-1.5 block truncate w-full">{spec.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature Bullet points inside the panel */}
          <div className="px-6 space-y-3 mt-4">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Features included:</h3>
            <div className="space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>Real-Time Queue Countdown</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>Instant Digital Token Generation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>Secure UPI & Card Merchant Payments</span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-6 flex justify-between items-center text-[9px] text-slate-400 font-mono tracking-wider">
            <span>v1.2.0-STABLE</span>
            <span>SECURE CHECKOUT</span>
          </div>
        </div>

        {/* Right Side Login form card (Col-span-7) */}
        <div className="md:col-span-7 p-0 md:p-10 flex flex-col justify-center bg-white md:overflow-y-auto">
          {/* Top visual graphic header (mobile only) */}
          <div className="md:hidden w-full flex flex-col bg-white pb-6">
            <div 
              className="relative bg-cover bg-center text-white flex flex-col justify-between p-5 h-[200px]"
              style={{ backgroundImage: `linear-gradient(to bottom, rgba(37, 99, 235, 0.95), rgba(29, 78, 216, 0.90)), url('https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&q=80')` }}
            >
              <div className="absolute top-[-50px] left-[-50px] w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between w-full z-10">
                <img src="/logo.png" className="h-7 object-contain" alt="InstaToken logo" />
              </div>
              <div className="z-10 pb-6">
                <h2 className="text-base font-black tracking-tight text-white">InstaToken</h2>
                <p className="text-[9px] text-blue-100 font-semibold">Book Your Hospital Token in Minutes</p>
              </div>
            </div>

            {/* Overlapping Carousel of Specialties */}
            <div className="-mt-7 relative z-10 px-4 pointer-events-none">
              <div className="w-full overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl p-2.5 border border-slate-100 shadow-md">
                <div className="relative w-full overflow-hidden py-0.5">
                  <style>{`
                    @keyframes marquee-mobile {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(-532px); }
                    }
                    .animate-marquee-mobile {
                      display: flex;
                      gap: 12px;
                      animation: marquee-mobile 20s linear infinite;
                    }
                  `}</style>
                  <div className="animate-marquee-mobile">
                    {/* Duplicated list to create infinite marquee effect without empty spaces */}
                    {[...specializations, ...specializations].map((spec, index) => (
                      <div 
                        key={index}
                        className="flex-shrink-0 flex flex-col items-center w-[64px] text-center"
                      >
                        <div className="w-[64px] h-[64px] rounded-xl overflow-hidden shadow-xs border border-slate-100">
                          <img src={spec.image} alt={spec.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[9px] font-black text-slate-700 tracking-tight mt-1 block truncate w-full">{spec.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-0">
            {/* Desktop form title */}
            <div className="hidden md:block mb-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight font-heading">
                {mode === 'login' ? 'Sign In to Account' : mode === 'otp' ? 'Login with OTP' : 'Register Patient'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">Access appointments, book OPD tokens and view live statuses.</p>
            </div>

            {/* Mobile form title */}
            <div className="md:hidden text-center mb-5">
              <h3 className="text-base font-black text-slate-800 tracking-tight font-heading">
                {mode === 'login' ? 'Log in or Sign up' : mode === 'otp' ? 'Login with OTP' : 'Register Patient'}
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">
                {mode === 'login' ? 'Enter credentials to continue' : 'Access your appointments pass'}
              </p>
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

            {/* Terms & secure info block */}
            <div className="mt-6 space-y-2.5 text-center">
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-semibold">
                <input type="checkbox" defaultChecked className="rounded border-slate-250 text-blue-600 focus:ring-blue-500 h-3 w-3" />
                <span>I agree to the <span className="text-blue-600 underline cursor-pointer">Terms & Privacy Policy</span></span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span>Your data is encrypted and securely protected</span>
              </div>
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

