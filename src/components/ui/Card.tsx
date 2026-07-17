import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  glass = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = "rounded-2xl border border-slate-100/80 bg-white transition-all duration-300";
  
  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6"
  };

  const hoverStyle = hoverable 
    ? "hover:shadow-xl hover:shadow-slate-100 hover:border-blue-100/50 cursor-pointer hover:-translate-y-[2px]" 
    : "shadow-sm shadow-slate-100";

  const glassStyle = glass ? "glass-effect" : "";

  return (
    <div
      className={`${baseStyle} ${paddings[padding]} ${hoverStyle} ${glassStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
