import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import type { TokenRecord } from '../../context/HospitalContext';
import {
  CheckCircle, Clock, Play,
  XCircle, Calendar, Search,
  Printer, Eye, Phone, Wifi, WifiOff,
  Volume2, Sparkles, UserX,
  Wallet, MapPin, AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import { TokenPaymentModal } from '../../components/hospital/TokenPaymentModal';

export const DoctorTokenScreen: React.FC<{ doctorIdProp?: string }> = ({ doctorIdProp }) => {
  const params = useParams<{ doctorId: string }>();
  const doctorId = doctorIdProp || params.doctorId;
  const { doctors, tokens, updateTokenStatus, callPatientToken, admitPatientToCabin, markTokensUnvisited, updateTokenPayment, updateTokenSession, hospitalProfile } = useHospital();
  const navigate = useNavigate();

  const doctor = doctors.find(d => d.id === doctorId) || doctors[0];

  // Filters State
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'completed' | 'not-visited' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('all');

  // Modals
  const [viewToken, setViewToken] = useState<TokenRecord | null>(null);
  const [printToken, setPrintToken] = useState<TokenRecord | null>(null);
  const [visitingToken, setVisitingToken] = useState<TokenRecord | null>(null);
  const [paymentTargetToken, setPaymentTargetToken] = useState<TokenRecord | null>(null);
  const [confirmVisitToken, setConfirmVisitToken] = useState<TokenRecord | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Web Audio Calling Chime
  const playCallChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) { }
  };

  // Filter Tokens strictly for this Doctor (matching both ID and normalized Doctor Name, deduplicated by Token ID)
  const doctorTokens = useMemo(() => {
    if (!doctor) return [];
    const docName = (doctor.name || '').toLowerCase().trim();
    const seenIds = new Set<string>();
    const list: TokenRecord[] = [];

    tokens.forEach(t => {
      const isDocMatch = t.doctorId === doctor.id || (docName && t.doctorName && t.doctorName.toLowerCase().trim() === docName);
      if (!isDocMatch) return;
      const key = t.id || (t as any).appointmentId;
      if (key) {
        if (seenIds.has(key)) return;
        seenIds.add(key);
      }
      list.push(t);
    });

    return list;
  }, [tokens, doctor?.id, doctor?.name]);

  const filteredTokens = useMemo(() => {
    const list = doctorTokens.filter(t => {
      // 0. Exclude tokens that have been routed to the Unvisited Directory (/hospital/tokens/unvisited)
      if (t.status === 'not-visited' || t.status === 'unvisited') {
        return false;
      }

      // 1. Status Tab
      if (statusTab === 'active' && !['booked', 'waiting', 'checked-in', 'calling', 'in-consultation', 'arrived'].includes(t.status)) return false;
      if (statusTab === 'completed' && t.status !== 'completed') return false;
      if (statusTab === 'not-visited' && !['skipped', 'late-coming'].includes(t.status)) return false;
      if (statusTab === 'cancelled' && t.status !== 'cancelled') return false;

      // 2. Date Filter
      const tDate = t.bookingDate || todayStr;
      if (dateFilter === 'today' && tDate !== todayStr) return false;
      if (dateFilter === 'tomorrow' && tDate !== tomorrowStr) return false;
      if (dateFilter === 'yesterday' && tDate !== yesterdayStr) return false;
      if (dateFilter === 'custom' && customDate && tDate !== customDate) return false;

      // 3. Source Filter
      if (sourceFilter === 'online' && t.type !== 'online') return false;
      if (sourceFilter === 'offline' && t.type !== 'offline') return false;

      // 4. Session Filter
      if (selectedSessionFilter !== 'all' && t.session?.toLowerCase() !== selectedSessionFilter.toLowerCase()) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.tokenNo.toString().includes(q) ||
          t.patientName.toLowerCase().includes(q) ||
          t.patientPhone.includes(q) ||
          t.id.toLowerCase().includes(q)
        );
      }

      return true;
    });

    const getPriority = (status: string) => {
      // 1. In Cabin (Currently consulting)
      if (status === 'in-consultation' || status === 'checked-in') return 1;
      // 2. Calling (Patient is being called right now)
      if (status === 'calling') return 2;
      // 3. Waiting / Booked / Arrived (Active queue ready to enter next)
      if (['booked', 'waiting', 'arrived'].includes(status)) return 3;
      // 4. On-Hold / Late-coming / Skipped (Arrived late or held)
      if (['late-coming', 'not-visited', 'skipped'].includes(status)) return 4;
      // 5. Visited / Completed (Done - sinks below pending tokens)
      if (status === 'completed') return 5;
      // 6. Cancelled
      if (status === 'cancelled') return 6;
      return 7;
    };

    return list.sort((a, b) => {
      const pA = getPriority(a.status);
      const pB = getPriority(b.status);
      if (pA !== pB) return pA - pB;
      // Within same priority, order by token number ascending (e.g. #3 before #4)
      const tokA = Number(a.tokenNo || (a as any).tokenNumber || 0);
      const tokB = Number(b.tokenNo || (b as any).tokenNumber || 0);
      return tokA - tokB;
    });
  }, [doctorTokens, statusTab, dateFilter, customDate, sourceFilter, selectedSessionFilter, searchQuery, todayStr, tomorrowStr, yesterdayStr]);

  // Doctor OPD Sessions configuration
  const doctorSessions = useMemo(() => {
    if (doctor?.sessions && doctor.sessions.length > 0) {
      return doctor.sessions.filter(s => s.active !== false);
    }
    return [
      { id: 'sess-morning', name: 'Morning', startTime: '09:00 AM', endTime: '01:00 PM', active: true },
      { id: 'sess-afternoon', name: 'Afternoon', startTime: '01:00 PM', endTime: '05:00 PM', active: true },
      { id: 'sess-evening', name: 'Evening', startTime: '05:00 PM', endTime: '09:00 PM', active: true },
    ];
  }, [doctor]);

  // Real-world ongoing session based on current clock time
  const currentOngoingSession = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 13) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []);

  // Helper to check if token matches the active date filter
  const isDateMatching = (t: TokenRecord) => {
    if (dateFilter === 'all') return true;
    const tDate = t.bookingDate || todayStr;
    if (dateFilter === 'today') return tDate === todayStr;
    if (dateFilter === 'tomorrow') return tDate === tomorrowStr;
    if (dateFilter === 'yesterday') return tDate === yesterdayStr;
    if (dateFilter === 'custom' && customDate) return tDate === customDate;
    return true;
  };

  // Live session statistics respecting the active date filter
  const sessionStats = useMemo(() => {
    const stats: Record<string, { waiting: number; inCabin: number; completed: number; total: number }> = {
      all: { waiting: 0, inCabin: 0, completed: 0, total: 0 },
      morning: { waiting: 0, inCabin: 0, completed: 0, total: 0 },
      afternoon: { waiting: 0, inCabin: 0, completed: 0, total: 0 },
      evening: { waiting: 0, inCabin: 0, completed: 0, total: 0 }
    };
    doctorSessions.forEach(s => {
      const key = s.name.toLowerCase();
      if (!stats[key]) stats[key] = { waiting: 0, inCabin: 0, completed: 0, total: 0 };
    });

    doctorTokens.forEach(t => {
      if (!isDateMatching(t)) return;

      stats.all.total++;
      if (['booked', 'waiting', 'calling', 'arrived'].includes(t.status)) stats.all.waiting++;
      if (['checked-in', 'in-consultation'].includes(t.status)) stats.all.inCabin++;
      if (t.status === 'completed') stats.all.completed++;

      const sKey = (t.session || 'morning').toLowerCase();
      if (!stats[sKey]) stats[sKey] = { waiting: 0, inCabin: 0, completed: 0, total: 0 };
      stats[sKey].total++;
      if (['booked', 'waiting', 'calling', 'arrived'].includes(t.status)) stats[sKey].waiting++;
      if (['checked-in', 'in-consultation'].includes(t.status)) stats[sKey].inCabin++;
      if (t.status === 'completed') stats[sKey].completed++;
    });
    return stats;
  }, [doctorSessions, doctorTokens, dateFilter, customDate, todayStr, tomorrowStr, yesterdayStr]);

  // Active Queue strictly respecting Selected Session (or All) and Date filter
  const activeQueue = useMemo(() => {
    return doctorTokens.filter(t => {
      if (!isDateMatching(t)) return false;
      const isActive = ['booked', 'waiting', 'checked-in', 'calling', 'in-consultation', 'arrived'].includes(t.status);
      if (!isActive) return false;
      if (selectedSessionFilter !== 'all') {
        const sKey = (t.session || 'morning').toLowerCase();
        if (sKey !== selectedSessionFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [doctorTokens, dateFilter, customDate, selectedSessionFilter, todayStr, tomorrowStr, yesterdayStr]);

  const activelyCalling = activeQueue.find(t => t.status === 'calling');
  const inConsultation = activeQueue.find(t => t.status === 'checked-in' || t.status === 'in-consultation');
  const nextInLine = activeQueue.filter(t => t.id !== inConsultation?.id && t.id !== activelyCalling?.id);
  const completedToday = doctorTokens.filter(t => {
    if (!isDateMatching(t) || t.status !== 'completed') return false;
    if (selectedSessionFilter !== 'all') {
      return (t.session || 'morning').toLowerCase() === selectedSessionFilter.toLowerCase();
    }
    return true;
  });
  const onHoldToday = doctorTokens.filter(t => {
    if (!isDateMatching(t) || !['skipped', 'late-coming'].includes(t.status)) return false;
    if (selectedSessionFilter !== 'all') {
      return (t.session || 'morning').toLowerCase() === selectedSessionFilter.toLowerCase();
    }
    return true;
  });
  const cancelledToday = doctorTokens.filter(t => {
    if (!isDateMatching(t) || t.status !== 'cancelled') return false;
    if (selectedSessionFilter !== 'all') {
      return (t.session || 'morning').toLowerCase() === selectedSessionFilter.toLowerCase();
    }
    return true;
  });
  const totalSessionDoctorTokens = doctorTokens.filter(t => {
    if (!isDateMatching(t)) return false;
    if (selectedSessionFilter !== 'all') {
      return (t.session || 'morning').toLowerCase() === selectedSessionFilter.toLowerCase();
    }
    return true;
  });
  const todayDoctorRevenue = doctorTokens
    .filter(t => t.status === 'completed' && isDateMatching(t))
    .reduce((acc, t) => acc + (t.consultationFee || doctor?.consultationFee || 0), 0);

  if (!doctor) {
    return (
      <div className="p-8 text-center max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm mt-12 space-y-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto font-black text-xl">
          🩺
        </div>
        <h3 className="text-base font-black text-slate-800">No Doctors Enrolled Yet</h3>
        <p className="text-xs text-slate-400 font-semibold">
          Add doctors to {hospitalProfile?.name || 'your hospital'} to start managing doctor cabin screens and live token queues.
        </p>
        <button
          onClick={() => navigate('/hospital/doctors')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer border-none shadow-sm shadow-blue-500/20"
        >
          + Add Doctors to Hospital
        </button>
      </div>
    );
  }

  const handleCallPatient = async (tokenId: string) => {
    playCallChime();
    await callPatientToken(tokenId);
  };

  const handleCallNext = (tokenId?: string) => {
    const targetId = tokenId || (nextInLine.length > 0 ? nextInLine[0].id : activeQueue.length > 0 ? activeQueue[0].id : undefined);
    if (targetId) {
      handleCallPatient(targetId);
    }
  };

  const handleAdmitCabin = async (tokenId: string) => {
    await admitPatientToCabin(tokenId);
  };

  const handleCompleteToken = (id: string) => {
    const target = tokens.find(t => t.id === id);
    if (!target) return;
    setConfirmVisitToken(target);
  };

  const handleConfirmVisitExecution = () => {
    if (!confirmVisitToken) return;
    const tok = confirmVisitToken;
    setConfirmVisitToken(null);
    if (tok.paymentStatus !== 'paid') {
      setVisitingToken(tok);
    } else {
      updateTokenStatus(tok.id, 'completed');
    }
  };

  const handlePutOnHold = (id: string) => {
    updateTokenStatus(id, 'late-coming');
  };

  const handleMarkUnvisitedSingle = async (id: string) => {
    const tok = doctorTokens.find(t => t.id === id);
    const tokLabel = tok ? `Token #${tok.tokenNo} (${tok.patientName})` : 'this token';
    if (window.confirm(`Mark ${tokLabel} as Unvisited? It will be moved to the Unvisited Directory and cleared from this doctor's screen.`)) {
      await markTokensUnvisited([id]);
    }
  };

  const handleRecallToken = async (id: string) => {
    playCallChime();
    await callPatientToken(id);
  };

  // Tokens for this doctor that are still active/on-hold and can be routed in bulk at end of session
  const unroutedDoctorTokens = useMemo(() => {
    return doctorTokens.filter(t => isDateMatching(t) && !['completed', 'cancelled', 'not-visited', 'unvisited'].includes(t.status));
  }, [doctorTokens, dateFilter, customDate, todayStr, tomorrowStr, yesterdayStr]);

  const handleRouteAllToUnvisited = async () => {
    if (unroutedDoctorTokens.length === 0) {
      alert('No active or on-hold tokens found to route.');
      return;
    }
    const count = unroutedDoctorTokens.length;
    const dateLabel = dateFilter === 'today' ? "today's" : dateFilter === 'all' ? 'all' : dateFilter;
    if (window.confirm(`Route all ${count} remaining absent / on-hold tokens for ${doctor?.name || 'this doctor'} (${dateLabel}) to the Unvisited Directory? Patients will be safely archived for smart re-admission without deleting their medical or payment records.`)) {
      await markTokensUnvisited(unroutedDoctorTokens.map(t => t.id));
    }
  };

  const handleShiftSession = (tok: TokenRecord, targetSessionName: string) => {
    const cleanTarget = targetSessionName.toLowerCase();
    const sessionObj = doctorSessions.find(s => s.name.toLowerCase() === cleanTarget);
    const maxCapacity = (sessionObj as any)?.maxTokens || (cleanTarget.includes('morn') ? 30 : 20);

    const targetDate = tok.bookingDate || todayStr;
    const currentBookedCount = tokens.filter(t =>
      t.doctorId === doctor?.id &&
      (t.bookingDate || todayStr) === targetDate &&
      (t.session || '').toLowerCase() === cleanTarget &&
      t.status !== 'cancelled' &&
      t.id !== tok.id
    ).length;

    const isFull = currentBookedCount >= maxCapacity;
    const remainingSlots = Math.max(0, maxCapacity - currentBookedCount);
    const patientLabel = tok.patientName ? `${tok.patientName} (Token #${tok.tokenNo})` : `Token #${tok.tokenNo}`;

    if (isFull) {
      const proceed = window.confirm(
        `⚠️ Warning: ${sessionObj?.name || targetSessionName} Session is currently at full capacity (${currentBookedCount}/${maxCapacity} slots booked).\n\nDo you want to accommodate ${patientLabel} anyway as an over-quota consultation?`
      );
      if (!proceed) return;
    } else {
      const proceed = window.confirm(
        `Shift ${patientLabel} from ${(tok.session || 'Morning')} to ${sessionObj?.name || targetSessionName} Session?\n\nAvailable slots in ${sessionObj?.name || targetSessionName}: ${remainingSlots} left (${currentBookedCount}/${maxCapacity} booked).`
      );
      if (!proceed) return;
    }

    updateTokenSession(tok.id, sessionObj?.name || targetSessionName);
  };



  const handleCancelToken = (id: string) => {
    updateTokenStatus(id, 'cancelled');
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* ── Compact Streamlined Doctor OPD Header ────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Doctor Identity */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="relative shrink-0">
            <img
              src={doctor.photo || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80'}
              alt={doctor.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
            />
            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${doctor.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">{doctor.name}</h1>
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
                {doctor.specialization} · Cabin Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Dept: <strong className="text-slate-600">{doctor.departmentName}</strong> · Fee: <strong className="text-emerald-600">₹{doctor.consultationFee}</strong> · Avg: <strong className="text-slate-600">{doctor.consultationDuration}m</strong>
            </p>
          </div>
        </div>

        {/* Inline Shift Selector Pills (Replaces oversized 110px block) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-2xl overflow-x-auto w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setSelectedSessionFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 shrink-0 border-none ${
              selectedSessionFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>All Shifts</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${selectedSessionFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {sessionStats.all.total}
            </span>
          </button>

          {doctorSessions.map(sess => {
            const sKey = sess.name.toLowerCase();
            const isSelected = selectedSessionFilter === sKey;
            const isCurrentNow = currentOngoingSession === sKey;
            const sStat = sessionStats[sKey] || { waiting: 0, total: 0 };
            const icon = sKey.includes('morn') ? '🌅' : sKey.includes('even') ? '🌙' : '☀️';

            return (
              <button
                key={sess.id}
                type="button"
                onClick={() => setSelectedSessionFilter(sKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 shrink-0 border-none ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isCurrentNow
                      ? 'bg-emerald-100/80 text-emerald-800 font-black'
                      : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>{icon}</span>
                <span>{sess.name}</span>
                {isCurrentNow && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {sStat.waiting}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons & Revenue */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto flex-wrap">
          <div className="px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-2xs">
            <Sparkles size={14} className="text-purple-600" />
            <span>₹{todayDoctorRevenue.toLocaleString('en-IN')} Earned</span>
          </div>
          <button
            onClick={() => handleCallNext()}
            disabled={activeQueue.length === 0}
            className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-xs cursor-pointer border-none shadow-sm shadow-blue-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <Volume2 size={14} /> Call Next Patient
          </button>
          <button
            onClick={() => navigate(`/hospital/tokens/add?doctorId=${doctor.id}&departmentId=${doctor.departmentId || ''}`)}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs cursor-pointer border-none shadow-xs flex items-center gap-1.5"
          >
            + Add Walk-in
          </button>
        </div>
      </div>

      {/* ── Active Calling Quick Bar (Visible when patient is being called from waiting area) ── */}
      {activelyCalling && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-2xl p-3.5 sm:p-4 shadow-lg shadow-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-150 border border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-amber-700 font-black text-base flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white/50">
              #{activelyCalling.tokenNo}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/30">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <Volume2 size={12} /> Calling Patient
                </span>
                <span className="text-amber-200">·</span>
                <h3 className="text-sm font-black text-white">{activelyCalling.patientName}</h3>
                <span className="text-[10px] text-amber-100 font-semibold">
                  ({activelyCalling.patientAgeDisplay || `${activelyCalling.patientAge}y`} · {activelyCalling.patientGender} · {activelyCalling.patientPhone})
                </span>
              </div>
              <p className="text-[10.5px] text-amber-100 mt-0.5 font-medium">
                Ringing patient chime on mobile. When patient arrives at the door, click <strong className="text-white underline">In Cabin</strong> to admit into doctor room.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              onClick={() => handleAdmitCabin(activelyCalling.id)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs cursor-pointer border-none shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
              title="Patient is at the door - admit into doctor cabin"
            >
              <Play size={13} /> In Cabin
            </button>
            <button
              onClick={() => handleRecallToken(activelyCalling.id)}
              className="px-3 py-2 bg-amber-700/60 hover:bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer border border-white/20 shadow-xs flex items-center gap-1 transition-colors"
              title="Ring patient mobile chime again"
            >
              <Volume2 size={13} /> Re-Call
            </button>
            <button
              onClick={() => handlePutOnHold(activelyCalling.id)}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-white border border-amber-400/40 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors"
              title="Put patient on hold for this session"
            >
              <Clock size={13} /> Hold
            </button>
            <button
              onClick={() => handleMarkUnvisitedSingle(activelyCalling.id)}
              className="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-400/40 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
              title="Patient absent - route directly to Unvisited Directory"
            >
              <UserX size={13} /> Unvisit
            </button>
          </div>
        </div>
      )}

      {/* ── Active Consultation Quick Bar (Only visible when patient is in cabin) ── */}
      {inConsultation && (
        <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-150 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
              #{inConsultation.tokenNo}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  In Consultation
                </span>
                <span className="text-slate-500">·</span>
                <h3 className="text-sm font-black text-white">{inConsultation.patientName}</h3>
                <span className="text-[10px] text-slate-300 font-semibold">
                  ({inConsultation.patientAgeDisplay || `${inConsultation.patientAge}y`} · {inConsultation.patientGender} · {inConsultation.patientPhone})
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium">
                Fee: ₹{inConsultation.consultationFee} · Session: {inConsultation.session?.toUpperCase()} · Type: {inConsultation.type?.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              onClick={() => handleRecallToken(inConsultation.id)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs cursor-pointer border-none shadow-xs flex items-center gap-1 transition-colors"
              title="Ring patient chime again"
            >
              <Volume2 size={13} /> Re-Call
            </button>
            <button
              onClick={() => handleCompleteToken(inConsultation.id)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs cursor-pointer border-none shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle size={14} /> Visited / Done
            </button>
            <button
              onClick={() => handlePutOnHold(inConsultation.id)}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Clock size={13} /> Hold
            </button>
            <button
              onClick={() => setPrintToken(inConsultation)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer border-none flex items-center justify-center transition-colors"
              title="Print Token Slip"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Compact Filter & Search Toolbar ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-3 space-y-2.5 text-xs">
        {/* Row 1: Status Filter Tabs Strip */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all ${
                statusTab === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({totalSessionDoctorTokens.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all flex items-center gap-1.5 ${
                statusTab === 'active'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Waiting / Cabin</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusTab === 'active' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                {activeQueue.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('not-visited')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all flex items-center gap-1.5 ${
                statusTab === 'not-visited'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>On-Hold</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusTab === 'not-visited' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
              }`}>
                {onHoldToday.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all flex items-center gap-1.5 ${
                statusTab === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Visited</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusTab === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {completedToday.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('cancelled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all flex items-center gap-1.5 ${
                statusTab === 'cancelled'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Cancelled</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
              }`}>
                {cancelledToday.length}
              </span>
            </button>
          </div>

          {unroutedDoctorTokens.length > 0 && (
            <button
              onClick={handleRouteAllToUnvisited}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
              title="Safely archive all remaining absent / on-hold tokens into Unvisited Directory"
            >
              <UserX size={13} />
              <span>Route All to Unvisited ({unroutedDoctorTokens.length})</span>
            </button>
          )}
        </div>

        {/* Row 2: Secondary Filters & Search Box */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
              <Calendar size={13} className="text-slate-400" />
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer border-none"
              >
                <option value="today">Today</option>
                <option value="all">All Dates</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="yesterday">Yesterday</option>
                <option value="custom">Custom Date</option>
              </select>
              {dateFilter === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-1 text-[10px] font-bold outline-none"
                />
              )}
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer border-none"
              >
                <option value="all">All Sources</option>
                <option value="online">Online App</option>
                <option value="offline">Hospital Desk</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search token #, patient name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* ── Token Queue Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Token #</th>
                <th className="py-3.5 px-4">Patient Details</th>
                <th className="py-3.5 px-4">Session & Time</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Fee & Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No tokens found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTokens.map(tok => {
                  const isCurrent = inConsultation?.id === tok.id;
                  const isOnHold = ['late-coming', 'skipped'].includes(tok.status);
                  const isNotVisited = ['not-visited', 'unvisited'].includes(tok.status);
                  const isCompleted = tok.status === 'completed';
                  const otherSessions = doctorSessions.filter(s => s.name.toLowerCase() !== (tok.session || 'morning').toLowerCase());

                  return (
                    <tr
                      key={tok.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isCurrent ? 'bg-blue-50/50' : isOnHold ? 'bg-amber-50/20' : ''
                        }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm ${isCurrent
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOnHold
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                          }`}>
                          #{tok.tokenNo}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-800">{tok.patientName}</span>
                          {tok.isExisting && (
                            <span className="text-[9px] font-black text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded">
                              ★ Existing
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{tok.patientAgeDisplay || `${tok.patientAge}y`}, {tok.patientGender}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Phone size={10} /> {tok.patientPhone}</span>
                          {(tok.patientAddress || (tok as any).address || (tok as any).place) && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-slate-500 font-semibold">
                                <MapPin size={10} className="text-blue-500" /> {tok.patientAddress || (tok as any).address || (tok as any).place}
                              </span>
                            </>
                          )}
                        </div>
                        {((tok.doctorReference && tok.doctorReference.name) || (tok.rmpReference && tok.rmpReference.name)) && (
                          <div className="text-[9.5px] font-bold text-indigo-700 mt-0.5">
                            Doctor Ref: Dr. {tok.doctorReference?.name || tok.rmpReference?.name} {tok.doctorReference?.phone || tok.rmpReference?.phone ? `(${tok.doctorReference?.phone || tok.rmpReference?.phone})` : ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${(tok.session || '').toLowerCase().includes('morn')
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : (tok.session || '').toLowerCase().includes('even')
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                            {(tok.session || '').toLowerCase().includes('morn') ? '🌅 ' : (tok.session || '').toLowerCase().includes('even') ? '🌙 ' : '☀️ '}
                            {tok.session ? tok.session.toUpperCase() : 'MORNING'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-medium mt-0.5">{tok.time} · {tok.bookingDate}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {tok.type === 'online' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            <Wifi size={10} /> Online (App/Web)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <WifiOff size={10} /> Offline (Reception)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800">₹{tok.consultationFee}</div>
                        <button
                          type="button"
                          onClick={() => setPaymentTargetToken(tok)}
                          className="mt-0.5 inline-flex items-center gap-1 cursor-pointer border-none bg-transparent p-0 text-left group"
                          title="Click to record or update payment status / method"
                        >
                          <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 transition-all group-hover:scale-102 ${tok.paymentStatus === 'paid'
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : isNotVisited
                                ? 'text-amber-700 bg-amber-50 border border-amber-200'
                                : 'text-amber-700 bg-amber-50 border border-amber-300 font-extrabold shadow-2xs'
                            }`}>
                            {tok.paymentStatus === 'paid' ? (
                              <>
                                <CheckCircle size={9} />
                                <span>Paid {tok.paymentMethod ? `· ${tok.paymentMethod.replace(/\s*\(.*\)/, '')}` : ''}</span>
                              </>
                            ) : (
                              <>
                                <Wallet size={9} />
                                <span>{isNotVisited ? 'Uncollected' : 'Pending · Collect'}</span>
                              </>
                            )}
                          </span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${tok.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : (tok.status === 'checked-in' || tok.status === 'in-consultation')
                              ? 'bg-blue-600 text-white shadow-xs animate-pulse'
                              : tok.status === 'calling'
                                ? 'bg-amber-500 text-white animate-bounce'
                                : tok.status === 'late-coming'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : isNotVisited
                                    ? 'bg-amber-100 text-amber-700'
                                    : tok.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-blue-50 text-blue-700'
                          }`}>
                          {tok.status === 'checked-in' || tok.status === 'in-consultation'
                            ? '🩺 In Cabin'
                            : tok.status === 'calling'
                              ? '🔊 Calling'
                              : tok.status === 'completed'
                                ? '✓ Visited'
                                : tok.status === 'late-coming'
                                  ? '⏸️ On-Hold / Late'
                                  : isNotVisited
                                    ? 'Not Visited'
                                    : tok.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {['booked', 'waiting', 'arrived'].includes(tok.status) && (
                            <button
                              onClick={() => handleCallPatient(tok.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1 transition-transform active:scale-95"
                              title="Ring chime and send live calling alert to patient mobile"
                            >
                              <Volume2 size={11} /> Call Patient
                            </button>
                          )}

                          {tok.status === 'calling' && (
                            <>
                              <button
                                onClick={() => handleAdmitCabin(tok.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1 transition-transform active:scale-95 animate-pulse"
                                title="Patient arrived at door - admit into cabin"
                              >
                                <Play size={11} /> In Cabin
                              </button>
                              <button
                                onClick={() => handleRecallToken(tok.id)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1 transition-colors"
                                title="Ring patient alert chime again"
                              >
                                <Volume2 size={11} /> Re-Call
                              </button>
                            </>
                          )}

                          {(tok.status === 'checked-in' || tok.status === 'in-consultation') && (
                            <>
                              <button
                                onClick={() => handleRecallToken(tok.id)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1 transition-colors"
                                title="Ring patient alert chime again"
                              >
                                <Volume2 size={11} /> Re-Call
                              </button>
                              <button
                                onClick={() => handleCompleteToken(tok.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1 transition-colors"
                                title="Complete consultation (adds to revenue)"
                              >
                                <CheckCircle size={11} /> Visited
                              </button>
                            </>
                          )}

                          {['booked', 'waiting', 'checked-in', 'calling', 'in-consultation', 'arrived'].includes(tok.status) && (
                            <>
                              <button
                                onClick={() => handlePutOnHold(tok.id)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                                title="Put token on hold for this session"
                              >
                                <Clock size={11} /> Hold
                              </button>
                              <button
                                onClick={() => handleMarkUnvisitedSingle(tok.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                                title="Mark patient as unvisited and move to Unvisited Directory"
                              >
                                <UserX size={11} /> Unvisit
                              </button>
                            </>
                          )}

                          {['late-coming', 'skipped'].includes(tok.status) && (
                            <>
                              <button
                                onClick={() => handleAdmitCabin(tok.id)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1 transition-transform active:scale-95"
                                title="Patient arrived - admit directly into cabin"
                              >
                                <Play size={11} /> Admit Cabin
                              </button>
                              <button
                                onClick={() => handleRecallToken(tok.id)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1 transition-colors"
                                title="Call patient again"
                              >
                                <Volume2 size={11} /> Call
                              </button>
                              <button
                                onClick={() => handleMarkUnvisitedSingle(tok.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                                title="Mark patient as unvisited and move to Unvisited Directory"
                              >
                                <UserX size={11} /> Unvisit
                              </button>
                            </>
                          )}

                          {/* Option to shift to another session with Option 1 availability check */}
                          {!isCompleted && otherSessions.map(os => (
                            <button
                              key={os.id}
                              onClick={() => handleShiftSession(tok, os.name)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                              title={`Shift to ${os.name} Session (${os.startTime} - ${os.endTime})`}
                            >
                              <Clock size={11} /> Shift {os.name}
                            </button>
                          ))}

                          <button
                            onClick={() => setPrintToken(tok)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Print Token Slip"
                          >
                            <Printer size={13} />
                          </button>

                          <button
                            onClick={() => setViewToken(tok)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="View Details"
                          >
                            <Eye size={13} />
                          </button>

                          {['booked', 'waiting'].includes(tok.status) && (
                            <button
                              onClick={() => handleCancelToken(tok.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              title="Cancel Token"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Token Detail Modal ────────────────────────────────────────────── */}
      {viewToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">Token #{viewToken.tokenNo}</h3>
                <span className="text-[10px] text-slate-400 font-semibold">{viewToken.id}</span>
              </div>
              <button
                onClick={() => setViewToken(null)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Patient Name:</span>
                <strong className="text-slate-800 font-black">{viewToken.patientName}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Age & Gender:</span>
                <strong className="text-slate-800">{viewToken.patientAge} Years · {viewToken.patientGender}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Mobile Phone:</span>
                <strong className="text-slate-800">{viewToken.patientPhone}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Place / Address:</span>
                <strong className="text-slate-800">{viewToken.patientAddress || (viewToken as any).address || (viewToken as any).place || 'Not provided'}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Doctor:</span>
                <strong className="text-blue-600">{viewToken.doctorName}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">OPD Session:</span>
                <strong className="text-slate-800 uppercase">{viewToken.session} ({viewToken.time})</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Consultation Fee:</span>
                <strong className="text-emerald-600 font-black">₹{viewToken.consultationFee} ({viewToken.paymentStatus})</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <span className="text-slate-400 font-bold">Current Status:</span>
                <strong className="text-blue-600 uppercase font-black">{viewToken.status}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewToken(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const t = viewToken;
                  setViewToken(null);
                  setPrintToken(t);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1.5"
              >
                <Printer size={13} /> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Slip Modal ──────────────────────────────────────────────── */}
      {printToken && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Print OPD Token Receipt</h3>
              <button
                onClick={() => setPrintToken(null)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Thermal Print Slip Preview */}
            <div id="print-token-receipt" className="border border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50 text-center space-y-3">
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider">{hospitalProfile?.name}</div>
              <div className="text-[10px] text-slate-500">{hospitalProfile?.address}</div>

              <div className="py-2 border-y border-dashed border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">TOKEN NUMBER</span>
                <span className="text-5xl font-black text-slate-900 tracking-tight">#{printToken.tokenNo}</span>
              </div>

              <div className="text-left text-xs space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-extrabold text-slate-800">{printToken.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Age / Gender:</span>
                  <span className="font-semibold text-slate-700">{printToken.patientAge} Yrs / {printToken.patientGender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Doctor:</span>
                  <span className="font-extrabold text-blue-600">{printToken.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Session:</span>
                  <span className="font-semibold text-slate-700 capitalize">{printToken.session} OPD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fee:</span>
                  <span className="font-black text-emerald-600">₹{printToken.consultationFee} ({printToken.paymentStatus})</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
                Please present this token at the doctor's cabin when called.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintToken(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-xs flex items-center gap-1.5"
              >
                <Printer size={13} /> Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Mark Visited Safeguard Modal ───────────────────────── */}
      {confirmVisitToken && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Confirm Patient Visit</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Verify consultation status before updating records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmVisitToken(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer border-none text-slate-400 hover:text-slate-600 font-bold transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Token & Patient Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Token Number:</span>
                <span className="font-black text-lg text-slate-900">#{confirmVisitToken.tokenNo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Patient Name:</span>
                <span className="font-extrabold text-slate-800">{confirmVisitToken.patientName || 'Patient'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Doctor:</span>
                <span className="font-extrabold text-blue-600">{confirmVisitToken.doctorName || doctor?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Session:</span>
                <span className="font-semibold text-slate-700 capitalize">{confirmVisitToken.session || 'Morning'} OPD</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Consultation Fee:</span>
                <span className="font-black text-emerald-600">
                  ₹{confirmVisitToken.consultationFee || (confirmVisitToken as any).fee || doctor?.consultationFee || 400} ({confirmVisitToken.paymentStatus === 'paid' ? `Paid • ${confirmVisitToken.paymentMethod || 'Online'}` : 'Pending Pay-at-Hospital'})
                </span>
              </div>
            </div>

            {/* Warning if on Hold / Absent vs Normal */}
            {['not-visited', 'skipped', 'late-coming', 'hold', 'late'].includes(confirmVisitToken.status) ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                  <strong className="block text-amber-900 font-black">Warning: Patient is currently marked Absent / On-Hold!</strong>
                  Are you sure you want to mark this patient as <strong>Visited</strong> directly? If they did not attend the doctor consultation, click <strong>Cancel</strong> to preserve their token for future re-admission.
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5">
                <CheckCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-800 leading-relaxed font-semibold">
                  Are you sure you want to complete the visit for <strong>{confirmVisitToken.patientName || `Token #${confirmVisitToken.tokenNo}`}</strong>? This will record the consultation as completed and realize the earned revenue.
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmVisitToken(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVisitExecution}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer border-none shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <CheckCircle2 size={13} /> OK, Mark Visited
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Consultation Fee Payment Modals ── */}
      {visitingToken && (
        <TokenPaymentModal
          isOpen={Boolean(visitingToken)}
          token={visitingToken}
          title="Collect Consultation Fee"
          subtitle="Patient consultation done. Record payment collected at hospital:"
          confirmButtonText="Confirm & Mark Visited"
          onClose={() => setVisitingToken(null)}
          onSave={(status, method) => {
            updateTokenStatus(visitingToken.id, 'completed', { paymentStatus: status, paymentMethod: method });
            setVisitingToken(null);
          }}
        />
      )}

      {paymentTargetToken && (
        <TokenPaymentModal
          isOpen={Boolean(paymentTargetToken)}
          token={paymentTargetToken}
          title="Update Consultation Fee Payment"
          subtitle="Update payment status or payment method:"
          confirmButtonText="Save & Update Payment"
          onClose={() => setPaymentTargetToken(null)}
          onSave={(status, method) => {
            updateTokenPayment(paymentTargetToken.id, status, method);
            setPaymentTargetToken(null);
          }}
        />
      )}
    </div>
  );
};
