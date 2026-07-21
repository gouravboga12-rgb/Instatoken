import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, BellOff, CheckCircle2, Clock, Info, ShieldAlert } from 'lucide-react';

export const Notifications: React.FC = () => {
  const { notifications, clearNotifications, markNotificationsAsRead } = useApp();
  const navigate = useNavigate();

  // Mark notifications as read when opening this screen
  useEffect(() => {
    markNotificationsAsRead();
  }, []);

  const getNotifIcon = (type: 'success' | 'info' | 'warning') => {
    switch(type) {
      case 'success':
        return (
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl shrink-0">
            <CheckCircle2 size={16} />
          </div>
        );
      case 'warning':
        return (
          <div className="bg-orange-50 text-orange-600 p-2 rounded-xl shrink-0 animate-bounce">
            <ShieldAlert size={16} />
          </div>
        );
      default:
        return (
          <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0">
            <Info size={16} />
          </div>
        );
    }
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen md:min-h-0 md:bg-transparent md:pb-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 z-30 flex items-center justify-between md:rounded-2xl md:mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors bg-white shadow-xs cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight font-heading">Notifications & Updates</h2>
            <p className="text-[10px] text-slate-400 font-bold hidden md:block">Real-time alerts on your OPD tokens, wait times & doctor updates</p>
          </div>
        </div>
        
        {notifications.length > 0 && (
          <button 
            onClick={clearNotifications}
            className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="px-5 mt-4">
        {notifications.length > 0 ? (
          <div className="space-y-3.5">
            {notifications.map((notif) => (
              <Card 
                key={notif.id} 
                hoverable
                padding="sm"
                onClick={() => {
                  if (notif.message.includes("Token #") && notif.message.includes("is now ACTIVE")) {
                    // Extract token ID from message logs or go to bookings
                    navigate('/bookings');
                  }
                }}
                className={`flex gap-3 items-start border-l-4 transition-all ${
                  notif.type === 'success' 
                    ? 'border-l-emerald-500' 
                    : notif.type === 'warning' 
                      ? 'border-l-orange-500' 
                      : 'border-l-blue-500'
                } ${!notif.read ? 'bg-white font-semibold' : 'bg-white/80'}`}
              >
                {getNotifIcon(notif.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">{notif.title}</span>
                    <span className="text-[8px] text-slate-400 font-medium flex items-center gap-0.5">
                      <Clock size={8} /> {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                    {notif.message}
                  </p>
                  {!notif.read && (
                    <Badge variant="blue" className="mt-1.5 py-0 px-1.5 text-[7px] leading-none rounded-md">
                      NEW
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-inner flex flex-col items-center p-6">
            <BellOff size={36} className="text-slate-300 mb-2.5" />
            <p className="text-xs font-bold text-slate-400 font-heading">All caught up!</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">You don't have any unread booking or queue alerts right now.</p>
          </div>
        )}
      </div>

    </div>
  );
};
