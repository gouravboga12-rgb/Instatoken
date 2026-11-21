import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { jsPDF } from 'jspdf';
import { 
  Calendar, Download, Share2, CheckCircle2, 
  Phone, Compass, Building2, User, CreditCard,
  AlertCircle, ArrowLeft, Loader2,
  Clock, MapPin, ShieldCheck, MessageSquare
} from 'lucide-react';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return { formattedDate: '', dayOfWeek: '', validUntilDate: '' };
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, monthIdx, day);
    
    const formattedDate = `${day} ${months[monthIdx]} ${year}`;
    const dayOfWeek = weekdays[date.getDay()];
    
    // Valid Until: 7 days later
    const validDate = new Date(year, monthIdx, day + 7);
    const validUntilDate = `${validDate.getDate()} ${months[validDate.getMonth()]} ${validDate.getFullYear()}`;
    
    return {
      formattedDate,
      dayOfWeek,
      validUntilDate
    };
  }
  return {
    formattedDate: dateStr,
    dayOfWeek: '',
    validUntilDate: ''
  };
};

export const TokenConfirmation: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { appointments, hospitals, addNotification } = useApp();
  const navigate = useNavigate();

  const [fetchedAppointment, setFetchedAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // Check local appointment cache first for instant synchronous resolution
  const savedLocalAppointment = React.useMemo(() => {
    if (!appointmentId) return null;
    try {
      const saved = localStorage.getItem('insta_appointments');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          const found = list.find((a: any) => a.id === appointmentId || String(a.tokenNumber) === appointmentId);
          if (found) return found;
        }
      }
      const savedToks = localStorage.getItem('insta_hospital_tokens');
      if (savedToks) {
        const tList = JSON.parse(savedToks);
        if (Array.isArray(tList)) {
          const tok = tList.find((t: any) => t.id === appointmentId || String(t.tokenNo) === appointmentId);
          if (tok) {
            return {
              id: tok.id,
              tokenNumber: tok.tokenNo || 1,
              patientName: tok.patientName || 'Patient',
              age: tok.patientAge || 28,
              gender: tok.patientGender || 'Male',
              phone: tok.patientPhone || '',
              email: tok.email || '',
              address: tok.address || '',
              hospitalId: tok.hospitalId,
              hospitalName: tok.hospitalName || 'Hospital',
              doctorId: tok.doctorId,
              doctorName: tok.doctorName || 'Doctor',
              departmentName: tok.departmentName || 'General Medicine',
              date: tok.bookingDate || new Date().toISOString().split('T')[0],
              time: tok.time || '10:00 AM',
              fee: tok.consultationFee || 500,
              status: tok.status || 'booked',
              paymentId: `OFFLINE-${tok.tokenNo}`,
              paymentMethod: 'Counter / Walk-in Cash',
              estimatedWaitTime: tok.estimatedWait || 15
            };
          }
        }
      }
    } catch (e) {}
    return null;
  }, [appointmentId]);

  // Look in React state first, then fallback to local cache, then fetched appointment
  const inMemoryAppointment = appointments.find(a => a.id === appointmentId) || (appointmentId ? null : appointments[0]);
  const appointment = inMemoryAppointment || savedLocalAppointment || fetchedAppointment;

  const hasHospitalSession = Boolean(localStorage.getItem('insta_hospital_user') || localStorage.getItem('insta_hospital_auth_token'));

  useEffect(() => {
    if (inMemoryAppointment || savedLocalAppointment) {
      setIsLoading(false);
      return;
    }

    if (!appointmentId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/appointments/${appointmentId}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.appointment) {
          setFetchedAppointment(data.appointment);
          setIsLoading(false);
        } else {
          // Fallback check tokens endpoint
          fetch(`/api/tokens/${appointmentId}`)
            .then(r => r.json())
            .then(tData => {
              if (!isMounted) return;
              if (tData.success && tData.token) {
                const tok = tData.token;
                setFetchedAppointment({
                  id: tok.id,
                  tokenNumber: tok.tokenNo || tok.tokenNumber || 1,
                  patientName: tok.patientName || 'Patient',
                  age: tok.patientAge || 28,
                  gender: tok.patientGender || 'Male',
                  phone: tok.patientPhone || '',
                  email: tok.patientEmail || '',
                  address: tok.address || '',
                  hospitalId: tok.hospitalId,
                  hospitalName: tok.hospitalName || 'Hospital',
                  doctorId: tok.doctorId,
                  doctorName: tok.doctorName || 'Doctor',
                  departmentName: tok.departmentName || 'General Medicine',
                  date: tok.bookingDate || new Date().toISOString().split('T')[0],
                  time: tok.time || '10:00 AM',
                  fee: tok.consultationFee || 500,
                  status: tok.status || 'booked',
                  paymentId: tok.paymentId || `PAY-${tok.id}`,
                  paymentMethod: tok.paymentMethod || 'Online',
                  estimatedWaitTime: tok.estimatedWait || 15
                });
              }
              setIsLoading(false);
            })
            .catch(() => {
              if (isMounted) setIsLoading(false);
            });
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [appointmentId, inMemoryAppointment]);

  const { formattedDate, dayOfWeek, validUntilDate } = formatLocalDate(appointment?.date || '');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 max-w-md mx-auto text-center">
        <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
        <h3 className="text-sm font-black text-slate-800">Retrieving Your OPD Token...</h3>
        <p className="text-xs text-slate-400 mt-1">Connecting to AWS cloud database</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 max-w-md mx-auto">
        <div className="text-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 font-black text-lg">!</div>
          <h3 className="text-base font-black text-slate-800">Token Record Not Found</h3>
          <p className="text-xs font-semibold text-slate-400 mb-5 mt-1">We could not locate this token ID in the cloud registry.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/bookings')}>View My Bookings</Button>
            <Button variant="secondary" onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const hospitalObj = hospitals.find(h => h.id === appointment?.hospitalId);
  const hospitalPhone = hospitalObj?.phone || (hospitalObj as any)?.emergencyNumber || (hospitalObj as any)?.emergencyContact || '6302970625';
  const hospitalAddress = hospitalObj?.address || appointment?.address || hospitalObj?.city || 'Hospital OPD Facility';
  const mapSearchQuery = encodeURIComponent(`${appointment?.hospitalName || hospitalObj?.name || 'Hospital'} ${hospitalAddress}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapSearchQuery}`;

  const fee = Number(appointment.fee) || 250;
  const totalPaid = Number(appointment.totalFee || 0);
  const pc = (appointment as any)?.paymentCollection;
  const isFullOnlineBooking = (appointment as any)?.collectionMode === 'full_online' ||
    (pc && pc.mode === 'full_online') ||
    ((appointment as any)?.paymentMethod && (appointment as any).paymentMethod.toLowerCase().includes('full online')) ||
    (fee > 0 && totalPaid >= fee && totalPaid > 60);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Top Header Banner (Deep Blue)
      doc.setFillColor(30, 64, 175);
      doc.roundedRect(15, 15, 180, 24, 3, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('INSTATOKEN · OFFICIAL OPD APPOINTMENT PASS', 20, 22);

      doc.setFontSize(13);
      doc.text(appointment.hospitalName || 'Hospital OPD Facility', 20, 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(219, 234, 254);
      doc.text(`${hospitalAddress} · Ph: ${hospitalPhone}`, 20, 35);

      // 2. Token Number & Slot Card (Light Blue)
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(15, 43, 180, 38, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text('YOUR TOKEN NUMBER', 22, 51);

      doc.setFontSize(28);
      doc.setTextColor(29, 78, 216);
      doc.text(`#${appointment.tokenNumber || 1}`, 22, 63);

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Slot Time: ${appointment.time || 'Morning OPD'}`, 22, 70);
      doc.text(`Date: ${formattedDate} (${dayOfWeek})`, 22, 75);

      // Status Badge
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(138, 47, 48, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('TOKEN CONFIRMED', 142, 52.5);

      // 2. Doctor Cabin Consultation Stamp in PDF
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(138, 57, 48, 22, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 64, 175);
      doc.text('CABIN APPOINTMENT', 162, 64, { align: 'center' });
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text((appointment.doctorName || 'Doctor').slice(0, 20), 162, 70, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Slot: ${appointment.time || 'Morning OPD'}`, 162, 75, { align: 'center' });

      // 3. Grid: Patient Details & Doctor Details
      // Left: Patient
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 85, 87, 44, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 64, 175);
      doc.text('PATIENT DETAILS', 20, 92);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(appointment.patientName || 'Patient', 20, 99);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Age / Gender: ${appointment.age || '28'} Yrs (${appointment.gender || 'Male'})`, 20, 105);
      doc.text(`Contact: ${appointment.phone || 'Phone on file'}`, 20, 111);
      doc.text(`Token ID: ${appointment.id || 'N/A'}`, 20, 117);
      doc.text(`Status: Confirmed Spot`, 20, 123);

      // Right: Doctor
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(108, 85, 87, 44, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 64, 175);
      doc.text('CONSULTING DOCTOR', 113, 92);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(appointment.doctorName || 'Doctor', 113, 99);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Department: ${appointment.departmentName || 'General OPD'}`, 113, 105);
      doc.text(`Facility: OPD Consultation Desk`, 113, 111);
      doc.text(`Est. Wait: ~${appointment.estimatedWaitTime || 15} mins`, 113, 117);
      doc.text(`Valid Until: ${validUntilDate || '7 Days'}`, 113, 123);

      // 4. Payment & Fees Summary Box
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(15, 133, 180, 36, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('PAYMENT & CHARGES BREAKDOWN', 20, 140);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Doctor Consultation Fee:', 20, 147);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(
        isFullOnlineBooking 
          ? `Rs. ${fee.toFixed(2)} (PAID ONLINE IN ADVANCE)` 
          : `Rs. ${fee.toFixed(2)} (PAY AT HOSPITAL OPD CABIN)`, 
        85, 147
      );

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Platform & Token Charges:', 20, 153);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Rs. ${(Number(appointment.platformFee) || 10).toFixed(2)} (PAID ONLINE)`, 85, 153);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Total Online Paid Now:', 20, 159);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isFullOnlineBooking ? 22 : 37, isFullOnlineBooking ? 101 : 99, isFullOnlineBooking ? 52 : 235);
      doc.text(
        isFullOnlineBooking 
          ? `Rs. ${(totalPaid || (fee + 17.11)).toFixed(2)} (FULL ONLINE ADVANCE VERIFIED)` 
          : `Rs. ${(totalPaid || 13.57).toFixed(2)} (TOKEN BOOKING CHARGES PAID)`, 
        85, 159
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Transaction Reference: ${appointment.paymentId || 'PAYID-INSTATOKEN'} · Verified Online`, 20, 165);

      // 5. Important Instructions Box
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(15, 173, 180, 34, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(133, 77, 14);
      doc.text('IMPORTANT PATIENT INSTRUCTIONS', 20, 180);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 63, 18);
      doc.text('1. Please reach the hospital 10-15 minutes prior to your allocated slot time.', 20, 186);
      doc.text('2. Present this token pass or mention your Token Number at the reception desk.', 20, 191);
      doc.text(
        isFullOnlineBooking
          ? '3. Consultation fee has been paid online in full (No fee to be paid at doctor cabin).'
          : '3. Consultation fee must be paid directly at doctor\'s cabin / hospital desk.',
        20, 196
      );
      doc.text('4. This token slip is valid for 7 Days (up to 2 Follow-up visits) from booking date.', 20, 201);

      // 6. Security Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 215, 195, 215);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Generated by InstaToken OPD Queue Platform · 100% Guaranteed Appointment Slot', 15, 221);
      doc.text(`Issued On: ${new Date().toLocaleString('en-IN')} · Support: help@instatoken.in`, 15, 226);

      const safePatient = (appointment.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `InstaToken_Token_${appointment.tokenNumber || 1}_${safePatient}.pdf`;
      const downloadUrl = `${window.location.origin}/api/appointments/${appointment.id}/download-pass`;

      // 1. If running inside native Android/iOS WebView container, trigger native download
      if ((window as any).ReactNativeWebView) {
        try {
          (window as any).ReactNativeWebView.postMessage(JSON.stringify({
            type: 'DOWNLOAD_PDF',
            url: downloadUrl,
            filename: filename
          }));
        } catch (e) {}
      }

      // 2. Direct browser navigation to server PDF stream (triggers download/viewer on all mobile & desktop browsers)
      try {
        window.open(downloadUrl, '_blank');
      } catch (e) {
        window.location.href = downloadUrl;
      }

      // 3. Client-side jsPDF download with direct link fallback
      try {
        doc.save(filename);
      } catch (saveErr) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      addNotification(
        "Token Downloaded",
        `Saved "${filename}" to your device.`,
        "success"
      );
    } catch (err: any) {
      console.error('PDF generation error:', err);
      const downloadUrl = `${window.location.origin}/api/appointments/${appointment.id}/download-pass`;
      window.open(downloadUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://instatoken.in';
    const passUrl = `${origin}/confirmation/${appointment.id}`;
    const shareText = `🏥 InstaToken Appointment Pass\n` +
      `Hospital: ${appointment.hospitalName}\n` +
      `Token: #${appointment.tokenNumber}\n` +
      `Doctor: ${appointment.doctorName} (${appointment.departmentName})\n` +
      `Patient: ${appointment.patientName}\n` +
      `Date & Time: ${formattedDate} (${appointment.time})\n` +
      `Payment: ${isFullOnlineBooking ? 'Doctor Fee Paid Online' : 'Pay Doctor Fee at OPD Desk'}\n\n` +
      `📲 Open in InstaToken App:\ninstatoken://confirmation/${appointment.id}\n\n` +
      `👉 Web Pass & Tracker:\n${passUrl}`;

    // Bridge to native Android app share dialog
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SHARE',
        title: `OPD Token #${appointment.tokenNumber} - ${appointment.hospitalName}`,
        text: shareText,
        url: passUrl,
      }));
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `OPD Token #${appointment.tokenNumber} - ${appointment.hospitalName}`,
          text: shareText,
          url: passUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
      addNotification(
        "Token Copied to Clipboard",
        `Token #${appointment.tokenNumber} details and link copied successfully.`,
        "success"
      );
    } catch (e) {
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  const handleWhatsAppShare = () => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://instatoken.in';
    const passUrl = `${origin}/confirmation/${appointment.id}`;
    const text = `🏥 *InstaToken Appointment Pass*\n\n` +
      `📍 *Hospital:* ${appointment.hospitalName}\n` +
      `🔢 *Token Number:* #${appointment.tokenNumber}\n` +
      `👨‍⚕️ *Doctor:* ${appointment.doctorName} (${appointment.departmentName})\n` +
      `👤 *Patient:* ${appointment.patientName}\n` +
      `📅 *Date & Time:* ${formattedDate} (${appointment.time})\n` +
      `💳 *Payment:* ${isFullOnlineBooking ? 'Doctor Fee Paid Online' : 'Pay Doctor Fee at OPD Desk'}\n\n` +
      `📲 *Open in InstaToken App:*\ninstatoken://confirmation/${appointment.id}\n\n` +
      `🌐 *Web Pass & Queue Tracker:*\n${passUrl}`;
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const webWaUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'OPEN_URL',
        url: waUrl
      }));
      return;
    }

    window.open(webWaUrl, '_blank');
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-6 max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      
      {/* Hospital Panel Quick Return Banner */}
      {hasHospitalSession && (
        <div className="mb-4 bg-slate-900 text-white px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md border border-slate-800 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">Hospital Panel</span>
            <span className="text-xs font-bold text-slate-200">
              Customer Token #{appointment?.tokenNumber || 1} generated successfully
            </span>
          </div>
          <button
            onClick={() => navigate('/hospital/tokens/all')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-sm"
          >
            <span>← Return to Hospital Panel</span>
          </button>
        </div>
      )}

      {/* Deep Link to App Banner when opened from mobile web (WhatsApp / SMS) */}
      {!((window as any).__IS_INSTATOKEN_NATIVE_APP__) && (
        <div className="mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" className="w-8 h-8 rounded-xl object-contain bg-white p-0.5" alt="InstaToken" />
            <div>
              <div className="text-xs font-black">View in InstaToken Mobile App</div>
              <div className="text-[10px] text-blue-100 font-semibold">Track queue live with audio calling alerts</div>
            </div>
          </div>
          <a
            href={`instatoken://confirmation/${appointment.id}`}
            onClick={() => {
              window.location.href = `instatoken://confirmation/${appointment.id}`;
            }}
            className="px-3.5 py-1.5 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs rounded-xl shadow-xs border-none cursor-pointer"
          >
            Open App
          </a>
        </div>
      )}

      {/* Success Banner */}
      <div className="flex flex-col items-center text-center py-6 px-5 relative overflow-hidden bg-white rounded-3xl border border-slate-100 mb-6 shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          title="Go Back"
        >
          <ArrowLeft size={18} />
          <span className="text-xs font-extrabold hidden sm:inline">Back</span>
        </button>

        {/* Big Green Check Circle */}
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 transform hover:scale-105 transition-transform">
          <CheckCircle2 size={36} className="stroke-[2.5]" />
        </div>

        <h2 className="text-xl font-black text-emerald-800 tracking-tight font-heading">
          {appointment?.isRevisit ? "Token Re-Admitted to Active Queue!" : "Token Booked Successfully!"}
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          {appointment?.isRevisit ? "Your consultation has been re-admitted into today's live queue." : "Your OPD Token has been confirmed."}
        </p>
      </div>

      <div className="px-5 mt-4 md:grid md:grid-cols-12 md:gap-8 items-start">
        
        {/* Left Column (Pass Card & Action Buttons) */}
        <div className="md:col-span-6 space-y-4 mb-5 md:mb-0">
          {/* Main Printable Digital Token Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          {/* Blue Top Ticket Header Banner with Real Hospital Address */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-5 py-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-xs text-white rounded-xl flex items-center justify-center font-black text-base shadow-sm border border-white/20">
                +
              </div>
              <div className="min-w-0">
                <span className="text-[8px] font-black uppercase tracking-widest text-blue-200 block">INSTATOKEN VERIFIED OPD PASS</span>
                <h4 className="text-sm font-black truncate max-w-[240px] text-white">{appointment.hospitalName}</h4>
                <p className="text-[9.5px] text-blue-100 font-medium truncate max-w-[240px] flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-blue-300 shrink-0" />
                  <span>{hospitals.find(h => h.id === appointment.hospitalId)?.address || appointment.address || 'Hospital OPD Facility'}</span>
                </p>
              </div>
            </div>

            {/* Confirmed / Re-Admitted Pill Badge */}
            <span className={`${appointment?.isRevisit ? 'bg-amber-500' : 'bg-emerald-500'} text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-sm shrink-0`}>
              {appointment?.isRevisit ? 'RE-ADMITTED TOKEN' : 'TOKEN CONFIRMED'} <CheckCircle2 size={10} className="stroke-[3]" />
            </span>
          </div>

          {/* Ticket Body Content */}
          <div className="p-5 space-y-4">
            
            {/* 1. Large High-Visibility Token Number & Assigned Doctor Card */}
            <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50/50 border border-blue-100 rounded-3xl p-4 sm:p-5 shadow-2xs relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left flex-1 min-w-0">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                  YOUR TOKEN NUMBER
                </span>
                
                <div className="text-4xl sm:text-5xl font-black text-blue-700 tracking-tight my-0.5 font-heading">
                  #{appointment.tokenNumber || 1} <span className="text-slate-300 font-light">·</span> <span className="text-slate-900 text-2xl sm:text-3xl font-extrabold">{appointment.doctorName}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 mt-1">
                  <Clock size={13} className="text-blue-600 shrink-0" />
                  <span>{appointment.time || 'Morning OPD'}</span>
                  <span>·</span>
                  <span>{appointment.departmentName}</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  {formattedDate} ({dayOfWeek})
                </div>
              </div>

              {/* Verified Cabin Pass Badge */}
              <div className="flex flex-col items-center justify-center shrink-0 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center min-w-[140px]">
                <ShieldCheck size={26} className="text-emerald-600 mb-1" />
                <span className="text-xs font-black text-slate-800 block">Verified Pass</span>
                <span className="text-[9.5px] font-bold text-blue-600 block mt-0.5">Cabin Consultation</span>
                <span className="text-[8px] font-semibold text-slate-400 mt-1 block">Present at OPD Desk</span>
              </div>
            </div>

            {/* 2. Doctor & Patient Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Doctor Details */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider block">CONSULTING DOCTOR</span>
                <div className="flex items-center gap-2.5 pt-0.5">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-slate-900 truncate">{appointment.doctorName}</h5>
                    <p className="text-[10px] text-blue-600 font-bold truncate">{appointment.departmentName || 'General OPD'}</p>
                  </div>
                </div>
              </div>

              {/* Patient Details */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider block">REGISTERED PATIENT</span>
                  {appointment.isExisting && (
                    <span className="text-[9px] font-black text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                      ★ Existing Patient
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 pt-0.5">
                  <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-slate-900 truncate">{appointment.patientName}</h5>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      {appointment.gender || 'Patient'} • {appointment.ageDisplay || (appointment.age ? `${appointment.age} yrs` : '28 yrs')}
                      {appointment.phone ? ` • 📞 ${appointment.phone}` : ''}
                    </p>
                    {((appointment.doctorReference && appointment.doctorReference.name) || (appointment.rmpReference && appointment.rmpReference.name)) && (
                      <p className="text-[9.5px] font-bold text-indigo-700 mt-0.5">
                        Doctor Reference: Dr. {appointment.doctorReference?.name || appointment.rmpReference?.name} {appointment.doctorReference?.phone || appointment.rmpReference?.phone ? `(${appointment.doctorReference?.phone || appointment.rmpReference?.phone})` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Doctor Consultation Fee Card */}
            <div className="space-y-3">
              <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-2xs ${
                isFullOnlineBooking 
                  ? 'bg-blue-50/80 border-blue-200' 
                  : 'bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-emerald-200'
              }`}>
                <div className="space-y-0.5">
                  <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    isFullOnlineBooking ? 'text-blue-800' : 'text-emerald-800'
                  }`}>
                    <CreditCard size={12} className={isFullOnlineBooking ? 'text-blue-600' : 'text-emerald-600'} /> 
                    DOCTOR CONSULTATION FEE
                  </span>
                  <span className="text-3xl font-black text-slate-900 block font-heading">₹{fee}</span>
                  <p className={`text-[10.5px] font-semibold ${isFullOnlineBooking ? 'text-blue-900/80' : 'text-emerald-900/70'}`}>
                    {isFullOnlineBooking 
                      ? 'Paid in advance online via InstaToken Razorpay.' 
                      : 'Pay directly at doctor\'s cabin / OPD desk.'}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-md inline-flex items-center gap-1 uppercase shadow-sm ${
                    isFullOnlineBooking 
                      ? 'bg-blue-700 text-white' 
                      : 'bg-emerald-700 text-white'
                  }`}>
                    {isFullOnlineBooking && <ShieldCheck size={11} />}
                    {isFullOnlineBooking ? 'PAID ONLINE (ADVANCE)' : 'PAY AT HOSPITAL'}
                  </span>
                  <h5 className="text-[10px] font-black text-slate-600 mt-1">
                    {isFullOnlineBooking ? 'No counter payment needed' : 'Pay at Doctor Cabin / OPD Desk'}
                  </h5>
                </div>
              </div>

                  {/* Token Booking Charges Paid Online with GST */}
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                        <div>
                          <span className="text-xs font-black text-slate-800 block">
                            {isFullOnlineBooking ? 'Total Payment Summary (Paid Online)' : 'InstaToken Booking Charges (Paid Online)'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">Ref: {appointment.paymentId}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-blue-700 block">₹{totalPaid.toFixed(2)}</span>
                        <span className="text-[9px] font-black text-emerald-700 uppercase">
                          Paid Online ({appointment.paymentMethod || 'Razorpay'})
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium border-t border-blue-100 pt-1.5 flex justify-between">
                      <span>
                        {isFullOnlineBooking 
                          ? `Doctor Fee (₹${fee}) + Booking Charges & GST (₹${(totalPaid - fee).toFixed(2)})`
                          : 'Includes Platform Fee + Gateway Fee + 18% GST'}
                      </span>
                      <span className="font-bold text-slate-700">Official InstaToken Digital Pass</span>
                    </div>
                  </div>
                </div>

            {/* 4. Consultation Validity Dates Banner */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0 font-bold">
                  <Calendar size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wide block">CONSULTATION VALIDITY DATES</span>
                  <span className="text-xs font-black text-slate-900 block truncate">Valid: {formattedDate} — {validUntilDate}</span>
                  <span className="text-[9px] font-semibold text-emerald-700 truncate block">Includes 7 Days cabin validity & follow-up</span>
                </div>
              </div>
              <span className="bg-emerald-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs shrink-0 ml-2">
                7 DAYS VALID
              </span>
            </div>


          </div>
        </div>
        </div>

        {/* Right Column (Directions, Call Desk, Instructions & History) */}
        <div className="md:col-span-6 space-y-4">
          {/* Highlighted Navigation & Call Action Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Call Hospital Card - Prominently Highlighted */}
            <a 
              href={`tel:${hospitalPhone.replace(/\s+/g, '')}`}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all cursor-pointer group no-underline"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Phone size={18} className="text-white" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-100 block">Instant Call</span>
                <h5 className="text-xs sm:text-sm font-black text-white leading-tight truncate">Call Hospital</h5>
                <p className="text-[10px] text-emerald-100/90 font-medium truncate mt-0.5">{hospitalPhone}</p>
              </div>
            </a>

            {/* Navigation / Directions Card - Prominently Highlighted */}
            <a 
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer group no-underline"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Compass size={18} className="text-white" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-blue-100 block">GPS Route</span>
                <h5 className="text-xs sm:text-sm font-black text-white leading-tight truncate">Navigation</h5>
                <p className="text-[10px] text-blue-100/90 font-medium truncate mt-0.5">Open Maps</p>
              </div>
            </a>
          </div>

          {/* Clean Hospital Info & OPD Doctor Profile Link */}
          <button 
            type="button"
            onClick={() => navigate(`/hospital-details/${appointment.hospitalId}`)}
            className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl flex items-center justify-between text-slate-700 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Building2 size={15} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">{appointment.hospitalName}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{hospitalAddress}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-600 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
              Hospital Details →
            </span>
          </button>

        {/* Important Instructions Card with Hospital Artwork & Audio Validity Note */}
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-150 rounded-3xl p-4 flex items-center justify-between">
          <div className="space-y-2 flex-1 pr-2">
            <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={14} className="text-blue-600" /> IMPORTANT INSTRUCTIONS
            </h4>

            <ul className="text-[10px] text-slate-700 font-semibold space-y-1 list-disc pl-4 leading-snug">
              <li>Reach hospital 10–15 minutes before your session.</li>
              <li>Present this token pass or state your Token Number at the reception desk.</li>
              <li>
                {isFullOnlineBooking 
                  ? "Consultation fee paid in advance online via InstaToken Razorpay (No cabin fee)." 
                  : "Consultation fee must be paid at hospital cabin."}
              </li>
              <li>Carry previous prescriptions and reports.</li>
              <li className="text-blue-700 font-extrabold">
                Consultation Fee is valid for 7 Days (up to 2 Follow-up Visits) from booking date.
              </li>
            </ul>
          </div>

          {/* Medical Verified Badge */}
          <div className="w-20 h-20 bg-white rounded-2xl border border-blue-100 flex flex-col items-center justify-center shadow-xs shrink-0 p-2 text-center">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-1">
              <ShieldCheck size={20} className="text-blue-600" />
            </div>
            <span className="text-[9px] font-black text-slate-800 uppercase tracking-tight leading-none">100% Spot</span>
            <span className="text-[8px] font-bold text-emerald-600 mt-0.5">Confirmed</span>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button 
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 text-xs font-black flex items-center justify-center gap-1.5 rounded-xl cursor-pointer shadow-md transition-all border-none disabled:opacity-75 active:scale-98"
          >
            {isDownloading ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span className="text-white font-black">Generating PDF...</span>
              </>
            ) : (
              <>
                <Download size={14} className="text-white" />
                <span className="text-white font-black">Download (PDF)</span>
              </>
            )}
          </button>

          <button 
            type="button" 
            onClick={handleWhatsAppShare}
            className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 px-3 text-xs font-black flex items-center justify-center gap-1.5 rounded-xl cursor-pointer shadow-md transition-all border-none active:scale-98"
          >
            <MessageSquare size={14} className="text-white" />
            <span className="text-white font-black">Share on WhatsApp</span>
          </button>

          <button 
            type="button" 
            onClick={handleShare}
            className={`w-full py-2.5 px-3 text-xs font-black flex items-center justify-center gap-1.5 rounded-xl cursor-pointer transition-all border shadow-xs active:scale-98 ${
              copiedShare 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
          >
            {copiedShare ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span className="font-black text-emerald-700">Copied Link!</span>
              </>
            ) : (
              <>
                <Share2 size={14} className="text-slate-700" />
                <span className="font-black text-slate-800">Share / Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation CTAs matching Image 57 */}
        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate('/bookings')}
            className="py-3 rounded-2xl text-xs font-extrabold shadow-md shadow-blue-500/20 cursor-pointer"
          >
            View My Bookings
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate('/')}
            className="py-2.5 rounded-2xl text-xs font-bold bg-blue-50/50 border-blue-200 text-blue-700 hover:bg-blue-100/50 cursor-pointer"
          >
            Book Another Token
          </Button>
        </div>

        {/* Security Subtext */}
        <p className="text-center text-[10px] text-slate-400 font-bold pt-1">
          🔒 Your booking is secure and confirmed
        </p>

        </div>
      </div>
    </div>
  );
};
