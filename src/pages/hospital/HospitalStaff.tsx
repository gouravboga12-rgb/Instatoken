import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { HospitalStaffMember, StaffAttendanceRecord } from '../../context/HospitalContext';
import {
  Users, UserPlus, Search, Phone, Mail, Clock,
  CheckCircle2, XCircle, AlertCircle, Trash2, Edit3,
  Building2
} from 'lucide-react';

export const HospitalStaff: React.FC = () => {
  const { staff, departments, addStaffMember, updateStaffMember, deleteStaffMember, markStaffAttendance } = useHospital();

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
    designation: '',
    shift: 'Morning' as 'Morning' | 'Evening' | 'Night' | 'General',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 25000,
    employmentType: 'Full-time' as 'Full-time' | 'Part-time' | 'Contract',
    status: 'active' as 'active' | 'on-leave' | 'inactive'
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter staff
  const filteredStaff = staff.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.designation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'all' || s.departmentId === selectedDept;
    const matchesShift = selectedShift === 'all' || s.shift === selectedShift;

    return matchesSearch && matchesDept && matchesShift;
  });

  // Calculate Metrics
  const totalEmployees = staff.length;
  const presentToday = staff.filter(s => {
    const todayAtt = s.attendance?.find(a => a.date === todayStr);
    return todayAtt?.status === 'present';
  }).length;
  const onLeaveToday = staff.filter(s => {
    const todayAtt = s.attendance?.find(a => a.date === todayStr);
    return todayAtt?.status === 'leave' || s.status === 'on-leave';
  }).length;
  const totalMonthlyPayroll = staff.reduce((acc, s) => acc + (Number(s.salary) || 0), 0);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      photo: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80`,
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
      photo: member.photo,
      phone: member.phone,
      email: member.email,
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

  const handleAttendanceToggle = (staffId: string, currentStatus?: string) => {
    const nextStatus: StaffAttendanceRecord['status'] =
      currentStatus === 'present' ? 'absent' : currentStatus === 'absent' ? 'half-day' : currentStatus === 'half-day' ? 'leave' : 'present';
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    markStaffAttendance(staffId, todayStr, nextStatus, nextStatus === 'present' ? nowTime : undefined);
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
            <h1 className="text-xl font-black text-slate-900">Hospital Staff & Employee Directory</h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage hospital staff members, department allocations, duty shifts, and mark daily attendance.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer border-none"
        >
          <UserPlus size={16} /> Add Staff Member
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500">Total Staff</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalEmployees}</p>
          <p className="text-[11px] text-blue-600 font-bold mt-1">Active Hospital Team</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500">Present Today</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{presentToday}</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">
            {totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 100}% Attendance
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500">On Leave / Absent</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{onLeaveToday}</p>
          <p className="text-[11px] text-amber-600 font-bold mt-1">Shift Adjusted</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-500">Monthly Payroll</p>
          <p className="text-2xl font-black text-purple-600 mt-1">₹{totalMonthlyPayroll.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-purple-600 font-bold mt-1">Estimated Compensation</p>
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
            placeholder="Search by ID, Name, Phone, Role..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Department filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Building2 size={14} className="text-slate-500" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
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
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department & Role</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Shift & Salary</th>
                <th className="py-3.5 px-4 text-center">Today's Attendance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-semibold">
                    No staff records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const todayAtt = member.attendance?.find(a => a.date === todayStr);
                  const attStatus = todayAtt?.status || 'not-marked';

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm leading-tight">{member.name}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded-md">
                              {member.employeeId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Dept & Designation */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{member.designation}</p>
                        <p className="text-slate-500 text-[11px] font-semibold">{member.departmentName}</p>
                        <span className="text-[10px] font-bold text-slate-400">{member.employmentType}</span>
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
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          member.shift === 'Morning' ? 'bg-amber-50 text-amber-700' :
                          member.shift === 'Evening' ? 'bg-indigo-50 text-indigo-700' :
                          member.shift === 'Night' ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {member.shift} Shift
                        </span>
                        <p className="text-slate-800 font-extrabold mt-1">₹{member.salary.toLocaleString('en-IN')}/mo</p>
                      </td>

                      {/* Today's Attendance Tracker */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleAttendanceToggle(member.id, todayAtt?.status)}
                          title="Click to toggle: Present -> Absent -> Half-Day -> Leave"
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] cursor-pointer transition-all border inline-flex items-center gap-1.5 ${
                            attStatus === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : attStatus === 'absent'
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : attStatus === 'half-day'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : attStatus === 'leave'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {attStatus === 'present' && <CheckCircle2 size={13} />}
                          {attStatus === 'absent' && <XCircle size={13} />}
                          {attStatus === 'half-day' && <Clock size={13} />}
                          {attStatus === 'leave' && <AlertCircle size={13} />}
                          <span className="capitalize">{attStatus === 'not-marked' ? 'Mark Attendance' : attStatus}</span>
                          {todayAtt?.checkIn && (
                            <span className="text-[9px] opacity-75">({todayAtt.checkIn})</span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border-none bg-transparent cursor-pointer"
                            title="Edit Employee"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${member.name} from hospital records?`)) {
                                deleteStaffMember(member.id);
                              }
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer"
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
                  {editingStaff ? 'Edit Staff Member' : 'Add New Hospital Employee'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
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
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address</label>
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
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Department *</label>
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Head Receptionist"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Profile Photo URL (AWS S3 Ready)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.photo}
                  onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
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
                  {editingStaff ? 'Update Member' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
