import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getHospitalSVGImage } from '../../utils/mockData';
import { calculateDistanceKm } from '../../utils/googleMaps';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  ArrowLeft, Star, MapPin, Clock, Heart, Share2, 
  CheckCircle, Stethoscope, Navigation, AlertTriangle,
  ChevronLeft, ChevronRight, Video
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const formatTime12Hour = (timeStr: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;
  let h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, '0');
  if (isNaN(h)) return trimmed;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
};

interface GroupedTimingItem {
  days: string;
  hours: string;
}

const getGroupedTimings = (rawTimings: any): GroupedTimingItem[] => {
  if (!rawTimings) {
    return [{ days: 'Mon – Sun', hours: '09:00 AM – 08:00 PM' }];
  }
  if (typeof rawTimings === 'string') {
    return [{ days: 'OPD Schedule', hours: rawTimings }];
  }
  if (Array.isArray(rawTimings)) {
    if (rawTimings.length === 0) {
      return [{ days: 'Mon – Sun', hours: '09:00 AM – 08:00 PM' }];
    }
    if (typeof rawTimings[0] === 'object' && rawTimings[0] !== null) {
      const groups: { startDay: string; endDay: string; open: string; close: string }[] = [];

      rawTimings.forEach((item: any) => {
        const day = item.day || '';
        const open = item.open ? formatTime12Hour(item.open) : '';
        const close = item.close ? formatTime12Hour(item.close) : '';
        if (!day) return;

        const last = groups[groups.length - 1];
        if (last && last.open === open && last.close === close) {
          last.endDay = day;
        } else {
          groups.push({ startDay: day, endDay: day, open, close });
        }
      });

      return groups.map(g => {
        const daysLabel = g.startDay === g.endDay ? g.startDay : `${g.startDay} – ${g.endDay}`;
        const hoursLabel = (g.open && g.close) ? `${g.open} – ${g.close}` : (g.open || g.close || 'Closed');
        return { days: daysLabel, hours: hoursLabel };
      });
    }

    return [{ days: 'OPD Schedule', hours: rawTimings.map(String).join(', ') }];
  }

  if (typeof rawTimings === 'object' && rawTimings !== null) {
    const o = formatTime12Hour(rawTimings.open || '');
    const c = formatTime12Hour(rawTimings.close || '');
    return [{ days: 'Daily', hours: o && c ? `${o} – ${c}` : '09:00 AM – 08:00 PM' }];
  }

  return [{ days: 'OPD Schedule', hours: String(rawTimings) }];
};

interface HospitalDetailsProps {
  onDoctorSelect: (hospitalId: string, doctorId: string) => void;
}

export const HospitalDetails: React.FC<HospitalDetailsProps> = ({ onDoctorSelect }) => {
  const { id } = useParams<{ id: string }>();
  const { hospitals, user, toggleSaveHospital, toggleSaveDoctor, userCoords } = useApp();
  const navigate = useNavigate();
  
  const hospital = hospitals.find(h => h.id === id);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const mediaList = useMemo(() => {
    const rawGallery = (hospital as any)?.gallery;
    if (Array.isArray(rawGallery) && rawGallery.length > 0) {
      return rawGallery.map((item: any, i: number) => {
        if (typeof item === 'string') {
          return { id: `gal-${i}`, type: 'image', url: item, caption: hospital?.name || 'Hospital' };
        }
        return {
          id: item?.id || `gal-${i}`,
          type: item?.type || 'image',
          url: item?.url || item?.image || '',
          caption: item?.caption || hospital?.name || 'Hospital'
        };
      });
    }
    return [
      { id: 'cover', type: 'image', url: hospital?.image || '', caption: hospital?.name || 'Hospital' }
    ];
  }, [hospital]);

  useEffect(() => {
    if (mediaList.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setActiveMediaIndex(prev => (prev + 1) % mediaList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [mediaList.length, isHovered]);

  const [liveProfile, setLiveProfile] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/hospitals/${id}/profile`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          setLiveProfile(data.profile);
        }
      })
      .catch(() => {});
  }, [id]);

  const groupedTimings = useMemo(() => {
    const raw = liveProfile?.timings || (hospital as any)?.timings;
    return getGroupedTimings(raw);
  }, [liveProfile, hospital]);

  const formattedFacilities = useMemo(() => {
    const raw = (hospital as any)?.facilities;
    if (!Array.isArray(raw)) return [];
    return raw.map((fac: any) => {
      if (typeof fac === 'string') return fac;
      if (fac && typeof fac === 'object') return fac.name || fac.title || JSON.stringify(fac);
      return String(fac);
    });
  }, [hospital]);

  const isSaved = (hospital && user?.savedHospitals?.includes(hospital.id)) || false;

  const filteredDoctors = useMemo(() => {
    if (!hospital) return [];
    if (selectedDeptId === 'All') return hospital.doctors || [];
    return (hospital.doctors || []).filter(d => {
      if (d.departmentId === selectedDeptId) return true;
      const matchingDept = (hospital.departments || []).find(dp => dp.id === selectedDeptId);
      if (matchingDept && matchingDept.name) {
        return d.specialty?.toLowerCase() === matchingDept.name.toLowerCase() ||
               (d as any).department?.toLowerCase() === matchingDept.name.toLowerCase();
      }
      return false;
    });
  }, [hospital, selectedDeptId]);

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
          <div 
            className="h-72 sm:h-80 md:h-96 w-full relative bg-slate-900 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Active Media (Image or Video) */}
            {mediaList[activeMediaIndex]?.type === 'video' ? (
              <video 
                key={mediaList[activeMediaIndex].url}
                src={mediaList[activeMediaIndex].url} 
                autoPlay 
                muted 
                loop 
                playsInline 
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                key={mediaList[activeMediaIndex]?.url || hospital.image}
                src={mediaList[activeMediaIndex]?.url || hospital.image} 
                alt={mediaList[activeMediaIndex]?.caption || hospital.name} 
                className="w-full h-full object-cover transition-opacity duration-500"
                onError={(e) => { (e.target as HTMLImageElement).src = getHospitalSVGImage(hospital.name); }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />

            {/* Media Type Badge */}
            {mediaList[activeMediaIndex]?.type === 'video' && (
              <span className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500/90 text-slate-950 font-black text-xs rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                <Video size={12} />
                <span>Video Tour ({activeMediaIndex + 1}/{mediaList.length})</span>
              </span>
            )}

            {/* Navigation Arrows (if multiple media) */}
            {mediaList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveMediaIndex(prev => (prev - 1 + mediaList.length) % mediaList.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/20 shadow-lg active:scale-95"
                  aria-label="Previous Media"
                >
                  <ChevronLeft size={20} className="stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediaIndex(prev => (prev + 1) % mediaList.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/20 shadow-lg active:scale-95"
                  aria-label="Next Media"
                >
                  <ChevronRight size={20} className="stroke-[2.5]" />
                </button>

                {/* Dot Indicators */}
                <div className="absolute top-4 right-4 hidden md:flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
                  {mediaList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === activeMediaIndex ? 'w-5 bg-blue-500' : 'w-1.5 bg-white/50 hover:bg-white'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
            
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
              {(hospital.departments || []).map(dept => (
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
                const isDocUnavailable = doc.active === false || doc.onlineConsult === false;
                const isHospitalDisabled = hospital.status === 'disabled';
                const cannotBook = isHospitalDisabled || isDocUnavailable;

                return (
                  <Card key={doc.id} padding="none" className={`p-4 bg-white border rounded-3xl shadow-2xs transition-all ${isDocUnavailable ? 'border-rose-150 bg-rose-50/10' : 'border-slate-150'}`}>
                    <div className="flex gap-3.5 items-center">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-150 bg-slate-50 relative">
                        <img 
                          src={doc.image} 
                          alt={doc.name} 
                          className={`w-full h-full object-cover ${isDocUnavailable ? 'grayscale-50 opacity-80' : ''}`}
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80"; }}
                        />
                        {isDocUnavailable && (
                          <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center">
                            <span className="text-[9px] font-black bg-rose-600 text-white px-1 py-0.5 rounded">OFF</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-slate-900 text-sm">{doc.name}</h4>
                            {isDocUnavailable && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                ⛔ Unavailable
                              </span>
                            )}
                          </div>
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
                        <span className={`text-xs font-black flex items-center gap-1 ${isDocUnavailable ? 'text-slate-400' : 'text-emerald-600'}`}>
                          <Clock size={12} /> {isDocUnavailable ? 'Unavailable' : `${docWaitTime} mins`}
                        </span>
                      </div>

                      <Button 
                        variant="primary" 
                        size="sm"
                        disabled={cannotBook}
                        onClick={() => !cannotBook && onDoctorSelect(hospital.id, doc.id)}
                        className={`py-2 px-4 rounded-xl text-xs font-extrabold ${
                          cannotBook 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        }`}
                      >
                        {isHospitalDisabled ? 'Account Disabled' : isDocUnavailable ? 'Doctor Unavailable' : 'Book Token'}
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
          <Card className="p-5 border-none shadow-2xs bg-white rounded-3xl space-y-4">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">About Hospital</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{hospital.about || 'Leading healthcare institution providing patient-centric care and modern medical facilities.'}</p>
            </div>
            
            {/* OPD TIMINGS CARD */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-800">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-blue-600" />
                  <span>OPD Timings</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">Open</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {groupedTimings.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{t.days}</span>
                    <span className="font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs text-[11px]">{t.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GOOGLE MAPS NAVIGATION */}
            <div className="border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <Navigation size={14} className="text-blue-600 shrink-0" />
                <a 
                  href={hospital.lat && hospital.lng 
                    ? `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + hospital.address)}`
                  } 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                >
                  Navigate on Google Maps ↗
                </a>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-none shadow-2xs bg-white rounded-3xl">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-2.5">Hospital Facilities</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-semibold">
              {formattedFacilities.map((fac, idx) => (
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
