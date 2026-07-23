import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { Appointment } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Clock, Calendar, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react';

export const MyBookings: React.FC = () => {
  const { appointments, cancelAppointment, deleteAppointment, clearPastHistory } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'active' | 'history'>('active');

  const activeAppts = appointments.filter(a => a.status === 'booked');
  const pastAppts = appointments.filter(a => a.status !== 'booked');

  const handleCancelClick = (id: string) => {
    if (window.confirm("Are you sure you want to cancel this OPD token? Please note: Token booking fee is NON-REFUNDABLE upon cancellation.")) {
      cancelAppointment(id);
    }
  };

  const renderCard = (appt: Appointment) => {
    const isActive = appt.status === 'booked';

    return (
      <Card
        key={appt.id}
        padding="none"
        className={`flex flex-col justify-between mb-4 border border-slate-100 overflow-hidden ${isActive ? 'cursor-pointer hover:border-blue-200 hover:shadow-md transition-all' : ''}`}
        onClick={isActive ? () => navigate(`/confirmation/${appt.id}`) : undefined}
      >
        {/* Active token: blue top accent bar */}
        {isActive && <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />}

        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <Badge 
                variant={appt.status === 'booked' ? 'blue' : appt.status === 'completed' ? 'green' : 'red'} 
                className="text-[9px] px-2 py-0.5 rounded-md mb-2"
              >
                {appt.status.toUpperCase()}
              </Badge>
              <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{appt.hospitalName}</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{appt.doctorName} • {appt.departmentName}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Token Number</span>
              <span className="text-2xl font-black text-slate-800 font-heading block leading-none mt-1">#{appt.tokenNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 border-t border-slate-50 pt-3.5 mt-3.5 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar size={13} className="text-blue-500" />
              <span>{appt.date}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Clock size={13} className="text-blue-500" />
              <span>Slot: {appt.time}</span>
            </div>
          </div>

          {isActive ? (
            <>
              <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-slate-50 text-[9.5px] text-slate-400 font-extrabold uppercase">
                <span>Consultation Fee: ₹{appt.fee} (Pay at Cabin)</span>
                <span className="text-blue-600 flex items-center gap-1">
                  View Ticket →
                </span>
              </div>
              
              <div className="flex gap-2.5 mt-3" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCancelClick(appt.id)}
                  className="flex-1 py-1.5 text-xs font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-100 hover:text-red-600 cursor-pointer"
                >
                  Cancel Token
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 text-[9.5px] text-slate-400 font-extrabold uppercase">
              <span>Consultation Fee: ₹{appt.fee} (Pay at Cabin)</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-bold">
                  {appt.status === 'completed' ? (
                    <>
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      Served
                    </>
                  ) : (
                    <>
                      <XCircle size={12} className="text-red-500" />
                      Cancelled
                    </>
                  )}
                </span>
                <button
                  onClick={() => {
                    if (window.confirm("Remove this booking from your history?")) {
                      deleteAppointment(appt.id);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete from history"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:bg-transparent md:pb-6 w-full">
      
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 flex items-center gap-3 md:rounded-2xl md:mb-6">
        <button 
          onClick={() => navigate('/')}
          className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors bg-white shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">My Booking Tokens</h2>
          <p className="text-[10px] text-slate-400 font-bold hidden md:block">Manage your active OPD appointments and history</p>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-6">
        
        {/* Top Tab Toggle Switch */}
        <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center shadow-inner">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'active'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Active Tokens</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-300/70 text-slate-700'
            }`}>
              {activeAppts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Past History</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'history' ? 'bg-blue-100 text-blue-700' : 'bg-slate-300/70 text-slate-700'
            }`}>
              {pastAppts.length}
            </span>
          </button>
        </div>

        {/* Tab Content 1: Active Tokens */}
        {activeTab === 'active' && (
          <div>
            {activeAppts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAppts.map(renderCard)}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-inner flex flex-col items-center p-6">
                <AlertCircle size={28} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400">No active bookings found</p>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => navigate('/search')}
                  className="mt-3 py-1.5 px-4 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Find Hospitals
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Past History */}
        {activeTab === 'history' && (
          <div>
            {pastAppts.length > 0 && (
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all past booking history? This action cannot be undone.")) {
                      clearPastHistory();
                    }
                  }}
                  className="text-[10px] font-extrabold text-red-500 hover:text-red-650 flex items-center gap-1 cursor-pointer hover:underline bg-red-50/50 px-2.5 py-1 rounded-lg border border-red-100/50 transition-colors"
                >
                  <Trash2 size={11} />
                  <span>Clear All History</span>
                </button>
              </div>
            )}
            
            {pastAppts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastAppts.map(renderCard)}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 p-6 flex flex-col items-center">
                <AlertCircle size={28} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400">No past appointment history available</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
