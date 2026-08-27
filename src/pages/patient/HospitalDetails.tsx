import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getHospitalSVGImage } from '../../utils/mockData';
import { calculateDistanceKm } from '../../utils/googleMaps';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  ArrowLeft, Star, MapPin, Clock, Heart, Share2, 
  Phone, CheckCircle, Stethoscope, Navigation, AlertTriangle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface HospitalDetailsProps {
  onDoctorSelect: (hospitalId: string, doctorId: string) => void;
}

export const HospitalDetails: React.FC<HospitalDetailsProps> = ({ onDoctorSelect }) => {
  const { id } = useParams<{ id: string }>();
  const { hospitals, user, toggleSaveHospital, toggleSaveDoctor, userCoords } = useApp();
  const navigate = useNavigate();
  
  const hospital = hospitals.find(h => h.id === id);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');

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
    <div className="pb-24 bg-slate-50 min-h-screen md:bg-transparent md:min-h-0 md:pb-6 w-full">
      
      {/* Sticky Top Bar Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs md:rounded-2xl md:mb-6 hidden md:block">
        <div className="flex items-center gap-3 px-4 md:px-6 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Hospital OPD</p>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight truncate mt-0.5">{hospital.name}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleSaveHospital(hospital.id)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Heart size={16} className={isSaved ? 'text-red-500 fill-red-500' : 'text-slate-500'} />
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Share2 size={16} className="text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Real Hospital Photo Banner & Gallery (Always top) */}
      <div className="px-0 md:px-5 md:mt-4 mb-4">
        <div className="bg-white border-b border-slate-150 md:border md:rounded-3xl overflow-hidden shadow-2xs rounded-b-3xl">
          <div className="h-72 sm:h-80 md:h-96 w-full relative bg-slate-100">
            <img 
              src={hospital.image} 
              alt={hospital.name} 
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = getHospitalSVGImage(hospital.name); }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
            
            {/* Mobile-only overlay navigation buttons */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between md:hidden">
              <button 
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md text-slate-800 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <ArrowLeft size={18} className="stroke-[3]" />
              </button>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleSaveHospital(hospital.id)}
                  className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md text-slate-800 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Heart size={16} className={isSaved ? "text-red-500 fill-red-500" : "text-slate-700"} />
                </button>
                <button 
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md text-slate-800 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Share2 size={16} className="text-slate-700" />
                </button>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-white flex justify-between items-end gap-3">
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white mb-1 shadow-2xs">{hospital.category}</span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">{hospital.name}</h2>
                <p className="text-xs text-slate-200 mt-1 flex items-center gap-2 flex-wrap font-semibold">
                  <MapPin size={13} className="text-blue-400 shrink-0" />
                  <span>{hospital.address}</span>
                  <span className="bg-blue-600/90 text-white font-extrabold px-2.5 py-0.5 rounded-lg text-[10.5px] shadow-sm border border-blue-400/40 backdrop-blur-xs">
                    {(userCoords && hospital.lat && hospital.lng)
                      ? calculateDistanceKm(userCoords.lat, userCoords.lng, hospital.lat, hospital.lng)
                      : hospital.distance} km away
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span>{hospital.rating}</span>
                  </span>
                </p>
              </div>
              <a 
                href={hospital.lat && hospital.lng 
                  ? `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + hospital.address)}`
                } 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-3 py-2 rounded-xl flex items-center gap-1 shrink-0 shadow-lg border border-blue-400/20 transition-all cursor-pointer hover:scale-105"
              >
                <Navigation size={11} className="fill-white text-white" />
                <span>Navigate</span>
              </a>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-amber-700 font-extrabold text-xs shadow-md md:flex hidden">
              <Star size={14} className="fill-amber-500 text-amber-500" />
              <span>{hospital.rating}</span>
            </div>
          </div>
        </div>
      </div>

      {hospital.status === 'disabled' && (
        <div className="mx-5 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-extrabold flex items-center gap-3 shadow-2xs">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-black text-amber-900 leading-none">Hospital Account Temporarily Disabled</p>
            <p className="text-[11px] font-semibold text-amber-700 mt-1">This hospital is currently suspended by central administration. Token bookings are temporarily unavailable.</p>
          </div>
        </div>
      )}

      <div className="px-5 flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start">
        
        {/* Right Column: Doctors List & Queue Booking Cards (Mobile: FIRST, Desktop: SECOND) */}
        <div className="w-full md:col-span-7 space-y-4 order-first md:order-last mb-6 md:mb-0">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="text-blue-600" size={18} />
              <span>Available Doctors & OPD Tokens</span>
            </h3>
            <span className="text-xs font-extrabold text-blue-600">{filteredDoctors.length} Doctors</span>
          </div>

          {/* Department filter pills */}
          <div className="bg-white border border-slate-150 rounded-2xl p-3 shadow-2xs">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedDeptId('All')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${selectedDeptId === 'All' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                All Specialties
              </button>
              {hospital.departments.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold shrink-0 cursor-pointer transition-all ${selectedDeptId === dept.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          {/* Doctor Cards List */}
          <div className="space-y-3.5">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map(doc => {
                const ahead = Math.max(0, doc.nextAvailableToken - doc.currentQueue - 1);
                const docWaitTime = ahead * doc.estimatedWaitPerPatient;
                const isDocSaved = user?.savedDoctors?.includes(doc.id) || false;

                return (
                  <Card key={doc.id} padding="none" className="p-4 bg-white border border-slate-150 rounded-3xl shadow-2xs">
                    <div className="flex gap-3.5 items-center">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-150 bg-slate-50">
                        <img 
                          src={doc.image} 
                          alt={doc.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80"; }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900 text-sm">{doc.name}</h4>
                          <button 
                            onClick={() => toggleSaveDoctor(doc.id)}
                            className="p-1 rounded-xl hover:bg-red-50 text-slate-400 transition-colors cursor-pointer"
                            title={isDocSaved ? "Remove from Favourite Doctors" : "Add to Favourite Doctors"}
                          >
                            <Heart size={16} className={isDocSaved ? "text-red-500 fill-red-500" : "text-slate-400 hover:text-red-400"} />
                          </button>
                        </div>
                        <p className="text-[10px] text-blue-600 font-extrabold">{doc.specialty}</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{doc.qualification} • {doc.experience} yrs exp</p>
                        <div className="flex items-center gap-1 mt-1 text-amber-500">
                          <Star size={10} fill="currentColor" />
                          <span className="text-[10px] font-bold text-slate-600">{doc.rating} ({doc.reviewsCount})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Consultation Fee</span>
                        <span className="text-xs font-black text-slate-900">₹{doc.consultationFee}</span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Live Queue Wait</span>
                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                          <Clock size={12} /> {docWaitTime} mins
                        </span>
                      </div>

                      <Button 
                        variant="primary" 
                        size="sm"
                        disabled={hospital.status === 'disabled'}
                        onClick={() => onDoctorSelect(hospital.id, doc.id)}
                        className={`py-2 px-4 rounded-xl text-xs font-extrabold cursor-pointer ${
                          hospital.status === 'disabled' 
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {hospital.status === 'disabled' ? 'Account Disabled' : 'Book Token'}
                      </Button>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8 bg-white border border-slate-150 rounded-3xl">
                <p className="text-xs font-bold text-slate-400">No doctors listed under this department</p>
              </div>
            )}
          </div>
        </div>

        {/* Left Column (Overview & Facilities) (Mobile: SECOND, Desktop: FIRST) */}
        <div className="w-full md:col-span-5 space-y-4 md:sticky md:top-24 mb-6 md:mb-0 order-last md:order-first">
          {/* ABOUT HOSPITAL & FACILITIES SECTION */}
          <Card className="p-5 border-none shadow-2xs bg-white rounded-3xl">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-2.5">About Hospital</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">{hospital.about}</p>
            
            <div className="border-t border-slate-100 pt-3 mt-3 space-y-1.5 text-xs text-slate-600 font-semibold">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-600 shrink-0" />
                <span>Timings: {hospital.timings}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-blue-600 shrink-0" />
                <span>Contact: {hospital.contact}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                <Navigation size={14} className="text-blue-600 shrink-0" />
                <a 
                  href={hospital.lat && hospital.lng 
                    ? `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + hospital.address)}`
                  } 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-650 hover:underline flex items-center gap-0.5 font-bold"
                >
                  Navigate on Google Maps ↗
                </a>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-none shadow-2xs bg-white rounded-3xl">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-2.5">Hospital Facilities</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-semibold">
              {hospital.facilities.map((fac, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  <span>{fac}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
