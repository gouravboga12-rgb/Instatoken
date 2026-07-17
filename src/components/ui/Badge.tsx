import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'sky' | 'green' | 'orange' | 'red' | 'slate';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  className = ''
}) => {
  const baseStyle = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium tracking-wide transition-colors duration-200";
  
  const variants = {
    blue: "bg-blue-50 text-blue-700 border border-blue-100",
    sky: "bg-sky-50 text-sky-700 border border-sky-100",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    orange: "bg-orange-50 text-orange-700 border border-orange-100",
    red: "bg-red-50 text-red-700 border border-red-100",
    slate: "bg-slate-50 text-slate-600 border border-slate-100"
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
