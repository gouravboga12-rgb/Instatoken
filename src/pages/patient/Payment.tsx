import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { 
  ArrowLeft, 
  ShieldCheck, 
  CreditCard, 
  Wallet, 
  Landmark, 
  QrCode, 
  AlertCircle, 
  Lock,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Helper to ensure Razorpay checkout script is loaded
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const Payment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookToken, purchaseSubscription } = useApp();

  const state = location.state as {
    patientDetails: {
      name: string;
      age: number;
      ageUnit?: string;
      ageDisplay?: string;
      gender: string;
      phone: string;
      email: string;
      address: string;
      isExisting: boolean;
      rmpReference?: { name: string; phone: string } | null;
    } | null;
    hospitalId: string;
    doctorId: string;
    date: string;
    time: string;
    fee: number;
    tokenFee?: number;
    subscriptionPlan?: { name: string; price: number; days: number };
    redirectUrl?: string;
  };

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white max-w-md mx-auto">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500 mb-4">Payment session expired or invalid</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const { fee, patientDetails, hospitalId, doctorId, date, time, redirectUrl } = state;
  const tokenFee = state.tokenFee !== undefined
    ? state.tokenFee
    : (state.subscriptionPlan?.price !== undefined
      ? state.subscriptionPlan.price
      : Math.max(10, Math.round((fee || 500) * 0.05)));
  const subPlan = state.subscriptionPlan || { name: "OPD Token Booking Fee", price: tokenFee, days: 3 };
  const basePrice = tokenFee;
  const totalAmount = parseFloat(basePrice.toFixed(2));

  // ─── Initiate Razorpay Payment ──────────────────────────────────────────────
  const handleRazorpayPayment = async () => {
    setProcessing(true);
    setErrorMessage(null);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error("Unable to load Razorpay payment gateway SDK. Please check your internet connection.");
      }

      // 1. Create Order on Backend
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          receipt: `tok_${Date.now().toString().slice(-8)}`,
          patientName: patientDetails?.name || 'Patient',
          patientPhone: patientDetails?.phone || '',
          notes: {
            hospitalId,
            doctorId,
            slotDate: date,
            slotTime: time,
            planName: subPlan.name
          }
        })
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success || !orderData.order) {
        throw new Error(orderData.message || 'Failed to create Razorpay payment order');
      }

      const { order, keyId } = orderData;

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: keyId || 'rzp_test_ThOMWcFfdTPNme',
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'InstaToken Healthcare',
        description: patientDetails ? `OPD Token Fee - Dr. Consultation` : subPlan.name,
        image: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
        order_id: order.id,
        prefill: {
          name: patientDetails?.name || '',
          contact: patientDetails?.phone ? patientDetails.phone.replace(/\D/g, '').slice(-10) : '',
          email: patientDetails?.email || 'patient@instatoken.in'
        },
        notes: {
          hospitalId,
          doctorId,
          slotDate: date
        },
        theme: {
          color: '#2563EB' // Brand blue
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setProcessing(false);
          }
        },
        handler: async (response: any) => {
          try {
            setProcessing(true);

            // 3. Verify Payment Signature on Backend
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(verifyData.message || 'Payment signature could not be verified by server.');
            }

            // 4. Confetti Celebration
            try {
              confetti({
                particleCount: 160,
                spread: 80,
                origin: { y: 0.6 }
              });
            } catch (e) {}

            // 5. Activate booking pass
            purchaseSubscription(subPlan.name, subPlan.price, subPlan.days);

            // 6. Complete token booking with verified Razorpay payment ID
            if (patientDetails) {
              const appointmentCreated = await bookToken(
                patientDetails,
                hospitalId,
                doctorId,
                date,
                time,
                'RAZORPAY',
                response.razorpay_payment_id
              );
              setProcessing(false);
              navigate(`/confirmation/${appointmentCreated.id}`);
            } else {
              setProcessing(false);
              if (redirectUrl) {
                navigate(redirectUrl, { replace: true });
              } else {
                navigate('/bookings');
              }
            }
          } catch (err: any) {
            console.error('Error completing Razorpay payment confirmation:', err);
            setErrorMessage(err.message || 'Payment verification failed. Please contact hospital support.');
            setProcessing(false);
          }
        }
      };

      const rzpInstance = new (window as any).Razorpay(options);

      rzpInstance.on('payment.failed', (failResponse: any) => {
        console.error('Razorpay payment failed:', failResponse.error);
        setErrorMessage(`Payment Failed: ${failResponse.error?.description || failResponse.error?.reason || 'Transaction declined by bank or user.'}`);
        setProcessing(false);
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error('Razorpay initiation error:', err);
      setErrorMessage(err.message || 'Failed to initialize Razorpay payment. Please try again.');
      setProcessing(false);
    }
  };

  // Instant Test Simulation Bypass (useful for automated testing)
  const handleTestSimulatedPayment = async () => {
    setProcessing(true);
    setErrorMessage(null);

    setTimeout(async () => {
      try {
        const dummyPayId = `pay_test_${Date.now().toString().slice(-8)}`;

        try {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch (e) {}

        purchaseSubscription(subPlan.name, subPlan.price, subPlan.days);

        if (patientDetails) {
          const appointmentCreated = await bookToken(
            patientDetails,
            hospitalId,
            doctorId,
            date,
            time,
            'RAZORPAY_TEST',
            dummyPayId
          );
          setProcessing(false);
          navigate(`/confirmation/${appointmentCreated.id}`);
        } else {
          setProcessing(false);
          if (redirectUrl) {
            navigate(redirectUrl, { replace: true });
          } else {
            navigate('/bookings');
          }
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Simulation failed');
        setProcessing(false);
      }
    }, 1000);
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-6 w-full">
      
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 flex items-center justify-between md:rounded-2xl md:mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">Razorpay Checkout</h2>
            <p className="text-[10px] text-slate-400 font-bold">Secure Online OPD Token Payment</p>
          </div>
        </div>

        {/* Live / Test Mode Badge */}
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-[10px] font-extrabold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Razorpay Test Mode</span>
        </div>
      </div>

      <div className="px-5 mt-4 md:grid md:grid-cols-12 md:gap-8 items-start">
        
        {/* Left Column (Billing Breakdown & Security Assurance) */}
        <div className="md:col-span-5 space-y-4 md:sticky md:top-24 mb-5 md:mb-0">
          
          {/* Billing Invoice Breakdown */}
          <Card className="p-5 border-none shadow-xs bg-white rounded-3xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Billing Summary</h3>
            
            <div className="space-y-2 pb-3 border-b border-slate-100 text-xs">
              <div className="flex justify-between text-slate-700 font-extrabold">
                <span>{patientDetails ? (subPlan.name || 'OPD Token Booking Fee') : `Platform Booking Pass: ${subPlan.name}`}</span>
                <span className="text-blue-600 font-black">₹{basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] font-medium">
                <span>Platform Convenience Fee</span>
                <span className="text-emerald-600 font-bold">Waived (₹0.00)</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] font-medium">
                <span>Razorpay Gateway Charges & Taxes</span>
                <span className="text-emerald-600 font-bold">Included</span>
              </div>
              
              {patientDetails && fee > 0 && (
                <div className="flex justify-between items-center text-slate-500 font-bold border-t border-dashed border-slate-200 pt-2.5 text-[10px] bg-amber-50/70 p-2.5 rounded-xl mt-1">
                  <div>
                    <span className="text-slate-800 font-black block">Doctor Consultation Fee</span>
                    <span className="text-[9px] text-amber-700 font-semibold">Pay directly at hospital cabin / desk</span>
                  </div>
                  <span className="text-amber-800 font-black text-xs">₹{fee.toFixed(2)} (Pay at Hospital)</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 font-heading font-black text-sm text-slate-850">
              <div>
                <span>Total Payable Online</span>
                <p className="text-[9.5px] text-slate-400 font-normal">Official InstaToken booking fee only</p>
              </div>
              <span className="text-blue-600 text-lg font-black font-heading">₹{totalAmount.toFixed(2)}</span>
            </div>
          </Card>

          {/* Secure Transaction Alert */}
          <div className="flex gap-2.5 bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl text-[10.5px] text-slate-600 leading-relaxed shadow-2xs">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-blue-700 block">Bank-Grade 256-Bit SSL Protection</span>
              <p className="mt-0.5 text-slate-500">
                Payment is processed by <strong>Razorpay</strong> via certified PCI-DSS Level 1 compliant infrastructure. Card/UPI details are never stored on our servers.
              </p>
            </div>
          </div>

          {/* Patient Details Preview */}
          {patientDetails && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-1 text-xs">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Booking Details</span>
              <p className="font-black text-slate-800">{patientDetails.name}</p>
              <p className="text-[11px] text-slate-500 font-medium">📞 {patientDetails.phone} • {patientDetails.gender}</p>
              <p className="text-[10px] text-blue-600 font-bold mt-1">Slot: {date} ({time})</p>
            </div>
          )}

        </div>

        {/* Right Column: Razorpay Gateway Launch Panel */}
        <div className="md:col-span-7 space-y-4">
          
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-start gap-2.5 shadow-2xs">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-rose-900">Payment Notice</p>
                <p className="text-[11px] font-medium text-rose-700 mt-0.5 leading-tight">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Razorpay Main Action Card */}
          <div className="bg-white border border-blue-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  ₹
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">Razorpay Payment Gateway</h3>
                  <p className="text-[10px] text-slate-400 font-bold">UPI, Cards, NetBanking, Wallets</p>
                </div>
              </div>

              <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                All-in-One
              </span>
            </div>

            {/* Supported Channels Showcase */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <QrCode size={16} />
                </div>
                <span className="text-xs font-black text-slate-800">UPI / QR</span>
                <span className="text-[9px] text-slate-400 font-bold leading-tight">GPay, PhonePe, Paytm</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <span className="text-xs font-black text-slate-800">Debit / Credit</span>
                <span className="text-[9px] text-slate-400 font-bold leading-tight">Visa, MC, RuPay</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Landmark size={16} />
                </div>
                <span className="text-xs font-black text-slate-800">NetBanking</span>
                <span className="text-[9px] text-slate-400 font-bold leading-tight">50+ Indian Banks</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Wallet size={16} />
                </div>
                <span className="text-xs font-black text-slate-800">Wallets</span>
                <span className="text-[9px] text-slate-400 font-bold leading-tight">Paytm, Mobikwik</span>
              </div>
            </div>

            {/* Launch Primary Razorpay Modal Button */}
            <div className="space-y-2.5 pt-2">
              <Button 
                type="button" 
                onClick={handleRazorpayPayment}
                disabled={processing}
                variant="primary" 
                size="lg" 
                fullWidth 
                className="py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg shadow-blue-500/25 rounded-2xl cursor-pointer"
              >
                <Lock size={15} />
                <span>{processing ? 'Connecting Razorpay...' : `Pay ₹${totalAmount.toFixed(2)} with Razorpay`}</span>
                <ExternalLink size={14} className="opacity-80 ml-0.5" />
              </Button>

              <p className="text-[9.5px] text-center text-slate-400 font-medium">
                Clicking opens the official Razorpay test checkout window to complete payment
              </p>
            </div>

            {/* Test Simulation Option */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Fast Test Simulation</span>
                <span className="text-[9px] text-slate-400">Simulate successful token booking without popup</span>
              </div>

              <button
                type="button"
                onClick={handleTestSimulatedPayment}
                disabled={processing}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Instant Test Pay
              </button>
            </div>

          </div>

          {/* Trust Footnote */}
          <div className="p-4 bg-slate-100/70 border border-slate-200/80 rounded-2xl text-[10px] text-slate-500 flex items-center justify-between">
            <span className="font-bold flex items-center gap-1">
              <span>Merchant:</span>
              <strong className="text-slate-800">InstaToken OPD Services</strong>
            </span>
            <span className="font-semibold text-slate-400">Key: rzp_test_***Nme</span>
          </div>

        </div>
      </div>

      {/* Fullscreen processing modal overlay */}
      {processing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base tracking-tight">Processing with Razorpay</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
              Verifying transaction credentials and confirming your doctor OPD token...
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
