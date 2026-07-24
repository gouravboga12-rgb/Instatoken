import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getHospitalSVGImage } from '../../utils/mockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  MapPin, Bell, User, Search, Star, Clock, 
  ChevronRight, ChevronLeft, Heart, Activity, Baby, 
  Smile, ShieldAlert, Award, Loader2, FileText,
  Menu, BellRing, ShieldCheck, 
  Zap, ChevronDown, Building2, Share2,
  Users, ArrowRight,
  X, Home as HomeIcon, LogOut
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HomeProps {
  onSearchSelect: (filterType?: string) => void;
  onHospitalSelect: (id: string) => void;
  onDoctorSelect: (hospId: string, docId: string) => void;
  onOpenNotifications: () => void;
}

export const Home: React.FC<HomeProps> = ({ 
  onSearchSelect, 
  onHospitalSelect, 
  onOpenNotifications 
}) => {
  const { user, hospitals, notifications, currentLocation, setCurrentLocation, detectAndSetLocation, addNotification } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [notified, setNotified] = useState(false);
  const [recommended, setRecommended] = useState(false);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const locations = [
    "Gachibowli, Hyderabad",
    "Vijayawada, Andhra Pradesh",
    "Koramangala, Bengaluru", 
    "HSR Layout, Bengaluru", 
    "Ram Nagar, Visakhapatnam",
    "Indiranagar, Bengaluru"
  ];

  // Featured hospital banners for home carousel
  const featuredBanners = [
    {
      id: "hosp-apollo",
      badge: "FEATURED HOSPITAL",
      title: "Apollo Spectra Hospital",
      location: "Koramangala 5th Block, Bengaluru",
      wait: "20 Min Avg Wait",
      rating: 4.8,
      reviews: 1240,
      image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
      cta: "Book OPD Token",
      color: "from-blue-700 via-blue-600 to-indigo-700"
    },
    {
      id: "hosp-rainbow",
      badge: "PEDIATRIC CARE",
      title: "Rainbow Children's Hospital",
      location: "HSR Layout Sector 2, Bengaluru",
      wait: "15 Min Avg Wait",
      rating: 4.7,
      reviews: 932,
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
      cta: "Book Pediatric OPD",
      color: "from-blue-700 via-sky-600 to-teal-700"
    },
    {
      id: "hosp-fortis",
      badge: "TOP CARDIOLOGY",
      title: "Fortis Hospital",
      location: "Bannerghatta Road, Bengaluru",
      wait: "45 Min Avg Wait",
      rating: 4.6,
      reviews: 884,
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80",
      cta: "Book Specialist Token",
      color: "from-indigo-800 via-blue-700 to-slate-900"
    },
    {
      id: "hosp-nethra",
      badge: "EYE CARE CENTRE",
      title: "Narayana Nethralaya",
      location: "Indiranagar 100ft Road, Bengaluru",
      wait: "35 Min Avg Wait",
      rating: 4.9,
      reviews: 1650,
      image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80",
      cta: "Book Eye Checkup",
      color: "from-blue-800 via-cyan-600 to-blue-900"
    }
  ];

  // Slide index state for Hero Slider
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto scroll slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % featuredBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredBanners.length]);

  const isComingSoonCity = currentLocation.includes('Vijayawada');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      onSearchSelect();
    }
  };

  const handleNotifyMe = () => {
    setNotified(true);
    addNotification("Notification Registered!", `We will alert you as soon as InstaToken launches in ${currentLocation}.`, "success");
  };

  const unreadNotifs = notifications.filter(n => !n.read).length;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER 1: "WE'RE COMING SOON!" PAGE (Matching Image 2)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isComingSoonCity) {
    return (
      <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:pb-6">
        
        {/* Top Location & Notification Header (Image 2 style - visible on mobile) */}
        <div className="md:hidden bg-blue-600 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div>
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setShowLocationSelect(!showLocationSelect)}>
              <MapPin size={16} className="text-white shrink-0" />
              <span className="font-extrabold text-sm tracking-tight">{currentLocation}</span>
              <ChevronDown size={14} className="text-white/80" />
            </div>
            <button 
              onClick={() => setShowLocationSelect(!showLocationSelect)}
              className="text-[10px] text-blue-100 underline hover:text-white mt-0.5 font-medium block cursor-pointer"
            >
              Change Location
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onOpenNotifications}
              className="relative w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all cursor-pointer"
            >
              <Bell size={18} />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                  {unreadNotifs}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="w-9 h-9 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer"
            >
              <User size={18} />
            </button>
          </div>
        </div>

        {/* Location Dropdown Modal/Popover */}
        {showLocationSelect && (
          <div className="bg-white border-b border-slate-200 px-5 py-3 shadow-lg animate-in fade-in duration-150">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Your City / Area</p>
            
            <button
              onClick={() => {
                setLocating(true);
                detectAndSetLocation();
                setTimeout(() => {
                  setLocating(false);
                  setShowLocationSelect(false);
                }, 3000);
              }}
              disabled={locating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer mb-2 disabled:opacity-60"
            >
              {locating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              <span>{locating ? 'Detecting GPS Location...' : 'Use Current GPS Location'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {locations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setCurrentLocation(loc);
                    setShowLocationSelect(false);
                  }}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentLocation === loc ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto px-5 pt-6 space-y-6">

          {/* 3D Hospital Island Artwork Banner (Image 2 style) */}
          <div className="bg-gradient-to-b from-sky-50 via-blue-50/50 to-white rounded-3xl p-6 flex flex-col items-center text-center border border-sky-100 shadow-sm relative overflow-hidden">
            
            {/* 3D Illustration Graphic */}
            <div className="w-56 h-48 relative mb-2 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-200/30 rounded-full blur-2xl transform scale-75" />
              
              {/* Floating 3D Hospital Graphics */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-44 h-32 bg-white rounded-2xl border-2 border-slate-100 shadow-xl p-3 flex flex-col justify-between items-center relative transform hover:scale-105 transition-transform">
                  <div className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md flex items-center gap-1 shadow-sm">
                    <span className="font-extrabold text-sm">+</span> HOSPITAL
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full px-2">
                    <div className="h-6 bg-sky-100 rounded-md" />
                    <div className="h-6 bg-sky-100 rounded-md" />
                    <div className="h-6 bg-sky-100 rounded-md" />
                  </div>

                  <div className="w-10 h-8 bg-blue-600 rounded-t-lg border-t border-x border-white" />
                </div>

                {/* Floating Ambulance Graphic */}
                <div className="absolute -left-6 bottom-2 bg-white border border-slate-200 shadow-lg px-2.5 py-1 rounded-xl flex items-center gap-1.5 transform -rotate-6">
                  <div className="w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">+</div>
                  <span className="text-[9px] font-extrabold text-slate-700">EMERGENCY</span>
                </div>

                {/* Giant Blue Location Pin */}
                <div className="absolute -right-4 -top-2 w-14 h-18 bg-blue-600 text-white rounded-full flex flex-col items-center justify-center shadow-xl border-2 border-white transform rotate-12 animate-bounce">
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-blue-600">
                    <MapPin size={12} className="fill-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
              We're <span className="text-blue-600">Coming Soon!</span>
            </h2>

            <p className="text-slate-500 text-xs leading-relaxed max-w-md mt-2 font-medium">
              InstaToken is currently available in selected cities. We are expanding rapidly across India. 
              We haven't partnered with hospitals in <strong>{currentLocation}</strong> yet. Be the first to know when we launch.
            </p>

            {/* Action Buttons */}
            <div className="w-full space-y-2.5 mt-5">
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth
                onClick={handleNotifyMe}
                className="bg-blue-600 hover:bg-blue-700 py-3 text-xs font-extrabold flex items-center justify-center gap-2 rounded-2xl shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Bell size={16} />
                <span>{notified ? "You'll be notified! ✓" : "Notify Me"}</span>
              </Button>

              <Button 
                variant="secondary" 
                size="lg" 
                fullWidth
                onClick={() => setShowLocationSelect(true)}
                className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-3 text-xs font-extrabold flex items-center justify-center gap-2 rounded-2xl cursor-pointer"
              >
                <MapPin size={16} />
                <span>Change Location</span>
              </Button>
            </div>

          </div>

          {/* "Why InstaToken?" 6-Card Grid (Image 2 style) */}
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Why InstaToken?</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
              {[
                { title: "Book Hospital Tokens Online", icon: <Award className="text-blue-600" size={20} />, bg: "bg-blue-50" },
                { title: "Skip Long Waiting Queues", icon: <Users className="text-blue-600" size={20} />, bg: "bg-blue-50" },
                { title: "Real-time Token Updates", icon: <BellRing className="text-blue-600" size={20} />, bg: "bg-blue-50" },
                { title: "Trusted Hospitals", icon: <ShieldCheck className="text-blue-600" size={20} />, bg: "bg-blue-50" },
                { title: "Secure Payments", icon: <ShieldAlert className="text-blue-600" size={20} />, bg: "bg-blue-50" },
                { title: "Easy & Fast Booking", icon: <Zap className="text-blue-600" size={20} />, bg: "bg-blue-50" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-100 p-3 rounded-2xl flex flex-col items-center text-center shadow-2xs">
                  <div className={`p-2.5 ${item.bg} rounded-xl mb-2`}>{item.icon}</div>
                  <span className="text-[10px] font-extrabold text-slate-700 leading-tight">{item.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* "Launching Soon In" Chips */}
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5">Launching Soon In</h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {["Hyderabad", "Bengaluru", "Tirupati", "Kurnool", "Vizag", "Nellore"].map((city) => (
                <div key={city} className="bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0 shadow-2xs">
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px] font-black">✓</div>
                  <span>{city}</span>
                </div>
              ))}
            </div>
          </div>

          {/* "Help Us Launch Faster" Banner Card (Image 2 style) */}
          <div className="bg-gradient-to-r from-blue-50/80 to-sky-50 border border-blue-100 rounded-3xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                <Building2 size={24} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">Help Us Launch Faster</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                  Know a hospital in your city? Recommend a hospital and we'll contact them.
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setRecommended(true);
                addNotification("Hospital Recommended!", "Thank you! Our BD team will contact this hospital.", "success");
              }}
              className="px-3 py-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-[10px] font-extrabold rounded-xl transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              {recommended ? "Recommended! ✓" : "Recommend Hospital"}
            </button>
          </div>

          {/* "Invite Friends & Earn" Card (Image 2 style) */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-3xl p-5 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                <Users size={28} />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950">Invite Friends & Earn</h4>
                <p className="text-[10px] text-emerald-800 font-medium leading-tight mt-0.5 max-w-[200px]">
                  Invite friends from your city. When InstaToken launches, both receive:
                </p>
                <span className="text-xs font-black text-emerald-700 block mt-1">₹100 Health Wallet Credit</span>
              </div>
            </div>

            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "InstaToken", text: "Join InstaToken to book OPD tokens!", url: window.location.href });
                } else {
                  alert("Referral Link Copied!");
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Share2 size={14} />
              <span>Invite Friends</span>
            </button>
          </div>

          {/* "FAQs" Accordion Grid (Image 2 style) */}
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">FAQs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[
                { q: "Why is InstaToken unavailable?", a: "We are currently onboarding top hospitals in Vijayawada to ensure instant digital OPD queue management." },
                { q: "Can I recommend a hospital?", a: "Yes! Click the 'Recommend Hospital' button above and submit hospital details for our partner team." },
                { q: "How do I get notified?", a: "Click 'Notify Me' and we will send SMS/WhatsApp alerts as soon as OPD token bookings launch in your area." },
                { q: "When will InstaToken launch?", a: "We are expanding to Vijayawada in Q3 2026. Stay tuned for early launch rewards!" }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
                  <button 
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full p-3.5 text-left text-xs font-extrabold text-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${openFaqIndex === idx ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {openFaqIndex === idx && (
                    <div className="px-3.5 pb-3.5 pt-0 text-[10.5px] text-slate-500 font-semibold leading-relaxed border-t border-slate-50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER 2: MAIN PATIENT HOME PAGE (Matching Image 5)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:bg-transparent md:min-h-0 md:pb-6">
      
      {/* 1. Header Bar (Image 5 style: Menu, InstaToken, Location dropdown, Bell badge, Cart - visible on mobile) */}
      <div className="md:hidden sticky top-0 bg-white/95 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-100 z-30">
        
        {/* Left Side: Hamburger & Logo with Location */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu size={22} />
          </button>

          <div>
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
              <img src="/logo.png" className="h-7 rounded-lg object-contain shadow-2xs" alt="InstaToken Logo" />
            </div>

            {/* Location Selector Pill */}
            <button 
              type="button"
              onClick={() => setShowLocationSelect(!showLocationSelect)}
              className="flex items-center text-slate-600 text-[10px] font-extrabold mt-0.5 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <MapPin size={10} className="text-blue-600 mr-0.5 shrink-0" />
              <span className="truncate max-w-[140px]">{currentLocation}</span>
              <ChevronDown size={10} className="ml-0.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Location Dropdown Modal */}
        {showLocationSelect && (
          <div className="absolute left-5 top-14 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 border-b border-slate-50">Select City Area</p>
            
            <button
              onClick={() => {
                setLocating(true);
                detectAndSetLocation();
                setTimeout(() => {
                  setLocating(false);
                  setShowLocationSelect(false);
                }, 3000);
              }}
              disabled={locating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer border-none mt-1 mb-1 disabled:opacity-60"
            >
              {locating ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
              <span>{locating ? 'Detecting location...' : 'Use GPS Location'}</span>
            </button>

            <div className="border-t border-slate-100 my-1" />

            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  setCurrentLocation(loc);
                  setShowLocationSelect(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-50 transition-colors font-semibold flex items-center justify-between cursor-pointer ${currentLocation === loc ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
              >
                {loc}
                {currentLocation === loc && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>
        )}

        {/* Right Side Icons: Notification Bell */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
              8
            </span>
          </button>
        </div>
      </div>

      <div className="px-5 md:px-0 mt-4 md:mt-0 w-full space-y-6">
        
        {/* 2. Search Bar with Solid Blue Search Button (Image 5 style) */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search hospitals, doctors, specialties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-2xs text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all"
            />
          </div>
          <button 
            type="submit"
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer shadow-md shadow-blue-500/20 transition-all"
          >
            Search
          </button>
        </form>

        {/* 3. Featured Hospitals Hero Carousel Banner with Full Background Image */}
        {(() => {
          const currentBanner = featuredBanners[currentSlide];
          return (
            <div 
              className="relative rounded-3xl overflow-hidden shadow-xl text-white min-h-[220px] md:min-h-[290px] p-4 md:p-8 flex flex-col justify-between transition-all duration-700 group cursor-pointer border border-slate-800/40"
              onClick={() => onHospitalSelect(currentBanner.id)}
            >
              {/* Full background hospital photo with smooth scale animation */}
              <img 
                key={currentBanner.id}
                src={currentBanner.image} 
                alt={currentBanner.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getHospitalSVGImage(currentBanner.title);
                }}
              />

              {/* Dark Gradient Overlay for optimal legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/30 md:to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/40 z-10" />

              {/* Left Arrow Navigation Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide((prev) => (prev - 1 + featuredBanners.length) % featuredBanners.length);
                }}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-110 shadow-lg"
                aria-label="Previous Banner"
              >
                <ChevronLeft size={18} />
              </button>

              {/* Right Arrow Navigation Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide((prev) => (prev + 1) % featuredBanners.length);
                }}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-110 shadow-lg"
                aria-label="Next Banner"
              >
                <ChevronRight size={18} />
              </button>

              {/* Top Badges Header */}
              <div className="relative z-20 flex items-center justify-between gap-2 px-7 md:px-14">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-blue-400/30 shadow-md">
                    {currentBanner.badge}
                  </span>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                    <Star size={11} className="fill-slate-950 text-slate-950" />
                    {currentBanner.rating} ({currentBanner.reviews})
                  </span>
                </div>

                <div className="hidden md:flex bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] font-extrabold items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-300">Live OPD Active</span>
                </div>
              </div>

              {/* Middle Main Info Content */}
              <div className="relative z-20 space-y-1.5 md:space-y-2.5 my-2 md:my-4 max-w-lg px-7 md:px-14">
                <h2 className="text-xl md:text-3xl font-black font-heading leading-tight tracking-tight drop-shadow-md text-white">
                  {currentBanner.title}
                </h2>

                <p className="text-slate-200 text-[11px] md:text-sm font-semibold flex items-center gap-1.5 leading-relaxed drop-shadow-sm">
                  <MapPin size={13} className="shrink-0 text-blue-400" />
                  <span className="truncate">{currentBanner.location}</span>
                </p>

                {/* Banner CTA Button (Only Book Token Option) */}
                <div className="pt-1">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onHospitalSelect(currentBanner.id);
                    }}
                    className="bg-white text-blue-600 hover:bg-blue-50 py-2.5 px-5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer border-none shadow-lg shadow-black/30 hover:scale-105 transition-all"
                  >
                    <span>{currentBanner.cta}</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>

              {/* Bottom Carousel Dots */}
              <div className="relative z-20 flex justify-center items-center gap-2 pt-1">
                {featuredBanners.map((banner, idx) => (
                  <button
                    key={banner.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`transition-all cursor-pointer rounded-full ${
                      currentSlide === idx 
                        ? 'w-7 h-2 bg-blue-500 shadow-md shadow-blue-500/50' 
                        : 'w-2 h-2 bg-white/40 hover:bg-white/80'
                    }`}
                    aria-label={`Go to ${banner.title}`}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        {/* 4. 4 Quick Action Items Grid */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { title: "Nearby", sub: "Hospitals", icon: <MapPin className="text-blue-600" size={20} />, bg: "bg-blue-50", filter: "nearby" },
            { title: "Top Rated", sub: "Hospitals", icon: <Star className="text-amber-500 fill-amber-500" size={20} />, bg: "bg-amber-50", filter: "top-rated" },
            { title: "My Tokens", sub: "View Bookings", icon: <Award className="text-blue-600" size={20} />, bg: "bg-blue-50", action: () => navigate('/bookings') },
            { title: "Health Records", sub: "Medical History", icon: <FileText className="text-teal-600" size={20} />, bg: "bg-teal-50", action: () => navigate('/profile', { state: { openRecords: true } }) }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => item.action ? item.action() : onSearchSelect(item.filter)}
              className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center text-center shadow-2xs hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className={`p-2.5 ${item.bg} rounded-2xl mb-1.5 group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-extrabold text-slate-800 leading-none">{item.title}</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5">{item.sub}</span>
            </button>
          ))}
        </div>

        {/* 5. Popular Specialties Section (Image 5 style) */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Popular Specialties</h3>
            <button 
              onClick={() => onSearchSelect()} 
              className="text-xs text-blue-600 font-extrabold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {[
              { name: "Pediatrics", icon: <Baby size={22} className="text-sky-600" />, bg: "bg-sky-50" },
              { name: "Cardiology", icon: <Heart size={22} className="text-rose-500 fill-rose-500" />, bg: "bg-rose-50" },
              { name: "Orthopedics", icon: <Activity size={22} className="text-amber-600" />, bg: "bg-amber-50" },
              { name: "Dermatology", icon: <User size={22} className="text-purple-600" />, bg: "bg-purple-50" },
              { name: "Dentistry", icon: <Smile size={22} className="text-emerald-600" />, bg: "bg-emerald-50" }
            ].map((spec) => (
              <button
                key={spec.name}
                onClick={() => navigate(`/search?specialty=${encodeURIComponent(spec.name)}`)}
                className="bg-white border border-slate-100 rounded-2xl p-3 min-w-[100px] flex flex-col items-center text-center shadow-2xs hover:border-blue-200 transition-all shrink-0 cursor-pointer"
              >
                <div className={`p-3 ${spec.bg} rounded-2xl mb-2`}>
                  {spec.icon}
                </div>
                <span className="text-xs font-extrabold text-slate-800">{spec.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 6. Nearby Hospitals Section (Image 5 style) */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Nearby Hospitals</h3>
          </div>

          <div className="space-y-4">
            {hospitals.slice(0, 3).map((hosp) => (
              <Card 
                key={hosp.id} 
                hoverable 
                padding="none" 
                onClick={() => onHospitalSelect(hosp.id)}
                className="overflow-hidden bg-white border border-slate-150 rounded-3xl shadow-2xs cursor-pointer flex flex-col"
              >
                {/* Image Container with Badges Overlay */}
                <div className="h-44 sm:h-52 w-full relative bg-slate-100">
                  <img 
                    src={hosp.image} 
                    alt={hosp.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = getHospitalSVGImage(hosp.name); }}
                  />
                  {/* Gradient Overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  
                  {/* Top Row: Verified Badge (Left) & Star Rating (Right) */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center">
                    <span className="bg-white/95 backdrop-blur-md text-emerald-700 font-extrabold text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-emerald-50">
                      <span className="w-3.5 h-3.5 bg-emerald-500 text-white rounded-full text-[8px] font-black inline-flex items-center justify-center">✓</span>
                      Verified
                    </span>
                    
                    <span className="bg-black/40 backdrop-blur-md text-white font-extrabold text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-white/10">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span>{hosp.rating}</span>
                    </span>
                  </div>

                  {/* Bottom Text Overlay: Hospital Name & Address */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                    <h4 className="font-extrabold text-sm sm:text-base tracking-tight truncate leading-none">
                      {hosp.name}
                    </h4>
                    <p className="text-[10px] text-slate-200 font-medium truncate mt-1.5">
                      {hosp.address}
                    </p>
                  </div>
                </div>

                {/* Bottom Body Details */}
                <div className="p-4 space-y-3.5">
                  {/* Badges and CTA Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1">
                        <Clock size={10} /> No Waiting
                      </span>
                      <span className="bg-blue-50 text-blue-700 font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl border border-blue-100">
                        {hosp.category}
                      </span>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onHospitalSelect(hosp.id);
                      }}
                      className="py-2 px-4 text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-md shadow-blue-500/20 shrink-0 transition-colors flex items-center gap-1.5"
                    >
                      Book OPD Token
                    </button>
                  </div>

                  {/* Distance & Timing info at the very bottom */}
                  <div className="flex items-center gap-2 border-t border-slate-50 pt-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/90 text-blue-700 border border-blue-200/80 text-[11px] font-extrabold shadow-2xs">
                      <MapPin size={13} className="text-blue-600 shrink-0" />
                      <span>{hosp.distance} km away</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 text-emerald-700 border border-emerald-200/80 text-[11px] font-extrabold shadow-2xs">
                      <Clock size={13} className="text-emerald-600 shrink-0" />
                      <span>~15 min travel</span>
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* Mobile & Tab Navigation Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl z-50 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-300">
            
            {/* Top Branding & Profile Header */}
            <div>
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center cursor-pointer" onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}>
                  <img src="/logo.png" className="h-8 rounded-lg object-contain" alt="InstaToken Logo" />
                </div>

                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="p-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-white/20 shrink-0 shadow-sm">
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"
                    alt={user?.name || 'Guest'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Guest')}&background=ffffff&color=2563EB&size=200&bold=true`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm truncate flex items-center gap-1">
                    <span>{user?.name || 'Guest Patient'}</span>
                    <span className="w-3.5 h-3.5 bg-white text-blue-600 rounded-full text-[9px] font-black inline-flex items-center justify-center shrink-0">✓</span>
                  </h4>
                  <p className="text-[10px] text-blue-100 font-medium truncate">{user?.phone || '+91 98856 14326'}</p>
                  <button 
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/profile'); }}
                    className="mt-1 text-[9.5px] font-black text-amber-300 hover:underline transition-all cursor-pointer block"
                  >
                    Manage Profile →
                  </button>
                </div>
              </div>

              {/* All Pages Navigation List */}
              <div className="p-3 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-1.5">All Pages & Features</p>
                
                {[
                  { label: "Home Page", path: "/", icon: <HomeIcon size={18} className="text-blue-600" /> },
                  { label: "Nearby Hospitals", path: "/search", icon: <MapPin size={18} className="text-emerald-600" /> },
                  { label: "My Bookings & Tokens", path: "/bookings", icon: <Award size={18} className="text-amber-500" /> },
                  { label: "My Profile", path: "/profile", icon: <User size={18} className="text-purple-600" /> }
                ].map((item, idx) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate(item.path);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer text-left border-none ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600 font-black shadow-2xs' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {isActive && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Account Action */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all border-none"
              >
                <LogOut size={15} />
                <span>Account Login / Sign Up</span>
              </button>
              <p className="text-[9px] text-slate-400 font-semibold text-center">InstaToken OPD App v2.4 • 24/7 Support</p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
