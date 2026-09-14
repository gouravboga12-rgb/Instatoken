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
  ShieldCheck
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

    // Listen to real-time submission from hospitals
    const unsub = onGlobalSync((event: any) => {
      if (event?.type === 'ADS_INQUIRY_CREATED') {
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
      const res = await fetch(`/api/ads-inquiries/${inq.id}/approve`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success) {
        // Broadcast banners updated so customer home receives it immediately
        broadcastGlobalSync('BANNERS_UPDATED', data.banner);

        // Update local state
        setInquiries(prev => prev.map(i => i.id === inq.id ? { ...i, status: 'approved', bannerId: data.banner?.id } : i));

        // Update localStorage
        try {
          const saved = localStorage.getItem('insta_ads_inquiries');
          if (saved) {
            const list = JSON.parse(saved);
            const updated = list.map((i: any) => i.id === inq.id ? { ...i, status: 'approved', bannerId: data.banner?.id } : i);
            localStorage.setItem('insta_ads_inquiries', JSON.stringify(updated));
          }
        } catch (e) {}

        alert(`Banner approved and published live! Banner ID: ${data.banner?.id}`);
      } else {
        alert(data.message || 'Failed to approve inquiry.');
      }
    } catch (err) {
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
            <div className="p-2 bg-blue-600/10 text-blue-500 rounded-xl">
              <Megaphone size={20} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Ads Inquiries</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review banner advertising inquiries from hospitals and publish directly into live regional banners
          </p>
        </div>

        <button
          onClick={loadInquiries}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Inquiries', count: inquiries.length, sub: 'All Campaigns', color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Pending Review', count: pendingCount, sub: 'Needs Action', color: 'text-amber-400 bg-amber-500/10' },
          { label: 'Approved & Live', count: approvedCount, sub: 'Published Banners', color: 'text-emerald-400 bg-emerald-500/10' },
          { label: 'Rejected', count: rejectedCount, sub: 'Declined Inquiries', color: 'text-rose-400 bg-rose-500/10' }
        ].map(m => (
          <div key={m.label} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{m.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{m.count}</span>
              <span className="text-[10px] text-slate-400">{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hospital, campaign title, state or district..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex bg-slate-800 rounded-xl p-1 shrink-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border-none capitalize ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs">Loading hospital ad inquiries...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6">
          <AlertCircle size={28} className="mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-400">No ad inquiries found</p>
          <p className="text-xs text-slate-500 mt-1">
            {search || statusFilter !== 'all' ? 'Try adjusting your search or status filter.' : 'Hospital promotion requests will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map(inq => (
            <div
              key={inq.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-sm space-y-4 transition-all"
            >
              {/* Card Top Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                    {inq.hospitalName}
                  </span>
                  <h4 className="text-sm font-black text-white mt-0.5 leading-snug">
                    {inq.title}
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 capitalize ${
                    inq.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : inq.status === 'rejected'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {inq.status === 'approved' ? 'Approved & Live' : inq.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                </span>
              </div>

              {/* Banner Image Preview */}
              {inq.imageUrl && (
                <div
                  onClick={() => setPreviewImage(inq.imageUrl)}
                  className="relative rounded-2xl overflow-hidden border border-slate-800 group cursor-pointer"
                >
                  <img
                    src={inq.imageUrl}
                    alt={inq.title}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                    <Eye size={16} /> Click to Expand
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-bold text-slate-300">
                    CTA: {inq.ctaText || 'Book Token'}
                  </div>
                </div>
              )}

              {/* Description */}
              {inq.description && (
                <p className="text-xs text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-800/80">
                  {inq.description}
                </p>
              )}

              {/* Location & Campaign Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-400 shrink-0" />
                  <span className="truncate">
                    Level: <strong className="text-slate-200 capitalize">{inq.targetLevel}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe size={12} className="text-indigo-400 shrink-0" />
                  <span className="truncate">
                    Geo: <strong className="text-slate-200">{inq.district || inq.state || 'All India'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-amber-400 shrink-0" />
                  <span>Duration: <strong className="text-slate-200">{inq.durationDays} Days</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ExternalLink size={12} className="text-emerald-400 shrink-0" />
                  <a
                    href={inq.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline truncate"
                  >
                    Target Link
                  </a>
                </div>
              </div>

              {/* Hospital Contact Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500">Contact:</span> <strong className="text-slate-300">{inq.contactPerson}</strong>
                </div>
                <div className="flex items-center gap-2">
                  {inq.contactPhone && (
                    <a
                      href={`tel:${inq.contactPhone}`}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 no-underline text-[10px]"
                      title="Call Contact"
                    >
                      <Phone size={11} /> {inq.contactPhone}
                    </a>
                  )}
                  {inq.contactEmail && (
                    <a
                      href={`mailto:${inq.contactEmail}?subject=Regarding%20InstaToken%20Banner%20Ad`}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 no-underline text-[10px]"
                      title="Email Contact"
                    >
                      <Mail size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Actions Row */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(inq.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  {inq.status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(inq)}
                      disabled={approvingId === inq.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer border-none shadow-sm shadow-emerald-600/20"
                    >
                      <CheckCircle2 size={13} />
                      {approvingId === inq.id ? 'Publishing...' : 'Approve & Create Banner'}
                    </button>
                  )}

                  {inq.status === 'approved' && inq.bannerId && (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={13} /> Live on Homepage
                    </span>
                  )}

                  {inq.status === 'pending' && (
                    <button
                      onClick={() => {
                        setRejectModalInquiry(inq);
                        setRejectReason('');
                      }}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalInquiry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h4 className="text-sm font-black text-white">
              Reject Ad Inquiry for {rejectModalInquiry.hospitalName}
            </h4>
            <p className="text-xs text-slate-400">
              Provide a reason so the hospital administrator understands why the request was declined.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Creative resolution does not meet 1200x400 requirements, please re-upload."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalInquiry(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black cursor-pointer border-none shadow-sm"
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
