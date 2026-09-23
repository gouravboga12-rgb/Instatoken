import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import type { MedicalRecord } from '../../utils/mockData';
import { 
  FileText, Download, Eye, Edit3, Trash2, Plus, 
  Search, ShieldCheck, X, UploadCloud, 
  FileCheck, ZoomIn, ZoomOut, Loader2
} from 'lucide-react';

interface HealthRecordsVaultProps {
  isModal?: boolean;
  onClose?: () => void;
}

const CATEGORIES: MedicalRecord['category'][] = [
  'Prescription',
  'Lab Test',
  'Consultation',
  'Scan & X-Ray',
  'Discharge Summary',
  'Other'
];

export const HealthRecordsVault: React.FC<HealthRecordsVaultProps> = ({ isModal = false }) => {
  const { 
    medicalRecords, 
    uploadMedicalRecord, 
    updateMedicalRecord, 
    deleteMedicalRecord, 
    downloadMedicalRecord 
  } = useApp();

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<MedicalRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<MedicalRecord['category']>('Prescription');
  const [formDoctor, setFormDoctor] = useState('');
  const [formHospital, setFormHospital] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image Zoom for Viewer
  const [imageZoom, setImageZoom] = useState(1);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return medicalRecords.filter(rec => {
      const matchCat = selectedCategory === 'All' || rec.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchCat;

      const matchSearch = 
        rec.name.toLowerCase().includes(q) ||
        (rec.doctor && rec.doctor.toLowerCase().includes(q)) ||
        (rec.hospital && rec.hospital.toLowerCase().includes(q)) ||
        (rec.notes && rec.notes.toLowerCase().includes(q)) ||
        (rec.date && rec.date.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [medicalRecords, selectedCategory, searchQuery]);

  // Open Form to Add New
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormName('');
    setFormCategory('Prescription');
    setFormDoctor('');
    setFormHospital('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setSelectedFile(null);
    setFilePreviewUrl('');
    setIsFormOpen(true);
  };

  // Open Form to Edit
  const handleOpenEdit = (rec: MedicalRecord) => {
    setEditingRecord(rec);
    setFormName(rec.name);
    setFormCategory(rec.category);
    setFormDoctor(rec.doctor);
    setFormHospital(rec.hospital);
    
    // Parse date into YYYY-MM-DD if possible
    let parsedDate = rec.date;
    try {
      const d = new Date(rec.date);
      if (!isNaN(d.getTime())) {
        parsedDate = d.toISOString().split('T')[0];
      }
    } catch (e) {}

    setFormDate(parsedDate);
    setFormNotes(rec.notes || '');
    setSelectedFile(null);
    setFilePreviewUrl(rec.fileUrl || '');
    setIsFormOpen(true);
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setFilePreviewUrl(url);
      } else {
        setFilePreviewUrl('');
      }
      // If title is empty, prefill from filename
      if (!formName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
        setFormName(nameWithoutExt);
      }
    }
  };

  // Handle Form Submit (Upload or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Please enter a record/report title");
      return;
    }

    setIsSubmitting(true);
    try {
      let fileType: MedicalRecord['fileType'] = 'PDF';
      if (selectedFile) {
        if (selectedFile.type.startsWith('image/')) fileType = 'IMAGE';
        else if (selectedFile.name.endsWith('.doc') || selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.txt')) {
          fileType = 'DOC';
        }
      } else if (editingRecord) {
        fileType = editingRecord.fileType;
      }

      let displayDate = formDate;
      try {
        const d = new Date(formDate);
        if (!isNaN(d.getTime())) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          displayDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }
      } catch (e) {}

      if (editingRecord) {
        await updateMedicalRecord(editingRecord.id, {
          name: formName.trim(),
          category: formCategory,
          doctor: formDoctor.trim() || 'Consultant Doctor',
          hospital: formHospital.trim() || 'Medical Care Clinic',
          date: displayDate,
          notes: formNotes.trim(),
          fileType: fileType
        }, selectedFile || undefined);
      } else {
        await uploadMedicalRecord({
          name: formName.trim(),
          category: formCategory,
          doctor: formDoctor.trim() || 'Consultant Doctor',
          hospital: formHospital.trim() || 'Medical Care Clinic',
          date: displayDate,
          notes: formNotes.trim(),
          fileType: fileType,
          fileName: selectedFile ? selectedFile.name : `${formName.trim().replace(/\s+/g, '_')}.pdf`,
          fileSize: selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : '150 KB',
          fileUrl: filePreviewUrl || ''
        }, selectedFile || undefined);
      }

      setIsFormOpen(false);
      setEditingRecord(null);
    } catch (err: any) {
      alert("Failed to save report: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    try {
      await deleteMedicalRecord(deletingRecord.id);
      setDeletingRecord(null);
    } catch (e) {
      alert("Failed to delete record");
    }
  };

  const getBadgeStyle = (fileType: MedicalRecord['fileType']) => {
    switch (fileType) {
      case 'IMAGE':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'DOC':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'PDF':
      default:
        return 'bg-purple-50 text-purple-600 border border-purple-100';
    }
  };

  return (
    <div className={`space-y-4 text-left ${isModal ? 'py-1' : 'w-full max-w-4xl mx-auto'}`}>
      
      {/* 1. VAULT HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-100/90 p-3.5 sm:p-4 rounded-2xl shadow-3xs">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-black text-blue-700 tracking-tight">Digital Health Vault</h4>
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-blue-100/80 text-blue-700 px-2 py-0.5 rounded-full">
              <ShieldCheck size={11} className="text-blue-600" />
              Encrypted
            </span>
          </div>
          <p className="text-[11px] text-blue-600/90 font-semibold mt-0.5">
            All prescriptions, lab tests &amp; reports are secured and accessible anytime
          </p>
        </div>
        
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl cursor-pointer shadow-sm shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus size={14} />
          <span>Upload Report</span>
        </button>
      </div>

      {/* 2. SEARCH & FILTER BAR */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by test name, doctor, or hospital..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'All' 
                ? 'bg-blue-600 text-white shadow-3xs' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({medicalRecords.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = medicalRecords.filter(r => r.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-blue-600 text-white shadow-3xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. RECORDS LIST */}
      <div className={`space-y-2.5 overflow-y-auto pr-1 ${isModal ? 'max-h-[380px]' : ''}`}>
        {filteredRecords.length > 0 ? (
          filteredRecords.map((rec) => (
            <div 
              key={rec.id} 
              className="bg-white border border-slate-150 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs hover:border-blue-200 hover:shadow-2xs transition-all"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-[10.5px] uppercase shadow-3xs ${getBadgeStyle(rec.fileType)}`}>
                  {rec.fileType}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-slate-900 text-xs sm:text-[13px] truncate leading-snug">
                      {rec.name}
                    </h4>
                    <span className="text-[9px] font-extrabold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md shrink-0">
                      {rec.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                    <span>{rec.doctor}</span>
                    <span>•</span>
                    <span>{rec.date}</span>
                    {rec.fileSize && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400 font-mono text-[9.5px]">{rec.fileSize}</span>
                      </>
                    )}
                  </p>
                  <p className="text-[9.5px] text-blue-600 font-black mt-0.5">
                    {rec.hospital}
                  </p>
                  {rec.notes && (
                    <p className="text-[9.5px] text-slate-500 italic mt-1 line-clamp-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      "{rec.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => {
                    setImageZoom(1);
                    setViewingRecord(rec);
                  }}
                  className="px-2.5 py-1.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl cursor-pointer transition-colors text-[11px] font-extrabold border border-slate-200 flex items-center gap-1"
                  title="View Document"
                >
                  <Eye size={12} className="text-slate-500" />
                  <span>View</span>
                </button>

                <button 
                  onClick={() => downloadMedicalRecord(rec)}
                  className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors text-[11px] font-extrabold border border-blue-200/80 flex items-center gap-1"
                  title="Download Document"
                >
                  <Download size={12} className="text-blue-600" />
                  <span>Download</span>
                </button>

                <button 
                  onClick={() => handleOpenEdit(rec)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                  title="Edit Record Details"
                >
                  <Edit3 size={14} />
                </button>

                <button 
                  onClick={() => setDeletingRecord(rec)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                  title="Delete Record"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center text-blue-600 shadow-3xs border border-slate-100">
              <FileCheck size={24} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">
                {searchQuery ? "No matching records found" : "Your Health Vault is Empty"}
              </h4>
              <p className="text-[10.5px] text-slate-400 mt-1 max-w-xs mx-auto">
                {searchQuery 
                  ? "Try searching for a different doctor, report title, or hospital."
                  : "Keep all your prescriptions, test reports, and doctor consultation notes secure in one place."}
              </p>
            </div>
            {!searchQuery && (
              <button 
                onClick={handleOpenAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black px-4 py-2 rounded-xl cursor-pointer shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>Upload Your First Report</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. FOOTER ENCRYPTION BADGE */}
      <div className="text-center pt-2 text-[9.5px] text-slate-400 font-semibold border-t border-slate-100 flex items-center justify-center gap-1.5">
        <ShieldCheck size={12} className="text-emerald-500" />
        <span>Secured &amp; Encrypted with 256-bit SSL encryption.</span>
      </div>

      {/* ─── MODAL 1: UPLOAD / EDIT FORM ────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingRecord ? "Edit Medical Record" : "Upload Medical Record"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {editingRecord ? "Update your report details or replace document" : "Add prescriptions, lab tests, or scan reports to your vault"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  Report / Document Title *
                </label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Blood Test - Complete Count (CBC)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Date of Report *
                  </label>
                  <input 
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Consulting Doctor / Lab
                  </label>
                  <input 
                    type="text"
                    value={formDoctor}
                    onChange={(e) => setFormDoctor(e.target.value)}
                    placeholder="e.g. Dr. Anil Kumar"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Hospital / Diagnostic Clinic
                  </label>
                  <input 
                    type="text"
                    value={formHospital}
                    onChange={(e) => setFormHospital(e.target.value)}
                    placeholder="e.g. City Care Hospital"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  Attach Medical File (PDF, Image, or Doc)
                </label>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf,image/*,.doc,.docx,.txt" 
                  className="hidden" 
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/70 p-4 rounded-2xl text-center cursor-pointer transition-all space-y-1.5"
                >
                  <UploadCloud size={24} className="text-blue-600 mx-auto" />
                  <div>
                    <span className="text-xs font-black text-blue-600">Click to browse file</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">PDF, PNG, JPG, or DOC (up to 25MB)</span>
                  </div>

                  {(selectedFile || editingRecord?.fileName) && (
                    <div className="bg-white border border-blue-100 rounded-xl p-2 mt-2 text-left flex items-center justify-between shadow-3xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-blue-600 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {selectedFile ? selectedFile.name : editingRecord?.fileName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 shrink-0 ml-2">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : editingRecord?.fileSize}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  Notes &amp; Prescriptions / Clinical Remarks
                </label>
                <textarea 
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Next follow up after 2 weeks, take medicine after breakfast..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-blue-500/25 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingRecord ? "Save Changes" : "Upload to Vault"}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: IN-APP DOCUMENT VIEWER ────────────────────────────────────── */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${getBadgeStyle(viewingRecord.fileType)}`}>
                  {viewingRecord.fileType}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {viewingRecord.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">
                    {viewingRecord.doctor} • {viewingRecord.hospital} • {viewingRecord.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => downloadMedicalRecord(viewingRecord)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Download File"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button 
                  onClick={() => setViewingRecord(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col items-center justify-center min-h-[300px]">
              
              {viewingRecord.fileType === 'IMAGE' || (viewingRecord.fileUrl && viewingRecord.fileUrl.startsWith('data:image')) ? (
                <div className="w-full flex flex-col items-center space-y-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-3xs text-xs font-bold text-slate-600">
                    <button 
                      onClick={() => setImageZoom(z => Math.max(0.6, z - 0.2))}
                      className="p-1 hover:text-blue-600 cursor-pointer"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span>{Math.round(imageZoom * 100)}%</span>
                    <button 
                      onClick={() => setImageZoom(z => Math.min(2.5, z + 0.2))}
                      className="p-1 hover:text-blue-600 cursor-pointer"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>
                  <div className="overflow-auto max-h-[50vh] w-full flex items-center justify-center p-2">
                    <img 
                      src={viewingRecord.fileUrl} 
                      alt={viewingRecord.name}
                      style={{ transform: `scale(${imageZoom})`, transformOrigin: 'top center' }}
                      className="rounded-xl shadow-md transition-transform duration-100 max-w-full"
                    />
                  </div>
                </div>
              ) : viewingRecord.fileUrl && viewingRecord.fileUrl.endsWith('.pdf') ? (
                <iframe 
                  src={`${viewingRecord.fileUrl}#toolbar=0`}
                  title={viewingRecord.name}
                  className="w-full h-[55vh] rounded-2xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full text-center space-y-3 shadow-sm">
                  <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{viewingRecord.name}</h4>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">{viewingRecord.fileName}</p>
                    <p className="text-[11px] text-blue-600 font-bold mt-1">{viewingRecord.fileSize}</p>
                  </div>
                  <button
                    onClick={() => downloadMedicalRecord(viewingRecord)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download to View File</span>
                  </button>
                </div>
              )}

              {viewingRecord.notes && (
                <div className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 mt-3 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Doctor's Notes &amp; Observations
                  </span>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    {viewingRecord.notes}
                  </p>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL 3: CONFIRM DELETE ────────────────────────────────────────────── */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl mx-auto flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Delete Medical Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong className="text-slate-800">"{deletingRecord.name}"</strong> from your digital health vault? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Keep File
              </button>
              <button
                onClick={handleConfirmDelete}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm shadow-red-500/25 transition-all cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
