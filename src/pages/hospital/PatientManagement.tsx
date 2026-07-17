import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import type { PatientRecord } from '../../context/HospitalContext';
import { Search, Plus, Calendar, User, Phone, MapPin, ShieldAlert, FileText } from 'lucide-react';

export const PatientManagement: React.FC = () => {
  const { patients, addPatient, tokens } = useHospital();
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Patient Form
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male',
    bloodGroup: 'B+',
    address: '',
    city: 'Bengaluru',
    pinCode: '',
    familyMembers: [] as { name: string; relation: string; age: number }[],
    medicalHistory: '',
    allergies: ''
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = {
      name: newPatient.name,
      phone: newPatient.phone,
      email: newPatient.email,
      age: parseInt(newPatient.age) || 30,
      gender: newPatient.gender,
      bloodGroup: newPatient.bloodGroup,
      address: newPatient.address,
      city: newPatient.city,
      pinCode: newPatient.pinCode,
      familyMembers: newPatient.familyMembers,
      medicalHistory: newPatient.medicalHistory ? newPatient.medicalHistory.split(',').map(m => m.trim()) : [],
      allergies: newPatient.allergies ? newPatient.allergies.split(',').map(a => a.trim()) : []
    };
    addPatient(formatted);
    setShowAddModal(false);
    setNewPatient({
      name: '', phone: '', email: '', age: '', gender: 'Male', bloodGroup: 'B+', address: '', city: 'Bengaluru', pinCode: '', familyMembers: [], medicalHistory: '', allergies: ''
    });
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.uhid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Patient Records</h2>
          <p className="text-xs text-slate-400 mt-1">Search, view medical history, visit timelines, and register patients</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none flex items-center gap-1.5 text-xs shadow-md shadow-blue-500/10 self-start"
        >
          <Plus size={14} /> Register New Patient
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Patient List (2 cols on xl) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
              <input
                type="text"
                placeholder="Search patient by UHID, Name, Mobile..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['UHID', 'Patient Name', 'Phone', 'Blood', 'Visits', 'Last Visit', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-extrabold text-xs text-blue-600">{p.uhid}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 text-xs leading-none">{p.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.gender}, {p.age} Years</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-semibold">{p.phone}</td>
                      <td className="px-4 py-3"><span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">{p.bloodGroup}</span></td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">{p.totalVisits}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.lastVisit || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedPatient(p)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-bold rounded-lg text-[10px] cursor-pointer transition-colors border-none"
                        >
                          View File
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Selected Patient Details Card */}
        <div>
          {selectedPatient ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">{selectedPatient.uhid}</span>
                  <h3 className="text-base font-black text-slate-800 mt-2">{selectedPatient.name}</h3>
                  <p className="text-xs text-slate-450 mt-0.5">{selectedPatient.gender} · {selectedPatient.age} Y · Blood Group {selectedPatient.bloodGroup}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 font-extrabold">
                  {selectedPatient.name.charAt(0)}
                </div>
              </div>

              {/* Contact info */}
              <div className="border-t border-b border-slate-50 py-3 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> <span>{selectedPatient.phone}</span></div>
                <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> <span>Registered on: {selectedPatient.registeredOn}</span></div>
                <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> <span className="truncate">{selectedPatient.address}, {selectedPatient.city}</span></div>
              </div>

              {/* Medical Conditions */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Medical History</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPatient.medicalHistory.map(m => (
                    <span key={m} className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-150 px-2 py-1 rounded-lg flex items-center gap-1"><FileText size={10} /> {m}</span>
                  ))}
                  {selectedPatient.medicalHistory.length === 0 && <span className="text-xs text-slate-400">None declared</span>}
                </div>
              </div>

              {/* Allergies */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 text-red-500">Allergies / Critical</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPatient.allergies.map(a => (
                    <span key={a} className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded-lg flex items-center gap-1"><ShieldAlert size={10} /> {a}</span>
                  ))}
                  {selectedPatient.allergies.length === 0 && <span className="text-xs text-slate-450 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">No known allergies</span>}
                </div>
              </div>

              {/* Visit Logs */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">Token Appointment History</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tokens.filter(t => t.patientPhone === selectedPatient.phone).map(tok => (
                    <div key={tok.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-slate-200 transition-colors">
                      <div>
                        <p className="font-bold text-slate-800">Token #{tok.tokenNo}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{tok.doctorName} · {tok.departmentName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-500 block">{tok.bookingDate}</span>
                        <span className="text-[9px] font-extrabold text-blue-600 block mt-0.5 capitalize">{tok.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-slate-400 py-20 text-xs">
              <User size={30} className="mx-auto mb-2 text-slate-300" />
              Select a patient from the list to view medical profile, history and visit logs
            </div>
          )}
        </div>
      </div>

      {/* ─── REGISTER PATIENT MODAL ─────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">Register New Patient</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-50 cursor-pointer border-none text-slate-400">✕</button>
            </div>
            <form onSubmit={handleRegister} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Full Name *</label>
                  <input type="text" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} placeholder="e.g. Anand Kumar" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone *</label>
                  <input type="tel" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} placeholder="10 digit number" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Email</label>
                  <input type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} placeholder="e.g. anand@email.com" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Age</label>
                  <input type="number" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} placeholder="35" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Blood Group</label>
                  <select value={newPatient.bloodGroup} onChange={e => setNewPatient({...newPatient, bloodGroup: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white">
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Complete Address</label>
                  <input type="text" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} placeholder="Area, Building name..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Medical History (comma separated)</label>
                  <input type="text" value={newPatient.medicalHistory} onChange={e => setNewPatient({...newPatient, medicalHistory: e.target.value})} placeholder="e.g. Asthma, Hypertension" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Allergies (comma separated)</label>
                  <input type="text" value={newPatient.allergies} onChange={e => setNewPatient({...newPatient, allergies: e.target.value})} placeholder="e.g. Penicillin, Nuts" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-655 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl border-none cursor-pointer">Register Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
