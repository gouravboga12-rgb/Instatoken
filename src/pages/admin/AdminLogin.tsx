import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, Loader2, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  onSuccess?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const { login } = useApp();
  const navigate = useNavigate();

  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanId = adminId.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setError('Please enter both Admin ID and Password');
      return;
    }

    setLoading(true);
    try {
      // Allow slight delay for smooth UX transition
      await new Promise(r => setTimeout(r, 450));
      const success = await login(cleanId, cleanPass);
      if (success) {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/admin');
        }
      } else {
        setError('Invalid Admin ID or Password. Access denied.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between items-center relative overflow-hidden text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(30,58,138,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900/60 hover:bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Main Portal</span>
        </button>

        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full">
          <ShieldCheck size={14} className="text-blue-400" />
          <span>Central Security Gate</span>
        </div>
      </header>

      {/* Center Card */}
      <main className="w-full max-w-md px-6 py-8 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 shadow-2xl rounded-3xl p-8 backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30">
                <KeyRound size={28} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                <ShieldCheck size={13} className="text-emerald-400" />
              </div>
            </div>

            <span className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-1">
              Super Admin Authorization
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              InstaToken Admin Panel
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              Enter authorized administrator credentials to access central platform controls and analytics.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-300 text-xs leading-relaxed animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-bold text-rose-200">Authentication Failed</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Admin ID / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="admin or anilajay1999@gmail.com"
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl text-sm text-white placeholder-slate-500 font-medium outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl text-sm text-white placeholder-slate-500 font-medium outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Unlock Admin Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Secure footer note */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck size={12} className="text-slate-400" />
              <span>Protected portal with end-to-end encrypted sessions</span>
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-600 relative z-10">
        © 2026 InstaToken Healthcare Solutions Inc. All rights reserved.
      </footer>
    </div>
  );
};
