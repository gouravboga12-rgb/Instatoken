import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getHospitalSVGImage } from '../../utils/mockData';
import { calculateDistanceKm } from '../../utils/googleMaps';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  MapPin, Bell, User, Search, Star, 
  ChevronRight, ChevronLeft,
  ShieldAlert, Award, Loader2, FileText,
  Menu, BellRing, ShieldCheck, 
  Zap, ChevronDown, Building2, Share2,
  Users, ArrowRight, Navigation,
  X, Home as HomeIcon, LogOut, RotateCw
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerManualSync } from '../../utils/syncBus';

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
  const { user, hospitals, notifications, currentLocation, setCurrentLocation, detectAndSetLocation, addNotification, userCoords, activeBanners } = useApp();
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

  // Pull-to-refresh & manual sync state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await triggerManualSync();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullY(0);
      }, 500);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY <= 5 && touchStartY > 0) {
      const diff = e.touches[0].clientY - touchStartY;
      if (diff > 0 && diff < 120) {
        setPullY(diff);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 55 && !isRefreshing) {
      handleManualRefresh();
    } else {
      setPullY(0);
    }
    setTouchStartY(0);
  };

  const locations = [
    "Karimnagar, Telangana",
    "Choppadandi, Karimnagar",
    "Warangal, Telangana",
    "Gachibowli, Hyderabad",
    "Vijayawada, Andhra Pradesh",
    "Koramangala, Bengaluru"
  ];

  // Featured hospital banners for home carousel dynamically mapped from active live hospitals
  const featuredBanners = useMemo(() => {
    const bannersList = hospitals.length > 0 ? hospitals : [
      {
        id: 'hosp-apollo',
        name: 'City Care Multi-Specialty Hospital',
        address: 'Koramangala 5th Block, Bengaluru',
        baseWaitingTime: 20,
        rating: 4.8,
        reviewsCount: 1240,
        image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80'
      } as any
    ];

    const gradients = [
      "from-blue-700 via-blue-600 to-indigo-700",
      "from-teal-700 via-emerald-600 to-teal-800",
      "from-indigo-800 via-blue-700 to-slate-900",
      "from-cyan-700 via-sky-600 to-blue-800",
      "from-purple-800 via-indigo-700 to-blue-900"
    ];

    return bannersList.slice(0, 5).map((h, idx) => ({
      id: h.id,
      badge: idx === 0 ? "FEATURED HOSPITAL" : "PARTNER HOSPITAL",
      title: h.name,
      location: h.address || `${h.city || 'Bengaluru'}, ${h.state || 'India'}`,
      wait: `${h.baseWaitingTime || 20} Min Avg Wait`,
      rating: h.rating || 4.8,
      reviews: h.reviewsCount || 120,
      image: h.image || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
      cta: "Book OPD Token",
      color: gradients[idx % gradients.length]
    }));
  }, [hospitals]);

  // Dynamic Location-Based Banners with fallback
  const displayBanners = useMemo(() => {
    if (activeBanners && activeBanners.length > 0) {
      return activeBanners.map(b => {
        let locLabel = 'All India Campaign';
        if (b.targetLevel === 'village') locLabel = `${b.village}, ${b.mandal || b.district}`;
        else if (b.targetLevel === 'mandal') locLabel = `${b.mandal} Mandal, ${b.district}`;
        else if (b.targetLevel === 'district') locLabel = `${b.district} District, ${b.state}`;
        else if (b.targetLevel === 'state') locLabel = `${b.state} State`;

        return {
          id: b.id,
          hospitalId: b.hospitalId,
          badge: b.badge || `${b.targetLevel.toUpperCase()} SPECIAL`,
          title: b.title,
          location: locLabel,
          description: b.description,
          image: b.image,
          mediaType: b.mediaType || (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(b.image || '') ? 'video' : 'image'),
          cta: b.ctaText || 'Book Token',
          targetLevel: b.targetLevel,
          linkUrl: b.hospitalId ? `/hospital-details/${b.hospitalId}` : (b.linkUrl || '/search'),
          isLocationTargeted: true,
          rating: 4.9,
          reviews: 1240
        };
      });
    }
    return featuredBanners.map(b => ({
      ...b,
      mediaType: 'image' as const,
      isLocationTargeted: false,
      targetLevel: 'district' as const,
      description: 'Instant token booking & live OPD queue tracking.',
      linkUrl: `/hospital/${b.id}`
    }));
  }, [activeBanners, featuredBanners]);

  // Slide index state for Hero Slider
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto scroll slides
  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % displayBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  const handleBannerClick = (b: any) => {
    if (b.hospitalId) {
      onHospitalSelect(b.hospitalId);
      return;
    }
    const target = b.linkUrl || (b.isLocationTargeted ? '/search' : `/hospital/${b.id}`);
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      navigate(target);
    }
  };

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
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="pb-24 bg-slate-50 min-h-screen md:bg-transparent md:min-h-0 md:pb-6 relative"
    >
      
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

        {/* Right Side Icons: Manual Refresh & Notification Bell */}
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={handleManualRefresh}
            title="Refresh latest updates"
            className="p-2 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <RotateCw size={17} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'} />
          </button>
          <button 
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <Bell size={20} />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Pull down indicator for mobile */}
      {(pullY > 15 || isRefreshing) && (
        <div className="md:hidden flex items-center justify-center py-2 bg-blue-50/90 text-blue-600 text-xs font-bold transition-all border-b border-blue-100/60 animate-in fade-in">
          <RotateCw size={13} className={`mr-2 ${pullY > 55 || isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Syncing latest tokens...' : (pullY > 55 ? 'Release to refresh' : 'Pull down to refresh')}</span>
        </div>
      )}

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

        {/* 3. Featured Hospitals / Location-Based Banners Hero Carousel Banner */}
        {displayBanners.length > 0 && (() => {
          const currentBanner = displayBanners[currentSlide] || displayBanners[0];
          const isUploadedFlyer = currentBanner.isLocationTargeted || /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(currentBanner.image || '');

          return (
            <div 
              className="relative rounded-3xl overflow-hidden shadow-xl text-white aspect-[16/9] sm:aspect-[16/7] md:aspect-[21/8] min-h-[230px] max-h-[440px] p-4 sm:p-6 md:p-8 flex flex-col justify-between transition-all duration-700 group cursor-pointer border border-slate-800/40 w-full"
              onClick={() => handleBannerClick(currentBanner)}
            >
              {/* Responsive Background Media: Blurred backdrop + crisp foreground image/video */}
              <div className="absolute inset-0 bg-slate-950 overflow-hidden">
                {currentBanner.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(currentBanner.image || '') ? (
                  <video
                    key={currentBanner.id}
                    src={currentBanner.image}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <img 
                      src={currentBanner.image} 
                      alt="" 
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-lg opacity-40 scale-110 pointer-events-none" 
                    />
                    <img 
                      key={currentBanner.id}
                      src={currentBanner.image} 
                      alt={currentBanner.title}
                      className="relative w-full h-full object-cover md:object-cover sm:object-contain object-center group-hover:scale-102 transition-transform duration-700 ease-out"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getHospitalSVGImage(currentBanner.title);
                      }}
                    />
                  </>
                )}
              </div>

              {/* Gradient Overlay: soft bottom vignette allowing flyer contents to remain clearly visible */}
              <div className={`absolute inset-0 z-10 ${
                isUploadedFlyer 
                  ? 'bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/20' 
                  : 'bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent md:bg-gradient-to-t md:from-slate-950/90 md:via-transparent'
              }`} />

              {/* Left Arrow Navigation Button */}
              {displayBanners.length > 1 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
                  }}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-950/60 hover:bg-slate-950/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-110 shadow-lg"
                  aria-label="Previous Banner"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              {/* Right Arrow Navigation Button */}
              {displayBanners.length > 1 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev + 1) % displayBanners.length);
                  }}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-950/60 hover:bg-slate-950/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-110 shadow-lg"
                  aria-label="Next Banner"
                >
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Top Badges Header */}
              <div className="relative z-20 flex items-center justify-between gap-2 px-3 sm:px-6 md:px-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-blue-400/30 shadow-md">
                    {currentBanner.badge}
                  </span>
                  {(currentBanner.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(currentBanner.image || '')) && (
                    <span className="bg-purple-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-purple-400/30 shadow-md flex items-center gap-1">
                      🎬 VIDEO
                    </span>
                  )}
                  {currentBanner.isLocationTargeted && (
                    <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-emerald-400/30 shadow-md flex items-center gap-1">
                      <MapPin size={10} />
                      {currentBanner.location}
                    </span>
                  )}
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                    <Star size={11} className="fill-slate-950 text-slate-950" />
                    {currentBanner.rating} ({currentBanner.reviews})
                  </span>
                </div>

                <div className="hidden sm:flex bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] font-extrabold items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-300">Live OPD Active</span>
                </div>
              </div>

              {/* Bottom Main Content */}
              <div className="relative z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-3 sm:px-6 md:px-10 pt-2">
                <div className="max-w-xl space-y-1">
                  <h2 className="text-lg sm:text-2xl md:text-3xl font-black font-heading leading-tight tracking-tight drop-shadow-md text-white">
                    {currentBanner.title}
                  </h2>

                  <p className="text-slate-200 text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 drop-shadow-sm">
                    <MapPin size={12} className="shrink-0 text-blue-400" />
                    <span className="truncate">{currentBanner.location}</span>
                  </p>

                  {currentBanner.description && (
                    <p className="text-slate-300 text-[10px] sm:text-xs line-clamp-1 leading-relaxed drop-shadow-xs max-w-md">
                      {currentBanner.description}
                    </p>
                  )}
                </div>

                {/* Banner CTA Button */}
                <div className="shrink-0">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="bg-white text-blue-600 hover:bg-blue-50 font-black text-xs py-2 px-4 rounded-xl shadow-lg border-none flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{currentBanner.cta || 'Book OPD Token'}</span>
                    <ArrowRight size={13} />
                  </Button>
                </div>
              </div>

              {/* Slider Dots */}
              {displayBanners.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                  {displayBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(i);
                      }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === currentSlide ? 'w-5 bg-blue-500' : 'w-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* 4. Quick Action Categories (Image 5 style) */}
        <div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { title: "Nearby", sub: "Hospitals", icon: <MapPin className="text-blue-600" size={15} />, bg: "bg-blue-50", filter: "nearby" },
              { title: "Top Rated", sub: "Hospitals", icon: <Star className="text-amber-500 fill-amber-500" size={15} />, bg: "bg-amber-50", filter: "top-rated" },
              { title: "My Tokens", sub: "", icon: <Award className="text-blue-600" size={15} />, bg: "bg-blue-50", nav: "/bookings" },
              { title: "Health Records", sub: "", icon: <FileText className="text-emerald-600" size={15} />, bg: "bg-emerald-50", nav: "/profile?tab=records" }
            ].map((cat, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (cat.nav) {
                    navigate(cat.nav);
                  } else {
                    onSearchSelect(cat.filter);
                  }
                }}
                className="bg-white border border-slate-100 rounded-xl py-2 px-1 flex flex-col items-center justify-center text-center shadow-3xs hover:border-blue-200 transition-all cursor-pointer group min-h-[56px]"
              >
                <div className={`w-7 h-7 ${cat.bg} rounded-lg flex items-center justify-center mb-1 group-hover:scale-105 transition-transform`}>
                  {cat.icon}
                </div>
                <span className="text-[10px] font-extrabold text-slate-800 leading-tight">{cat.title}</span>
                {cat.sub ? (
                  <span className="text-[8.5px] text-slate-400 font-bold leading-tight">{cat.sub}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Popular Specialties Horizontal Scroller */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Popular Specialties</h3>
            <button 
              onClick={() => onSearchSelect()} 
              className="text-[11px] font-extrabold text-blue-600 hover:underline cursor-pointer"
            >
              View All &gt;
            </button>
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "dept-cardio", name: "Cardiology", icon: "❤️", bg: "bg-red-50 text-red-600" },
              { id: "dept-neuro", name: "Neurology", icon: "🧠", bg: "bg-purple-50 text-purple-600" },
              { id: "dept-ortho", name: "Orthopedics", icon: "🦴", bg: "bg-amber-50 text-amber-600" },
              { id: "dept-pedia", name: "Pediatrics", icon: "👶", bg: "bg-pink-50 text-pink-600" },
              { id: "dept-gynaec", name: "Gynecology", icon: "🌸", bg: "bg-rose-50 text-rose-600" },
              { id: "dept-general", name: "General Medicine", icon: "🩺", bg: "bg-blue-50 text-blue-600" },
              { id: "dept-eye", name: "Ophthalmology", icon: "👁️", bg: "bg-emerald-50 text-emerald-600" },
              { id: "dept-dental", name: "Dental", icon: "🦷", bg: "bg-cyan-50 text-cyan-600" }
            ].map((spec) => (
              <button
                key={spec.id}
                onClick={() => onSearchSelect(spec.name)}
                className="bg-white border border-slate-100 px-3.5 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0 shadow-3xs hover:border-blue-200 transition-all cursor-pointer"
              >
                <span className="text-sm">{spec.icon}</span>
                <span>{spec.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 6. Nearby Hospitals Section (Location-Based Filter within 50 km) */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Nearby Hospitals</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Within 50 km
              </span>
            </div>
            <button 
              onClick={() => onSearchSelect()} 
              className="text-[11px] font-extrabold text-blue-600 hover:underline cursor-pointer"
            >
              Explore All &gt;
            </button>
          </div>

          <div className="space-y-4">
            {hospitals
              .map((h) => {
                let dynamicDistance = h.distance;
                if (userCoords && h.lat && h.lng) {
                  dynamicDistance = calculateDistanceKm(userCoords.lat, userCoords.lng, h.lat, h.lng);
                }
                return { ...h, distance: dynamicDistance };
              })
              .sort((a, b) => a.distance - b.distance)
              .slice(0, 3).map((hosp) => {
              return (
                <Card 
                  key={hosp.id} 
                  hoverable 
                  padding="none" 
                  onClick={() => onHospitalSelect(hosp.id)}
                  className="overflow-hidden bg-white border border-slate-150 rounded-3xl shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
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

                    {/* Body Info */}
                    <div className="p-3.5">
                      {/* Category & Distance Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="bg-blue-50/90 text-blue-700 font-black text-[11.5px] sm:text-xs px-3 py-1 rounded-xl border border-blue-200/80 shadow-2xs">
                          {hosp.category}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/90 text-blue-700 border border-blue-200/80 text-[11px] font-extrabold shadow-2xs">
                          <MapPin size={13} className="text-blue-600 shrink-0" />
                          <span>{hosp.distance} km away</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Doctor Preview & Book OPD Token Strip */}
                  <div className="bg-slate-50/80 px-3 sm:px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5 sm:gap-2 mt-2">
                    <span className="text-[11px] sm:text-xs text-slate-500 font-bold tracking-tight truncate min-w-0">
                      {hosp.doctors.length} {hosp.doctors.length === 1 ? 'Doctor' : 'Doctors'} Available
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <a 
                        href={hosp.lat && hosp.lng 
                          ? `https://www.google.com/maps/dir/?api=1&destination=${hosp.lat},${hosp.lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + ' ' + hosp.address)}`
                        } 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] sm:text-xs font-bold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        title="Open in Google Maps"
                      >
                        <Navigation size={11} className="text-blue-600 fill-blue-600" />
                        <span>Map</span>
                      </a>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onHospitalSelect(hosp.id);
                        }}
                        className="text-[11px] sm:text-xs text-white font-extrabold bg-blue-600 hover:bg-blue-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap"
                      >
                        Book OPD Token
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
              {user ? (
                <div className="p-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-white/20 shrink-0 shadow-sm flex items-center justify-center font-black text-lg">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ffffff&color=2563EB&size=200&bold=true`}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-sm truncate flex items-center gap-1">
                      <span>{user.name}</span>
                      <span className="w-3.5 h-3.5 bg-white text-blue-600 rounded-full text-[9px] font-black inline-flex items-center justify-center shrink-0">✓</span>
                    </h4>
                    <p className="text-[10px] text-blue-100 font-medium truncate">{user.phone || user.email}</p>
                    <button 
                      onClick={() => { setIsMobileMenuOpen(false); navigate('/profile'); }}
                      className="mt-1 text-[9.5px] font-black text-amber-300 hover:underline transition-all cursor-pointer block"
                    >
                      Manage Profile →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm">Welcome to InstaToken</h4>
                    <p className="text-[10px] text-blue-100 font-medium mt-0.5">Skip hospital lines & track live queue</p>
                  </div>
                  <button 
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                    className="px-3.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-black shadow-xs transition-colors border-none cursor-pointer shrink-0"
                  >
                    Login / Sign Up
                  </button>
                </div>
              )}

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
