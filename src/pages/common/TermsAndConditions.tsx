import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, AlertCircle } from 'lucide-react';

export const TermsAndConditions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 sm:p-10 text-white relative">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer mb-4 backdrop-blur-xs"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Terms and Conditions</h1>
              <p className="text-xs text-blue-100 mt-1">Last Updated: November 20, 2026 • InstaToken (instatoken.in)</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-8 text-slate-700 text-sm leading-relaxed">
          
          <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong className="font-bold">Welcome to InstaToken:</strong> By accessing or using our platform at <span className="font-semibold underline">https://instatoken.in</span> or our mobile application, you agree to be bound by these Terms and Conditions. Please review them carefully before booking any hospital or doctor OPD token.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">1</span>
              About InstaToken Platform &amp; Services
            </h2>
            <p>
              InstaToken (operated in partnership with CODTECH IT SOLUTIONS) is a healthcare technology platform facilitating digital Outpatient Department (OPD) queue management, online doctor token reservations, and real-time live queue tracking between patients and verified medical clinics/hospitals across India.
            </p>
            <p>
              InstaToken functions purely as a digital facilitator. We provide booking infrastructure, wait-time estimation, and communication services. Medical consultations, treatments, clinical evaluations, and healthcare services are delivered exclusively by independent hospitals and registered medical practitioners.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">2</span>
              User Account &amp; Verification
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>Users must register with a valid 10-digit Indian mobile number authenticated via One-Time Password (OTP) or Google OAuth.</li>
              <li>You agree to provide true, accurate, current, and complete details for the patient seeking appointment.</li>
              <li>You are solely responsible for all activity conducted under your authenticated session and mobile number.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">3</span>
              Token Booking &amp; Payment Processing
            </h2>
            <p>
              Token reservations may require payment of doctor consultation charges, hospital registration fees, and/or convenience platform charges.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>All payments are securely handled through Reserve Bank of India (RBI) authorized payment aggregators including <strong>Razorpay</strong>.</li>
              <li>Accepted payment methods include UPI (Google Pay, PhonePe, Paytm), Net Banking, Credit Cards, and Debit Cards.</li>
              <li>InstaToken does not store or process your credit/debit card numbers, CVV, or net banking passwords on its servers.</li>
              <li>A booking confirmation with a unique Token Number and QR code is issued upon successful transaction verification.</li>
              <li><strong>Non-Refundable:</strong> Token fees are strictly non-refundable once booked. If payment is deducted but a token is not generated or sent, the user is entitled to a full refund within 3 to 7 working days.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">4</span>
              Live Queue Time Estimates &amp; Delays
            </h2>
            <p>
              Expected wait times and estimated doctor arrival hours displayed on the platform are dynamic approximations based on current hospital OPD velocity.
            </p>
            <p className="text-slate-600">
              Emergency medical interventions, complex patient cases, or doctor delays may alter token schedules. Patients are strongly advised to monitor the live OPD tracker on the platform and arrive at the clinic at least 15 minutes before their estimated turn.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">5</span>
              Medical Emergency Disclaimer
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>IN CASE OF EMERGENCY:</strong> InstaToken is NOT an emergency medical service provider. If you or the patient are experiencing a severe, life-threatening emergency, acute chest pain, trauma, or respiratory distress, please immediately dial national emergency services (112 or 108 in India) or visit the nearest hospital emergency room.
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">6</span>
              Limitation of Liability
            </h2>
            <p className="text-slate-600">
              To the fullest extent permitted by law, InstaToken, its directors, developers, and partners (including CODTECH IT SOLUTIONS) shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from doctor unavailability, clinic delays, or medical diagnosis rendered by third-party healthcare institutions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">7</span>
              Governing Law &amp; Jurisdiction
            </h2>
            <p className="text-slate-600">
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising in connection with the platform shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana, India.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-base font-bold text-slate-900">8. Contact Information</h2>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-slate-600">
              <p><strong className="text-slate-800">Platform:</strong> InstaToken (instatoken.in)</p>
              <p><strong className="text-slate-800">Operating Partner:</strong> CODTECH IT SOLUTIONS</p>
              <p><strong className="text-slate-800">Email:</strong> token.in1999@gmail.com | info@instatoken.in</p>
              <p><strong className="text-slate-800">Helpline:</strong> +91 80 4668 8888 / 1800-INSTA-TOKEN</p>
              <p><strong className="text-slate-800">Location:</strong> Hyderabad, Telangana, India - 500081</p>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
};
