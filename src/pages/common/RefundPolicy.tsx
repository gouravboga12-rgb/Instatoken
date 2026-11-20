import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Clock } from 'lucide-react';

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
          
          <div className="bg-indigo-50/70 border border-indigo-200/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 leading-relaxed">
              <strong className="font-bold">Transparent Refund Commitment:</strong> At InstaToken, we believe in complete fairness and transparency. If an appointment is cancelled under eligible conditions or a doctor is unavailable, your refund is processed directly back to your original source of payment within <strong className="underline">5 to 7 business days</strong>.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">1</span>
              Token Cancellation by Patient
            </h2>
            <p>
              Patients can cancel their booked OPD token through the <strong>"My Bookings"</strong> section of the InstaToken web or mobile app:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li><strong>Prior to OPD Session Start:</strong> If you cancel your token at least 1 hour before the scheduled session start time (e.g., Morning OPD 09:00 AM or Evening OPD 05:00 PM), you are eligible for a 100% refund of the doctor consultation fee.</li>
              <li><strong>During Ongoing Session:</strong> Once a doctor's OPD session has commenced and your token number is within the active call queue, cancellation is subject to the individual hospital's policy.</li>
              <li><strong>Post-Consultation or Concluded Session:</strong> Once the doctor has marked your consultation complete or the session has ended, no cancellation or refund requests can be entertained.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">2</span>
              Doctor Unavailability or Hospital Cancellation
            </h2>
            <p>
              In rare situations where a medical practitioner is unavailable due to an emergency surgery, unexpected leave, or hospital facility closure:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>You will receive an immediate SMS alert notifying you of the doctor's unavailability.</li>
              <li>You will be offered the choice to reschedule your token to the next available session at no additional cost.</li>
              <li>If you prefer not to reschedule, a <strong>100% full refund</strong> (including any platform charges) will be initiated automatically.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">3</span>
              Refund Method &amp; Processing Timelines
            </h2>
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Refund Destination</th>
                    <th className="p-3">Standard Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-medium text-slate-800">UPI (GPay / PhonePe / Paytm)</td>
                    <td className="p-3">Linked Bank Account via UPI VPA</td>
                    <td className="p-3 font-semibold text-emerald-600">2 to 4 Business Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Debit / Credit Card</td>
                    <td className="p-3">Issuing Bank Card Account</td>
                    <td className="p-3 font-semibold text-emerald-600">5 to 7 Business Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Net Banking</td>
                    <td className="p-3">Source Bank Account</td>
                    <td className="p-3 font-semibold text-emerald-600">4 to 7 Business Days</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic mt-2">
              * Note: Refund timelines depend on your issuing bank and NPCI network processing cycles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">4</span>
              Failed Transactions &amp; Deductions
            </h2>
            <p className="text-slate-600">
              If an amount is debited from your bank account or UPI application but you do not receive a token confirmation screen (e.g. due to mobile network interruption during Razorpay checkout), Razorpay's auto-reconciliation engine will automatically reverse the transaction back to your bank account within 24 to 48 hours.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">5</span>
              How to Request a Refund / Support
            </h2>
            <p className="text-slate-600">
              For any questions regarding a refund or cancellation status, please reach out to our dedicated support desk with your Token Number and registered mobile number:
            </p>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-slate-600">
              <p><strong className="text-slate-800">Support Desk:</strong> InstaToken Help &amp; Billing Support</p>
              <p><strong className="text-slate-800">Email:</strong> token.in1999@gmail.com | refunds@instatoken.in</p>
              <p><strong className="text-slate-800">Helpline:</strong> +91 80 4668 8888 / 1800-INSTA-TOKEN</p>
              <p><strong className="text-slate-800">Support Hours:</strong> Monday – Saturday: 9:00 AM – 8:00 PM IST</p>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
};
