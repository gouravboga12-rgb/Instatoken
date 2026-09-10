import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Plus, Search, CheckCircle2, Edit2, Trash2,
  Calendar, Layers, Compass, Globe, Sparkles,
  RefreshCw, Sliders, EyeOff
} from 'lucide-react';
import {
  INDIAN_STATES,
  getDistricts,
  getMandals,
  getVillages,
  searchLocations,
  matchLocationHierarchy
} from '../../utils/geoHierarchy';
import type { TargetLevel, BannerRecord, GeoLocationDetails } from '../../utils/geoHierarchy';

const PRESET_BANNER_IMAGES = [
  { label: 'Cardiology Camp', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Rural Health Outreach', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Digital Token Drive', url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Specialist Clinic', url: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Eye Care Camp', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Metro FastTrack OPD', url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1200&auto=format&fit=crop&q=80' }
];

export const LocationBanners: React.FC = () => {
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | TargetLevel>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    image: string;
    badge: string;
    ctaText: string;
    linkUrl: string;
    status: 'active' | 'inactive';
    startDate: string;
    endDate: string;
    targetLevel: TargetLevel;
    country: string;
    state: string;
    district: string;
    mandal: string;
    village: string;
    displayPanels: ('customer' | 'hospital')[];
    priority: number;
  }>({
    title: '',
    description: '',
    image: '',
    badge: 'DISTRICT HEALTH CAMP',
    ctaText: 'Book OPD Token',
    linkUrl: '/search',
    status: 'active',
    startDate: '',
    endDate: '',
    targetLevel: 'district',
    country: 'India',
    state: 'Telangana',
    district: 'Karimnagar',
    mandal: '',
    village: '',
    displayPanels: ['customer'],
    priority: 1
  });

  // Custom addition fields if not in list
  const [customMandal, setCustomMandal] = useState('');
  const [customVillage, setCustomVillage] = useState('');

  // Location search autocomplete in modal
  const [geoSearchQuery, setGeoSearchQuery] = useState('');
  const [geoSearchResults, setGeoSearchResults] = useState<any[]>([]);

  // Simulation / Test Bench State
  const [showSimulator, setShowSimulator] = useState(true);
  const [simState, setSimState] = useState('Telangana');
  const [simDistrict, setSimDistrict] = useState('Karimnagar');
  const [simMandal, setSimMandal] = useState('Choppadandi');
  const [simVillage, setSimVillage] = useState('Gumlapur');

  // Fetch Banners from API
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/banners');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.banners)) {
          setBanners(data.banners);
        }
      }
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Filtered Banners
  const filteredBanners = useMemo(() => {
    return banners.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (levelFilter !== 'all' && b.targetLevel !== levelFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          b.title?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.district?.toLowerCase().includes(q) ||
          b.state?.toLowerCase().includes(q) ||
          b.mandal?.toLowerCase().includes(q) ||
          b.village?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [banners, statusFilter, levelFilter, search]);

  // Handle open modal for Create
  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      description: '',
      image: PRESET_BANNER_IMAGES[0].url,
      badge: 'DISTRICT SPECIAL',
      ctaText: 'Book OPD Token',
      linkUrl: '/search',
      status: 'active',
      startDate: '',
      endDate: '',
      targetLevel: 'district',
      country: 'India',
      state: 'Telangana',
      district: 'Karimnagar',
      mandal: '',
      village: '',
      displayPanels: ['customer'],
      priority: 1
    });
    setCustomMandal('');
    setCustomVillage('');
    setGeoSearchQuery('');
    setGeoSearchResults([]);
    setShowModal(true);
  };

  // Handle open modal for Edit
  const handleOpenEdit = (banner: BannerRecord) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || '',
      image: banner.image,
      badge: banner.badge || 'LOCAL UPDATE',
      ctaText: banner.ctaText || 'Book Token',
      linkUrl: banner.linkUrl || '/search',
      status: banner.status,
      startDate: banner.startDate || '',
      endDate: banner.endDate || '',
      targetLevel: banner.targetLevel,
      country: banner.country || 'India',
      state: banner.state || 'Telangana',
      district: banner.district || '',
      mandal: banner.mandal || '',
      village: banner.village || '',
      displayPanels: banner.displayPanels || ['customer'],
      priority: banner.priority || 1
    });
    setCustomMandal('');
    setCustomVillage('');
    setGeoSearchQuery('');
    setGeoSearchResults([]);
    setShowModal(true);
  };

  // Save Banner
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image) {
      alert('Please provide banner title and image.');
      return;
    }

    const finalMandal = customMandal.trim() || formData.mandal;
    const finalVillage = customVillage.trim() || formData.village;

    const payload = {
      ...formData,
      mandal: finalMandal || null,
      village: finalVillage || null
    };

    try {
      const url = editingBanner ? `/api/banners/${editingBanner.id}` : '/api/banners';
      const method = editingBanner ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        fetchBanners();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to save banner');
      }
    } catch (err) {
      console.error('Error saving banner:', err);
      alert('Error saving banner');
    }
  };

  // Toggle status
  const handleToggleStatus = async (banner: BannerRecord) => {
    const newStatus = banner.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/banners/${banner.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, status: newStatus } : b));
      }
    } catch (e) {
      console.error('Error toggling banner status:', e);
    }
  };

  // Delete banner
  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBanners(prev => prev.filter(b => b.id !== id));
      }
    } catch (e) {
      console.error('Error deleting banner:', e);
    }
  };

  // Autocomplete search inside modal
  const handleGeoSearch = (q: string) => {
    setGeoSearchQuery(q);
    if (q.length >= 2) {
      const results = searchLocations(q);
      setGeoSearchResults(results);
    } else {
      setGeoSearchResults([]);
    }
  };

  const handleSelectSearchResult = (res: any) => {
    setFormData(prev => ({
      ...prev,
      targetLevel: res.level,
      country: res.country || 'India',
      state: res.state || prev.state,
      district: res.district || '',
      mandal: res.mandal || '',
      village: res.village || ''
    }));
    setGeoSearchQuery('');
    setGeoSearchResults([]);
  };

  // Hierarchy Simulation Matching
  const simCustomerLocation: GeoLocationDetails = {
    country: 'India',
    state: simState,
    district: simDistrict,
    mandal: simMandal,
    village: simVillage,
    city: simDistrict
  };

  const simMatches = useMemo(() => {
    return banners.map(banner => {
      const isMatched = banner.status === 'active' && matchLocationHierarchy(banner, simCustomerLocation);
      return {
        banner,
        isMatched
      };
    });
  }, [banners, simState, simDistrict, simMandal, simVillage]);

  // Statistics
  const totalCount = banners.length;
  const activeCount = banners.filter(b => b.status === 'active').length;
  const districtCount = banners.filter(b => ['district', 'mandal', 'village'].includes(b.targetLevel)).length;
  const stateCount = banners.filter(b => b.targetLevel === 'state').length;

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Metrics ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Location-Based Banners</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Target campaigns dynamically: Country → State → District → Mandal → Village
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              showSimulator
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sliders size={14} />
            <span>{showSimulator ? 'Hide Test Bench' : 'Open Location Simulator'}</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-black rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
          >
            <Plus size={15} />
            <span>Create New Banner</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Campaigns</span>
            <Layers size={14} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">Across all geographic levels</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Live</span>
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">Real-time serving to customers</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">District & Hyperlocal</span>
            <MapPin size={14} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">{districtCount}</div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">District / Mandal / Village</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">State / National</span>
            <Globe size={14} className="text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-600 mt-1">{stateCount + banners.filter(b => b.targetLevel === 'country').length}</div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">Broad regional coverage</div>
        </div>
      </div>

      {/* ─── Real-Time Hierarchy Simulator / Test Bench ──────────────────────── */}
      {showSimulator && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl p-5 border border-indigo-900/50 shadow-xl text-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-900/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white">Live Hierarchy Simulator & Targeting Test Bench</h3>
            </div>
            <span className="text-[11px] font-bold text-indigo-300">
              Verify which banners a customer at any location receives
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1">State</label>
              <select
                value={simState}
                onChange={e => {
                  const s = e.target.value;
                  setSimState(s);
                  const dists = getDistricts('India', s);
                  setSimDistrict(dists[0] || '');
                  const mands = getMandals('India', s, dists[0]);
                  setSimMandal(mands[0] || '');
                }}
                className="w-full bg-slate-800/90 border border-indigo-800/60 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-400"
              >
                {INDIAN_STATES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1">District / City</label>
              <select
                value={simDistrict}
                onChange={e => {
                  const d = e.target.value;
                  setSimDistrict(d);
                  const mands = getMandals('India', simState, d);
                  setSimMandal(mands[0] || '');
                  const vills = getVillages('India', simState, d, mands[0]);
                  setSimVillage(vills[0] || '');
                }}
                className="w-full bg-slate-800/90 border border-indigo-800/60 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-400"
              >
                {getDistricts('India', simState).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1">Mandal / Taluka</label>
              <select
                value={simMandal}
                onChange={e => {
                  const m = e.target.value;
                  setSimMandal(m);
                  const vills = getVillages('India', simState, simDistrict, m);
                  setSimVillage(vills[0] || '');
                }}
                className="w-full bg-slate-800/90 border border-indigo-800/60 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-400"
              >
                {getMandals('India', simState, simDistrict).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1">Village / Locality</label>
              <select
                value={simVillage}
                onChange={e => setSimVillage(e.target.value)}
                className="w-full bg-slate-800/90 border border-indigo-800/60 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-400"
              >
                {getVillages('India', simState, simDistrict, simMandal).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Preset Buttons for Testing */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">Quick Test Locations:</span>
            <button
              onClick={() => {
                setSimState('Telangana');
                setSimDistrict('Karimnagar');
                setSimMandal('Choppadandi');
                setSimVillage('Gumlapur');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                simDistrict === 'Karimnagar' && simMandal === 'Choppadandi'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-indigo-800/50'
              }`}
            >
              📍 Choppadandi, Karimnagar
            </button>

            <button
              onClick={() => {
                setSimState('Telangana');
                setSimDistrict('Karimnagar');
                setSimMandal('Karimnagar Mandal');
                setSimVillage('Rekurthi');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                simDistrict === 'Karimnagar' && simMandal === 'Karimnagar Mandal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-indigo-800/50'
              }`}
            >
              📍 Rekurthi, Karimnagar City
            </button>

            <button
              onClick={() => {
                setSimState('Telangana');
                setSimDistrict('Warangal');
                setSimMandal('Hanamkonda');
                setSimVillage('Kazipet');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                simDistrict === 'Warangal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-indigo-800/50'
              }`}
            >
              📍 Kazipet, Warangal
            </button>

            <button
              onClick={() => {
                setSimState('Karnataka');
                setSimDistrict('Bengaluru Urban');
                setSimMandal('Bengaluru South');
                setSimVillage('Koramangala');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                simDistrict === 'Bengaluru Urban'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-indigo-800/50'
              }`}
            >
              📍 Koramangala, Bengaluru
            </button>
          </div>

          {/* Real-time Match Breakdown */}
          <div className="bg-slate-950/70 rounded-xl p-3 border border-indigo-900/40">
            <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Customer Simulated Location: <strong className="text-white">India → {simState} → {simDistrict} → {simMandal} → {simVillage}</strong></span>
              <span className="text-emerald-400 font-extrabold">
                {simMatches.filter(m => m.isMatched).length} Campaign(s) Visible
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {simMatches.map(({ banner, isMatched }) => (
                <div
                  key={banner.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isMatched
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isMatched ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <div className="truncate">
                      <span className="font-bold text-white block truncate">{banner.title}</span>
                      <span className="text-[10px] text-slate-400">
                        Target: {banner.targetLevel.toUpperCase()} ({banner.district || banner.state || banner.country})
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                    isMatched ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isMatched ? 'DELIVERED' : 'BLOCKED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Search & Filters Bar ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search campaigns by title, description, district, mandal, or village..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500 font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as any)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Target Levels</option>
            <option value="country">Country Level</option>
            <option value="state">State Level</option>
            <option value="district">District / City Level</option>
            <option value="mandal">Mandal Level</option>
            <option value="village">Village Level</option>
          </select>

          <button
            onClick={fetchBanners}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            title="Refresh Banners"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Banners Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading location-based campaigns...</p>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Compass size={24} />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">No Banners Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No location banners match your current filters. Create a new campaign to target specific districts, mandals, or villages.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-700 transition-all"
          >
            Create Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBanners.map(banner => {
            let targetPath = banner.country || 'India';
            if (banner.state) targetPath += ` → ${banner.state}`;
            if (banner.district) targetPath += ` → ${banner.district}`;
            if (banner.mandal) targetPath += ` → ${banner.mandal}`;
            if (banner.village) targetPath += ` → ${banner.village}`;

            return (
              <div
                key={banner.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Banner Image Preview with Overlays */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                    {/* Badge & Target Level */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                        {banner.badge || 'LOCAL'}
                      </span>

                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm ${
                        banner.targetLevel === 'country' ? 'bg-amber-500/90 text-slate-950' :
                        banner.targetLevel === 'state' ? 'bg-sky-500/90 text-white' :
                        banner.targetLevel === 'district' ? 'bg-purple-600/90 text-white' :
                        banner.targetLevel === 'mandal' ? 'bg-indigo-600/90 text-white' :
                        'bg-emerald-600/90 text-white'
                      }`}>
                        {banner.targetLevel.toUpperCase()} LEVEL
                      </span>
                    </div>

                    {/* Bottom overlay info */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="text-[10px] font-extrabold text-blue-300 flex items-center gap-1 mb-1 truncate">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{targetPath}</span>
                      </div>
                      <h4 className="text-sm font-black leading-tight line-clamp-1">{banner.title}</h4>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    {banner.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                        {banner.description}
                      </p>
                    )}

                    {/* Audience Panels & Validity */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Panels:</span>
                        {(banner.displayPanels || ['customer']).map(p => (
                          <span key={p} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-extrabold capitalize">
                            {p}
                          </span>
                        ))}
                      </div>

                      {banner.startDate && banner.endDate && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar size={11} />
                          <span>{banner.startDate} to {banner.endDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(banner)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1 ${
                        banner.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {banner.status === 'active' ? <CheckCircle2 size={11} /> : <EyeOff size={11} />}
                      <span className="uppercase tracking-wider">{banner.status}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(banner)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create / Edit Banner Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Compass size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black leading-tight">
                    {editingBanner ? 'Edit Location Banner' : 'Create Location-Targeted Banner'}
                  </h3>
                  <p className="text-[11px] text-blue-100 font-medium">
                    Configure geographic targeting, schedule, and imagery
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveBanner} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Campaign Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Banner Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Karimnagar Cardiology Special OPD Camp"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Badge Label</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={e => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g., HEALTH CAMP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 bg-slate-50/50 uppercase"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700">Description / Subtitle</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail the healthcare camp, token discount, or OPD schedule..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              {/* Image URL & Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">Banner Image URL *</label>
                  <span className="text-[10px] font-bold text-slate-400">High-resolution horizontal photo recommended</span>
                </div>

                <input
                  type="url"
                  required
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 bg-slate-50/50"
                />

                {/* Preset Picker */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Presets:</span>
                  {PRESET_BANNER_IMAGES.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, image: p.url })}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {formData.image && (
                  <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 mt-2 bg-slate-100">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                      Live Preview
                    </span>
                  </div>
                )}
              </div>

              {/* ─── GEOGRAPHIC TARGETING ENGINE (The Core Feature) ─────────── */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Target Location Hierarchy</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Country → State → District → Mandal → Village
                  </span>
                </div>

                {/* Target Level Selector */}
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 block mb-1.5">
                    Select Targeting Level (Reach)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(['country', 'state', 'district', 'mandal', 'village'] as TargetLevel[]).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFormData({ ...formData, targetLevel: lvl })}
                        className={`py-2 px-2.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer text-center border ${
                          formData.targetLevel === lvl
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location Autocomplete Search */}
                <div className="relative">
                  <label className="text-[11px] font-extrabold text-slate-600 block mb-1">
                    Or Search Any Location in India (Auto-Populate Hierarchy)
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={geoSearchQuery}
                      onChange={e => handleGeoSearch(e.target.value)}
                      placeholder="Type any place (e.g. Karimnagar, Choppadandi, Warangal, Koramangala)..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {geoSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {geoSearchResults.map((res, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectSearchResult(res)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs font-semibold text-slate-700 flex items-center justify-between"
                        >
                          <span>{res.label}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            {res.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cascading Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Country */}
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Country</label>
                    <select
                      value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="India">India</option>
                    </select>
                  </div>

                  {/* State */}
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">State</label>
                    <select
                      disabled={formData.targetLevel === 'country'}
                      value={formData.state}
                      onChange={e => {
                        const s = e.target.value;
                        const dists = getDistricts('India', s);
                        setFormData({
                          ...formData,
                          state: s,
                          district: dists[0] || '',
                          mandal: '',
                          village: ''
                        });
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none disabled:opacity-50"
                    >
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  {['district', 'mandal', 'village'].includes(formData.targetLevel) && (
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase">District / City *</label>
                      <select
                        value={formData.district}
                        onChange={e => {
                          const d = e.target.value;
                          const mands = getMandals('India', formData.state, d);
                          setFormData({
                            ...formData,
                            district: d,
                            mandal: mands[0] || '',
                            village: ''
                          });
                        }}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {getDistricts('India', formData.state).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Mandal */}
                  {['mandal', 'village'].includes(formData.targetLevel) && (
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase">Mandal / Taluka *</label>
                      <select
                        value={formData.mandal}
                        onChange={e => {
                          const m = e.target.value;
                          const vills = getVillages('India', formData.state, formData.district, m);
                          setFormData({
                            ...formData,
                            mandal: m,
                            village: vills[0] || ''
                          });
                        }}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="">Select Mandal</option>
                        {getMandals('India', formData.state, formData.district).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={customMandal}
                        onChange={e => setCustomMandal(e.target.value)}
                        placeholder="Or enter custom mandal..."
                        className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold"
                      />
                    </div>
                  )}

                  {/* Village */}
                  {formData.targetLevel === 'village' && (
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase">Village / Locality *</label>
                      <select
                        value={formData.village}
                        onChange={e => setFormData({ ...formData, village: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="">Select Village</option>
                        {getVillages('India', formData.state, formData.district, formData.mandal).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={customVillage}
                        onChange={e => setCustomVillage(e.target.value)}
                        placeholder="Or enter custom village/locality..."
                        className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold"
                      />
                    </div>
                  )}
                </div>

                {/* Live Target Coverage Explainer */}
                <div className="bg-blue-50/80 rounded-xl p-3 border border-blue-200/80 text-xs text-blue-900 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-blue-800">
                    <Sparkles size={13} className="text-blue-600 shrink-0" />
                    <span>Coverage Reach:</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed">
                    {formData.targetLevel === 'country' && 'Will be delivered to all customers throughout India.'}
                    {formData.targetLevel === 'state' && `Will appear to all customers in ${formData.state} across every district, mandal, town, and village.`}
                    {formData.targetLevel === 'district' && `Will appear to customers throughout ${formData.district || 'the selected'} District, including all mandals, towns, and villages under it. Customers outside this district will not receive it.`}
                    {formData.targetLevel === 'mandal' && `Will appear to customers in ${formData.mandal || 'the selected'} Mandal and all villages within it.`}
                    {formData.targetLevel === 'village' && `Will appear strictly to customers located in ${formData.village || 'the selected'} Village/Locality.`}
                  </p>
                </div>
              </div>

              {/* Audience Panels & CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Display Panels</label>
                  <div className="flex items-center gap-4 pt-1 text-xs font-bold text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.displayPanels.includes('customer')}
                        onChange={e => {
                          const panels = e.target.checked
                            ? [...formData.displayPanels, 'customer']
                            : formData.displayPanels.filter(p => p !== 'customer');
                          setFormData({ ...formData, displayPanels: panels as any });
                        }}
                        className="rounded text-blue-600"
                      />
                      Customer Panel
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.displayPanels.includes('hospital')}
                        onChange={e => {
                          const panels = e.target.checked
                            ? [...formData.displayPanels, 'hospital']
                            : formData.displayPanels.filter(p => p !== 'hospital');
                          setFormData({ ...formData, displayPanels: panels as any });
                        }}
                        className="rounded text-blue-600"
                      />
                      Hospital Panel
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Call To Action (CTA)</label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="Book Token"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Schedule Dates & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50"
                  >
                    <option value="active">Active (Live)</option>
                    <option value="inactive">Inactive (Draft)</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 cursor-pointer transition-all hover:scale-105"
                >
                  {editingBanner ? 'Save Changes' : 'Publish Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
