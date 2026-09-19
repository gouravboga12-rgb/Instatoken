import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
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
import {
  LayoutDashboard, Plus, List, Wifi, WifiOff, Calendar, RefreshCw,
  Users, Stethoscope, Building2,
  BarChart2, Download, Settings,
  ChevronLeft, ChevronRight, Bell, Search, LogOut, Menu, X, Activity,
  CreditCard, DollarSign, Sliders, Megaphone
} from 'lucide-react';

// ─── RBAC permission map ──────────────────────────────────────────────────────
const ROLE_SECTIONS: Record<string, string[]> = {
  owner:        ['dashboard','doctor-screens','token-manage','tokens','add-token','all-tokens','online-tokens','offline-tokens','today-tokens','upcoming-tokens','completed-tokens','cancelled-tokens','revisit-tokens','revenue','doctors','departments','sessions','staff','patients','communication','ads-promotion','billing','reports','settings'],
  admin:        ['dashboard','doctor-screens','token-manage','tokens','add-token','all-tokens','online-tokens','offline-tokens','today-tokens','upcoming-tokens','completed-tokens','cancelled-tokens','revisit-tokens','revenue','doctors','departments','sessions','staff','patients','communication','ads-promotion','reports'],
  receptionist: ['dashboard','doctor-screens','token-manage','add-token','all-tokens','today-tokens','staff','patients'],
  doctor:       ['dashboard','doctor-screens','today-tokens','patients'],
  accountant:   ['dashboard','revenue','billing','reports'],
  nurse:        ['dashboard','doctor-screens','today-tokens','staff'],
};

interface NavItem {
  id: string; label: string; icon: React.ReactNode; path: string;
  badge?: string; isDoctorScreen?: boolean;
}

const buildNav = (doctors: HospitalDoctor[], tokens: TokenRecord[]): { section: string; items: NavItem[] }[] => {
  const activeDoctors = doctors.filter(d => d.active);

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
    ]},
    { section: 'Revenue & Finance', items: [
      { id: 'revenue', label: 'Revenue Overview', icon: <DollarSign size={15} />, path: '/hospital/revenue' },
      { id: 'billing', label: 'Billing & Transactions', icon: <CreditCard size={15} />, path: '/hospital/billing' },
    ]},
    { section: 'Doctor Management', items: [
      { id: 'doctors', label: 'Doctors Management', icon: <Stethoscope size={15} />, path: '/hospital/doctors' },
      { id: 'departments', label: 'Departments', icon: <Building2 size={15} />, path: '/hospital/departments' },
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
      { id: 'download', label: 'Download Reports', icon: <Download size={15} />, path: '/hospital/reports?tab=download' },
    ]},
    { section: 'Settings', items: [
      { id: 'settings', label: 'Hospital Settings', icon: <Settings size={15} />, path: '/hospital/settings' },
    ]},
  ];
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void }> = ({ collapsed, onToggle }) => {
  const { hospitalUser, activeSection, setActiveSection, hospitalProfile, doctors, tokens } = useHospital();
  const navigate = useNavigate();
  const nav = buildNav(doctors, tokens);
  const allowed = ROLE_SECTIONS[hospitalUser?.role || 'receptionist'] || [];

  const handleNav = (item: NavItem) => {
    setActiveSection(item.id);
    navigate(item.path);
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
              {visibleItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none group ${
                    activeSection === item.id
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
              ))}
            </div>
          );
        })}
      </nav>

    </aside>
  );
};

// ─── Top Header ───────────────────────────────────────────────────────────────
const TopHeader: React.FC<{ onMenuToggle: () => void }> = ({ onMenuToggle }) => {
  const { hospitalUser, hospitalLogout, tokens, hospitalProfile } = useHospital();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const todayTokens = tokens.filter(t => ['booked','waiting','checked-in'].includes(t.status)).length;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
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
    <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-4 shrink-0">
      {/* Mobile menu toggle */}
      <button onClick={onMenuToggle} className="md:hidden p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
        <Menu size={18} className="text-slate-600" />
      </button>

      {/* Welcome */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-black text-slate-800 leading-none">
          Welcome, {hospitalUser?.name?.split(' ')[0]} 👋
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] font-extrabold text-slate-700 truncate max-w-[240px]">
            {hospitalProfile?.name || hospitalUser?.hospitalName || 'Hospital Management Panel'}
          </p>
          <span className="text-slate-200">·</span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full capitalize ${roleColor}`}>
            {hospitalUser?.role}
          </span>
        </div>
      </div>

      {/* Date */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
        <Calendar size={13} className="text-blue-600" />
        <span className="text-[11px] font-bold text-slate-700">{todayStr}</span>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 w-52">
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
      <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[11px] font-extrabold text-emerald-700">{todayTokens} Active</span>
      </div>

      {/* Manual Sync / Refresh Button */}
      <button 
        onClick={handleManualRefresh}
        title="Sync latest hospital appointments and queues"
        className="flex items-center gap-1.5 text-xs font-bold text-slate-650 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 transition-all cursor-pointer shadow-2xs"
      >
        <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
        <span className="text-[11px] hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
      </button>

      {/* Notification */}
      <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
        <Bell size={18} className="text-slate-500" />
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">3</span>
      </button>

      {/* Profile */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
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
          className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer ml-1"
          title="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
};

// ─── Layout Shell ─────────────────────────────────────────────────────────────
export const HospitalLayout: React.FC = () => {
  const { hospitalUser } = useHospital();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
          <div className="md:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="md:hidden fixed left-0 top-0 h-full z-50">
            <div className="relative">
              <button
                className="absolute top-4 right-[-40px] p-2 bg-white rounded-full shadow cursor-pointer"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <X size={16} />
              </button>
              <Sidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopHeader onMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
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

              <Route path="communication" element={<CommunicationCenter />} />
              <Route path="ads-promotion" element={<AdsPromotion />} />
              <Route path="billing" element={<BillingPayments />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="settings" element={<HospitalSettings />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
