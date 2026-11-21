import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Bell, X } from 'lucide-react';
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
  const playAlertChime = (payload?: CallAlertPayload) => {
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
        const callTarget = payload || activeCall;
        const tokNo = callTarget?.tokenNo || '';
        const docClean = (callTarget?.doctorName || 'Doctor').replace(/^Dr\.?\s*/i, '');
        const msg = new SpeechSynthesisUtterance(`Token ${tokNo}, Doctor ${docClean} is calling.`);
        msg.rate = 0.95;
        msg.lang = 'en-IN';
        window.speechSynthesis.speak(msg);
      }
    } catch (e) {}
  };

  const getDismissKey = (payload: CallAlertPayload) => `dismissed_call_${payload.tokenId}_${payload.calledAt || 'active'}`;

  const triggerAlertSequence = (payload: CallAlertPayload) => {
    // Check if user already dismissed this specific call event
    try {
      if (
        localStorage.getItem(getDismissKey(payload)) === 'true' ||
        localStorage.getItem(`dismissed_call_${payload.tokenId}`) === 'true'
      ) {
        return;
      }
    } catch (e) {}

    setActiveCall(payload);
    setIsMuted(false);

    // Initial chime
    playAlertChime(payload);

    // Bridge to native Android/iOS app via WebView
    try {
      (window as any).ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'TOKEN_CALLED',
        payload
      }));
    } catch (e) {}

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
    if (activeCall) {
      try {
        localStorage.setItem(getDismissKey(activeCall), 'true');
        localStorage.setItem(`dismissed_call_${activeCall.tokenId}`, 'true');
      } catch (e) {}
    }
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
    // 1. Determine active logged-in patient's phone number
    let myPhone = (user?.phone || '').replace(/\D/g, '').slice(-10);
    if (!myPhone) {
      try {
        const rawU = localStorage.getItem('insta_user');
        if (rawU) {
          const u = JSON.parse(rawU);
          myPhone = String(u.phone || '').replace(/\D/g, '').slice(-10);
        }
      } catch (e) {}
    }

    // Register push notification token with native mobile app
    if (myPhone && (window as any).ReactNativeWebView) {
      try {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'REGISTER_PUSH',
          phone: myPhone
        }));
      } catch (e) {}
    }

    const isTargetPatient = (payload: CallAlertPayload) => {
      if (!payload) return false;
      const targetPhone = String(payload.patientPhone || '').replace(/\D/g, '').slice(-10);
      if (!targetPhone) return false;
      
      // Strict 1-to-1 matching: If patient is logged in, alert ONLY if targetPhone === myPhone
      if (myPhone) {
        return targetPhone === myPhone;
      }

      // Guest fallback: only alert if the guest session holds this exact tokenId
      try {
        const activePass = sessionStorage.getItem('insta_guest_token_id') || localStorage.getItem('insta_guest_token_id');
        if (activePass && activePass === payload.tokenId) {
          return true;
        }
      } catch (e) {}

      return false;
    };

    // 1. Cross-tab & local sync listener (strictly filtered by isTargetPatient)
    const unsubscribeSync = subscribeGlobalSync((event) => {
      if (event.type === 'TOKEN_CALLED' && event.data) {
        const payload = event.data as CallAlertPayload;
        if (isTargetPatient(payload)) {
          triggerAlertSequence(payload);
        }
      }
    });

    // 2. Real-time Socket.io listener (joins ONLY this patient's personal room)
    let socket: Socket | null = null;
    try {
      const socketBackendUrl =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5000'
          : (window.location.origin || 'https://instatoken.in');

      socket = io(socketBackendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15
      });

      socket.on('connect', () => {
        if (myPhone) {
          socket?.emit('join_patient', { phone: myPhone });
        }
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
    <div className="fixed top-2 sm:top-5 left-2 right-2 sm:left-auto sm:right-6 sm:max-w-md z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl shadow-2xl p-3.5 sm:p-4 border-2 border-amber-400 ring-4 ring-blue-500/20 backdrop-blur-md relative overflow-hidden">
        {/* Glow pulse background indicator */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-400/20 rounded-full blur-xl pointer-events-none animate-pulse" />

        <div className="flex items-start justify-between gap-2.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-black shadow-lg animate-bounce">
                <Bell size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  🔔 It's Your Turn!
                </span>
                <span className="text-[10px] font-extrabold text-blue-200">
                  Token #{activeCall.tokenNo}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-white mt-0.5 leading-tight">
                Dr. {(activeCall.doctorName || 'Doctor').replace(/^Dr\.?\s*/i, '')}
              </h4>
              <p className="text-[11px] text-blue-100 font-medium line-clamp-1">
                {activeCall.hospitalName} {activeCall.departmentName ? `• ${activeCall.departmentName}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title="Dismiss alert"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Card */}
        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
          <p className="text-blue-100 font-medium text-[11px] leading-tight">
            Doctor is ready in cabin. Please proceed inside immediately!
          </p>
        </div>

        {/* Action Controls */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-1.5 px-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-white/25 active:scale-98"
          >
            <span>Dismiss Alert</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsMuted(false);
              playAlertChime();
            }}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors cursor-pointer border border-white/25 flex items-center gap-1.5 text-xs font-bold active:scale-98"
            title="Play calling chime & voice announcement"
          >
            <Volume2 size={15} />
            <span>Play Sound</span>
          </button>
        </div>
      </div>
    </div>
  );
};
