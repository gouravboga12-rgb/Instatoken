import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { 
  ArrowLeft, Mail, Phone, Users, Shield, 
  Plus, LogOut, ChevronRight, Heart, HelpCircle, Trash2,
  Award, Calendar, Zap, CheckCircle2
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, logout, addFamilyMember, removeFamilyMember, hospitals } = useApp();
  const navigate = useNavigate();

  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [famName, setFamName] = useState('');
  const [famAge, setFamAge] = useState('');
  const [famGender, setFamGender] = useState('Male');
  const [famRel, setFamRel] = useState('Spouse');

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
    // Reset forms
    setFamName('');
    setFamAge('');
    setFamGender('Male');
    setFamRel('Spouse');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Find actual saved hospitals details
  const savedHospitalsDetails = hospitals.filter(h => user.savedHospitals.includes(h.id));

  const hasActiveSub = user.subscription && new Date(user.subscription.expiresAt) > new Date();

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:bg-transparent md:pb-6 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 flex items-center gap-3">
        <button 
          onClick={() => navigate('/')}
          className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors bg-white shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">My Profile</h2>
      </div>

      <div className="px-5 mt-4 space-y-5">
        
        {/* Profile Card Summary */}
        <Card className="p-5 border-none shadow-xs bg-white text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 text-3xl font-heading font-black mb-3">
            {user.name.charAt(0)}
          </div>
          <h3 className="font-extrabold text-base text-slate-800 tracking-tight">{user.name}</h3>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{user.role} Account</p>
          
          <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50 text-[10px] text-slate-500 font-medium">
            <span className="flex items-center justify-center gap-1">
              <Mail size={12} className="text-slate-400" />
              {user.email}
            </span>
            <span className="flex items-center justify-center gap-1">
              <Phone size={12} className="text-slate-400" />
              {user.phone}
            </span>
          </div>
        </Card>

        {/* Platform Booking Pass Status Card */}
        <Card className="p-5 border-none shadow-xs bg-white">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Award size={15} className="text-blue-600" />
              Platform Booking Pass
            </h4>
          </div>

          {hasActiveSub && user.subscription ? (
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-100 flex items-start gap-3">
              <div className="bg-blue-600 text-white p-2.5 rounded-xl flex items-center justify-center shrink-0">
                <Zap size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black text-slate-850 block">{user.subscription.planName}</span>
                  <Badge variant="blue" className="text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase bg-blue-600 text-white border-none">ACTIVE</Badge>
                </div>
                <p className="text-[9.5px] text-slate-500 mt-1 flex items-center gap-1 font-semibold">
                  <Calendar size={12} className="text-slate-400" />
                  Expires on {new Date(user.subscription.expiresAt).toLocaleDateString()}
                </p>
                <div className="mt-3.5 space-y-1.5 text-[9.5px] font-bold text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                    <span>Free platform booking fee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                    <span>Unlimited OPD tokens booking</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <p className="text-xs font-bold text-slate-650">No Active Pass Detected</p>
                <p className="text-[9.5px] text-slate-400 mt-1 max-w-[280px] mx-auto leading-normal font-semibold">
                  A booking pass is required to book OPD tokens. Consultation fees are collected directly at the hospital cabin.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => navigate('/plans')}
                fullWidth
                className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Purchase Booking Pass</span>
              </Button>
            </div>
          )}
        </Card>

        {/* Central Control Console */}
        <Card className="p-4 border-none bg-slate-900 text-white shadow-lg shadow-slate-900/10 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black tracking-wide flex items-center gap-1">
              <Shield size={14} className="text-blue-400" />
              Central Control Console
            </h4>
            <p className="text-[9px] text-slate-400 mt-1 max-w-[200px]">Switch to admin control panel to manage doctor listings and queues.</p>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => navigate('/admin')}
            className="bg-blue-600 hover:bg-blue-700 text-[10px] font-bold py-1.5 px-3 rounded-lg border-none cursor-pointer"
          >
            Launch Admin
          </Button>
        </Card>

        {/* Family Member Manager Section */}
        <Card className="p-5 border-none shadow-xs bg-white">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Users size={15} className="text-blue-500" />
              Family Member Records
            </h4>
            <button 
              onClick={() => setIsAddFamilyOpen(true)}
              className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-0.5 text-[10px] font-bold cursor-pointer"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {user.familyMembers.length > 0 ? (
            <div className="space-y-3">
              {user.familyMembers.map((member) => (
                <div key={member.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">{member.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{member.relationship} • {member.gender}, {member.age} yrs</span>
                  </div>
                  <button 
                    onClick={() => removeFamilyMember(member.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400">No family members registered yet.</p>
            </div>
          )}
        </Card>

        {/* Favorite Hospitals Section */}
        <Card className="p-5 border-none shadow-xs bg-white">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-4">
            <Heart size={15} className="text-red-500 fill-red-500" />
            Favorite Bookmarked Hospitals
          </h4>
          
          {savedHospitalsDetails.length > 0 ? (
            <div className="space-y-3">
              {savedHospitalsDetails.map((hosp) => (
                <div 
                  key={hosp.id} 
                  onClick={() => navigate(`/hospital/${hosp.id}`)}
                  className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-100 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                      <img src={hosp.image} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block line-clamp-1">{hosp.name}</span>
                      <span className="text-[9px] text-slate-400 font-semibold">{hosp.category}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400">No favorited hospitals found.</p>
            </div>
          )}
        </Card>

        {/* Support section & Logout */}
        <Card className="p-4 border-none shadow-xs bg-white space-y-1">
          <button 
            onClick={() => alert("FAQs & Ticket system loaded.")}
            className="w-full flex justify-between items-center py-2.5 text-xs text-slate-600 font-bold hover:text-blue-600 transition-colors border-b border-slate-50 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HelpCircle size={15} className="text-slate-400" />
              Help & Support Tickets
            </span>
            <ChevronRight size={12} className="text-slate-400" />
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 py-2.5 text-xs text-red-500 font-bold hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            Logout Account
          </button>
        </Card>

      </div>

      {/* Modal Add Family Member */}
      <Modal isOpen={isAddFamilyOpen} onClose={() => setIsAddFamilyOpen(false)} title="Register Family Member">
        <form onSubmit={handleAddFamily} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
            <input 
              type="text"
              value={famName}
              onChange={(e) => setFamName(e.target.value)}
              placeholder="e.g. Maya Sharma"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age (Years)</label>
              <input 
                type="number"
                value={famAge}
                onChange={(e) => setFamAge(e.target.value)}
                placeholder="e.g. 14"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</label>
              <select 
                value={famGender}
                onChange={(e) => setFamGender(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Relationship</label>
            <select 
              value={famRel}
              onChange={(e) => setFamRel(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            >
              <option value="Spouse">Spouse</option>
              <option value="Child">Child</option>
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Sibling">Sibling</option>
            </select>
          </div>

          <Button type="submit" variant="primary" fullWidth className="py-2.5 mt-2 rounded-xl text-xs font-bold">
            Register Member
          </Button>
        </form>
      </Modal>

    </div>
  );
};
