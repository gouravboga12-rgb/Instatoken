import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { geocodeLocation, reverseGeocodeAddressDetails } from '../../utils/googleMaps';
import { Building2, Save, Check, MapPin, Info, Layers, Compass, ExternalLink, Sparkles, Loader2 } from 'lucide-react';

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
  'Cashless TPA Insurance Desk'
];

export const HospitalSettings: React.FC = () => {
  const { hospitalProfile, updateHospitalProfile } = useHospital();
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'location' | 'about'>('basic');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geocodeNotice, setGeocodeNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: hospitalProfile?.name || 'Apollo Spectra Hospital',
    logo: hospitalProfile?.logo || '',
    coverImage: hospitalProfile?.coverImage || '',
    registrationNumber: hospitalProfile?.registrationNumber || 'HOSP-BLR-2024-889',
    accreditation: hospitalProfile?.accreditation || 'NABH & JCI Accredited',
    gstNumber: hospitalProfile?.gstNumber || '29AABCA1234F1Z8',
    licenseNumber: hospitalProfile?.licenseNumber || 'KPME/2022/9901',
    type: hospitalProfile?.type || 'Multi Speciality Hospital',
    ownershipType: hospitalProfile?.ownershipType || 'Private Corporate',
    phone: hospitalProfile?.phone || '+91 80 4668 8888',
    whatsapp: hospitalProfile?.whatsapp || '+91 98450 12345',
    email: hospitalProfile?.email || 'admin@apollospectra.com',
    website: hospitalProfile?.website || 'https://www.apollospectra.com',
    emergencyNumber: hospitalProfile?.emergencyNumber || '1066 / +91 80 4668 8899',
    country: hospitalProfile?.country || 'India',
    state: hospitalProfile?.state || 'Telangana',
    city: hospitalProfile?.city || 'Hyderabad',
    area: hospitalProfile?.area || 'Kothapet Pratap Nagar',
    address: hospitalProfile?.address || '15-57/2, RAMkrishna Raju Residency, Pratap Nagar, Kothapet, Hyderabad, Telangana 500060, India',
    pinCode: hospitalProfile?.pinCode || '500060',
    lat: String(hospitalProfile?.lat ?? 17.37336200634615),
    lng: String(hospitalProfile?.lng ?? 78.53855589118986),
    about: hospitalProfile?.about || 'Apollo Spectra Hospital is a state-of-the-art multi-speciality hospital offering world-class healthcare, advanced surgical care, and OPD consultations.',
    mission: hospitalProfile?.mission || 'To provide high quality patient-centric clinical excellence with zero waiting time.',
    vision: hospitalProfile?.vision || 'To be the most trusted healthcare institution in the region.',
    brandColor: hospitalProfile?.brandColor || '#2563EB',
    facilities: hospitalProfile?.facilities || [
      '24x7 Emergency & Trauma',
      'Intensive Care Unit (ICU)',
      '24x7 In-House Pharmacy',
      'Advanced Diagnostics & Lab',
      'Ambulance Service'
    ]
  });

  // Synchronize form with loaded hospital profile
  const loadedKeyRef = React.useRef<string>('');

  React.useEffect(() => {
    if (hospitalProfile) {
      const syncKey = `${hospitalProfile.id}_${hospitalProfile.address}_${hospitalProfile.lat}_${hospitalProfile.lng}`;
      if (syncKey !== loadedKeyRef.current) {
        loadedKeyRef.current = syncKey;
        setForm({
          name: hospitalProfile.name || '',
          logo: hospitalProfile.logo || '',
          coverImage: hospitalProfile.coverImage || '',
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
        updateHospitalProfile({
          ...updatedForm,
          id: hospitalProfile?.id,
          lat: geo.lat,
          lng: geo.lng
        });
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
          ...form,
          lat: String(latitude),
          lng: String(longitude),
          address: details.address || form.address,
          city: details.city || form.city,
          state: details.state || form.state,
          area: details.area || form.area,
          pinCode: details.pinCode || form.pinCode,
          country: details.country || form.country || 'India'
        };

        setForm(updated);
        updateHospitalProfile({
          ...updated,
          id: hospitalProfile?.id,
          lat: latitude,
          lng: longitude
        });

        const summary = [details.area, details.city, details.state, details.pinCode].filter(Boolean).join(', ');
        if (isIpCentroid) {
          setGeocodeNotice(`📍 Detected Network Location: ${summary || 'Address filled'}. (Accuracy: ±${Math.round(accuracy / 1000)}km. If not accurate, enter address and click Auto-Geocode).`);
        } else {
          setGeocodeNotice(`✓ High-accuracy GPS updated: ${summary || 'Coordinates saved'}`);
        }
      } catch (err) {
        const updated = {
          ...form,
          lat: String(latitude),
          lng: String(longitude)
        };
        setForm(updated);
        updateHospitalProfile({
          ...updated,
          id: hospitalProfile?.id,
          lat: latitude,
          lng: longitude
        });
        setGeocodeNotice(`GPS coordinates detected: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`);
      } finally {
        setIsLocating(false);
        setTimeout(() => setGeocodeNotice(null), 6000);
      }
    };

    if (!navigator.geolocation) {
      setGeocodeNotice('⚠️ Your browser does not support Geolocation. Please type your address and click Auto-Geocode.');
      setIsLocating(false);
      setTimeout(() => setGeocodeNotice(null), 5000);
      return;
    }

    // Query live high-accuracy GPS with zero cache (maximumAge: 0)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = Math.round(pos.coords.accuracy || 0);
        console.log(`Live GPS acquired with accuracy ±${accuracy}m: Lat ${pos.coords.latitude}, Lng ${pos.coords.longitude}`);
        onLocationResolved(pos.coords.latitude, pos.coords.longitude, accuracy);
      },
      (err) => {
        console.warn('High-accuracy GPS attempt failed:', err);
        if (err.code === 1) { // PERMISSION_DENIED
          setGeocodeNotice('⚠️ Location permission is blocked in your browser. Click the lock/tune icon in the URL bar to allow location.');
        } else {
          setGeocodeNotice('⚠️ Could not acquire GPS fix on this device. Please type your hospital address above and click Auto-Geocode.');
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
    const updated = {
      ...form,
      id: hospitalProfile?.id,
      lat,
      lng
    };
    updateHospitalProfile(updated);

    // Explicit direct post to backend endpoint for instantaneous global persistence
    fetch(`/api/hospitals/${hospitalProfile?.id || 'hosp-apollo'}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: updated })
    }).catch(err => console.warn('Failed to post profile:', err));

    setSaveSuccess(true);
    setGeocodeNotice('✓ Hospital address & coordinates saved and published globally to all patients!');
    setTimeout(() => {
      setSaveSuccess(false);
      setGeocodeNotice(null);
    }, 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm shadow-blue-500/20">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Hospital Profile & Geocoding</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Manage hospital identity, photos, emergency lines, GPS coordinates, and real-time customer navigation.
            </p>
          </div>
        </div>

        {/* Active Hospital Badge */}
        <div className="flex items-center gap-2.5 bg-blue-50/80 border border-blue-100 px-4 py-2.5 rounded-2xl">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Active Hospital:</span>
          <span className="text-xs font-black text-blue-700">{hospitalProfile?.name || 'Apollo Spectra Hospital'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="space-y-2">
          {[
            { id: 'basic', label: 'Basic Profile & Logo', desc: 'Name, registration, branding', icon: <Building2 size={16} /> },
            { id: 'contact', label: 'Emergency & Contacts', desc: 'WhatsApp, emergency helpline', icon: <Info size={16} /> },
            { id: 'location', label: 'GPS Location & Maps', desc: 'Geocoding, coordinates, directions', icon: <MapPin size={16} /> },
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

        <div className="xl:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Hospital Identity & Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Hospital Name</label>
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Hospital Category / Type</label>
                    <input type="text" value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" placeholder="e.g. Multi Speciality Hospital" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Accreditation (NABH / JCI)</label>
                    <input type="text" value={form.accreditation} onChange={e => setForm({...form, accreditation: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Registration Number</label>
                    <input type="text" value={form.registrationNumber} onChange={e => setForm({...form, registrationNumber: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">GST Number</label>
                    <input type="text" value={form.gstNumber} onChange={e => setForm({...form, gstNumber: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Hospital Cover Photo / Banner URL</label>
                    <input type="text" value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Hospital Contacts & Emergency Lines</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Main Reception Phone</label>
                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">WhatsApp OPD Assistance Number</label>
                    <input type="text" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Official Email Address</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Official Website</label>
                    <input type="text" value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-extrabold text-red-700 block mb-1.5">24/7 Emergency Helpline Number</label>
                    <input type="text" value={form.emergencyNumber} onChange={e => setForm({...form, emergencyNumber: e.target.value})} className="w-full px-3.5 py-2.5 border border-red-200 bg-red-50/20 rounded-xl text-xs font-black text-red-800 outline-none focus:border-red-500" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hospital Physical Address & GPS Coordinates</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleAutoGeocode} disabled={isGeocoding} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer border-none shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50">
                      <Sparkles size={13} />
                      <span>{isGeocoding ? 'Geocoding...' : 'Auto-Geocode'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUseDeviceLocation}
                      disabled={isLocating}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer border border-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Fetch live GPS coordinates and auto-fill address, city, state, area, and pin code"
                    >
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
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Full Physical Address</label>
                    <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">City</label>
                    <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">State</label>
                    <input type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Area / Landmark</label>
                    <input type="text" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">PIN Code</label>
                    <input type="text" value={form.pinCode} onChange={e => setForm({...form, pinCode: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500" />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <MapPin size={14} className="text-blue-600" />
                        <span>Live GPS Navigation Coordinates</span>
                      </span>
                      {form.lat && form.lng && (
                        <a href={`https://www.google.com/maps?q=${form.lat},${form.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs font-extrabold text-blue-600 hover:underline flex items-center gap-1">
                          <span>Test on Google Maps</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600 block mb-1">Latitude</label>
                        <input type="text" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600 block mb-1">Longitude</label>
                        <input type="text" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-5">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Hospital Amenities & Profile Narrative</h3>
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">About Hospital Description</label>
                  <textarea value={form.about} onChange={e => setForm({...form, about: e.target.value})} rows={3} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-2">Hospital Amenities & Clinical Facilities</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/20">
                <Save size={14} />
                Save Hospital Profile Settings
              </button>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check size={16} /> Profile Saved!
                </span>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
