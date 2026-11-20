import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalDoctor, TokenRecord } from '../../context/HospitalContext';
import { triggerManualSync } from '../../utils/syncBus';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { HospitalDashboard } from './HospitalDashboard';
import { TokenManagement } from './TokenManagement';
import { TokenManage } from './TokenManage';
import { DoctorTokenScreen } from './DoctorTokenScreen';
import { RevenueOverview } from './RevenueOverview';
import { DoctorManagement } from './DoctorManagement';
import { PatientManagement } from './PatientManagement';

import { CommunicationCenter } from './CommunicationCenter';
import { AdsPromotion } from './AdsPromotion';
import { BillingPayments } from './BillingPayments';
import { ReportsAnalytics } from './ReportsAnalytics';
import { HospitalSettings } from './HospitalSettings';
import { HospitalStaff } from './HospitalStaff';
import { DepartmentManagement } from './DepartmentManagement';
import { DoctorReferences } from './DoctorReferences';
import { HospitalPayouts } from './HospitalPayouts';
import {
  LayoutDashboard, Plus, List, Wifi, WifiOff, Calendar, RefreshCw,
  Users, Stethoscope, Building2, UserCheck, UserX,
  BarChart2, Settings,
  ChevronLeft, ChevronRight, Bell, Search, LogOut, Menu, X, Activity,
  CreditCard, DollarSign, Sliders, Megaphone, Banknote, Ticket
} from 'lucide-react';

// ─── RBAC permission map ──────────────────────────────────────────────────────
const ROLE_SECTIONS: Record<string, string[]> = {
  owner:        ['dashboard','doctor-screens','token-manage','tokens','add-token','all-tokens','online-tokens','offline-tokens','today-tokens','upcoming-tokens','completed-tokens','cancelled-tokens','revisit-tokens','unvisited-tokens','revenue','doctors','departments','doctor-references','sessions','staff','patients','communication','ads-promotion','billing','reports','settings','payouts'],
  admin:        ['dashboard','doctor-screens','token-manage','tokens','add-token','all-tokens','online-tokens','offline-tokens','today-tokens','upcoming-tokens','completed-tokens','cancelled-tokens','revisit-tokens','unvisited-tokens','revenue','doctors','departments','doctor-references','sessions','staff','patients','communication','ads-promotion','reports','payouts'],
  receptionist: ['dashboard','doctor-screens','token-manage','add-token','all-tokens','today-tokens','unvisited-tokens','doctor-references','staff','patients'],
  doctor:       ['dashboard','doctor-screens','today-tokens','doctor-references','patients'],
  accountant:   ['dashboard','revenue','billing','doctor-references','reports','payouts'],
  nurse:        ['dashboard','doctor-screens','today-tokens','staff'],
};

interface NavItem {
  id: string; label: string; icon: React.ReactNode; path: string;
  badge?: string; isDoctorScreen?: boolean;
}

const isItemActive = (item: NavItem, pathname: string, search: string): boolean => {
  const normPath = pathname.replace(/\/+$/, '') || '/';
  const [itemBase, itemQuery] = item.path.split('?');
  const normItemPath = itemBase.replace(/\/+$/, '') || '/';

  // If item expects query params
  if (itemQuery) {
    return normPath === normItemPath && search.includes(itemQuery);
  }

  // Exact path match
  if (normPath === normItemPath) {
    return true;
  }

  // Dashboard root aliases
  if (item.id === 'dashboard' && (normPath === '/hospital' || normPath === '/hospital/dashboard')) {
    return true;
  }

  // Doctor Token Screens
  if (item.isDoctorScreen && normPath === normItemPath) {
    return true;
  }

  // Sessions / Schedule aliases
  if (item.id === 'sessions' && normPath === '/hospital/schedule') {
    return true;
  }

  // Doctor references / RMP referrals aliases
  if (item.id === 'doctor-references' && normPath === '/hospital/rmp-referrals') {
    return true;
  }

  // Departments subpaths (e.g. /hospital/departments/:deptId)
  if (item.id === 'departments' && normPath.startsWith('/hospital/departments')) {
    return true;
  }

  // Add token path with query parameters (e.g. /hospital/tokens/add?doctorId=...)
  if (item.id === 'add-token' && normPath === '/hospital/tokens/add') {
    return true;
  }

  return false;
};

const buildNav = (doctors: HospitalDoctor[], tokens: TokenRecord[]): { section: string; items: NavItem[] }[] => {
  const activeDoctors = doctors.filter(d => d.active);
  const todayStr = new Date().toISOString().split('T')[0];
  const unvisitedCount = tokens.filter(t => 
    t.status === 'not-visited' || 
    t.status === 'unvisited' || 
    (['booked', 'waiting'].includes(t.status) && t.bookingDate && t.bookingDate < todayStr)
  ).length;

  // Generate Doctor Screens dynamically based on active doctors
  const doctorScreenItems: NavItem[] = activeDoctors.map(doc => {
    const docActiveQueue = tokens.filter(t => t.doctorId === doc.id && ['booked', 'waiting', 'checked-in'].includes(t.status)).length;
    return {
      id: `doc-screen-${doc.id}`,
      label: doc.name,
      icon: <Stethoscope size={14} className="text-blue-400" />,
      path: `/hospital/tokens/doctor/${doc.id}`,
      badge: docActiveQueue > 0 ? `${docActiveQueue}` : undefined,
      isDoctorScreen: true
    };
  });

  return [
    { section: '', items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, path: '/hospital/dashboard' },
    ]},
    { section: `Doctor Token Screens (${activeDoctors.length})`, items: doctorScreenItems },
    { section: 'Token Management', items: [
      { id: 'sessions', label: 'Sessions & Schedule', icon: <Sliders size={15} />, path: '/hospital/tokens/manage' },
      { id: 'add-token', label: 'Add Token', icon: <Plus size={15} />, path: '/hospital/tokens/add' },
      { id: 'all-tokens', label: 'All Tokens', icon: <List size={15} />, path: '/hospital/tokens/all' },
      { id: 'online-tokens', label: 'Online Tokens', icon: <Wifi size={15} />, path: '/hospital/tokens/online' },
      { id: 'offline-tokens', label: 'Offline Tokens', icon: <WifiOff size={15} />, path: '/hospital/tokens/offline' },
      { id: 'today-tokens', label: "Today's Tokens", icon: <Calendar size={15} />, path: '/hospital/tokens/today' },
      { id: 'revisit-tokens', label: 'Revisit Tokens', icon: <RefreshCw size={15} />, path: '/hospital/tokens/revisit' },
      { id: 'unvisited-tokens', label: 'Unvisited Tokens', icon: <UserX size={15} />, path: '/hospital/tokens/unvisited', badge: unvisitedCount > 0 ? `${unvisitedCount}` : undefined },
    ]},
    { section: 'Revenue & Finance', items: [
      { id: 'revenue', label: 'Revenue Overview', icon: <DollarSign size={15} />, path: '/hospital/revenue' },
      { id: 'billing', label: 'Billing & Transactions', icon: <CreditCard size={15} />, path: '/hospital/billing' },
      { id: 'payouts', label: 'InstaToken Payouts', icon: <Banknote size={15} />, path: '/hospital/payouts' },
    ]},
    { section: 'Doctor Management', items: [
      { id: 'doctors', label: 'Doctors Management', icon: <Stethoscope size={15} />, path: '/hospital/doctors' },
      { id: 'departments', label: 'Departments', icon: <Building2 size={15} />, path: '/hospital/departments' },
      { id: 'doctor-references', label: 'Doctor References', icon: <UserCheck size={15} />, path: '/hospital/doctor-references' },
    ]},
    { section: 'Staff & Team', items: [
      { id: 'staff', label: 'Staff & Employees', icon: <Users size={15} />, path: '/hospital/staff' },
    ]},
    { section: 'Patient Management', items: [
      { id: 'patients', label: 'Patients', icon: <Users size={15} />, path: '/hospital/patients' },
    ]},
    { section: 'Communication', items: [
      { id: 'communication', label: 'Push Notifications', icon: <Bell size={15} />, path: '/hospital/communication' },
      { id: 'ads-promotion', label: 'Ads & Promotion', icon: <Megaphone size={15} />, path: '/hospital/ads-promotion' },
    ]},
    { section: 'Reports & Analytics', items: [
      { id: 'reports', label: 'Reports & Analytics', icon: <BarChart2 size={15} />, path: '/hospital/reports' },
    ]},
    { section: 'Settings', items: [
      { id: 'settings', label: 'Hospital Settings', icon: <Settings size={15} />, path: '/hospital/settings' },
    ]},
  ];
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onItemClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onItemClick }) => {
  const { hospitalUser, activeSection, setActiveSection, hospitalProfile, doctors, tokens } = useHospital();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = buildNav(doctors, tokens);
  const allowed = ROLE_SECTIONS[hospitalUser?.role || 'receptionist'] || [];

  // Keep activeSection synchronized with URL route
  useEffect(() => {
    const allItems = nav.flatMap(g => g.items);
    const matched = allItems.find(item => isItemActive(item, location.pathname, location.search));
    if (matched && matched.id !== activeSection) {
      setActiveSection(matched.id);
    }
  }, [location.pathname, location.search, nav, activeSection, setActiveSection]);

  const handleNav = (item: NavItem) => {
    setActiveSection(item.id);
    navigate(item.path);
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} transition-all duration-200 bg-slate-900 flex flex-col h-screen shrink-0 overflow-hidden border-r border-slate-800`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 shrink-0">
        <div className="bg-blue-600 p-1.5 rounded-xl shrink-0">
          <Activity size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-black text-white truncate leading-none">{hospitalProfile?.name}</div>
            <div className="text-[9px] text-slate-500 font-semibold mt-0.5 truncate">Hospital Panel</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
        {nav.map((group) => {
          const visibleItems = group.items.filter(item => allowed.includes(item.id) || item.isDoctorScreen || item.id.startsWith('doc-screen-'));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.section} className="mb-1">
              {group.section && !collapsed && (
                <p className="text-[9px] font-extrabold text-slate-600 uppercase tracking-widest px-3 py-2">{group.section}</p>
              )}
              {visibleItems.map(item => {
                const isActive = isItemActive(item, location.pathname, location.search);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.badge && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${item.badge === 'Live' ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-500/30 text-blue-300'}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

    </aside>
  );
};

// ─── Top Header ───────────────────────────────────────────────────────────────
const TopHeader: React.FC<{ onMenuToggle: () => void }> = ({ onMenuToggle }) => {
  const { hospitalUser, hospitalLogout, tokens, hospitalProfile, notifications, refreshHospitalData, isRefreshingData } = useHospital();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const todayTokens = tokens.filter(t => ['booked','waiting','checked-in'].includes(t.status)).length;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const notifsCount = (notifications || []).length;

  const handleManualRefresh = async () => {
    if (isRefreshing || isRefreshingData) return;
    setIsRefreshing(true);
    try {
      if (refreshHospitalData) {
        await refreshHospitalData();
      }
      await triggerManualSync();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogout = () => {
    hospitalLogout();
    navigate('/hospital-login');
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    receptionist: 'bg-green-100 text-green-700',
    doctor: 'bg-sky-100 text-sky-700',
    accountant: 'bg-amber-100 text-amber-700',
    nurse: 'bg-pink-100 text-pink-700',
  };
  const roleColor = roleColors[hospitalUser?.role || 'receptionist'];

  return (
    <header className="bg-white border-b border-slate-100 px-3 sm:px-6 pt-11 pb-3 flex items-center gap-2 sm:gap-4 shrink-0 z-30 shadow-xs">
      {/* Mobile menu toggle */}
      <button onClick={onMenuToggle} className="md:hidden px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer font-extrabold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs">
        <Menu size={18} />
        <span>Menu</span>
      </button>

      {/* Big Hospital Name & Welcome Header */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <h1 className="text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight uppercase font-heading truncate">
            {hospitalProfile?.name || hospitalUser?.hospitalName || 'Hospital Administration'}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Hospital Online
          </span>
          <span className={`text-[9px] sm:text-[9.5px] font-black px-2 py-0.5 rounded-full capitalize shrink-0 ${roleColor}`}>
            {hospitalUser?.role}
          </span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold mt-0.5 truncate flex items-center gap-1.5">
          <span className="truncate">Welcome, {hospitalUser?.name || 'Administrator'}</span>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span className="hidden sm:inline">Hospital Administration Portal</span>
        </p>
      </div>

      {/* Date */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 shrink-0">
        <Calendar size={13} className="text-blue-600" />
        <span className="text-[11px] font-bold text-slate-700">{todayStr}</span>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 w-52 shrink-0">
        <Search size={13} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search Patient, Token, Mobile..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent text-[11px] text-slate-700 placeholder:text-slate-400 outline-none w-full"
        />
        <span className="text-[9px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-md shrink-0">⌘K</span>
      </div>

      {/* Active tokens badge */}
      <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 shrink-0">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[11px] font-extrabold text-emerald-700">{todayTokens} Active</span>
      </div>

      {/* Right Controls Container */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Manual Sync / Refresh Button (In-Place, Never Navigates Away) */}
        <button 
          type="button"
          onClick={handleManualRefresh}
          title="Refresh appointments and queues in-place (stays on current screen)"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-650 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-1.5 sm:px-2.5 sm:py-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw size={13} className={isRefreshing || isRefreshingData ? 'animate-spin text-blue-600' : 'text-slate-500'} />
          <span className="text-[11px] hidden sm:inline">{isRefreshing || isRefreshingData ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Notification Bell & Dropdown */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowNotificationsDropdown(prev => !prev)}
            className="relative p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Hospital Broadcasts & Notifications"
          >
            <Bell size={17} className="text-slate-500" />
            {notifsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-blue-600 rounded-full text-[8.5px] text-white font-bold flex items-center justify-center animate-pulse">
                {notifsCount > 9 ? '9+' : notifsCount}
              </span>
            )}
          </button>

          {showNotificationsDropdown && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                <span className="text-xs font-black text-slate-800">Hospital Broadcasts</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationsDropdown(false);
                    navigate('/hospital/communication');
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
                >
                  Open Push Center
                </button>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map(n => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`font-extrabold text-[10px] capitalize ${n.type === 'push' ? 'text-purple-600' : 'text-blue-600'}`}>
                          {n.type === 'push' ? 'Device Push' : 'In-App Alert'}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-[11px] text-slate-400 font-bold">
                    No broadcast messages yet.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowNotificationsDropdown(false);
                  navigate('/hospital/communication');
                }}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl cursor-pointer transition-colors text-center block border-none"
              >
                + Send New Notification
              </button>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
            {hospitalUser?.name?.charAt(0) || 'H'}
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-slate-800 leading-none">{hospitalUser?.name?.split(' ').slice(-1)[0]}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[9px] font-semibold text-slate-400">Online</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};

// ─── Layout Shell ─────────────────────────────────────────────────────────────
export const HospitalLayout: React.FC = () => {
  const { hospitalUser } = useHospital();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (window as any).__openHospitalMenu = () => setMobileSidebarOpen(true);
    return () => {
      delete (window as any).__openHospitalMenu;
    };
  }, []);

  if (!hospitalUser) {
    return <Navigate to="/hospital-login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-xs transition-opacity" onClick={() => setMobileSidebarOpen(false)} />
          <div className="md:hidden fixed left-0 top-0 h-full z-50 flex max-w-[85vw] shadow-2xl">
            <div className="relative h-full flex flex-col">
              <button
                className="absolute top-3.5 right-3.5 z-20 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl shadow cursor-pointer border-none transition-colors"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
              <Sidebar 
                collapsed={false} 
                onToggle={() => setMobileSidebarOpen(false)} 
                onItemClick={() => setMobileSidebarOpen(false)}
              />
            </div>
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopHeader onMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-50 pt-3 pb-28 md:pb-0">
          <ErrorBoundary fallbackTitle="Hospital Panel View Error">
            <Routes>
              <Route path="dashboard" element={<HospitalDashboard />} />
              <Route path="tokens/add" element={<TokenManagement />} />
              <Route path="tokens/manage" element={<TokenManage />} />
              <Route path="tokens/doctor/:doctorId" element={<DoctorTokenScreen />} />
              <Route path="tokens/*" element={<TokenManagement />} />
              <Route path="revenue" element={<RevenueOverview />} />
              <Route path="doctors" element={<DoctorManagement tab="doctors" />} />
              <Route path="departments" element={<DepartmentManagement />} />
              <Route path="departments/:deptId" element={<DepartmentManagement />} />
              <Route path="schedule" element={<TokenManage />} />
              <Route path="staff" element={<HospitalStaff />} />
              <Route path="patients" element={<PatientManagement />} />
              <Route path="doctor-references" element={<DoctorReferences />} />
              <Route path="rmp-referrals" element={<DoctorReferences />} />

              <Route path="communication" element={<CommunicationCenter />} />
              <Route path="ads-promotion" element={<AdsPromotion />} />
              <Route path="billing" element={<BillingPayments />} />
              <Route path="payouts" element={<HospitalPayouts />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="settings" element={<HospitalSettings />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>

        {/* Hospital Mobile Bottom Navigation Bar (Clone of full mobile app experience) */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-2 z-40 shadow-lg">
          <button
            onClick={() => navigate('/hospital/dashboard')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              location.pathname.endsWith('/dashboard') || location.pathname === '/hospital' ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard size={19} />
            <span className="text-[10px] font-bold">Dashboard</span>
          </button>

          <button
            onClick={() => navigate('/hospital/tokens/manage')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              location.pathname.includes('/tokens') ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Ticket size={19} />
            <span className="text-[10px] font-bold">Tokens</span>
          </button>

          <button
            onClick={() => navigate('/hospital/doctors')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              location.pathname.includes('/doctors') ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Stethoscope size={19} />
            <span className="text-[10px] font-bold">Doctors</span>
          </button>

          <button
            onClick={() => navigate('/hospital/departments')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              location.pathname.includes('/departments') ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building2 size={19} />
            <span className="text-[10px] font-bold">Depts</span>
          </button>

          <button
            onClick={() => setMobileSidebarOpen(true)}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
              mobileSidebarOpen ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Menu size={19} />
            <span className="text-[10px] font-bold">All Menus</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
