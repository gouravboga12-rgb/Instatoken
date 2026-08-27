import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Onboarding } from './pages/common/Onboarding';
import { SplashScreen } from './components/common/SplashScreen';
import { Login } from './pages/common/Login';
import { Home } from './pages/patient/Home';
import { SearchHospitals } from './pages/patient/SearchHospitals';
import { HospitalDetails } from './pages/patient/HospitalDetails';
import { BookToken } from './pages/patient/BookToken';
import { Payment } from './pages/patient/Payment';
import { TokenConfirmation } from './pages/patient/TokenConfirmation';

import { MyBookings } from './pages/patient/MyBookings';
import { Profile } from './pages/patient/Profile';
import { Notifications } from './pages/patient/Notifications';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { HospitalProvider } from './context/HospitalContext';
import { HospitalLogin } from './pages/hospital/HospitalLogin';
import { HospitalSignup } from './pages/hospital/HospitalSignup';
import { HospitalLayout } from './pages/hospital/HospitalLayout';
import { Footer } from './components/common/Footer';
import { 
  Home as HomeIcon, Search as SearchIcon, Award, User as UserIcon, 
  MapPin, Bell, ChevronDown, Loader2
} from 'lucide-react';

const TopNavbar: React.FC = () => {
  const { user, notifications, currentLocation, setCurrentLocation, detectAndSetLocation } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const [showLocationsDropdown, setShowLocationsDropdown] = useState(false);
  const [locating, setLocating] = useState(false);

  const locations = [
    "Gachibowli, Hyderabad",
    "Vijayawada, Andhra Pradesh",
    "Koramangala, Bengaluru", 
    "HSR Layout, Bengaluru", 
    "Ram Nagar, Visakhapatnam",
    "Indiranagar, Bengaluru"
  ];

  return (
    <header className="hidden md:block bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.png" className="h-9 rounded-xl object-contain shadow-xs" alt="InstaToken Logo" />
          <span className="text-xs text-slate-400 font-bold hidden lg:inline">Book Your Hospital Token in Seconds</span>
        </div>

        {/* Nav Links */}
        <nav className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
          <button 
            onClick={() => navigate('/')}
            className={`transition-colors cursor-pointer ${location.pathname === '/' ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Home
          </button>
          <button 
            onClick={() => navigate('/search')}
            className={`transition-colors cursor-pointer ${location.pathname === '/search' ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Nearby Hospitals
          </button>
          <button 
            onClick={() => navigate('/bookings')}
            className={`transition-colors cursor-pointer ${location.pathname === '/bookings' ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800'}`}
          >
            My Bookings
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={() => navigate('/admin')}
              className={`transition-colors cursor-pointer text-slate-900 border border-slate-200 px-3 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 font-extrabold`}
            >
              Central Admin
            </button>
          )}
        </nav>

        {/* Location & Alerts */}
        <div className="flex items-center gap-4">
          {/* Location Selector Button */}
          <div className="relative">
            <button 
              onClick={() => setShowLocationsDropdown(!showLocationsDropdown)}
              className="flex items-center gap-1 text-[11px] font-extrabold text-slate-655 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-100/80 transition-all"
            >
              <MapPin size={11} className="text-blue-600" />
              <span>{currentLocation}</span>
              <ChevronDown size={10} className={`text-slate-400 transition-transform ${showLocationsDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showLocationsDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowLocationsDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 py-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
                  <span className="text-[9px] font-black text-slate-400 block px-3 py-1 uppercase tracking-wider">Select Location Area</span>

                  {/* GPS Detect Button */}
                  <button
                    onClick={() => {
                      setLocating(true);
                      detectAndSetLocation();
                      setTimeout(() => {
                        setLocating(false);
                        setShowLocationsDropdown(false);
                      }, 4000);
                    }}
                    disabled={locating}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer border-none mb-1 disabled:opacity-60"
                  >
                    {locating 
                      ? <Loader2 size={12} className="animate-spin shrink-0" />
                      : <MapPin size={12} className="shrink-0" />
                    }
                    <span>{locating ? 'Detecting location...' : 'Use Current Location (GPS)'}</span>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <div className="max-h-52 overflow-y-auto">
                    {locations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setCurrentLocation(loc);
                          setShowLocationsDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                          currentLocation === loc 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-slate-650 hover:bg-slate-50'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
          >
            <Bell size={18} />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadNotifs}
              </span>
            )}
          </button>

          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-xl px-3 py-1.5 hover:ring-2 hover:ring-blue-100 transition-all cursor-pointer font-bold text-slate-700 text-xs"
          >
            <div className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">
              {user?.name.charAt(0)}
            </div>
            <span>{user?.name}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

const AppContent: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Management routes: Admin and Hospital panels (never show splash or onboarding)
  const isHospitalRoute = (
    location.pathname.startsWith('/hospital/') ||
    location.pathname === '/hospital' ||
    location.pathname.startsWith('/hospital-login') ||
    location.pathname.startsWith('/hospital-signup')
  ) && !location.pathname.startsWith('/hospital-details') && !location.pathname.startsWith('/hospitals');
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/admin-login');
  const isManagementRoute = isHospitalRoute || isAdminRoute;

  // App load Splash Screen state - ONLY for customer/patient entry, under 1s (400ms)
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    const isMgmt = (
      path.startsWith('/hospital/') ||
      path === '/hospital' ||
      path.startsWith('/hospital-login') ||
      path.startsWith('/hospital-signup') ||
      path.startsWith('/admin')
    ) && !path.startsWith('/hospital-details') && !path.startsWith('/hospitals');
    if (isMgmt) {
      return false;
    }
    return !sessionStorage.getItem('insta_splash_viewed');
  });

  // Onboarding completion state
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('insta_onboarded') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('insta_onboarded', String(onboarded));
  }, [onboarded]);

  // Always show Splash Screen first only for customer account routes (400ms ultra-short)
  if (showSplash && !isManagementRoute) {
    return (
      <SplashScreen 
        duration={400} 
        onFinish={() => {
          sessionStorage.setItem('insta_splash_viewed', 'true');
          setShowSplash(false);
        }} 
      />
    );
  }

  if (!onboarded && !isManagementRoute) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  if (!user && !isManagementRoute) {
    return (
      <Login 
        onSuccess={() => {
          sessionStorage.setItem('insta_splash_viewed', 'true');
          setShowSplash(false);
          navigate('/');
        }} 
      />
    );
  }

  // Show bottom nav bar on all patient routes (non-admin routes)
  const showBottomNav = !isManagementRoute;

  // Determine active nav item
  const isHomeActive = location.pathname === '/';
  const isSearchActive = location.pathname.startsWith('/search') || location.pathname.startsWith('/hospital');
  const isBookingsActive = location.pathname === '/bookings' || location.pathname.startsWith('/book') || location.pathname.startsWith('/confirmation') || location.pathname === '/payment';
  const isProfileActive = location.pathname === '/profile';

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col justify-between relative ${isManagementRoute ? 'h-screen overflow-hidden' : ''}`} style={{ overflowX: 'clip' }}>
      {/* Desktop Navigation Header */}
      {!isManagementRoute && <TopNavbar />}

      {/* Main Page Area Container */}
      <div className={`flex-grow w-full ${isManagementRoute ? 'p-0 m-0 w-full h-full' : 'w-full max-w-7xl mx-auto px-0 md:px-8 md:mt-6 pb-24 lg:pb-6'}`}>
        <Routes>
          <Route path="/" element={
            <Home 
              onSearchSelect={(filterType) => {
                if (filterType === 'doctors') {
                  navigate('/search?q=dr');
                } else if (filterType === 'nearby') {
                  navigate('/search?filter=nearby');
                } else if (filterType === 'top-rated') {
                  navigate('/search?filter=top-rated');
                } else if (filterType === 'short-wait') {
                  navigate('/search?filter=short-wait');
                } else if (filterType === 'emergency') {
                  navigate('/search?filter=emergency');
                } else {
                  navigate('/search');
                }
              }} 
              onHospitalSelect={(hospId) => navigate(`/hospital-details/${hospId}`)}
              onDoctorSelect={(hospId, docId) => navigate(`/book/${hospId}/${docId}`)}
              onOpenNotifications={() => navigate('/notifications')}
            />
          } />
          <Route path="/search" element={
            <SearchHospitals 
              onHospitalSelect={(hospId) => navigate(`/hospital-details/${hospId}`)} 
            />
          } />
          <Route path="/hospital-details/:id" element={
            <HospitalDetails 
              onDoctorSelect={(hospId, docId) => navigate(`/book/${hospId}/${docId}`)} 
            />
          } />
          <Route path="/hospitals/:id" element={
            <HospitalDetails 
              onDoctorSelect={(hospId, docId) => navigate(`/book/${hospId}/${docId}`)} 
            />
          } />
          <Route path="/book/:hospitalId/:doctorId" element={<BookToken />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/confirmation/:appointmentId" element={<TokenConfirmation />} />

          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Hospital Panel routes */}
          <Route path="/hospital-login" element={<HospitalLogin />} />
          <Route path="/hospital-signup" element={<HospitalSignup />} />
          <Route path="/hospital/login" element={<HospitalLogin />} />
          <Route path="/hospital/signup" element={<HospitalSignup />} />
          <Route path="/hospital/*" element={<HospitalLayout />} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Desktop Footer */}
      {!isManagementRoute && <Footer />}

      {/* Bottom Navigation Menu (visible on mobile & tablet for all patient pages) */}
      {showBottomNav && (
        <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around py-2.5 z-40 shadow-lg">
          <button 
            onClick={() => navigate('/')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              isHomeActive ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <HomeIcon size={20} />
            <span className="text-[11.5px] font-bold">Home</span>
          </button>
          
          <button 
            onClick={() => navigate('/search')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              isSearchActive ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <SearchIcon size={20} />
            <span className="text-[11.5px] font-bold">Nearby Hospitals</span>
          </button>
          
          <button 
            onClick={() => navigate('/bookings')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              isBookingsActive ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Award size={20} />
            <span className="text-[11.5px] font-bold">Bookings</span>
          </button>
          
          <button 
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              isProfileActive ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserIcon size={20} />
            <span className="text-[11.5px] font-bold">Profile</span>
          </button>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <HospitalProvider>
        <Router>
          <AppContent />
        </Router>
      </HospitalProvider>
    </AppProvider>
  );
}

export default App;
