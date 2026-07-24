import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Calendar, Users, Eye, CreditCard, ChevronRight } from 'lucide-react';

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
        className="fixed inset-0 bg-[#0257f2] flex items-center justify-center text-white z-50 overflow-hidden cursor-pointer select-none"
      >
        <img 
          src="/splash.png" 
          alt="InstaToken Splash Screen" 
          className="w-full h-full object-contain max-h-screen p-2 md:p-6 mx-auto"
        />
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
