import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getHospitalSVGImage } from '../../utils/mockData';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  ArrowLeft, Star, MapPin, Clock, Heart, Share2, 
  Phone, CheckCircle, Stethoscope
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface HospitalDetailsProps {
  onDoctorSelect: (hospitalId: string, doctorId: string) => void;
}

export const HospitalDetails: React.FC<HospitalDetailsProps> = ({ onDoctorSelect }) => {
  const { id } = useParams<{ id: string }>();
  const { hospitals, user, toggleSaveHospital, toggleSaveDoctor } = useApp();
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
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs md:rounded-2xl md:mb-6">
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

      <div className="px-5 mt-4 md:grid md:grid-cols-12 md:gap-8 items-start">
        
        {/* Left Column (Hospital Photo, Overview & Facilities) */}
        <div className="md:col-span-5 space-y-4 md:sticky md:top-24 mb-6 md:mb-0">
          {/* Real Hospital Photo Banner & Gallery */}
          <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-2xs">
            <div className="h-48 sm:h-56 w-full relative bg-slate-100">
              <img 
                src={hospital.image} 
                alt={hospital.name} 
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = getHospitalSVGImage(hospital.name); }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <Badge variant="blue" className="text-[9px] py-0.5 px-2 rounded-md mb-1 bg-blue-600 border-none font-bold">{hospital.category}</Badge>
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">{hospital.name}</h2>
                <p className="text-xs text-slate-200 mt-0.5 flex items-center gap-1 font-semibold">
                  <MapPin size={12} className="text-blue-400 shrink-0" />
                  <span>{hospital.address} • {hospital.distance} km</span>
                </p>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-amber-700 font-extrabold text-xs shadow-md">
                <Star size={14} className="fill-amber-500 text-amber-500" />
                <span>{hospital.rating}</span>
              </div>
            </div>
          </div>

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

        {/* Right Column: Doctors List & Queue Booking Cards */}
        <div className="md:col-span-7 space-y-4">
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
                        onClick={() => onDoctorSelect(hospital.id, doc.id)}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        Book Token
                      </Button>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8 bg-white border border-slate-100 rounded-3xl">
                <p className="text-xs font-bold text-slate-400">No doctors listed under this department</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
