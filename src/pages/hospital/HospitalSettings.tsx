import React, { useState, useRef } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { geocodeLocation, reverseGeocodeAddressDetails } from '../../utils/googleMaps';
import {
  Building2, Save, Check, MapPin, Layers, Compass,
  ExternalLink, Sparkles, Loader2, Upload, ImageIcon, Phone,
  AlertCircle, Video, Trash2, Plus, Film, Star
} from 'lucide-react';

const COMMON_FACILITIES = [
  '24x7 Emergency & Trauma',
  'Intensive Care Unit (ICU)',
  '24x7 In-House Pharmacy',
  'Advanced Diagnostics & Lab',
  'Ambulance Service',
  'Wheelchair Accessible',
  'Cafeteria / Canteen',
  'Blood Bank',
  'Operation Theatres',
  'Cashless TPA Insurance Desk',
  'NICU / Paediatric ICU',
  'Physiotherapy & Rehabilitation',
];

export const HospitalSettings: React.FC = () => {
  const { hospitalProfile, updateHospitalProfile, authToken } = useHospital();
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'location' | 'about'>('basic');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geocodeNotice, setGeocodeNotice] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [customMediaUrl, setCustomMediaUrl] = useState('');
  const [customMediaType, setCustomMediaType] = useState<'image' | 'video'>('image');
  const [customMediaCaption, setCustomMediaCaption] = useState('');

  const isApollo = hospitalProfile?.id === 'hosp-apollo';

  const [form, setForm] = useState({
    name: hospitalProfile?.name || (isApollo ? 'City Care Multi-Specialty Hospital' : ''),
    logo: hospitalProfile?.logo || '',
    coverImage: hospitalProfile?.coverImage || '',
    gallery: (hospitalProfile?.gallery as any[]) || [],
    registrationNumber: hospitalProfile?.registrationNumber || (isApollo ? 'HOSP-BLR-2024-889' : ''),
    accreditation: hospitalProfile?.accreditation || (isApollo ? 'NABH & JCI Accredited' : ''),
    gstNumber: hospitalProfile?.gstNumber || (isApollo ? '29AABCA1234F1Z8' : ''),
    licenseNumber: hospitalProfile?.licenseNumber || (isApollo ? 'KPME/2022/9901' : ''),
    type: hospitalProfile?.type || 'Multi Speciality Hospital',
    ownershipType: hospitalProfile?.ownershipType || 'Private Corporate',
    phone: hospitalProfile?.phone || (isApollo ? '+91 80 4668 8888' : ''),
    whatsapp: hospitalProfile?.whatsapp || '',
    email: hospitalProfile?.email || (isApollo ? 'admin@instatoken.in' : ''),
    website: hospitalProfile?.website || '',
    emergencyNumber: hospitalProfile?.emergencyNumber || '',
    country: hospitalProfile?.country || 'India',
    state: hospitalProfile?.state || '',
    city: hospitalProfile?.city || '',
    area: hospitalProfile?.area || '',
    address: hospitalProfile?.address || '',
    pinCode: hospitalProfile?.pinCode || '',
    lat: String(hospitalProfile?.lat ?? 17.37336200634615),
    lng: String(hospitalProfile?.lng ?? 78.53855589118986),
    about: hospitalProfile?.about || '',
    mission: hospitalProfile?.mission || '',
    vision: hospitalProfile?.vision || '',
    brandColor: hospitalProfile?.brandColor || '#2563EB',
    facilities: hospitalProfile?.facilities || []
  });

  // Synchronize form with loaded hospital profile
  const loadedKeyRef = React.useRef<string>('');
  React.useEffect(() => {
    if (hospitalProfile) {
      const syncKey = `${hospitalProfile.id}`;
      if (loadedKeyRef.current !== syncKey) {
        loadedKeyRef.current = syncKey;
        setForm({
          name: hospitalProfile.name || '',
          logo: hospitalProfile.logo || '',
          coverImage: hospitalProfile.coverImage || '',
          gallery: hospitalProfile.gallery || [],
          registrationNumber: hospitalProfile.registrationNumber || '',
          accreditation: hospitalProfile.accreditation || '',
          gstNumber: hospitalProfile.gstNumber || '',
          licenseNumber: hospitalProfile.licenseNumber || '',
          type: hospitalProfile.type || 'Multi Speciality Hospital',
          ownershipType: hospitalProfile.ownershipType || 'Private Corporate',
          phone: hospitalProfile.phone || '',
          whatsapp: hospitalProfile.whatsapp || '',
          email: hospitalProfile.email || '',
          website: hospitalProfile.website || '',
          emergencyNumber: hospitalProfile.emergencyNumber || '',
          country: hospitalProfile.country || 'India',
          state: hospitalProfile.state || '',
          city: hospitalProfile.city || '',
          area: hospitalProfile.area || '',
          address: hospitalProfile.address || '',
          pinCode: hospitalProfile.pinCode || '',
          lat: String(hospitalProfile.lat ?? 17.37336200634615),
          lng: String(hospitalProfile.lng ?? 78.53855589118986),
          about: hospitalProfile.about || '',
          mission: hospitalProfile.mission || '',
          vision: hospitalProfile.vision || '',
          brandColor: hospitalProfile.brandColor || '#2563EB',
          facilities: hospitalProfile.facilities || []
        });
      }
    }
  }, [hospitalProfile]);

  const handleFacilityToggle = (fac: string) => {
    setForm(prev => {
      const exists = prev.facilities.includes(fac);
      const updated = exists ? prev.facilities.filter(f => f !== fac) : [...prev.facilities, fac];
      return { ...prev, facilities: updated };
    });
  };

  // Upload photo to S3 via backend, fallback to base64
  const handlePhotoUpload = async (file: File, field: 'coverImage' | 'logo') => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'hospital-photos');
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          setForm(prev => ({ ...prev, [field]: data.url }));
          setUploadingPhoto(false);
          return;
        }
      }
      // Base64 fallback
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string;
        setForm(prev => ({ ...prev, [field]: b64 }));
        setUploadingPhoto(false);
      };
      reader.onerror = () => setUploadingPhoto(false);
      reader.readAsDataURL(file);
    } catch (e) {
      console.warn('S3 upload failed, using base64 fallback:', e);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string;
        setForm(prev => ({ ...prev, [field]: b64 }));
        setUploadingPhoto(false);
      };
      reader.onerror = () => setUploadingPhoto(false);
      reader.readAsDataURL(file);
    }
  };

  // Upload multiple images & videos for hospital facility gallery
  const handleGalleryFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    const newItems: any[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder', 'hospital-gallery');
          const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.url) {
              newItems.push({
                id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: isVideo ? 'video' : 'image',
                url: data.url,
                caption: file.name.replace(/\.[^/.]+$/, '')
              });
              continue;
            }
          }
        } catch (e) {
          console.warn('Gallery upload failed for', file.name, e);
        }
      }
      if (newItems.length > 0) {
        setForm(prev => {
          const updatedGallery = [...(prev.gallery || []), ...newItems];
          return {
            ...prev,
            gallery: updatedGallery,
            coverImage: prev.coverImage || updatedGallery.find(m => m.type === 'image')?.url || ''
          };
        });
      }
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleAddMediaUrl = () => {
    if (!customMediaUrl.trim()) return;
    const newItem = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: customMediaType,
      url: customMediaUrl.trim(),
      caption: customMediaCaption.trim() || (customMediaType === 'video' ? 'Facility Video Tour' : 'Campus Photo')
    };
    setForm(prev => ({
      ...prev,
      gallery: [...(prev.gallery || []), newItem],
      coverImage: prev.coverImage || (newItem.type === 'image' ? newItem.url : prev.coverImage)
    }));
    setCustomMediaUrl('');
    setCustomMediaCaption('');
  };

  const handleRemoveMedia = (id: string) => {
    setForm(prev => ({
      ...prev,
      gallery: (prev.gallery || []).filter(m => m.id !== id)
    }));
  };

  const handleSetAsCover = (url: string) => {
    setForm(prev => ({ ...prev, coverImage: url }));
  };

  const handleAutoGeocode = async () => {
    if (!form.address.trim()) {
      setGeocodeNotice('Please enter the hospital address first.');
      return;
    }
    setIsGeocoding(true);
    setGeocodeNotice('Looking up precise GPS coordinates & address details...');
    try {
      const geo = await geocodeLocation(`${form.address}, ${form.city}, ${form.state}`);
      if (geo && geo.lat && geo.lng) {
        const updatedForm = {
          ...form,
          lat: String(geo.lat),
          lng: String(geo.lng),
          city: geo.city || form.city,
          state: geo.state || form.state,
          area: geo.area || form.area,
          pinCode: geo.pinCode || form.pinCode,
          country: geo.country || form.country
        };
        setForm(updatedForm);
        updateHospitalProfile({ ...updatedForm, id: hospitalProfile?.id, lat: geo.lat, lng: geo.lng });
        setGeocodeNotice(`✓ Coordinates found: Lat ${geo.lat.toFixed(4)}, Lng ${geo.lng.toFixed(4)}`);
      } else {
        setGeocodeNotice('Could not find exact coordinates. Using default city center.');
      }
    } catch (e) {
      setGeocodeNotice('Geocoding service unavailable. You can enter Lat/Lng manually.');
    } finally {
      setIsGeocoding(false);
      setTimeout(() => setGeocodeNotice(null), 4000);
    }
  };

  const handleUseDeviceLocation = () => {
    setIsLocating(true);
    setGeocodeNotice('Requesting high-accuracy GPS from device...');

    const onLocationResolved = async (latitude: number, longitude: number, accuracy: number) => {
      const isIpCentroid = accuracy > 4000;
      setGeocodeNotice(
        isIpCentroid
          ? `📍 Network location acquired (±${Math.round(accuracy / 1000)}km). Geocoding address...`
          : `✓ Live GPS acquired (±${accuracy}m). Geocoding address...`
      );

      try {
        const details = await reverseGeocodeAddressDetails(latitude, longitude);
        const updated = {
          ...form, lat: String(latitude), lng: String(longitude),
          address: details.address || form.address,
          city: details.city || form.city,
          state: details.state || form.state,
          area: details.area || form.area,
          pinCode: details.pinCode || form.pinCode,
          country: details.country || form.country || 'India'
        };
        setForm(updated);
        updateHospitalProfile({ ...updated, id: hospitalProfile?.id, lat: latitude, lng: longitude });
        const summary = [details.area, details.city, details.state, details.pinCode].filter(Boolean).join(', ');
        setGeocodeNotice(isIpCentroid
          ? `📍 Detected: ${summary || 'Address filled'} (Accuracy: ±${Math.round(accuracy / 1000)}km)`
          : `✓ GPS updated: ${summary || 'Coordinates saved'}`);
      } catch (err) {
        const updated = { ...form, lat: String(latitude), lng: String(longitude) };
        setForm(updated);
        updateHospitalProfile({ ...updated, id: hospitalProfile?.id, lat: latitude, lng: longitude });
        setGeocodeNotice(`GPS: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`);
      } finally {
        setIsLocating(false);
        setTimeout(() => setGeocodeNotice(null), 6000);
      }
    };

    if (!navigator.geolocation) {
      setGeocodeNotice('⚠️ Browser does not support Geolocation. Enter address and click Auto-Geocode.');
      setIsLocating(false);
      setTimeout(() => setGeocodeNotice(null), 5000);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => onLocationResolved(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy || 0)),
      (err) => {
        if (err.code === 1) {
          setGeocodeNotice('⚠️ Location permission blocked. Click the lock icon in the URL bar to allow location.');
        } else {
          setGeocodeNotice('⚠️ Could not get GPS fix. Enter address above and click Auto-Geocode.');
        }
        setIsLocating(false);
        setTimeout(() => setGeocodeNotice(null), 6000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please provide a Hospital Name.');
      return;
    }
    const lat = parseFloat(form.lat) || 12.9348;
    const lng = parseFloat(form.lng) || 77.6189;
    const updated = { ...form, id: hospitalProfile?.id, lat, lng };
    // updateHospitalProfile calls updateHospital in AppContext → propagates globally
    updateHospitalProfile(updated);

    // Explicit direct post to backend with auth for instantaneous global persistence
    const targetHId = hospitalProfile?.id;
    if (!targetHId) return;
    fetch(`/api/hospitals/${targetHId}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ profile: updated })
    }).catch(err => console.warn('Failed to post profile:', err));

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalProfiles: { [targetHId]: updated }
      })
    }).catch(() => {});

    setSaveSuccess(true);
    setGeocodeNotice('✓ Hospital profile saved and published globally to all patients!');
    setTimeout(() => { setSaveSuccess(false); setGeocodeNotice(null); }, 4000);
  };

  const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all';
  const labelCls = 'text-xs font-extrabold text-slate-700 block mb-1.5';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm shadow-blue-500/20">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Hospital Settings</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Update profile, contacts, GPS & amenities — changes reflect globally on patient side.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-blue-50/80 border border-blue-100 px-4 py-2.5 rounded-2xl">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Active Hospital:</span>
          <span className="text-xs font-black text-blue-700">{hospitalProfile?.name || 'City Care Multi-Specialty Hospital'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="space-y-2">
          {[
            { id: 'basic', label: 'Basic Profile & Photo', desc: 'Name, photo, registration', icon: <Building2 size={16} /> },
            { id: 'contact', label: 'Contacts & Emergency', desc: 'Phone, WhatsApp, helpline', icon: <Phone size={16} /> },
            { id: 'location', label: 'GPS Location & Maps', desc: 'Address, geocoding, coordinates', icon: <MapPin size={16} /> },
            { id: 'about', label: 'About & Amenities', desc: 'Facilities, mission, description', icon: <Layers size={16} /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id as any); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                activeTab === t.id
                  ? 'border-blue-600 bg-blue-50/60 shadow-xs text-blue-600'
                  : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
              }`}
            >
              <div className="shrink-0">{t.icon}</div>
              <div>
                <span className="text-xs font-black block">{t.label}</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{t.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">

            {/* ─── BASIC PROFILE & PHOTO ─── */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hospital Identity & Main Photo</h3>

                {/* Main Hospital Photo Upload */}
                <div>
                  <label className={labelCls}>Hospital Main Photo <span className="text-blue-600">(shown on patient search & booking pages)</span></label>
                  <div className="flex gap-4 items-start">
                    {/* Preview */}
                    <div className="w-32 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 relative">
                      {form.coverImage ? (
                        <img src={form.coverImage} alt="Hospital" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <ImageIcon size={24} />
                          <span className="text-[10px] font-bold">No Photo</span>
                        </div>
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <Loader2 size={20} className="animate-spin text-blue-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, 'coverImage');
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl cursor-pointer border-none shadow-xs shadow-blue-500/20 transition-colors disabled:opacity-50"
                      >
                        <Upload size={13} />
                        {uploadingPhoto ? 'Uploading...' : 'Upload Hospital Photo'}
                      </button>
                      <p className="text-[10px] text-slate-400 font-semibold">Recommended: 1200×600px, JPG/PNG/WEBP, max 5MB</p>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 block mb-1">Or paste image URL:</label>
                        <input
                          type="text"
                          value={form.coverImage}
                          onChange={e => setForm({ ...form, coverImage: e.target.value })}
                          className={inputCls}
                          placeholder="https://example.com/hospital-photo.jpg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── MULTI-MEDIA GALLERY (IMAGES & VIDEOS) ── */}
                <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Film size={16} className="text-blue-600" />
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Hospital Multi-Media Gallery (Photos &amp; Videos)
                        </h4>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {(form.gallery || []).length} media items
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Upload facility photos and video tours. These appear as an interactive carousel on your hospital page.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={galleryInputRef}
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={e => {
                          const files = e.target.files;
                          if (files) handleGalleryFilesUpload(files);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={uploadingGallery}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl cursor-pointer border-none shadow-xs disabled:opacity-50 transition-colors"
                      >
                        {uploadingGallery ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        <span>{uploadingGallery ? 'Uploading to S3...' : 'Upload Media Files'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Media via Direct URL */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                    <select
                      value={customMediaType}
                      onChange={e => setCustomMediaType(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                    >
                      <option value="image">🖼️ Photo Image</option>
                      <option value="video">🎬 Video Clip</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Paste Image / Video MP4 URL..."
                      value={customMediaUrl}
                      onChange={e => setCustomMediaUrl(e.target.value)}
                      className="flex-1 min-w-[200px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Caption (e.g. ICU Wing, Reception)"
                      value={customMediaCaption}
                      onChange={e => setCustomMediaCaption(e.target.value)}
                      className="w-48 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMediaUrl}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs cursor-pointer border-none flex items-center gap-1"
                    >
                      <Plus size={12} /> Add to Gallery
                    </button>
                  </div>

                  {/* Gallery Items Grid */}
                  {(form.gallery || []).length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                      {(form.gallery || []).map((item: any, idx: number) => {
                        const isCover = form.coverImage === item.url;
                        return (
                          <div
                            key={item.id || idx}
                            className={`group relative rounded-2xl overflow-hidden border bg-white shadow-2xs transition-all ${
                              isCover ? 'ring-2 ring-blue-600 border-blue-600' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="h-28 w-full relative bg-slate-900 flex items-center justify-center overflow-hidden">
                              {item.type === 'video' ? (
                                <video
                                  src={item.url}
                                  className="w-full h-full object-cover opacity-90"
                                  muted
                                />
                              ) : (
                                <img
                                  src={item.url}
                                  alt={item.caption || 'Facility'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400';
                                  }}
                                />
                              )}

                              {/* Media Type Badge */}
                              <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-black rounded-lg flex items-center gap-1">
                                {item.type === 'video' ? <Video size={9} className="text-amber-400" /> : <ImageIcon size={9} className="text-blue-400" />}
                                <span>{item.type === 'video' ? 'Video' : 'Photo'}</span>
                              </span>

                              {isCover && (
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-lg flex items-center gap-1 shadow-sm">
                                  <Star size={9} className="fill-white" /> Cover
                                </span>
                              )}

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveMedia(item.id)}
                                className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-red-600/90 text-white flex items-center justify-center hover:bg-red-700 cursor-pointer border-none shadow-xs transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            <div className="p-2 space-y-1">
                              <p className="text-[11px] font-bold text-slate-800 truncate" title={item.caption}>
                                {item.caption || 'Facility Media'}
                              </p>
                              {!isCover && item.type === 'image' && (
                                <button
                                  type="button"
                                  onClick={() => handleSetAsCover(item.url)}
                                  className="w-full py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border-none"
                                >
                                  Make Cover Photo
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 space-y-1">
                      <Film size={28} className="mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">No gallery media added yet</p>
                      <p className="text-[10px] text-slate-400">Upload facility photos or video tours above.</p>
                    </div>
                  )}
                </div>

                {/* Hospital Logo Upload */}
                <div>
                  <label className={labelCls}>Hospital Logo</label>
                  <div className="flex gap-4 items-start">
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                      {form.logo ? (
                        <img src={form.logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, 'logo');
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer border-none transition-colors"
                      >
                        <Upload size={12} /> Upload Logo
                      </button>
                      <input
                        type="text"
                        value={form.logo}
                        onChange={e => setForm({ ...form, logo: e.target.value })}
                        className={inputCls}
                        placeholder="Logo URL"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Hospital Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Hospital Category / Type</label>
                    <input type="text" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls} placeholder="e.g. Multi Speciality Hospital" />
                  </div>
                  <div>
                    <label className={labelCls}>Accreditation (NABH / JCI)</label>
                    <input type="text" value={form.accreditation} onChange={e => setForm({ ...form, accreditation: e.target.value })} className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Hospital Full Address <span className="text-slate-400 font-semibold">(displayed on patient portal)</span></label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      className={inputCls}
                      placeholder="Street address, building name, locality"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>City / District</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. Hyderabad, Karimnagar"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={e => setForm({ ...form, state: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. Telangana"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Registration Number</label>
                    <input type="text" value={form.registrationNumber} onChange={e => setForm({ ...form, registrationNumber: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>License Number</label>
                    <input type="text" value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {/* ─── CONTACTS & EMERGENCY ─── */}
            {activeTab === 'contact' && (
              <div className="space-y-5">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hospital Contacts & Emergency Lines</h3>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 font-semibold">These contact numbers are displayed on patient-facing hospital pages and booking confirmation pages.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Main Reception Phone</label>
                    <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+91 80 4668 8888" />
                  </div>
                  <div>
                    <label className={labelCls}>WhatsApp OPD Number</label>
                    <input type="text" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className={inputCls} placeholder="+91 98450 12345" />
                  </div>
                  <div>
                    <label className={labelCls}>Official Email Address</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Official Website</label>
                    <input type="text" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className={inputCls} placeholder="https://www.hospital.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-extrabold text-red-700 block mb-1.5">
                      🚨 24/7 Emergency Helpline Number <span className="text-red-400 font-semibold">(shown prominently on patient pages)</span>
                    </label>
                    <input
                      type="text"
                      value={form.emergencyNumber}
                      onChange={e => setForm({ ...form, emergencyNumber: e.target.value })}
                      className="w-full px-3.5 py-3 border-2 border-red-300 bg-red-50/30 rounded-xl text-sm font-black text-red-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
                      placeholder="e.g. 1066 / +91 80 4668 8899"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── GPS LOCATION & ADDRESS ─── */}
            {activeTab === 'location' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hospital Address & GPS Coordinates</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleAutoGeocode} disabled={isGeocoding} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer border-none shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50">
                      <Sparkles size={13} />
                      <span>{isGeocoding ? 'Geocoding...' : 'Auto-Geocode'}</span>
                    </button>
                    <button type="button" onClick={handleUseDeviceLocation} disabled={isLocating} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer border border-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50" title="Fetch live GPS and auto-fill address">
                      {isLocating ? <Loader2 size={13} className="animate-spin text-blue-600" /> : <Compass size={13} />}
                      <span>{isLocating ? 'Detecting...' : 'Use Device GPS'}</span>
                    </button>
                  </div>
                </div>

                {geocodeNotice && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <MapPin size={14} className="shrink-0" />
                    <span>{geocodeNotice}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Full Physical Address</label>
                    <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Door No., Street, Area, City, State, PIN" />
                  </div>
                  <div>
                    <label className={labelCls}>City</label>
                    <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Area / Landmark</label>
                    <input type="text" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>PIN Code</label>
                    <input type="text" value={form.pinCode} onChange={e => setForm({ ...form, pinCode: e.target.value })} className={inputCls} />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <MapPin size={14} className="text-blue-600" />
                        <span>GPS Coordinates (for directions & map on patient side)</span>
                      </span>
                      {form.lat && form.lng && (
                        <a href={`https://www.google.com/maps?q=${form.lat},${form.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs font-extrabold text-blue-600 hover:underline flex items-center gap-1">
                          <span>Test on Maps</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600 block mb-1">Latitude</label>
                        <input type="text" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600 block mb-1">Longitude</label>
                        <input type="text" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} className={inputCls} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── ABOUT & AMENITIES ─── */}
            {activeTab === 'about' && (
              <div className="space-y-5">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hospital Amenities & Profile Narrative</h3>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-800 font-semibold">These details are shown on the hospital's patient-facing page and search results. Save to update globally.</p>
                </div>
                <div>
                  <label className={labelCls}>About Hospital <span className="text-slate-400 font-semibold">(shown in search results & hospital page)</span></label>
                  <textarea
                    value={form.about}
                    onChange={e => setForm({ ...form, about: e.target.value })}
                    rows={4}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none transition-all"
                    placeholder="Describe the hospital, specialties, and unique services..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Mission Statement</label>
                  <textarea
                    value={form.mission}
                    onChange={e => setForm({ ...form, mission: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none transition-all"
                  />
                </div>
                <div>
                  <label className={labelCls}>Hospital Amenities & Clinical Facilities <span className="text-slate-400 font-semibold">(shown on patient-facing page)</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                    {COMMON_FACILITIES.map(fac => {
                      const isChecked = form.facilities.includes(fac);
                      return (
                        <label key={fac} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all text-xs font-bold ${isChecked ? 'bg-blue-50/70 border-blue-500 text-blue-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                          <input type="checkbox" checked={isChecked} onChange={() => handleFacilityToggle(fac)} className="w-4 h-4 rounded text-blue-600" />
                          <span>{fac}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/20 transition-colors"
              >
                <Save size={14} />
                Save & Publish Globally
              </button>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <Check size={16} /> Profile saved & published to all patients!
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
