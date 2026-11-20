import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-600 to-blue-700 p-6 sm:p-10 text-white relative">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer mb-4 backdrop-blur-xs"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-emerald-100 mt-1">Last Updated: November 20, 2026 • InstaToken (instatoken.in)</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-8 text-slate-700 text-sm leading-relaxed">
          
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong className="font-bold">Your Privacy is Protected:</strong> At InstaToken, we take patient and user data privacy with extreme seriousness. We enforce strict data confidentiality compliant with the Information Technology Act, 2000 (and applicable SPDI Rules) and Digital Personal Data Protection (DPDP) Act of India.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">1</span>
              Information We Collect
            </h2>
            <p>
              When you use InstaToken to book an appointment or manage your medical visits, we collect the minimum necessary data to provide our services:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li><strong>Contact &amp; Account Details:</strong> Mobile phone number, full name, email address (when provided), and authentication tokens.</li>
              <li><strong>Patient Demographic Info:</strong> Patient age, gender, and appointment relationship (self, parent, child, spouse).</li>
              <li><strong>OPD Booking Information:</strong> Selected hospital, consulting doctor, department/specialization, appointment date/time slot, and token sequential number.</li>
              <li><strong>Transaction Records:</strong> Razorpay order ID, payment payment ID, amount paid, and payment status (Success/Failed). We <em>never</em> collect, handle, or store full credit card numbers, CVV codes, or netbanking passwords.</li>
              <li><strong>Technical &amp; Device Information:</strong> IP address, device browser type, and location city data to suggest nearby hospitals.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">2</span>
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>To confirm, allocate, and synchronize your hospital OPD token with the doctor's live queue.</li>
              <li>To deliver real-time live queue status alerts via SMS (DLT-compliant transactional SMS), WhatsApp notifications, and web push notifications.</li>
              <li>To verify identity and prevent queue hoarding or fraudulent token bookings.</li>
              <li>To process payments and initiate timely refunds via payment gateway partner Razorpay.</li>
              <li>To provide customer support and respond to patient inquiries.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">3</span>
              Payment Security with Razorpay
            </h2>
            <p>
              All online digital payments on InstaToken are processed through <strong>Razorpay Software Private Limited</strong>, a PCI-DSS Level 1 compliant and Reserve Bank of India (RBI) authorized payment aggregator. 
            </p>
            <p className="text-slate-600">
              All payment data transmissions are protected using 256-bit Secure Sockets Layer (SSL/TLS) encryption. InstaToken does not have access to or hold your payment card credentials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">4</span>
              Zero Unauthorized Data Selling
            </h2>
            <p>
              We firmly believe in patient medical confidentiality. <strong>InstaToken does not sell, rent, trade, or monetize your personal information or medical appointment history to any third-party advertisers, pharmaceutical companies, or marketing agencies.</strong>
            </p>
            <p className="text-slate-600">
              Information is shared only with the specific hospital or clinic where you have booked an appointment to enable medical registration at the reception desk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">5</span>
              Data Retention &amp; Security Controls
            </h2>
            <p className="text-slate-600">
              We employ strict cloud security standards, multi-factor database authentication, and ISO 27001 aligned practices on our AWS cloud infrastructure. Patient records are maintained for booking auditability and reference in accordance with applicable healthcare compliance guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">6</span>
              Grievance Redressal Officer
            </h2>
            <p className="text-slate-600">
              In accordance with the Information Technology Act 2000 and the Rules made thereunder, the contact details of the Grievance Officer are provided below:
            </p>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-slate-600">
              <p><strong className="text-slate-800">Officer Name:</strong> Data Protection &amp; Grievance Officer</p>
              <p><strong className="text-slate-800">Email:</strong> grievance@instatoken.in | token.in1999@gmail.com</p>
              <p><strong className="text-slate-800">Address:</strong> InstaToken / CODTECH IT SOLUTIONS, Gachibowli, Hyderabad, Telangana - 500081</p>
              <p><strong className="text-slate-800">Response Window:</strong> We acknowledge all grievances within 24–48 hours and resolve them within 15 working days.</p>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
};
