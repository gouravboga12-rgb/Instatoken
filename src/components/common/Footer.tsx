import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, Mail, ShieldCheck, 
  CheckCircle2, FileText, Lock, RefreshCw, Headphones
} from 'lucide-react';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-16 border-t border-slate-800">
      {/* Main Footer Links */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-14 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
        
        {/* Brand & Slogan Column */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" className="h-10 rounded-xl object-contain shadow-md" alt="InstaToken Logo" />
            <span className="text-[10px] text-slate-400 font-bold">Book Your Hospital Token in Seconds</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            InstaToken is India's leading digital OPD token management platform. We connect patients directly with verified hospitals and doctors, enabling queue tracking in real-time from anywhere.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
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

        {/* Quick Navigation Column */}
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
                Alerts &amp; Updates
              </button>
            </li>
          </ul>
        </div>

        {/* Legal & Razorpay Policy Links Column */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Legal &amp; Policies</h4>
          <ul className="space-y-2.5 text-xs font-semibold text-slate-400">
            <li>
              <button 
                onClick={() => navigate('/terms')} 
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FileText size={13} className="text-blue-400" />
                <span>Terms &amp; Conditions</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/privacy')} 
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Lock size={13} className="text-emerald-400" />
                <span>Privacy Policy</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/refund-policy')} 
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={13} className="text-indigo-400" />
                <span>Cancellation &amp; Refund Policy</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/contact')} 
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Headphones size={13} className="text-amber-400" />
                <span>Contact Us &amp; Support</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Contact & Helpline Column */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">24/7 Patient Support</h4>
          
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-200 font-extrabold">
              <Phone size={16} className="text-emerald-400 shrink-0" />
              <a href="tel:+918046688888" className="hover:underline">+91 80 4668 8888</a>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-400 font-semibold">
              <Mail size={16} className="text-blue-400 shrink-0" />
              <a href="mailto:token.in1999@gmail.com" className="hover:underline">token.in1999@gmail.com</a>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            Need hospital assistance or help booking your OPD token pass? Our desk is active 24×7.
          </p>
        </div>

      </div>

      {/* Bottom Copyright Strip */}
      <div className="border-t border-slate-800/80 py-6 px-6 md:px-10 text-xs text-slate-500">
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
            <p>© 2026 InstaToken Healthcare Solutions Inc. All rights reserved.</p>
            <span className="hidden md:inline text-slate-700">|</span>
            <button onClick={() => navigate('/terms')} className="hover:text-slate-300 transition-colors">Terms</button>
            <span>•</span>
            <button onClick={() => navigate('/privacy')} className="hover:text-slate-300 transition-colors">Privacy</button>
            <span>•</span>
            <button onClick={() => navigate('/refund-policy')} className="hover:text-slate-300 transition-colors">Refunds</button>
            <span>•</span>
            <button onClick={() => navigate('/contact')} className="hover:text-slate-300 transition-colors">Contact</button>
          </div>
          <a
            href="https://www.codtechitsolutions.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Developed by{' '}
            <span className="text-blue-400 font-bold hover:text-blue-300 transition-colors">
              CODTECH IT SOLUTIONS
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
};
