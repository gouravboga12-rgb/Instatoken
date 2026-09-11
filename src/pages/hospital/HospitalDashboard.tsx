import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import { subscribeGlobalSync } from '../../utils/syncBus';
import {
  Users, Ticket, Clock, TrendingUp, TrendingDown,
  UserPlus, Plus, ArrowRight, Stethoscope, Bell,
  CheckCircle2, X, Printer, MapPin, Megaphone, ExternalLink
} from 'lucide-react';

export const HospitalDashboard: React.FC = () => {
  const {
    hospitalUser,
    hospitalProfile,
    tokens,
    doctors,
    generateWalkInToken
  } = useHospital();
  const navigate = useNavigate();

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInGender, setWalkInGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [walkInAge, setWalkInAge] = useState('32');
  const [walkInDoctorId, setWalkInDoctorId] = useState(doctors[0]?.id || 'doc-arvind');
  const [generatedSlip, setGeneratedSlip] = useState<any>(null);

  // Auto-refresh pulse timer (simulated live update every 5 seconds)
  const [livePulse, setLivePulse] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1200);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Regional location-based banners state
  const [regionalBanners, setRegionalBanners] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const fetchRegionalBanners = async () => {
      try {
        const country = hospitalProfile?.country || 'India';
        const state = hospitalProfile?.state || 'Telangana';
        const district = hospitalProfile?.city || 'Hyderabad';
        const mandal = hospitalProfile?.area || '';
        const params = new URLSearchParams({ panel: 'hospital', country, state, district, mandal });
        const res = await fetch(`/api/banners/active?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (Array.isArray(data.banners) ? data.banners : []);
          setRegionalBanners(list);
        }
      } catch (err) {
        console.error('Failed to load regional banners for hospital', err);
      }
    };
    fetchRegionalBanners();

    const unsubscribe = subscribeGlobalSync((event) => {
      if (event.type === 'BANNERS_UPDATED' || event.type === 'BANNER_DELETED') {
        fetchRegionalBanners();
      }
    });
    return () => unsubscribe();
  }, [hospitalProfile]);

  // Format greeting
  const rawName = hospitalUser?.name || 'Dr. Rajesh Kumar';
  const firstName = rawName.replace(/^Dr\.\s*/i, '').split(' ')[0] || 'Doctor';

  // Date formatting
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Calculate live stats
  const totalTokensCount = tokens.length > 0 ? tokens.length : 248;
  const offlineTokensCount = tokens.filter(t => t.type === 'offline').length || 162;
  const onlineTokensCount = tokens.filter(t => t.type === 'online').length || 86;
  const inQueueCount = tokens.filter(t => ['booked', 'waiting', 'checked-in'].includes(t.status)).length || 14;
  const activeDoctorsCount = doctors.filter(d => d.active !== false).length || 4;

  // Static reference queue rows (merged with real tokens if any)
  const defaultLiveQueue = [
    { id: 'O103', tokenNo: 103, patientName: 'Ayesha Begum', dept: 'Orthopaedics', doctor: 'Dr. Suresh Babu', waitTime: '0 min', status: 'in-consult' as const },
    { id: 'P104', tokenNo: 104, patientName: 'Karthik Chowdary', dept: 'Paediatrics', doctor: 'Dr. Kavya Sree', waitTime: '15 min', status: 'waiting' as const },
    { id: 'D105', tokenNo: 105, patientName: 'Sindhu Rani', dept: 'Dermatology', doctor: 'Dr. Farhan Ali', waitTime: '18 min', status: 'waiting' as const },
    { id: 'E106', tokenNo: 106, patientName: 'Mohan Rao', dept: 'ENT', doctor: 'Dr. Meera Nair', waitTime: '21 min', status: 'waiting' as const },
    { id: 'C108', tokenNo: 108, patientName: 'Arjun Varma', dept: 'Cardiology', doctor: 'Dr. Anitha Rao', waitTime: '0 min', status: 'skipped' as const },
    { id: 'O109', tokenNo: 109, patientName: 'Sunitha Devi', dept: 'Orthopaedics', doctor: 'Dr. Suresh Babu', waitTime: '30 min', status: 'waiting' as const },
  ];

  const displayQueue = tokens.length >= 3
    ? tokens.slice(0, 6).map((t, idx) => ({
        id: `${t.departmentName ? t.departmentName.charAt(0) : 'T'}${t.tokenNo}`,
        tokenNo: t.tokenNo,
        patientName: t.patientName,
        dept: t.departmentName || 'General Medicine',
        doctor: t.doctorName || 'Consultant Doctor',
        waitTime: (t.status as string) === 'in-consult' || t.status === 'completed' ? '0 min' : `${Math.max(5, (idx + 1) * 6)} min`,
        status: t.status === 'completed' ? 'in-consult' as const : t.status === 'cancelled' ? 'skipped' as const : t.status as any
      }))
    : defaultLiveQueue;

  // Doctor availability list
  const doctorAvailabilityList = [
    { name: 'Dr. Ravi Teja', timing: '09:00 – 13:00', active: true, used: 38, total: 60 },
    { name: 'Dr. Anitha Rao', timing: '10:00 – 14:00', active: true, used: 21, total: 30 },
    { name: 'Dr. Suresh Babu', timing: '16:00 – 20:00', active: false, used: 26, total: 40 },
    { name: 'Dr. Kavya Sree', timing: '09:30 – 13:30', active: true, used: 33, total: 50 },
  ];

  // Department mix data
  const deptMix = [
    { name: 'General Medicine', count: 62, color: '#1E40AF' },
    { name: 'Cardiology', count: 28, color: '#15803D' },
    { name: 'Orthopaedics', count: 31, color: '#EA580C' },
    { name: 'Paediatrics', count: 44, color: '#06B6D4' },
    { name: 'Dermatology', count: 19, color: '#A855F7' },
    { name: 'ENT', count: 22, color: '#2563EB' }
  ];

  // Department revenue data
  const deptRevenue = [
    { name: 'General Medicine', rev: 185, label: '185k' },
    { name: 'Cardiology', rev: 235, label: '235k' },
    { name: 'Orthopaedics', rev: 155, label: '155k' },
    { name: 'Paediatrics', rev: 130, label: '130k' },
    { name: 'Dermatology', rev: 95, label: '95k' },
    { name: 'ENT', rev: 88, label: '88k' },
    { name: 'Radiology', rev: 218, label: '218k' },
    { name: 'Pharmacy', rev: 168, label: '168k' },
  ];

  // Recent activity list
  const recentActivities = [
    { title: 'Created token G118 for Lakshmi Prasanna', author: 'Divya Sharma', time: '2 min ago' },
    { title: 'Completed consultation for Venkat Reddy', author: 'Dr. Anitha Rao', time: '9 min ago' },
    { title: 'Generated GST invoice INV-20486 (₹800)', author: 'Lalitha Devi', time: '17 min ago' },
    { title: 'Marked attendance for evening shift (46 staff)', author: 'Pallavi Reddy', time: '38 min ago' },
    { title: 'Payroll for July 2026 generated — 218 employees', author: 'System', time: '1 hr ago' },
  ];

  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    const doc = doctors.find(d => d.id === walkInDoctorId) || doctors[0];
    const newToken = generateWalkInToken({
      patientName: walkInName.trim(),
      patientPhone: walkInPhone.trim() || '+91 98450 12345',
      patientGender: walkInGender,
      patientAge: parseInt(walkInAge) || 30,
      doctorId: doc?.id || 'doc-1',
      departmentId: doc?.departmentId || 'dept-general',
      session: 'morning'
    });
    setGeneratedSlip(newToken);
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-[1680px] mx-auto bg-slate-50 min-h-screen">
      
      {/* ─── 1. TOP EXECUTIVE WELCOME HEADER (Image 29) ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Good morning, {firstName}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
            {dateFormatted} · Morning session running · {activeDoctorsCount} doctors on duty
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              setGeneratedSlip(null);
              setShowWalkInModal(true);
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <UserPlus size={15} className="text-slate-600" />
            <span>Walk-in patient</span>
          </button>

          <button
            onClick={() => navigate('/hospital/tokens/add')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 border-none cursor-pointer transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>New token</span>
          </button>
        </div>
      </div>

      {/* ─── REGIONAL PUBLIC HEALTH & LOCATION BANNER ────────────────────── */}
      {regionalBanners.length > 0 && !bannerDismissed && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-blue-800/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-3.5">
              {regionalBanners[currentBannerIndex]?.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(regionalBanners[currentBannerIndex]?.imageUrl || regionalBanners[currentBannerIndex]?.image || '') ? (
                <video 
                  src={regionalBanners[currentBannerIndex].imageUrl || regionalBanners[currentBannerIndex].image} 
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-14 h-14 rounded-2xl object-cover border border-white/20 shrink-0 shadow-md"
                />
              ) : regionalBanners[currentBannerIndex]?.imageUrl || regionalBanners[currentBannerIndex]?.image ? (
                <img 
                  src={regionalBanners[currentBannerIndex].imageUrl || regionalBanners[currentBannerIndex].image} 
                  alt={regionalBanners[currentBannerIndex].title} 
                  className="w-14 h-14 rounded-2xl object-cover border border-white/20 shrink-0 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <Megaphone size={22} className="text-blue-400" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20 flex items-center gap-1">
                    <MapPin size={10} />
                    {regionalBanners[currentBannerIndex]?.targetLevel?.toUpperCase()} ALERT · {regionalBanners[currentBannerIndex]?.state || regionalBanners[currentBannerIndex]?.district || 'REGIONAL'}
                  </span>
                  {regionalBanners[currentBannerIndex]?.badge && (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/20">
                      {regionalBanners[currentBannerIndex].badge}
                    </span>
                  )}
                  {regionalBanners.length > 1 && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      {currentBannerIndex + 1} of {regionalBanners.length}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-black text-white leading-snug">
                  {regionalBanners[currentBannerIndex]?.title}
                </h3>
                <p className="text-xs text-slate-300 font-medium line-clamp-1 sm:line-clamp-none max-w-2xl mt-0.5">
                  {regionalBanners[currentBannerIndex]?.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              {regionalBanners.length > 1 && (
                <div className="flex items-center gap-1 mr-2">
                  <button 
                    onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + regionalBanners.length) % regionalBanners.length)}
                    className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border-none"
                    title="Previous banner"
                  >
                    ←
                  </button>
                  <button 
                    onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % regionalBanners.length)}
                    className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border-none"
                    title="Next banner"
                  >
                    →
                  </button>
                </div>
              )}

              {regionalBanners[currentBannerIndex]?.linkUrl && (
                <a 
                  href={regionalBanners[currentBannerIndex].linkUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors no-underline shadow-md shadow-blue-500/20"
                >
                  <span>{regionalBanners[currentBannerIndex]?.ctaText || 'Learn More'}</span>
                  <ExternalLink size={12} />
                </a>
              )}

              <button 
                onClick={() => setBannerDismissed(true)} 
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors border-none cursor-pointer"
                title="Dismiss announcement"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. TOP KPI CARDS (4-CARD GRID) (Image 29) ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Today's patients */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={18} />
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                <TrendingUp size={12} /> 8.4%
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                {totalTokensCount}
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1.5">Today's patients</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {offlineTokensCount} offline · {onlineTokensCount} online
              </p>
            </div>
          </div>
          {/* Sparkline wave */}
          <div className="w-full h-10 mt-3 -mb-1">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path
                d="M 0 32 Q 30 28, 60 30 T 120 20 T 170 22 T 200 16 L 200 40 L 0 40 Z"
                fill="#64748B"
                opacity="0.3"
              />
              <path
                d="M 0 32 Q 30 28, 60 30 T 120 20 T 170 22 T 200 16"
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Today's revenue */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-base">
                ₹
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                <TrendingUp size={12} /> 12.1%
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                ₹2,68,400
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1.5">Today's revenue</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                ₹41,200 pending collection
              </p>
            </div>
          </div>
          {/* Sparkline wave */}
          <div className="w-full h-10 mt-3 -mb-1">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path
                d="M 0 34 Q 35 30, 70 24 T 130 18 T 170 22 T 200 12 L 200 40 L 0 40 Z"
                fill="#64748B"
                opacity="0.3"
              />
              <path
                d="M 0 34 Q 35 30, 70 24 T 130 18 T 170 22 T 200 12"
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Patients in queue */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Ticket size={18} />
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg">
                <TrendingDown size={12} /> 3.2%
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                {inQueueCount}
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1.5">Patients in queue</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                3 emergency · 2 VIP
              </p>
            </div>
          </div>
          <div className="h-10 mt-3" />
        </div>

        {/* Card 4: Avg. waiting time */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg">
                <TrendingDown size={12} /> 6.5%
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                14 min
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1.5">Avg. waiting time</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Target under 15 min
              </p>
            </div>
          </div>
          <div className="h-10 mt-3" />
        </div>

      </div>

      {/* ─── 3. MIDDLE ROW: REVENUE & FOOTFALL + DEPARTMENT MIX (Image 29 & 30) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Revenue & Footfall Area Spline Chart (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">Revenue & footfall</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Last 7 days</p>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
              +12.1% vs last week
            </span>
          </div>

          {/* SVG Spline Chart with Y Axis and Mon-Sun Labels */}
          <div className="w-full relative pt-2">
            <svg className="w-full h-56 overflow-visible" viewBox="0 0 650 200">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1="45" y1="20" x2="640" y2="20" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="65" x2="640" y2="65" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="110" x2="640" y2="110" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="155" x2="640" y2="155" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="190" x2="640" y2="190" stroke="#E2E8F0" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x="5" y="24" className="fill-slate-400 text-[11px] font-bold">320k</text>
              <text x="5" y="69" className="fill-slate-400 text-[11px] font-bold">240k</text>
              <text x="5" y="114" className="fill-slate-400 text-[11px] font-bold">160k</text>
              <text x="12" y="159" className="fill-slate-400 text-[11px] font-bold">80k</text>
              <text x="18" y="194" className="fill-slate-400 text-[11px] font-bold">0k</text>

              {/* Gradient Area Fill */}
              <path
                d="M 50 115 C 110 90, 160 120, 220 95 C 280 70, 320 60, 380 50 C 440 38, 480 20, 520 25 C 560 30, 600 90, 640 140 L 640 190 L 50 190 Z"
                fill="url(#chartGrad)"
              />

              {/* Spline Line */}
              <path
                d="M 50 115 C 110 90, 160 120, 220 95 C 280 70, 320 60, 380 50 C 440 38, 480 20, 520 25 C 560 30, 600 90, 640 140"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3.2"
                strokeLinecap="round"
              />

              {/* Active hover node at peak */}
              <circle cx="520" cy="25" r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="3" />
            </svg>

            {/* X-Axis Days Labels */}
            <div className="flex justify-between pl-12 pr-4 pt-3 text-xs font-bold text-slate-400">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        {/* Right: Department Mix Donut Chart (col-span-1) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800">Department mix</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Patients today</p>
          </div>

          {/* SVG Donut Chart */}
          <div className="flex items-center justify-center py-4">
            <svg width="180" height="180" viewBox="0 0 180 180" className="rotate-[-90deg]">
              {/* Segment 1: General Medicine (30%) */}
              <circle cx="90" cy="90" r="65" fill="none" stroke="#1E40AF" strokeWidth="26"
                strokeDasharray="122.5 408" strokeDashoffset="0" />
              {/* Segment 2: Cardiology (14%) */}
              <circle cx="90" cy="90" r="65" fill="none" stroke="#15803D" strokeWidth="26"
                strokeDasharray="57.1 408" strokeDashoffset="-125" />
              {/* Segment 3: Orthopaedics (15%) */}
              <circle cx="90" cy="90" r="65" fill="none" stroke="#EA580C" strokeWidth="26"
                strokeDasharray="61.2 408" strokeDashoffset="-184" />
              {/* Segment 4: Paediatrics (21%) */}
              <circle cx="90" cy="90" r="65" fill="none" stroke="#06B6D4" strokeWidth="26"
                strokeDasharray="85.7 408" strokeDashoffset="-247" />
              {/* Segment 5: Dermatology (9%) */}
              <circle cx="90" cy="90" r="65" fill="none" stroke="#A855F7" strokeWidth="26"
                strokeDasharray="36.7 408" strokeDashoffset="-335" />
              {/* Segment 6: ENT (11%) */}
              <circle cx="90" cy="90" r="65" fill="none" stroke="#2563EB" strokeWidth="26"
                strokeDasharray="44.9 408" strokeDashoffset="-374" />
            </svg>
          </div>

          {/* Legend Table (matching image 30) */}
          <div className="space-y-2 text-xs font-semibold text-slate-600 border-t border-slate-50 pt-3">
            {deptMix.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-extrabold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── 4. LOWER-MIDDLE ROW: LIVE QUEUE + DOCTOR AVAILABILITY (Images 30 & 31) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Live Queue Table (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">Live queue</h3>
                <span className={`w-2 h-2 rounded-full bg-emerald-500 ${livePulse ? 'scale-150 transition-transform' : ''}`} />
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Auto-refreshing every 5 seconds
              </p>
            </div>
            
            <button
              onClick={() => navigate('/hospital/tokens')}
              className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              Open reception desk <ArrowRight size={13} />
            </button>
          </div>

          {/* Live Queue Items List */}
          <div className="divide-y divide-slate-100">
            {displayQueue.map(item => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Token Badge */}
                  <div className="w-12 h-9 rounded-xl bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 border border-blue-100">
                    {item.id}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                      {item.patientName}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">
                      {item.dept} · {item.doctor}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Wait Time */}
                  <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Clock size={13} className="text-slate-400" />
                    <span>{item.waitTime}</span>
                  </div>

                  {/* Status Pill */}
                  {item.status === 'in-consult' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-600 border border-blue-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> In Consult
                    </span>
                  )}
                  {item.status === 'waiting' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-600 border border-amber-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Waiting
                    </span>
                  )}
                  {item.status === 'skipped' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Skipped
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Doctor availability & Token capacity used (col-span-1) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between space-y-6">
          
          {/* Part A: Doctor availability */}
          <div>
            <h3 className="text-base font-black text-slate-800 mb-4">Doctor availability</h3>
            <div className="space-y-3.5">
              {doctorAvailabilityList.map(doc => (
                <div key={doc.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center shrink-0">
                      <Stethoscope size={16} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">{doc.name}</h4>
                      <p className="text-[11px] font-semibold text-slate-400">{doc.timing}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    doc.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${doc.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {doc.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Part B: Token capacity used (matching image 31) */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
              Token capacity used
            </h3>
            <div className="space-y-3">
              {doctorAvailabilityList.map(doc => {
                const percent = Math.round((doc.used / doc.total) * 100);
                return (
                  <div key={doc.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{doc.name}</span>
                      <span className="text-slate-400 font-semibold">{doc.used}/{doc.total}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ─── 5. BOTTOM ROW: DEPARTMENT REVENUE + RECENT ACTIVITY (Image 31) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Department Revenue Bar Chart (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-800">Department revenue</h3>
          </div>

          {/* Vertical Bar Chart matching reference image 31 */}
          <div className="w-full relative pt-2">
            <svg className="w-full h-56 overflow-visible" viewBox="0 0 650 200">
              {/* Horizontal Grid lines */}
              <line x1="45" y1="20" x2="640" y2="20" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="65" x2="640" y2="65" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="110" x2="640" y2="110" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="155" x2="640" y2="155" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="190" x2="640" y2="190" stroke="#E2E8F0" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x="5" y="24" className="fill-slate-400 text-[11px] font-bold">240k</text>
              <text x="5" y="69" className="fill-slate-400 text-[11px] font-bold">180k</text>
              <text x="5" y="114" className="fill-slate-400 text-[11px] font-bold">120k</text>
              <text x="12" y="159" className="fill-slate-400 text-[11px] font-bold">60k</text>
              <text x="18" y="194" className="fill-slate-400 text-[11px] font-bold">0k</text>

              {/* 8 Columns Bars */}
              {deptRevenue.map((item, idx) => {
                const barWidth = 32;
                const colSpacing = 72;
                const x = 70 + idx * colSpacing;
                const maxVal = 250;
                const barHeight = (item.rev / maxVal) * 165;
                const y = 190 - barHeight;

                return (
                  <g key={item.name} className="group cursor-pointer">
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="6"
                      fill="#2563EB"
                      className="transition-all group-hover:fill-blue-700"
                    />
                  </g>
                );
              })}
            </svg>

            {/* X Axis Department Labels (slanted for readability) */}
            <div className="flex justify-between pl-10 pr-2 pt-2 text-[10.5px] font-bold text-slate-500 overflow-x-auto">
              {deptRevenue.map(item => (
                <span key={item.name} className="truncate w-16 text-center -rotate-12 transform origin-top-left">
                  {item.name}
                </span>
              ))}
            </div>

            {/* Legend (matching image 31) */}
            <div className="flex items-center justify-center gap-2 mt-8 text-xs font-bold text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
              <span>Revenue</span>
            </div>
          </div>
        </div>

        {/* Right: Recent Activity Audit Feed (col-span-1) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-800">Recent activity</h3>
            <Bell size={16} className="text-slate-400" />
          </div>

          <div className="divide-y divide-slate-50 space-y-3.5">
            {recentActivities.map((act, idx) => (
              <div key={idx} className="pt-3 first:pt-0">
                <h4 className="font-extrabold text-xs text-slate-800 leading-snug">
                  {act.title}
                </h4>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  {act.author} · {act.time}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── 6. WALK-IN TOKEN MODAL ────────────────────────────────────────────── */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UserPlus size={18} />
                </div>
                <h3 className="font-black text-slate-800 text-base">New Walk-in Patient</h3>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer border-none"
              >
                <X size={18} />
              </button>
            </div>

            {!generatedSlip ? (
              <form onSubmit={handleCreateWalkIn} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Varma"
                    value={walkInName}
                    onChange={e => setWalkInName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98450 00000"
                      value={walkInPhone}
                      onChange={e => setWalkInPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Age & Gender</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        placeholder="Age"
                        value={walkInAge}
                        onChange={e => setWalkInAge(e.target.value)}
                        className="w-16 px-2.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                      />
                      <select
                        value={walkInGender}
                        onChange={e => setWalkInGender(e.target.value as any)}
                        className="flex-1 px-2 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="Male">M</option>
                        <option value="Female">F</option>
                        <option value="Other">O</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Assign Doctor & OPD</label>
                  <select
                    value={walkInDoctorId}
                    onChange={e => setWalkInDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization || d.departmentName}) — ₹{d.consultationFee}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWalkInModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer border-none shadow-md shadow-blue-500/20"
                  >
                    Generate Token
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={26} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800">Token Generated Successfully!</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Please hand this receipt to the patient</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">Token Number</span>
                    <span className="text-2xl font-black text-blue-600">#{generatedSlip.tokenNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Patient:</span>
                    <span className="font-bold text-slate-700">{generatedSlip.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Doctor:</span>
                    <span className="font-bold text-slate-700">{generatedSlip.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Department:</span>
                    <span className="font-bold text-slate-700">{generatedSlip.departmentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Consultation Fee:</span>
                    <span className="font-extrabold text-slate-800">₹{generatedSlip.consultationFee} (Cash Paid)</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50"
                  >
                    <Printer size={14} /> Print Slip
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedSlip(null);
                      setShowWalkInModal(false);
                      setWalkInName('');
                      setWalkInPhone('');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-none cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
