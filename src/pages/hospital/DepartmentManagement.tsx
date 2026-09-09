import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalDepartment } from '../../context/HospitalContext';
import {
  Building2, Plus, Search, Edit3, Trash2, ArrowLeft,
  Stethoscope, Clock, IndianRupee, ShieldCheck,
  Activity, CheckCircle2, AlertCircle, ChevronRight,
  Eye
} from 'lucide-react';

const DEPARTMENT_ICONS = ['🩺', '❤️', '🦴', '👶', '🧠', '👁️', '🦷', '🔬', '🏥', '💊', '🧬', '🚑'];

const DEFAULT_SERVICES: Record<string, string[]> = {
  'dept-cardio': ['24x7 Cardiac Emergency', 'ECG & 2D Echocardiography', 'TMT Stress Testing', 'Holter Monitoring', 'Cardiac Catheterization Lab', 'Pacemaker Clinic'],
  'dept-ortho': ['Fracture & Trauma Care', 'Joint Replacement (Knee & Hip)', 'Arthroscopic Surgery', 'Spine & Disc Clinic', 'Sports Medicine & Rehab', 'Physiotherapy'],
  'dept-pedia': ['Well-Baby Clinic', 'Neonatal Intensive Care (NICU)', 'Pediatric Vaccination', 'Growth & Developmental Assessment', 'Childhood Asthma Clinic'],
  'dept-neuro': ['Stroke Management Unit', 'EEG & EMG Diagnostics', 'Epilepsy Clinic', 'Headache & Migraine Center', 'Neuropathy Treatment'],
  'dept-derma': ['Clinical Dermatology', 'Acne & Scar Treatment', 'Laser Skin Surgery', 'Hair & Scalp Therapy', 'Allergy Patch Testing'],
  'dept-ophta': ['Comprehensive Eye Checkup', 'Cataract & Lasik Evaluation', 'Retina & Glaucoma Clinic', 'Diabetic Eye Screening', 'Pediatric Ophthalmology'],
  'dept-dental': ['Root Canal Treatment (RCT)', 'Dental Implants', 'Orthodontic Braces', 'Teeth Whitening & Scaling', 'Oral & Maxillofacial Surgery']
};

export const DepartmentManagement: React.FC = () => {
  const { deptId } = useParams<{ deptId?: string }>();
  const navigate = useNavigate();
  const {
    departments,
    doctors,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    toggleDepartmentActive
  } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<HospitalDepartment | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    icon: '🩺',
    headDoctor: '',
    description: '',
    active: true
  });

  // Selected Department (either from URL param or state)
  const selectedDept = deptId ? departments.find(d => d.id === deptId) : null;

  const openAddModal = () => {
    setEditingDept(null);
    setForm({
      name: '',
      icon: '🩺',
      headDoctor: '',
      description: '',
      active: true
    });
    setShowModal(true);
  };

  const openEditModal = (dept: HospitalDepartment) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      icon: dept.icon || '🩺',
      headDoctor: dept.headDoctor || '',
      description: (dept as any).description || '',
      active: dept.active
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      headDoctor: form.headDoctor.trim(),
      totalDoctors: doctors.filter(d => d.departmentId === (editingDept?.id || '')).length,
      active: form.active,
      description: form.description.trim()
    };

    if (editingDept) {
      updateDepartment(editingDept.id, payload);
    } else {
      addDepartment(payload);
    }

    setShowModal(false);
    setEditingDept(null);
  };

  const filteredDepts = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.headDoctor && d.headDoctor.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterActive === 'active') return matchesSearch && d.active;
    if (filterActive === 'inactive') return matchesSearch && !d.active;
    return matchesSearch;
  });

  const totalDoctorsCount = doctors.length;
  const activeDeptsCount = departments.filter(d => d.active).length;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: DEDICATED DEPARTMENT DETAIL VIEW (Phase 16)
  // ─────────────────────────────────────────────────────────────────────────────
  if (selectedDept) {
    const deptDoctors = doctors.filter(d => d.departmentId === selectedDept.id);
    const services = (selectedDept as any).services || DEFAULT_SERVICES[selectedDept.id] || [
      'OPD Specialist Consultation',
      'Diagnostic & Laboratory Testing',
      'Emergency Assessment',
      'Routine Checkup & Follow-ups'
    ];

    return (
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/hospital/departments')}
            className="flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-4 py-2 rounded-xl cursor-pointer shadow-2xs hover:shadow-xs transition-all"
          >
            <ArrowLeft size={14} />
            <span>Back to All Departments</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(selectedDept)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-200"
            >
              <Edit3 size={13} />
              <span>Edit Department</span>
            </button>
            <button
              onClick={() => toggleDepartmentActive(selectedDept.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer border-none transition-colors ${
                selectedDept.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {selectedDept.active ? 'Status: Active' : 'Status: Inactive'}
            </button>
          </div>
        </div>

        {/* Department Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-18 h-18 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-4xl shadow-inner shrink-0">
                {selectedDept.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-blue-100">
                    Department Category
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    selectedDept.active ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-slate-300 text-slate-800'
                  }`}>
                    {selectedDept.active ? 'Operational' : 'Paused'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1.5">{selectedDept.name} Department</h1>
                <p className="text-xs text-blue-100 font-semibold mt-1">
                  Head Doctor: <strong className="text-white">{selectedDept.headDoctor || 'Not Assigned'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-white/15">
              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 text-center">
                <span className="text-2xl font-black block">{deptDoctors.length}</span>
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider block">Specialists</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 text-center">
                <span className="text-2xl font-black block">{services.length}</span>
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider block">Clinical Services</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout: Doctors in Department & Clinical Services */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Doctors in this Department */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Stethoscope size={16} className="text-blue-600" />
                <span>Specialist Doctors in {selectedDept.name} ({deptDoctors.length})</span>
              </h3>
              <button
                onClick={() => navigate('/hospital/doctors')}
                className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage in Doctor Directory</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {deptDoctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deptDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-slate-100 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start gap-3.5 mb-3.5">
                        <img
                          src={doc.photo || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80"}
                          alt={doc.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-black text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                              {doc.name}
                            </h4>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              doc.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {doc.active ? 'Active' : 'Off'}
                            </span>
                          </div>
                          <p className="text-[11px] font-extrabold text-blue-600 truncate mt-0.5">{doc.specialization}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">{doc.qualification} · {doc.experience}y Exp</p>
                        </div>
                      </div>

                      {/* Doctor Details Bar */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-2xl p-2.5 text-[10px] font-semibold text-slate-600 mb-3.5">
                        <div className="flex items-center gap-1.5">
                          <IndianRupee size={12} className="text-emerald-600 shrink-0" />
                          <span>Fee: <strong className="text-slate-900 font-extrabold">₹{doc.consultationFee}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-blue-600 shrink-0" />
                          <span>OPD: <strong className="text-slate-900 font-extrabold">{doc.opdStartTime || '09:00 AM'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Doctor Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                      <button
                        onClick={() => navigate(`/hospital/tokens/doctor/${doc.id}`)}
                        className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Activity size={12} />
                        <span>Token Screen</span>
                      </button>
                      <button
                        onClick={() => navigate(`/hospital/tokens/add?doctorId=${doc.id}&departmentId=${selectedDept.id}`)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Plus size={12} />
                        <span>Issue Token</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Stethoscope size={22} />
                </div>
                <h4 className="text-sm font-black text-slate-800">No Doctors Assigned Yet</h4>
                <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
                  Assign or add specialist doctors to this department so customers can book OPD tokens.
                </p>
                <button
                  onClick={() => navigate('/hospital/doctors')}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl cursor-pointer border-none shadow-xs"
                >
                  Go to Doctor Directory
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Department Services & Clinical Amenities */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Clinical Services & Procedures</span>
              </h3>

              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                The following diagnostic, procedural, and OPD services are supported under {selectedDept.name}:
              </p>

              <div className="space-y-2">
                {services.map((srv: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>{srv}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Quick Stats Card */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-md">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Department Administration</h4>
              
              <div className="space-y-2 text-xs font-semibold text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Department ID:</span>
                  <span className="font-mono text-slate-200">{selectedDept.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Status:</span>
                  <span className={selectedDept.active ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {selectedDept.active ? 'Active & Bookable' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Specialists:</span>
                  <span className="font-bold text-white">{deptDoctors.length}</span>
                </div>
              </div>

              <button
                onClick={() => openEditModal(selectedDept)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl cursor-pointer transition-colors border-none"
              >
                Modify Department Settings
              </button>
            </div>
          </div>

        </div>

        {/* Modal for editing selected department */}
        {showModal && renderModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: ALL DEPARTMENTS DIRECTORY GRID (Phase 16)
  // ─────────────────────────────────────────────────────────────────────────────
  function renderModal() {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {editingDept ? 'Edit Department' : 'Add New Department'}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">Configure department name, head doctor, and category icon</p>
              </div>
            </div>
            <button
              onClick={() => { setShowModal(false); setEditingDept(null); }}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer border-none font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Department Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Cardiology, Orthopedics, Neurology"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Department Icon</label>
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                {DEPARTMENT_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm({ ...form, icon: ic })}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
                      form.icon === ic ? 'bg-blue-600 text-white shadow-sm scale-110' : 'hover:bg-slate-200'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Head Doctor / In-Charge</label>
              <input
                type="text"
                value={form.headDoctor}
                onChange={e => setForm({ ...form, headDoctor: e.target.value })}
                placeholder="e.g. Dr. Arvind Sharma"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Description / Specialty Overview</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Brief clinical overview of this department..."
                rows={2}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-extrabold text-slate-800 block">Active Status</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Enable this department for public OPD booking</span>
              </div>
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingDept(null); }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl cursor-pointer border-none shadow-md shadow-blue-500/20"
              >
                {editingDept ? 'Update Department' : 'Create Department'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm shadow-blue-500/20">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Hospital Departments</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Manage clinical department categories, assigned specialists, head doctors, and clinical facilities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-2 text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={15} />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Departments', val: departments.length, icon: <Building2 size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Categories', val: activeDeptsCount, icon: <CheckCircle2 size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Assigned Doctors', val: totalDoctorsCount, icon: <Stethoscope size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Inactive / Paused', val: departments.length - activeDeptsCount, icon: <AlertCircle size={16} />, color: 'text-slate-500', bg: 'bg-slate-100' }
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{m.label}</p>
              <p className="text-xl font-black text-slate-900 mt-1">{m.val}</p>
            </div>
            <div className={`p-2.5 ${m.bg} ${m.color} rounded-xl`}>{m.icon}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Department Name or Head Doctor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          {(['all', 'active', 'inactive'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterActive(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize cursor-pointer transition-colors border-none ${
                filterActive === tab ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Departments Grid (Clicking opens Department Page - Phase 16 requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDepts.map(dept => {
          const deptDoctors = doctors.filter(d => d.departmentId === dept.id);

          return (
            <div
              key={dept.id}
              onClick={() => navigate(`/hospital/departments/${dept.id}`)}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-5 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer hover:border-blue-300 group relative"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-2xs">
                    {dept.icon}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDepartmentActive(dept.id);
                    }}
                    className={`text-[9px] font-black px-2.5 py-0.5 rounded-full capitalize cursor-pointer border-none transition-colors ${
                      dept.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {dept.active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <h3 className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors leading-snug">
                  {dept.name}
                </h3>

                <div className="space-y-1.5 mt-3 text-[11px] text-slate-500 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Head Doctor:</span>
                    <span className="text-slate-800 font-extrabold truncate max-w-[130px]">{dept.headDoctor || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Doctors:</span>
                    <span className="text-blue-600 font-black">{deptDoctors.length} Specialists</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3.5 mt-3.5 border-t border-slate-50 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/hospital/departments/${dept.id}`)}
                  className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  <Eye size={12} />
                  <span>View Details</span>
                </button>
                <button
                  onClick={() => openEditModal(dept)}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl cursor-pointer transition-colors"
                  title="Edit Department"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete department ${dept.name}?`)) {
                      deleteDepartment(dept.id);
                    }
                  }}
                  className="p-2 border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl cursor-pointer transition-colors"
                  title="Delete Department"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDepts.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs">
          <p className="text-sm font-bold text-slate-400">No departments match your filter.</p>
          <button
            onClick={() => { setSearchQuery(''); setFilterActive('all'); }}
            className="mt-3 text-xs text-blue-600 font-black hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Modal for Add / Edit */}
      {showModal && renderModal()}
    </div>
  );
};
