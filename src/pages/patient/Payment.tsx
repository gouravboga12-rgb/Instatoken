import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ArrowLeft, ShieldCheck, CreditCard, Wallet, Landmark, QrCode, Info, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Payment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookToken, purchaseSubscription } = useApp();

  const state = location.state as {
    patientDetails: { name: string; age: number; gender: string; phone: string; email: string; address: string; isExisting: boolean } | null;
    hospitalId: string;
    doctorId: string;
    date: string;
    time: string;
    fee: number;
    subscriptionPlan?: { name: string; price: number; days: number };
    redirectUrl?: string;
  };

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet' | 'netbanking'>('upi');
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white max-w-md mx-auto">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500 mb-4">Payment session expired</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const { fee, patientDetails, hospitalId, doctorId, date, time, redirectUrl } = state;
  const subPlan = state.subscriptionPlan || { name: "3-Day Pass", price: 10, days: 3 };
  const basePrice = subPlan.price;
  const convenienceFee = 2;
  const cgst = parseFloat((basePrice * 0.09).toFixed(2));
  const sgst = parseFloat((basePrice * 0.09).toFixed(2));
  const totalAmount = parseFloat((basePrice + convenienceFee + cgst + sgst).toFixed(2));

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    setTimeout(() => {
      try {
        purchaseSubscription(subPlan.name, subPlan.price, subPlan.days);

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        if (patientDetails) {
          const appointmentCreated = bookToken(
            patientDetails,
            hospitalId,
            doctorId,
            date,
            time,
            paymentMethod.toUpperCase()
          );
          setProcessing(false);
          navigate(`/confirmation/${appointmentCreated.id}`);
        } else {
          setProcessing(false);
          if (redirectUrl) {
            navigate(redirectUrl, { replace: true });
          } else {
            navigate('/plans');
          }
        }
      } catch (err) {
        alert("Transaction failed. Please try again.");
        setProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:bg-transparent md:pb-6 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">Secure Checkout</h2>
      </div>

      <div className="px-5 mt-4">
        
        {/* Billing Invoice Breakdown */}
        <Card className="p-5 border-none shadow-xs bg-white mb-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Billing Summary</h3>
          
          <div className="space-y-2 pb-3 border-b border-slate-100 text-xs">
            <div className="flex justify-between text-slate-700 font-extrabold">
              <span>Platform Booking Pass: {subPlan.name}</span>
              <span>₹{basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Convenience Charge</span>
              <span>₹{convenienceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium">
              <span>CGST (9%)</span>
              <span>₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium">
              <span>SGST (9%)</span>
              <span>₹{sgst.toFixed(2)}</span>
            </div>
            
            {patientDetails && fee > 0 && (
              <div className="flex justify-between text-slate-400 font-bold border-t border-dashed border-slate-100 pt-2 text-[10px]">
                <span>OPD Consultation Fee (Doctor Cabin)</span>
                <span className="text-slate-500">₹{fee.toFixed(2)} (Pay at Hospital)</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 font-heading font-black text-sm text-slate-850">
            <span>Total Payable Amount (Online)</span>
            <span className="text-blue-600 text-base">₹{totalAmount.toFixed(2)}</span>
          </div>
        </Card>

        {/* Secure Transaction Alert */}
        <div className="flex gap-2.5 bg-blue-50/50 border border-blue-100 p-3 rounded-2xl mb-5 text-[10px] text-slate-500 leading-relaxed">
          <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-blue-700">100% Secure Checkout</span>
            <p className="mt-0.5">Your payment is encrypted using SSL technology and backed by PCI-DSS protocols.</p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handlePaymentSubmit} className="space-y-5">
          
          {/* Payment Method Selector Grid */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">Select Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${paymentMethod === 'upi' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-500'}`}
              >
                <QrCode size={18} />
                <span className="text-[9px] font-bold">UPI/GPay</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${paymentMethod === 'card' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-500'}`}
              >
                <CreditCard size={18} />
                <span className="text-[9px] font-bold">Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${paymentMethod === 'wallet' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-500'}`}
              >
                <Wallet size={18} />
                <span className="text-[9px] font-bold">Wallets</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${paymentMethod === 'netbanking' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-500'}`}
              >
                <Landmark size={18} />
                <span className="text-[9px] font-bold">Banking</span>
              </button>
            </div>
          </div>

          {/* Payment Method Details Panel */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
            
            {/* UPI */}
            {paymentMethod === 'upi' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Virtual Payment Address (VPA)</label>
                  <input 
                    type="text" 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. name@okhdfcbank"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-mono"
                  />
                </div>
                <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl">
                  <Info size={14} className="text-slate-400 shrink-0" />
                  <p className="text-[9px] text-slate-400 leading-relaxed">Simply enter your VPA ID. On pressing pay, a request will be triggered to your UPI app for verification.</p>
                </div>
              </div>
            )}

            {/* CARD */}
            {paymentMethod === 'card' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card Number</label>
                  <input 
                    type="text" 
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                    placeholder="4000 1234 5678 9010"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</label>
                    <input 
                      type="text" 
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').replace(/(.{2})/, '$1/').trim())}
                      placeholder="MM/YY"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-center font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CVV Code</label>
                    <input 
                      type="password" 
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="•••"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-center font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* WALLET */}
            {paymentMethod === 'wallet' && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <p className="text-xs font-semibold text-slate-700">Select Wallet Partner</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Paytm', 'PhonePe', 'Amazon Pay'].map((w) => (
                    <button
                      key={w}
                      type="button"
                      className="py-2.5 border border-slate-100 hover:border-blue-500 hover:bg-blue-50/20 text-[10px] font-bold rounded-xl text-slate-600 transition-colors cursor-pointer"
                      onClick={() => alert(`Redirecting to verify linked ${w} account...`)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* NETBANKING */}
            {paymentMethod === 'netbanking' && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <p className="text-xs font-semibold text-slate-700">Popular Bank Portals</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      className="py-2 border border-slate-100 hover:border-blue-500 text-[10px] font-bold rounded-xl text-slate-600 transition-all cursor-pointer"
                      onClick={() => alert(`Initiating secure gateway for ${b} Portal...`)}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Pay Button */}
          <Button 
            type="submit" 
            variant="success" 
            size="lg" 
            fullWidth 
            className="py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            <span>Pay & Book Token</span>
            <Sparkles size={16} />
          </Button>

        </form>
      </div>

      {/* Fullscreen processing modal overlay */}
      {processing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <h3 className="font-extrabold text-slate-800 text-base tracking-tight">Processing Payment</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">Please do not press back or refresh the page while we authenticate your transaction.</p>
          </div>
        </div>
      )}

    </div>
  );
};
