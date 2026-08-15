import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { sendOTPEmail, verifyOTPCode, type OTPRecord } from '../../utils/otpService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: 'customer' | 'hospital';
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  userType = 'customer',
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const otpType: OTPRecord['type'] = userType === 'hospital' ? 'hospital_forgot_password' : 'customer_forgot_password';

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const res = await sendOTPEmail(email, otpType, userType === 'hospital' ? 'Hospital Admin' : 'Customer');
    setLoading(false);

    if (res.success) {
      setSentOtp(res.code);
      setStep(2);
    } else {
      setError(res.message);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const verifyRes = verifyOTPCode(email, otpCode, otpType);
      setLoading(false);

      if (verifyRes.success) {
        setSuccess(true);
      } else {
        setError(verifyRes.message);
      }
    }, 600);
  };

  const handleCloseAll = () => {
    setStep(1);
    setEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={handleCloseAll}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl">
              <Lock size={22} className="text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                {userType === 'hospital' ? 'Hospital Account' : 'Customer Account'}
              </span>
              <h3 className="text-xl font-black text-white">Reset Password</h3>
            </div>
          </div>
        </div>

        {/* Sender Info Notice */}
        <div className="bg-blue-50 px-6 py-2 border-b border-blue-100 text-[11px] font-semibold text-blue-700 flex justify-between items-center">
          <span>SMTP Mailer: <strong>token.in1999@gmail.com</strong></span>
          <span className="text-[10px] font-bold bg-blue-100 px-2 py-0.5 rounded-full">Insta Token</span>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
              <h4 className="text-lg font-black text-slate-800">Password Reset Successfully!</h4>
              <p className="text-xs text-slate-500">Your password has been updated. You can now sign in with your new password.</p>
              <button
                onClick={handleCloseAll}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all cursor-pointer border-none text-xs"
              >
                Back to Sign In
              </button>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <p className="text-xs text-slate-500">
                Enter your registered email address to receive a 6-digit verification code.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={userType === 'hospital' ? 'admin@hospital.com' : 'user@example.com'}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-semibold">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 text-xs border-none"
              >
                {loading ? 'Sending OTP Code...' : <>Send 6-Digit OTP <ArrowRight size={15} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              {sentOtp && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-center text-xs text-blue-700 font-semibold">
                  OTP Code sent: <strong className="font-mono text-blue-900">{sentOtp}</strong>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Enter 6-Digit OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 482910"
                  required
                  className="w-full tracking-widest text-center font-mono py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 border-none bg-transparent cursor-pointer"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-semibold">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3.5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-50 border-none"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none text-xs shadow-md shadow-emerald-500/20"
                >
                  {loading ? 'Updating Password...' : 'Reset Password ✓'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
