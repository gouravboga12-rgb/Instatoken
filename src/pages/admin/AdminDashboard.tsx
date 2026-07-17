import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { Appointment } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  ArrowLeft, LayoutDashboard, Compass, Stethoscope, 
  TrendingUp, Volume2, ShieldCheck, Activity, Bell
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    hospitals, appointments, advanceQueue, addHospital, addDoctor, notifications, addNotification 
  } = useApp();

  const [adminTab, setAdminTab] = useState<'stats' | 'queue' | 'hospital' | 'doctor'>('stats');

  // --- Add Hospital Form State ---
  const [hospName, setHospName] = useState('');
  const [hospCat, setHospCat] = useState('Multi Speciality');
  const [hospAddress, setHospAddress] = useState('');
  const [hospAbout, setHospAbout] = useState('');
  const [hospContact, setHospContact] = useState('');
  const hospTimings = '09:00 AM - 05:00 PM';
  
  // --- Add Doctor Form State ---
  const [selectedHospId, setSelectedHospId] = useState(hospitals[0]?.id || '');
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docDeptId, setDocDeptId] = useState('dept-general');
  const [docQual, setDocQual] = useState('MBBS, MD');
  const [docExp, setDocExp] = useState('10');
  const [docFee, setDocFee] = useState('500');
  
  // --- Queue Operator State ---
  const [operatorHospId, setOperatorHospId] = useState(hospitals[0]?.id || '');
  const [operatorDocId, setOperatorDocId] = useState(hospitals[0]?.doctors[0]?.id || '');

  const operatorHosp = hospitals.find(h => h.id === operatorHospId);
  const operatorDoc = operatorHosp?.doctors.find(d => d.id === operatorDocId);

  // Active appointments in the queue for the operator
  const activeQueueAppts = appointments.filter(
    appt => appt.hospitalId === operatorHospId && appt.doctorId === operatorDocId && appt.status === 'booked'
  ).sort((a, b) => a.tokenNumber - b.tokenNumber);

  // --- Aggregates for Dashboard ---
  const todayBookingsCount = appointments.filter(a => a.status === 'booked').length;
  const todayRevenue = appointments
    .filter(a => a.status === 'completed' || a.status === 'booked')
    .reduce((sum, a) => sum + a.fee, 0);
  const totalPatientsRegistered = 482; // Static mock baseline
  const activeHospitalsCount = hospitals.length;

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
      lng: 77.62
    });

    // Reset Form
    setHospName('');
    setHospAddress('');
    setHospAbout('');
    setHospContact('');
    setAdminTab('stats');
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
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
      availability: {
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"]
      }
    });

    // Reset Form
    setDocName('');
    setDocSpecialty('');
    setAdminTab('stats');
  };

  const handleCallNext = () => {
    if (!operatorHospId || !operatorDocId) return;
    advanceQueue(operatorHospId, operatorDocId);
  };

  const triggerSMSNotification = (appt: Appointment) => {
    alert(`SMS Alert sent to ${appt.patientName} (${appt.phone}):\n"Your token #${appt.tokenNumber} is active. Proceed to cabin now."`);
    addNotification(
      "SMS Notification Triggered",
      `Queue advisory text dispatched successfully to patient cell ${appt.phone}.`,
      "success"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* LEFT NAVIGATION SIDEBAR (Desktop Only, hidden on mobile) */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-5 text-white h-screen sticky top-0 justify-between shrink-0">
        <div className="space-y-6">
          {/* Logo brand block */}
          <div className="flex items-center gap-2 px-2 py-1 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none font-heading">InstaToken</h1>
              <span className="text-[9px] text-blue-400 font-bold uppercase mt-0.5 block">Admin Central</span>
            </div>
          </div>

          {/* Navigation link list */}
          <div className="space-y-1.5 pt-4">
            <button
              onClick={() => setAdminTab('stats')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                adminTab === 'stats' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <LayoutDashboard size={14} /> System Overview
            </button>
            
            <button
              onClick={() => setAdminTab('queue')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                adminTab === 'queue' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Volume2 size={14} /> Queue Operator
            </button>

            <button
              onClick={() => setAdminTab('hospital')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                adminTab === 'hospital' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Compass size={14} /> Register Hospital
            </button>

            <button
              onClick={() => setAdminTab('doctor')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                adminTab === 'doctor' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Stethoscope size={14} /> Register Doctor
            </button>
          </div>
        </div>

        {/* Back to Client view trigger button */}
        <div className="space-y-3">
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-800/50 text-[10px] text-slate-400">
            <span className="font-extrabold text-white flex items-center gap-1.5 mb-1 text-xs">
              <ShieldCheck size={14} className="text-blue-500" />
              Operator Mode
            </span>
            Authorized database controls active.
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="w-full py-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={12} />
            Patient Portal
          </Button>
        </div>
      </div>

      {/* MOBILE HEADER NAVIGATION AND TABS VIEW (Mobile Only, hidden on desktop) */}
      <div className="md:hidden flex flex-col w-full">
        {/* Mobile top header bar */}
        <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/profile')}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-base font-black tracking-tight font-heading">Central Administration</h2>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">Hospital Console</p>
            </div>
          </div>
          <Badge variant="blue" className="bg-blue-500/20 text-blue-400 border-none py-1">
            Root Officer
          </Badge>
        </div>

        {/* Mobile top navigation selectors */}
        <div className="bg-slate-900 text-white flex px-2 border-b border-slate-800">
          <button
            onClick={() => setAdminTab('stats')}
            className={`flex-1 text-center py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition-all ${adminTab === 'stats' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400'}`}
          >
            <LayoutDashboard size={12} /> Overview
          </button>
          <button
            onClick={() => setAdminTab('queue')}
            className={`flex-1 text-center py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition-all ${adminTab === 'queue' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400'}`}
          >
            <Volume2 size={12} /> Operator
          </button>
          <button
            onClick={() => setAdminTab('hospital')}
            className={`flex-1 text-center py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition-all ${adminTab === 'hospital' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400'}`}
          >
            <Compass size={12} /> Hosp +
          </button>
          <button
            onClick={() => setAdminTab('doctor')}
            className={`flex-1 text-center py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition-all ${adminTab === 'doctor' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400'}`}
          >
            <Stethoscope size={12} /> Doc +
          </button>
        </div>
      </div>

      {/* MAIN VIEW CONTENT AREA (shared layout, responsive columns) */}
      <div className="flex-grow px-5 py-6 md:p-8 max-w-[1400px] mx-auto w-full">
        
        {/* Tab 1: Stats Overview */}
        {adminTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Grid metrics row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Today's Bookings</span>
                <span className="text-3xl font-black text-slate-800 font-heading block mt-1">{todayBookingsCount}</span>
                <span className="text-[8px] text-emerald-600 font-bold block mt-1">+12% vs yesterday</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Today's Revenue</span>
                <span className="text-3xl font-black text-blue-600 font-heading block mt-1">₹{todayRevenue}</span>
                <span className="text-[8px] text-slate-400 block mt-1">Online transactions</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Active Hospitals</span>
                <span className="text-2xl font-black text-slate-800 font-heading block mt-1">{activeHospitalsCount}</span>
                <span className="text-[8px] text-slate-400 block mt-1">Operational zones</span>
              </Card>

              <Card className="p-4 border-none shadow-xs text-center flex flex-col justify-between bg-white">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Patients</span>
                <span className="text-2xl font-black text-slate-800 font-heading block mt-1">{totalPatientsRegistered}</span>
                <span className="text-[8px] text-slate-400 block mt-1">Accounts registered</span>
              </Card>
            </div>

            {/* Split row: Peak Hours and Dispatch Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Peak hours chart card (col-span-7) */}
              <div className="lg:col-span-7">
                <Card className="p-5 border-none shadow-xs bg-white h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between mb-4">
                      <span>OPD Queue Hourly Peaks</span>
                      <TrendingUp size={14} className="text-slate-400" />
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-normal max-w-[320px]">Real-time tracking of patient queue bookings loaded onto the platform today.</p>
                  </div>
                  
                  {/* Visual Chart bars */}
                  <div className="flex items-end justify-between h-36 pt-4 px-2 text-[8px] font-bold text-slate-400 border-b border-slate-50 mb-2">
                    <div className="flex flex-col items-center gap-2 w-10">
                      <div className="w-full bg-slate-100 rounded-lg h-10 hover:bg-slate-200 transition-all cursor-pointer" title="9 AM: 3 bookings" />
                      <span>09:00 AM</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-10">
                      <div className="w-full bg-blue-400 rounded-lg h-24 hover:bg-blue-500 transition-all cursor-pointer" title="11 AM: 8 bookings" />
                      <span>11:00 AM</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-10">
                      <div className="w-full bg-blue-600 rounded-lg h-32 hover:bg-blue-700 transition-all cursor-pointer animate-pulse" title="1 PM: 12 bookings" />
                      <span>01:00 PM</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-10">
                      <div className="w-full bg-blue-400 rounded-lg h-16 hover:bg-blue-500 transition-all cursor-pointer" title="3 PM: 5 bookings" />
                      <span>03:00 PM</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-10">
                      <div className="w-full bg-blue-500 rounded-lg h-28 hover:bg-blue-600 transition-all cursor-pointer" title="5 PM: 10 bookings" />
                      <span>05:00 PM</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Live Alerts dispatch log card (col-span-5) */}
              <div className="lg:col-span-5">
                <Card className="p-5 border-none shadow-xs bg-white h-full flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between mb-3">
                    <span>Live Notification Logs</span>
                    <Bell size={14} className="text-slate-400" />
                  </h3>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 flex-grow">
                    {notifications.slice(0, 4).map((n) => (
                      <div key={n.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] leading-relaxed">
                        <div className="flex justify-between items-center font-bold text-slate-700">
                          <span>{n.title}</span>
                          <span className="text-[8px] text-slate-400 font-normal">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Queue Operator Panel */}
        {adminTab === 'queue' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Split layout: Selector details and live patient grids */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Operator details dashboard (col-span-4) */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="p-4 border-none shadow-xs bg-white space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Assign Hospital</label>
                    <select 
                      value={operatorHospId}
                      onChange={(e) => {
                        const hId = e.target.value;
                        setOperatorHospId(hId);
                        const matchingHosp = hospitals.find(h => h.id === hId);
                        if (matchingHosp && matchingHosp.doctors.length > 0) {
                          setOperatorDocId(matchingHosp.doctors[0].id);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none"
                    >
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  {operatorHosp && operatorHosp.doctors.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Active Doctor Cabin</label>
                      <select 
                        value={operatorDocId}
                        onChange={(e) => setOperatorDocId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-155 rounded-xl text-xs focus:outline-none"
                      >
                        {operatorHosp.doctors.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </Card>

                {operatorDoc && (
                  <Card className="p-5 border-none shadow-xs bg-white text-center flex flex-col items-center">
                    <Badge variant="blue" className="mb-2 bg-blue-50 text-blue-700 text-[9px] px-2.5 py-0.5 rounded-md font-bold">
                      CABIN CONTROL #{operatorDoc.id.slice(-2)}
                    </Badge>
                    
                    <div className="grid grid-cols-2 gap-3 w-full my-3">
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Serving</span>
                        <span className="text-2xl font-black text-slate-800 font-heading block mt-0.5">{operatorDoc.currentQueue}</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Booked Max</span>
                        <span className="text-2xl font-black text-blue-600 font-heading block mt-0.5">{operatorDoc.nextAvailableToken - 1}</span>
                      </div>
                    </div>

                    <Button 
                      variant="primary" 
                      onClick={handleCallNext}
                      disabled={operatorDoc.currentQueue >= operatorDoc.nextAvailableToken - 1}
                      className="w-full py-2.5 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Call Next Patient
                    </Button>
                  </Card>
                )}
              </div>

              {/* Waiting patient list grids (col-span-8) */}
              <div className="lg:col-span-8">
                <Card className="p-5 border-none shadow-xs bg-white h-full">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Patient Queue Waiting Line</h4>
                  
                  {activeQueueAppts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                      {activeQueueAppts.map((appt) => (
                        <div key={appt.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center h-fit">
                          <div>
                            <span className="text-xs font-extrabold text-slate-800 block">Token #{appt.tokenNumber}</span>
                            <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate max-w-[120px]">{appt.patientName}</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">Slot: {appt.time}</span>
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => triggerSMSNotification(appt)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-[9px] font-bold transition-all cursor-pointer shrink-0"
                          >
                            SMS Alert
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 flex flex-col items-center justify-center h-full">
                      <p className="text-xs font-bold text-slate-400">All patient slots served. Queue is clear!</p>
                    </div>
                  )}
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Create Hospital Form */}
        {adminTab === 'hospital' && (
          <Card className="p-6 border-none shadow-xs bg-white max-w-xl mx-auto animate-in fade-in duration-200">
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wide mb-4">Register New Hospital</h3>
            <form onSubmit={handleCreateHospital} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Hospital Name</label>
                <input 
                  type="text" 
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  placeholder="e.g. City General Hospital"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Category</label>
                  <select 
                    value={hospCat}
                    onChange={(e) => setHospCat(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Multi Speciality">Multi Speciality</option>
                    <option value="Children Hospital">Children Hospital</option>
                    <option value="Eye Hospital">Eye Hospital</option>
                    <option value="Dental Clinic">Dental Clinic</option>
                    <option value="Cardiology">Cardiology</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Contact Number</label>
                  <input 
                    type="tel" 
                    value={hospContact}
                    onChange={(e) => setHospContact(e.target.value)}
                    placeholder="+91 80 4455..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Street Address</label>
                <input 
                  type="text" 
                  value={hospAddress}
                  onChange={(e) => setHospAddress(e.target.value)}
                  placeholder="e.g. Jayanagar 4th Block, Bengaluru"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Description</label>
                <textarea 
                  value={hospAbout}
                  onChange={(e) => setHospAbout(e.target.value)}
                  placeholder="Add hospital specialty details, background, and features..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white resize-none"
                />
              </div>

              <Button type="submit" variant="primary" fullWidth className="py-3 mt-2 rounded-xl text-xs font-bold">
                Register Hospital Profile
              </Button>
            </form>
          </Card>
        )}

        {/* Tab 4: Register Doctor Form */}
        {adminTab === 'doctor' && (
          <Card className="p-6 border-none shadow-xs bg-white max-w-xl mx-auto animate-in fade-in duration-200">
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wide mb-4">Enroll Medical Specialist</h3>
            <form onSubmit={handleCreateDoctor} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Assign Hospital</label>
                <select 
                  value={selectedHospId}
                  onChange={(e) => setSelectedHospId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Doctor Full Name</label>
                <input 
                  type="text" 
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Dr. Kavitha Reddy"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Specialty Role</label>
                  <input 
                    type="text" 
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    placeholder="e.g. Pediatric Orthodontist"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Department</label>
                  <select 
                    value={docDeptId}
                    onChange={(e) => setDocDeptId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none"
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
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Qualifications</label>
                  <input 
                    type="text" 
                    value={docQual}
                    onChange={(e) => setDocQual(e.target.value)}
                    placeholder="MBBS, MDS"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Exp (Yrs)</label>
                  <input 
                    type="number" 
                    value={docExp}
                    onChange={(e) => setDocExp(e.target.value)}
                    placeholder="12"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Consultation Fee (₹)</label>
                <input 
                  type="number" 
                  value={docFee}
                  onChange={(e) => setDocFee(e.target.value)}
                  placeholder="500"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <Button type="submit" variant="primary" fullWidth className="py-3 mt-2 rounded-xl text-xs font-bold">
                Enroll Specialist
              </Button>
            </form>
          </Card>
        )}

      </div>
    </div>
  );
};
