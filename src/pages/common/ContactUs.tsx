import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Clock, ShieldCheck, Headphones } from 'lucide-react';

export const ContactUs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 p-6 sm:p-10 text-white relative">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer mb-4 backdrop-blur-xs"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Contact Us</h1>
              <p className="text-xs text-blue-100 mt-1">We're here to assist you 24×7 • InstaToken Support</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Phone Support */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Phone size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Phone Support</h3>
              <p className="text-xs text-slate-500">Call our patient helpline for assistance with OPD token bookings and doctor schedules.</p>
              <div className="pt-2 text-sm font-extrabold text-blue-600">
                <a href="tel:+918046688888" className="hover:underline">+91 80 4668 8888</a>
                <span className="text-slate-400 font-normal text-xs block mt-0.5">Toll-Free: 1800-INSTA-TOKEN</span>
              </div>
            </div>

            {/* Email Support */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Mail size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Email Support</h3>
              <p className="text-xs text-slate-500">Write to us for general inquiries, payment queries, refunds, or hospital onboarding.</p>
              <div className="pt-2 text-sm font-extrabold text-blue-600">
                <a href="mailto:token.in1999@gmail.com" className="hover:underline">token.in1999@gmail.com</a>
                <span className="text-slate-400 font-normal text-xs block mt-0.5">Official: info@instatoken.in</span>
              </div>
            </div>

            {/* Office Address */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Registered Office</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>InstaToken Healthcare Solutions</strong><br />
                In Partnership with CODTECH IT SOLUTIONS<br />
                Plot No. 12, Financial District, Gachibowli<br />
                Hyderabad, Telangana - 500081, India
              </p>
            </div>

            {/* Operating Hours */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Operating Hours</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Digital OPD Queue Service:</strong> 24×7 Available Online<br />
                <strong>Customer Support Desk:</strong> Mon – Sat, 9:00 AM – 8:00 PM IST<br />
                <strong>Hospital Emergency:</strong> Direct Hospital OPD Helpdesk
              </p>
            </div>

          </div>

          {/* Grievance & Compliance Note */}
          <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-5 flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong>Razorpay Merchant &amp; Payment Compliance:</strong> InstaToken complies with RBI digital payment guidelines. If you have any dispute or grievance regarding payment deductions or transaction status, please quote your Razorpay Payment ID or Token Number for priority resolution within 24 hours.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
