import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Award, Calendar, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';

export const Plans: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';

  const hasActiveSub = user?.subscription && new Date(user.subscription.expiresAt) > new Date();

  const plans = [
    { name: "3-Day Pass", price: 10, days: 3, description: "Perfect for single doctor visit and follow-up checking" },
    { name: "5-Day Pass", price: 20, days: 5, description: "Best for short family checkups or diagnostic lab test schedules" },
    { name: "Weekly Pass", price: 50, days: 7, description: "Great for multiple diagnostic reports and doctor consultations" },
    { name: "Monthly Pass", price: 100, days: 30, description: "Recommended for chronic treatments and regular therapy visits" }
  ];

  const handleSelectPlan = (plan: typeof plans[0]) => {
    navigate('/payment', {
      state: {
        subscriptionPlan: {
          name: plan.name,
          price: plan.price,
          days: plan.days
        },
        redirectUrl,
        fee: 0,
        hospitalId: '',
        doctorId: '',
        date: '',
        time: '',
        patientDetails: null
      }
    });
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:bg-transparent md:pb-6 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors bg-white shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">Booking Passes</h2>
      </div>

      <div className="px-5 mt-4 space-y-5">
        
        {/* Redirect Alert Warning */}
        {redirectUrl && !hasActiveSub && (
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-3xl flex gap-3 text-xs text-orange-755 font-semibold">
            <ShieldAlert size={18} className="shrink-0 mt-0.5 animate-bounce" />
            <div>
              <p className="font-extrabold uppercase tracking-wide">Subscription Pass Required</p>
              <p className="mt-0.5 leading-relaxed">
                You must purchase a booking pass to schedule your OPD token. Once activated, you will be redirected to complete your booking immediately.
              </p>
            </div>
          </div>
        )}

        {/* Active Plan Section */}
        {hasActiveSub && user?.subscription ? (
          <Card className="p-6 border-none shadow-xs bg-white">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Your Active Pass</h3>
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white relative overflow-hidden">
              <div className="absolute top-[-30px] right-[-30px] w-32 h-32 bg-white/10 rounded-full blur-xl" />
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-2 rounded-xl text-white">
                    <Zap size={20} className="fill-white" />
                  </div>
                  <div>
                    <span className="text-sm font-black block tracking-tight">{user.subscription.planName}</span>
                    <span className="text-[10px] text-blue-100 block mt-0.5 font-semibold flex items-center gap-1">
                      <Calendar size={12} />
                      Valid until {new Date(user.subscription.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Badge variant="blue" className="bg-white text-blue-600 border-none px-3 py-1 font-bold rounded-lg text-[9px] uppercase">
                  ACTIVE
                </Badge>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-[10px] font-semibold text-blue-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-300" />
                  <span>Free platform bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-300" />
                  <span>Unlimited doctor cabin tokens</span>
                </div>
              </div>
            </div>

            {redirectUrl && (
              <button
                type="button"
                onClick={() => navigate(redirectUrl)}
                className="w-full text-center mt-4 py-2.5 bg-slate-850 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Proceed to Doctor Booking Form
              </button>
            )}
          </Card>
        ) : (
          <Card className="p-5 border-none shadow-xs bg-white text-center py-6 flex flex-col items-center">
            <div className="bg-slate-50 text-slate-400 p-3 rounded-full mb-3">
              <Award size={32} />
            </div>
            <h4 className="font-heading font-black text-slate-850 text-sm tracking-tight">No Active Pass</h4>
            <p className="text-[9.5px] text-slate-400 mt-1 max-w-[280px] leading-relaxed font-semibold">
              You need an active booking pass to schedule doctor OPD cabin tokens. Doctor consultation fees are paid directly at the clinic.
            </p>
          </Card>
        )}

        {/* Tiers List */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Select Subscription Tier</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <Card 
                key={plan.name}
                className="p-5 border border-slate-100/80 bg-white hover:border-blue-300 hover:ring-2 hover:ring-blue-100 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{plan.name}</span>
                    <span className="text-lg font-black text-slate-800">₹{plan.price}</span>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1 leading-normal font-semibold">
                    {plan.description}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-50">
                  <span className="text-[9.5px] text-slate-400 font-extrabold uppercase">{plan.days} Days Validity</span>
                  
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className="py-1.5 px-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer border-none"
                  >
                    Activate Pass
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
