import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { CustomerAccount } from '../../utils/mockData';
import { 
  ArrowLeft, LayoutDashboard, Stethoscope, 
  TrendingUp, ShieldCheck, Activity,
  DollarSign, Building2, CheckCircle2, Search, Plus,
  Users, UserCheck, UserX,
  AlertTriangle, Download, X, Calendar, Upload, User,
  MapPin, Trash2, Loader2, LogOut, Mail, Phone, PhoneCall, Megaphone,
  Eye, Send, ChevronDown
} from 'lucide-react';
import { LocationBanners } from './LocationBanners';
import { AdsInquiries } from './AdsInquiries';

interface AdminDashboardProps {
  initialTab?: 'stats' | 'hospitals' | 'customers' | 'financials' | 'add-hospital' | 'add-doctor' | 'banners' | 'ads-inquiries';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    hospitals, appointments, customers, addHospital, addDoctor, 
    toggleDisableHospital, deleteHospital, toggleCustomerStatus, addNotification,
    platformFeePercent, setPlatformFeePercent, logout
  } = useApp();

  const [hospitalToDelete, setHospitalToDelete] = useState<any | null>(null);
  const [isDeletingHosp, setIsDeletingHosp] = useState(false);

  const [adminTab, setAdminTab] = useState<
    'stats' | 'hospitals' | 'customers' | 'financials' | 'add-hospital' | 'add-doctor' | 'banners' | 'ads-inquiries'
  >(() => {
    if (initialTab) return initialTab;
    if (location.pathname === '/admin/banners') return 'banners';
    if (location.pathname === '/admin/ads-inquiries') return 'ads-inquiries';
    return 'stats';
  });

  // --- Add Hospital Form State ---
  const [hospName, setHospName] = useState('');
  const [hospCat, setHospCat] = useState('Multi Speciality');
  const [hospCity, setHospCity] = useState('');
  const [hospArea, setHospArea] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [hospAbout, setHospAbout] = useState('');
  const [hospContact, setHospContact] = useState('');
  const [hospCommission, setHospCommission] = useState('10');
  const hospTimings = '09:00 AM - 05:00 PM';

  // Helper to cleanly format City, Village and Area Name for Super Admin view (Image 77)
  const getHospitalLocationDisplay = (hosp: any): string => {
    if (hosp.city && (hosp.area || hosp.village)) {
      return `${hosp.city}, ${hosp.area || hosp.village}`;
    }
    if (hosp.city) return hosp.city;
    if (!hosp.address) return 'Adoni';

    const raw = String(hosp.address).trim();
    const lower = raw.toLowerCase();

    // Map known addresses to clean City, Village / Area Name
    if (lower.includes('ramkrishna') || lower.includes('kothapet') || lower.includes('pratap nagar')) {
      return 'Hyderabad, Kothapet';
    }
    if (lower.includes('rotary nagar')) {
      return 'Adoni, Rotary Nagar';
    }
    if (lower.includes('new bustand') || lower.includes('bus stand')) {
      return 'Adoni, Near New Bus Stand';
    }
    if (lower.includes('skd colony')) {
      return 'Adoni, SKD Colony';
    }

    const parts = raw.split(',').map((p: string) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const cityCandidates = ['adoni', 'hyderabad', 'kurnool', 'bengaluru', 'bangalore', 'yemmiganur', 'nandyal', 'mantralayam', 'allagadda'];
      const foundCityIndex = parts.findIndex((p: string) => cityCandidates.some(c => p.toLowerCase().includes(c)));
      if (foundCityIndex !== -1) {
        const cityPart = parts[foundCityIndex];
        const areaParts = parts.filter((_, idx) => idx !== foundCityIndex && !parts[idx].match(/^\d+/) && !parts[idx].toLowerCase().includes('india') && !parts[idx].match(/\b\d{6}\b/));
        const areaPart = areaParts[0] || '';
        return areaPart ? `${cityPart}, ${areaPart}` : cityPart;
      }
      return `${parts[parts.length - 2]}, ${parts[0]}`;
    }

    return raw;
  };
  
  // --- Add Doctor Form State ---
  const [selectedHospId, setSelectedHospId] = useState(hospitals[0]?.id || '');
  const [docName, setDocName] = useState('');
  const [docPhoto, setDocPhoto] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docDeptId, setDocDeptId] = useState('dept-general');
  const [docQual, setDocQual] = useState('MBBS, MD');
  const [docExp, setDocExp] = useState('10');
  const [docFee, setDocFee] = useState('500');

  const handleDocPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // --- Hospital Management State ---
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // --- Customer Management State ---
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedCustomerModal, setSelectedCustomerModal] = useState<CustomerAccount | null>(null);

  // --- Financials State ---
  const [revenueDateFilter, setRevenueDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [hospitalRevenueSearch, setHospitalRevenueSearch] = useState('');
  const [selectedHospitalLedger, setSelectedHospitalLedger] = useState<any | null>(null);
  const [ledgerDateFilter, setLedgerDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // --- Overview Tab State ---
  const [quickNotifyModal, setQuickNotifyModal] = useState(false);
  const [quickNotifyTitle, setQuickNotifyTitle] = useState('');
  const [quickNotifyMessage, setQuickNotifyMessage] = useState('');

  const [liveAppointments, setLiveAppointments] = useState<any[]>([]);

  useEffect(() => {
    let url = `/api/admin/revenue?dateFilter=${revenueDateFilter}`;
    if (revenueDateFilter === 'custom' && customStartDate) {
      url += `&startDate=${customStartDate}&endDate=${customEndDate || new Date().toISOString().split('T')[0]}`;
    }

    fetch(url)
      .then(res => res.json())
      .catch(err => console.warn('Could not fetch live revenue from server:', err));

    fetch('/api/appointments')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.appointments)) {
          setLiveAppointments(data.appointments);
        }
      })
      .catch(err => console.warn('Could not fetch appointments from server:', err));
  }, [revenueDateFilter, customStartDate, customEndDate]);

  // Calculate token revenue & consultation volume across mock customers & live appointments
  const safeCustomers = customers || [];
  const safeAppointments = (liveAppointments.length > 0 ? liveAppointments : appointments) || [];
  const safeHospitals = hospitals || [];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const curMonth = todayStr.slice(0, 7);

  // Helper to filter appointment lists by date
  const filterByDateRange = (list: any[], filter: string, sDate?: string, eDate?: string) => {
    return list.filter(item => {
      const d = item.date || item.bookingDate || (item.createdAt ? item.createdAt.split('T')[0] : '');
      if (!d) return true;
      if (filter === 'today') return d === todayStr;
      if (filter === 'week') return d >= sevenDaysAgo && d <= todayStr;
      if (filter === 'month') return d.startsWith(curMonth);
      if (filter === 'custom') {
        if (sDate && d < sDate) return false;
        if (eDate && d > eDate) return false;
        return true;
      }
      return true; // 'all'
    });
  };

  // Filtered appointments for Financials tab
  const periodFilteredAppointments = filterByDateRange(safeAppointments, revenueDateFilter, customStartDate, customEndDate);

  // Token revenue: the actual platform booking fees collected online from tokens in selected period
  const periodTokenRevenue = periodFilteredAppointments.reduce((sum, a) => 
    sum + (Number(a?.platformFee) || Math.max(10, Math.round((Number(a?.fee) || 500) * (platformFeePercent / 100)))), 0);

  // Doctor consultation fees (payable directly at the hospital) in selected period
  const periodDoctorConsultationVolume = periodFilteredAppointments.reduce((sum, a) => 
    sum + (Number(a?.fee) || 500), 0);

  const totalTokenRevenue = periodTokenRevenue;
  const totalDoctorConsultationVolume = periodDoctorConsultationVolume;
  const totalCustomerTokens = periodFilteredAppointments.length;
  const avgRevenuePerCustomer = safeCustomers.length > 0 ? Math.round(totalTokenRevenue / safeCustomers.length) : 0;

  const activeHospitalsCount = safeHospitals.filter(h => h?.status !== 'disabled').length;
  const disabledHospitalsCount = safeHospitals.filter(h => h?.status === 'disabled').length;

  // Overview Today Metrics (strictly accurate from state)
  const todayAppointments = safeAppointments.filter(a => {
    const d = a.date || a.bookingDate || (a.createdAt ? a.createdAt.split('T')[0] : '');
    return d === todayStr;
  });
  const todayTokensCount = todayAppointments.length;
  const todayOnlineCount = todayAppointments.filter(a => !a.isWalkin).length;
  const todayWalkinCount = todayAppointments.filter(a => a.isWalkin).length;
  const todayConsultationSum = todayAppointments.reduce((sum, a) => sum + (Number(a.fee) || 500), 0);
  const todayCommissionSum = todayAppointments.reduce((sum, a) => sum + (Number(a.platformFee) || Math.max(10, Math.round((Number(a.fee) || 500) * (platformFeePercent / 100)))), 0);
  const todayWaitingCount = todayAppointments.filter(a => ['waiting', 'booked', 'checked-in'].includes(a.status)).length;
  const todayInCabinCount = todayAppointments.filter(a => ['in-cabin', 'in_consultation', 'consulting'].includes(a.status)).length;
  const todayCompletedCount = todayAppointments.filter(a => a.status === 'completed').length;
  const todayCancelledCount = todayAppointments.filter(a => ['cancelled', 'no-show', 'rejected'].includes(a.status)).length;
  const totalDoctorsCount = safeHospitals.reduce((acc, h) => acc + (h.doctors?.length || 0), 0);
  const totalCustomersCount = safeCustomers.length;

  const recentAppointments = [...safeAppointments].sort((a, b) => {
    const tA = new Date(a.createdAt || a.bookingDate || a.date || 0).getTime();
    const tB = new Date(b.createdAt || b.bookingDate || b.date || 0).getTime();
    return tB - tA;
  }).slice(0, 6);

  const handleCreateHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospName || !hospAddress || !hospContact) {
      alert("Please fill in hospital name, address and contact details");
      return;
    }
    
    addHospital({
      name: hospName,
      category: hospCat,
      city: hospCity || 'Adoni',
      area: hospArea || '',
      village: hospArea || '',
      address: hospAddress,
      about: hospAbout,
      contact: hospContact,
      timings: hospTimings,
      baseWaitingTime: 15,
      facilities: ["ICU", "Ambulance", "Pharmacy", "Diagnostic Lab"],
      gallery: [],
      departments: [
        { id: "dept-cardio", name: "Cardiology", icon: "Heart" },
        { id: "dept-neuro", name: "Neurology", icon: "Brain" },
        { id: "dept-ortho", name: "Orthopedics", icon: "Activity" },
        { id: "dept-pedia", name: "Pediatrics", icon: "Baby" },
        { id: "dept-gynaec", name: "Gynecology", icon: "Users" },
        { id: "dept-general", name: "General Medicine", icon: "Stethoscope" },
        { id: "dept-eye", name: "Ophthalmology", icon: "Eye" },
        { id: "dept-dental", name: "Dental", icon: "Smile" }
      ],
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400",
      lat: 12.93,
      lng: 77.62,
      status: 'active'
    });

    addNotification(
      "Hospital Registered",
      `${hospName} registered successfully with ${hospCommission}% platform commission.`,
      "success"
    );

    // Reset Form
    setHospName('');
    setHospCity('');
    setHospArea('');
    setHospAddress('');
    setHospAbout('');
    setHospContact('');
    setAdminTab('hospitals');
  };

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docSpecialty) {
      alert("Please fill in doctor name and specialty");
      return;
    }

    addDoctor(selectedHospId, {
      name: docName,
      specialty: docSpecialty,
      departmentId: docDeptId,
      qualification: docQual,
      experience: parseInt(docExp),
      consultationFee: parseInt(docFee),
      estimatedWaitPerPatient: 10,
      image: docPhoto || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
      availability: {
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"]
      }
    });

    addNotification(
      "Doctor Enrolled",
      `${docName} added to hospital roster successfully.`,
      "success"
    );

    // Reset Form
    setDocName('');
    setDocPhoto('');
    setDocSpecialty('');
    setAdminTab('hospitals');
  };

  // CSV Revenue Report Export Handler (Preserves existing feature with enhanced fields)
  const exportFinancialCSV = () => {
    const csvRows = [
      ["Token #", "Payment ID", "Hospital", "Hospital Location", "Doctor", "Department", "Patient Name", "Phone", "Doctor Fee (INR - Payable at Desk)", `Platform Token Revenue (INR - ${platformFeePercent}% Paid Online)`, "Payment Method", "Status", "Date & Time (IST)"]
    ];

    (periodFilteredAppointments || []).forEach(b => {
      const fee = Number(b.fee) || 500;
      const platFee = Number(b.platformFee) || Math.max(10, Math.round(fee * (platformFeePercent / 100)));
      const istDate = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(b.createdAt || Date.now()));

      csvRows.push([
        `"${b.tokenNumber || b.tokenNo || ''}"`,
        `"${b.paymentId || b.id || ''}"`,
        `"${b.hospitalName || ''}"`,
        `"${safeHospitals.find(h => h.id === b.hospitalId)?.address || ''}"`,
        `"${b.doctorName || ''}"`,
        `"${b.departmentName || ''}"`,
        `"${b.patientName || ''}"`,
        `"${b.phone || ''}"`,
        `"${fee}"`,
        `"${platFee}"`,
        `"${b.paymentMethod || 'Online'}"`,
        `"${b.status || 'Paid'}"`,
        `"${istDate}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `InstaToken_Revenue_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification("Report Downloaded", "Financial revenue CSV ledger downloaded successfully.", "success");
  };

  // Hospital Specific Ledger CSV Export
  const exportHospitalLedgerCSV = (hosp: any, hospBookings: any[]) => {
    const csvRows = [
      ["Hospital Ledger Report", `"${hosp.name}"`, `"${hosp.address || ''}"`],
      ["Generated At (IST)", `"${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}"`],
      [],
      ["Token #", "Transaction ID", "Patient Name", "Phone", "Doctor", "Department", "Doctor Consultation Fee (Payable at Hospital)", `Platform Token Revenue (${platformFeePercent}% Paid Online)`, "Payment Method", "Status", "Date & Time (IST)"]
    ];

    hospBookings.forEach(b => {
      const fee = Number(b.fee) || 500;
      const platFee = Number(b.platformFee) || Math.max(10, Math.round(fee * (platformFeePercent / 100)));
      const istDate = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(b.createdAt || Date.now()));

      csvRows.push([
        `"${b.tokenNumber || b.tokenNo || ''}"`,
        `"${b.paymentId || b.id || ''}"`,
        `"${b.patientName || ''}"`,
        `"${b.phone || b.patientPhone || ''}"`,
        `"${b.doctorName || ''}"`,
        `"${b.departmentName || ''}"`,
        `"${fee}"`,
        `"${platFee}"`,
        `"${b.paymentMethod || 'Online'}"`,
        `"${b.status || 'Paid'}"`,
        `"${istDate}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${hosp.name.replace(/[^a-zA-Z0-9]/g, '_')}_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification("Ledger Exported", `${hosp.name} revenue ledger CSV downloaded successfully.`, "success");
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* ── LEFT NAVIGATION SIDEBAR (Desktop) ───────────────────────────── */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-5 text-white h-full justify-between shrink-0 overflow-y-auto">
        <div className="space-y-6">
          {/* Logo brand block */}
          <div className="flex items-center gap-2.5 px-2 py-1 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none font-heading text-white">InstaToken</h1>
              <span className="text-[9px] text-blue-400 font-extrabold uppercase mt-0.5 block tracking-wider">Super Admin Portal</span>
            </div>
          </div>

          {/* Navigation link list */}
          <div className="space-y-1 pt-2">
            <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest px-3 py-1">Overview</p>
            <button
              onClick={() => setAdminTab('stats')}
              className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer border-none ${
                adminTab === 'stats' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard size={15} /> System Analytics
            </button>
            
            <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest px-3 py-1 pt-2">Management</p>
            <button
              onClick={() => setAdminTab('hospitals')}
              className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer border-none ${
                adminTab === 'hospitals' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 size={15} /> Manage Hospitals
              </div>
              <span className="bg-slate-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full text-blue-400">
                {hospitals.length}
              </span>
            </button>

            <button
              onClick={() => setAdminTab('customers')}
              className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer border-none ${
                adminTab === 'customers' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={15} /> Manage Customers
              </div>
              <span className="bg-slate-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full text-emerald-400">
                {customers.length}
              </span>
            </button>

            <button
              onClick={() => setAdminTab('financials')}
              className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer border-none ${
                adminTab === 'financials' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign size={15} /> Revenue & Payments
              </div>
              <span className="bg-emerald-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-full text-emerald-300">
                Live
              </span>
            </button>

            <button
              onClick={() => setAdminTab('banners')}
              className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer border-none ${
                adminTab === 'banners' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin size={15} /> Location Banners
              </div>
              <span className="bg-blue-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-full text-blue-300">
                Geo
              </span>
            </button>

            <button
              onClick={() => setAdminTab('ads-inquiries')}
              className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer border-none ${
                adminTab === 'ads-inquiries' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Megaphone size={15} /> Ads Inquiries
              </div>
              <span className="bg-amber-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-full text-amber-300">
                Hospital
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Operator Footer */}
        <div className="space-y-2 pt-4">
          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-800 text-[10px] text-slate-400">
            <span className="font-extrabold text-white flex items-center gap-1.5 mb-0.5 text-xs">
              <ShieldCheck size={14} className="text-blue-500" />
              Super Admin Level 1
            </span>
            anilajay1999@gmail.com
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => { logout(); navigate('/admin'); }}
            className="w-full py-2 bg-red-900/40 border-red-800/60 hover:bg-red-800/60 text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut size={13} /> Logout
          </Button>
        </div>
      </div>

      {/* ── RIGHT COLUMN (Header on mobile + Scrollable Main Content) ───── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* ── MOBILE HEADER (Mobile Only) ─────────────────────────────────── */}
        <div className="md:hidden flex flex-col w-full bg-slate-900 text-white shrink-0">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-base font-black tracking-tight">Super Admin Panel</h2>
                <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">InstaToken Central</p>
              </div>
            </div>
            <Badge variant="blue" className="bg-blue-500/20 text-blue-400 border-none py-1">
              Super Admin
            </Badge>
          </div>

          {/* Mobile Nav Tabs */}
          <div className="flex overflow-x-auto px-2 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider no-scrollbar">
            {(['stats', 'hospitals', 'customers', 'banners', 'ads-inquiries', 'financials'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                className={`px-3 py-3 border-b-2 whitespace-nowrap cursor-pointer ${
                  adminTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400'
                }`}
              >
                {tab === 'stats' ? 'Overview' : tab === 'hospitals' ? 'Hospitals' : tab === 'customers' ? 'Customers' : tab === 'banners' ? 'Banners' : tab === 'ads-inquiries' ? 'Ads Inquiries' : 'Revenue'}
              </button>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT SCROLLABLE AREA ────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 w-full">
          <div className="max-w-[1400px] mx-auto w-full space-y-6 pb-24">
        
        {/* ── TAB 1: SYSTEM OVERVIEW (MATCHING IMAGE COPY 76.PNG) ────── */}
        {adminTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bar Header with Actions & Date Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Super Admin Dashboard</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage and monitor the entire InstaToken healthcare network.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setAdminTab('add-hospital')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors border-none"
                >
                  <Plus size={14} /> Add Hospital
                </button>
                <button
                  onClick={() => setAdminTab('add-doctor')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors border-none"
                >
                  <Stethoscope size={14} /> Enroll Doctor
                </button>
                <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</span>
                  <ChevronDown size={13} className="text-slate-400" />
                </div>
              </div>
            </div>

            {/* 6 Top KPI Cards (100% Dynamic Live Platform Metrics) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* 1. Total Hospitals */}
              <Card className="p-4 border-none shadow-xs bg-white rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    disabledHospitalsCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {activeHospitalsCount} Active
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Total Hospitals</span>
                  <span className="text-2xl font-black text-slate-900 font-heading block mt-0.5">{safeHospitals.length}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] font-semibold text-slate-500">
                  <span>{disabledHospitalsCount > 0 ? `${disabledHospitalsCount} Inactive / Paused` : 'All Partner Hospitals Active'}</span>
                </div>
              </Card>

              {/* 2. Total Doctors */}
              <Card className="p-4 border-none shadow-xs bg-white rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Stethoscope size={16} />
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Live
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Total Doctors</span>
                  <span className="text-2xl font-black text-slate-900 font-heading block mt-0.5">{totalDoctorsCount}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] font-semibold text-slate-500">
                  <span>Across {safeHospitals.length} network hospitals</span>
                </div>
              </Card>

              {/* 3. Total Patients */}
              <Card className="p-4 border-none shadow-xs bg-white rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                    Registered
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Total Patients</span>
                  <span className="text-2xl font-black text-slate-900 font-heading block mt-0.5">{totalCustomersCount.toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] font-semibold text-slate-500">
                  <span>Verified patient user accounts</span>
                </div>
              </Card>

              {/* 4. Tokens Booked Today */}
              <Card className="p-4 border-none shadow-xs bg-white rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    Today
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Tokens Today</span>
                  <span className="text-2xl font-black text-slate-900 font-heading block mt-0.5">{todayTokensCount.toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] font-semibold text-slate-500">
                  <span>{todayOnlineCount} Online App · {todayWalkinCount} Walk-in</span>
                </div>
              </Card>

              {/* 5. Today's Revenue */}
              <Card className="p-4 border-none shadow-xs bg-white rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                    ₹
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Gross
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Today's Revenue</span>
                  <span className="text-2xl font-black text-slate-900 font-heading block mt-0.5">₹{(todayConsultationSum + todayCommissionSum).toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] font-semibold text-slate-500">
                  <span>Consultations + token fees</span>
                </div>
              </Card>

              {/* 6. Platform Commission */}
              <Card className="p-4 border-none shadow-xs bg-white rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-sm">
                    %
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                    Net Fee
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Platform Earnings</span>
                  <span className="text-2xl font-black text-slate-900 font-heading block mt-0.5">₹{todayCommissionSum.toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] font-semibold text-slate-500">
                  <span>{platformFeePercent}% Platform booking cut</span>
                </div>
              </Card>
            </div>

            {/* Split Row: Live Platform Activity Stream (Left 8 cols) + Super Admin Hub & Infrastructure (Right 4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Live Platform Activity Stream (8 cols) */}
              <div className="lg:col-span-8">
                <Card className="p-5 border-none shadow-xs bg-white rounded-2xl flex flex-col justify-between h-full">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity size={16} className="text-blue-600" />
                          <h3 className="text-sm font-black text-slate-800 tracking-tight">Live Platform Activity Stream</h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 animate-pulse">
                            Real-time
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          Latest patient token bookings across the network
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={exportFinancialCSV}
                          className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 border border-slate-200 px-2.5 py-1.5 rounded-xl cursor-pointer bg-white transition-colors"
                        >
                          <Download size={13} /> Export CSV
                        </button>
                        <button
                          onClick={() => setAdminTab('financials')}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl cursor-pointer border-none transition-colors"
                        >
                          View All Tokens →
                        </button>
                      </div>
                    </div>

                    {/* Live Stream List */}
                    {recentAppointments.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <Activity size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-bold text-slate-600">No token activity recorded yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Tokens booked by patients or hospital counters will stream here in real time.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 mt-2">
                        {recentAppointments.map((appt: any, idx: number) => {
                          const patientName = appt.patientName || appt.userName || 'Walk-in Patient';
                          const hospName = appt.hospitalName || 'Network Hospital';
                          const docName = appt.doctorName || 'Doctor';
                          const tokenNum = appt.tokenNumber || appt.token || `#${idx + 1}`;
                          const isWalkin = Boolean(appt.isWalkin);
                          const fee = Number(appt.fee) || 500;
                          const platformFee = Number(appt.platformFee) || Math.max(10, Math.round(fee * (platformFeePercent / 100)));
                          const apptDate = appt.date || appt.bookingDate || (appt.createdAt ? appt.createdAt.split('T')[0] : 'Today');
                          const apptTime = appt.time || (appt.session ? `${appt.session.toUpperCase()} Session` : 'Scheduled');
                          const status = appt.status || 'booked';

                          const statusBadgeClass = 
                            status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ['in-cabin', 'in_consultation', 'consulting'].includes(status)
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : ['cancelled', 'no-show'].includes(status)
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200';

                          return (
                            <div key={appt.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 px-2 rounded-xl transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                  {tokenNum}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-xs text-slate-800 truncate">{patientName}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                      isWalkin ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'
                                    }`}>
                                      {isWalkin ? 'Counter' : 'Online App'}
                                    </span>
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border uppercase ${statusBadgeClass}`}>
                                      {status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                    {docName} · <span className="font-semibold text-slate-700">{hospName}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-right">
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold">{apptDate}</p>
                                  <p className="text-[11px] font-extrabold text-slate-700">{apptTime}</p>
                                </div>
                                <div className="min-w-[70px]">
                                  <span className="text-xs font-black text-slate-900 block">₹{fee}</span>
                                  <span className="text-[10px] font-bold text-rose-600 block">Cut: ₹{platformFee}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Showing latest {Math.min(recentAppointments.length, 6)} token records</span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Network Feed
                    </span>
                  </div>
                </Card>
              </div>

              {/* Right Column: Super Admin Hub & Infrastructure (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Super Admin Quick Operations Hub */}
                <Card className="p-5 border-none shadow-xs bg-white rounded-2xl">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight mb-3">Quick Platform Operations</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setAdminTab('add-hospital')}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Add Hospital</span>
                    </button>

                    <button
                      onClick={() => setAdminTab('add-doctor')}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Stethoscope size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Enroll Doctor</span>
                    </button>

                    <button
                      onClick={() => setQuickNotifyModal(true)}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Send size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Broadcast Alert</span>
                    </button>

                    <button
                      onClick={() => setAdminTab('banners')}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MapPin size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Location Banners</span>
                    </button>

                    <button
                      onClick={() => setAdminTab('financials')}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Settlements</span>
                    </button>

                    <button
                      onClick={() => setAdminTab('ads-inquiries')}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Megaphone size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Ad Inquiries</span>
                    </button>
                  </div>
                </Card>

                {/* Infrastructure & Network Health Card */}
                <Card className="p-5 border-none shadow-xs bg-white rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">Platform Infrastructure</h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Healthy
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Database (PostgreSQL RDS)</span>
                      <strong className="text-emerald-700 font-extrabold flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" /> Connected
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Platform Commission Rate</span>
                      <strong className="text-slate-800 font-extrabold">{platformFeePercent}% Per Booking</strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Network Active Hospitals</span>
                      <strong className="text-slate-800 font-extrabold">{activeHospitalsCount} of {safeHospitals.length}</strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Total Registered Doctors</span>
                      <strong className="text-slate-800 font-extrabold">{totalDoctorsCount} Specialists</strong>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Recent Hospitals Table (Matching Image 76) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Recent Hospitals</h3>
                  <p className="text-xs text-slate-400 font-semibold">Active healthcare partners and token activity</p>
                </div>
                <button
                  onClick={() => setAdminTab('hospitals')}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-transparent border-none"
                >
                  View All Hospitals →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Hospital Name</th>
                      <th className="px-5 py-3.5">City, Village & Area</th>
                      <th className="px-5 py-3.5 text-center">Doctors</th>
                      <th className="px-5 py-3.5 text-center">Today's Tokens</th>
                      <th className="px-5 py-3.5">Revenue</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Joined Date</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeHospitals.slice(0, 5).map((hosp) => {
                      const hospAppts = safeAppointments.filter(a => a.hospitalId === hosp.id || a.hospitalName === hosp.name);
                      const rev = hospAppts.reduce((sum, a) => sum + (Number(a.fee) || 0), 0);
                      const displayRev = rev;
                      const displayTokens = hospAppts.length;
                      const isDisabled = hosp.status === 'disabled';

                      return (
                        <tr key={hosp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={hosp.image || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80"}
                                alt={hosp.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                              />
                              <div>
                                <p className="font-extrabold text-slate-800 text-xs">{hosp.name}</p>
                                <span className="text-[10px] text-blue-600 font-semibold">{hosp.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                              <MapPin size={12} className="text-blue-500 shrink-0" />
                              <span className="font-extrabold text-slate-800">{getHospitalLocationDisplay(hosp)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold text-slate-700">
                            {hosp.doctors?.length || 0}
                          </td>
                          <td className="px-5 py-3.5 text-center font-black text-slate-900">
                            {displayTokens}
                          </td>
                          <td className="px-5 py-3.5 font-black text-emerald-600">
                            ₹{displayRev.toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block ${
                              isDisabled ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isDisabled ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-[11px] font-medium">
                            {(hosp as any).joinedDate || (hosp as any).created_at?.split('T')[0] || 'Active'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedHospitalLedger(hosp);
                                setAdminTab('financials');
                              }}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl cursor-pointer border-none transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom 2-Column Row: Queue Throughput & Fulfillment + Patient Network & Channel Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Today's Queue Throughput & Fulfillment (6 cols) */}
              <div className="lg:col-span-6">
                <Card className="p-5 border-none shadow-xs bg-white rounded-2xl h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">Today's Queue Throughput</h3>
                      <p className="text-xs text-slate-400 font-semibold">Live patient visit progression across all partner clinics</p>
                    </div>
                    <button
                      onClick={() => setAdminTab('financials')}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none"
                    >
                      View All Tokens →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-amber-700 block uppercase">Waiting</span>
                      <p className="text-xl font-black text-amber-900">{todayWaitingCount}</p>
                      <span className="text-[10px] font-semibold text-slate-500">In OPD Queue</span>
                    </div>

                    <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-blue-700 block uppercase">In Cabin</span>
                      <p className="text-xl font-black text-blue-900">{todayInCabinCount}</p>
                      <span className="text-[10px] font-semibold text-slate-500">Currently Consulting</span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 block uppercase">Completed</span>
                      <p className="text-xl font-black text-emerald-900">{todayCompletedCount}</p>
                      <span className="text-[10px] font-semibold text-slate-500">Finished Today</span>
                    </div>

                    <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-rose-700 block uppercase">Cancelled</span>
                      <p className="text-xl font-black text-rose-900">{todayCancelledCount}</p>
                      <span className="text-[10px] font-semibold text-slate-500">No-show / Revoked</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                      <span>Queue Completion Progress</span>
                      <span>
                        {todayTokensCount > 0 ? Math.round((todayCompletedCount / todayTokensCount) * 100) : 100}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${todayTokensCount > 0 ? (todayCompletedCount / todayTokensCount) * 100 : 100}%` }}
                        title={`Completed: ${todayCompletedCount}`}
                      />
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{ width: `${todayTokensCount > 0 ? (todayWaitingCount / todayTokensCount) * 100 : 0}%` }}
                        title={`Waiting: ${todayWaitingCount}`}
                      />
                      <div
                        className="bg-rose-400 h-full transition-all"
                        style={{ width: `${todayTokensCount > 0 ? (todayCancelledCount / todayTokensCount) * 100 : 0}%` }}
                        title={`Cancelled: ${todayCancelledCount}`}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Patient Network & Channel Distribution (6 cols) */}
              <div className="lg:col-span-6">
                <Card className="p-5 border-none shadow-xs bg-white rounded-2xl h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">Patient Network & Channel Distribution</h3>
                      <p className="text-xs text-slate-400 font-semibold">Registered users & online app vs walk-in counter mix</p>
                    </div>
                    <button
                      onClick={() => setAdminTab('customers')}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none"
                    >
                      View All Customers →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-purple-700 block uppercase">Patients</span>
                      <p className="text-xl font-black text-purple-900">{totalCustomersCount.toLocaleString('en-IN')}</p>
                      <span className="text-[10px] font-semibold text-slate-500">Total User Base</span>
                    </div>

                    <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-blue-700 block uppercase">App Tokens</span>
                      <p className="text-xl font-black text-blue-900">{todayOnlineCount}</p>
                      <span className="text-[10px] font-semibold text-slate-500">Booked on Mobile</span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 block uppercase">Counter</span>
                      <p className="text-xl font-black text-emerald-900">{todayWalkinCount}</p>
                      <span className="text-[10px] font-semibold text-slate-500">Hospital Walk-ins</span>
                    </div>

                    <div className="p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-indigo-700 block uppercase">App Share</span>
                      <p className="text-xl font-black text-indigo-900">
                        {todayTokensCount > 0 ? Math.round((todayOnlineCount / todayTokensCount) * 100) : 0}%
                      </p>
                      <span className="text-[10px] font-semibold text-slate-500">Digital Adoption</span>
                    </div>
                  </div>

                  {/* Channel split bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                      <span>Today's Channel Split</span>
                      <span>
                        {todayOnlineCount} Online ({todayTokensCount > 0 ? Math.round((todayOnlineCount / todayTokensCount) * 100) : 0}%) vs {todayWalkinCount} Counter ({todayTokensCount > 0 ? Math.round((todayWalkinCount / todayTokensCount) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${todayTokensCount > 0 ? (todayOnlineCount / todayTokensCount) * 100 : 50}%` }}
                        title={`Online: ${todayOnlineCount}`}
                      />
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${todayTokensCount > 0 ? (todayWalkinCount / todayTokensCount) * 100 : 50}%` }}
                        title={`Walk-in: ${todayWalkinCount}`}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Quick Send Notification Modal */}
            {quickNotifyModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-black text-slate-800 text-sm">Send Broadcast Notification</h3>
                    <button onClick={() => setQuickNotifyModal(false)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase">Notification Title</label>
                      <input
                        type="text"
                        placeholder="e.g. System Maintenance or OPD Holiday Alert"
                        value={quickNotifyTitle}
                        onChange={e => setQuickNotifyTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-1 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase">Message</label>
                      <textarea
                        rows={3}
                        placeholder="Write message for doctors and patients..."
                        value={quickNotifyMessage}
                        onChange={e => setQuickNotifyMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-1 outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={() => setQuickNotifyModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (!quickNotifyTitle || !quickNotifyMessage) return;
                        addNotification(quickNotifyTitle, quickNotifyMessage, 'info');
                        setQuickNotifyModal(false);
                        setQuickNotifyTitle('');
                        setQuickNotifyMessage('');
                      }}
                    >
                      Broadcast Message
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: HOSPITALS ROSTER (MANAGE HOSPITALS) ──────────────── */}
        {adminTab === 'hospitals' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div>
                <h2 className="text-xl font-black text-slate-800">Manage Partner Hospitals</h2>
                <p className="text-xs text-slate-400 font-semibold">View hospital accounts, locations, contact details, doctors, and disable/enable hospital access</p>
              </div>
              <button
                onClick={() => setAdminTab('add-hospital')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer border-none"
              >
                <Plus size={14} /> Register New Hospital
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search hospital name, address, contact..."
                  value={hospitalSearch}
                  onChange={e => setHospitalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHospitalStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    hospitalStatusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All ({hospitals.length})
                </button>
                <button
                  onClick={() => setHospitalStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    hospitalStatusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Active ({activeHospitalsCount})
                </button>
                <button
                  onClick={() => setHospitalStatusFilter('disabled')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    hospitalStatusFilter === 'disabled' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Disabled ({disabledHospitalsCount})
                </button>
              </div>
            </div>

            {/* Hospital Roster Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Hospital</th>
                      <th className="px-4 py-3.5">Contact Details</th>
                      <th className="px-4 py-3.5">City, Village & Area</th>
                      <th className="px-4 py-3.5">Call Option</th>
                      <th className="px-4 py-3.5">Doctors & Fee</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {hospitals
                      .filter(h => {
                        const matchesSearch = h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) || 
                          (h.address && h.address.toLowerCase().includes(hospitalSearch.toLowerCase())) ||
                          (h.contact && h.contact.includes(hospitalSearch)) ||
                          (h.email && h.email.toLowerCase().includes(hospitalSearch.toLowerCase()));
                        const isCurrentlyDisabled = h.status === 'disabled';
                        if (hospitalStatusFilter === 'active') return matchesSearch && !isCurrentlyDisabled;
                        if (hospitalStatusFilter === 'disabled') return matchesSearch && isCurrentlyDisabled;
                        return matchesSearch;
                      })
                      .map((hosp) => {
                        const isDisabled = hosp.status === 'disabled';
                        const hospEmail = hosp.email || (hosp as any).data?.email || (hosp.id === 'hosp-apollo' ? 'info@instatoken.in' : 'contact@hospital.com');
                        const hospPhone = hosp.phone || hosp.contact || (hosp as any).data?.phone || '+91 80 4668 8888';

                        return (
                          <tr key={hosp.id} className={`transition-colors ${isDisabled ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'}`}>
                            {/* Hospital Image & Name */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={hosp.image || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80"} 
                                  alt={hosp.name} 
                                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs" 
                                />
                                <div>
                                  <p className="font-extrabold text-slate-800 text-sm leading-tight">{hosp.name}</p>
                                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] inline-block mt-1">
                                    {hosp.category}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Email & Phone */}
                            <td className="px-4 py-3.5">
                              <div className="space-y-1">
                                <a 
                                  href={`mailto:${hospEmail}`} 
                                  className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 font-bold text-xs transition-colors"
                                  title={`Email ${hosp.name}`}
                                >
                                  <Mail size={12} className="text-blue-500 shrink-0" />
                                  <span className="truncate max-w-[180px]">{hospEmail}</span>
                                </a>
                                <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                                  <Phone size={12} className="text-emerald-500 shrink-0" />
                                  <span>{hospPhone}</span>
                                </div>
                              </div>
                            </td>

                            {/* City, Village & Area */}
                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5 max-w-[240px]">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                                  <MapPin size={13} className="text-rose-500 shrink-0" />
                                  <span>{getHospitalLocationDisplay(hosp)}</span>
                                </div>
                                {hosp.address && (
                                  <span className="text-[10px] text-slate-400 block truncate pl-4.5">
                                    {hosp.address}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Call Button Option */}
                            <td className="px-4 py-3.5">
                              <a 
                                href={`tel:${hospPhone.replace(/\s+/g, '')}`} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all no-underline"
                                title={`Direct Phone Call to ${hosp.name}`}
                              >
                                <PhoneCall size={12} />
                                <span>Call Hospital</span>
                              </a>
                            </td>

                            {/* Doctors & Commission */}
                            <td className="px-4 py-3.5">
                              <p className="font-black text-blue-600 text-xs">
                                {(hosp.doctors || []).length} Doctors
                              </p>
                              <p className="font-bold text-emerald-600 text-[10px]">
                                {platformFeePercent}% Platform Fee
                              </p>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5">
                              {isDisabled ? (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                                  <AlertTriangle size={11} className="text-amber-600" /> Disabled
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                                  <CheckCircle2 size={11} /> Verified Active
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => toggleDisableHospital(hosp.id)}
                                  className={`text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer border-none shadow-2xs ${
                                    isDisabled 
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                >
                                  {isDisabled ? 'Enable' : 'Disable'}
                                </button>
                                <button
                                  onClick={() => setHospitalToDelete(hosp)}
                                  className="text-xs font-extrabold px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                  title="Permanently Delete Hospital"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: MANAGE CUSTOMERS ──────────────────────────────────── */}
        {adminTab === 'customers' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div>
                <h2 className="text-xl font-black text-slate-800">Manage Customer Accounts</h2>
                <p className="text-xs text-slate-400 font-semibold">View customer profile details, token booking history, and total hospitals visited</p>
              </div>
              <Badge variant="blue" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-3 py-1 font-extrabold w-fit">
                {customers.length} Registered Customers
              </Badge>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total Customer Accounts</span>
                <span className="text-3xl font-black text-slate-800 font-heading block mt-1">{customers.length}</span>
                <span className="text-[9px] text-emerald-600 font-extrabold block mt-1">All verified profiles</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total Tokens Booked</span>
                <span className="text-3xl font-black text-blue-600 font-heading block mt-1">{totalCustomerTokens}</span>
                <span className="text-[9px] text-blue-600 font-semibold block mt-1">Active + Past Tokens</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total Customer Visits</span>
                <span className="text-3xl font-black text-purple-600 font-heading block mt-1">
                  {customers.reduce((sum, c) => {
                    const uniqueHosps = new Set((c.bookings || []).map(b => b.hospitalId));
                    return sum + uniqueHosps.size;
                  }, 0)}
                </span>
                <span className="text-[9px] text-purple-600 font-semibold block mt-1">Hospitals Visited Globally</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Avg Spend / Customer</span>
                <span className="text-3xl font-black text-emerald-600 font-heading block mt-1">₹{avgRevenuePerCustomer.toLocaleString()}</span>
                <span className="text-[9px] text-slate-400 font-semibold block mt-1">Gross Token Spending</span>
              </Card>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer name, phone, email, or city..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCustomerStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    customerStatusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All ({customers.length})
                </button>
                <button
                  onClick={() => setCustomerStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    customerStatusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Active ({customers.filter(c => c.status === 'active').length})
                </button>
                <button
                  onClick={() => setCustomerStatusFilter('suspended')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    customerStatusFilter === 'suspended' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Suspended ({customers.filter(c => c.status === 'suspended').length})
                </button>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Customer Account</th>
                      <th className="px-4 py-3">Contact Details</th>
                      <th className="px-4 py-3">Tokens Booked</th>
                      <th className="px-4 py-3">Hospitals Visited</th>
                      <th className="px-4 py-3">Total Customer Spend</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {customers
                      .filter(c => {
                        const matchesSearch = c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.phone.includes(customerSearch) ||
                          c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.location.toLowerCase().includes(customerSearch.toLowerCase());
                        if (customerStatusFilter === 'active') return matchesSearch && c.status === 'active';
                        if (customerStatusFilter === 'suspended') return matchesSearch && c.status === 'suspended';
                        return matchesSearch;
                      })
                      .map((cust) => {
                        const uniqueHospitalsCount = new Set((cust.bookings || []).map(b => b.hospitalId)).size;
                        const customerSpendTotal = (cust.bookings || []).reduce((sum, b) => sum + (b?.fee || 0), 0);

                        return (
                          <tr key={cust.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={cust.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"} 
                                  alt={cust.name} 
                                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200" 
                                />
                                <div>
                                  <p className="font-extrabold text-slate-800 leading-none">{cust.name}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{cust.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-700">{cust.phone}</p>
                              <p className="text-[10px] text-slate-400">{cust.location}</p>
                            </td>
                            <td className="px-4 py-3 font-extrabold text-blue-600">
                              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-xl text-xs">
                                {(cust.bookings || []).length} Tokens
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-purple-50 text-purple-700 font-black px-2.5 py-1 rounded-xl text-xs">
                                🏥 {uniqueHospitalsCount} Hospitals
                              </span>
                            </td>
                            <td className="px-4 py-3 font-extrabold text-emerald-600">
                              ₹{customerSpendTotal.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              {cust.status === 'suspended' ? (
                                <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                  <UserX size={10} /> Suspended
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                  <UserCheck size={10} /> Active Patient
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => setSelectedCustomerModal(cust)}
                                className="text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer border-none"
                              >
                                View Tokens & History
                              </button>
                              <button
                                onClick={() => toggleCustomerStatus(cust.id)}
                                className={`text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer border-none ${
                                  cust.status === 'suspended'
                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {cust.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



        {/* ── TAB 5: FINANCIALS & REVENUE (HOSPITAL-WISE & DATE-WISE) ── */}
        {adminTab === 'financials' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Date Range Filters Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Revenue & Payments Overview</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Hospital-wise booking breakdown, platform commission tracking & date-filtered settlements
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Date Filter Pills */}
                <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold">
                  {(['all', 'today', 'week', 'month', 'custom'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setRevenueDateFilter(f)}
                      className={`px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all ${
                        revenueDateFilter === f ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Inputs */}
                {revenueDateFilter === 'custom' && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs font-bold">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-700 outline-none text-xs"
                      title="Start Date"
                    />
                    <span className="text-slate-400 font-bold">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-700 outline-none text-xs"
                      title="End Date"
                    />
                  </div>
                )}

                <button
                  onClick={exportFinancialCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all border-none"
                >
                  <Download size={14} /> Export Revenue CSV
                </button>
              </div>
            </div>

            {/* Platform Fee Configuration & Headline Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Platform Fee Percentage Controller */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Platform Booking Fee</span>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{platformFeePercent}%</span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold mt-1">
                    Charged on every online OPD token booking across all hospitals.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={platformFeePercent}
                    onChange={(e) => setPlatformFeePercent(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>1%</span>
                    <span>Standard: 5%</span>
                    <span>20%</span>
                  </div>
                  <div className="p-2.5 bg-blue-50/70 rounded-xl text-[11px] text-blue-800 font-bold leading-tight">
                    💡 On ₹1,000 doctor fee, platform collects ₹{Math.round(1000 * (platformFeePercent / 100))}.
                  </div>
                </div>
              </div>

              {/* Total Platform Token Revenue (5%) */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-lg shadow-blue-500/20 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Platform Token Revenue</p>
                    <span className="text-[9px] font-black bg-blue-500/40 text-white px-2 py-0.5 rounded-full">Paid Online</span>
                  </div>
                  <div className="text-3xl font-black font-heading mt-2">
                    ₹{totalTokenRevenue.toLocaleString('en-IN')}
                  </div>
                </div>
                <p className="text-[11px] text-blue-200 font-medium">Net platform revenue collected online via Razorpay (@ {platformFeePercent}%)</p>
              </div>

              {/* Gross Doctor Consultation Volume */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg shadow-emerald-500/20 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Doctor Consultation Volume</p>
                    <span className="text-[9px] font-black bg-emerald-500/40 text-white px-2 py-0.5 rounded-full">Pay at Hospital</span>
                  </div>
                  <div className="text-3xl font-black font-heading mt-2">
                    ₹{totalDoctorConsultationVolume.toLocaleString('en-IN')}
                  </div>
                </div>
                <p className="text-[11px] text-emerald-200 font-medium">Doctor consultation amounts booked (Payable directly at hospital OPD desk)</p>
              </div>

              {/* Total Tokens Count */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-2 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tokens Issued</p>
                  <div className="text-3xl font-black text-purple-600 font-heading mt-2">{totalCustomerTokens}</div>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold">Across {safeHospitals.length} partner hospitals for selected period</p>
              </div>
            </div>

            {/* ── HOSPITAL-WISE REVENUE & BOOKING OVERVIEW TABLE ───────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Hospital-wise Revenue & Booking Overview</h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    Compare token bookings, doctor collections, and InstaToken platform revenue per hospital for selected period
                  </p>
                </div>

                {/* Hospital Search Filter */}
                <div className="relative min-w-[260px]">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search hospital name or city..."
                    value={hospitalRevenueSearch}
                    onChange={e => setHospitalRevenueSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Hospital Name & Location</th>
                      <th className="px-5 py-3.5 text-center">Bookings / Tokens</th>
                      <th className="px-5 py-3.5">Doctor Consultation Volume</th>
                      <th className="px-5 py-3.5">Platform Token Revenue</th>
                      <th className="px-5 py-3.5 text-center">Platform Fee %</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeHospitals
                      .filter(h => {
                        if (!hospitalRevenueSearch) return true;
                        const q = hospitalRevenueSearch.toLowerCase();
                        return (h.name && h.name.toLowerCase().includes(q)) || 
                               (h.address && h.address.toLowerCase().includes(q));
                      })
                      .map((hosp) => {
                        const hospAppts = periodFilteredAppointments.filter(a => 
                          a.hospitalId === hosp.id || 
                          (a.hospitalName && hosp.name && a.hospitalName.toLowerCase() === hosp.name.toLowerCase())
                        );

                        const tokenCount = hospAppts.length;
                        const docConsultationTotal = hospAppts.reduce((sum, a) => sum + (Number(a.fee) || 500), 0);
                        const platRevenueTotal = hospAppts.reduce((sum, a) => 
                          sum + (Number(a.platformFee) || Math.max(10, Math.round((Number(a.fee) || 500) * (platformFeePercent / 100)))), 0);

                        const isDisabled = hosp.status === 'disabled';

                        return (
                          <tr 
                            key={hosp.id} 
                            onClick={() => setSelectedHospitalLedger(hosp)}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                          >
                            {/* Hospital Name & Location */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={hosp.image || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80"}
                                  alt={hosp.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                                <div>
                                  <p className="font-extrabold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{hosp.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                    <MapPin size={11} className="text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[200px]">{hosp.address || 'Location on file'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Bookings / Tokens */}
                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700">
                                {tokenCount} tokens
                              </span>
                            </td>

                            {/* Doctor Consultation Volume */}
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-black text-slate-900 text-sm">
                                  ₹{docConsultationTotal.toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] font-bold text-slate-400">
                                  Payable at Hospital Counter
                                </span>
                              </div>
                            </td>

                            {/* Platform Token Revenue */}
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-black text-blue-600 text-sm">
                                  ₹{platRevenueTotal.toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Paid Online via InstaToken
                                </span>
                              </div>
                            </td>

                            {/* Applicable Fee % */}
                            <td className="px-5 py-4 text-center">
                              <span className="font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
                                {platformFeePercent}%
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block ${
                                isDisabled ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isDisabled ? 'Disabled' : 'Active'}
                              </span>
                            </td>

                            {/* Action Button */}
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedHospitalLedger(hosp);
                                }}
                                className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-xl cursor-pointer border border-blue-200 transition-all flex items-center gap-1 ml-auto"
                              >
                                <Eye size={12} />
                                <span>View Ledger</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Transaction & Payment Audit Log Table (IST Timezone) */}
            <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Live Payment & Revenue Audit Trail (IST Timezone)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Real-time transaction logs showing hospital details, patient info, doctor fees, and platform booking revenue in Indian Standard Time
                  </p>
                </div>
                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                  Asia/Kolkata (IST)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Txn & Token ID</th>
                      <th className="py-2.5 px-3">Hospital & Location</th>
                      <th className="py-2.5 px-3">Doctor & Dept</th>
                      <th className="py-2.5 px-3">Patient Customer</th>
                      <th className="py-2.5 px-3">Doctor Fee / Platform Fee</th>
                      <th className="py-2.5 px-3">Method & Status</th>
                      <th className="py-2.5 px-3 text-right">Date & Time (IST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {periodFilteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                          No transaction records found for the selected date range. New token bookings will appear here instantly.
                        </td>
                      </tr>
                    ) : (
                      periodFilteredAppointments.map((appt) => {
                        const fee = Number(appt.fee) || 500;
                        const platFee = Number(appt.platformFee) || Math.max(10, Math.round(fee * (platformFeePercent / 100)));

                        const istDate = new Intl.DateTimeFormat('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }).format(new Date(appt.createdAt || Date.now()));

                        return (
                          <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors font-medium">
                            {/* Txn ID */}
                            <td className="py-3 px-3">
                              <p className="font-mono font-bold text-slate-900">{appt.paymentId || `TXN-${appt.id}`}</p>
                              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                #{appt.tokenNumber || appt.tokenNo}
                              </span>
                            </td>

                            {/* Hospital & Location */}
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800">{appt.hospitalName}</p>
                              <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[180px]">
                                {safeHospitals.find(h => h.id === appt.hospitalId)?.address || 'Koramangala, Bengaluru'}
                              </p>
                            </td>

                            {/* Doctor & Dept */}
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800">{appt.doctorName}</p>
                              <span className="text-[10px] text-blue-600 font-semibold">{appt.departmentName}</span>
                            </td>

                            {/* Patient Customer */}
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900">{appt.patientName}</p>
                              <p className="text-[10px] text-slate-500 font-semibold">{appt.phone}</p>
                            </td>

                            {/* Token Fee & Doctor Fee Breakdown */}
                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                <p className="font-black text-blue-700 flex items-center gap-1">
                                  <span>Platform Fee:</span> ₹{platFee}
                                  <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Paid Online ({platformFeePercent}%)</span>
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Doctor Fee: ₹{fee} <span className="text-slate-400">(Pay at Hospital)</span>
                                </p>
                              </div>
                            </td>

                            {/* Payment Status */}
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                                <CheckCircle2 size={11} /> Paid · {appt.paymentMethod || 'Razorpay / UPI'}
                              </span>
                            </td>

                            {/* IST Time */}
                            <td className="py-3 px-3 text-right">
                              <p className="font-bold text-slate-800 text-[11px]">{istDate}</p>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">IST (UTC+5:30)</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── DETAILED HOSPITAL LEDGER MODAL ──────────────────────────── */}
            {selectedHospitalLedger && (() => {
              const hosp = selectedHospitalLedger;
              const allHospAppts = safeAppointments.filter(a => 
                a.hospitalId === hosp.id || 
                (a.hospitalName && hosp.name && a.hospitalName.toLowerCase() === hosp.name.toLowerCase())
              );

              // Filter ledger appointments by ledger date filter
              const ledgerAppts = filterByDateRange(allHospAppts, ledgerDateFilter, ledgerStartDate, ledgerEndDate);

              const ledgerDocTotal = ledgerAppts.reduce((sum, a) => sum + (Number(a.fee) || 500), 0);
              const ledgerPlatTotal = ledgerAppts.reduce((sum, a) => 
                sum + (Number(a.platformFee) || Math.max(10, Math.round((Number(a.fee) || 500) * (platformFeePercent / 100)))), 0);

              return (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
                    {/* Modal Top Bar */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={hosp.image || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80"}
                          alt={hosp.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-lg leading-tight">{hosp.name}</h3>
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              {hosp.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-slate-400" />
                            {hosp.address || 'Address on file'} · {hosp.contact || '+91 80 4668 8888'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedHospitalLedger(null)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Ledger Filters & Export Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <span className="text-[10px] uppercase font-black text-slate-400 mr-2">Filter Period:</span>
                        {(['all', 'today', 'week', 'month', 'custom'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setLedgerDateFilter(f)}
                            className={`px-3 py-1.5 rounded-xl border-none cursor-pointer transition-all ${
                              ledgerDateFilter === f ? 'bg-blue-600 text-white font-black shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-white'
                            }`}
                          >
                            {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
                          </button>
                        ))}
                      </div>

                      {ledgerDateFilter === 'custom' && (
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200 text-xs">
                          <input
                            type="date"
                            value={ledgerStartDate}
                            onChange={e => setLedgerStartDate(e.target.value)}
                            className="outline-none text-slate-700 text-xs"
                          />
                          <span className="text-slate-400 font-bold">to</span>
                          <input
                            type="date"
                            value={ledgerEndDate}
                            onChange={e => setLedgerEndDate(e.target.value)}
                            className="outline-none text-slate-700 text-xs"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => exportHospitalLedgerCSV(hosp, ledgerAppts)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 border-none cursor-pointer shadow-xs transition-colors ml-auto"
                      >
                        <Download size={13} /> Export Hospital CSV
                      </button>
                    </div>

                    {/* 3 Summary KPI Cards for this Hospital */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide">Doctor Fees Volume</span>
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Hospital Desk</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-900 font-heading">₹{ledgerDocTotal.toLocaleString('en-IN')}</p>
                        <span className="text-[10px] text-emerald-700 font-semibold block">Collected at hospital OPD counter</span>
                      </div>

                      <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-blue-800 uppercase tracking-wide">Platform Revenue</span>
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{platformFeePercent}% Fee</span>
                        </div>
                        <p className="text-2xl font-black text-blue-900 font-heading">₹{ledgerPlatTotal.toLocaleString('en-IN')}</p>
                        <span className="text-[10px] text-blue-700 font-semibold block">Online token revenue via InstaToken</span>
                      </div>

                      <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black text-purple-800 uppercase tracking-wide block">Total Bookings</span>
                        <p className="text-2xl font-black text-purple-900 font-heading">{ledgerAppts.length}</p>
                        <span className="text-[10px] text-purple-700 font-semibold block">Tokens generated in selected period</span>
                      </div>
                    </div>

                    {/* Itemized Bookings Table */}
                    <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Token #</th>
                            <th className="py-2.5 px-3">Patient Customer</th>
                            <th className="py-2.5 px-3">Doctor & Dept</th>
                            <th className="py-2.5 px-3">Doctor Consultation Fee</th>
                            <th className="py-2.5 px-3">Platform Token Fee</th>
                            <th className="py-2.5 px-3">Payment Status</th>
                            <th className="py-2.5 px-3 text-right">Date & Time (IST)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ledgerAppts.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                                No bookings recorded for {hosp.name} in this period.
                              </td>
                            </tr>
                          ) : (
                            ledgerAppts.map((appt) => {
                              const fee = Number(appt.fee) || 500;
                              const platFee = Number(appt.platformFee) || Math.max(10, Math.round(fee * (platformFeePercent / 100)));
                              const istDate = new Intl.DateTimeFormat('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }).format(new Date(appt.createdAt || Date.now()));

                              return (
                                <tr key={appt.id} className="hover:bg-slate-50/60 font-medium">
                                  <td className="py-2.5 px-3">
                                    <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                                      #{appt.tokenNumber || appt.tokenNo}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <p className="font-bold text-slate-900">{appt.patientName}</p>
                                    <span className="text-[10px] text-slate-500">{appt.phone || appt.patientPhone}</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <p className="font-bold text-slate-800">{appt.doctorName}</p>
                                    <span className="text-[10px] text-blue-600">{appt.departmentName}</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="font-black text-slate-900">₹{fee}</span>
                                    <span className="text-[10px] text-slate-400 block">At Hospital OPD</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="font-black text-blue-600">₹{platFee}</span>
                                    <span className="text-[10px] text-emerald-600 block">Paid Online</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                                      <CheckCircle2 size={10} /> Paid · {appt.paymentMethod || 'Razorpay / UPI'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span className="font-bold text-slate-700 text-[11px] block">{istDate}</span>
                                    <span className="text-[9px] text-slate-400 uppercase">IST</span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Modal Bottom Footer */}
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <Button variant="outline" size="sm" onClick={() => setSelectedHospitalLedger(null)}>
                        Close Ledger
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}



        {/* ── TAB 7: REGISTER HOSPITAL FORM ───────────────────────────── */}
        {adminTab === 'add-hospital' && (
          <Card className="p-6 border-none shadow-xs bg-white max-w-xl mx-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Register New Partner Hospital</h3>
                <p className="text-xs text-slate-400 font-semibold">Add hospital details and assign platform commission rate</p>
              </div>
              <button
                onClick={() => setAdminTab('hospitals')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer border-none bg-transparent"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Hospital Full Name</label>
                <input 
                  type="text" 
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  placeholder="e.g. City General Hospital"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Category</label>
                  <select 
                    value={hospCat}
                    onChange={(e) => setHospCat(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Multi Speciality">Multi Speciality</option>
                    <option value="Children Hospital">Children Hospital</option>
                    <option value="Eye Hospital">Eye Hospital</option>
                    <option value="Dental Clinic">Dental Clinic</option>
                    <option value="Cardiology">Cardiology</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Contact Number</label>
                  <input 
                    type="tel" 
                    value={hospContact}
                    onChange={(e) => setHospContact(e.target.value)}
                    placeholder="+91 80 4455 6677"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">City / Town *</label>
                  <input 
                    type="text" 
                    value={hospCity}
                    onChange={(e) => setHospCity(e.target.value)}
                    placeholder="e.g. Adoni, Hyderabad"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Village / Area Name *</label>
                  <input 
                    type="text" 
                    value={hospArea}
                    onChange={(e) => setHospArea(e.target.value)}
                    placeholder="e.g. SKD Colony, Rotary Nagar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Street Address (Door / Landmark)</label>
                  <input 
                    type="text" 
                    value={hospAddress}
                    onChange={(e) => setHospAddress(e.target.value)}
                    placeholder="e.g. Near New Bus Stand, Main Road"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Platform Commission (%)</label>
                  <input 
                    type="number" 
                    value={hospCommission}
                    onChange={(e) => setHospCommission(e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white font-extrabold text-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Description & Facilities</label>
                <textarea 
                  value={hospAbout}
                  onChange={(e) => setHospAbout(e.target.value)}
                  placeholder="Add hospital specialty details, background, and features..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white resize-none"
                />
              </div>

              <Button type="submit" variant="primary" fullWidth className="py-3 mt-2 rounded-xl text-xs font-bold">
                Register Hospital Profile
              </Button>
            </form>
          </Card>
        )}

        {/* ── TAB 8: REGISTER DOCTOR FORM ───────────────────────────── */}
        {adminTab === 'add-doctor' && (
          <Card className="p-6 border-none shadow-xs bg-white max-w-xl mx-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Enroll Medical Specialist</h3>
                <p className="text-xs text-slate-400 font-semibold">Assign doctor to a partner hospital roster</p>
              </div>
              <button
                onClick={() => setAdminTab('hospitals')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer border-none bg-transparent"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4 text-left">
              {/* Doctor Photo Upload Header */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-extrabold text-lg">
                  {docPhoto ? (
                    <img src={docPhoto} alt="Doctor preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <label className="text-xs font-extrabold text-slate-700 block">Doctor Profile Photo</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs">
                      <Upload size={13} />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDocPhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {docPhoto && (
                      <button
                        type="button"
                        onClick={() => setDocPhoto('')}
                        className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-xl border border-red-200 cursor-pointer transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={docPhoto}
                    onChange={e => setDocPhoto(e.target.value)}
                    placeholder="Or paste image URL (https://...)"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Assign Hospital</label>
                <select 
                  value={selectedHospId}
                  onChange={(e) => setSelectedHospId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Doctor Full Name</label>
                <input 
                  type="text" 
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Dr. Kavitha Reddy"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Specialty Role</label>
                  <input 
                    type="text" 
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    placeholder="e.g. Pediatric Orthodontist"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Department</label>
                  <select 
                    value={docDeptId}
                    onChange={(e) => setDocDeptId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="dept-cardio">Cardiology</option>
                    <option value="dept-neuro">Neurology</option>
                    <option value="dept-ortho">Orthopedics</option>
                    <option value="dept-pedia">Pediatrics</option>
                    <option value="dept-gynaec">Gynecology</option>
                    <option value="dept-general">General Medicine</option>
                    <option value="dept-eye">Ophthalmology</option>
                    <option value="dept-dental">Dental</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Qualifications</label>
                  <input 
                    type="text" 
                    value={docQual}
                    onChange={(e) => setDocQual(e.target.value)}
                    placeholder="MBBS, MDS"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Exp (Yrs)</label>
                  <input 
                    type="number" 
                    value={docExp}
                    onChange={(e) => setDocExp(e.target.value)}
                    placeholder="12"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Consultation Fee (₹)</label>
                <input 
                  type="number" 
                  value={docFee}
                  onChange={(e) => setDocFee(e.target.value)}
                  placeholder="500"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <Button type="submit" variant="primary" fullWidth className="py-3 mt-2 rounded-xl text-xs font-bold">
                Enroll Specialist
              </Button>
            </form>
          </Card>
        )}

        {/* ── TAB: LOCATION-BASED BANNERS ───────────────────────────────── */}
        {adminTab === 'banners' && (
          <div className="animate-in fade-in duration-200">
            <LocationBanners />
          </div>
        )}

        {/* ── TAB: HOSPITAL ADS INQUIRIES ───────────────────────────────── */}
        {adminTab === 'ads-inquiries' && (
          <div className="animate-in fade-in duration-200">
            <AdsInquiries />
          </div>
        )}

        </div>
      </main>
    </div>

      {/* ── CUSTOMER TOKENS & HISTORY MODAL DIALOG ───────────────────────── */}
      {selectedCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedCustomerModal.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"} 
                  alt={selectedCustomerModal.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500" 
                />
                <div>
                  <h3 className="text-base font-black leading-none">{selectedCustomerModal.name}</h3>
                  <p className="text-xs text-slate-300 font-medium mt-1">{selectedCustomerModal.phone} · {selectedCustomerModal.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerModal(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
              
              {/* Summary Pill Header */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
                  <span className="text-[10px] font-black text-blue-600 uppercase block">Total Bookings</span>
                  <span className="text-xl font-black text-slate-900 block mt-0.5">{selectedCustomerModal.bookings.length} Tokens</span>
                </div>
                <div className="bg-purple-50 rounded-2xl p-3 border border-purple-100">
                  <span className="text-[10px] font-black text-purple-600 uppercase block">Total Hospitals Visited</span>
                  <span className="text-xl font-black text-slate-900 block mt-0.5">
                    {new Set(selectedCustomerModal.bookings.map(b => b.hospitalId)).size} Hospitals
                  </span>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
                  <span className="text-[10px] font-black text-emerald-600 uppercase block">Total Spend</span>
                  <span className="text-xl font-black text-slate-900 block mt-0.5">
                    ₹{selectedCustomerModal.bookings.reduce((sum, b) => sum + b.fee, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Booked Tokens Detail List */}
              <div className="space-y-3">
                <h4 className="font-black text-xs uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-600" /> Booked Token Activity Log
                </h4>

                {selectedCustomerModal.bookings.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedCustomerModal.bookings.map((b) => (
                      <div key={b.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-100/50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white font-black text-xs px-2.5 py-0.5 rounded-lg">
                              Token #{b.tokenNumber}
                            </span>
                            <span className="font-extrabold text-slate-900 text-xs">{b.hospitalName}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-semibold">👨‍⚕️ {b.doctorName} ({b.departmentName})</p>
                          <p className="text-[10px] text-slate-400">📅 Date: {b.date} at {b.time} · Payment: {b.paymentMethod} ({b.paymentId})</p>
                        </div>

                        <div className="text-right space-y-1">
                          <span className="font-black text-sm text-slate-900 block">₹{b.fee}</span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                            b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {b.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 font-semibold text-center py-6">No token bookings recorded for this customer yet.</p>
                )}
              </div>

              {/* Hospitals Visited List */}
              <div className="space-y-3 pt-2">
                <h4 className="font-black text-xs uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                  <Building2 size={14} className="text-purple-600" /> Visited Partner Hospitals Overview
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from(new Set((selectedCustomerModal.bookings || []).map(b => b.hospitalId))).map((hId) => {
                    const hosp = hospitals.find(h => h.id === hId);
                    const countVisits = (selectedCustomerModal.bookings || []).filter(b => b.hospitalId === hId).length;
                    return (
                      <div key={hId} className="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center gap-3">
                        <img 
                          src={hosp?.image || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=80"} 
                          alt="Hospital" 
                          className="w-10 h-10 rounded-xl object-cover border border-purple-200 shrink-0" 
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 text-xs truncate">{hosp?.name || "Partner Hospital"}</p>
                          <p className="text-[10px] text-purple-700 font-bold">{countVisits} Visit Token(s) Booked</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCustomerModal(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer border-none"
              >
                Close Customer Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Modal: Permanently Delete Hospital Confirmation */}
      {hospitalToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Permanently Delete Hospital?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Are you sure you want to permanently delete <strong>{hospitalToDelete.name}</strong>?
              </p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-left text-xs space-y-1">
              <p className="font-bold text-slate-800">Hospital: <span className="font-medium text-slate-600">{hospitalToDelete.name}</span></p>
              <p className="font-bold text-slate-800">Address: <span className="font-medium text-slate-600">{hospitalToDelete.address}</span></p>
              <p className="font-bold text-slate-800">Doctors: <span className="font-medium text-slate-600">{(hospitalToDelete.doctors || []).length} Doctors assigned</span></p>
              <p className="text-[10px] text-red-600 font-bold mt-2">
                ⚠️ This will permanently remove this hospital, its doctors, OPD sessions, and departments from AWS RDS. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => !isDeletingHosp && setHospitalToDelete(null)}
                disabled={isDeletingHosp}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!hospitalToDelete?.id) return;
                  setIsDeletingHosp(true);
                  try {
                    await deleteHospital(hospitalToDelete.id);
                    setHospitalToDelete(null);
                  } catch (err) {
                    alert("Error deleting hospital: " + err);
                  } finally {
                    setIsDeletingHosp(false);
                  }
                }}
                disabled={isDeletingHosp}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingHosp ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Deleting from RDS...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
