import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalDoctor, HospitalDepartment } from '../../context/HospitalContext';
import { Plus, Edit3, Trash2, Eye, EyeOff, Search } from 'lucide-react';

interface DoctorManagementProps {
  tab?: 'doctors' | 'departments';
}

export const DoctorManagement: React.FC<DoctorManagementProps> = ({ tab: initialTab = 'doctors' }) => {
  const {
    doctors,
    departments,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    toggleDoctorActive,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    toggleDepartmentActive
  } = useHospital();

  const [activeTab, setActiveTab] = useState<'doctors' | 'departments'>(initialTab);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

  // Modals / Form State
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<HospitalDoctor | null>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<HospitalDepartment | null>(null);

  // Form Fields for Doctor
  const [docForm, setDocForm] = useState({
    name: '',
    photo: '',
    qualification: '',
    specialization: '',
    departmentId: '',
    experience: '5',
    consultationFee: '500',
    languages: 'English, Hindi',
    gender: 'Male',
    biography: '',
    opdDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    opdStartTime: '09:00',
    opdEndTime: '13:00',
    consultationDuration: '15',
    maxTokensPerDay: '50',
    onlineConsult: true,
    offlineConsult: true,
    active: true
  });

  // Form Fields for Department
  const [deptForm, setDeptForm] = useState({
    name: '',
    icon: '🩺',
    headDoctor: '',
    active: true
  });

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find(d => d.id === docForm.departmentId);
    const docData = {
      name: docForm.name,
      photo: docForm.photo,
      qualification: docForm.qualification,
      specialization: docForm.specialization,
      departmentId: docForm.departmentId,
      departmentName: dept ? dept.name : '',
      experience: parseInt(docForm.experience),
      consultationFee: parseFloat(docForm.consultationFee),
      languages: docForm.languages.split(',').map(l => l.trim()),
      gender: docForm.gender,
      biography: docForm.biography,
      opdDays: docForm.opdDays,
      opdStartTime: docForm.opdStartTime,
      opdEndTime: docForm.opdEndTime,
      consultationDuration: parseInt(docForm.consultationDuration),
      maxTokensPerDay: parseInt(docForm.maxTokensPerDay),
      onlineConsult: docForm.onlineConsult,
      offlineConsult: docForm.offlineConsult,
      active: docForm.active
    };

    if (editingDoc) {
      updateDoctor(editingDoc.id, docData);
    } else {
      addDoctor(docData);
    }
    setShowDocModal(false);
    setEditingDoc(null);
  };

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const deptData = {
      name: deptForm.name,
      icon: deptForm.icon,
      headDoctor: deptForm.headDoctor,
      totalDoctors: doctors.filter(d => d.departmentId === (editingDept?.id || '')).length,
      active: deptForm.active
    };

    if (editingDept) {
      updateDepartment(editingDept.id, deptData);
    } else {
      addDepartment(deptData);
    }
    setShowDeptModal(false);
    setEditingDept(null);
  };

  const openEditDoc = (doc: HospitalDoctor) => {
    setEditingDoc(doc);
    setDocForm({
      name: doc.name,
      photo: doc.photo,
      qualification: doc.qualification,
      specialization: doc.specialization,
      departmentId: doc.departmentId,
      experience: String(doc.experience),
      consultationFee: String(doc.consultationFee),
      languages: doc.languages.join(', '),
      gender: doc.gender,
      biography: doc.biography,
      opdDays: doc.opdDays,
      opdStartTime: doc.opdStartTime,
      opdEndTime: doc.opdEndTime,
      consultationDuration: String(doc.consultationDuration),
      maxTokensPerDay: String(doc.maxTokensPerDay),
      onlineConsult: doc.onlineConsult,
      offlineConsult: doc.offlineConsult,
      active: doc.active
    });
    setShowDocModal(true);
  };

  const openEditDept = (dept: HospitalDepartment) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      icon: dept.icon,
      headDoctor: dept.headDoctor,
      active: dept.active
    });
    setShowDeptModal(true);
  };

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.specialization.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.departmentName.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.headDoctor.toLowerCase().includes(deptSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Resource Management</h2>
          <p className="text-xs text-slate-400 mt-1">Configure your clinical staff and active specialties</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all border-none ${
              activeTab === 'doctors' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all border-none ${
              activeTab === 'departments' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Departments ({departments.length})
          </button>
        </div>
      </div>

      {/* ─── DOCTORS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
              <input
                type="text"
                placeholder="Search Doctor by name, specialty, dept..."
                value={doctorSearch}
                onChange={e => setDoctorSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <button
              onClick={() => {
                setEditingDoc(null);
                setDocForm({
                  name: '', photo: '', qualification: '', specialization: '', departmentId: departments[0]?.id || '',
                  experience: '5', consultationFee: '500', languages: 'English, Hindi', gender: 'Male', biography: '',
                  opdDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], opdStartTime: '09:00', opdEndTime: '13:00',
                  consultationDuration: '15', maxTokensPerDay: '50', onlineConsult: true, offlineConsult: true, active: true
                });
                setShowDocModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-1.5 text-xs shadow-md shadow-blue-500/10"
            >
              <Plus size={14} /> Add New Doctor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map(doc => (
              <div key={doc.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-slate-100 flex items-center justify-center text-blue-600 text-xl font-black shrink-0 overflow-hidden">
                      {doc.photo ? <img src={doc.photo} alt={doc.name} className="w-full h-full object-cover" /> : doc.name.split(' ').pop()?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{doc.name}</h4>
                        <button
                          onClick={() => toggleDoctorActive(doc.id)}
                          className="shrink-0 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title={doc.active ? 'Deactivate Doctor' : 'Activate Doctor'}
                        >
                          {doc.active ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-slate-400" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-blue-600 font-extrabold uppercase mt-0.5 tracking-wider">{doc.specialization}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">{doc.qualification}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{doc.experience} Years Experience</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5 bg-slate-50 rounded-2xl p-3 text-[11px] font-semibold text-slate-600">
                    <div>
                      <span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider">Fee / Consult</span>
                      <span className="text-slate-800 font-extrabold">₹{doc.consultationFee}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider">OPD Timings</span>
                      <span className="text-slate-800 truncate block">{doc.opdStartTime} - {doc.opdEndTime}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider">OPD Days</span>
                      <span className="text-slate-800 text-[10px]">{doc.opdDays.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-5 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => openEditDoc(doc)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold py-2 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={12} /> Edit Details
                  </button>
                  <button
                    onClick={() => deleteDoctor(doc.id)}
                    className="p-2 border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl cursor-pointer transition-colors"
                    title="Delete Doctor"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── DEPARTMENTS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-455" />
              <input
                type="text"
                placeholder="Search Department..."
                value={deptSearch}
                onChange={e => setDeptSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <button
              onClick={() => {
                setEditingDept(null);
                setDeptForm({ name: '', icon: '🩺', headDoctor: '', active: true });
                setShowDeptModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-1.5 text-xs shadow-md shadow-blue-500/10"
            >
              <Plus size={14} /> Add Department
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDepts.map(dept => (
              <div key={dept.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{dept.icon}</span>
                    <button
                      onClick={() => toggleDepartmentActive(dept.id)}
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full capitalize cursor-pointer border-none ${
                        dept.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {dept.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{dept.name}</h4>
                  <div className="space-y-1 mt-3 text-[10px] text-slate-500 font-semibold">
                    <div className="flex justify-between"><span>Head Doctor:</span><span className="text-slate-800 font-extrabold">{dept.headDoctor || '—'}</span></div>
                    <div className="flex justify-between"><span>Total Doctors:</span><span className="text-slate-800 font-extrabold">{doctors.filter(d => d.departmentId === dept.id).length}</span></div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => openEditDept(dept)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold py-1.5 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                  <button
                    onClick={() => deleteDepartment(dept.id)}
                    className="p-1.5 border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl cursor-pointer transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── DOCTOR MODAL ───────────────────────────────────────────────── */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">{editingDoc ? 'Edit Doctor Profile' : 'Add New Doctor'}</h3>
              <button onClick={() => setShowDocModal(false)} className="p-1 rounded-lg hover:bg-slate-50 cursor-pointer border-none text-slate-400">✕</button>
            </div>
            <form onSubmit={handleDocSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Doctor Name</label>
                  <input type="text" value={docForm.name} onChange={e => setDocForm({...docForm, name: e.target.value})} placeholder="e.g. Dr. Ramesh Patel" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Department</label>
                  <select value={docForm.departmentId} onChange={e => setDocForm({...docForm, departmentId: e.target.value})} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white">
                    <option value="">Select Department</option>
                    {departments.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Qualification</label>
                  <input type="text" value={docForm.qualification} onChange={e => setDocForm({...docForm, qualification: e.target.value})} placeholder="e.g. MBBS, MS (Ortho)" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Specialization</label>
                  <input type="text" value={docForm.specialization} onChange={e => setDocForm({...docForm, specialization: e.target.value})} placeholder="e.g. Joint Replacement Specialist" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Consultation Fee (₹)</label>
                  <input type="number" value={docForm.consultationFee} onChange={e => setDocForm({...docForm, consultationFee: e.target.value})} placeholder="500" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Experience (Years)</label>
                  <input type="number" value={docForm.experience} onChange={e => setDocForm({...docForm, experience: e.target.value})} placeholder="10" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">OPD Start Time</label>
                  <input type="time" value={docForm.opdStartTime} onChange={e => setDocForm({...docForm, opdStartTime: e.target.value})} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">OPD End Time</label>
                  <input type="time" value={docForm.opdEndTime} onChange={e => setDocForm({...docForm, opdEndTime: e.target.value})} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Gender</label>
                  <select value={docForm.gender} onChange={e => setDocForm({...docForm, gender: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Languages (Comma separated)</label>
                  <input type="text" value={docForm.languages} onChange={e => setDocForm({...docForm, languages: e.target.value})} placeholder="English, Hindi" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Biography</label>
                  <textarea value={docForm.biography} onChange={e => setDocForm({...docForm, biography: e.target.value})} rows={3} placeholder="Brief bio of the doctor..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowDocModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-655 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl border-none cursor-pointer">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DEPARTMENT MODAL ───────────────────────────────────────────── */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">{editingDept ? 'Edit Department' : 'Add Department'}</h3>
              <button onClick={() => setShowDeptModal(false)} className="p-1 rounded-lg hover:bg-slate-50 cursor-pointer border-none text-slate-400">✕</button>
            </div>
            <form onSubmit={handleDeptSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Department Name</label>
                <input type="text" value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} placeholder="e.g. Pulmonology" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Emoji Icon</label>
                <input type="text" value={deptForm.icon} onChange={e => setDeptForm({...deptForm, icon: e.target.value})} placeholder="e.g. 🩺" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Department Head Doctor</label>
                <input type="text" value={deptForm.headDoctor} onChange={e => setDeptForm({...deptForm, headDoctor: e.target.value})} placeholder="e.g. Dr. Sarah Jenkins" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-655 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl border-none cursor-pointer">Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
