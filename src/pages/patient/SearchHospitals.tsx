import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getHospitalSVGImage } from '../../utils/mockData';
import { Card } from '../../components/ui/Card';
import { Search, MapPin, Clock, Star, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface SearchHospitalsProps {
  onHospitalSelect: (id: string) => void;
  defaultFilter?: string;
}

export const SearchHospitals: React.FC<SearchHospitalsProps> = ({ 
  onHospitalSelect, 
  defaultFilter = '' 
}) => {
  const { hospitals } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Search and filter states
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get('specialty') || 'All');
  const [activeFilter, setActiveFilter] = useState<string>(defaultFilter || searchParams.get('filter') || 'all');
  
  useEffect(() => {
    const q = searchParams.get('q');
    const specialty = searchParams.get('specialty');
    const filter = searchParams.get('filter');
    if (q !== null) setQuery(q);
    if (specialty !== null) setSelectedSpecialty(specialty);
    if (filter !== null) setActiveFilter(filter);
  }, [searchParams]);

  // Available specialties for filter
  const specialties = ['All', 'Multi Speciality', 'Children Hospital', 'Eye Hospital', 'Dental Clinic', 'Orthopedic', 'Cardiology', 'Neurology', 'ENT', 'Gynecology'];

  // Filter & sort logic
  const getFilteredHospitals = () => {
    let list = [...hospitals];

    // Filter by text search (name, address, category, doctors)
    if (query.trim()) {
      const qLower = query.toLowerCase();
      list = list.filter(h => 
        h.name.toLowerCase().includes(qLower) || 
        h.category.toLowerCase().includes(qLower) ||
        h.address.toLowerCase().includes(qLower) ||
        h.doctors.some(d => d.name.toLowerCase().includes(qLower) || d.specialty.toLowerCase().includes(qLower))
      );
    }

    // Filter by specialty dropdown/pill
    if (selectedSpecialty !== 'All') {
      list = list.filter(h => h.category === selectedSpecialty || h.departments.some(d => d.name === selectedSpecialty));
    }

    // Apply quick filters & sorts
    if (activeFilter === 'nearby') {
      list.sort((a, b) => a.distance - b.distance);
    } else if (activeFilter === 'top-rated') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (activeFilter === 'short-wait') {
      list.sort((a, b) => {
        const aWait = a.baseWaitingTime + a.doctors.reduce((acc, doc) => acc + Math.max(0, doc.nextAvailableToken - doc.currentQueue - 1) * doc.estimatedWaitPerPatient, 0) / (a.doctors.length || 1);
        const bWait = b.baseWaitingTime + b.doctors.reduce((acc, doc) => acc + Math.max(0, doc.nextAvailableToken - doc.currentQueue - 1) * doc.estimatedWaitPerPatient, 0) / (b.doctors.length || 1);
        return aWait - bWait;
      });
    } else if (activeFilter === 'lowest-fee') {
      list.sort((a, b) => {
        const aMin = Math.min(...a.doctors.map(d => d.consultationFee), 500);
        const bMin = Math.min(...b.doctors.map(d => d.consultationFee), 500);
        return aMin - bMin;
      });
    } else if (activeFilter === 'emergency') {
      list = list.filter(h => h.facilities.includes("24/7 Emergency") || h.facilities.includes("24/7 Emergency Care") || h.facilities.includes("24/7 Neonatal Emergency"));
    }

    return list;
  };

  const filteredHospitals = getFilteredHospitals();

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:bg-transparent md:min-h-0 md:pb-6">
      
      {/* Mobile Search Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 space-y-3 md:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search hospital or doctor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Mobile Sorting Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {['all', 'nearby', 'top-rated', 'short-wait', 'lowest-fee'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 cursor-pointer border uppercase tracking-wider text-[9px] ${
                activeFilter === f 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-slate-500 border-slate-100'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Desktop Search & Sidebar Container */}
      <div className="flex flex-col md:flex-row gap-6 mt-4 md:mt-0">
        
        {/* Left Filter Sidebar (Desktop Only) */}
        <div className="hidden md:block w-64 shrink-0 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs h-fit sticky top-20">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Sorting Filter</h3>
          
          <div className="space-y-2 mb-6">
            {[
              { id: 'all', label: 'Recommended' },
              { id: 'nearby', label: 'Nearest Distance' },
              { id: 'top-rated', label: 'Highest Rated' },
              { id: 'short-wait', label: 'Shortest Waiting' },
              { id: 'lowest-fee', label: 'Lowest Consulting Fee' },
              { id: 'emergency', label: 'Emergency Facilities' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`w-full text-left px-3 py-2 text-xs rounded-xl font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                  activeFilter === f.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
                {activeFilter === f.id && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Specialties</h3>
          <div className="space-y-1.5">
            {specialties.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
                  selectedSpecialty === spec ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Right Search Result List */}
        <div className="flex-1 px-5 md:px-0">
          
          {/* Desktop Search Header */}
          <div className="hidden md:flex items-center justify-between gap-4 mb-5">
            <div className="relative max-w-md w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search hospital or doctor..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm text-sm focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {filteredHospitals.length} centers found
            </p>
          </div>

          {/* Mobile Specialties Slider */}
          <div className="mb-4 md:hidden">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Filter by Specialty</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {specialties.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${selectedSpecialty === spec ? 'bg-slate-800 text-white' : 'bg-white border border-slate-100 text-slate-600'}`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 font-semibold mb-4 md:hidden">
            Showing {filteredHospitals.length} hospitals found
          </p>

          {/* Hospital Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHospitals.length > 0 ? (
              filteredHospitals.map((hosp) => {
                const totalWaitTime = hosp.doctors.reduce((acc, doc) => {
                  const ahead = Math.max(0, doc.nextAvailableToken - doc.currentQueue - 1);
                  return acc + (ahead * doc.estimatedWaitPerPatient);
                }, 0);
                const avgWait = Math.round(totalWaitTime / (hosp.doctors.length || 1)) + hosp.baseWaitingTime;
                const minFee = hosp.doctors.length > 0 ? Math.min(...hosp.doctors.map(d => d.consultationFee)) : 0;

                return (
                  <Card 
                    key={hosp.id} 
                    hoverable 
                    padding="none" 
                    onClick={() => onHospitalSelect(hosp.id)}
                    className="overflow-hidden bg-white border border-slate-150 rounded-3xl shadow-2xs cursor-pointer flex flex-col justify-between h-full"
                  >
                    {/* Image Container with Badges Overlay */}
                    <div className="h-40 sm:h-44 w-full relative bg-slate-100">
                      <img 
                        src={hosp.image} 
                        alt={hosp.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = getHospitalSVGImage(hosp.name); }}
                      />
                      {/* Gradient Overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      
                      {/* Top Row: Verified Badge (Left) & Star Rating (Right) */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                        <span className="bg-white/95 backdrop-blur-md text-emerald-700 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-emerald-50">
                          <span className="w-3 h-3 bg-emerald-500 text-white rounded-full text-[7px] font-black inline-flex items-center justify-center">✓</span>
                          Verified
                        </span>
                        
                        <span className="bg-black/40 backdrop-blur-md text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-white/10">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          <span>{hosp.rating}</span>
                        </span>
                      </div>

                      {/* Bottom Text Overlay: Hospital Name & Address */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h4 className="font-extrabold text-sm tracking-tight truncate leading-none">
                          {hosp.name}
                        </h4>
                        <p className="text-[10px] text-slate-200 font-medium truncate mt-1">
                          {hosp.address}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Details area */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      
                      {/* Category & Fee badge row */}
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="bg-blue-50 text-blue-700 font-extrabold text-[9px] px-2 py-0.5 rounded-lg border border-blue-100/50">
                          {hosp.category}
                        </span>
                        {minFee > 0 && (
                          <span className="text-slate-700 font-extrabold text-xs">
                            ₹{minFee}+ Fee
                          </span>
                        )}
                      </div>

                      {/* Map Pins and wait timing metrics */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-blue-500 shrink-0" />
                          {hosp.distance} km
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-emerald-500 shrink-0" />
                          {avgWait}m wait
                        </span>
                      </div>
                    </div>

                    {/* Doctor preview strip */}
                    <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[9px] text-slate-400 font-semibold uppercase">
                        {hosp.doctors.length} Doctors Available
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onHospitalSelect(hosp.id);
                        }}
                        className="text-[10px] text-white font-extrabold bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/20 transition-colors"
                      >
                        Book OPD Token
                      </button>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-xs">
                <p className="text-sm font-bold text-slate-400">No hospitals match your search criteria</p>
                <button 
                  onClick={() => { setQuery(''); setSelectedSpecialty('All'); setActiveFilter('all'); }}
                  className="mt-3 text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
