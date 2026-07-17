import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  ArrowLeft, Star, MapPin, Clock, Heart, Share2, 
  Phone, CheckCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface HospitalDetailsProps {
  onDoctorSelect: (hospitalId: string, doctorId: string) => void;
}

export const HospitalDetails: React.FC<HospitalDetailsProps> = ({ onDoctorSelect }) => {
  const { id } = useParams<{ id: string }>();
  const { hospitals, user, toggleSaveHospital } = useApp();
  const navigate = useNavigate();
  
  const hospital = hospitals.find(h => h.id === id);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [activeImg, setActiveImg] = useState<string>(hospital?.image || '');

  if (!hospital) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white max-w-md mx-auto">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500 mb-4">Hospital not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Initial active image setup
  if (!activeImg && hospital.image) {
    setActiveImg(hospital.image);
  }

  const isSaved = user?.savedHospitals.includes(hospital.id) || false;

  const filteredDoctors = selectedDeptId === 'All' 
    ? hospital.doctors 
    : hospital.doctors.filter(d => d.departmentId === selectedDeptId);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: hospital.name,
        text: `Check out ${hospital.name} on InstaToken.`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert(`Share Link copied: ${window.location.href}`);
    }
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:bg-transparent md:min-h-0 md:pb-6">
      
      {/* ── Sticky Top Header (all screen sizes) ─────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 md:px-6 py-3">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Hospital Name + Breadcrumb */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Hospital Details</p>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight truncate mt-0.5">{hospital.name}</h1>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleSaveHospital(hospital.id)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 transition-colors cursor-pointer"
              aria-label="Save hospital"
            >
              <Heart size={16} className={isSaved ? 'text-red-500 fill-red-500' : 'text-slate-500'} />
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
              aria-label="Share"
            >
              <Share2 size={16} className="text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile top floating bar (hidden on desktop) */}

      <div className="md:hidden relative h-64 w-full bg-slate-200">
        <img 
          src={activeImg} 
          alt={hospital.name} 
          className="w-full h-full object-cover transition-all duration-300"
          onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
        />
        
        {/* Floating Headers */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md text-slate-700 shadow-sm hover:bg-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => toggleSaveHospital(hospital.id)}
              className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md text-slate-700 shadow-sm hover:bg-white transition-colors cursor-pointer"
            >
              <Heart size={16} className={isSaved ? 'text-red-500 fill-red-500' : 'text-slate-600'} />
            </button>
            <button 
              onClick={handleShare}
              className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md text-slate-700 shadow-sm hover:bg-white transition-colors cursor-pointer"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Gallery Thumbnails */}
        {hospital.gallery && hospital.gallery.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 z-10">
            {[hospital.image, ...hospital.gallery].slice(0, 4).map((imgUrl, index) => (
              <button
                key={index}
                onClick={() => setActiveImg(imgUrl)}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${activeImg === imgUrl ? 'border-blue-600 scale-105' : 'border-white/80'}`}
              >
                <img src={imgUrl} className="w-full h-full object-cover" alt=""
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(hospital.name)}&background=E0E7FF&color=4F46E5&size=100&bold=true`; }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Split Grid (Desktop Responsive Layout) */}
      <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 mt-4 md:mt-0 px-5 md:px-0">
        
        {/* Left Column: Image, Gallery, About, and Map (Width: 5/12 on desktop) */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Desktop Cover & Gallery (hidden on mobile) */}
          <div className="hidden md:block space-y-3">
            <div className="h-72 w-full bg-slate-200 rounded-3xl overflow-hidden shadow-sm relative border border-slate-100">
              <img src={activeImg} className="w-full h-full object-cover" alt=""
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  const parent = el.parentElement;
                  if (parent) {
                    parent.style.background = 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)';
                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#93C5FD' stroke-width='1.5'><path d='M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg></div>`;
                  }
                }}
              />
              <button 
                onClick={() => toggleSaveHospital(hospital.id)}
                className="absolute top-4 right-4 p-2.5 rounded-2xl bg-white/95 text-slate-700 hover:text-red-500 transition-colors shadow-sm cursor-pointer"
              >
                <Heart size={16} className={isSaved ? 'text-red-500 fill-red-500' : 'text-slate-600'} />
              </button>
            </div>
            
            <div className="flex gap-2">
              {[hospital.image, ...hospital.gallery].slice(0, 4).map((imgUrl, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImg(imgUrl)}
                  className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${activeImg === imgUrl ? 'border-blue-600 scale-105' : 'border-white bg-slate-100'}`}
                >
                  <img src={imgUrl} className="w-full h-full object-cover" alt=""
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(hospital.name)}&background=DBEAFE&color=3B82F6&size=80&bold=true`; }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* About Hospital details card */}
          <Card className="p-5 border-none shadow-xs bg-white">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">About Hospital</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{hospital.about}</p>
            
            <div className="border-t border-slate-50 pt-4 mt-4 flex flex-col gap-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-medium">
                <Clock size={16} className="text-blue-500 shrink-0" />
                <span>Timings: {hospital.timings}</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Phone size={16} className="text-blue-500 shrink-0" />
                <span>Contact: {hospital.contact}</span>
              </div>
            </div>
          </Card>

          {/* Amenities & Map */}
          <Card className="p-5 border-none shadow-xs bg-white">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Hospital Facilities</h4>
            <div className="grid grid-cols-2 gap-3.5 mb-5 text-xs text-slate-600 font-medium">
              {hospital.facilities.map((fac, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  <span>{fac}</span>
                </div>
              ))}
            </div>

            <div className="h-40 bg-sky-50 rounded-2xl relative overflow-hidden flex flex-col justify-end p-3 border border-sky-100/50">
              <div className="absolute inset-0 bg-cover bg-center filter opacity-60 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400')]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-600/30 rounded-full absolute -top-2 -left-2 animate-ping" />
                  <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-md">
                    <MapPin size={10} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-white/95 border border-slate-100 rounded-xl p-2 z-10 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-800 leading-none">Map Coordinates</p>
                  <p className="text-[8px] text-slate-400 mt-0.5 font-mono">{hospital.lat.toFixed(4)}° N, {hospital.lng.toFixed(4)}° E</p>
                </div>
                <a 
                  href={`https://www.google.com/maps?q=${hospital.lat},${hospital.lng}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="py-1 px-2.5 bg-blue-600 text-white rounded-lg text-[9px] font-bold cursor-pointer"
                >
                  Navigate
                </a>
              </div>
            </div>
          </Card>

        </div>

        {/* Right Column: Hospital Header and Doctor Availability cabins (Width: 7/12 on desktop) */}
        <div className="md:col-span-7 space-y-6 mt-6 md:mt-0">
          
          {/* Hospital Header Header */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-xs">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="blue" className="text-[9px] py-0.5 rounded-md mb-1.5">{hospital.category}</Badge>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight">{hospital.name}</h2>
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1 font-medium">
                  <MapPin size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>{hospital.address}</span>
                </p>
              </div>
              <button 
                onClick={handleShare}
                className="hidden md:block p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                <Share2 size={16} />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3.5 mt-5">
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100/50">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Rating</span>
                <span className="text-sm font-extrabold text-slate-800 mt-0.5 flex items-center justify-center gap-0.5">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  {hospital.rating}
                </span>
                <span className="text-[8px] text-slate-400 block mt-0.5">({hospital.reviewsCount} reviews)</span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100/50">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Distance</span>
                <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">{hospital.distance} km</span>
                <span className="text-[8px] text-blue-600 font-bold block mt-0.5">Nearby Area</span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100/50">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Avg OPD Wait</span>
                <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">~{hospital.baseWaitingTime} mins</span>
                <span className="text-[8px] text-emerald-600 font-bold block mt-0.5">Live Queue</span>
              </div>
            </div>
          </div>

          {/* Department selection & doctors cabins */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Available Specialties</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setSelectedDeptId('All')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${selectedDeptId === 'All' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                >
                  All Doctors
                </button>
                {hospital.departments.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDeptId(dept.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors ${selectedDeptId === dept.id ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctors lists */}
            <div className="space-y-4">
              {filteredDoctors.length > 0 ? (
                filteredDoctors.map(doc => {
                  const ahead = Math.max(0, doc.nextAvailableToken - doc.currentQueue - 1);
                  const docWaitTime = ahead * doc.estimatedWaitPerPatient;

                  return (
                    <Card key={doc.id} padding="none" className="p-5 flex flex-col justify-between shadow-xs">
                      <div className="flex gap-4">
                        {/* Doctor Image */}
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50">
                          <img 
                            src={doc.image} 
                            alt={doc.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=EFF6FF&color=2563EB&size=80&bold=true&font-size=0.4`; }}
                          />
                        </div>
                        
                        {/* Doctor Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{doc.name}</h4>
                          <p className="text-[10px] text-blue-600 font-semibold">{doc.specialty}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{doc.qualification} • {doc.experience} yrs experience</p>
                          <div className="flex items-center gap-0.5 text-amber-500 mt-1">
                            <Star size={10} fill="currentColor" />
                            <span className="text-[10px] font-bold text-slate-600">{doc.rating}</span>
                          </div>
                        </div>
                      </div>

                      {/* Waiting list / Fees row */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl">
                        <div className="space-y-0.5">
                          <div className="text-[9px] text-slate-400 font-semibold uppercase">Consultation Fee</div>
                          <div className="text-xs font-black text-slate-800">₹{doc.consultationFee}</div>
                        </div>
                        
                        <div className="space-y-0.5">
                          <div className="text-[9px] text-slate-400 font-semibold uppercase">Est Wait</div>
                          <div className="text-xs font-black text-emerald-600 flex items-center gap-1">
                            <Clock size={12} />
                            {docWaitTime} mins ({ahead} ahead)
                          </div>
                        </div>

                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => onDoctorSelect(hospital.id, doc.id)}
                          className="py-1.5 px-4 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Book Token
                        </Button>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8 bg-white border border-slate-100 rounded-3xl">
                  <p className="text-xs font-bold text-slate-400">No doctors available in this department</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
