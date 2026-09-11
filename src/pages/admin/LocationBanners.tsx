import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Plus, Search, CheckCircle2, Edit2, Trash2,
  Layers, Globe, Sparkles, RefreshCw,
  X, ChevronRight, SlidersHorizontal,
  UploadCloud, Building2, Link as LinkIcon, ChevronDown, Loader2, AlertCircle
} from 'lucide-react';
import {
  INDIAN_STATES,
  getDistricts,
  matchLocationHierarchy
} from '../../utils/geoHierarchy';
import type { BannerRecord } from '../../utils/geoHierarchy';
import { broadcastGlobalSync } from '../../utils/syncBus';

const DEFAULT_BANNER_FALLBACK = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80';

export const LocationBanners: React.FC = () => {
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'country' | 'state' | 'district'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Registered Hospitals for optional dropdown
  const [hospitals, setHospitals] = useState<Array<{ id: string; name: string; city?: string; type?: string; image?: string; address?: string }>>([]);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [isHospitalDropdownOpen, setIsHospitalDropdownOpen] = useState(false);

  // Banner image/video upload & submission states
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'video' | 'url'>('upload');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerRecord | null>(null);

  // Clean Form State for posting banners location-wise
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    image: string;
    mediaType: 'image' | 'video';
    badge: string;
    ctaText: string;
    destinationType: 'hospital' | 'custom';
    hospitalId: string;
    linkUrl: string;
    status: 'active' | 'inactive';
    targetLevel: 'country' | 'state' | 'district' | 'mandal';
    country: string;
    state: string;
    district: string;
    mandal: string;
    displayPanels: ('customer' | 'hospital')[];
    priority: number;
  }>({
    title: '',
    description: '',
    image: '',
    mediaType: 'image',
    badge: 'HEALTH CAMP',
    ctaText: 'Book OPD Token',
    destinationType: 'custom',
    hospitalId: '',
    linkUrl: '/search',
    status: 'active',
    targetLevel: 'country',
    country: 'India',
    state: 'Telangana',
    district: 'Hyderabad',
    mandal: '',
    displayPanels: ['customer', 'hospital'],
    priority: 1
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Optional tester/simulator collapsed by default
  const [showTester, setShowTester] = useState(false);
  const [simState, setSimState] = useState('Telangana');
  const [simDistrict, setSimDistrict] = useState('Hyderabad');

  // Searchable combobox state for state & district pickers
  const [stateSearchQ, setStateSearchQ] = useState('');
  const [districtSearchQ, setDistrictSearchQ] = useState('');
  const [stateDropOpen, setStateDropOpen] = useState(false);
  const [districtDropOpen, setDistrictDropOpen] = useState(false);

  // Fetch Banners
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

  // Fetch Hospitals for searchable dropdown
  const fetchHospitals = async () => {
    try {
      const res = await fetch('/api/hospitals');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.hospitals)) {
          setHospitals(data.hospitals);
        }
      }
    } catch (err) {
      console.error('Failed to load hospitals for banner dropdown:', err);
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchHospitals();
  }, []);

  // Filtered hospitals for searchable dropdown
  const filteredHospitals = useMemo(() => {
    if (!hospitalSearch.trim()) return hospitals;
    const q = hospitalSearch.toLowerCase();
    return hospitals.filter(h => 
      h.name?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q) ||
      h.type?.toLowerCase().includes(q) ||
      h.address?.toLowerCase().includes(q)
    );
  }, [hospitals, hospitalSearch]);

  const handleSelectHospital = (h: any) => {
    setFormData(prev => ({
      ...prev,
      destinationType: 'hospital',
      hospitalId: h.id,
      linkUrl: `/hospital-details/${h.id}`
    }));
    setIsHospitalDropdownOpen(false);
    setHospitalSearch('');
  };

  const handleClearHospital = () => {
    setFormData(prev => ({
      ...prev,
      destinationType: 'custom',
      hospitalId: '',
      linkUrl: '/search'
    }));
  };

  // Helper to resize/compress image file to max 1200x600 JPEG (~80KB)
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            resolve(compressed);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Video File Upload to S3
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      alert('Please select a video file under 200MB.');
      return;
    }
    setIsUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await fetch('/api/upload/video', { method: 'POST', body: uploadData });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          setFormData(prev => ({ ...prev, image: data.url, mediaType: 'video' }));
          return;
        }
      }
      // Fallback: local object URL preview (won't persist across refresh but works for preview)
      const objectUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image: objectUrl, mediaType: 'video' }));
    } catch (err) {
      console.warn('Video upload error, using object URL:', err);
      const objectUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image: objectUrl, mediaType: 'video' }));
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Handle Image File Upload (compresses instantly and uploads to S3 / server)
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("Please select an image file under 15MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      // 1. Instant client-side compression for responsive preview and reliable fallback
      const compressedDataUrl = await compressImageFile(file);
      setFormData(prev => ({ ...prev, image: compressedDataUrl }));

      // 2. Upload to S3/server
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          setFormData(prev => ({ ...prev, image: data.url, mediaType: 'image' }));
        }
      }
    } catch (err) {
      console.warn("Upload endpoint fallback to compressed data URL:", err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Filtered Banners
  const filteredBanners = useMemo(() => {
    return banners.filter(b => {
      // Tab filter
      if (selectedTab === 'country' && b.targetLevel !== 'country') return false;
      if (selectedTab === 'state' && b.targetLevel !== 'state') return false;
      if (selectedTab === 'district' && (b.targetLevel === 'country' || b.targetLevel === 'state')) return false;

      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;

      // State filter
      if (stateFilter !== 'all' && b.state !== stateFilter) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          b.title?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.district?.toLowerCase().includes(q) ||
          b.state?.toLowerCase().includes(q) ||
          b.mandal?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [banners, selectedTab, statusFilter, stateFilter, search]);

  // Counts
  const totalCount = banners.length;
  const activeCount = banners.filter(b => b.status === 'active').length;
  const countryCount = banners.filter(b => b.targetLevel === 'country').length;
  const stateCount = banners.filter(b => b.targetLevel === 'state').length;
  const districtCount = banners.filter(b => b.targetLevel === 'district' || b.targetLevel === 'mandal' || b.targetLevel === 'village').length;

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBanner(null);
    setImageInputMode('upload');
    setFormError(null);
    setIsUploadingImage(false);
    setIsSubmitting(false);
    setFormData({
      title: '',
      description: '',
      image: '',
      mediaType: 'image',
      badge: 'HEALTH CAMP',
      ctaText: 'Book OPD Token',
      destinationType: 'custom',
      hospitalId: '',
      linkUrl: '/search',
      status: 'active',
      targetLevel: 'country',
      country: 'India',
      state: 'Telangana',
      district: 'Hyderabad',
      mandal: '',
      displayPanels: ['customer', 'hospital'],
      priority: 1
    });
    setHospitalSearch('');
    setIsHospitalDropdownOpen(false);
    fetchHospitals();
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (b: BannerRecord) => {
    setEditingBanner(b);
    setFormError(null);
    setIsUploadingImage(false);
    setIsSubmitting(false);
    const isVid = b.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(b.image || '');
    setImageInputMode(isVid ? 'video' : (b.image && b.image.startsWith('data:') ? 'upload' : 'url'));
    setFormData({
      title: b.title || '',
      description: b.description || '',
      image: b.image || '',
      mediaType: isVid ? 'video' : (b.mediaType || 'image'),
      badge: b.badge || 'PROMOTION',
      ctaText: b.ctaText || 'Book OPD Token',
      destinationType: b.hospitalId ? 'hospital' : (b.destinationType || 'custom'),
      hospitalId: b.hospitalId || '',
      linkUrl: b.linkUrl || (b.hospitalId ? `/hospital-details/${b.hospitalId}` : '/search'),
      status: b.status,
      targetLevel: (b.targetLevel === 'village' ? 'mandal' : (b.targetLevel || 'country')) as any,
      country: 'India',
      state: b.state || 'Telangana',
      district: b.district || 'Hyderabad',
      mandal: b.mandal || '',
      displayPanels: b.displayPanels || ['customer', 'hospital'],
      priority: b.priority || 1
    });
    setHospitalSearch('');
    setIsHospitalDropdownOpen(false);
    fetchHospitals();
    setShowModal(true);
  };

  // Save Banner (Create or Edit)
  const handleSubmitForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    const titleTrimmed = (formData.title || '').trim();
    if (!titleTrimmed) {
      setFormError('Please enter a Banner Title in Section 1.');
      const titleEl = document.getElementById('banner-title-input');
      if (titleEl) {
        titleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleEl.focus();
      }
      return;
    }

    const imageTrimmed = (formData.image || '').trim();
    if (!imageTrimmed) {
      setFormError('Please upload a banner image/video or enter a URL in Section 2.');
      const mediaEl = document.getElementById('banner-media-section');
      if (mediaEl) {
        mediaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const resolvedLink = formData.hospitalId 
      ? `/hospital-details/${formData.hospitalId}` 
      : (formData.linkUrl.trim() || '/search');

    const isVid = formData.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(imageTrimmed);

    const payload = {
      title: titleTrimmed,
      description: formData.description.trim(),
      image: imageTrimmed,
      mediaType: isVid ? 'video' : 'image',
      badge: formData.badge.trim() || 'LOCAL HEALTH UPDATE',
      ctaText: formData.ctaText.trim() || 'Book OPD Token',
      hospitalId: formData.hospitalId || null,
      destinationType: formData.hospitalId ? 'hospital' : formData.destinationType,
      linkUrl: resolvedLink,
      status: formData.status,
      targetLevel: formData.targetLevel || 'country',
      country: 'India',
      state: formData.targetLevel !== 'country' ? formData.state : null,
      district: (formData.targetLevel === 'district' || formData.targetLevel === 'mandal') ? formData.district : null,
      mandal: formData.targetLevel === 'mandal' ? (formData.mandal.trim() || null) : null,
      village: null,
      displayPanels: formData.displayPanels || ['customer', 'hospital'],
      priority: 1
    };

    setIsSubmitting(true);
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
        setSaveSuccessMsg(editingBanner ? 'Banner updated successfully!' : 'Banner published globally across entire website!');
        setTimeout(() => setSaveSuccessMsg(null), 6000);
        await fetchBanners();
        broadcastGlobalSync('BANNERS_UPDATED', { action: editingBanner ? 'update' : 'create' });
      } else {
        let errMessage = `Error ${res.status}: Failed to save banner`;
        try {
          const data = await res.json();
          if (data && data.message) errMessage = data.message;
        } catch {
          const txt = await res.text().catch(() => '');
          if (txt) errMessage = `Server error (${res.status}): ${txt.slice(0, 100)}`;
        }
        setFormError(errMessage);
      }
    } catch (err: any) {
      console.error('Error saving banner:', err);
      setFormError(`Network error: ${err?.message || 'Failed to reach server'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
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
        broadcastGlobalSync('BANNERS_UPDATED', { id: banner.id, status: newStatus });
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
        broadcastGlobalSync('BANNER_DELETED', { id });
      }
    } catch (e) {
      console.error('Error deleting banner:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold text-sm cursor-pointer">✕</button>
        </div>
      )}

      {/* ─── Header Section ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-blue-100">
              Location Banner Manager
            </span>
            <span className="text-xs font-bold text-slate-400">• Real-Time Location Delivery</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Location-Based Banners</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Target healthcare campaigns, hospital camps, and OPD offers to users based on their City, State, or Nationwide.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowTester(!showTester)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showTester ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>{showTester ? 'Hide Location Tester' : 'Test Location Delivery'}</span>
          </button>

          <button
            onClick={fetchBanners}
            title="Refresh Banners"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl cursor-pointer transition-colors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
          >
            <Plus size={16} />
            <span>Post New Banner</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Campaigns</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">All location campaigns</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Live</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Showing to customers now</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">All India Banners</span>
            <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Globe size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-600 mt-1">{countryCount}</div>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Visible across India</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">State & City Banners</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <MapPin size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">{stateCount + districtCount}</div>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Targeted to specific regions</p>
        </div>
      </div>

      {/* ─── Optional Location Delivery Tester (Collapsed by default) ────────── */}
      {showTester && (
        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white">Live Location Targeting Simulator</h3>
            </div>
            <p className="text-xs text-slate-400">Select any location to test what banners a customer there receives</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Select State</label>
              <select
                value={simState}
                onChange={e => {
                  setSimState(e.target.value);
                  const dists = getDistricts('India', e.target.value);
                  setSimDistrict(dists[0] || '');
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Select City / District</label>
              <select
                value={simDistrict}
                onChange={e => setSimDistrict(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              >
                {getDistricts('India', simState).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <div className="w-full p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  Targeted Users in: <strong className="text-white">India → {simState} → {simDistrict}</strong>
                </span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-lg">
                  {banners.filter(b => b.status === 'active' && matchLocationHierarchy(b, { country: 'India', state: simState, district: simDistrict })).length} Active Banners Delivered
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Location-Wise Filter Tabs & Controls Bar ────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Level Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                selectedTab === 'all'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Banners ({totalCount})
            </button>

            <button
              onClick={() => setSelectedTab('country')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                selectedTab === 'country'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>🇮🇳 All India</span>
              <span className="bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded-md text-[10px] font-black">{countryCount}</span>
            </button>

            <button
              onClick={() => setSelectedTab('state')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                selectedTab === 'state'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>🏛️ State Wise</span>
              <span className="bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded-md text-[10px] font-black">{stateCount}</span>
            </button>

            <button
              onClick={() => setSelectedTab('district')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                selectedTab === 'district'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>🏙️ City / District Wise</span>
              <span className="bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded-md text-[10px] font-black">{districtCount}</span>
            </button>
          </div>

          <div className="text-xs font-extrabold text-slate-500">
            Showing <span className="text-blue-600 font-black">{filteredBanners.length}</span> of {totalCount} campaigns
          </div>
        </div>

        {/* Filter Inputs Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Title, City, District or State..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* State Filter */}
          <div>
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="all">📍 All States (Filter by State)</option>
              {INDIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="all">🟢 Status: All Campaigns</option>
              <option value="active">Active (Live to Patients)</option>
              <option value="inactive">Inactive (Draft / Paused)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Banner Cards Grid ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 text-xs font-bold">
          Loading location banners from database...
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl">
            📍
          </div>
          <h3 className="text-base font-black text-slate-800">No Banners Found for this Location Filter</h3>
          <p className="text-xs font-semibold text-slate-400 max-w-md mx-auto">
            Try switching location tabs or click "Post New Banner" to publish an announcement for this region.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Post Banner Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBanners.map(banner => {
            const isState = banner.targetLevel === 'state';
            const isDistrict = banner.targetLevel === 'district' || banner.targetLevel === 'mandal' || banner.targetLevel === 'village';

            let locationBadge = '🇮🇳 All India';
            let badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';

            if (isState) {
              locationBadge = `🏛️ State: ${banner.state || 'India'}`;
              badgeBg = 'bg-sky-50 text-sky-700 border-sky-200';
            } else if (isDistrict) {
              locationBadge = `🏙️ City: ${banner.district || ''}${banner.state ? ', ' + banner.state : ''}`;
              badgeBg = 'bg-purple-50 text-purple-700 border-purple-200';
              if (banner.mandal) {
                locationBadge = `📍 ${banner.mandal}, ${banner.district || ''}`;
              }
            }

            return (
              <div
                key={banner.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
              >
                {/* Banner Image or Video Preview with Location Overlay */}
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  {banner.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(banner.image || '') ? (
                    <video
                      src={banner.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      onError={e => {
                        (e.target as HTMLImageElement).src = DEFAULT_BANNER_FALLBACK;
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                  {/* Video indicator tag */}
                  {(banner.mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(banner.image || '')) && (
                    <div className="absolute bottom-3 right-3 z-10 bg-purple-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-xs">
                      🎬 VIDEO
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border shadow-xs backdrop-blur-xs ${badgeBg}`}>
                      {locationBadge}
                    </span>

                    <button
                      onClick={() => handleToggleStatus(banner)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-xl border cursor-pointer transition-all flex items-center gap-1 shadow-xs ${
                        banner.status === 'active'
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-slate-800/90 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${banner.status === 'active' ? 'bg-white' : 'bg-slate-400'}`} />
                      <span>{banner.status === 'active' ? 'Live' : 'Paused'}</span>
                    </button>
                  </div>

                  {/* Bottom Image Overlay Tag */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    {banner.badge && (
                      <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mb-1">
                        {banner.badge}
                      </span>
                    )}
                    <h4 className="text-sm font-black leading-tight text-white line-clamp-1">{banner.title}</h4>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {banner.description || 'Campaign announcement displayed to customers based on their detected location.'}
                  </p>

                  {/* Destination Hospital / URL Info */}
                  <div>
                    {banner.hospitalId ? (
                      (() => {
                        const h = hospitals.find(hosp => hosp.id === banner.hospitalId);
                        return (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50/90 border border-indigo-150 px-2.5 py-1 rounded-xl truncate">
                            <Building2 size={13} className="shrink-0 text-indigo-600" />
                            <span className="truncate">Hospital: {h?.name || banner.hospitalId}</span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl truncate">
                        <LinkIcon size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">URL: {banner.linkUrl || '/search'}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-xl">
                      {banner.ctaText || 'Book OPD Token'} <ChevronRight size={12} />
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(banner)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Banner"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Banner"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Intuitive "Post / Edit Location Banner" Modal ───────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden my-6 animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  {editingBanner ? 'Edit Banner' : 'New Campaign'}
                </span>
                <h3 className="text-lg font-black mt-1">
                  {editingBanner ? 'Edit Location Banner' : 'Post New Location Banner'}
                </h3>
                <p className="text-xs text-blue-100 font-medium">
                  Choose where this banner appears: Nationwide, in a Specific State, or a Specific City.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} noValidate className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Step 1: Banner Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">1</span>
                  Banner Content
                </h4>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Banner Title *</label>
                  <input
                    id="banner-title-input"
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Free Mega Cardiac Checkup Camp"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">Subtitle / Offer Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g. 50% off doctor consultation fee this weekend"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">Badge Tag</label>
                    <input
                      type="text"
                      value={formData.badge}
                      onChange={e => setFormData({ ...formData, badge: e.target.value })}
                      placeholder="e.g. SPECIAL OFFER, FREE OPD"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Banner Upload (Image or Video) */}
              <div id="banner-media-section" className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">2</span>
                    Banner Upload
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] font-bold bg-slate-100 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => { setImageInputMode('upload'); setFormData(prev => ({ ...prev, mediaType: 'image' })); }}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        imageInputMode === 'upload' ? 'bg-white text-blue-600 shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      📷 Image
                    </button>
                    <button
                      type="button"
                      onClick={() => { setImageInputMode('video'); setFormData(prev => ({ ...prev, mediaType: 'video' })); }}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        imageInputMode === 'video' ? 'bg-white text-purple-600 shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      🎬 Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        imageInputMode === 'url' ? 'bg-white text-blue-600 shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      🔗 URL
                    </button>
                  </div>
                </div>

                {/* IMAGE UPLOAD TAB */}
                {imageInputMode === 'upload' && (
                  <div>
                    <input id="banner-file-input" type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                    {isUploadingImage ? (
                      <div className="border-2 border-dashed border-blue-300 bg-blue-50/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                        <Loader2 size={26} className="text-blue-600 animate-spin mb-2" />
                        <p className="text-xs font-black text-blue-900">Optimizing & Uploading Banner Image...</p>
                        <p className="text-[10px] font-semibold text-blue-600 mt-0.5">Compressing image for instant delivery</p>
                      </div>
                    ) : !formData.image || formData.mediaType === 'video' ? (
                      <label htmlFor="banner-file-input" className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                          <UploadCloud size={24} />
                        </div>
                        <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors">Click to Browse or Drag & Drop Banner Image</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Supports PNG, JPG, JPEG, WEBP (Max 15MB · Auto-optimized)</p>
                      </label>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={formData.image} alt="Uploaded Banner" className="w-16 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <CheckCircle2 size={10} /> Image Ready
                            </span>
                            <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{formData.image.startsWith('http') ? 'Stored on Cloud CDN' : 'Optimized & compressed'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label htmlFor="banner-file-input" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">Change Image</label>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: '', mediaType: 'image' }))} className="px-2.5 py-1.5 bg-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* VIDEO UPLOAD TAB */}
                {imageInputMode === 'video' && (
                  <div>
                    <input id="banner-video-input" type="file" accept="video/mp4,video/webm,video/ogg,video/*" onChange={handleVideoFileUpload} className="hidden" />
                    {isUploadingImage ? (
                      <div className="border-2 border-dashed border-purple-300 bg-purple-50/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                        <Loader2 size={26} className="text-purple-600 animate-spin mb-2" />
                        <p className="text-xs font-black text-purple-900">Uploading Banner Video to Cloud...</p>
                        <p className="text-[10px] font-semibold text-purple-600 mt-0.5">Large files may take a moment — please wait</p>
                      </div>
                    ) : !formData.image || formData.mediaType === 'image' ? (
                      <label htmlFor="banner-video-input" className="border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50/70 hover:bg-purple-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform text-2xl">
                          🎬
                        </div>
                        <p className="text-xs font-black text-slate-800 group-hover:text-purple-600 transition-colors">Click to Browse or Drag & Drop Banner Video</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Supports MP4, WEBM, OGG (Max 200MB · Auto-loop on banner)</p>
                      </label>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-16 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shrink-0 border border-purple-200">🎬</div>
                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                              <CheckCircle2 size={10} /> Video Ready
                            </span>
                            <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{formData.image.startsWith('http') ? 'Stored on Cloud CDN' : 'Local preview (will upload on save)'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label htmlFor="banner-video-input" className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">Change Video</label>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: '', mediaType: 'image' }))} className="px-2.5 py-1.5 bg-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* URL TAB */}
                {imageInputMode === 'url' && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">Image or Video URL *</label>
                    <input
                      type="url"
                      required={!formData.image}
                      value={formData.image}
                      onChange={e => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Paste a direct image URL (JPG/PNG/WEBP) or video URL (MP4/WEBM)</p>
                  </div>
                )}

                {/* Live Preview */}
                {formData.image && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Live Customer Preview:</span>
                    <div className="relative h-28 w-full rounded-xl overflow-hidden shadow-xs">
                      {formData.mediaType === 'video' ? (
                        <video
                          src={formData.image}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3 text-white">
                        {formData.badge && <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.2 rounded uppercase">{formData.badge}</span>}
                        <h5 className="text-xs font-black truncate">{formData.title || 'Your Banner Title'}</h5>
                        <p className="text-[10px] text-slate-200 truncate">{formData.description || 'Your description will appear here'}</p>
                      </div>
                      {formData.mediaType === 'video' && (
                        <div className="absolute top-2 right-2 bg-purple-600/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">🎬 VIDEO</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Location Targeting (The user's key requirement!) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">3</span>
                  Target Location (Where to show this banner)
                </h4>

                {/* 3 Clear Options */}
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetLevel: 'country' })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      formData.targetLevel === 'country'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-lg mb-1">🌍</div>
                    <h5 className="text-xs font-black text-slate-900">All India (Global)</h5>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Visible across entire website</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetLevel: 'state' })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      formData.targetLevel === 'state'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-lg mb-1">🏛️</div>
                    <h5 className="text-xs font-black text-slate-900">Specific State</h5>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">e.g. Telangana</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetLevel: 'district' })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      formData.targetLevel === 'district' || formData.targetLevel === 'mandal'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-lg mb-1">🏙️</div>
                    <h5 className="text-xs font-black text-slate-900">City / District</h5>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">e.g. Hyderabad</p>
                  </button>
                </div>

                {/* Conditional Dropdowns based on choice */}
                {formData.targetLevel === 'state' && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 animate-fadeIn">
                    <label className="block text-xs font-extrabold text-slate-700">Select State *</label>
                    {/* Searchable State Combobox */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setStateDropOpen(o => !o); setStateSearchQ(''); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-800 hover:border-blue-400 transition-colors"
                      >
                        <span>{formData.state || 'Select state…'}</span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${stateDropOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {stateDropOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-slate-100">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                              <Search size={12} className="text-slate-400 shrink-0" />
                              <input
                                autoFocus
                                type="text"
                                value={stateSearchQ}
                                onChange={e => setStateSearchQ(e.target.value)}
                                placeholder="Search state…"
                                className="flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder-slate-400"
                              />
                              {stateSearchQ && <button type="button" onClick={() => setStateSearchQ('')}><X size={11} className="text-slate-400" /></button>}
                            </div>
                          </div>
                          <ul className="max-h-52 overflow-y-auto py-1">
                            {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearchQ.toLowerCase())).map(s => (
                              <li
                                key={s}
                                onClick={() => { setFormData({ ...formData, state: s }); setStateDropOpen(false); setStateSearchQ(''); }}
                                className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                  formData.state === s ? 'bg-blue-50 text-blue-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >{s}</li>
                            ))}
                            {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearchQ.toLowerCase())).length === 0 && (
                              <li className="px-3.5 py-3 text-xs text-slate-400 text-center">No states found</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(formData.targetLevel === 'district' || formData.targetLevel === 'mandal') && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Searchable State Combobox */}
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">State *</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setStateDropOpen(o => !o); setDistrictDropOpen(false); setStateSearchQ(''); }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-800 hover:border-blue-400 transition-colors"
                          >
                            <span>{formData.state || 'Select state…'}</span>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${stateDropOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {stateDropOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                              <div className="p-2 border-b border-slate-100">
                                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                                  <Search size={12} className="text-slate-400 shrink-0" />
                                  <input
                                    autoFocus
                                    type="text"
                                    value={stateSearchQ}
                                    onChange={e => setStateSearchQ(e.target.value)}
                                    placeholder="Search state…"
                                    className="flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder-slate-400"
                                  />
                                  {stateSearchQ && <button type="button" onClick={() => setStateSearchQ('')}><X size={11} className="text-slate-400" /></button>}
                                </div>
                              </div>
                              <ul className="max-h-52 overflow-y-auto py-1">
                                {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearchQ.toLowerCase())).map(s => (
                                  <li
                                    key={s}
                                    onClick={() => {
                                      const dists = getDistricts('India', s);
                                      setFormData({ ...formData, state: s, district: dists[0] || '' });
                                      setStateDropOpen(false); setStateSearchQ(''); setDistrictSearchQ('');
                                    }}
                                    className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                      formData.state === s ? 'bg-blue-50 text-blue-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >{s}</li>
                                ))}
                                {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearchQ.toLowerCase())).length === 0 && (
                                  <li className="px-3.5 py-3 text-xs text-slate-400 text-center">No states found</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Searchable City/District Combobox */}
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">City / District *</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setDistrictDropOpen(o => !o); setStateDropOpen(false); setDistrictSearchQ(''); }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-800 hover:border-blue-400 transition-colors"
                          >
                            <span>{formData.district || 'Select city…'}</span>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${districtDropOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {districtDropOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                              <div className="p-2 border-b border-slate-100">
                                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                                  <Search size={12} className="text-slate-400 shrink-0" />
                                  <input
                                    autoFocus
                                    type="text"
                                    value={districtSearchQ}
                                    onChange={e => setDistrictSearchQ(e.target.value)}
                                    placeholder="Search city / district…"
                                    className="flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder-slate-400"
                                  />
                                  {districtSearchQ && <button type="button" onClick={() => setDistrictSearchQ('')}><X size={11} className="text-slate-400" /></button>}
                                </div>
                              </div>
                              <ul className="max-h-52 overflow-y-auto py-1">
                                {getDistricts('India', formData.state)
                                  .filter(d => d.toLowerCase().includes(districtSearchQ.toLowerCase()))
                                  .map(d => (
                                    <li
                                      key={d}
                                      onClick={() => { setFormData({ ...formData, district: d }); setDistrictDropOpen(false); setDistrictSearchQ(''); }}
                                      className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                        formData.district === d ? 'bg-blue-50 text-blue-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >{d}</li>
                                  ))}
                                {getDistricts('India', formData.state).filter(d => d.toLowerCase().includes(districtSearchQ.toLowerCase())).length === 0 && (
                                  <li className="px-3.5 py-3 text-xs text-slate-400 text-center">No cities found</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Optional Locality / Area (e.g. Kothapet, Banjara Hills, Koramangala)
                      </label>
                      <input
                        type="text"
                        value={formData.mandal}
                        onChange={e => setFormData({ ...formData, mandal: e.target.value })}
                        placeholder="Leave blank for entire city, or specify locality"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                {/* Target Audience Summary Confirmation */}
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Audience: Visible to users in{' '}
                    <strong className="underline">
                      {formData.targetLevel === 'country'
                        ? '🌍 All India (Global — visible to every user across entire website)'
                        : formData.targetLevel === 'state'
                        ? `India → ${formData.state}`
                        : `India → ${formData.state} → ${formData.district}${formData.mandal ? ' (' + formData.mandal + ')' : ''}`}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Step 4: Button Action, Hospital Redirection & URL Options */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">4</span>
                  Banner Action & Hospital Redirection (Optional)
                </h4>

                {/* Option 1: Searchable Registered Hospital Dropdown */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Building2 size={14} className="text-blue-600" />
                      Link to a Registered Hospital (Optional)
                    </label>
                    {formData.hospitalId && (
                      <button
                        type="button"
                        onClick={handleClearHospital}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        ✕ Remove Hospital Link
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    When patients click this banner, automatically redirect them to this hospital's OPD booking page.
                  </p>

                  {/* Selected Hospital Display or Dropdown Toggle */}
                  {formData.hospitalId ? (
                    (() => {
                      const selHosp = hospitals.find(h => h.id === formData.hospitalId);
                      return (
                        <div className="p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 text-xs truncate">{selHosp?.name || 'Partner Hospital'}</span>
                                <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full shrink-0">
                                  ✓ Linked
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium truncate">
                                {selHosp?.city || 'Location'} · {selHosp?.type || 'Multi Speciality'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsHospitalDropdownOpen(!isHospitalDropdownOpen)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 cursor-pointer shrink-0"
                          >
                            Change
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsHospitalDropdownOpen(!isHospitalDropdownOpen)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Building2 size={14} className="text-slate-400" />
                          <span>Select a Registered Hospital (Optional)...</span>
                        </span>
                        <ChevronDown size={15} className={`text-slate-400 transition-transform ${isHospitalDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  )}

                  {/* Searchable Hospital Dropdown Menu */}
                  {isHospitalDropdownOpen && (
                    <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-fadeIn z-30">
                      <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            autoFocus
                            value={hospitalSearch}
                            onChange={e => setHospitalSearch(e.target.value)}
                            placeholder="Search hospital name, city, or specialty..."
                            className="w-full pl-8 pr-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                        {filteredHospitals.length > 0 ? (
                          filteredHospitals.map(h => (
                            <div
                              key={h.id}
                              onClick={() => handleSelectHospital(h)}
                              className={`p-2.5 rounded-xl flex items-center justify-between hover:bg-blue-50 cursor-pointer transition-colors ${
                                formData.hospitalId === h.id ? 'bg-blue-50/80' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                                  <Building2 size={15} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-900 text-xs truncate">{h.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium truncate">
                                    {h.city || 'Location'} · {h.type || 'Hospital'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                                  Registered Partner
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs font-bold text-slate-400">
                            No registered hospitals found matching "{hospitalSearch}".
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Option 2: Button Label & Redirect URL Field */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={formData.ctaText}
                      onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
                      placeholder="Book OPD Token"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Redirect URL (Page or Link) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.linkUrl}
                      onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
                      placeholder="e.g. /search, /hospital-details/..., or https://..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {formData.hospitalId ? 'Auto-linked to selected hospital OPD page' : 'Enter /search, /bookings, or full URL https://...'}
                    </span>
                  </div>
                </div>

                {/* Publish Status */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Publish Status</span>
                    <span className="text-[11px] text-slate-400 font-medium">Active banners appear immediately to customers</span>
                  </div>

                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-800"
                  >
                    <option value="active">🟢 Active (Live)</option>
                    <option value="inactive">⚪ Inactive (Draft)</option>
                  </select>
                </div>
              </div>

              {/* Form Error Banner */}
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs font-bold text-red-700 animate-fadeIn shadow-xs">
                  <AlertCircle size={20} className="text-red-600 shrink-0" />
                  <span className="leading-snug">{formError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  onClick={() => handleSubmitForm()}
                  disabled={isSubmitting || isUploadingImage}
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer transition-all hover:scale-102 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving Banner...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{editingBanner ? 'Save Changes' : 'Publish Banner Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
