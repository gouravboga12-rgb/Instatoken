import React, { useState, useEffect, useRef } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { useApp } from '../../context/AppContext';
import { broadcastGlobalSync, onGlobalSync } from '../../utils/syncBus';
import { INDIAN_STATES, GEO_HIERARCHY } from '../../utils/geoHierarchy';
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
  Info
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
  const [selectedDistrict, setSelectedDistrict] = useState(hospitalProfile?.city || hospitalProfile?.area || '');
  const [pincode, setPincode] = useState(hospitalProfile?.pinCode || '');
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
      state: selectedState,
      district: selectedDistrict,
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

  // Available districts for selected state
  const availableDistricts = selectedState && GEO_HIERARCHY[selectedState]
    ? Object.keys(GEO_HIERARCHY[selectedState])
    : [];

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

            {/* Target Location */}
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-blue-600" />
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Target Location Hierarchy</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Level</label>
                  <select
                    value={targetLevel}
                    onChange={e => setTargetLevel(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="country">All India (National)</option>
                    <option value="state">State Level</option>
                    <option value="district">District / City Level</option>
                    <option value="mandal">Mandal / Local Level</option>
                  </select>
                </div>

                {targetLevel !== 'country' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Target State</label>
                    <select
                      value={selectedState}
                      onChange={e => {
                        setSelectedState(e.target.value);
                        setSelectedDistrict('');
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-white"
                    >
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(targetLevel === 'district' || targetLevel === 'mandal') && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Target District</label>
                    <select
                      value={selectedDistrict}
                      onChange={e => setSelectedDistrict(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="">All Districts in {selectedState}</option>
                      {availableDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Pin Code (Optional)</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    placeholder="e.g. 500034"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
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
