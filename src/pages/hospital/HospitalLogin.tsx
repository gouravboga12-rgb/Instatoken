import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import { Activity, Eye, EyeOff, AlertCircle, ArrowRight, Building2, Shield } from 'lucide-react';

export const HospitalLogin: React.FC = () => {
  const { hospitalLogin } = useHospital();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = hospitalLogin(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/hospital/dashboard');
    } else {
      setError(result.message);
    }
  };

  const fillDemo = (role: string) => {
    const creds: Record<string, { email: string; password: string }> = {
      owner: { email: 'admin@apollo.com', password: 'password' },
    };
    const c = creds[role];
    if (c) { setEmail(c.email); setPassword(c.password); setError(''); }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left Panel – Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12">
        {/* Animated circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 animate-pulse" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-white/5 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-24 left-1/4 w-64 h-64 rounded-full bg-white/5 animate-pulse" style={{ animationDelay: '2s' }} />
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
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
              Manage Your<br />
              <span className="text-blue-200">Hospital Smarter</span>
            </h2>
            <p className="text-blue-100 text-base leading-relaxed max-w-md">
              Complete hospital management — tokens, queues, doctors, patients, billing, and analytics — all in one powerful dashboard.
            </p>
          </div>

          {/* Feature pills */}
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
          {[{ label: 'Hospitals', val: '200+' }, { label: 'Tokens Today', val: '12K+' }, { label: 'Patients', val: '4L+' }].map(s => (
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
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={18} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Hospital Portal</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 text-sm mt-2">Sign in to your hospital management account</p>
          </div>

          {/* Demo Quick Fill */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2.5">Quick Demo Login</p>
            <button
              onClick={() => fillDemo('owner')}
              className="w-full bg-purple-100 text-purple-750 hover:bg-purple-200 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer border-none text-center block"
            >
              Login as Hospital Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hospital.com"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-slate-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-slate-50 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In to Hospital Panel <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/#/" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">
              ← Back to Patient Portal
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400">
              Powered by <span className="font-bold text-blue-600">InstaToken HMS</span> · Secured & HIPAA Compliant
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
