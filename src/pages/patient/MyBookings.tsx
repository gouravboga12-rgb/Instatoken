import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { Appointment } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Clock, Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const MyBookings: React.FC = () => {
  const { appointments, cancelAppointment } = useApp();
  const navigate = useNavigate();

  const activeAppts = appointments.filter(a => a.status === 'booked');
  const pastAppts = appointments.filter(a => a.status !== 'booked');

  const handleCancelClick = (id: string) => {
    if (window.confirm("Are you sure you want to cancel this booking? A refund will be processed to the original payment method.")) {
      cancelAppointment(id);
    }
  };

  const renderCard = (appt: Appointment) => {
    const isActive = appt.status === 'booked';

    return (
      <Card key={appt.id} padding="none" className="p-4 flex flex-col justify-between mb-4 border border-slate-100">
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
              <span className="text-blue-600">Pass used</span>
            </div>
            
            <div className="flex gap-2.5 mt-3">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => navigate(`/livestatus/${appt.id}`)}
                className="flex-1 py-1.5 text-xs font-bold rounded-xl cursor-pointer"
              >
                Track Live Queue
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleCancelClick(appt.id)}
                className="py-1.5 text-xs font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-100 hover:text-red-600 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 text-[9.5px] text-slate-400 font-extrabold uppercase">
            <span>Consultation Fee: ₹{appt.fee} (Pay at Cabin)</span>
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
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:bg-transparent md:pb-6 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 flex items-center gap-3">
        <button 
          onClick={() => navigate('/')}
          className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors bg-white shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">My Booking Tokens</h2>
      </div>

      <div className="px-5 mt-4">
        
        {/* Active Bookings Section */}
        <div className="mb-6">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Active Tokens</h3>
          {activeAppts.length > 0 ? (
            activeAppts.map(renderCard)
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

        {/* Past History Section */}
        <div>
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Past History</h3>
          {pastAppts.length > 0 ? (
            pastAppts.map(renderCard)
          ) : (
            <div className="text-center py-6 bg-slate-100/50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400">No past appointment history available</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
