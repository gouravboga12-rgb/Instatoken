import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { 
  Bell, Settings, Camera, Edit2, Calendar,
  FileText, Heart, User,
  Shield, Trash2, LogOut, ChevronRight,
  ArrowLeft
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, hospitals, logout, addFamilyMember, removeFamilyMember, toggleSaveDoctor } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const [isMedicalRecordsOpen, setIsMedicalRecordsOpen] = useState(
    location.state?.openRecords || searchParams.get('tab') === 'records' || false
  );

  const openRecordsTrigger = location.state?.openRecords;
  const tabRecordsTrigger = searchParams.get('tab') === 'records';

  useEffect(() => {
    if (openRecordsTrigger || tabRecordsTrigger) {
      setIsMedicalRecordsOpen(true);
      const newState = { ...location.state };
      delete newState.openRecords;
      
      let newSearch = location.search;
      if (tabRecordsTrigger) {
        const tempParams = new URLSearchParams(location.search);
        tempParams.delete('tab');
        const searchStr = tempParams.toString();
        newSearch = searchStr ? `?${searchStr}` : '';
      }
      
      navigate(location.pathname + newSearch, { replace: true, state: newState });
    }
  }, [openRecordsTrigger, tabRecordsTrigger, location.search, location.pathname, location.state, navigate]);

  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isFavDoctorsOpen, setIsFavDoctorsOpen] = useState(false);
  const [famName, setFamName] = useState('');
  const [famAge, setFamAge] = useState('');
  const [famGender, setFamGender] = useState('Male');
  const [famRel, setFamRel] = useState('Spouse');

  // Edit profile form state
  const [editName, setEditName] = useState(user?.name || 'Anil Kumar');
  const [editPhone, setEditPhone] = useState(user?.phone || '+91 98856 14326');
  const [editEmail, setEditEmail] = useState(user?.email || 'anil.kumar@example.com');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white max-w-md mx-auto">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500 mb-4">Please login to view profile</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  const handleAddFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!famName || !famAge) {
      alert("Please fill in all family fields");
      return;
    }
    addFamilyMember(famName, parseInt(famAge), famGender, famRel);
    setIsAddFamilyOpen(false);
    setFamName('');
    setFamAge('');
    setFamGender('Male');
    setFamRel('Spouse');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const savedDoctorObjects = hospitals.flatMap(hosp => 
    (hosp.doctors || [])
      .filter(doc => (user?.savedDoctors || []).includes(doc.id))
      .map(doc => ({ ...doc, hospital: hosp }))
  );

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-6 w-full">
      
      {/* 1. TOP PROFILE HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#0055FE] via-[#004CF6] to-[#0038CE] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        
        {/* Top Header Icons */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/')}
              className="md:hidden p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-lg font-black tracking-tight font-heading">My Profile</h2>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition-all text-white cursor-pointer relative"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-ping" />
            </button>
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition-all text-white cursor-pointer"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* User Info Row */}
        <div className="flex items-center gap-4 relative z-10">
          
          {/* Avatar with Edit Camera Badge */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-white overflow-hidden bg-white/20 shadow-md">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ffffff&color=2563EB&size=200&bold=true`;
                }}
              />
            </div>
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-white cursor-pointer shadow-sm"
            >
              <Camera size={12} />
            </button>
          </div>

          {/* User Name & Details */}
          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-1.5 leading-tight">
              <span>{user.name}</span>
              <span className="w-4 h-4 bg-white text-blue-600 rounded-full text-[10px] font-black inline-flex items-center justify-center shadow-xs">✓</span>
            </h3>
            <p className="text-xs text-blue-100 font-semibold flex items-center gap-1">
              <span>📞</span>
              <span>{user.phone || '+91 98856 14326'}</span>
            </p>

            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="mt-1 px-3 py-1 bg-white/20 hover:bg-white/30 border border-white/40 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Edit2 size={10} />
              <span>Edit Profile</span>
            </button>
          </div>

        </div>

      </div>

      <div className="space-y-5">

        {/* 2. QUICK ACCESS CARDS GRID */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Card 1: My Bookings */}
          <button 
            onClick={() => navigate('/bookings')}
            className="bg-white border border-slate-150 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs hover:border-blue-200 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 leading-tight">My Bookings</h4>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Upcoming &amp; Previous Tokens</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
          </button>

          {/* Card 2: Medical Records */}
          <button 
            onClick={() => setIsMedicalRecordsOpen(true)}
            className="bg-white border border-slate-150 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs hover:border-blue-200 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Medical Records</h4>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Lab Reports, Prescriptions &amp; Documents</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
          </button>

        </div>

        {/* SETTINGS LIST MENU CARDS */}
        <div className="bg-white border border-slate-150 rounded-3xl p-2 shadow-2xs divide-y divide-slate-100">
          
          <button 
            onClick={() => setIsFavDoctorsOpen(true)}
            className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left rounded-xl"
          >
            <div className="flex items-center gap-3">
              <User size={18} className="text-blue-600" />
              <span className="text-xs font-extrabold text-slate-800">Favourite Doctors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">({savedDoctorObjects.length})</span>
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </button>

          <button
            onClick={() => alert("Terms & Conditions loaded.")}
            className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left rounded-xl"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-slate-500" />
              <span className="text-xs font-extrabold text-slate-800">Terms &amp; Conditions</span>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

          <button 
            onClick={() => alert("Privacy Policy loaded.")}
            className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left rounded-xl"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-emerald-600" />
              <span className="text-xs font-extrabold text-slate-800">Privacy Policy</span>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

          <button 
            onClick={() => alert("Account deletion request initiated.")}
            className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left rounded-xl"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="text-red-500" />
              <span className="text-xs font-extrabold text-slate-800">Delete Account</span>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

          <button 
            onClick={handleLogout}
            className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left rounded-xl"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-slate-600" />
              <span className="text-xs font-extrabold text-slate-800">Logout</span>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

        </div>

      </div>

      {/* Modal Add Family Member */}
      <Modal isOpen={isAddFamilyOpen} onClose={() => setIsAddFamilyOpen(false)} title="Manage Family Members">
        <div className="space-y-4">
          
          {/* List of existing family members */}
          {(user?.familyMembers || []).length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Family Members</p>
              {(user?.familyMembers || []).map((member) => (
                <div key={member.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">{member.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{member.relationship} • {member.gender}, {member.age} yrs</span>
                  </div>
                  <button 
                    onClick={() => removeFamilyMember(member.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddFamily} className="space-y-3.5 text-left border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add New Family Member</p>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase">Full Name</label>
              <input 
                type="text"
                value={famName}
                onChange={(e) => setFamName(e.target.value)}
                placeholder="e.g. Maya Sharma"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase">Age (Years)</label>
                <input 
                  type="number"
                  value={famAge}
                  onChange={(e) => setFamAge(e.target.value)}
                  placeholder="e.g. 14"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase">Gender</label>
                <select 
                  value={famGender}
                  onChange={(e) => setFamGender(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase">Relationship</label>
              <select 
                value={famRel}
                onChange={(e) => setFamRel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              >
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Sibling">Sibling</option>
              </select>
            </div>

            <Button type="submit" variant="primary" fullWidth className="py-2.5 mt-2 rounded-xl text-xs font-bold">
              Register Family Member
            </Button>
          </form>
        </div>
      </Modal>

      {/* Modal Edit Profile */}
      <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} title="Edit Profile Details">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            alert("Profile updated successfully!");
            setIsEditProfileOpen(false);
          }} 
          className="space-y-4 text-left"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 uppercase">Full Name</label>
            <input 
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 uppercase">Mobile Number</label>
            <input 
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 uppercase">Email Address</label>
            <input 
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <Button type="submit" variant="primary" fullWidth className="py-2.5 mt-2 rounded-xl text-xs font-bold">
            Save Changes
          </Button>
        </form>
      </Modal>

      {/* Favourite Doctors Modal */}
      <Modal isOpen={isFavDoctorsOpen} onClose={() => setIsFavDoctorsOpen(false)} title="Favourite Doctors">
        <div className="space-y-3 py-2 text-left">
          {savedDoctorObjects.length > 0 ? (
            savedDoctorObjects.map(({ hospital, ...doc }) => (
              <div key={doc.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <img 
                    src={doc.image} 
                    alt={doc.name}
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-blue-100 bg-white"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80"; }}
                  />
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-xs truncate">{doc.name}</h4>
                    <p className="text-[10px] text-blue-600 font-extrabold">{doc.specialty}</p>
                    <p className="text-[9px] text-slate-500 font-medium truncate">{hospital.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      setIsFavDoctorsOpen(false);
                      navigate(`/book/${hospital.id}/${doc.id}`);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl cursor-pointer shadow-xs transition-colors"
                  >
                    Book Token
                  </button>
                  <button 
                    onClick={() => toggleSaveDoctor(doc.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                    title="Remove from favorites"
                  >
                    <Heart size={16} className="fill-red-500" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              <User size={32} className="mx-auto mb-2 opacity-50 text-blue-500" />
              <p className="text-xs font-bold text-slate-600">No favourite doctors added yet</p>
              <p className="text-[10px] mt-1 text-slate-400">Tap the heart icon on any doctor profile to save them here.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Medical Records Modal */}
      <Modal isOpen={isMedicalRecordsOpen} onClose={() => setIsMedicalRecordsOpen(false)} title="Health Records">
        <div className="space-y-3.5 py-2 text-left">
          <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-3 rounded-2xl">
            <div>
              <h4 className="text-xs font-black text-blue-700">Digital Health Vault</h4>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">All prescriptions, lab tests & reports are secured</p>
            </div>
            <button 
              onClick={() => alert("Upload functionality: select file from device.")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-3 py-1.5 rounded-xl cursor-pointer shadow-xs transition-colors flex items-center gap-1"
            >
              <span>+ Upload</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {[
              { id: "rec-1", name: "General Medicine Prescription", date: "20 Jul 2026", doctor: "Dr. Anil Kumar", hosp: "Apollo Spectra", fileType: "PDF", size: "245 KB" },
              { id: "rec-2", name: "Cardiology Screening Report", date: "15 Jul 2026", doctor: "Dr. Sarah D'Souza", hosp: "Fortis Hospital", fileType: "PDF", size: "1.2 MB" },
              { id: "rec-3", name: "Blood Test - Complete Count (CBC)", date: "10 Jun 2026", doctor: "Diagnostic Lab", hosp: "Rainbow Children's Hospital", fileType: "PDF", size: "512 KB" }
            ].map((rec) => (
              <div key={rec.id} className="bg-white border border-slate-150 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-3xs hover:border-blue-200 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 font-black text-[10px]">
                    {rec.fileType}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate leading-snug">{rec.name}</h4>
                    <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">{rec.doctor} • {rec.date}</p>
                    <p className="text-[9px] text-blue-600 font-extrabold">{rec.hosp}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => alert(`Opening ${rec.name} (${rec.size})...`)}
                    className="p-2 text-slate-550 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors text-[10px] font-bold border border-slate-200"
                    title="View Document"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => alert(`Downloading ${rec.name}...`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors text-[10px] font-bold"
                    title="Download Document"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2 text-[9.5px] text-slate-400 font-medium border-t border-slate-100">
            Secured & Encrypted with 256-bit SSL encryption.
          </div>
        </div>
      </Modal>

    </div>
  );
};
