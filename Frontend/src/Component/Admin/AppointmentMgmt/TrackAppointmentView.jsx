import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, 
  Clock, 
  User, 
  Stethoscope, 
  ChevronRight, 
  Search, 
  Calendar, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Timer,
  Flag,
  CalendarDays,
  AlertCircle,
  X,
  Loader2,
  MessageSquare,
  Sparkles,
  Zap,
  FileText
} from 'lucide-react';
import { format, isSameDay, parse, addMinutes } from 'date-fns';
import api from '../../../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';

const TrackAppointmentView = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('all'); 

  // Socket state
  const socketRef = useRef(null);

  // Modal State
  const [rescheduleData, setRescheduleData] = useState(null); 
  const [cancelData, setCancelData] = useState(null); 
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null); 
  
  // Visit Notes State
  const [visitNotesData, setVisitNotesData] = useState(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // AI Summary State
  const [aiSummaryData, setAiSummaryData] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchTodayAppointments = async () => {
    try {
      setLoading(true);
      // Pass local date to ensure we don't get yesterday's appointments based on UTC server time
      const todayDateStr = format(new Date(), 'yyyy-MM-dd');
      const { data } = await api.get(`/appointments/today?date=${todayDateStr}`);
      setAppointments(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching today\'s appointments:', err);
      setError('Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAppointments();
    
    // Initialize Socket.io
    let socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    if (socketUrl.endsWith('/api')) {
      socketUrl = socketUrl.replace('/api', '');
    }
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      if (user?.organizationId) {
        socket.emit('join-tenant', user.organizationId);
      }
    });

    socket.on('appointment-updated', (data) => {
      
      setAppointments(prev => {
        const appointmentId = data.appointmentId || data.appointment?._id || data.appointment?.id;
        if (!appointmentId) return prev;

        const idStr = appointmentId.toString();

        if (data.type === 'cancelled') {
           return prev.filter(app => (app._id || app.id)?.toString() !== idStr);
        }
        
        const index = prev.findIndex(app => (app._id || app.id)?.toString() === idStr);
        
        if (index !== -1) {
          console.log(`Updating row index ${index} for ID ${idStr}`);
          const newAppts = [...prev];
          newAppts[index] = data.appointment;
          return newAppts;
        } else {
          // If it's a new appointment or migrated from another collection for today, add it
          const appDateStr = data.appointment?.appointmentDate || data.appointment?.date;
          const todayStr = new Date().toISOString().split('T')[0];
          
          if (appDateStr === todayStr) {
            console.log('Adding new appointment for today:', idStr);
            return [...prev, data.appointment];
          }
          return prev;
        }
      });
    });

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    try {
      const startTimePart = timeStr.split('-')[0].trim();
      // Try formats: 11:00 AM, 11:00 (24h), 11:00 (no AM/PM)
      let parsed = parse(startTimePart, 'h:mm a', new Date());
      if (isNaN(parsed.getTime())) {
        parsed = parse(startTimePart, 'HH:mm', new Date());
      }
      if (isNaN(parsed.getTime())) {
        parsed = parse(startTimePart, 'h:mm', new Date());
      }
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    } catch (e) {
      return 0;
    }
  };

  const handleStatusUpdate = async (id, newStatus, extraData = {}) => {
    try {
      setProcessingId(id);
      let res;
      if (newStatus === 'cancelled') {
        res = await api.delete(`/appointments/${id}`);
        if (res.status === 200) {
          setAppointments(prev => prev.filter(app => (app._id || app.id)?.toString() !== id.toString()));
        }
      } else {
        res = await api.patch(`/appointments/${id}/status`, { status: newStatus, ...extraData });
        if (res.status === 200) {
          // Immediate Local Update
          setAppointments(prev => prev.map(app => 
            (app._id || app.id)?.toString() === id.toString() ? res.data : app
          ));
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) return;
    try {
      setProcessingId(rescheduleData.id);
      const res = await api.patch(`/appointments/${rescheduleData.id}/reschedule`, { 
        appointmentDate: rescheduleData.date, 
        appointmentTime: rescheduleData.time 
      });
      if (res.status === 200) {
        // Immediate Local Update
        setAppointments(prev => prev.map(app => 
          (app._id || app.id)?.toString() === rescheduleData.id.toString() ? res.data : app
        ));
      }
      setRescheduleData(null);
    } catch (err) {
      console.error('Reschedule error:', err);
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleWhatsAppNotify = (app) => {
    const phone = app.patientPhone?.replace(/\D/g, '');
    if (!phone) return alert('No phone number available for this patient.');
    
    const message = `Today is your appointment book with ${app.doctorName} on ${app.time} and ${app.date}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSaveNotes = async () => {
    if (!visitNotesData?.id) return;
    setIsSavingNotes(true);
    try {
      const res = await api.put(`/appointments/${visitNotesData.id}/notes`, { visitNotes: visitNotesData.notes });
      if (res.status === 200) {
        setAppointments(prev => prev.map(app => 
          (app._id || app.id)?.toString() === visitNotesData.id.toString() ? { ...app, visitNotes: visitNotesData.notes } : app
        ));
        setVisitNotesData(null);
      }
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save visit notes. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const fetchSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setSlotsLoading(true);
    try {
      const res = await api.get(`/doctors/${doctorId}/slots?date=${date}`);
      if (res.status === 200 && res.data.available) {
        setAvailableSlots(res.data.slots.map(s => typeof s === 'string' ? s : s.time));
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (rescheduleData?.doctorId && rescheduleData?.date) {
      fetchSlots(rescheduleData.doctorId, rescheduleData.date);
    }
  }, [rescheduleData?.doctorId, rescheduleData?.date]);

  const handleFetchAiSummary = async (patientId, patientName, currentSymptoms = '') => {
    try {
      setIsAiLoading(true);
      setAiSummaryData({ loading: true, patientName, text: null });
      
      let baseText = '';
      if (currentSymptoms && currentSymptoms.trim().toLowerCase() !== 'none' && currentSymptoms.trim() !== '') {
          baseText = `📌 CURRENT VISIT REASON:\n${currentSymptoms}\n\n‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\n🏥 MAYA MEDICAL HISTORY ANALYSIS:\n`;
      } else {
          baseText = `🏥 MAYA MEDICAL HISTORY ANALYSIS:\n`;
      }

      const res = await api.get(`/patients/${patientId}/ai-summary`);
      if (res.status === 200 && res.data.text) {
        setAiSummaryData({ loading: false, patientName, text: baseText + res.data.text });
      } else {
        setAiSummaryData({ loading: false, patientName, text: baseText + 'No prior medical history available on record.' });
      }
    } catch (err) {
      console.error('Error fetching AI Summary:', err);
      let errorText = '';
      if (currentSymptoms && currentSymptoms.trim().toLowerCase() !== 'none' && currentSymptoms.trim() !== '') {
          errorText = `📌 CURRENT VISIT REASON:\n${currentSymptoms}\n\n‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\n🏥 MAYA MEDICAL HISTORY ANALYSIS:\nNo prior medical history available on record.`;
      } else {
          errorText = `🏥 MAYA MEDICAL HISTORY ANALYSIS:\nNo prior medical history available on record.`;
      }
      setAiSummaryData({ loading: false, patientName, text: errorText });
    } finally {
      setIsAiLoading(false);
    }
  };

  const getStatusInfo = (app) => {
    if (app.status === 'completed') return { label: 'CONFIRMED', color: 'green', bg: 'bg-green-100 text-green-700' };
    if (app.status === 'missed') return { label: 'Missed', color: 'red', bg: 'bg-red-100 text-red-700' };
    if (app.status === 'in-progress' || app.status === 'confirmed') return { label: 'CONFIRMED', color: 'green', bg: 'bg-green-100 text-green-700' };
    if (app.status === 'cancelled') return { label: 'Cancelled', color: 'slate', bg: 'bg-slate-100 text-slate-700' };

    const startTime = parseTime(app.time);
    const now = currentTime.getTime();

    // If more than 10 minutes past start time and still pending/confirmed
    if (startTime > 0 && now > startTime + (10 * 60 * 1000)) {
      return { label: 'Missed', color: 'red', bg: 'bg-red-100 text-red-700' };
    }

    return { label: 'Upcoming', color: 'yellow', bg: 'bg-yellow-100 text-yellow-700' };
  };
  
  // Check if date is in the future (after today)
  const isFutureDate = (dateStr) => {
    if (!dateStr) return false;
    const appDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appDate.setHours(0, 0, 0, 0);
    return appDate > today;
  };

  const isCurrentApp = (app) => {
    if (app.status === 'in-progress') return true;
    if (app.status === 'completed' || app.status === 'cancelled' || app.status === 'missed') return false;

    const startTime = parseTime(app.time);
    const now = currentTime.getTime();
    const duration = 30 * 60 * 1000;
    
    return startTime > 0 && now >= startTime && now < startTime + duration;
  };

  const processedAppointments = useMemo(() => {
    return appointments
      .filter(app => {
        // Search Filter
        const matchesSearch = 
          app.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.doctorName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        // Tab Filter
        if (activeFilter === 'all') return true;
        if (activeFilter === 'confirmed') return app.status === 'completed';
        if (activeFilter === 'cancelled') return app.status === 'cancelled';
        if (activeFilter === 'missed') return getStatusInfo(app).label === 'Missed';
        if (activeFilter === 'rescheduled') return app.isRescheduled === true;
        
        return true;
      })
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));
  }, [appointments, searchTerm, activeFilter, currentTime]);

  return (
    <div className="bg-gray-50 min-h-screen p-6 relative">
      <div className="max-w-full mx-auto space-y-6">
        
        {/* Professional Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-800">Today's Appointments</h1>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-bold shadow-sm">
                <Timer size={14} className="animate-pulse" />
                <span>LIVE: {format(currentTime, 'hh:mm:ss a')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                <Zap size={10} className="animate-bounce" />
                <span>Real-Time Active</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm font-medium">
              <Calendar size={14} />
              <span>{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search patient or doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
              />
            </div>
            <button 
              onClick={fetchTodayAppointments}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 shadow-sm"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox label="Total Today" value={appointments.length} icon={<Calendar className="text-blue-500" />} />
          <StatBox label="Upcoming" value={appointments.filter(a => getStatusInfo(a).label === 'Upcoming').length} icon={<ClockIcon className="text-yellow-500" />} />
          <StatBox label="In Progress" value={appointments.filter(a => a.status === 'in-progress').length} icon={<Activity className="text-blue-500" />} />
          <StatBox label="Completed" value={appointments.filter(a => a.status === 'completed').length} icon={<CheckCircle className="text-green-500" />} />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl w-fit border border-gray-200">
          {[
            { id: 'all', label: 'All', count: appointments.length },
            { id: 'confirmed', label: 'Confirmed', count: appointments.filter(a => a.status === 'completed').length },
            { id: 'cancelled', label: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length },
            { id: 'missed', label: 'Not Arrived', count: appointments.filter(a => getStatusInfo(a).label === 'Missed').length },
            { id: 'rescheduled', label: 'Rescheduled', count: appointments.filter(a => a.isRescheduled).length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeFilter === tab.id 
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                activeFilter === tab.id ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4 text-center">Age</th>
                  <th className="px-6 py-4">Attending Doctor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right pr-10">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-medium">
                      <div className="flex items-center justify-center gap-3">
                        <RefreshCw className="animate-spin" size={20} />
                        Syncing live schedule...
                      </div>
                    </td>
                  </tr>
                ) : processedAppointments.length > 0 ? (
                  processedAppointments.map((app) => {
                    const status = getStatusInfo(app);
                    const isNow = isCurrentApp(app);
                    return (
                      <tr key={app._id} className={`hover:bg-gray-50 transition-all group relative ${isNow ? 'bg-blue-50/30' : ''} ${app.status === 'cancelled' ? 'opacity-50 grayscale select-none' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <span className={`font-bold ${isNow ? 'text-blue-700 scale-105 inline-block transition-transform' : 'text-gray-900'}`}>
                                {app.time?.split('-')[0].trim() || '--:--'}
                             </span>
                             {isNow && (
                                <div className="px-2 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase tracking-tighter animate-pulse shadow-sm">
                                   NOW
                                </div>
                             )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-3 ${isNow ? 'translate-x-1 transition-transform' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isNow ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600'}`}>
                              {app.patientName?.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold ${isNow ? 'text-blue-800' : 'text-gray-800'}`}>{app.patientName}</p>
                                <button 
                                  onClick={() => handleFetchAiSummary(app.patientId, app.patientName, app.symptoms || app.reason)}
                                  className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 p-1 rounded-full transition-all"
                                  title="AI Medical Summary"
                                >
                                  <Sparkles size={14} />
                                </button>
                              </div>
                              {app.patientPhone && <p className="text-[10px] text-gray-400 font-medium">{app.patientPhone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-center text-sm ${isNow ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                          {app.patientAge || '—'}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isNow ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                          <div className="flex items-center gap-2 text-nowrap">
                             <Stethoscope size={14} className={isNow ? 'text-blue-600' : 'text-gray-400'} />
                             <span>{app.doctorName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${status.bg} text-nowrap`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right pr-10">
                          <div className="flex justify-end items-center gap-1.5 min-h-[36px]">
                            {processingId === app._id.toString() ? (
                              <div className="p-2 text-blue-500 animate-spin mr-2">
                                <Loader2 size={18} />
                              </div>
                            ) : (
                              <>
                                {/* One-Click Arrive / Complete - Hidden for future dates */}
                                {app.status !== 'completed' && app.status !== 'cancelled' && !isFutureDate(app.date) ? (
                                  <button 
                                    onClick={() => handleStatusUpdate(app._id, 'completed')}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Mark Arrived"
                                  >
                                    <CheckCircle size={18} />
                                  </button>
                                ) : null}

                                {/* Reschedule */}
                                {app.status !== 'completed' && app.status !== 'cancelled' && (
                                  <button 
                                    onClick={() => setRescheduleData({ id: app._id, doctorId: app.doctorId, date: app.date, time: app.time })}
                                    className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Reschedule"
                                  >
                                    <CalendarDays size={18} />
                                  </button>
                                )}

                                {/* Cancel */}
                                {app.status !== 'completed' && app.status !== 'cancelled' && (
                                  <button 
                                    onClick={() => setCancelData({ id: app._id, patientName: app.patientName })}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Cancel Appointment"
                                  >
                                    <XCircle size={18} />
                                  </button>
                                )}

                                {/* Show Final Check for completed */}
                                {app.status === 'completed' && (
                                  <>
                                    <div className="text-green-500 pr-2 cursor-help" title="Completed">
                                      <CheckCircle size={20} />
                                    </div>
                                    <button
                                      onClick={() => setVisitNotesData({ id: app._id || app.id, notes: app.visitNotes || '', doctorName: app.doctorName, patientName: app.patientName })}
                                      className={`p-2 rounded-lg transition-colors border-l border-gray-100 ml-1 pl-3 flex items-center justify-center ${
                                        app.visitNotes 
                                        ? 'text-indigo-600 hover:bg-indigo-50' 
                                        : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                      }`}
                                      title={app.visitNotes ? "Edit Visit Notes" : "Add Visit Notes"}
                                    >
                                      <FileText size={18} className={app.visitNotes ? "fill-indigo-100" : ""} />
                                    </button>
                                  </>
                                )}

                                {/* Show Final X for cancelled */}
                                {app.status === 'cancelled' && (
                                  <div className="text-slate-400 pr-2">
                                    <XCircle size={20} />
                                  </div>
                                )}
                                
                                {/* WhatsApp Notify - Only for Upcoming */}
                                {app.patientPhone && app.status !== 'completed' && app.status !== 'cancelled' && app.status !== 'confirmed' && (
                                  <button 
                                    onClick={() => handleWhatsAppNotify(app)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border-l border-gray-100 ml-1 pl-3"
                                    title="Notify via WhatsApp"
                                  >
                                    <MessageSquare size={18} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        {isNow && <div className="absolute inset-y-0 left-0 w-1 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-medium italic space-y-4">
                      <Calendar size={40} className="mx-auto opacity-20 mb-3" />
                      <p>No appointments found for today.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleData && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Reschedule</h2>
              <button onClick={() => setRescheduleData(null)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">New Date</label>
                <input 
                  type="date"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value, time: ''})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">New Time Slot</label>
                {slotsLoading ? (
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-2 text-slate-400 text-sm font-bold">
                    <Loader2 size={16} className="animate-spin" />
                    Checking Availability...
                  </div>
                ) : (
                  <select 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 appearance-none"
                    value={rescheduleData.time}
                    onChange={(e) => setRescheduleData({...rescheduleData, time: e.target.value})}
                  >
                    <option value="" disabled>Select a slot</option>
                    {availableSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <button 
              onClick={handleReschedule}
              disabled={!rescheduleData.time}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              Update Schedule
            </button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelData && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-rose-800 tracking-tight">Cancel Appt</h2>
              <button onClick={() => setCancelData(null)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            
            <p className="text-slate-500 font-medium">Are you sure you want to cancel <span className="font-bold text-slate-700">{cancelData.patientName}</span>'s appointment?</p>

            <textarea 
              placeholder="Enter cancellation reason (optional)..."
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-700 min-h-[120px] focus:ring-2 focus:ring-rose-500"
              onChange={(e) => setCancelData({...cancelData, reason: e.target.value})}
            />

            <div className="flex gap-4">
              <button 
                onClick={() => setCancelData(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                No, Keep
              </button>
              <button 
                onClick={() => {
                  handleStatusUpdate(cancelData.id, 'cancelled', { cancellationReason: cancelData.reason });
                  setCancelData(null);
                }}
                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {aiSummaryData && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 opacity-50 blur-2xl"></div>
            
            <div className="flex justify-between items-start relative">
              <div>
                <div className="flex items-center gap-2 mb-1 text-amber-500">
                  <Sparkles size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Maya Clinical Analysis</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{aiSummaryData.patientName}</h2>
              </div>
              <button onClick={() => setAiSummaryData(null)} className="p-2 hover:bg-slate-50 text-slate-400 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl min-h-[150px] relative">
              {aiSummaryData.loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 size={24} className="animate-spin text-amber-500" />
                  <span className="text-sm font-bold tracking-tight animate-pulse text-amber-600/70">Analyzing patient history...</span>
                </div>
              ) : (
                <div className="prose prose-sm text-slate-700 font-medium prose-p:my-1 prose-ul:my-1 prose-li:my-1">
                  {aiSummaryData.text?.split(/\\n|\n/).map((line, i) => (
                    <p key={i} className={`mb-2 last:mb-0 text-sm leading-relaxed ${line.startsWith('📌') || line.startsWith('🏥') ? 'font-black text-slate-800' : ''}`}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => setAiSummaryData(null)}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all text-sm"
            >
              Close Summary
            </button>
          </div>
        </div>
      )}

      {/* Visit Notes Modal */}
      {visitNotesData && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col gap-6 transform transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <FileText size={20} />
                  </div>
                  Doctor Visit Notes
                </h2>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Patient: <span className="text-slate-600">{visitNotesData.patientName}</span> • Dr. <span className="text-slate-600">{visitNotesData.doctorName}</span>
                </p>
              </div>
              <button 
                onClick={() => setVisitNotesData(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-widest block">
                Clinical Observations & Prescriptions
              </label>
              <textarea 
                className="w-full h-48 sm:h-64 p-4 sm:p-5 bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-2xl font-medium text-slate-700 text-sm sm:text-base resize-none focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all custom-scrollbar placeholder:text-slate-300 placeholder:italic"
                placeholder="Type your notes, observations, or prescribed medications here..."
                value={visitNotesData.notes}
                onChange={(e) => setVisitNotesData({...visitNotesData, notes: e.target.value})}
                autoFocus
              />
              <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 opacity-80 mt-2">
                <Sparkles size={12} className="text-amber-500" />
                These notes will be automatically analyzed by Maya AI in future visits.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-2">
              <button 
                onClick={() => setVisitNotesData(null)}
                className="flex-1 py-3 sm:py-4 bg-slate-50 text-slate-500 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-colors text-[10px] sm:text-xs"
                disabled={isSavingNotes}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="flex-[2] py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-[10px] sm:text-xs flex items-center justify-center gap-2"
              >
                {isSavingNotes ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving Notes...
                  </>
                ) : (
                  <>Save Notes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, value, icon }) => (
  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-700 mt-1">{value}</p>
    </div>
    <div className="p-3 bg-gray-50 rounded-xl">
      {React.cloneElement(icon, { size: 20 })}
    </div>
  </div>
);

export default TrackAppointmentView;
