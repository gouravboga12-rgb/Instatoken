import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Calendar, Users, Eye, CreditCard, ChevronRight, ShieldCheck, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'splash' | 'slides'>('splash');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (step === 'splash') {
      const timer = setTimeout(() => {
        setStep('slides');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const slides = [
    {
      title: "Book Hospital OPD Tokens",
      description: "Find hospitals near you and book digital OPD tokens instantly. Secure your spot in the doctor's queue from home.",
      icon: <Calendar size={48} className="text-blue-600" />,
      bg: "bg-blue-50/50"
    },
    {
      title: "Skip Waiting Lines",
      description: "No more standing in long registers. Receive a unique token number and arrive just in time for your consultation.",
      icon: <Users size={48} className="text-emerald-600" />,
      bg: "bg-emerald-50/50"
    },
    {
      title: "Track Live Queue",
      description: "Monitor live waiting queues in real-time. See current running tokens and estimate your exact appointment entry time.",
      icon: <Eye size={48} className="text-sky-600" />,
      bg: "bg-sky-50/50"
    },
    {
      title: "Fast OPD Checkout",
      description: "Pay nominal platform fees online and pay doctor consultation fees at the hospital cabin.",
      icon: <CreditCard size={48} className="text-indigo-600" />,
      bg: "bg-indigo-50/50"
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  if (step === 'splash') {
    return (
      <div 
        onClick={() => setStep('slides')}
        className="fixed inset-0 bg-gradient-to-b from-[#0055FE] via-[#004CF6] to-[#0038CE] flex flex-col justify-between items-center text-white z-50 overflow-hidden cursor-pointer select-none"
      >
        {/* Top Mobile Status Header Mock */}
        <div className="md:hidden w-full px-6 pt-3 flex justify-between items-center text-xs font-semibold text-white/90">
          <span>10:47</span>
          <div className="flex items-center gap-1 text-[10px]">
            <span>VoLTE</span>
            <span className="font-bold">5G</span>
            <span className="border border-white px-1 rounded text-[9px] font-bold">48</span>
          </div>
        </div>

        {/* Center Logo & Subtitle (Matching Image 1) */}
        <div className="flex flex-col items-center justify-center my-auto text-center px-4">
          <div className="flex items-center gap-1 text-4xl md:text-5xl font-black font-heading tracking-tight drop-shadow-md">
            <span>InstaT</span>
            <span className="relative inline-flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full border-2 border-white text-white font-extrabold text-2xl mx-[-2px]">
              <Check size={24} className="stroke-[3.5] text-white" />
            </span>
            <span>ken</span>
          </div>

          {/* Light Glow Line Divider */}
          <div className="w-48 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent my-4 shadow-[0_0_12px_#38bdf8]" />

          <p className="text-lg md:text-xl font-bold tracking-wide text-white/95 max-w-xs leading-snug">
            Book Your Hospital Token<br />in Minutes
          </p>
        </div>

        {/* Bottom Hospital & Shield Vector Illustration (Matching Image 1) */}
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
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white flex flex-col justify-between p-6 w-full max-w-md md:max-w-xl h-full max-h-[640px] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
      <div className="flex justify-end pt-2">
        <button 
          onClick={onComplete}
          className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-4">
        {/* Animated Icon Circle */}
        <div className={`p-8 rounded-full ${slides[currentSlide].bg} mb-8 transform transition-transform duration-300 scale-110 shadow-sm border border-white`}>
          {slides[currentSlide].icon}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-slate-800 text-center tracking-tight leading-tight mb-4 min-h-[64px]">
          {slides[currentSlide].title}
        </h2>

        {/* Description */}
        <p className="text-slate-500 text-center text-sm leading-relaxed max-w-xs min-h-[80px]">
          {slides[currentSlide].description}
        </p>

        {/* Progress Indicators */}
        <div className="flex gap-2 mt-8">
          {slides.map((_, idx) => (
            <div 
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      <div className="pb-6">
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth 
          onClick={handleNext}
          className="flex items-center justify-center gap-2 py-3 text-sm font-bold cursor-pointer"
        >
          {currentSlide === slides.length - 1 ? "Get Started" : "Continue"}
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
    </div>
  );
};
