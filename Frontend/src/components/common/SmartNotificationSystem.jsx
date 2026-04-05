import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Clock, 
  User, 
  Stethoscope, 
  X, 
  MapPin, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Globe,
  Zap,
  Phone,
  Mail,
  Info
} from 'lucide-react';
import { io } from 'socket.io-client';
import { format, isSameDay, parse, subMinutes, addMinutes, isAfter, isBefore } from 'date-fns';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SmartNotificationSystem = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [activePopups, setActivePopups] = useState([]);
  const [realTimePopups, setRealTimePopups] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const processedRef = useRef(new Set()); // Format: apptId_type (e.g. 123_reminder, 123_now, 123_late)
  const socketRef = useRef(null);

  // Only run for Admin/Receptionist roles
  const canSeeNotifications = ['admin', 'receptionist', 'orgadmin'].includes(user?.role?.toLowerCase());

  const fetchTodayAppointments = async () => {
    if (!canSeeNotifications) return;
    try {
      const { data } = await api.get('/appointments');
      const today = new Date();
      const filtered = data.filter(app => {
        const appDate = new Date(app.date);
        return isSameDay(appDate, today) && app.status !== 'completed' && app.status !== 'cancelled';
      });
      setAppointments(filtered);
    } catch (err) {
      console.error('Notification error fetching:', err);
    }
  };

  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    try {
      const startTimePart = timeStr.split('-')[0].trim();
      return parse(startTimePart, 'h:mm a', new Date()).getTime();
    } catch (e) {
      return 0;
    }
  };

  const checkTriggers = () => {
    if (!canSeeNotifications || appointments.length === 0) return;

    const now = new Date();
    const nowTime = now.getTime();
    const newPopups = [];

    appointments.forEach(app => {
      const appTime = parseTime(app.time);
      if (!appTime) return;

      // 1. Reminder (10 mins before)
      const reminderTriggerTime = appTime - (10 * 60 * 1000);
      const reminderKey = `${app._id}_reminder`;
      if (nowTime >= reminderTriggerTime && nowTime < appTime && !processedRef.current.has(reminderKey)) {
        newPopups.push({ ...app, type: 'reminder', title: 'Upcoming Appointment' });
        processedRef.current.add(reminderKey);
      }

      // 2. Start (Exact time)
      const nowKey = `${app._id}_now`;
      if (nowTime >= appTime && nowTime < appTime + (1 * 60 * 1000) && !processedRef.current.has(nowKey)) {
        newPopups.push({ ...app, type: 'now', title: 'Appointment Now' });
        processedRef.current.add(nowKey);
      }

      // 3. Late (5 mins after, if not arrived)
      const lateTriggerTime = appTime + (5 * 60 * 1000);
      const lateKey = `${app._id}_late`;
      if (nowTime >= lateTriggerTime && app.status !== 'in-progress' && !processedRef.current.has(lateKey)) {
        newPopups.push({ ...app, type: 'late', title: 'Patient Late' });
        processedRef.current.add(lateKey);
      }
    });

    if (newPopups.length > 0) {
      setActivePopups(prev => [...prev, ...newPopups]);
      // Play a subtle notification sound if allowed
      try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e) {}
    }
  };

  useEffect(() => {
    if (!canSeeNotifications) return;
    fetchTodayAppointments();
    const fetchInterval = setInterval(fetchTodayAppointments, 5 * 60 * 1000); // 5 mins
    const checkInterval = setInterval(checkTriggers, 30 * 1000); // 30 seconds

    return () => {
      clearInterval(fetchInterval);
      clearInterval(checkInterval);
    };
  }, [user?.role, user?.id]);

  // Socket.io Real-time Receiver
  useEffect(() => {
    if (!canSeeNotifications || !user) return;

    const rawOrgId = user.organizationId || user.organization?._id || user.organization;
    const orgId = typeof rawOrgId === 'object' ? (rawOrgId?._id || rawOrgId?.id) : rawOrgId;
    
    if (!orgId) return;

    const orgIdStr = String(orgId);

    let socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    if (socketUrl.endsWith('/api')) {
      socketUrl = socketUrl.replace('/api', '');
    }
    
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-tenant', orgIdStr);
    });

    socket.on('public-appointment-booked', (data) => {
      
      const newBooking = {
        ...data.appointment,
        uniqueId: `rt_${data.appointment._id}_${Date.now()}`,
        type: 'public_booking',
        title: 'New Web Booking'
      };

      setRealTimePopups(prev => [newBooking, ...prev]);
      
      // Play notification sound
      try { 
        new Audio('/notification.mp3').play().catch(() => {}); 
      } catch(e) {}
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user, canSeeNotifications]);

  const dismissPopup = (id) => {
    setActivePopups(prev => prev.filter(p => `${p._id}_${p.type}` !== id));
  };

  const dismissRealTimePopup = (uniqueId) => {
    setRealTimePopups(prev => prev.filter(p => p.uniqueId !== uniqueId));
  };

  const handleAction = async (app, action) => {
    try {
      if (action === 'arrive') {
        await api.put(`/appointments/${app._id}/status`, { status: 'in-progress' });
      } else if (action === 'cancel') {
        await api.put(`/appointments/${app._id}/status`, { status: 'cancelled' });
      } else if (action === 'reschedule') {
        // Navigate
        const path = user.role === 'receptionist' ? '/receptionist/appointments' : '/admin/appointments';
        window.location.href = path;
      }
      dismissPopup(`${app._id}_${app.type}`);
      fetchTodayAppointments();
    } catch (err) {
      console.error('Popup action error:', err);
    }
  };

  if (!canSeeNotifications || (activePopups.length === 0 && realTimePopups.length === 0)) return null;

  return (
    <>
      <div className="fixed top-6 right-6 z-[10000] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {/* Scheduled/Interval Popups */}
          {activePopups.map((popup) => {
            const id = `${popup._id}_${popup.type}`;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: 200, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                className={`p-6 w-96 rounded-3xl shadow-2xl border pointer-events-auto bg-white/95 backdrop-blur-xl ${
                  popup.type === 'late' ? 'border-rose-100 shadow-rose-200/50' : 
                  popup.type === 'now' ? 'border-blue-100 shadow-blue-200/50' : 
                  'border-amber-100 shadow-amber-200/50'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      popup.type === 'late' ? 'bg-rose-500 text-white' : 
                      popup.type === 'now' ? 'bg-blue-600 text-white' : 
                      'bg-amber-500 text-white'
                    }`}>
                      {popup.type === 'late' ? <AlertCircle size={20} /> : <Bell size={20} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 leading-none mb-1">
                        {popup.title}
                      </h3>
                      <p className="text-xs font-bold text-slate-500">{popup.time}</p>
                    </div>
                  </div>
                  <button onClick={() => dismissPopup(id)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Patient/Doctor Info */}
                <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                      {popup.patientName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{popup.patientName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Age: {popup.patientAge} Years</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Stethoscope size={14} className="text-indigo-500" />
                    <p className="text-xs font-bold uppercase tracking-tight">Dr. {popup.doctorName}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button 
                    onClick={() => handleAction(popup, 'arrive')}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                  >
                    <CheckCircle2 size={14} />
                    Mark Arrived
                  </button>
                  <button 
                    onClick={() => handleAction(popup, 'reschedule')}
                    className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition"
                  >
                    <CalendarDays size={14} />
                    Reschedule
                  </button>
                </div>
                <button 
                  onClick={() => handleAction(popup, 'cancel')}
                  className="w-full py-2.5 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition"
                >
                  Cancel Appointment
                </button>
              </motion.div>
            );
          })}

          {/* Real-time Public Booking Popups */}
          {realTimePopups.map((popup) => (
            <motion.div
              key={popup.uniqueId}
              initial={{ opacity: 0, x: 200, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 100, transition: { duration: 0.2 } }}
              className="p-6 w-96 rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.2)] border border-blue-100 pointer-events-auto bg-white/95 backdrop-blur-2xl relative overflow-hidden group"
            >
              {/* Subtle animated background element */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl group-hover:bg-blue-100 transition-colors duration-500" />
              
              {/* Header */}
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                    <Globe size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.15em] text-blue-600 leading-none mb-1">
                      {popup.title}
                    </h3>
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Just Now • Web Portal</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => dismissRealTimePopup(popup.uniqueId)} 
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-300 hover:text-slate-500 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Message Content */}
              <div className="mb-6 relative z-10">
                <p className="text-slate-600 font-medium text-sm leading-relaxed">
                   <span className="font-black text-slate-900">{popup.patientName}</span> has booked an appointment with <span className="font-black text-blue-700">Dr. {popup.doctorName}</span> on <span className="font-bold text-slate-800">{popup.date}</span>.
                </p>
              </div>

              {/* View Detail Button */}
              <button 
                onClick={() => setSelectedDetail(popup)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Zap size={14} className="fill-current" />
                View Detail
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail Modal for Public Booking */}
      <AnimatePresence>
        {selectedDetail && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
             >
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
                   <button 
                     onClick={() => setSelectedDetail(null)}
                     className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                   >
                     <X size={20} />
                   </button>
                   
                   <div className="flex items-center gap-5 mb-6">
                      <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-black">
                         {selectedDetail.patientName?.charAt(0)}
                      </div>
                      <div>
                         <h2 className="text-2xl font-black tracking-tight leading-none mb-2">{selectedDetail.patientName}</h2>
                         <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Web Booking</span>
                            <span className="px-3 py-1 bg-emerald-400 text-emerald-950 rounded-full text-[10px] font-black uppercase tracking-widest">New Patient</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                         <p className="text-[10px] font-black uppercase text-blue-100 tracking-wider mb-1">Appointment Date</p>
                         <p className="font-bold">{selectedDetail.date}</p>
                      </div>
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                         <p className="text-[10px] font-black uppercase text-blue-100 tracking-wider mb-1">Time Slot</p>
                         <p className="font-bold">{selectedDetail.time}</p>
                      </div>
                   </div>
                </div>

                <div className="p-10 space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 block">Patient Info</label>
                            <div className="space-y-3">
                               <div className="flex items-center gap-3 text-slate-600">
                                  <Phone size={16} className="text-blue-500" />
                                  <span className="text-sm font-bold">{selectedDetail.patientPhone || 'N/A'}</span>
                               </div>
                               <div className="flex items-center gap-3 text-slate-600">
                                  <Mail size={16} className="text-blue-500" />
                                  <span className="text-sm font-bold truncate max-w-[180px]">{selectedDetail.patientEmail || 'N/A'}</span>
                               </div>
                               {selectedDetail.patientDetails?.age && (
                                <div className="flex items-center gap-3 text-slate-600">
                                   <Info size={16} className="text-blue-500" />
                                   <span className="text-sm font-bold">Age: {selectedDetail.patientDetails.age} ({selectedDetail.patientDetails.gender})</span>
                                </div>
                               )}
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 block">Assigned Doctor</label>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                               <div className="flex items-center gap-3">
                                  <Stethoscope size={18} className="text-indigo-600" />
                                  <div>
                                     <p className="text-sm font-black text-slate-800">Dr. {selectedDetail.doctorName}</p>
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedDetail.specialty}</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-slate-100 flex gap-4">
                      <button 
                        onClick={() => setSelectedDetail(null)}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Close
                      </button>
                      <button 
                         onClick={() => {
                           const path = user.role === 'receptionist' ? '/receptionist/appointments' : '/admin-dashboard';
                           window.location.href = path;
                         }}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Go to Schedule
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartNotificationSystem;
