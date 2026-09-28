import React, { useState, useMemo } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalStaffMember } from '../../context/HospitalContext';
import {
  Users, UserPlus, Search, Phone, Mail, Clock,
  Trash2, Edit3, Building2, Upload, User, Layers,
  Briefcase
} from 'lucide-react';

export const HospitalStaff: React.FC = () => {
  const { staff, departments, addStaffMember, updateStaffMember, deleteStaffMember } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
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
    designation: 'OPD Staff',
    shift: 'Morning' as 'Morning' | 'Evening' | 'Night' | 'General',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 25000,
    employmentType: 'Full-time' as 'Full-time' | 'Part-time' | 'Contract',
    status: 'active' as 'active' | 'on-leave' | 'inactive'
  });

  // Department Section Mapping
  const departmentSectionMap = useMemo(() => {
    const map = new Map<string, number>();
    departments.forEach((d, idx) => {
      map.set(d.id, idx + 1);
      map.set(d.name.toLowerCase(), idx + 1);
    });
    return map;
  }, [departments]);

  // Section & Posts breakdown
  const sectionStats = useMemo(() => {
    return departments.map((dept, idx) => {
      const deptStaff = staff.filter(s => s.departmentId === dept.id || s.departmentName?.toLowerCase() === dept.name.toLowerCase());
      const distinctPosts = Array.from(new Set(deptStaff.map(s => s.designation).filter(Boolean)));
      return {
        sectionNo: idx + 1,
        id: dept.id,
        name: dept.name,
        icon: dept.icon || '🏥',
        count: deptStaff.length,
        posts: distinctPosts
      };
    });
  }, [departments, staff]);

  // Unique posts / designations across hospital
  const uniquePosts = useMemo(() => {
    return Array.from(new Set(staff.map(s => s.designation).filter(Boolean)));
  }, [staff]);

  // Filter staff records
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.designation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === 'all' || s.departmentId === selectedDept || s.departmentName?.toLowerCase() === selectedDept.toLowerCase();
      const matchesShift = selectedShift === 'all' || s.shift === selectedShift;

      return matchesSearch && matchesDept && matchesShift;
    });
  }, [staff, searchQuery, selectedDept, selectedShift]);

  // Key Metrics
  const totalEmployees = staff.length;
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
    setFormData({
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      photo: '',
      phone: '',
      email: '',
      departmentId: departments[0]?.id || 'dept-general',
      departmentName: departments[0]?.name || 'General Medicine',
      designation: 'OPD Staff',
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
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users size={20} />
            </span>
            <h1 className="text-xl font-black text-slate-900">Hospital Staff &amp; Employee Directory</h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Maintain complete hospital employee records by clinical section, designation, post, duty shifts, and payroll compensation.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer border-none"
        >
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500">Total Employees</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalEmployees}</p>
          <p className="text-[11px] text-blue-600 font-bold mt-1">Active Hospital Team</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500">Hospital Sections</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{departments.length}</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Department Divisions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500">Active Roles / Posts</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{uniquePosts.length}</p>
          <p className="text-[11px] text-indigo-600 font-bold mt-1">Staff Specializations</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500">Monthly Compensation</p>
          <p className="text-2xl font-black text-purple-600 mt-1">₹{totalMonthlyPayroll.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-purple-600 font-bold mt-1">Staff Payroll Estimate</p>
        </div>
      </div>

      {/* ── Section Numbers & Department Employee Breakdown ─────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Hospital Sections &amp; Staff Headcount by Post
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">
            {departments.length} Sections Configured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sectionStats.map(sec => {
            const isFilterActive = selectedDept === sec.id;
            return (
              <div
                key={sec.id}
                onClick={() => setSelectedDept(isFilterActive ? 'all' : sec.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isFilterActive
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                    : 'border-slate-150 bg-slate-50/60 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center">
                      #{sec.sectionNo}
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                        <span>{sec.icon}</span>
                        <span>{sec.name}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Section #{sec.sectionNo}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white text-slate-800 font-black text-xs border border-slate-200 shadow-2xs">
                    {sec.count} {sec.count === 1 ? 'Staff' : 'Staff'}
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500">Posts:</span>
                  {sec.posts.length > 0 ? (
                    sec.posts.map((post, pIdx) => (
                      <span
                        key={pIdx}
                        className="text-[9.5px] font-extrabold px-1.5 py-0.5 bg-white text-slate-700 rounded-md border border-slate-200"
                      >
                        {post}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No employees assigned yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
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
          {/* Department / Section filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Building2 size={14} className="text-slate-500" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Sections &amp; Departments</option>
              {departments.map((d, idx) => (
                <option key={d.id} value={d.id}>Section #{idx + 1}: {d.name}</option>
              ))}
            </select>
          </div>

          {/* Shift filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
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

          {(selectedDept !== 'all' || selectedShift !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDept('all');
                setSelectedShift('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-blue-600 hover:underline px-2 cursor-pointer bg-transparent border-none"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Section &amp; ID</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department &amp; Post</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Shift &amp; Salary</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    No employee records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const secNo = departmentSectionMap.get(member.departmentId) || departmentSectionMap.get((member.departmentName || '').toLowerCase()) || 1;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Section Number & Employee ID */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-black text-[10px] rounded-md mr-1.5">
                          Sec #{secNo}
                        </span>
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10.5px] font-extrabold rounded-md border border-blue-100">
                          {member.employeeId}
                        </span>
                      </td>

                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
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
                            <p className="font-extrabold text-slate-900 text-sm leading-tight">{member.name}</p>
                            <span className="text-[10px] text-slate-400 font-semibold">Joined {member.joiningDate}</span>
                          </div>
                        </div>
                      </td>

                      {/* Dept & Designation / Post */}
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Briefcase size={12} className="text-blue-500" />
                          <span>{member.designation}</span>
                        </p>
                        <p className="text-slate-500 text-[11px] font-semibold mt-0.5">{member.departmentName}</p>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <Phone size={12} className="text-blue-500" /> {member.phone}
                          </p>
                          {member.email && (
                            <p className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Mail size={12} className="text-slate-400" /> {member.email}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Shift & Salary */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          member.shift === 'Morning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          member.shift === 'Evening' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          member.shift === 'Night' ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {member.shift} Shift
                        </span>
                        <p className="text-slate-800 font-extrabold mt-1">₹{member.salary.toLocaleString('en-IN')}/mo</p>
                      </td>

                      {/* Employment Type */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[10.5px]">
                          {member.employmentType}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] transition-all border border-blue-200 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Edit Employee Information"
                          >
                            <Edit3 size={13} /> Edit
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

      {/* Add / Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UserPlus size={18} />
                </div>
                <h3 className="font-black text-slate-900 text-lg">
                  {editingStaff ? 'Edit Hospital Employee' : 'Add New Hospital Employee'}
                </h3>
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
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Employee Number / ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-1042"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="staff@hospital.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Department Section *</label>
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {departments.map((d, idx) => (
                      <option key={d.id} value={d.id}>Section #{idx + 1}: {d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Post / Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Head Receptionist, Nurse, Lab Tech"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Duty Shift *</label>
                  <select
                    value={formData.shift}
                    onChange={(e: any) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Salary (₹/mo) *</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Type *</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e: any) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
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
