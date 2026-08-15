import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { CustomerAccount } from '../../utils/mockData';
import { 
  ArrowLeft, LayoutDashboard, Stethoscope, 
  TrendingUp, ShieldCheck, Activity, Bell,
  DollarSign, Building2, CheckCircle2, Search, Plus,
  Users, UserCheck, UserX,
  AlertTriangle, Download, X, Calendar, Upload, User
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    hospitals, appointments, customers, addHospital, addDoctor, 
    toggleDisableHospital, toggleCustomerStatus, notifications, addNotification 
  } = useApp();

  const [adminTab, setAdminTab] = useState<
    'stats' | 'hospitals' | 'customers' | 'financials' | 'add-hospital' | 'add-doctor'
  >('stats');

  // --- Add Hospital Form State ---
  const [hospName, setHospName] = useState('');
  const [hospCat, setHospCat] = useState('Multi Speciality');
  const [hospAddress, setHospAddress] = useState('');
  const [hospAbout, setHospAbout] = useState('');
  const [hospContact, setHospContact] = useState('');
  const [hospCommission, setHospCommission] = useState('10');
  const hospTimings = '09:00 AM - 05:00 PM';
  
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
  const [revenueDateFilter, setRevenueDateFilter] = useState<'all' | 'month' | 'today'>('all');

  // Calculate gross customer revenue across mock customers & live appointments
  const safeCustomers = customers || [];
  const safeAppointments = appointments || [];
  const safeHospitals = hospitals || [];
  const allCustomerBookings = safeCustomers.flatMap(c => c?.bookings || []);
  const customerRevenueSum = allCustomerBookings.reduce((sum, b) => sum + (b?.fee || 0), 0);
  const apptRevenueSum = safeAppointments.reduce((sum, a) => sum + (a?.fee || 500), 0);
  const totalRevenueGenerated = customerRevenueSum + apptRevenueSum;
  const activeHospitalsCount = safeHospitals.filter(h => h?.status !== 'disabled').length;
  const disabledHospitalsCount = safeHospitals.filter(h => h?.status === 'disabled').length;

  // Customer aggregates
  const totalCustomerTokens = allCustomerBookings.length + safeAppointments.length;
  const avgRevenuePerCustomer = safeCustomers.length > 0 ? Math.round(totalRevenueGenerated / safeCustomers.length) : 0;

  const handleCreateHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospName || !hospAddress || !hospContact) {
      alert("Please fill in hospital name, address and contact details");
      return;
    }
    
    addHospital({
      name: hospName,
      category: hospCat,
      address: hospAddress,
      about: hospAbout,
      contact: hospContact,
      timings: hospTimings,
      baseWaitingTime: 15,
      facilities: ["ICU", "Ambulance", "Pharmacy", "Diagnostic Lab"],
      gallery: [],
      departments: [
        { id: "dept-general", name: "General Medicine", icon: "Stethoscope" }
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

  // CSV Revenue Report Export Handler
  const exportFinancialCSV = () => {
    const csvRows = [
      ["Customer Name", "Phone", "Email", "Hospital", "Doctor", "Token #", "Token Fee (INR)", "Payment Method", "Date", "Status"]
    ];

    (customers || []).forEach(cust => {
      (cust.bookings || []).forEach(b => {
        csvRows.push([
          `"${cust.name}"`,
          `"${cust.phone}"`,
          `"${cust.email}"`,
          `"${b.hospitalName}"`,
          `"${b.doctorName}"`,
          `"${b.tokenNumber}"`,
          `"${b.fee}"`,
          `"${b.paymentMethod}"`,
          `"${b.date}"`,
          `"${b.status}"`
        ]);
      });
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* ── LEFT NAVIGATION SIDEBAR (Desktop) ───────────────────────────── */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-5 text-white h-screen sticky top-0 justify-between shrink-0">
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
              className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer border-none ${
                adminTab === 'financials' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign size={15} /> Financials & Revenue
            </button>
          </div>
        </div>

        {/* Bottom Operator Footer */}
        <div className="space-y-2">
          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-800 text-[10px] text-slate-400">
            <span className="font-extrabold text-white flex items-center gap-1.5 mb-0.5 text-xs">
              <ShieldCheck size={14} className="text-blue-500" />
              Super Admin Level 1
            </span>
            Root infrastructure & commission controls.
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/hospital/dashboard')}
            className="w-full py-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Hospital Panel →
          </Button>
        </div>
      </div>

      {/* ── MOBILE HEADER (Mobile Only) ─────────────────────────────────── */}
      <div className="md:hidden flex flex-col w-full bg-slate-900 text-white">
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
          {(['stats', 'hospitals', 'customers', 'financials'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setAdminTab(tab)}
              className={`px-3 py-3 border-b-2 whitespace-nowrap cursor-pointer ${
                adminTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400'
              }`}
            >
              {tab === 'stats' ? 'Overview' : tab === 'hospitals' ? 'Hospitals' : tab === 'customers' ? 'Customers' : 'Revenue'}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ───────────────────────────────────────────── */}
      <div className="flex-grow px-4 py-6 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
        
        {/* ── TAB 1: SYSTEM OVERVIEW ───────────────────────────────────── */}
        {adminTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div>
                <h2 className="text-xl font-black text-slate-800">Super Admin Dashboard</h2>
                <p className="text-xs text-slate-400 font-semibold">Global platform analytics, hospital revenue & queue oversight</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAdminTab('add-hospital')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors border-none"
                >
                  <Plus size={14} /> Add Partner Hospital
                </button>
                <button
                  onClick={() => setAdminTab('add-doctor')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors border-none"
                >
                  <Stethoscope size={14} /> Enroll Doctor
                </button>
              </div>
            </div>

            {/* Grid Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white hover:shadow-md transition-shadow">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total Customer Revenue</span>
                <span className="text-3xl font-black text-blue-600 font-heading block mt-1">₹{totalRevenueGenerated.toLocaleString()}</span>
                <span className="text-[9px] text-slate-400 font-semibold block mt-1">From token booking fees</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white hover:shadow-md transition-shadow">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total Tokens Booked</span>
                <span className="text-3xl font-black text-emerald-600 font-heading block mt-1">{totalCustomerTokens}</span>
                <span className="text-[9px] text-slate-400 font-semibold block mt-1">Online & Walk-in patient tokens</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white hover:shadow-md transition-shadow">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Partner Hospitals</span>
                <span className="text-3xl font-black text-slate-800 font-heading block mt-1">{hospitals.length}</span>
                <span className="text-[9px] text-blue-600 font-semibold block mt-1">{activeHospitalsCount} Active · {disabledHospitalsCount} Disabled</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white hover:shadow-md transition-shadow">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Registered Customers</span>
                <span className="text-3xl font-black text-purple-600 font-heading block mt-1">{customers.length}</span>
                <span className="text-[9px] text-slate-400 font-semibold block mt-1">Across all locations</span>
              </Card>
            </div>

            {/* Split Row: Peak OPD Hours Chart + Hospital Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* OPD Peak Hours Bar Chart (7 cols) */}
              <div className="lg:col-span-7">
                <Card className="p-5 border-none shadow-xs bg-white h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Global OPD Booking Hourly Peaks</h3>
                        <p className="text-[10px] text-slate-400 font-semibold">Real-time aggregate token load across all hospitals</p>
                      </div>
                      <TrendingUp size={16} className="text-blue-600" />
                    </div>
                  </div>

                  {/* Chart Visual */}
                  <div className="flex items-end justify-between h-40 pt-4 px-3 text-[9px] font-bold text-slate-400 border-b border-slate-100 mb-2">
                    {[
                      { time: '08:00 AM', height: '25%', count: 18, active: false },
                      { time: '10:00 AM', height: '70%', count: 84, active: false },
                      { time: '12:00 PM', height: '95%', count: 142, active: true },
                      { time: '02:00 PM', height: '40%', count: 45, active: false },
                      { time: '04:00 PM', height: '60%', count: 72, active: false },
                      { time: '06:00 PM', height: '85%', count: 110, active: false },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2 w-12 group">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                          {item.count}
                        </span>
                        <div
                          className={`w-full rounded-xl transition-all cursor-pointer ${
                            item.active ? 'bg-blue-600 animate-pulse shadow-md shadow-blue-500/30' : 'bg-slate-200 group-hover:bg-blue-400'
                          }`}
                          style={{ height: item.height }}
                          title={`${item.time}: ${item.count} tokens`}
                        />
                        <span>{item.time}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Live Admin Dispatch Logs (5 cols) */}
              <div className="lg:col-span-5">
                <Card className="p-5 border-none shadow-xs bg-white h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">System Notifications Log</h3>
                    <Bell size={14} className="text-slate-400" />
                  </div>
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center font-extrabold text-slate-700">
                            <span>{n.title}</span>
                            <span className="text-[8px] text-slate-400 font-semibold">{n.timestamp}</span>
                          </div>
                          <p className="text-slate-500 text-[10px]">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-0.5">
                          <div className="flex justify-between items-center font-extrabold text-blue-800">
                            <span>Apollo Spectra Hospital Active</span>
                            <span className="text-[8px] text-slate-400 font-semibold">Just Now</span>
                          </div>
                          <p className="text-slate-500 text-[10px]">101 tokens issued today across 5 departments.</p>
                        </div>
                        <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs space-y-0.5">
                          <div className="flex justify-between items-center font-extrabold text-emerald-800">
                            <span>City General Hospital Registered</span>
                            <span className="text-[8px] text-slate-400 font-semibold">2 hours ago</span>
                          </div>
                          <p className="text-slate-500 text-[10px]">Commission set to 10% on token booking fee.</p>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </div>
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
                <table className="w-full min-w-[900px] text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Hospital Details</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Contact & Location</th>
                      <th className="px-4 py-3">Doctors</th>
                      <th className="px-4 py-3">Commission %</th>
                      <th className="px-4 py-3">Account Status</th>
                      <th className="px-4 py-3 text-right">Disable / Enable Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {hospitals
                      .filter(h => {
                        const matchesSearch = h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) || 
                          h.address.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
                          h.contact.includes(hospitalSearch);
                        const isCurrentlyDisabled = h.status === 'disabled';
                        if (hospitalStatusFilter === 'active') return matchesSearch && !isCurrentlyDisabled;
                        if (hospitalStatusFilter === 'disabled') return matchesSearch && isCurrentlyDisabled;
                        return matchesSearch;
                      })
                      .map((hosp) => {
                        const isDisabled = hosp.status === 'disabled';
                        return (
                          <tr key={hosp.id} className={`border-b border-slate-50 transition-colors ${isDisabled ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img src={hosp.image} alt={hosp.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100" />
                                <div>
                                  <p className="font-extrabold text-slate-800 leading-none">{hosp.name}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate max-w-[220px]">{hosp.address}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                                {hosp.category}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-700">{hosp.contact}</p>
                              <p className="text-[10px] text-slate-400">Timings: {hosp.timings}</p>
                            </td>
                            <td className="px-4 py-3 font-extrabold text-blue-600">
                              {hosp.doctors.length} Doctors
                            </td>
                            <td className="px-4 py-3 font-extrabold text-emerald-600">
                              10% Platform Fee
                            </td>
                            <td className="px-4 py-3">
                              {isDisabled ? (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                                  <AlertTriangle size={11} className="text-amber-600" /> Account Disabled
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                                  <CheckCircle2 size={11} /> Verified Active
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => toggleDisableHospital(hosp.id)}
                                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer border-none shadow-2xs ${
                                  isDisabled 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                }`}
                              >
                                {isDisabled ? 'Enable Hospital' : 'Disable Account'}
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
                    const uniqueHosps = new Set(c.bookings.map(b => b.hospitalId));
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
                                {cust.bookings.length} Tokens
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



        {/* ── TAB 5: FINANCIALS & REVENUE (EXPANDED) ──────────────────── */}
        {adminTab === 'financials' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div>
                <h2 className="text-xl font-black text-slate-800">Financials & Customer Revenue Tracking</h2>
                <p className="text-xs text-slate-400 font-semibold">Track gross revenue generated from customers, 10% platform commission, and hospital payout settlements</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold">
                  <button
                    onClick={() => setRevenueDateFilter('all')}
                    className={`px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all ${
                      revenueDateFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => setRevenueDateFilter('month')}
                    className={`px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all ${
                      revenueDateFilter === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    This Month
                  </button>
                </div>

                <button
                  onClick={exportFinancialCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all border-none"
                >
                  <Download size={14} /> Export Revenue CSV
                </button>
              </div>
            </div>

            {/* Financial Headline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-lg shadow-blue-500/20 space-y-2">
                <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Gross Customer Revenue</p>
                <div className="text-3xl font-black font-heading">₹{totalRevenueGenerated.toLocaleString()}</div>
                <p className="text-[10px] text-blue-200">Generated from online patient token bookings</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg shadow-emerald-500/20 space-y-2">
                <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Total Customer Tokens</p>
                <div className="text-3xl font-black font-heading">{totalCustomerTokens}</div>
                <p className="text-[10px] text-emerald-200">Total patient consultation tokens issued</p>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Revenue / Customer</p>
                <div className="text-3xl font-black text-purple-600 font-heading">₹{avgRevenuePerCustomer.toLocaleString()}</div>
                <p className="text-[10px] text-slate-500 font-semibold">Across {customers.length} registered customer accounts</p>
              </div>
            </div>

            {/* Customer Revenue Breakdown Table (Full Width) */}
            <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Revenue Generated Per Customer</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Tracking customer token booking payments across all registered patients</p>
                </div>
                <Users size={16} className="text-blue-600" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Customer Account</th>
                      <th className="py-2.5 px-3">Contact & Location</th>
                      <th className="py-2.5 px-3">Tokens Booked</th>
                      <th className="py-2.5 px-3">Hospitals Visited</th>
                      <th className="py-2.5 px-3">Gross Customer Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((cust) => {
                      const totalSpent = (cust.bookings || []).reduce((sum, b) => sum + (b?.fee || 0), 0);
                      const uniqueHospitals = new Set((cust.bookings || []).map(b => b.hospitalId)).size;
                      return (
                        <tr key={cust.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {cust.name}
                            <span className="block text-[9px] text-slate-400 font-medium">{cust.email}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <span className="font-bold">{cust.phone}</span>
                            <span className="block text-[9px] text-slate-400 font-medium">{cust.location}</span>
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-blue-600">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">
                              {cust.bookings?.length || 0} Tokens
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-purple-600">
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg">
                              🏥 {uniqueHospitals} Hospitals
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-black text-emerald-600">₹{totalSpent.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Street Address</label>
                  <input 
                    type="text" 
                    value={hospAddress}
                    onChange={(e) => setHospAddress(e.target.value)}
                    placeholder="e.g. Jayanagar 4th Block, Bengaluru"
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
                    <option value="dept-general">General Medicine</option>
                    <option value="dept-cardio">Cardiology</option>
                    <option value="dept-pedia">Pediatrics</option>
                    <option value="dept-dental">Dental Care</option>
                    <option value="dept-eye">Ophthalmology</option>
                    <option value="dept-gynaec">Gynecology</option>
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
                  {Array.from(new Set(selectedCustomerModal.bookings.map(b => b.hospitalId))).map((hId) => {
                    const hosp = hospitals.find(h => h.id === hId);
                    const countVisits = selectedCustomerModal.bookings.filter(b => b.hospitalId === hId).length;
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

    </div>
  );
};
