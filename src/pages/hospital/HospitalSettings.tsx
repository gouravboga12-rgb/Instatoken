import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { Building2, Save, Check, MapPin, Info, Layers } from 'lucide-react';

export const HospitalSettings: React.FC = () => {
  const { hospitalProfile, updateHospitalProfile } = useHospital();
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'location' | 'about'>('basic');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states initialized from context
  const [form, setForm] = useState({
    name: hospitalProfile?.name || '',
    logo: hospitalProfile?.logo || '',
    coverImage: hospitalProfile?.coverImage || '',
    registrationNumber: hospitalProfile?.registrationNumber || '',
    accreditation: hospitalProfile?.accreditation || '',
    gstNumber: hospitalProfile?.gstNumber || '',
    licenseNumber: hospitalProfile?.licenseNumber || '',
    type: hospitalProfile?.type || '',
    ownershipType: hospitalProfile?.ownershipType || '',
    phone: hospitalProfile?.phone || '',
    whatsapp: hospitalProfile?.whatsapp || '',
    email: hospitalProfile?.email || '',
    website: hospitalProfile?.website || '',
    emergencyNumber: hospitalProfile?.emergencyNumber || '',
    country: hospitalProfile?.country || '',
    state: hospitalProfile?.state || '',
    city: hospitalProfile?.city || '',
    area: hospitalProfile?.area || '',
    address: hospitalProfile?.address || '',
    pinCode: hospitalProfile?.pinCode || '',
    lat: String(hospitalProfile?.lat || 12.9348),
    lng: String(hospitalProfile?.lng || 77.6189),
    about: hospitalProfile?.about || '',
    mission: hospitalProfile?.mission || '',
    vision: hospitalProfile?.vision || '',
    brandColor: hospitalProfile?.brandColor || '#2563EB'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateHospitalProfile({
      ...form,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng)
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800">Hospital Settings</h2>
        <p className="text-xs text-slate-400 mt-1">Configure profile details, emergency details, geo-coordinates, and credentials</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Tabs Sidebar */}
        <div className="space-y-1">
          {[
            { id: 'basic', label: 'Basic Profile Info', desc: 'Metadata, license and logo', icon: <Building2 size={15} /> },
            { id: 'contact', label: 'Contact Coordinates', desc: 'WhatsApp, web, emergency lines', icon: <Info size={15} /> },
            { id: 'location', label: 'Location Map Pin', desc: 'Complete address & lat/lng', icon: <MapPin size={15} /> },
            { id: 'about', label: 'About Us / Vision', desc: 'Mission, vision, gallery profiles', icon: <Layers size={15} /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id as any); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                activeTab === t.id
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm text-blue-600'
                  : 'border-slate-100 bg-white text-slate-655 hover:border-slate-200'
              }`}
            >
              <div className="shrink-0">{t.icon}</div>
              <div>
                <span className="text-xs font-black block">{t.label}</span>
                <span className="text-[9px] text-slate-450 font-semibold block mt-0.5">{t.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right Form panel */}
        <div className="xl:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* ─── BASIC PROFILE INFO ─────────────────────────────────────── */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Hospital Name</label>
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Registration Number</label>
                    <input type="text" value={form.registrationNumber} onChange={e => setForm({...form, registrationNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">NABH/NABL Accreditation</label>
                    <input type="text" value={form.accreditation} onChange={e => setForm({...form, accreditation: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">GST Number</label>
                    <input type="text" value={form.gstNumber} onChange={e => setForm({...form, gstNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">License Number</label>
                    <input type="text" value={form.licenseNumber} onChange={e => setForm({...form, licenseNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Hospital Type</label>
                    <input type="text" value={form.type} onChange={e => setForm({...form, type: e.target.value})} placeholder="e.g. Multi Speciality" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Ownership Type</label>
                    <input type="text" value={form.ownershipType} onChange={e => setForm({...form, ownershipType: e.target.value})} placeholder="e.g. Private Partnership" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* ─── CONTACT INFORMATION ────────────────────────────────────── */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone Number</label>
                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">WhatsApp Number</label>
                    <input type="text" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Email Address</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Website</label>
                    <input type="text" value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Emergency Helpline Line Number</label>
                    <input type="text" value={form.emergencyNumber} onChange={e => setForm({...form, emergencyNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* ─── LOCATION MAP PIN ───────────────────────────────────────── */}
            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Country</label>
                    <input type="text" value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">State</label>
                    <input type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">City</label>
                    <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Area</label>
                    <input type="text" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Complete Address</label>
                    <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Latitude</label>
                    <input type="text" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Longitude</label>
                    <input type="text" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" required />
                  </div>
                </div>
              </div>
            )}

            {/* ─── ABOUT US / VISION ──────────────────────────────────────── */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">About Us / Hospital Description</label>
                    <textarea value={form.about} onChange={e => setForm({...form, about: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Mission</label>
                    <textarea value={form.mission} onChange={e => setForm({...form, mission: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Vision</label>
                    <textarea value={form.vision} onChange={e => setForm({...form, vision: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Brand Theme Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.brandColor} onChange={e => setForm({...form, brandColor: e.target.value})} className="w-10 h-10 border border-slate-250 rounded-xl cursor-pointer" />
                      <span className="text-xs font-mono font-bold text-slate-700">{form.brandColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/10"
              >
                <Save size={13} />
                Save Settings
              </button>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                  <Check size={14} /> Profile Settings Saved
                </span>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
