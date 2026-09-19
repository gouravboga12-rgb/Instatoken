import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import {
  Users, Ticket, Clock, TrendingUp,
  UserPlus, Plus, ArrowRight, Stethoscope, Bell,
  CheckCircle2, X, Printer, Activity
} from 'lucide-react';

export const HospitalDashboard: React.FC = () => {
  const {
    hospitalUser,
    hospitalProfile,
    tokens,
    doctors,
    departments,
    staff,
    generateWalkInToken
  } = useHospital();
  const navigate = useNavigate();

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInGender, setWalkInGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [walkInAge, setWalkInAge] = useState('32');
  const [walkInDoctorId, setWalkInDoctorId] = useState(doctors[0]?.id || '');
  const [generatedSlip, setGeneratedSlip] = useState<any>(null);

  // Sync walkInDoctorId when doctors load
  useEffect(() => {
    if (doctors.length > 0 && (!walkInDoctorId || !doctors.some(d => d.id === walkInDoctorId))) {
      setWalkInDoctorId(doctors[0].id);
    }
  }, [doctors, walkInDoctorId]);

  // Auto-refresh pulse timer (simulated live update every 5 seconds)
  const [livePulse, setLivePulse] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1200);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Format greeting & dates
  const rawName = hospitalUser?.name || hospitalProfile?.name || 'Hospital';
  const firstName = rawName.replace(/^Dr\.\s*/i, '').split(' ')[0] || 'Hospital';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dateFormatted = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Filter today's tokens accurately
  const isTodayToken = (t: any) => {
    if (!t.bookingDate) return true;
    if (t.bookingDate === todayStr) return true;
    const d = new Date(t.bookingDate);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0] === todayStr || d.toDateString() === today.toDateString();
    }
    return true;
  };

  const todayTokens = useMemo(() => {
    const filtered = tokens.filter(isTodayToken);
    return filtered.length > 0 ? filtered : tokens;
  }, [tokens, todayStr]);

  // 1. Today's Patients
  const totalTokensCount = todayTokens.length;
  const offlineTokensCount = todayTokens.filter(t => t.type === 'offline').length;
  const onlineTokensCount = todayTokens.filter(t => t.type === 'online').length;

  // 2. Today's Revenue & Collections
  const todayEarnedRevenue = useMemo(() => {
    return todayTokens
      .filter(t => t.status === 'completed' || t.paymentStatus === 'paid')
      .reduce((sum, t) => {
        const doc = doctors.find(d => d.id === t.doctorId);
        return sum + (t.consultationFee || doc?.consultationFee || 500);
      }, 0);
  }, [todayTokens, doctors]);

  const todayPendingRevenue = useMemo(() => {
    return todayTokens
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.paymentStatus !== 'paid')
      .reduce((sum, t) => {
        const doc = doctors.find(d => d.id === t.doctorId);
        return sum + (t.consultationFee || doc?.consultationFee || 500);
      }, 0);
  }, [todayTokens, doctors]);

  // 3. Patients in Queue
  const queueTokens = useMemo(() => {
    return todayTokens.filter(t =>
      ['booked', 'waiting', 'checked-in', 'calling', 'in-consultation', 'in-consult'].includes(t.status as string)
    );
  }, [todayTokens]);

  const inQueueCount = queueTokens.length;
  const inConsultCount = queueTokens.filter(t => t.status === 'in-consultation' || (t.status as string) === 'in-consult' || t.status === 'calling').length;
  const waitingCount = queueTokens.filter(t => ['waiting', 'booked', 'checked-in'].includes(t.status as string)).length;

  // 4. Avg. Waiting Time
  const avgWaitMin = useMemo(() => {
    const waitingOnly = queueTokens.filter(t => t.status !== 'in-consultation' && (t.status as string) !== 'in-consult');
    if (waitingOnly.length === 0) return 0;
    const withWait = waitingOnly.filter(t => typeof t.estimatedWait === 'number' && t.estimatedWait > 0);
    if (withWait.length > 0) {
      return Math.round(withWait.reduce((acc, t) => acc + (t.estimatedWait || 0), 0) / withWait.length);
    }
    return Math.min(45, Math.max(5, waitingOnly.length * 10));
  }, [queueTokens]);

  const activeDoctorsCount = doctors.filter(d => d.active !== false).length;

  // 7-Day Revenue & Footfall dynamic calculation
  const last7DaysData = useMemo(() => {
    const days: { label: string; dateStr: string; footfall: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' });

      const dayTokens = tokens.filter(t => {
        if (!t.bookingDate) return i === 0;
        return t.bookingDate === dateStr || new Date(t.bookingDate).toDateString() === d.toDateString();
      });

      const dayRevenue = dayTokens
        .filter(t => t.status === 'completed' || t.paymentStatus === 'paid')
        .reduce((acc, t) => {
          const doc = doctors.find(doc => doc.id === t.doctorId);
          return acc + (t.consultationFee || doc?.consultationFee || 500);
        }, 0);

      days.push({
        label: dayLabel,
        dateStr,
        footfall: dayTokens.length,
        revenue: dayRevenue
      });
    }
    return days;
  }, [tokens, doctors]);

  const max7DayRevenue = Math.max(...last7DaysData.map(d => d.revenue), 1000);
  const total7DayRevenue = last7DaysData.reduce((acc, d) => acc + d.revenue, 0);

  const chartPoints = useMemo(() => {
    return last7DaysData.map((d, idx) => {
      const x = 50 + idx * (590 / 6);
      const ratio = max7DayRevenue > 0 ? d.revenue / max7DayRevenue : 0;
      const y = 190 - ratio * 155;
      return { x, y, revenue: d.revenue, footfall: d.footfall, label: d.label };
    });
  }, [last7DaysData, max7DayRevenue]);

  const splinePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    let d = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i];
      const p1 = chartPoints[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      d += ` C ${cx1} ${p0.y}, ${cx2} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (!splinePath || chartPoints.length === 0) return '';
    return `${splinePath} L ${chartPoints[chartPoints.length - 1].x} 190 L ${chartPoints[0].x} 190 Z`;
  }, [splinePath, chartPoints]);

  // Format number for chart Y axis
  const formatK = (val: number) => {
    if (val >= 100000) return `${Math.round(val / 1000)}k`;
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
    return `${val}`;
  };

  // Department mix data calculated dynamically
  const DEPT_COLORS = ['#1E40AF', '#15803D', '#EA580C', '#06B6D4', '#A855F7', '#2563EB', '#D97706', '#E11D48'];

  const departmentMixData = useMemo(() => {
    const deptMap = new Map<string, { name: string; count: number }>();

    // Seed departments from hospital configuration
    if (departments.length > 0) {
      departments.forEach(dept => {
        deptMap.set(dept.name.toLowerCase(), { name: dept.name, count: 0 });
      });
    }

    todayTokens.forEach(t => {
      const deptName = t.departmentName || 'General Medicine';
      const key = deptName.toLowerCase();
      if (deptMap.has(key)) {
        deptMap.get(key)!.count += 1;
      } else {
        deptMap.set(key, { name: deptName, count: 1 });
      }
    });

    const list = Array.from(deptMap.values())
      .filter(d => d.count > 0 || departments.some(dept => dept.name.toLowerCase() === d.name.toLowerCase()))
      .slice(0, 6);

    const total = list.reduce((sum, d) => sum + d.count, 0);

    let accumulated = 0;
    return list.map((item, idx) => {
      const percent = total > 0 ? (item.count / total) : 0;
      const dashLength = percent * 408.4;
      const offset = -(accumulated * 408.4);
      accumulated += percent;

      return {
        name: item.name,
        count: item.count,
        percent: Math.round(percent * 100),
        color: DEPT_COLORS[idx % DEPT_COLORS.length],
        dashLength,
        offset
      };
    });
  }, [departments, todayTokens]);

  const totalDeptPatients = departmentMixData.reduce((acc, d) => acc + d.count, 0);

  // Live queue rows directly from real tokens
  const realLiveQueue = useMemo(() => {
    const statusPriority: Record<string, number> = {
      'calling': 1,
      'in-consultation': 2,
      'in-consult': 2,
      'waiting': 3,
      'checked-in': 4,
      'booked': 5,
      'completed': 6,
      'skipped': 7,
      'cancelled': 8
    };

    const sorted = [...todayTokens].sort((a, b) => {
      const pA = statusPriority[a.status] || 9;
      const pB = statusPriority[b.status] || 9;
      if (pA !== pB) return pA - pB;
      return (a.tokenNo || 0) - (b.tokenNo || 0);
    });

    return sorted.slice(0, 6).map((t, idx) => {
      const prefix = t.departmentName ? t.departmentName.charAt(0).toUpperCase() : 'T';
      const formattedId = `${prefix}${String(t.tokenNo).padStart(3, '0')}`;
      const waitTime = ['completed', 'in-consultation', 'in-consult'].includes(t.status as string)
        ? '0 min'
        : `${t.estimatedWait || Math.max(5, (idx + 1) * 8)} min`;

      return {
        id: formattedId,
        rawId: t.id,
        tokenNo: t.tokenNo,
        patientName: t.patientName || 'Patient',
        patientPhone: t.patientPhone,
        patientAge: t.patientAge,
        patientAgeDisplay: t.patientAgeDisplay || (t.patientAge ? `${t.patientAge}y` : ''),
        type: t.type,
        isExisting: Boolean(t.isExisting || t.isRevisit),
        rmpReference: t.rmpReference,
        dept: t.departmentName || 'General Medicine',
        doctor: t.doctorName || 'Consultant Doctor',
        waitTime,
        status: t.status
      };
    });
  }, [todayTokens]);

  // Doctor availability & Token capacity used directly from real doctors
  const doctorAvailabilityList = useMemo(() => {
    return doctors.map(doc => {
      const docTokens = todayTokens.filter(t => t.doctorId === doc.id);
      const used = docTokens.length;
      const total = doc.maxTokensPerDay || (doc.sessions?.reduce((sum, s) => sum + (s.maxTokens || 0), 0) || 40);
      const timing = (doc.opdStartTime && doc.opdEndTime)
        ? `${doc.opdStartTime} – ${doc.opdEndTime}`
        : '09:00 – 17:00';

      return {
        id: doc.id,
        name: doc.name,
        specialty: doc.specialization || doc.departmentName || 'Consultant',
        timing,
        active: doc.active !== false,
        used,
        total: Math.max(used, total)
      };
    });
  }, [doctors, todayTokens]);

  // Department revenue data from real tokens
  const deptRevenue = useMemo(() => {
    const deptRevMap = new Map<string, { name: string; rev: number }>();

    departments.forEach(dept => {
      deptRevMap.set(dept.name.toLowerCase(), { name: dept.name, rev: 0 });
    });

    tokens.forEach(t => {
      const deptName = t.departmentName || 'General Medicine';
      const key = deptName.toLowerCase();
      const fee = t.consultationFee || 500;
      if (t.status === 'completed' || t.paymentStatus === 'paid') {
        if (deptRevMap.has(key)) {
          deptRevMap.get(key)!.rev += fee;
        } else {
          deptRevMap.set(key, { name: deptName, rev: fee });
        }
      }
    });

    return Array.from(deptRevMap.values()).slice(0, 8);
  }, [departments, tokens]);

  const maxDeptRevenue = Math.max(...deptRevenue.map(d => d.rev), 1000);

  // Recent activity list dynamically generated from actual hospital events
  const recentActivities = useMemo(() => {
    const list: { title: string; author: string; time: string }[] = [];

    // Recent tokens
    tokens.slice(0, 8).forEach(t => {
      if (t.status === 'completed') {
        list.push({
          title: `Completed consultation for ${t.patientName}`,
          author: t.doctorName || 'Doctor',
          time: t.time || 'Today'
        });
      } else if (t.status === 'in-consultation' || (t.status as string) === 'in-consult' || t.status === 'calling') {
        list.push({
          title: `Consultation calling/in progress for ${t.patientName}`,
          author: t.doctorName || 'Doctor',
          time: t.time || 'In progress'
        });
      } else {
        list.push({
          title: `Created token #${t.tokenNo} for ${t.patientName}`,
          author: t.type === 'online' ? 'Online Booking' : (hospitalUser?.name || 'Reception'),
          time: t.time || 'Today'
        });
      }
    });

    // Staff attendance records
    staff.forEach(s => {
      const att = s.attendance?.find(a => a.date === todayStr);
      if (att && att.checkIn) {
        list.push({
          title: `Marked attendance for ${s.name} (${s.shift} shift)`,
          author: s.departmentName || 'Staff',
          time: att.checkIn
        });
      }
    });

    if (list.length === 0) {
      return [
        {
          title: 'Hospital OPD Dashboard active',
          author: hospitalUser?.name || 'Administrator',
          time: 'Today'
        }
      ];
    }

    return list.slice(0, 5);
  }, [tokens, staff, todayStr, hospitalUser]);

  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    const doc = doctors.find(d => d.id === walkInDoctorId) || doctors[0];
    const newToken = generateWalkInToken({
      patientName: walkInName.trim(),
      patientPhone: walkInPhone.trim() || '+91 98450 00000',
      patientGender: walkInGender,
      patientAge: parseInt(walkInAge) || 30,
      doctorId: doc?.id || doctors[0]?.id || '',
      departmentId: doc?.departmentId || 'dept-general',
      session: 'morning'
    });
    setGeneratedSlip(newToken);
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-[1680px] mx-auto bg-slate-50 min-h-screen">
      
      {/* ─── 1. TOP EXECUTIVE WELCOME HEADER ─────────────────────────── */}
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

      {/* ─── 2. TOP KPI CARDS (4-CARD GRID) ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Today's patients */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={18} />
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                <TrendingUp size={12} /> Live
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
                opacity="0.15"
              />
              <path
                d="M 0 32 Q 30 28, 60 30 T 120 20 T 170 22 T 200 16"
                fill="none"
                stroke="#3B82F6"
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
                <TrendingUp size={12} /> Today
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                ₹{todayEarnedRevenue.toLocaleString('en-IN')}
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1.5">Today's revenue</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                ₹{todayPendingRevenue.toLocaleString('en-IN')} pending collection
              </p>
            </div>
          </div>
          {/* Sparkline wave */}
          <div className="w-full h-10 mt-3 -mb-1">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path
                d="M 0 34 Q 35 30, 70 24 T 130 18 T 170 22 T 200 12 L 200 40 L 0 40 Z"
                fill="#10B981"
                opacity="0.15"
              />
              <path
                d="M 0 34 Q 35 30, 70 24 T 130 18 T 170 22 T 200 12"
                fill="none"
                stroke="#10B981"
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
              <span className="inline-flex items-center gap-0.5 text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg">
                <Activity size={12} /> Active
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                {inQueueCount}
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1.5">Patients in queue</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {inConsultCount} in consult · {waitingCount} waiting
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
              <span className="inline-flex items-center gap-0.5 text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                OPD Target
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                {avgWaitMin} min
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

      {/* ─── 3. MIDDLE ROW: REVENUE & FOOTFALL + DEPARTMENT MIX ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Revenue & Footfall Area Spline Chart (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">Revenue & footfall</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Last 7 days</p>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
              ₹{total7DayRevenue.toLocaleString('en-IN')} total 7-day revenue
            </span>
          </div>

          {/* Dynamic SVG Spline Chart with Y Axis and Mon-Sun Labels */}
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

              {/* Dynamic Y Axis Labels */}
              <text x="5" y="24" className="fill-slate-400 text-[11px] font-bold">{formatK(max7DayRevenue)}</text>
              <text x="5" y="69" className="fill-slate-400 text-[11px] font-bold">{formatK(Math.round(max7DayRevenue * 0.75))}</text>
              <text x="5" y="114" className="fill-slate-400 text-[11px] font-bold">{formatK(Math.round(max7DayRevenue * 0.5))}</text>
              <text x="12" y="159" className="fill-slate-400 text-[11px] font-bold">{formatK(Math.round(max7DayRevenue * 0.25))}</text>
              <text x="18" y="194" className="fill-slate-400 text-[11px] font-bold">0</text>

              {/* Gradient Area Fill */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#chartGrad)"
                />
              )}

              {/* Spline Line */}
              {splinePath && (
                <path
                  d={splinePath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              )}

              {/* Nodes along the curve */}
              {chartPoints.map((pt, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    className="transition-transform group-hover:scale-150"
                  />
                  <title>{`${pt.label}: ₹${pt.revenue.toLocaleString('en-IN')} (${pt.footfall} patients)`}</title>
                </g>
              ))}
            </svg>

            {/* X-Axis Days Labels */}
            <div className="flex justify-between pl-12 pr-4 pt-3 text-xs font-bold text-slate-400">
              {last7DaysData.map(d => (
                <span key={d.dateStr}>{d.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Department Mix Donut Chart (col-span-1) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800">Department mix</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {totalDeptPatients} {totalDeptPatients === 1 ? 'patient' : 'patients'} today
            </p>
          </div>

          {/* SVG Donut Chart */}
          <div className="flex items-center justify-center py-4 relative">
            <svg width="180" height="180" viewBox="0 0 180 180" className="rotate-[-90deg]">
              {/* Background Ring */}
              <circle
                cx="90"
                cy="90"
                r="65"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="24"
              />
              {/* Dynamic Segments */}
              {totalDeptPatients > 0 ? (
                departmentMixData.map((item, idx) => (
                  <circle
                    key={idx}
                    cx="90"
                    cy="90"
                    r="65"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="24"
                    strokeDasharray={`${item.dashLength} 408.4`}
                    strokeDashoffset={item.offset}
                    className="transition-all duration-500"
                  />
                ))
              ) : (
                <circle
                  cx="90"
                  cy="90"
                  r="65"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="24"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800">{totalDeptPatients}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients</span>
            </div>
          </div>

          {/* Legend Table */}
          <div className="space-y-2 text-xs font-semibold text-slate-600 border-t border-slate-50 pt-3 max-h-48 overflow-y-auto">
            {departmentMixData.length > 0 ? (
              departmentMixData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate max-w-[140px]">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-800">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">No departments registered</p>
            )}
          </div>
        </div>

      </div>

      {/* ─── 4. LOWER-MIDDLE ROW: LIVE QUEUE + DOCTOR AVAILABILITY ─ */}
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
                Auto-refreshing live hospital queue
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
          {realLiveQueue.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {realLiveQueue.map(item => (
                <div key={item.rawId || item.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Token Badge */}
                    <div className="w-12 h-9 rounded-xl bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 border border-blue-100">
                      {item.id}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                          {item.patientName}
                        </h4>
                        {item.type === 'online' ? (
                          <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                            Online
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                            Offline
                          </span>
                        )}
                        {item.isExisting && (
                          <span className="text-[9px] font-black text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded">
                            ★ Existing
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">
                        {item.dept} · {item.doctor} {item.patientAgeDisplay ? `· ${item.patientAgeDisplay}` : ''}
                      </p>
                      {item.rmpReference && item.rmpReference.name && (
                        <p className="text-[10px] font-bold text-indigo-700 truncate mt-0.5">
                          RMP Ref: Dr. {item.rmpReference.name} {item.rmpReference.phone ? `(${item.rmpReference.phone})` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Wait Time */}
                    <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <Clock size={13} className="text-slate-400" />
                      <span>{item.waitTime}</span>
                    </div>

                    {/* Status Pill */}
                    {(item.status === 'in-consultation' || (item.status as string) === 'in-consult') && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-600 border border-blue-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> In Consult
                      </span>
                    )}
                    {item.status === 'calling' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-purple-50 text-purple-600 border border-purple-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" /> Calling
                      </span>
                    )}
                    {['waiting', 'booked', 'checked-in'].includes(item.status as string) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-600 border border-amber-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Waiting
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed
                      </span>
                    )}
                    {item.status === 'skipped' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Skipped
                      </span>
                    )}
                    {!['in-consult', 'in-consultation', 'calling', 'waiting', 'booked', 'checked-in', 'completed', 'skipped'].includes(item.status as string) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-600">
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Ticket size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No active queue right now</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are no waiting patients in OPD. Click below to issue a walk-in token or add a new patient.
              </p>
              <button
                onClick={() => setShowWalkInModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer border-none"
              >
                <UserPlus size={14} /> Walk-in patient
              </button>
            </div>
          )}
        </div>

        {/* Right: Doctor availability & Token capacity used (col-span-1) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between space-y-6">
          
          {/* Part A: Doctor availability */}
          <div>
            <h3 className="text-base font-black text-slate-800 mb-4">Doctor availability</h3>
            {doctorAvailabilityList.length > 0 ? (
              <div className="space-y-3.5">
                {doctorAvailabilityList.map(doc => (
                  <div key={doc.id || doc.name} className="flex items-center justify-between gap-3">
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
            ) : (
              <p className="text-xs text-slate-400 py-3">No doctors registered yet.</p>
            )}
          </div>

          {/* Part B: Token capacity used */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
              Token capacity used
            </h3>
            {doctorAvailabilityList.length > 0 ? (
              <div className="space-y-3">
                {doctorAvailabilityList.map(doc => {
                  const percent = doc.total > 0 ? Math.round((doc.used / doc.total) * 100) : 0;
                  return (
                    <div key={doc.id || doc.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700 truncate max-w-[150px]">{doc.name}</span>
                        <span className="text-slate-400 font-semibold">{doc.used}/{doc.total}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">No active doctors to track capacity.</p>
            )}
          </div>

        </div>

      </div>

      {/* ─── 5. BOTTOM ROW: DEPARTMENT REVENUE + RECENT ACTIVITY ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Department Revenue Bar Chart (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-800">Department revenue</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Revenue earned from visited consultations</p>
          </div>

          {/* Vertical Bar Chart matching actual departments and tokens */}
          <div className="w-full relative pt-2">
            <svg className="w-full h-56 overflow-visible" viewBox="0 0 650 200">
              {/* Horizontal Grid lines */}
              <line x1="45" y1="20" x2="640" y2="20" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="65" x2="640" y2="65" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="110" x2="640" y2="110" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="155" x2="640" y2="155" stroke="#F1F5F9" strokeDasharray="4,4" strokeWidth="1" />
              <line x1="45" y1="190" x2="640" y2="190" stroke="#E2E8F0" strokeWidth="1" />

              {/* Dynamic Y Axis Labels */}
              <text x="5" y="24" className="fill-slate-400 text-[11px] font-bold">{formatK(maxDeptRevenue)}</text>
              <text x="5" y="69" className="fill-slate-400 text-[11px] font-bold">{formatK(Math.round(maxDeptRevenue * 0.75))}</text>
              <text x="5" y="114" className="fill-slate-400 text-[11px] font-bold">{formatK(Math.round(maxDeptRevenue * 0.5))}</text>
              <text x="12" y="159" className="fill-slate-400 text-[11px] font-bold">{formatK(Math.round(maxDeptRevenue * 0.25))}</text>
              <text x="18" y="194" className="fill-slate-400 text-[11px] font-bold">0</text>

              {/* Department Columns Bars */}
              {deptRevenue.map((item, idx) => {
                const totalBars = deptRevenue.length || 1;
                const colSpacing = Math.min(72, Math.floor(540 / totalBars));
                const barWidth = Math.min(32, colSpacing - 12);
                const x = 70 + idx * colSpacing;
                const barHeight = maxDeptRevenue > 0 ? (item.rev / maxDeptRevenue) * 165 : 0;
                const y = 190 - Math.max(4, barHeight);

                return (
                  <g key={item.name} className="group cursor-pointer">
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(4, barHeight)}
                      rx="6"
                      fill="#2563EB"
                      className="transition-all group-hover:fill-blue-700"
                    />
                    <title>{`${item.name}: ₹${item.rev.toLocaleString('en-IN')}`}</title>
                  </g>
                );
              })}
            </svg>

            {/* X Axis Department Labels */}
            <div className="flex justify-between pl-10 pr-2 pt-2 text-[10.5px] font-bold text-slate-500 overflow-x-auto">
              {deptRevenue.map(item => (
                <span key={item.name} className="truncate w-16 text-center -rotate-12 transform origin-top-left">
                  {item.name}
                </span>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 mt-8 text-xs font-bold text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
              <span>Earned Revenue</span>
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
