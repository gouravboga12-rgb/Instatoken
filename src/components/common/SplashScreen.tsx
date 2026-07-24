import React, { useState, useEffect } from 'react';

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
      className={`fixed inset-0 bg-[#0257f2] flex items-center justify-center text-white z-50 overflow-hidden cursor-pointer select-none transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <img 
        src="/splash.png" 
        alt="InstaToken Splash Screen" 
        className="w-full h-full object-contain max-h-screen p-2 md:p-6 mx-auto"
      />
    </div>
  );
};
