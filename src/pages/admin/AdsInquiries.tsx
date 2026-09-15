import React, { useState, useEffect } from 'react';
import { broadcastGlobalSync, onGlobalSync } from '../../utils/syncBus';
import {
  Megaphone,
  CheckCircle2,
  Search,
  MapPin,
  Globe,
  ExternalLink,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Eye,
  RefreshCw,
  ShieldCheck,
  Building2,
  Trash2
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
  village?: string;
  pincode?: string;
  image?: string;
  ctaText: string;
  durationDays: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  bannerId?: string;
  createdAt: string;
}

export const AdsInquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<AdInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectModalInquiry, setRejectModalInquiry] = useState<AdInquiry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch inquiries from server
  const loadInquiries = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ads-inquiries');
      const data = await res.json();
      if (data.success && Array.isArray(data.inquiries)) {
        setInquiries(data.inquiries);
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('insta_ads_inquiries');
        if (saved) {
          setInquiries(JSON.parse(saved));
        }
      }
    } catch (e) {
      const saved = localStorage.getItem('insta_ads_inquiries');
      if (saved) {
        try { setInquiries(JSON.parse(saved)); } catch (err) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();

    // Listen to real-time events across admin, hospital panel and customer view
    const unsub = onGlobalSync((event: any) => {
      if (
        event?.type === 'ADS_INQUIRY_CREATED' ||
        event?.type === 'ADS_INQUIRY_DELETED' ||
        event?.type === 'BANNER_DELETED' ||
        event?.type === 'BANNERS_UPDATED'
      ) {
        if (event?.type === 'BANNER_DELETED' && event?.data?.id) {
          try {
            const saved = localStorage.getItem('insta_ads_inquiries');
            if (saved) {
              const list = JSON.parse(saved);
              const updated = list.filter((i: any) => i.bannerId !== event.data.id);
              localStorage.setItem('insta_ads_inquiries', JSON.stringify(updated));
            }
          } catch (e) {}
        }
        loadInquiries();
      }
    });
    return unsub;
  }, []);

  // One-click Approve & Publish Banner
  const handleApprove = async (inq: AdInquiry) => {
    if (!window.confirm(`Approve ad inquiry for "${inq.title}" from ${inq.hospitalName}? This will instantly publish this banner live for customers in ${inq.district || inq.state || 'India'}.`)) {
      return;
    }

    setApprovingId(inq.id);
    try {
      const res = await fetch(`/api/ads-inquiries/${encodeURIComponent(inq.id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiry: inq })
      });
      const data = await res.json();

      if (data.success && data.banner) {
        const approvedBanner = data.banner;

        // Broadcast banners updated so customer home & admin location banners receive it immediately
        broadcastGlobalSync('BANNERS_UPDATED', approvedBanner);

        // Update local state
        setInquiries(prev => prev.map(i => (i.id === inq.id || (i.title === inq.title && i.hospitalName === inq.hospitalName)) ? { ...i, status: 'approved', bannerId: approvedBanner.id } : i));

        // Update localStorage
        try {
          const saved = localStorage.getItem('insta_ads_inquiries');
          if (saved) {
            const list = JSON.parse(saved);
            const updated = list.map((i: any) => (i.id === inq.id || (i.title === inq.title && i.hospitalName === inq.hospitalName)) ? { ...i, status: 'approved', bannerId: approvedBanner.id } : i);
            localStorage.setItem('insta_ads_inquiries', JSON.stringify(updated));
          }
        } catch (e) {}

        alert(`Banner approved and published live! Banner ID: ${approvedBanner.id}`);
      } else {
        // Fallback: create banner directly via /api/banners if route returned not found
        console.warn('Approve route returned unexpected response, attempting direct banner creation fallback...', data);
        const todayStr = new Date().toISOString().split('T')[0];
        const durationDays = Number(inq.durationDays) || 30;
        const endDateStr = new Date(Date.now() + (durationDays * 86400000)).toISOString().split('T')[0];
        const bannerPayload = {
          title: inq.title.trim(),
          subtitle: inq.description || `${inq.hospitalName} Special Announcement`,
          description: inq.description || '',
          image: inq.imageUrl || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80',
          imageUrl: inq.imageUrl || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80',
          mediaType: 'image',
          badge: 'HOSPITAL PROMOTION',
          linkUrl: inq.link || (inq.hospitalId ? `/hospitals/${inq.hospitalId}` : '/search'),
          link: inq.link || (inq.hospitalId ? `/hospitals/${inq.hospitalId}` : '/search'),
          ctaText: inq.ctaText || 'Book Token',
          hospitalId: inq.hospitalId || null,
          destinationType: inq.hospitalId ? 'hospital' : 'custom',
          status: 'active',
          active: true,
          startDate: todayStr,
          endDate: endDateStr,
          targetLevel: inq.targetLevel || 'state',
          country: 'India',
          state: inq.state || null,
          district: inq.district || null,
          mandal: inq.mandal || null,
          village: inq.village || null,
          displayPanels: ['customer', 'hospital'],
          priority: 15,
          hospitalName: inq.hospitalName
        };

        const bRes = await fetch('/api/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bannerPayload)
        });
        const bData = await bRes.json();
        const fallbackBanner = bData.banner || { ...bannerPayload, id: bData.id || `ban-${Date.now()}` };

        try {
          await fetch(`/api/ads-inquiries/${encodeURIComponent(inq.id)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
          });
        } catch (e) {}

        broadcastGlobalSync('BANNERS_UPDATED', fallbackBanner);

        setInquiries(prev => prev.map(i => (i.id === inq.id || (i.title === inq.title && i.hospitalName === inq.hospitalName)) ? { ...i, status: 'approved', bannerId: fallbackBanner.id } : i));

        try {
          const saved = localStorage.getItem('insta_ads_inquiries');
          if (saved) {
            const list = JSON.parse(saved);
            const updated = list.map((i: any) => (i.id === inq.id || (i.title === inq.title && i.hospitalName === inq.hospitalName)) ? { ...i, status: 'approved', bannerId: fallbackBanner.id } : i);
            localStorage.setItem('insta_ads_inquiries', JSON.stringify(updated));
          }
        } catch (e) {}

        alert(`Banner approved and published live! Banner ID: ${fallbackBanner.id}`);
      }
    } catch (err) {
      console.error('Error approving banner:', err);
      alert('Error communicating with server.');
    } finally {
      setApprovingId(null);
    }
  };

  // Reject Inquiry
  const handleConfirmReject = async () => {
    if (!rejectModalInquiry) return;
    try {
      await fetch(`/api/ads-inquiries/${rejectModalInquiry.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', adminNotes: rejectReason.trim() })
      });

      setInquiries(prev => prev.map(i => i.id === rejectModalInquiry.id ? { ...i, status: 'rejected', adminNotes: rejectReason.trim() } : i));

      try {
        const saved = localStorage.getItem('insta_ads_inquiries');
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.map((i: any) => i.id === rejectModalInquiry.id ? { ...i, status: 'rejected', adminNotes: rejectReason.trim() } : i);
          localStorage.setItem('insta_ads_inquiries', JSON.stringify(updated));
        }
      } catch (e) {}

      setRejectModalInquiry(null);
      setRejectReason('');
    } catch (e) {
      alert('Failed to reject inquiry.');
    }
  };

  // Delete Inquiry (permanently clears inquiry, linked banner, and notifies hospital panel)
  const handleDeleteInquiry = async (inq: AdInquiry) => {
    const confirmMsg = inq.status === 'approved'
      ? `Delete ad inquiry "${inq.title}" from ${inq.hospitalName}?\n\nThis will remove the inquiry, remove the banner from live customer display, and clear it from the hospital panel.`
      : `Delete ad inquiry "${inq.title}" from ${inq.hospitalName}? This will permanently remove it from both admin and hospital panels.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingId(inq.id);
    try {
      const res = await fetch(`/api/ads-inquiries/${encodeURIComponent(inq.id)}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({ success: res.ok }));

      // Update local state
      setInquiries(prev => prev.filter(i => i.id !== inq.id && !(i.title === inq.title && i.hospitalName === inq.hospitalName)));

      // Update localStorage fallback
      try {
        const saved = localStorage.getItem('insta_ads_inquiries');
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.filter((i: any) => i.id !== inq.id && !(i.title === inq.title && i.hospitalName === inq.hospitalName));
          localStorage.setItem('insta_ads_inquiries', JSON.stringify(updated));
        }
      } catch (e) {}

      // Broadcast sync events to notify Location Banners, Hospital Panel & Customer Home
      broadcastGlobalSync('ADS_INQUIRY_DELETED', {
        id: inq.id,
        bannerId: inq.bannerId || data?.deletedBannerId,
        hospitalId: inq.hospitalId,
        title: inq.title
      });

      if (inq.bannerId || data?.deletedBannerId) {
        broadcastGlobalSync('BANNER_DELETED', { id: inq.bannerId || data?.deletedBannerId });
      }
    } catch (err) {
      console.error('Error deleting ad inquiry:', err);
      alert('Failed to delete inquiry. Please check network connection.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered inquiries
  const filtered = inquiries.filter(i => {
    const matchesSearch =
      i.hospitalName?.toLowerCase().includes(search.toLowerCase()) ||
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
      i.state?.toLowerCase().includes(search.toLowerCase()) ||
      i.district?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = inquiries.filter(i => i.status === 'pending').length;
  const approvedCount = inquiries.filter(i => i.status === 'approved').length;
  const rejectedCount = inquiries.filter(i => i.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Megaphone size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Ads Inquiries</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review banner advertising inquiries from hospitals and publish directly into live regional banners
          </p>
        </div>

        <button
          onClick={loadInquiries}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : ''} /> Refresh
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Inquiries', count: inquiries.length, sub: 'All Campaigns', color: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Review', count: pendingCount, sub: 'Needs Action', color: 'text-amber-600 bg-amber-50' },
          { label: 'Approved & Live', count: approvedCount, sub: 'Published Banners', color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rejected', count: rejectedCount, sub: 'Declined Inquiries', color: 'text-rose-600 bg-rose-50' }
        ].map(m => (
          <div key={m.label} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{m.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{m.count}</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${m.color}`}>{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hospital, campaign title, state or district..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border-none capitalize ${
                statusFilter === tab
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Loading hospital ad inquiries...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-6 shadow-xs">
          <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">No ad inquiries found</p>
          <p className="text-xs text-slate-400 mt-1">
            {search || statusFilter !== 'all' ? 'Try adjusting your search or status filter.' : 'Hospital promotion requests will appear here when submitted from the hospital panel.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map(inq => (
            <div
              key={inq.id}
              className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-3xl p-5 shadow-xs space-y-4 transition-all"
            >
              {/* Card Top Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
                    <Building2 size={11} /> {inq.hospitalName}
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mt-0.5 leading-snug">
                    {inq.title}
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 capitalize ${
                    inq.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : inq.status === 'rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {inq.status === 'approved' ? 'Approved & Live' : inq.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                </span>
              </div>

              {/* Banner Image Preview */}
              {inq.imageUrl && (
                <div
                  onClick={() => setPreviewImage(inq.imageUrl)}
                  className="relative rounded-2xl overflow-hidden border border-slate-100 group cursor-pointer bg-slate-900"
                >
                  <img
                    src={inq.imageUrl}
                    alt={inq.title}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                    <Eye size={16} /> Click to Expand
                  </div>
                  <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[9px] font-bold text-white">
                    CTA: {inq.ctaText || 'Book Token'}
                  </div>
                </div>
              )}

              {/* Description */}
              {inq.description && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {inq.description}
                </p>
              )}

              {/* Location & Campaign Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-500 shrink-0" />
                  <span className="truncate">
                    Level: <strong className="text-slate-700 capitalize">{inq.targetLevel}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe size={12} className="text-indigo-500 shrink-0" />
                  <span className="truncate">
                    Geo: <strong className="text-slate-700">{inq.district || inq.state || 'All India'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-amber-500 shrink-0" />
                  <span>Duration: <strong className="text-slate-700">{inq.durationDays} Days</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ExternalLink size={12} className="text-emerald-500 shrink-0" />
                  <a
                    href={inq.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline truncate font-semibold"
                  >
                    Target Link
                  </a>
                </div>
              </div>

              {/* Hospital Contact Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                <div>
                  <span className="text-slate-400">Contact:</span> <strong className="text-slate-700">{inq.contactPerson}</strong>
                </div>
                <div className="flex items-center gap-2">
                  {inq.contactPhone && (
                    <a
                      href={`tel:${inq.contactPhone}`}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1 no-underline text-[10px] font-bold"
                      title="Call Contact"
                    >
                      <Phone size={11} /> {inq.contactPhone}
                    </a>
                  )}
                  {inq.contactEmail && (
                    <a
                      href={`mailto:${inq.contactEmail}?subject=Regarding%20InstaToken%20Banner%20Ad`}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1 no-underline text-[10px]"
                      title="Email Contact"
                    >
                      <Mail size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Actions Row */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(inq.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  {inq.status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(inq)}
                      disabled={approvingId === inq.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer border-none shadow-xs"
                    >
                      <CheckCircle2 size={13} />
                      {approvingId === inq.id ? 'Publishing...' : 'Approve & Create Banner'}
                    </button>
                  )}

                  {inq.status === 'approved' && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <ShieldCheck size={13} /> Live on Homepage
                    </span>
                  )}

                  {inq.status === 'pending' && (
                    <button
                      onClick={() => {
                        setRejectModalInquiry(inq);
                        setRejectReason('');
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  )}

                  {/* Delete Inquiry Button */}
                  <button
                    onClick={() => handleDeleteInquiry(inq)}
                    disabled={deletingId === inq.id}
                    title="Delete inquiry and remove banner"
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-transparent hover:border-rose-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                  >
                    <Trash2 size={14} className={deletingId === inq.id ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h4 className="text-sm font-black text-slate-800">
              Reject Ad Inquiry for {rejectModalInquiry.hospitalName}
            </h4>
            <p className="text-xs text-slate-500">
              Provide a reason so the hospital administrator understands why the request was declined.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Creative resolution does not meet requirements, please re-upload."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalInquiry(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer border-none shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-4xl w-full">
            <img
              src={previewImage}
              alt="Banner Preview"
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
