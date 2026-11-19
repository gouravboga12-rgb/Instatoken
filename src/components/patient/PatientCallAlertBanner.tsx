import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Bell, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { subscribeGlobalSync } from '../../utils/syncBus';
import io, { Socket } from 'socket.io-client';

interface CallAlertPayload {
  tokenId: string;
  tokenNo: number | string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  hospitalName: string;
  departmentName?: string;
  session?: string;
  calledAt: string;
  message?: string;
}

export const PatientCallAlertBanner: React.FC = () => {
  const { user } = useApp();
  const [activeCall, setActiveCall] = useState<CallAlertPayload | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const audioIntervalRef = useRef<any>(null);

  // Play pleasant, high-clarity calling chime using Web Audio API
  const playAlertChime = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Pleasant 4-tone chime: E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz) -> E6 (1318Hz)
      const notes = [659.25, 830.61, 987.77, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + (idx * 0.18);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.55);
      });
    } catch (e) {
      console.warn('Audio chime play error:', e);
    }

    // Voice announcement for mobile accessibility
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const docClean = (activeCall?.doctorName || 'Doctor').replace(/^Dr\.?\s*/i, '');
        const msg = new SpeechSynthesisUtterance(`Token ${activeCall?.tokenNo || ''}, Dr. ${docClean} is calling.`);
        msg.rate = 1.0;
        window.speechSynthesis.speak(msg);
      }
    } catch (e) {}
  };

  const triggerAlertSequence = (payload: CallAlertPayload) => {
    setActiveCall(payload);
    setIsMuted(false);

    // Initial chime
    playAlertChime();

    // Haptic vibration on mobile devices
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([350, 150, 350, 150, 450]);
      }
    } catch (e) { }

    // Repeat chime every 2.8s up to 4 times (11 seconds total)
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    let chimeCount = 0;
    audioIntervalRef.current = setInterval(() => {
      chimeCount++;
      if (chimeCount >= 4) {
        if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      } else {
        playAlertChime();
      }
    }, 2800);
  };

  const handleDismiss = () => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    setActiveCall(null);
  };

  // Unlock mobile browser Web Audio on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const dummy = new AudioCtx();
          if (dummy.state === 'suspended') {
            dummy.resume().then(() => dummy.close()).catch(() => {});
          }
        }
      } catch (e) {}
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    // Determine relevant phone numbers for current patient
    const userPhoneClean = (user?.phone || '').replace(/\D/g, '').slice(-10);
    
    // Also read any saved appointment phone numbers
    let savedApptPhones: string[] = [];
    try {
      const raw = localStorage.getItem('insta_appointments');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          savedApptPhones = parsed.map((a: any) => String(a.phone || a.patientPhone || '').replace(/\D/g, '').slice(-10)).filter(Boolean);
        }
      }
    } catch (e) { }

    const isTargetPatient = (payload: CallAlertPayload) => {
      if (!payload) return false;
      const targetPhone = String(payload.patientPhone || '').replace(/\D/g, '').slice(-10);
      
      let storedUserPhone = userPhoneClean;
      try {
        const rawU = localStorage.getItem('insta_user');
        if (rawU) {
          const u = JSON.parse(rawU);
          storedUserPhone = String(u.phone || '').replace(/\D/g, '').slice(-10);
        }
      } catch (e) {}

      if (storedUserPhone && targetPhone && storedUserPhone === targetPhone) return true;
      if (savedApptPhones.includes(targetPhone)) return true;
      
      // Also check if any stored appointment matches the tokenId
      try {
        const raw = localStorage.getItem('insta_appointments');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.some((a: any) => a.id === payload.tokenId || (a.hospitalId === payload.hospitalId && Number(a.tokenNumber) === Number(payload.tokenNo)))) {
            return true;
          }
        }
      } catch (e) { }

      // If no specific user logged in, allow queue alert for guest / test sessions
      if (!storedUserPhone) return true;

      return false;
    };

    // 1. Cross-tab & local sync listener
    const unsubscribeSync = subscribeGlobalSync((event) => {
      if (event.type === 'TOKEN_CALLED' && event.data) {
        const payload = event.data as CallAlertPayload;
        if (isTargetPatient(payload)) {
          triggerAlertSequence(payload);
        }
      }
    });

    // 2. Real-time Socket.io listener
    let socket: Socket | null = null;
    try {
      const socketBackendUrl =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5000'
          : 'https://16.113.86.236.nip.io';

      socket = io(socketBackendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15
      });

      socket.on('connect', () => {
        if (userPhoneClean) {
          socket?.emit('join_patient', { phone: userPhoneClean });
        }
        savedApptPhones.forEach(phone => {
          if (phone && phone !== userPhoneClean) {
            socket?.emit('join_patient', { phone });
          }
        });
      });

      socket.on('token_called', (payload: CallAlertPayload) => {
        if (isTargetPatient(payload)) {
          triggerAlertSequence(payload);
        }
      });
    } catch (err) {
      console.warn('Socket connection error in PatientCallAlertBanner:', err);
    }

    return () => {
      unsubscribeSync();
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (socket) socket.disconnect();
    };
  }, [user?.phone]);

  if (!activeCall) return null;

  return (
    <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl shadow-2xl p-4 sm:p-5 border-2 border-amber-400 ring-4 ring-blue-500/20 backdrop-blur-md relative overflow-hidden">
        {/* Glow pulse background indicator */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-400/20 rounded-full blur-xl pointer-events-none animate-pulse" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-black shadow-lg animate-bounce">
                <Bell size={22} className="animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  🔔 It's Your Turn!
                </span>
                <span className="text-[10px] font-bold text-blue-200">
                  Token #{activeCall.tokenNo}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-white mt-0.5 leading-snug">
                Dr. {(activeCall.doctorName || 'Doctor').replace(/^Dr\.?\s*/i, '')}
              </h4>
              <p className="text-xs text-blue-100 font-medium line-clamp-1">
                {activeCall.hospitalName} {activeCall.departmentName ? `• ${activeCall.departmentName}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Dismiss alert"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Card */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
          <p className="text-blue-100 font-medium">
            Doctor is ready in cabin. Please proceed inside immediately!
          </p>
        </div>

        {/* Action Controls */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-3.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-white/20"
          >
            <span>Dismiss Alert</span>
          </button>
          
          <button
            onClick={() => {
              if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
              setIsMuted(prev => !prev);
            }}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer border-none"
            title={isMuted ? "Unmute alert" : "Mute audio chime"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
