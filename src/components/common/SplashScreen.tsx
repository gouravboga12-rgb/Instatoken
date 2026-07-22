import React, { useState, useEffect } from 'react';
import { Calendar, ShieldCheck, Check } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, duration = 2500 }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        onFinish();
      }, 400); // 400ms fade transition
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onFinish]);

  const handleDismiss = () => {
    setFading(true);
    setTimeout(() => {
      onFinish();
    }, 300);
  };

  return (
    <div 
      onClick={handleDismiss}
      className={`fixed inset-0 bg-[#2563EB] flex flex-col justify-between items-center text-white z-50 overflow-hidden cursor-pointer select-none transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Center Logo & Subtitle (Matching reference splash image) */}
      <div className="flex flex-col items-center justify-center my-auto text-center px-4 animate-in fade-in zoom-in-95 duration-500">
        <img 
          src="/logo.png" 
          alt="InstaToken" 
          className="w-48 md:w-56 h-auto object-contain drop-shadow-xl mb-4"
        />

        {/* Light Glow Line Divider */}
        <div className="w-48 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent my-4 shadow-[0_0_12px_#38bdf8]" />

        <p className="text-lg md:text-xl font-bold tracking-wide text-white/95 max-w-xs leading-snug">
          Book Your Hospital Token<br />in Minutes
        </p>
      </div>

      {/* Bottom Hospital & Shield Vector Illustration (Matching reference image) */}
      <div className="relative w-full max-w-md h-64 flex items-end justify-center pb-2">
        
        {/* Subtle Wave Lines SVG background */}
        <svg className="absolute inset-0 w-full h-full text-white/10" viewBox="0 0 400 250" fill="none">
          <path d="M0,180 C150,220 250,140 400,200 L400,250 L0,250 Z" fill="currentColor" opacity="0.3" />
          <path d="M0,200 C120,160 280,240 400,180 L400,250 L0,250 Z" fill="currentColor" opacity="0.5" />
        </svg>

        {/* Floating plus icons */}
        <div className="absolute top-4 left-12 text-white/20 font-black text-2xl animate-pulse">+</div>
        <div className="absolute top-12 left-20 text-white/30 font-black text-xl">+</div>
        <div className="absolute top-8 right-16 text-white/30 font-black text-3xl animate-pulse">+</div>
        <div className="absolute top-24 right-8 text-white/20 font-black text-lg">+</div>

        {/* Vector Graphics Row */}
        <div className="relative z-10 flex items-end justify-center gap-4 px-6 mb-4">
          
          {/* Calendar Check Card */}
          <div className="w-14 h-14 bg-blue-500/40 backdrop-blur-sm border border-white/20 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg transform -rotate-6">
            <Calendar size={22} className="text-white mb-1" />
            <div className="w-4 h-4 bg-white/30 rounded-full flex items-center justify-center">
              <Check size={10} className="text-white stroke-[3]" />
            </div>
          </div>

          {/* Hospital Building Illustration */}
          <div className="w-28 h-36 bg-blue-500/50 backdrop-blur-md border border-white/30 rounded-t-3xl p-3 flex flex-col items-center justify-between shadow-2xl relative">
            <div className="w-10 h-10 bg-blue-600 rounded-xl border border-white/40 flex items-center justify-center text-white shadow-inner -mt-5">
              <span className="font-extrabold text-xl">+</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full px-1 my-2">
              <div className="h-4 bg-white/30 rounded-sm" />
              <div className="h-4 bg-white/30 rounded-sm" />
              <div className="h-4 bg-white/30 rounded-sm" />
              <div className="h-4 bg-white/30 rounded-sm" />
            </div>
            <div className="w-7 h-10 bg-blue-900/60 rounded-t-lg border-t border-x border-white/30" />
          </div>

          {/* Shield Check Card */}
          <div className="w-16 h-16 bg-blue-500/40 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center text-white shadow-lg transform rotate-6">
            <ShieldCheck size={36} className="text-white" />
          </div>

        </div>

      </div>

    </div>
  );
};
