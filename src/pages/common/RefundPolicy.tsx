import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Clock, CheckCircle2, Mail, Phone, ShieldCheck } from 'lucide-react';

export const RefundPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-10 text-white relative">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer mb-4 backdrop-blur-xs"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Cancellation &amp; Refund Policy</h1>
              <p className="text-xs text-blue-100 mt-1">Last Updated: November 20, 2026 • InstaToken (instatoken.in)</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-8 text-slate-700 text-sm leading-relaxed">
          
          {/* Key Policy Highlights Box */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 leading-relaxed">
              <strong className="font-bold">Summary:</strong> All token bookings on InstaToken are for live, reserved hospital OPD queue slots. 
              <strong> Token fees are non-refundable once booked.</strong> In the event that payment is debited from your account but a token is not generated or sent, you are entitled to a full refund processed within <strong>3 to 7 working days</strong>.
            </div>
          </div>

          {/* Section 1: Non-Refundable Once Booked */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">1</span>
              Non-Refundable Policy on Confirmed Bookings
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">
                • The token fees will not be refunded once booked.
              </p>
              <p className="text-slate-600 leading-relaxed">
                When an OPD token is confirmed, a specific sequential consultation slot is immediately blocked and reserved for the patient in the hospital's live queue management system. Because other patients cannot book that reserved slot, cancellation or refund is strictly not available once the token has been issued.
              </p>
            </div>
          </section>

          {/* Section 2: When Refund is Applicable */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">2</span>
              When is a Refund Applicable?
            </h2>
            <p>
              A refund is applicable only under the following specific condition:
            </p>
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Payment Deducted but Token Not Sent / Generated</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                If payment is successfully deducted from your bank account, credit/debit card, or UPI app, but the OPD token is <strong>not generated or sent</strong> to you (for example, due to sudden network disruption, payment gateway sync timeout, or technical failure), you will receive a <strong>100% full refund</strong> of the debited amount.
              </p>
            </div>
          </section>

          {/* Section 3: Refund Process & Timeline */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">3</span>
              Refund Timeline (3 to 7 Working Days)
            </h2>
            <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 text-xs text-indigo-950">
              <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                Once verified, all eligible refunds are credited back to the original source payment method within <strong>3 to 7 working days</strong> in accordance with standard banking and Razorpay settlement cycles.
              </span>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-2xl mt-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Refund Destination</th>
                    <th className="p-3">Processing Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-medium text-slate-800">UPI (GPay / PhonePe / Paytm / BHIM)</td>
                    <td className="p-3">Original Bank Account via UPI VPA</td>
                    <td className="p-3 font-semibold text-emerald-600">3 to 5 Working Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Debit / Credit Cards</td>
                    <td className="p-3">Original Issuing Bank Card</td>
                    <td className="p-3 font-semibold text-emerald-600">3 to 7 Working Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Net Banking</td>
                    <td className="p-3">Source Bank Account</td>
                    <td className="p-3 font-semibold text-emerald-600">3 to 7 Working Days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: How to Contact Support for Refund */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">4</span>
              How to Contact Support for a Refund
            </h2>
            <p className="text-slate-600 text-xs">
              If your payment was completed but you did not receive your token, simply contact our support team with your payment details:
            </p>
            
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-3 text-xs text-slate-700">
              <div className="space-y-1">
                <p className="font-bold text-slate-900">Please provide the following details in your email or call:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Registered 10-digit mobile number</li>
                  <li>Razorpay Payment ID / Transaction Reference ID</li>
                  <li>Date and approximate time of payment</li>
                  <li>Amount debited</li>
                </ul>
              </div>

              <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row gap-3 sm:gap-8">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <Mail size={16} className="text-blue-600" />
                  <a href="mailto:token.in1999@gmail.com" className="hover:underline text-blue-600 font-bold">
                    token.in1999@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <Phone size={16} className="text-emerald-600" />
                  <a href="tel:+918046688888" className="hover:underline">
                    +91 80 4668 8888
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Compliance Footer Note */}
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4 text-center">
            InstaToken Healthcare Solutions • Payments facilitated securely through Razorpay • Governed by the laws of India.
          </div>

        </div>

      </div>
    </div>
  );
};
