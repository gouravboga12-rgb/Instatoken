import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { 
  MapPin, Bell, User, Search, Map, Star, Clock, 
  ChevronRight, Heart, Activity, Stethoscope, Baby, 
  Smile, Eye, Brain, ShieldAlert, Award, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
  onSearchSelect: (filterType?: string) => void;
  onHospitalSelect: (id: string) => void;
  onDoctorSelect: (hospId: string, docId: string) => void;
  onOpenNotifications: () => void;
}

export const Home: React.FC<HomeProps> = ({ 
  onSearchSelect, 
  onHospitalSelect, 
  onDoctorSelect,
  onOpenNotifications 
}) => {
  const { hospitals, articles, notifications, currentLocation, setCurrentLocation, detectAndSetLocation } = useApp();
  const navigate = useNavigate();

  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [locating, setLocating] = useState(false);

  // Slide index state for Hero Slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      title: "Skip the OPD Waiting Line",
      tag: "DIGITAL QUEUE",
      desc: "Book tokens from home, track live queue status and walk in just in time.",
      color: "from-blue-600 to-indigo-600",
      action: "Book Token"
    },
    {
      title: "Consult Top Cardiac Experts",
      tag: "SPECIALIZED CARE",
      desc: "Instant token booking for Cardiologists and Neurologists with live tracking.",
      color: "from-slate-950 to-blue-900",
      action: "Find Cardiologist"
    },
    {
      title: "Child Vaccination & Checkup",
      tag: "PEDIATRICS",
      desc: "Get digital slots for Pediatric specialists. Child-friendly OPD experience.",
      color: "from-emerald-600 to-teal-500",
      action: "Book Pediatrician"
    }
  ];

  // Auto scroll slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  
  const locations = [
    "Koramangala, Bengaluru", 
    "HSR Layout, Bengaluru", 
    "Gachibowli, Hyderabad",
    "ITI Road, Vijayawada",
    "Ram Nagar, Visakhapatnam",
    "Indiranagar, Bengaluru",
    "Jayanagar, Bengaluru"
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      onSearchSelect();
    }
  };

  // Map specialty names to icons
  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case "Cardiology": return <Heart size={20} className="text-red-500" />;
      case "Children Hospital": return <Baby size={20} className="text-teal-500" />;
      case "Eye Hospital": return <Eye size={20} className="text-blue-500" />;
      case "Dental Clinic": return <Smile size={20} className="text-emerald-500" />;
      case "Orthopedic": return <Activity size={20} className="text-purple-500" />;
      case "Neurology": return <Brain size={20} className="text-indigo-500" />;
      default: return <Stethoscope size={20} className="text-sky-500" />;
    }
  };

  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:bg-transparent md:min-h-0 md:pb-6">
      
      {/* 1. Header Component (Mobile Only) */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-slate-100 z-30 md:hidden">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-xl flex items-center justify-center text-white">
            <Activity size={18} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-none">InstaToken</h1>
            <button 
              type="button"
              onClick={() => setShowLocationSelect(!showLocationSelect)}
              className="flex items-center text-slate-500 text-[10px] font-semibold mt-0.5 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <MapPin size={10} className="text-blue-600 mr-0.5 shrink-0" />
              <span className="truncate max-w-[120px]">{currentLocation}</span>
              <ChevronRight size={10} className="rotate-90 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Location Dropdown Popover */}
        {showLocationSelect && (
          <div className="absolute left-5 top-14 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 border-b border-slate-50">Select Current Area</p>
            
            {/* GPS Button */}
            <button
              onClick={() => {
                setLocating(true);
                detectAndSetLocation();
                setTimeout(() => {
                  setLocating(false);
                  setShowLocationSelect(false);
                }, 4000);
              }}
              disabled={locating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer border-none mt-1 mb-1 disabled:opacity-60"
            >
              {locating 
                ? <Loader2 size={12} className="animate-spin shrink-0" />
                : <MapPin size={12} className="shrink-0" />
              }
              <span>{locating ? 'Detecting location...' : 'Use Current Location (GPS)'}</span>
            </button>

            <div className="border-t border-slate-100 my-1" />

            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  setCurrentLocation(loc);
                  setShowLocationSelect(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center justify-between cursor-pointer ${currentLocation === loc ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'}`}
              >
                {loc}
                {currentLocation === loc && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenNotifications}
            className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <Bell size={18} />
            {unreadNotifs > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadNotifs}
              </span>
            )}
          </button>

          <button 
            onClick={() => navigate('/profile')}
            className="p-1 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer w-8 h-8 hover:ring-2 hover:ring-blue-100 transition-all"
          >
            <User size={16} className="text-slate-500" />
          </button>
        </div>
      </div>

      <div className="px-5 md:px-0 mt-4 md:mt-0">
        {/* 2. Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative mb-5 max-w-xl md:mx-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search hospitals, doctors, specialties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-150 rounded-2xl shadow-sm text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </form>

        {/* 3. Hero & Quick Access Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:gap-6 mb-6">
          <div className="md:col-span-2">
            {/* Hero Banner Slider */}
            <div className="relative rounded-3xl overflow-hidden h-44 shadow-lg shadow-blue-500/5 group">
              {slides.map((slide, idx) => (
                <div 
                  key={idx}
                  className={`absolute inset-0 bg-gradient-to-br ${slide.color} p-6 flex flex-col justify-between text-white transition-opacity duration-700 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <div>
                    <span className="bg-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10">
                      {slide.tag}
                    </span>
                    <h3 className="text-lg font-extrabold font-heading mt-2 leading-snug max-w-[320px] md:text-xl">
                      {slide.title}
                    </h3>
                    <p className="text-white/80 text-[10px] leading-relaxed mt-1 max-w-[280px]">
                      {slide.desc}
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => onSearchSelect()}
                      className="bg-white text-blue-600 hover:bg-slate-50 border-none font-bold text-[10px] py-1.5"
                    >
                      {slide.action}
                    </Button>
                    <div className="flex gap-1.5">
                      {slides.map((_, dotIdx) => (
                        <button 
                          key={dotIdx}
                          onClick={() => setCurrentSlide(dotIdx)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${dotIdx === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-1 mt-4 md:mt-0">
            {/* Quick Access Cards */}
            <div className="grid grid-cols-3 md:grid-cols-2 gap-3 h-full">
              <button 
                onClick={() => onSearchSelect('nearby')}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl shadow-xs hover:border-blue-100 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="p-2.5 bg-blue-50 rounded-xl mb-1.5 text-blue-600 group-hover:scale-110 transition-transform">
                  <Map size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center">Nearby</span>
              </button>
              
              <button 
                onClick={() => onSearchSelect('top-rated')}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl shadow-xs hover:border-blue-100 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="p-2.5 bg-amber-50 rounded-xl mb-1.5 text-amber-500 group-hover:scale-110 transition-transform">
                  <Star size={16} fill="currentColor" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center">Top Rated</span>
              </button>

              <button 
                onClick={() => onSearchSelect('short-wait')}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl shadow-xs hover:border-blue-100 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="p-2.5 bg-emerald-50 rounded-xl mb-1.5 text-emerald-600 group-hover:scale-110 transition-transform">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center">Quick OPD</span>
              </button>

              <button 
                onClick={() => onSearchSelect('emergency')}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl shadow-xs hover:border-red-100 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="p-2.5 bg-red-50 rounded-xl mb-1.5 text-red-600 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center">Emergency</span>
              </button>

              <button 
                onClick={() => onSearchSelect('doctors')}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl shadow-xs hover:border-sky-100 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="p-2.5 bg-sky-50 rounded-xl mb-1.5 text-sky-600 group-hover:scale-110 transition-transform">
                  <Stethoscope size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center">Find Doctor</span>
              </button>

              <button 
                onClick={() => navigate('/bookings')}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl shadow-xs hover:border-indigo-100 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="p-2.5 bg-indigo-50 rounded-xl mb-1.5 text-indigo-600 group-hover:scale-110 transition-transform">
                  <Award size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center">My Tokens</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Hospital Specialties */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Hospital Specialties</h4>
            <button onClick={() => onSearchSelect()} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer">
              All <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto md:flex-wrap no-scrollbar py-1">
            {hospitals.map(h => h.category).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
              <button
                key={cat}
                onClick={() => navigate(`/search?specialty=${encodeURIComponent(cat)}`)}
                className="flex items-center gap-2 bg-white border border-slate-100 shadow-xs hover:border-blue-100 hover:shadow-sm px-4 py-2.5 rounded-full shrink-0 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                {getCategoryIcon(cat)}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Nearby / Popular Hospitals Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Nearby Hospitals</h4>
            <button onClick={() => onSearchSelect('nearby')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer">
              View Map <Map size={12} className="ml-0.5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-0">
            {hospitals.slice(0, 3).map((hosp) => {
              // Calculate estimated wait time based on doctor current queues
              const totalWaitTime = hosp.doctors.reduce((acc, doc) => {
                const ahead = Math.max(0, doc.nextAvailableToken - doc.currentQueue - 1);
                return acc + (ahead * doc.estimatedWaitPerPatient);
              }, 0);
              const avgWait = Math.round(totalWaitTime / (hosp.doctors.length || 1)) + hosp.baseWaitingTime;

              return (
                <Card 
                  key={hosp.id} 
                  hoverable 
                  padding="none" 
                  onClick={() => onHospitalSelect(hosp.id)}
                  className="overflow-hidden flex flex-col h-full justify-between"
                >
                  <div>
                    <div className="relative h-32 w-full">
                      <img 
                        src={hosp.image} 
                        alt={hosp.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(hosp.name)}&background=DBEAFE&color=2563EB&size=400&bold=true&font-size=0.25`; }}
                      />
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-sm">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-bold text-slate-800">{hosp.rating}</span>
                      </div>
                      <Badge variant="blue" className="absolute bottom-3 left-3 bg-blue-600/90 text-white border-none py-1">
                        {hosp.category}
                      </Badge>
                    </div>
                    
                    <div className="p-4">
                      <h5 className="font-extrabold text-slate-800 text-sm tracking-tight hover:text-blue-600 transition-colors">
                        {hosp.name}
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {hosp.address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 pt-0">
                    <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center text-slate-500 text-[10px] font-medium">
                          <MapPin size={12} className="text-blue-500 mr-1 shrink-0" />
                          {hosp.distance} km
                        </div>
                        <div className="flex items-center text-slate-500 text-[10px] font-medium">
                          <Clock size={12} className="text-emerald-500 mr-1 shrink-0" />
                          {avgWait} min wait
                        </div>
                      </div>

                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onHospitalSelect(hosp.id);
                        }}
                        className="py-1 px-3 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        Book Token
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 7. Recommended Doctors Row */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Recommended Doctors</h4>
            <button onClick={() => onSearchSelect('doctors')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer">
              All <ChevronRight size={12} />
            </button>
          </div>

          <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto md:overflow-x-visible no-scrollbar py-1">
            {hospitals.flatMap(h => h.doctors.map(d => ({ ...d, hospitalId: h.id, hospitalName: h.name }))).slice(0, 4).map((doc) => {
              const queueWait = Math.max(0, (doc.nextAvailableToken - doc.currentQueue - 1) * doc.estimatedWaitPerPatient);
              
              return (
                <Card 
                  key={doc.id} 
                  hoverable 
                  padding="sm"
                  onClick={() => onDoctorSelect(doc.hospitalId, doc.id)}
                  className="w-40 md:w-full shrink-0 text-center flex flex-col justify-between"
                >
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden mb-2 border border-slate-100 bg-slate-50">
                      <img 
                        src={doc.image} 
                        alt={doc.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=EFF6FF&color=2563EB&size=80&bold=true&font-size=0.4`; }}
                      />
                    </div>
                    <h5 className="text-[11px] font-extrabold text-slate-800 line-clamp-1">{doc.name}</h5>
                    <p className="text-[9px] text-blue-600 font-medium line-clamp-1">{doc.specialty}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5 line-clamp-1">{doc.hospitalName}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between text-[8px] font-bold">
                    <span className="text-slate-500">₹{doc.consultationFee}</span>
                    <span className="text-emerald-600">{queueWait}m Wait</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 8. Health Articles */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Latest Health Tips</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 space-y-0">
            {articles.map((art) => (
              <Card 
                key={art.id} 
                hoverable 
                padding="sm"
                onClick={() => setSelectedArticle(art)}
                className="flex items-center md:items-start gap-3 h-full cursor-pointer"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                  <img 
                    src={art.image} 
                    alt={art.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(art.title)}&background=F0FDF4&color=15803D&size=100&bold=true&font-size=0.25`; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded-md">
                    {art.category}
                  </span>
                  <h5 className="text-xs font-bold text-slate-800 mt-1 line-clamp-2">
                    {art.title}
                  </h5>
                  <p className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{art.date}</span>
                    <span>{art.readTime}</span>
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* Article Detail Modal */}
      <Modal
        isOpen={selectedArticle !== null}
        onClose={() => setSelectedArticle(null)}
        title="Health Tip Details"
        size="lg"
      >
        {selectedArticle && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Cover Image */}
            <div className="relative h-48 w-full shrink-0">
              <img 
                src={selectedArticle.image} 
                alt={selectedArticle.title} 
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedArticle.title)}&background=F0FDF4&color=15803D&size=400&bold=true&font-size=0.2`; }}
              />
              <Badge variant="blue" className="absolute top-4 left-4 bg-blue-600/90 text-white border-none py-1">
                {selectedArticle.category}
              </Badge>
            </div>
            
            {/* Content Details */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase">
                <span>Published on {selectedArticle.date}</span>
                <span>{selectedArticle.readTime}</span>
              </div>
              
              <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">
                {selectedArticle.title}
              </h3>
              
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                {selectedArticle.content}
              </p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[10px] leading-relaxed text-slate-500 font-bold">
                <span className="font-extrabold text-slate-700 block mb-1">Disclaimer:</span>
                Medical tips provided here are for general informational purposes only. Always consult a certified healthcare professional before making modifications to your clinical routines or diets.
              </div>
            </div>

            {/* Footer Close Button */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <Button 
                variant="primary" 
                onClick={() => setSelectedArticle(null)}
                className="py-1.5 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
