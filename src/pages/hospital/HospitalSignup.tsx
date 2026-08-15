import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import { Activity, Eye, EyeOff, AlertCircle, ArrowRight, Building2, Shield, CheckCircle2 } from 'lucide-react';
import { OTPModal } from '../../components/common/OTPModal';

export const HospitalSignup: React.FC = () => {
  const { updateHospitalProfile, hospitalLogin } = useHospital();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [hospName, setHospName] = useState('');
  const [category, setCategory] = useState('Multi Speciality');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [address, setAddress] = useState('');
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!hospName || !phone || !email || !city) {
      setError('Please fill in all hospital basic details.');
      return;
    }
    setStep(2);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check again.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Open OTP verification modal
    setShowOtpModal(true);
  };

  const handleOtpSuccess = async () => {
    setShowOtpModal(false);
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    // Update hospital profile & log in
    updateHospitalProfile({
      name: hospName,
      type: category,
      phone,
      email,
      city,
      address,
      registrationNumber: regNo || `KA/HOS/2026/${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setLoading(false);
    setSuccessMsg(true);

    setTimeout(() => {
      hospitalLogin('admin@apollo.com', 'password');
      navigate('/hospital/dashboard');
    }, 1500);
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
              <span className="text-blue-300">In 2 Minutes</span>
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              Enable smart token booking, live OPD queue management, digital prescriptions, and patient flow analytics for your hospital.
            </p>
          </div>

          <div className="space-y-3 max-w-sm">
            {[
              'Zero setup fee · Instant live dashboard',
              'Patients book token online or walk-in',
              'Automated SMS & WhatsApp status alerts',
              'Multi-receptionist & Doctor cabin RBAC',
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
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Register Hospital</h2>
            <p className="text-slate-500 text-xs mt-1">Create your hospital management panel account</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step === 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          </div>

          {successMsg ? (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl text-center space-y-3 animate-in fade-in duration-300">
              <CheckCircle2 size={42} className="text-emerald-600 mx-auto" />
              <h3 className="text-lg font-black text-slate-800">Hospital Registered!</h3>
              <p className="text-xs text-slate-600 font-semibold">Redirecting to your hospital panel dashboard...</p>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hospital Name *</label>
                <input
                  type="text"
                  value={hospName}
                  onChange={e => setHospName(e.target.value)}
                  placeholder="e.g. City Care Multispeciality Hospital"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none bg-slate-50"
                  >
                    <option value="Multi Speciality">Multi Speciality</option>
                    <option value="Children Hospital">Children Hospital</option>
                    <option value="Eye Hospital">Eye Hospital</option>
                    <option value="Dental Clinic">Dental Clinic</option>
                    <option value="Cardiology">Cardiology</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Bengaluru"
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hospital Official Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@citycarehospital.com"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hospital Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, Area, LandMark..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none bg-slate-50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-3 py-2.5 rounded-xl text-xs font-semibold">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none text-xs shadow-md shadow-blue-500/20"
              >
                Continue to Step 2 <ArrowRight size={15} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">License / Reg Number (Optional)</label>
                <input
                  type="text"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  placeholder="e.g. KA/HOS/2026/0452"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Create Admin Password *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none bg-slate-50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none bg-slate-50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-3 py-2.5 rounded-xl text-xs font-semibold">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-50 border-none"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none text-xs shadow-md shadow-emerald-500/20"
                >
                  {loading ? 'Creating Account...' : 'Complete Registration ✓'}
                </button>
              </div>
            </form>
          )}

          {/* Login Switch Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs">
            <span className="text-slate-500 font-semibold">Already registered your hospital? </span>
            <button
              onClick={() => navigate('/hospital-login')}
              className="text-blue-600 font-extrabold hover:underline cursor-pointer border-none bg-transparent"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Hospital Registration OTP Verification Modal */}
      <OTPModal
        isOpen={showOtpModal}
        email={email}
        type="hospital_signup"
        recipientName={hospName}
        onSuccess={handleOtpSuccess}
        onClose={() => setShowOtpModal(false)}
        title="Hospital Registration OTP Verification"
      />
    </div>
  );
};
