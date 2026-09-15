import React, { useState, useEffect, useRef } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { useApp } from '../../context/AppContext';
import { broadcastGlobalSync, onGlobalSync } from '../../utils/syncBus';
import { INDIAN_STATES, getDistricts } from '../../utils/geoHierarchy';
import {
  Megaphone,
  Mail,
  Phone,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Globe,
  MapPin,
  Sparkles,
  Info,
  Search,
  ChevronDown,
  X
} from 'lucide-react';

interface AdInquiry {
  id: string;
  hospitalId: string;
  hospitalName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  targetLevel: string;
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  ctaText: string;
  durationDays: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
}

export const AdsPromotion: React.FC = () => {
  const { hospitalProfile } = useHospital();
  const { hospitals, addNotification } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [selectedHospitalId, setSelectedHospitalId] = useState(hospitalProfile?.id || (hospitals[0]?.id ?? ''));
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState(hospitalProfile?.phone || '');
  const [contactEmail, setContactEmail] = useState(hospitalProfile?.email || '');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [hospitalLink, setHospitalLink] = useState('');
  const [targetLevel, setTargetLevel] = useState<'country' | 'state' | 'district' | 'mandal'>('state');
  const [selectedState, setSelectedState] = useState(hospitalProfile?.state || 'Telangana');
  const [selectedDistrict, setSelectedDistrict] = useState(hospitalProfile?.city || hospitalProfile?.area || 'Hyderabad');
  const [mandal, setMandal] = useState('');
  const [pincode, setPincode] = useState(hospitalProfile?.pinCode || '');
  const [stateSearchQ, setStateSearchQ] = useState('');
  const [districtSearchQ, setDistrictSearchQ] = useState('');
  const [stateDropOpen, setStateDropOpen] = useState(false);
  const [districtDropOpen, setDistrictDropOpen] = useState(false);
  const [ctaText, setCtaText] = useState('Book OPD Token');
  const [durationDays, setDurationDays] = useState(30);
  const [notes, setNotes] = useState('');

  // Image upload / URL
  const [bannerImage, setBannerImage] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Inquiries History State
  const [inquiries, setInquiries] = useState<AdInquiry[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(true);

  // Sync selected hospital link
  useEffect(() => {
    if (selectedHospitalId) {
      setHospitalLink(`/hospitals/${selectedHospitalId}`);
    }
  }, [selectedHospitalId]);

  // Load existing inquiries for this hospital
  const loadInquiries = async () => {
    try {
      setLoadingInquiries(true);
      const res = await fetch(`/api/ads-inquiries?hospitalId=${selectedHospitalId || hospitalProfile?.id || ''}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.inquiries)) {
        setInquiries(data.inquiries);
      } else {
        // Fallback to local storage
        const saved = localStorage.getItem('insta_ads_inquiries');
        if (saved) {
          const list = JSON.parse(saved);
          const filtered = list.filter((i: any) => !selectedHospitalId || i.hospitalId === selectedHospitalId);
          setInquiries(filtered);
        }
      }
    } catch (e) {
      const saved = localStorage.getItem('insta_ads_inquiries');
      if (saved) {
        try {
          const list = JSON.parse(saved);
          setInquiries(list.filter((i: any) => !selectedHospitalId || i.hospitalId === selectedHospitalId));
        } catch (err) {}
      }
    } finally {
      setLoadingInquiries(false);
    }
  };

  useEffect(() => {
    loadInquiries();

    // Listen to real-time events from Super Admin (approvals, rejections, deletions)
    const unsub = onGlobalSync((event: any) => {
      if (
        event?.type === 'ADS_INQUIRY_DELETED' ||
        event?.type === 'ADS_INQUIRY_CREATED' ||
        event?.type === 'BANNER_DELETED' ||
        event?.type === 'BANNERS_UPDATED'
      ) {
        if (event?.type === 'ADS_INQUIRY_DELETED' && event?.data?.id) {
          try {
            const saved = localStorage.getItem('insta_ads_inquiries');
            if (saved) {
              const list = JSON.parse(saved);
              const updated = list.filter((i: any) => i.id !== event.data.id && !(event.data.title && i.title === event.data.title));
              localStorage.setItem('insta_ads_inquiries', JSON.stringify(updated));
            }
          } catch (e) {}
        }
        loadInquiries();
      }
    });

    return unsub;
  }, [selectedHospitalId, hospitalProfile?.id]);

  // Handle local image file upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Inquiry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim()) {
      alert('Please enter a campaign title.');
      return;
    }
    if (!bannerImage) {
      alert('Please upload or provide a banner image.');
      return;
    }

    const matchedHosp = hospitals.find((h: any) => h.id === selectedHospitalId) || hospitalProfile;
    const finalHospitalName = matchedHosp?.name || hospitalProfile?.name || 'Hospital';

    const payload = {
      hospitalId: selectedHospitalId || hospitalProfile?.id || 'hosp-default',
      hospitalName: finalHospitalName,
      contactPerson: contactPerson.trim() || 'Hospital Administrator',
      contactPhone: contactPhone.trim() || hospitalProfile?.phone || '',
      contactEmail: contactEmail.trim() || hospitalProfile?.email || 'admin@hospital.com',
      title: campaignTitle.trim(),
      description: campaignDescription.trim(),
      link: hospitalLink.trim() || `/hospitals/${selectedHospitalId}`,
      imageUrl: bannerImage,
      targetLevel,
      state: targetLevel !== 'country' ? selectedState : '',
      district: (targetLevel === 'district' || targetLevel === 'mandal') ? selectedDistrict : '',
      mandal: mandal.trim(),
      pincode: pincode.trim(),
      ctaText: ctaText.trim() || 'Book Token',
      durationDays: Number(durationDays) || 30,
      notes: notes.trim()
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/ads-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const newInquiry: AdInquiry = data.inquiry || {
        ...payload,
        id: `ad-inq-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Save to localStorage
      try {
        const saved = localStorage.getItem('insta_ads_inquiries');
        const curList = saved ? JSON.parse(saved) : [];
        const updated = [newInquiry, ...curList.filter((i: any) => i.id !== newInquiry.id)];
        localStorage.setItem('insta_ads_inquiries', JSON.stringify(updated));
      } catch (e) {}

      // Broadcast event so Admin Panel updates live
      broadcastGlobalSync('ADS_INQUIRY_CREATED', newInquiry);

      addNotification(
        'Ad Request Submitted',
        `Your banner ad inquiry for "${newInquiry.title}" was submitted to Super Admin for approval.`,
        'success'
      );

      setSubmitSuccess(true);
      setCampaignTitle('');
      setCampaignDescription('');
      setBannerImage('');
      setNotes('');
      loadInquiries();

      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch (err) {
      alert('Failed to submit inquiry. Please try again or email admin directly.');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              <Megaphone size={22} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Ads & Promotion</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Request homepage & regional advertising placements from InstaToken Super Admin
          </p>
        </div>

        {/* SLA Pill */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700">
          <Sparkles size={14} className="text-emerald-600" />
          <span>Super Admin Review: Within 24 Hours</span>
        </div>
      </div>

      {/* Admin Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Super Admin Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Official Ad Desk</span>
              <h3 className="text-base font-extrabold text-slate-800">Super Admin Mail Support</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Prefer sending assets directly via email? Reach out with high-resolution creative designs or custom campaign contracts.
              </p>
            </div>
            <div className="p-3 bg-white text-blue-600 rounded-xl shadow-xs">
              <Mail size={20} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-100/70 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-blue-800">ads@instatoken.com</span>
            <a
              href={`mailto:ads@instatoken.com?subject=Ad%20Banner%20Inquiry%20-%20${encodeURIComponent(hospitalProfile?.name || 'Hospital')}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs no-underline"
            >
              <Mail size={13} /> Email Super Admin
            </a>
          </div>
        </div>

        {/* Helpline Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fast Track Support</span>
              <h3 className="text-base font-extrabold text-slate-800">Direct Ads Helpline</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Need urgent campaign placement for medical camps, seasonal OPD drives, or emergency wing launches?
              </p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl shadow-xs">
              <Phone size={20} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-700">+91 98450 12345</span>
            <a
              href="tel:+919845012345"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors no-underline"
            >
              <Phone size={13} /> Call Helpline
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Ad Inquiry Form (2 Cols) */}
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">Send Ad Promotion Inquiry</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Submit campaign details. Super Admin will verify and publish this banner to customer devices.
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Inquiry Form
            </span>
          </div>

          {submitSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800">
              <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-extrabold">Inquiry Successfully Submitted!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Super Admin has received your promotion request. Once approved, your banner will immediately go live to patients in your target location.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Hospital Selection & Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hospital Entity <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedHospitalId}
                  onChange={e => setSelectedHospitalId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 bg-slate-50"
                  required
                >
                  {hospitals.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city || 'Hospital'})
                    </option>
                  ))}
                  {hospitalProfile && !hospitals.some((h: any) => h.id === hospitalProfile.id) && (
                    <option value={hospitalProfile.id}>
                      {hospitalProfile.name} (Current Hospital)
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hospital Landing Page Link <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={hospitalLink}
                    onChange={e => setHospitalLink(e.target.value)}
                    placeholder="/hospitals/..."
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500 bg-slate-50"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Campaign Headline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Campaign Title / Banner Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={campaignTitle}
                onChange={e => setCampaignTitle(e.target.value)}
                placeholder="e.g. 24/7 Cardiology & Emergency Trauma Unit — Walk-In or Book Online"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 bg-slate-50"
                required
              />
            </div>

            {/* Campaign Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ad Description / Key Highlights
              </label>
              <textarea
                value={campaignDescription}
                onChange={e => setCampaignDescription(e.target.value)}
                placeholder="Key benefits, doctor availability, emergency helpline, discounts or special packages..."
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>

            {/* Target Location Hierarchy (Matched to Admin Panel Banner Location Format) */}
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <MapPin size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Target Location (Where to show this banner)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Select geographic reach for customer devices & regional feeds
                  </p>
                </div>
              </div>

              {/* 3 Clear Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTargetLevel('country');
                    setStateDropOpen(false);
                    setDistrictDropOpen(false);
                  }}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    targetLevel === 'country'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xl mb-1.5">🌍</div>
                  <h5 className="text-xs font-black text-slate-900">All India (Global)</h5>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Visible across entire website</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetLevel('state');
                    if (!selectedState) setSelectedState(hospitalProfile?.state || 'Telangana');
                    setDistrictDropOpen(false);
                  }}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    targetLevel === 'state'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xl mb-1.5">🏛️</div>
                  <h5 className="text-xs font-black text-slate-900">Specific State</h5>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">e.g. Telangana</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetLevel('district');
                    if (!selectedState) setSelectedState(hospitalProfile?.state || 'Telangana');
                    if (!selectedDistrict) setSelectedDistrict(hospitalProfile?.city || hospitalProfile?.area || 'Hyderabad');
                  }}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    targetLevel === 'district' || targetLevel === 'mandal'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xl mb-1.5">🏙️</div>
                  <h5 className="text-xs font-black text-slate-900">City / District</h5>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">e.g. Hyderabad</p>
                </button>
              </div>

              {/* Conditional State Dropdown */}
              {targetLevel === 'state' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 animate-fadeIn">
                  <label className="block text-xs font-extrabold text-slate-700">Select State *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setStateDropOpen(o => !o); setStateSearchQ(''); }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-800 hover:border-blue-400 transition-colors cursor-pointer"
                    >
                      <span>{selectedState || 'Select state…'}</span>
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
                            {stateSearchQ && (
                              <button type="button" onClick={() => setStateSearchQ('')} className="border-none bg-transparent cursor-pointer">
                                <X size={11} className="text-slate-400" />
                              </button>
                            )}
                          </div>
                        </div>
                        <ul className="max-h-52 overflow-y-auto py-1">
                          {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearchQ.toLowerCase())).map(s => (
                            <li
                              key={s}
                              onClick={() => {
                                setSelectedState(s);
                                const dists = getDistricts('India', s);
                                setSelectedDistrict(dists[0] || '');
                                setStateDropOpen(false);
                                setStateSearchQ('');
                              }}
                              className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                selectedState === s ? 'bg-blue-50 text-blue-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {s}
                            </li>
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

              {/* Conditional City / District Dropdown */}
              {(targetLevel === 'district' || targetLevel === 'mandal') && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Searchable State Combobox */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">State *</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setStateDropOpen(o => !o); setDistrictDropOpen(false); setStateSearchQ(''); }}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-800 hover:border-blue-400 transition-colors cursor-pointer"
                        >
                          <span>{selectedState || 'Select state…'}</span>
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
                                {stateSearchQ && (
                                  <button type="button" onClick={() => setStateSearchQ('')} className="border-none bg-transparent cursor-pointer">
                                    <X size={11} className="text-slate-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <ul className="max-h-52 overflow-y-auto py-1">
                              {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearchQ.toLowerCase())).map(s => (
                                <li
                                  key={s}
                                  onClick={() => {
                                    setSelectedState(s);
                                    const dists = getDistricts('India', s);
                                    setSelectedDistrict(dists[0] || '');
                                    setStateDropOpen(false);
                                    setStateSearchQ('');
                                    setDistrictSearchQ('');
                                  }}
                                  className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                    selectedState === s ? 'bg-blue-50 text-blue-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {s}
                                </li>
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
                          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-800 hover:border-blue-400 transition-colors cursor-pointer"
                        >
                          <span>{selectedDistrict || 'Select city…'}</span>
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
                                {districtSearchQ && (
                                  <button type="button" onClick={() => setDistrictSearchQ('')} className="border-none bg-transparent cursor-pointer">
                                    <X size={11} className="text-slate-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <ul className="max-h-52 overflow-y-auto py-1">
                              {getDistricts('India', selectedState)
                                .filter(d => d.toLowerCase().includes(districtSearchQ.toLowerCase()))
                                .map(d => (
                                  <li
                                    key={d}
                                    onClick={() => {
                                      setSelectedDistrict(d);
                                      setDistrictDropOpen(false);
                                      setDistrictSearchQ('');
                                    }}
                                    className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                      selectedDistrict === d ? 'bg-blue-50 text-blue-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {d}
                                  </li>
                                ))}
                              {getDistricts('India', selectedState).filter(d => d.toLowerCase().includes(districtSearchQ.toLowerCase())).length === 0 && (
                                <li className="px-3.5 py-3 text-xs text-slate-400 text-center">No cities found</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Optional Locality / Area
                      </label>
                      <input
                        type="text"
                        value={mandal}
                        onChange={e => setMandal(e.target.value)}
                        placeholder="e.g. Banjara Hills, Koramangala"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Target Pin Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={e => setPincode(e.target.value)}
                        placeholder="e.g. 500034"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Target Audience Summary Confirmation (Matches Admin Banner Preview) */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Audience: Visible to users in{' '}
                  <strong className="underline">
                    {targetLevel === 'country'
                      ? '🌍 All India (Global — visible to every user across entire website)'
                      : targetLevel === 'state'
                      ? `India → ${selectedState || 'All State'}`
                      : `India → ${selectedState || 'State'} → ${selectedDistrict || 'All Cities'}${mandal ? ' (' + mandal + ')' : ''}${pincode ? ' [Pin: ' + pincode + ']' : ''}`}
                  </strong>
                </span>
              </div>
            </div>

            {/* Banner Creative / Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Banner Creative Image <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`px-2.5 py-1 rounded-md cursor-pointer border-none transition-all ${
                      imageInputMode === 'upload' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`px-2.5 py-1 rounded-md cursor-pointer border-none transition-all ${
                      imageInputMode === 'url' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Image URL
                  </button>
                </div>
              </div>

              {imageInputMode === 'upload' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all"
                  >
                    <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Click to upload banner creative from device</p>
                    <p className="text-[10px] text-slate-400 mt-1">Recommended: 1200 x 400 (3:1 aspect ratio), PNG, JPG or WebP up to 5MB</p>
                  </div>
                </div>
              ) : (
                <input
                  type="url"
                  value={bannerImage}
                  onChange={e => setBannerImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              )}

              {/* Banner Image Preview */}
              {bannerImage && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                  <img
                    src={bannerImage}
                    alt="Banner Preview"
                    className="w-full h-36 object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded">
                        Banner Preview
                      </span>
                      <h5 className="text-sm font-black text-white mt-1">
                        {campaignTitle || 'Your Banner Title Will Appear Here'}
                      </h5>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBannerImage('')}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-lg cursor-pointer border-none text-xs"
                    title="Remove Image"
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>

            {/* CTA Text & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Call-To-Action Button Text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={e => setCtaText(e.target.value)}
                  placeholder="e.g. Book OPD Token, Call Emergency"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Requested Campaign Duration
                </label>
                <select
                  value={durationDays}
                  onChange={e => setDurationDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 bg-slate-50"
                >
                  <option value={7}>7 Days (1 Week Sprint)</option>
                  <option value={15}>15 Days (Fortnight Campaign)</option>
                  <option value={30}>30 Days (Standard 1 Month)</option>
                  <option value={60}>60 Days (Quarterly Special)</option>
                </select>
              </div>
            </div>

            {/* Contact Person Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  placeholder="e.g. Dr. Manager / Admin"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="admin@hospital.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Instructions for Admin
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Please activate before Monday morning OPD rush"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 border-none"
              >
                {submitting ? (
                  <>Submitting Inquiry...</>
                ) : (
                  <>
                    <Megaphone size={14} /> Submit Ad Promotion Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Info & Recent Inquiries (1 Col) */}
        <div className="space-y-6">
          {/* Ad Guidelines Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-blue-400" />
              <h4 className="text-xs font-black uppercase tracking-wider">How Ads Work</h4>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-2 pl-4 list-disc">
              <li>Your ad banner is reviewed by the InstaToken Super Admin team.</li>
              <li>Once approved, the banner appears dynamically on the patient homepage carousel matching your targeted location (state, city or national).</li>
              <li>Clicking the banner takes patients directly to your hospital booking page.</li>
              <li>You can contact Super Admin at any time via <strong className="text-white">ads@instatoken.com</strong>.</li>
            </ul>
          </div>

          {/* Recent Inquiries List */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                My Ad Inquiries ({inquiries.length})
              </h4>
              <button
                type="button"
                onClick={loadInquiries}
                className="text-[10px] font-bold text-blue-600 hover:underline border-none bg-transparent cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {loadingInquiries ? (
              <p className="text-xs text-slate-400 text-center py-4">Loading inquiries...</p>
            ) : inquiries.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl p-4">
                <AlertCircle size={20} className="mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-bold text-slate-400">No ad inquiries submitted yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Submit the form on the left to start promoting your hospital.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {inquiries.map(inq => (
                  <div
                    key={inq.id}
                    className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-black text-slate-800 leading-tight">
                        {inq.title}
                      </h5>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-md border shrink-0 capitalize ${
                          inq.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inq.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {inq.status === 'approved' ? 'Active Live' : inq.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                      </span>
                    </div>

                    {inq.imageUrl && (
                      <img
                        src={inq.imageUrl}
                        alt=""
                        className="w-full h-16 object-cover rounded-xl border border-slate-200"
                      />
                    )}

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} className="text-blue-500" />
                        {inq.district || inq.state || 'All India'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} className="text-slate-400" />
                        {inq.durationDays} Days Duration
                      </span>
                    </div>

                    {inq.adminNotes && (
                      <p className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">
                        Admin Note: {inq.adminNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
