import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Phone, Mail, ShieldCheck, 
  CheckCircle2 
} from 'lucide-react';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="hidden md:block bg-slate-900 text-slate-300 mt-16 border-t border-slate-800">
      {/* Main Footer Links */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* Brand & Slogan Column */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" className="h-10 rounded-xl object-contain shadow-md" alt="InstaToken Logo" />
            <span className="text-[10px] text-slate-400 font-bold">Book Your Hospital Token in Seconds</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            InstaToken is India's leading digital OPD token management platform. We connect patients directly with hospitals and doctors, enabling queue tracking in real-time from anywhere.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-xl">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>ISO 27001 Certified</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-xl">
              <CheckCircle2 size={14} className="text-blue-400" />
              <span>256-bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="md:col-span-2 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Quick Navigation</h4>
          <ul className="space-y-2 text-xs font-semibold text-slate-400">
            <li>
              <button onClick={() => navigate('/')} className="hover:text-white transition-colors cursor-pointer">
                Home
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/search')} className="hover:text-white transition-colors cursor-pointer">
                Find Hospitals
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/bookings')} className="hover:text-white transition-colors cursor-pointer">
                My OPD Tokens
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/notifications')} className="hover:text-white transition-colors cursor-pointer">
                Alerts & Updates
              </button>
            </li>
          </ul>
        </div>

        {/* Popular Cities Column */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Popular Cities</h4>
          <ul className="space-y-2 text-xs font-semibold text-slate-400">
            <li className="flex items-center gap-1.5">
              <MapPin size={12} className="text-blue-400" />
              <span>Gachibowli, Hyderabad</span>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin size={12} className="text-blue-400" />
              <span>Vijayawada, Andhra Pradesh</span>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin size={12} className="text-blue-400" />
              <span>Koramangala, Bengaluru</span>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin size={12} className="text-blue-400" />
              <span>Ram Nagar, Visakhapatnam</span>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin size={12} className="text-blue-400" />
              <span>Indiranagar, Bengaluru</span>
            </li>
          </ul>
        </div>

        {/* Contact & Helpline Column */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">24/7 Patient Support</h4>
          
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-200 font-extrabold">
              <Phone size={16} className="text-emerald-400 shrink-0" />
              <span>1800-INSTA-TOKEN</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-400 font-semibold">
              <Mail size={16} className="text-blue-400 shrink-0" />
              <span>token.in1999@gmail.com</span>
            </div>

          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            Need emergency doctor assistance or assistance booking your token pass? Call our support desk anytime.
          </p>
        </div>

      </div>

      {/* Bottom Copyright Strip */}
      <div className="border-t border-slate-800/80 py-6 px-6 md:px-10 text-xs text-slate-500 text-center md:text-left">
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 InstaToken Healthcare Solutions Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
