import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Stethoscope,
  Search,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  Timer,
  CalendarDays,
  X,
  Loader2,
  MessageSquare,
  Sparkles,
  Zap,
  FileText,
  MoreVertical
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { getSocketUrl } from '../../../services/api';
import api, { whatsappApi } from '../../../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';

const TrackAppointmentView = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('all');
  const [openActionId, setOpenActionId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenActionId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

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
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      transports: ['websocket'],
      upgrade: false
    });

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
  }, [user?.id || user?._id]);

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

  const handleWhatsAppNotify = async (app) => {
    const phone = app.patientPhone?.replace(/\D/g, '');
    if (!phone) return toast.warning('No phone number available for this patient.');

    // For prescriptions, we want to use the template
    const notes = app.visitNotes || app.symptoms || app.reason || "Follow-up required";

    try {
      setProcessingId(app._id);
      const clinicName = user?.organization?.name || user?.organizationId?.name || "Our Clinic";
      const res = await whatsappApi.sendPrescription(phone, app.patientName, notes, clinicName);
      if (res.success) {
        toast.success(`Prescription sent to ${app.patientName} via WhatsApp!`);
      }
    } catch (err) {
      console.error('WhatsApp Error:', err);
      toast.error("Failed to send WhatsApp. Is the 'prescription_share' template approved?");
    } finally {
      setProcessingId(null);
    }
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
    if (app.status === 'completed' || app.status === 'arrived') return { label: 'Arrived', color: 'green', bg: 'bg-green-100 text-green-700' };
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
          app.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.shortId?.toString().includes(searchTerm);

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 md:pl-10 transition-all">
              <h1 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-tight">Today's Appointments</h1>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 text-[10px] font-black uppercase shadow-sm">
                <Timer size={12} className="animate-pulse" />
                <span>LIVE: {format(currentTime, 'hh:mm:ss a')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-[9px] font-black uppercase tracking-widest shadow-sm">
                <Zap size={10} className="animate-bounce" />
                <span>Active</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider md:pl-10 transition-all">
              <Calendar size={12} />
              <span>{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48 shadow-sm font-bold text-slate-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchTodayAppointments}
                className="flex-1 sm:flex-none p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 shadow-sm flex justify-center"
                title="Refresh"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>



        {/* Appointments Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 text-gray-400 font-medium">
              <RefreshCw className="animate-spin text-blue-500" size={24} />
              <span>Syncing live schedule...</span>
            </div>
          </div>
        ) : processedAppointments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {processedAppointments.map((app) => {
              const status = getStatusInfo(app);
              const isNow = isCurrentApp(app);
              return (
                <div key={app._id} className={`bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between min-h-[170px] ${isNow ? 'bg-blue-50/20 border-blue-200 ring-1 ring-blue-100' : ''} ${app.status === 'cancelled' ? 'opacity-60 grayscale select-none' : ''}`}>
                  {isNow && <div className="absolute inset-y-0 left-0 w-1 bg-blue-600 rounded-l-2xl shadow-[0_0_10px_rgba(37,99,235,0.4)]" />}
                  
                  {/* Card Header (Time & Actions Dropdown) */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-xl text-slate-700 text-xs font-bold border border-slate-100">
                      <span>{app.time?.split('-')[0].trim() || '--:--'}</span>
                    </div>
                    
                    {/* Dropdown Button */}
                    {app.status !== 'cancelled' && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(openActionId === app._id ? null : app._id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {openActionId === app._id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-20">
                            {processingId === app._id.toString() ? (
                              <div className="p-3 text-blue-500 flex items-center justify-center animate-spin">
                                <Loader2 size={18} />
                              </div>
                            ) : (


                              <div className="flex flex-col">
                                {app.status !== 'completed' && app.status !== 'cancelled' && (
                                  <button
                                    onClick={() => {
                                      setRescheduleData({ id: app._id, doctorId: app.doctorId, date: app.date, time: app.time });
                                      setOpenActionId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                                  >
                                    <CalendarDays size={14} />
                                    <span>Reschedule</span>
                                  </button>
                                )}

                                {/* Cancel */}
                                {app.status !== 'completed' && app.status !== 'cancelled' && (
                                  <button
                                    onClick={() => {
                                      setCancelData({ id: app._id, patientName: app.patientName });
                                      setOpenActionId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                                  >
                                    <XCircle size={14} />
                                    <span>Cancel Appointment</span>
                                  </button>
                                )}

                                {/* Visit Notes for completed */}
                                {app.status === 'completed' && (
                                  <button
                                    onClick={() => {
                                      setVisitNotesData({ id: app._id || app.id, notes: app.visitNotes || '', doctorName: app.doctorName, patientName: app.patientName });
                                      setOpenActionId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                                  >
                                    <FileText size={14} />
                                    <span>{app.visitNotes ? "Edit Visit Notes" : "Add Visit Notes"}</span>
                                  </button>
                                )}

                                {/* WhatsApp Notify - Only for Upcoming */}
                                {app.patientPhone && app.status !== 'completed' && app.status !== 'cancelled' && app.status !== 'confirmed' && (
                                  <button
                                    onClick={() => {
                                      handleWhatsAppNotify(app);
                                      setOpenActionId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors border-t border-gray-50"
                                  >
                                    <MessageSquare size={14} />
                                    <span>Send Prescription</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Card Content (Patient Info, Doctor, Age) */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${isNow ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600'}`}>
                        {app.patientName?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-sm font-bold truncate ${isNow ? 'text-blue-800' : 'text-gray-800'}`}>{app.patientName}</span>
                          <button
                            onClick={() => handleFetchAiSummary(app.patientId, app.patientName, app.symptoms || app.reason)}
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 p-0.5 rounded-full transition-all flex-shrink-0"
                            title="AI Medical Summary"
                          >
                            <Sparkles size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Age: {app.patientAge || '—'}</span>
                          {app.patientPhone && <span className="text-[10px] text-gray-300">•</span>}
                          {app.patientPhone && <span className="text-[10px] text-gray-400 font-medium">{app.patientPhone}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600 font-semibold bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100/55 self-start">
                      <Stethoscope size={12} className={isNow ? 'text-blue-600' : 'text-gray-400'} />
                      <span className="truncate max-w-[120px]">{app.doctorName}</span>
                    </div>
                  </div>
                  
                  {/* Card Footer (Status) */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${status.bg} text-nowrap`}>
                      {status.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {app.status !== 'completed' && app.status !== 'cancelled' && !isFutureDate(app.date) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(app._id, 'completed');
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm shadow-blue-100"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {app.status === 'completed' && app.visitNotes && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVisitNotesData({ id: app._id || app.id, notes: app.visitNotes || '', doctorName: app.doctorName, patientName: app.patientName });
                          }}
                          className="p-1 hover:bg-indigo-50 text-indigo-600 rounded transition-colors flex items-center justify-center"
                          title="View/Edit Visit Notes"
                        >
                          <FileText size={12} className="fill-indigo-100" />
                        </button>
                      )}
                      {isNow && (
                        <div className="px-2 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase tracking-tighter animate-pulse shadow-sm">
                          NOW
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center text-gray-400 font-medium italic">
            <Calendar size={48} className="mx-auto opacity-25 mb-4 text-gray-400" />
            <p>No appointments found for today.</p>
          </div>
        )}
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
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value, time: '' })}
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
                    onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
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
              onChange={(e) => setCancelData({ ...cancelData, reason: e.target.value })}
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
                onChange={(e) => setVisitNotesData({ ...visitNotesData, notes: e.target.value })}
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
              <button
                onClick={async () => {
                  const app = appointments.find(a => (a._id || a.id)?.toString() === visitNotesData.id?.toString());
                  if (app) {
                    // 1. Save notes first so they are updated in the database
                    await handleSaveNotes();
                    // 2. Then send via WhatsApp
                    handleWhatsAppNotify({ ...app, visitNotes: visitNotesData.notes });
                  } else {
                    toast.error("Appointment not found");
                  }
                }}
                disabled={isSavingNotes || !visitNotesData.notes}
                className="p-3 sm:p-4 bg-green-500 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-green-200 hover:bg-green-600 transition-all disabled:opacity-50 flex items-center justify-center"
                title="Save & Send Prescription to WhatsApp"
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};



export default TrackAppointmentView;
