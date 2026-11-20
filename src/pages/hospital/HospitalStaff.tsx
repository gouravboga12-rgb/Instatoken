import React, { useState, useMemo } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalStaffMember } from '../../context/HospitalContext';
import {
  Users, UserPlus, Search, Phone, Mail, Clock,
  Trash2, Edit3, Building2, Upload, User,
  Briefcase, CheckCircle2
} from 'lucide-react';

export const HospitalStaff: React.FC = () => {
  const { staff, departments, addStaffMember, updateStaffMember, deleteStaffMember } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<HospitalStaffMember | null>(null);

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    photo: '',
    phone: '',
    email: '',
    departmentId: departments[0]?.id || 'dept-general',
    departmentName: departments[0]?.name || 'General Medicine',
    designation: 'Staff Nurse',
    shift: 'Morning' as 'Morning' | 'Evening' | 'Night' | 'General',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 25000,
    employmentType: 'Full-time' as 'Full-time' | 'Part-time' | 'Contract',
    status: 'active' as 'active' | 'on-leave' | 'inactive'
  });

  // Unique posts / designations across hospital
  const uniquePosts = useMemo(() => {
    return Array.from(new Set(staff.map(s => s.designation).filter(Boolean)));
  }, [staff]);

  // Filter staff records
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        (s.departmentName || '').toLowerCase().includes(q);

      const matchesDept = selectedDept === 'all' || s.departmentId === selectedDept || s.departmentName?.toLowerCase() === selectedDept.toLowerCase();
      const matchesShift = selectedShift === 'all' || s.shift === selectedShift;
      const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;

      return matchesSearch && matchesDept && matchesShift && matchesStatus;
    });
  }, [staff, searchQuery, selectedDept, selectedShift, selectedStatus]);

  // Key Metrics (100% Staff & Operations Focused)
  const totalEmployees = staff.length;
  const activeEmployees = staff.filter(s => s.status === 'active').length;
  const totalMonthlyPayroll = staff.reduce((acc, s) => acc + (Number(s.salary) || 0), 0);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    const defaultDept = departments[0];
    setFormData({
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      photo: '',
      phone: '',
      email: '',
      departmentId: defaultDept?.id || 'dept-general',
      departmentName: defaultDept?.name || 'General Medicine',
      designation: 'Staff Nurse',
      shift: 'Morning',
      joiningDate: new Date().toISOString().split('T')[0],
      salary: 25000,
      employmentType: 'Full-time',
      status: 'active'
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (member: HospitalStaffMember) => {
    setEditingStaff(member);
    setFormData({
      employeeId: member.employeeId,
      name: member.name,
      photo: member.photo || '',
      phone: member.phone,
      email: member.email || '',
      departmentId: member.departmentId,
      departmentName: member.departmentName,
      designation: member.designation,
      shift: member.shift,
      joiningDate: member.joiningDate,
      salary: member.salary,
      employmentType: member.employmentType,
      status: member.status
    });
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please fill out Employee Name and Phone Number.');
      return;
    }
    if (!formData.employeeId.trim()) {
      alert('Please provide an Employee Number / ID.');
      return;
    }

    const deptObj = departments.find(d => d.id === formData.departmentId);
    const resolvedDeptName = deptObj ? deptObj.name : formData.departmentName;

    if (editingStaff) {
      updateStaffMember(editingStaff.id, {
        ...formData,
        departmentName: resolvedDeptName
      });
    } else {
      addStaffMember({
        ...formData,
        departmentName: resolvedDeptName
      });
    }
    setShowAddModal(false);
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200 pb-12">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
              <Users size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
              Hospital Staff &amp; Employee Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage hospital staff records, clinical assignments, duty shifts, and payroll compensation.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer border-none shrink-0"
        >
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* ── KPI Cards (100% Staff & Payroll Focused) ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Employees */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Employees</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalEmployees}</p>
          <p className="text-[11px] text-blue-600 font-bold mt-1">Active Hospital Team</p>
        </div>

        {/* On Duty / Active Staff */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active on Duty</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{activeEmployees}</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Available for OPD Shifts</p>
        </div>

        {/* Roles / Posts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roles &amp; Posts</p>
          <p className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">{uniquePosts.length}</p>
          <p className="text-[11px] text-indigo-600 font-bold mt-1">Distinct Designations</p>
        </div>

        {/* Monthly Payroll */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Compensation</p>
          <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">₹{totalMonthlyPayroll.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-purple-600 font-bold mt-1">Estimated Staff Payroll</p>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, Name, Phone, Role/Post..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Department Filter (Dynamically pulled from Departments page) */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Building2 size={14} className="text-slate-500" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Shift filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Clock size={14} className="text-slate-500" />
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Shifts</option>
              <option value="Morning">Morning Shift</option>
              <option value="Evening">Evening Shift</option>
              <option value="Night">Night Shift</option>
              <option value="General">General Shift</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <CheckCircle2 size={14} className="text-slate-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {(selectedDept !== 'all' || selectedShift !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDept('all');
                setSelectedShift('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-blue-600 hover:underline px-2 cursor-pointer bg-transparent border-none"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Main Staff Table ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Hospital Staff Directory
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Current hospital staff members, clinical postings, and duty shifts
            </p>
          </div>
          <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/50">
            {filteredStaff.length} Employees Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-5 w-28">Employee ID</th>
                <th className="py-4 px-5">Employee</th>
                <th className="py-4 px-5">Department</th>
                <th className="py-4 px-5">Designation / Role</th>
                <th className="py-4 px-5">Contact</th>
                <th className="py-4 px-5">Shift &amp; Salary</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2.5">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                        <Users size={24} />
                      </div>
                      <p className="font-extrabold text-slate-800 text-sm">No Staff Members Found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery || selectedDept !== 'all' || selectedShift !== 'all' || selectedStatus !== 'all'
                          ? 'No staff members match the selected filters.'
                          : 'Click "+ Add Employee" to register your first hospital staff member.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                      >
                        + Add Employee
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Employee ID */}
                      <td className="py-4 px-5 font-mono text-[11px] font-extrabold text-blue-700">
                        <span className="inline-block px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-100">
                          {member.employeeId}
                        </span>
                      </td>

                      {/* Employee Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-xs shrink-0">
                              {member.name ? member.name.charAt(0).toUpperCase() : <User size={16} />}
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs leading-tight">{member.name}</p>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Joined {member.joiningDate}</span>
                          </div>
                        </div>
                      </td>

                      {/* Department (Clean Badge) */}
                      <td className="py-4 px-5">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-extrabold text-[11px] rounded-lg">
                          {member.departmentName || 'General Medicine'}
                        </span>
                      </td>

                      {/* Designation / Role */}
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <Briefcase size={12} className="text-blue-500" />
                          <span>{member.designation}</span>
                        </p>
                        <span className="text-[10px] text-slate-400 font-semibold">{member.employmentType}</span>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <a 
                            href={`tel:${member.phone}`}
                            className="flex items-center gap-1.5 text-slate-700 font-semibold hover:text-blue-600 no-underline"
                          >
                            <Phone size={12} className="text-emerald-500 shrink-0" />
                            <span>{member.phone}</span>
                          </a>
                          {member.email && (
                            <p className="flex items-center gap-1.5 text-slate-400 text-[10.5px]">
                              <Mail size={11} className="text-slate-400 shrink-0" />
                              <span>{member.email}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Shift & Salary */}
                      <td className="py-4 px-5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          member.shift === 'Morning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          member.shift === 'Evening' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          member.shift === 'Night' ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {member.shift}
                        </span>
                        <p className="text-slate-800 font-extrabold text-xs mt-1">₹{member.salary.toLocaleString('en-IN')}/mo</p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          member.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : member.status === 'on-leave'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : member.status === 'on-leave' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                          {member.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-none bg-transparent cursor-pointer"
                            title="Edit Employee"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${member.name} (${member.employeeId}) from hospital records?`)) {
                                deleteStaffMember(member.id);
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer"
                            title="Delete Employee"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Staff Modal ─────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingStaff ? 'Edit Hospital Employee' : 'Add New Hospital Employee'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Assign department, designation, and duty shift</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-1042"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Email Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="staff@hospital.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Department & Designation: Department pulled dynamically from Departments page */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Department Category *
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => {
                      const sel = departments.find(d => d.id === e.target.value);
                      setFormData({
                        ...formData,
                        departmentId: e.target.value,
                        departmentName: sel ? sel.name : formData.departmentName
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Post / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Head Nurse, Receptionist, Lab Tech"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Duty Shift *
                  </label>
                  <select
                    value={formData.shift}
                    onChange={(e: any) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Salary (₹/mo) *
                  </label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 block mb-1">
                    Type *
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e: any) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-extrabold text-lg">
                  {formData.photo ? (
                    <img src={formData.photo} alt="Staff preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Staff Photo <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs">
                      <Upload size={13} />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.photo && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                        className="text-xs font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 cursor-pointer transition-colors"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  {formData.photo && formData.photo.startsWith('data:') && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                        ✓ Photo uploaded from device
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all border-none cursor-pointer"
                >
                  {editingStaff ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
