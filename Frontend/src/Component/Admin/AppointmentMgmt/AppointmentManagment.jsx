import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Clock,
  User,
  Activity,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Bell,
  UserPlus,
  Clock as ClockIcon,
  List,
  ChevronDown,
  Printer,
  FileText,
  Stethoscope,
  Phone,
  CalendarDays,
  MoreVertical,
  UserCheck,
  Sparkles,
  AlertCircle,
  Edit3,
  Grid,
  Save,
  Loader2
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
  isToday,
  setHours,
  parse
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../../services/api';

// Custom Component imports
import NewAppointmentForm from '../NewAppointmentForm';
import {
  AppointmentDetailsModal,
  WaitlistModal,
  AddToWaitlistModal
} from './Modals';

const AppointmentManagment = ({ isEmbedded = false, rebookData }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- State ---
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Custom Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'

  // Filter/Search State
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dayFilter, setDayFilter] = useState('all');

  // Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isAddToWaitlistModalOpen, setIsAddToWaitlistModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookingSlotInfo, setBookingSlotInfo] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [waitlist, setWaitlist] = useState([]);

  // Day View Interaction States
  const [openActionId, setOpenActionId] = useState(null);
  const [actionMenuPos, setActionMenuPos] = useState({ top: 0, right: 0 });
  const [activeActionApp, setActiveActionApp] = useState(null);
  const [mobileActionApp, setMobileActionApp] = useState(null);

  const handleActionClick = (e, app) => {
    e.stopPropagation();
    if (window.innerWidth < 768) {
      setMobileActionApp(app);
      setOpenActionId(null);
      setActiveActionApp(null);
      return;
    }
    if (openActionId === app.id) {
      setOpenActionId(null);
      setActiveActionApp(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenuPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
    setOpenActionId(app.id);
    setActiveActionApp(app);
  };
  const [editingNotesApp, setEditingNotesApp] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    const handleClose = () => {
      setOpenActionId(null);
      setActiveActionApp(null);
    };
    document.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      document.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);

  const handlePatientClick = (patientId) => {
    if (!patientId) {
      toast.warning('Patient ID not available for this appointment.');
      return;
    }
    const role = (user?.role || '').toLowerCase();
    const basePath = role === 'receptionist' ? '/receptionist' : '/admin';
    navigate(`${basePath}/patient/${patientId}`);
  };

  const getStatusBadge = (statusStr = '') => {
    const s = (statusStr || '').toLowerCase();
    if (s === 'arrived' || s === 'waiting') {
      return { label: 'Arrived', bg: 'bg-amber-100 text-amber-800 border border-amber-300' };
    }
    if (s === 'in-progress' || s === 'with-doctor') {
      return { label: 'With Doctor', bg: 'bg-indigo-100 text-indigo-800 border border-indigo-300' };
    }
    if (s === 'completed' || s === 'checkout') {
      return { label: 'Completed', bg: 'bg-emerald-100 text-emerald-800 border border-emerald-300' };
    }
    if (s === 'cancelled') {
      return { label: 'Cancelled', bg: 'bg-rose-100 text-rose-800 border border-rose-300' };
    }
    if (s === 'missed') {
      return { label: 'Missed', bg: 'bg-rose-100 text-rose-800 border border-rose-300' };
    }
    return { label: 'Confirmed', bg: 'bg-blue-100 text-blue-800 border border-blue-300' };
  };

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      const response = await api.put(`/appointments/${appointmentId}/status`, { status: newStatus });
      if (response.status === 200) {
        toast.success(`Status updated to ${newStatus}`);
        setAppointments(prev => prev.map(a => a.id === appointmentId ? {
          ...a,
          resource: { ...a.resource, status: newStatus }
        } : a));
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async () => {
    if (!editingNotesApp) return;
    setIsSavingNote(true);
    try {
      await api.put(`/appointments/${editingNotesApp.id}`, { 
        notes: noteInput,
        visitNotes: noteInput 
      });
      try {
        await api.put(`/appointments/${editingNotesApp.id}/notes`, { 
          notes: noteInput,
          visitNotes: noteInput 
        });
      } catch (err) {
        // Fallback already succeeded
      }
      toast.success('Doctor notes saved successfully');
      setAppointments(prev => prev.map(a => a.id === editingNotesApp.id ? {
        ...a,
        resource: { 
          ...a.resource, 
          notes: noteInput,
          visitNotes: noteInput 
        }
      } : a));
      if (selectedEvent && selectedEvent.id === editingNotesApp.id) {
        setSelectedEvent(prev => prev ? {
          ...prev,
          resource: { ...prev.resource, notes: noteInput, visitNotes: noteInput }
        } : null);
      }
      setEditingNotesApp(null);
    } catch (e) {
      toast.error('Failed to save notes');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handlePrintDailySchedule = () => {
    window.print();
  };

  const stats = useMemo(() => {
    const getStatus = (a) => (a.resource?.status || '').toLowerCase();
    return {
      total: appointments.length,
      confirmed: appointments.filter(a => ['confirmed', 'completed', 'arrived', 'waiting', 'in-progress', 'with-doctor'].includes(getStatus(a))).length,
      pending: appointments.filter(a => getStatus(a) === 'pending').length,
      cancelled: appointments.filter(a => getStatus(a) === 'cancelled').length,
      waitlistCount: waitlist.length
    };
  }, [appointments, waitlist]);



  // --- Date Parsing Helper ---
  const safeParseDate = (dateStr, timeStr) => {
    try {
      if (!dateStr) return new Date();
      const baseDate = new Date(dateStr);
      if (isNaN(baseDate.getTime())) return new Date();

      if (!timeStr) return baseDate;

      // Handle time range like "9:00-9 AM" or "09:30-10 AM"
      // Extract the first part: "9:00" or "09:30"
      const startTimePart = timeStr.split('-')[0].trim();

      // Check for AM/PM in the original string
      const isPM = timeStr.toUpperCase().includes('PM');
      const isAM = timeStr.toUpperCase().includes('AM');

      // Try to parse HH:mm
      const timeMatch = startTimePart.match(/(\d+):(\d+)/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);

        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        baseDate.setHours(hours, minutes, 0, 0);
        return baseDate;
      }

      return baseDate;
    } catch (e) {
      console.error("Error parsing date:", dateStr, timeStr, e);
      return new Date();
    }
  };

  // --- Data Fetching ---
  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      const data = response.data;

      const transformed = data.map(app => {
        const startDate = safeParseDate(app.date, app.time);
        return {
          id: app._id,
          start: startDate,
          end: new Date(startDate.getTime() + 30 * 60000),
          title: app.patientName,
          resource: {
            shortId: app.shortId,
            patientName: app.patientName,
            patientId: app.patientId || app.patient?._id || app.patient,
            doctorName: app.doctorName,
            doctorId: app.doctorId,
            reason: app.reason || '',
            status: app.status || 'confirmed',
            patientAge: app.patientAge,
            bookingDate: app.createdAt,
            paymentStatus: app.paymentStatus || 'pending',
            // Added patient details for rescheduling
            firstName: app.firstName || app.patientName?.split(' ')[0] || '',
            lastName: app.lastName || app.patientName?.split(' ').slice(1).join(' ') || '',
            phone: app.patientPhone || app.mobile || '',
            email: app.patientEmail || '',
            gender: app.gender || 'Male',
            designation: app.designation || 'MR.',
            ageType: app.ageType || 'Year',
            notes: app.notes || '',
            visitNotes: app.visitNotes || '',
            symptoms: app.symptoms || '',
            specialty: app.specialty || '',
            time: app.time || (startDate ? format(startDate, 'hh:mm a') : ''),
            date: app.date || (startDate ? format(startDate, 'yyyy-MM-dd') : ''),
            rawApp: app
          }
        };
      });
      setAppointments(transformed);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load appointments');
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      const data = res.data;
      // Handle both direct array and paginated object responses
      const doctorsArray = Array.isArray(data) ? data : (data.doctors || []);
      setDoctors(doctorsArray.map(d => ({ id: d.id || d.doctorId || d._id, name: d.name, specialization: d.specialization })));
    } catch (err) { console.error('Error fetching doctors:', err); }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      const data = res.data;
      // Handle both direct array and paginated object responses
      const patientsArray = Array.isArray(data) ? data : (data.patients || []);
      setPatients(patientsArray.map(p => ({ id: p.patientId || p._id, name: p.fullName || `${p.firstName} ${p.lastName}` })));
    } catch (err) { console.error('Error fetching patients:', err); }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchAppointments(), fetchDoctors(), fetchPatients()]);
      setIsLoading(false);

      if (rebookData) {
        setBookingSlotInfo({ start: new Date(), end: new Date(Date.now() + 30 * 60000) });
        setIsBookingModalOpen(true);
      }
    };
    init();
  }, [rebookData]);

  // --- Handlers ---
  const handleSelectSlot = (date) => {
    const start = new Date(date);
    const end = new Date(start.getTime() + 30 * 60000);
    setBookingSlotInfo({ start, end });
    setEditingEvent(null);
    setIsBookingModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  const closeModals = () => {
    setIsDetailsModalOpen(false);
    setIsBookingModalOpen(false);
    setSelectedEvent(null);
    setEditingEvent(null);
  };

  const handleBookOrUpdate = async (formData) => {
    const { doctorId, patientName, reason, date, time } = formData;
    const doctor = doctors.find((d) => d.id === doctorId);

    if (editingEvent) {
      try {
        const response = await api.put(`/appointments/${editingEvent.id}`, { date, time, reason });
        if (response.status !== 200) throw new Error('Failed to reschedule');
        toast.success('Appointment rescheduled');
      } catch (error) {
        console.error(error);
        toast.error('Failed to reschedule');
        return;
      }
    } else {
      try {
        const bookingData = {
          patientId: patients.find((p) => p.name === patientName)?.id || patientName,
          doctorId,
          doctorName: doctor?.name || doctorId,
          specialty: doctor?.specialization || 'General',
          date,
          time,
          reason,
        };
        const response = await api.post('/appointments', bookingData);
        if (response.status !== 200 && response.status !== 201) throw new Error('Failed to book');
        toast.success('Appointment booked');
      } catch (error) {
        console.error(error);
        toast.error('Failed to book');
        return;
      }
    }
    await fetchAppointments();
    closeModals();
  };

  const handleCancelAppointment = async (eventId) => {
    try {
      const response = await api.put(`/appointments/${eventId}/status`, { status: 'cancelled' });
      if (response.status !== 200) throw new Error();
      toast.success('Appointment cancelled');
      await fetchAppointments();
      closeModals();
    } catch (e) { toast.error('Failed to cancel'); }
  };

  const handleMarkComplete = async (eventId) => {
    try {
      const response = await api.put(`/appointments/${eventId}/status`, { status: 'completed' });
      if (response.status !== 200) throw new Error();
      toast.success('Completed');
      await fetchAppointments();
      closeModals();
    } catch (e) { toast.error('Failed to update'); }
  };

  const handleOpenReschedule = () => {
    setEditingEvent(selectedEvent);
    setBookingSlotInfo({ start: selectedEvent.start, end: selectedEvent.end });
    setIsDetailsModalOpen(false);
    setIsBookingModalOpen(true);
  };

  // Waitlist Mock Handlers
  const handleAddToWaitlist = (data) => {
    setWaitlist(prev => [...prev, { ...data, id: Date.now() }]);
    toast.success('Added to waitlist');
    setIsAddToWaitlistModalOpen(false);
  };

  const handleRemoveFromWaitlist = (id) => {
    setWaitlist(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateWaitlistPriority = (id, priority) => {
    setWaitlist(prev => prev.map(item => item.id === id ? { ...item, priority } : item));
  };

  const handleScheduleFromWaitlist = (waitlistItem) => {
    setBookingSlotInfo({ start: new Date(), end: new Date(Date.now() + 30 * 60000) });
    setEditingEvent(null);
    setIsBookingModalOpen(true);
    setIsWaitlistModalOpen(false);
  };

  // --- Navigation ---
  const next = () => {
    if (view === 'month') setCurrentMonth(addMonths(currentMonth, 1));
    else if (view === 'week') setCurrentMonth(addDays(currentMonth, 7));
    else {
      const nextDay = addDays(selectedDate, 1);
      setSelectedDate(nextDay);
      if (!isSameMonth(nextDay, currentMonth)) {
        setCurrentMonth(nextDay);
      }
    }
  };

  const prev = () => {
    if (view === 'month') setCurrentMonth(subMonths(currentMonth, 1));
    else if (view === 'week') setCurrentMonth(addDays(currentMonth, -7));
    else {
      const prevDay = addDays(selectedDate, -1);
      setSelectedDate(prevDay);
      if (!isSameMonth(prevDay, currentMonth)) {
        setCurrentMonth(prevDay);
      }
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const onDateClick = (day) => {
    setSelectedDate(day);
    setCurrentMonth(day);
    setView('day');
  };

  // --- Filtering ---
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const status = (app.resource?.status || '').toLowerCase();
      const patientName = (app.resource?.patientName || '').toLowerCase();
      const reason = (app.resource?.reason || '').toLowerCase();
      const search = searchQuery.toLowerCase();

      const matchesDoc = doctorFilter === 'all' || app.resource.doctorId === doctorFilter;
      
      // Status mapping: 'confirmed' filter shows both 'confirmed' and 'completed' appointments
      let matchesStatus = statusFilter === 'all';
      if (statusFilter === 'confirmed') {
        matchesStatus = ['confirmed', 'completed', 'arrived', 'waiting', 'in-progress', 'with-doctor'].includes(status);
      } else if (statusFilter !== 'all') {
        matchesStatus = status === statusFilter.toLowerCase();
      }

      const matchesSearch = patientName.includes(search) || 
                            reason.includes(search) || 
                            app.resource.shortId?.toString().includes(search);
      
      return matchesDoc && matchesStatus && matchesSearch;
    });
  }, [appointments, doctorFilter, statusFilter, searchQuery]);

  // --- Rendering Helpers ---
  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-3 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md rounded-t-3xl border-b border-slate-100">
        <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-4 w-full md:w-auto">
          <h2 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight text-center md:text-left min-w-[150px] md:min-w-[180px]">
            {format(currentMonth, view === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 mx-auto md:mx-0">
            <button onClick={prev} className="p-1.5 md:p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
              <ChevronLeft size={16} className="text-slate-600" />
            </button>
            <button onClick={goToToday} className="px-2 md:px-4 text-[9px] md:text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest">Today</button>
            <button onClick={next} className="p-1.5 md:p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 w-full md:w-auto overflow-x-auto scrollbar-hide">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 md:flex-none px-3 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === v ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
        {days.map((day, i) => (
          <div key={i} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayAppointments = filteredAppointments
          .filter(app => isSameDay(app.start, cloneDay))
          .sort((a, b) => a.start - b.start);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            className={`min-h-[70px] md:min-h-[140px] bg-white border-r border-b border-slate-100 p-1.5 md:p-3 group transition-all hover:bg-blue-50/20 cursor-pointer relative ${!isCurrentMonth ? "bg-slate-50/50 opacity-40 shadow-inner" : ""
              }`}
            key={day.toString()}
            onClick={() => onDateClick(cloneDay)}
          >
            <div className="flex justify-between items-start mb-1 md:mb-2">
              <div className="flex flex-col">
                <span className={`text-[10px] md:text-sm font-bold transition-all ${isToday(day)
                  ? "bg-blue-600 text-white w-5 h-5 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded-2xl shadow-lg shadow-blue-200 -mt-1 -ml-1 scale-110"
                  : isCurrentMonth ? "text-slate-700" : "text-slate-400"
                  }`}>
                  {format(day, "d")}
                </span>
                {dayAppointments.length > 0 && isCurrentMonth && (
                  <span className="text-[8px] md:text-[10px] font-black text-blue-600/60 mt-1 uppercase tracking-tighter">
                    <span className="hidden md:inline">{dayAppointments.length} Appt{dayAppointments.length > 1 ? 's' : ''}</span>
                    <span className="md:hidden">{dayAppointments.length}A</span>
                  </span>
                )}
              </div>
              {dayAppointments.length > 0 && isCurrentMonth && (
                <div className="flex -space-x-1 hidden md:flex">
                  {dayAppointments.slice(0, 3).map((_, i) => (
                    <div key={i} className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-blue-400 border border-white" />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 md:space-y-1.5">
              {/* Desktop View: Full Bars */}
              <div className="hidden md:block space-y-1.5">
                {dayAppointments.slice(0, 3).map((app, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={app.id}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold truncate transition-all hover:scale-[1.02] active:scale-95 shadow-sm border-l-4 ${app.resource.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-400' :
                      app.resource.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-400' :
                        app.resource.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-400' :
                          'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectEvent(app);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">{format(app.start, 'HH:mm')}</span>
                      <span className="truncate">{app.resource.patientName}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mobile View: Compact Circles (Hour Bubbles) */}
              <div className="md:hidden flex flex-wrap gap-1">
                {dayAppointments.slice(0, 4).map((app, idx) => (
                  <div
                    key={app.id}
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black shadow-sm ${app.resource.status === 'confirmed' ? 'bg-emerald-500 text-white' :
                      app.resource.status === 'pending' ? 'bg-amber-500 text-white' :
                        app.resource.status === 'cancelled' ? 'bg-rose-500 text-white' :
                          'bg-slate-400 text-white'
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectEvent(app);
                    }}
                  >
                    {format(app.start, 'H')}
                  </div>
                ))}
              </div>

              {dayAppointments.length > 3 && (
                <div className="text-[8px] md:text-[9px] font-black text-slate-400 text-center py-0.5 md:py-1 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <span className="hidden md:inline">+ {dayAppointments.length - 3} MORE</span>
                  <span className="md:hidden">+{dayAppointments.length - 4}</span>
                </div>
              )}
            </div>

            {/* Hover Tooltip - Chronological List */}
            {dayAppointments.length > 0 && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-slate-100 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 scale-95 group-hover:scale-100 origin-bottom">
                <div className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-3 border-b border-blue-50 pb-2">
                  Daily Schedule • {format(cloneDay, 'MMM d')}
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                  {dayAppointments.map((app, idx) => (
                    <div key={app.id} className="flex gap-3 items-start border-l-2 border-blue-100 pl-3 py-0.5">
                      <div className="text-[10px] font-black text-slate-400 whitespace-nowrap pt-0.5">
                        {format(app.start, 'hh:mm a')}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 truncate">{app.resource.patientName}</span>
                        <span className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">Dr. {app.resource.doctorName}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r border-b border-slate-100" />
              </div>
            )}

            <button
              className="absolute bottom-1 md:bottom-2 right-1 md:right-2 p-1 md:p-1.5 bg-blue-50 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectSlot(cloneDay);
              }}
            >
              <UserPlus size={12} className="md:w-[14px] md:h-[14px]" />
            </button>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white rounded-b-3xl overflow-hidden shadow-sm">{rows}</div>;
  };

  const renderWeek = () => {
    const startDate = startOfWeek(currentMonth);
    const days = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white rounded-b-3xl overflow-hidden shadow-sm flex flex-col overflow-x-auto">
        <div className="grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr] bg-slate-50/50 border-b border-slate-100 min-w-[600px] md:min-w-0">
          <div className="py-4 border-r border-slate-100" />
          <div className="grid grid-cols-7">
            {days.map((day, i) => (
              <div key={i} className={`py-4 text-center transition-all ${isToday(day) ? "bg-blue-50/50" : ""}`}>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{format(day, 'EEE')}</div>
                <div className={`text-lg font-bold ${isToday(day) ? "text-blue-600" : "text-slate-700"}`}>{format(day, 'd')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-hide">
          <div className="grid grid-cols-[80px_1fr]">
            <div className="bg-slate-50/30">
              {hours.map(hour => (
                <div key={hour} className="h-16 md:h-20 border-r border-b border-slate-50 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-slate-400">
                  {format(setHours(currentMonth, hour), 'hh:mm a')}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 relative">
              {days.map((day, dayIdx) => (
                <div key={dayIdx} className="relative border-r border-slate-50">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="h-16 md:h-20 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group relative"
                      onClick={() => handleSelectSlot(setHours(day, hour))}
                    >
                      <div className="absolute inset-0 flex flex-col gap-1 p-1">
                        {filteredAppointments
                          .filter(app => isSameDay(app.start, day) && app.start.getHours() === hour)
                          .map(app => (
                            <div
                              key={app.id}
                              className={`px-2 py-1.5 rounded-xl text-[9px] font-bold truncate shadow-sm border-l-4 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all ${app.resource.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-400' :
                                app.resource.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-400' :
                                  'bg-blue-50 text-blue-700 border-blue-400'
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEvent(app);
                              }}
                            >
                              {format(app.start, 'HH:mm')} - {app.resource.patientName}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDay = () => {
    // Generate all days in the current month for the circle date strip
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Appointments for the selected day
    const dayAppointments = filteredAppointments
      .filter(app => isSameDay(app.start, selectedDate))
      .sort((a, b) => a.start - b.start);

    // Apply dayFilter if not 'all'
    const displayedAppointments = dayAppointments.filter(app => {
      if (dayFilter === 'all') return true;
      const s = (app.resource?.status || '').toLowerCase();
      if (dayFilter === 'confirmed') return !s || s === 'confirmed' || s === 'pending';
      if (dayFilter === 'arrived') return s === 'arrived' || s === 'waiting';
      if (dayFilter === 'withDr') return s === 'in-progress' || s === 'with-doctor';
      if (dayFilter === 'completed') return s === 'completed' || s === 'checkout';
      if (dayFilter === 'cancelled') return s === 'cancelled';
      return true;
    });

    const statusCounts = {
      all: dayAppointments.length,
      confirmed: dayAppointments.filter(a => {
        const s = (a.resource?.status || '').toLowerCase();
        return !s || s === 'confirmed' || s === 'pending';
      }).length,
      arrived: dayAppointments.filter(a => ['arrived', 'waiting'].includes((a.resource?.status || '').toLowerCase())).length,
      withDr: dayAppointments.filter(a => ['in-progress', 'with-doctor'].includes((a.resource?.status || '').toLowerCase())).length,
      completed: dayAppointments.filter(a => ['completed', 'checkout'].includes((a.resource?.status || '').toLowerCase())).length,
      cancelled: dayAppointments.filter(a => (a.resource?.status || '').toLowerCase() === 'cancelled').length,
    };

    return (
      <div className="bg-slate-50/60 rounded-b-3xl overflow-hidden shadow-sm flex flex-col">
        {/* TOP BAR: Month Title, Quick Switch to Month Grid, Print Button, Book Slot */}
        <div className="p-3 md:p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('month')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              title="Back to Full Month Grid"
            >
              <Grid size={14} className="text-slate-500" />
              <span>Full Month Grid</span>
            </button>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1">
              <button
                onClick={prev}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs md:text-sm font-black text-slate-800 px-1">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={next}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors ml-1"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintDailySchedule}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              title="Print all appointments and doctor notes for this date"
            >
              <Printer size={14} />
              <span>Print Day Schedule</span>
            </button>
            <button
              onClick={() => handleSelectSlot(selectedDate)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* CIRCLE DATE STRIP: 1 to 28/30/31 side by side in small circles */}
        <div className="bg-white border-b border-slate-200/80 px-2 py-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
            {daysInMonth.map((day) => {
              const isCurrentSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const dayApptsCount = filteredAppointments.filter(a => isSameDay(a.start, day)).length;

              return (
                <button
                  key={day.toString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center justify-center min-w-[36px] py-0.5 px-1 rounded-xl transition-all group shrink-0 cursor-pointer ${
                    isCurrentSelected
                      ? 'bg-blue-50 ring-2 ring-blue-500 shadow-2xs'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    isCurrentSelected
                      ? 'text-blue-600 font-black'
                      : isTodayDate
                        ? 'text-blue-500 font-bold'
                        : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    {format(day, 'EEE')}
                  </span>
                  
                  {/* Small Circle */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-all relative ${
                    isCurrentSelected
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : isTodayDate
                        ? 'bg-blue-100 text-blue-700 border border-blue-400'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                  }`}>
                    {format(day, 'd')}
                    
                    {/* Appointment indicator dot */}
                    {dayApptsCount > 0 && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                        isCurrentSelected ? 'bg-amber-400' : 'bg-blue-600'
                      }`} />
                    )}
                  </div>

                  {/* Day count */}
                  {dayApptsCount > 0 ? (
                    <span className={`text-[8px] font-bold leading-none mt-0.5 ${
                      isCurrentSelected ? 'text-blue-600 font-black' : 'text-slate-400'
                    }`}>
                      {dayApptsCount}
                    </span>
                  ) : (
                    <span className="text-[8px] text-transparent leading-none mt-0.5 select-none">•</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SELECTED DATE HEADER & STATUS FILTERS */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 text-sm">
              {format(selectedDate, 'EEEE, MMMM do, yyyy')}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-semibold text-xs">
              {dayAppointments.length} patient{dayAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Quick status tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide bg-white p-0.5 rounded-lg border border-slate-200">
            {[
              { id: 'all', label: 'All', count: statusCounts.all },
              { id: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed },
              { id: 'arrived', label: 'Arrived', count: statusCounts.arrived },
              { id: 'withDr', label: 'With Dr', count: statusCounts.withDr },
              { id: 'completed', label: 'Completed', count: statusCounts.completed },
              { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDayFilter(tab.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  dayFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1 rounded-full ${
                  dayFilter === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* APPOINTMENT ROWS (VERTICAL: ONE SINGLE COMPACT BOX PER PATIENT, NOTES IN FRONT OF IT) */}
        <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pb-36 min-h-[320px]">
          {displayedAppointments.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center flex flex-col items-center justify-center">
              <CalendarIcon size={28} className="text-slate-300 mb-1.5" />
              <h4 className="text-xs font-bold text-slate-700">No appointments for this date</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No scheduled patients on {format(selectedDate, 'MMMM d, yyyy')}.
              </p>
              <button
                type="button"
                onClick={() => handleSelectSlot(selectedDate)}
                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Book Appointment</span>
              </button>
            </div>
          ) : (
            displayedAppointments.map((app, index) => {
              const status = getStatusBadge(app.resource.status);
              const targetPatientId = app.resource.patientId;
              const isDropUp = index >= displayedAppointments.length - 2 || displayedAppointments.length <= 2;

              return (
                <div
                  key={app.id}
                  className="w-full bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-xs transition-all px-3 py-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                >
                  {/* LEFT: Patient Details (Compact 2-3 lines) */}
                  <div className="flex items-center gap-2.5 shrink-0 md:w-[45%] lg:w-[40%]">
                    {/* Clickable Avatar */}
                    <button
                      type="button"
                      onClick={() => handlePatientClick(targetPatientId)}
                      className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center shrink-0 cursor-pointer hover:bg-blue-600 hover:text-white transition-all shadow-2xs"
                      title="Open Patient Profile"
                    >
                      {app.resource.patientName?.charAt(0) || 'P'}
                    </button>

                    <div className="min-w-0 flex-1">
                      {/* Line 1: Time, Clickable Patient Name, ID, Status */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[11px] font-mono shrink-0">
                          {app.resource.time || format(app.start, 'hh:mm a')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePatientClick(targetPatientId)}
                          className="font-bold text-sm text-slate-900 hover:text-blue-600 hover:underline cursor-pointer truncate text-left"
                          title="Open Patient Profile"
                        >
                          {app.resource.patientName}
                        </button>
                        {app.resource.patientId && (
                          <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-200 px-1 rounded">
                            ID: {app.resource.patientId}
                          </span>
                        )}
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${status.bg}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Line 2: Age, Gender, Phone, Doctor */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                        <span>Age: {app.resource.patientAge || '—'} {app.resource.gender ? `• ${app.resource.gender}` : ''}</span>
                        {app.resource.phone && (
                          <span className="flex items-center gap-0.5 text-slate-600">
                            • <Phone size={10} className="text-slate-400" /> {app.resource.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          • <Stethoscope size={11} className="text-blue-600" /> Dr. {app.resource.doctorName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Notes in front of patient info (inside this same box!) */}
                  <div className="flex-1 min-w-0 md:border-l md:border-slate-200 md:pl-3 w-full flex items-center justify-between gap-2">
                    <div 
                      onClick={() => {
                        setEditingNotesApp(app);
                        setNoteInput(app.resource.notes || app.resource.visitNotes || '');
                      }}
                      className="min-w-0 flex-1 cursor-pointer group hover:bg-amber-50/70 p-1.5 rounded-lg transition-all border border-transparent hover:border-amber-200"
                      title="Click to view or edit doctor's notes"
                    >
                      {app.resource.notes || app.resource.visitNotes ? (
                        <div className="flex items-start gap-1.5 text-slate-800">
                          <FileText size={13} className="text-amber-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-amber-900 text-[11px] uppercase">Doctor Note:</span>
                              <span className="text-[10px] text-amber-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-auto">
                                <Edit3 size={10} /> Edit
                              </span>
                            </div>
                            <span className="text-xs font-medium text-slate-800 line-clamp-2 leading-tight">
                              {app.resource.notes || app.resource.visitNotes}
                            </span>
                          </div>
                        </div>
                      ) : app.resource.symptoms || app.resource.reason ? (
                        <div className="flex items-start gap-1.5 text-slate-700">
                          <FileText size={13} className="text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-800 text-[11px] uppercase">Symptoms/Reason:</span>
                              <span className="text-[10px] text-blue-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-auto">
                                <Edit3 size={10} /> + Add Note
                              </span>
                            </div>
                            <span className="text-xs text-slate-700 italic line-clamp-2 leading-tight">
                              {app.resource.symptoms || app.resource.reason}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-0.5">
                          <span className="text-slate-400 italic text-xs flex items-center gap-1">
                            <FileText size={12} className="opacity-40" />
                            No doctor notes recorded
                          </span>
                          <span className="text-[10px] text-amber-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <Edit3 size={10} /> + Add Note
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Inline Note Add/Edit button & Quick Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNotesApp(app);
                          setNoteInput(app.resource.notes || app.resource.visitNotes || '');
                        }}
                        className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                          app.resource.notes || app.resource.visitNotes
                            ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                        }`}
                        title="Add or Edit Notes"
                      >
                        <Edit3 size={11} />
                        <span>{app.resource.notes || app.resource.visitNotes ? 'Edit Note' : '+ Note'}</span>
                      </button>

                      {/* 3-dots actions dropdown trigger */}
                      <button
                        type="button"
                        onClick={(e) => handleActionClick(e, app)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`p-0 ${isEmbedded ? '' : 'md:p-6 min-h-screen'} transition-all duration-500 ${isEmbedded ? 'bg-transparent' : 'bg-slate-50'}`}>
      <ToastContainer position="bottom-right" theme="colored" />

      {!isEmbedded && (
        <div className="mb-6 md:mb-10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
          <StatCard 
            title="Total Appts" 
            value={stats.total} 
            icon={<List />} 
            color="blue" 
            onClick={() => setStatusFilter('all')}
            isActive={statusFilter === 'all'}
          />
          <StatCard 
            title="Confirmed" 
            value={stats.confirmed} 
            icon={<CheckCircle />} 
            color="emerald" 
            onClick={() => setStatusFilter('confirmed')}
            isActive={statusFilter === 'confirmed'}
          />
          <StatCard 
            title="Pending" 
            value={stats.pending} 
            icon={<ClockIcon />} 
            color="amber" 
            onClick={() => setStatusFilter('pending')}
            isActive={statusFilter === 'pending'}
          />
          <StatCard 
            title="Cancelled" 
            value={stats.cancelled} 
            icon={<XCircle />} 
            color="rose" 
            onClick={() => setStatusFilter('cancelled')}
            isActive={statusFilter === 'cancelled'}
          />
          <StatCard 
            title="Waitlist" 
            value={stats.waitlistCount} 
            icon={<Activity />} 
            color="indigo" 
            onClick={() => setIsWaitlistModalOpen(true)}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">


        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <div className="bg-white rounded-none md:rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key="calendar-view"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.3 }}
              >
                {renderHeader()}
                {view === 'month' && renderDays()}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view + currentMonth}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    {view === 'month' ? renderCells() : view === 'week' ? renderWeek() : renderDay()}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModals}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <NewAppointmentForm
              onClose={closeModals}
              onSuccess={handleBookOrUpdate}
              initialData={{
                date: bookingSlotInfo?.start ? format(bookingSlotInfo.start, 'yyyy-MM-dd') : '',
                time: bookingSlotInfo?.start ? format(bookingSlotInfo.start, 'HH:mm') : '',
                ...(rebookData ? {
                  patientId: rebookData.patientId,
                  doctorId: rebookData.doctorId,
                  procedure: rebookData.reason,
                  patientName: rebookData.patientName,
                  firstName: rebookData.firstName || rebookData.patientName?.split(' ')[0] || '',
                  lastName: rebookData.lastName || rebookData.patientName?.split(' ').slice(1).join(' ') || '',
                  phone: rebookData.patientPhone,
                  email: rebookData.patientEmail,
                  gender: rebookData.gender,
                  age: rebookData.patientAge,
                  ageType: rebookData.ageType || 'Year',
                  bloodGroup: rebookData.bloodGroup,
                  dateOfBirth: rebookData.dateOfBirth,
                  streetAddress: rebookData.address,
                  city: rebookData.city,
                  state: rebookData.state,
                  postalCode: rebookData.zip
                } : {}),
                ...(editingEvent ? {
                  id: editingEvent.id,
                  doctorId: editingEvent.resource.doctorId,
                  procedure: editingEvent.resource.reason,
                  patientName: editingEvent.resource.patientName,
                  // Map resource fields to NewAppointmentForm props
                  firstName: editingEvent.resource.firstName,
                  lastName: editingEvent.resource.lastName,
                  phone: editingEvent.resource.phone,
                  email: editingEvent.resource.email,
                  gender: editingEvent.resource.gender,
                  designation: editingEvent.resource.designation,
                  age: editingEvent.resource.patientAge,
                  ageType: editingEvent.resource.ageType,
                } : {})
              }}
            />
          </div>
        </div>
      )}

      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeModals}
        event={selectedEvent}
        onCancel={handleCancelAppointment}
        onComplete={handleMarkComplete}
        onReschedule={handleOpenReschedule}
        onEditNotes={(app) => {
          setIsDetailsModalOpen(false);
          setEditingNotesApp(app);
          setNoteInput(app.resource?.notes || app.resource?.visitNotes || '');
        }}
      />

      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
        waitlist={waitlist}
        onSchedule={handleScheduleFromWaitlist}
        onRemove={handleRemoveFromWaitlist}
        onUpdatePriority={handleUpdateWaitlistPriority}
      />

      <AddToWaitlistModal
        isOpen={isAddToWaitlistModalOpen}
        onClose={() => setIsAddToWaitlistModalOpen(false)}
        onAdd={handleAddToWaitlist}
        doctors={doctors}
        patients={patients}
      />

      {/* Modal to Add / Edit Doctor's Notes */}
      {editingNotesApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setEditingNotesApp(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">
                    Doctor's Notes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: {editingNotesApp.resource.patientName} (ID: {editingNotesApp.resource.patientId || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingNotesApp(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Clinical Remarks & Instructions
              </label>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Enter doctor notes, instructions, procedure details..."
                rows={5}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingNotesApp(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNote}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Notes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Daily Schedule Document */}
      <div id="printable-daily-schedule" className="hidden print:block p-8 bg-white text-black font-sans">
        {/* Print Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {user?.organization?.name || user?.organizationId?.name || 'Clinic Management'}
            </h1>
            <p className="text-xs text-slate-600 font-bold mt-0.5 uppercase tracking-wide">
              Daily Appointment Schedule & Doctor's Notes
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-extrabold text-slate-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Total Scheduled Patients: {filteredAppointments.filter(app => isSameDay(app.start, selectedDate)).length}
            </p>
          </div>
        </div>

        {/* Patients List Table / Rows */}
        <div className="space-y-4">
          {filteredAppointments
            .filter(app => isSameDay(app.start, selectedDate))
            .sort((a, b) => a.start - b.start)
            .map((app, index) => (
              <div
                key={app.id}
                className="border border-slate-300 rounded-lg p-3 flex gap-4 text-xs page-break-inside-avoid"
                style={{ pageBreakInside: 'avoid' }}
              >
                {/* Number & Time */}
                <div className="w-24 shrink-0 border-r border-slate-200 pr-3 flex flex-col justify-center">
                  <span className="font-black text-slate-900 text-sm">#{index + 1}</span>
                  <span className="font-bold text-slate-800 mt-1">{app.resource.time || format(app.start, 'hh:mm a')}</span>
                  <span className="text-[10px] font-black uppercase mt-1 px-1.5 py-0.5 bg-slate-100 rounded inline-block text-slate-800 self-start">
                    {app.resource.status || 'Confirmed'}
                  </span>
                </div>

                {/* Patient & Doctor Info */}
                <div className="w-1/3 shrink-0 border-r border-slate-200 pr-3 space-y-1">
                  <div className="font-black text-slate-900 text-sm">{app.resource.patientName}</div>
                  {app.resource.patientId && (
                    <div className="text-[11px] font-bold text-slate-700">ID: {app.resource.patientId}</div>
                  )}
                  <div className="text-slate-700">
                    Age: {app.resource.patientAge || '—'} {app.resource.gender ? `• ${app.resource.gender}` : ''}
                  </div>
                  {app.resource.phone && (
                    <div className="text-slate-700 font-medium">Phone: {app.resource.phone}</div>
                  )}
                  <div className="text-slate-900 font-bold pt-1">
                    Doctor: Dr. {app.resource.doctorName}
                  </div>
                </div>

                {/* Doctor's Notes & Remarks */}
                <div className="flex-1 space-y-1.5 pl-1">
                  <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-200 pb-0.5">
                    Doctor's Notes & Clinical Remarks:
                  </div>
                  {app.resource.notes ? (
                    <div className="text-slate-900 font-medium whitespace-pre-wrap">
                      {app.resource.notes}
                    </div>
                  ) : null}
                  {app.resource.visitNotes ? (
                    <div className="text-slate-800 italic">
                      <span className="font-bold not-italic">Consultation: </span>
                      {app.resource.visitNotes}
                    </div>
                  ) : null}
                  {(app.resource.symptoms || app.resource.reason) ? (
                    <div className="text-slate-700 text-[11px]">
                      <span className="font-bold">Symptoms / Reason: </span>
                      {app.resource.symptoms || app.resource.reason}
                    </div>
                  ) : null}
                  {!app.resource.notes && !app.resource.visitNotes && !app.resource.symptoms && !app.resource.reason && (
                    <div className="text-slate-400 italic">No notes recorded</div>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Print Footer */}
        <div className="border-t border-slate-300 mt-6 pt-2 text-[10px] text-slate-500 flex justify-between">
          <span>Printed on {format(new Date(), 'PPpp')}</span>
          <span>Computer Generated Schedule • Confidential Medical Record</span>
        </div>
      </div>



      {/* FIXED VIEWPORT DOWNSIDE ACTION MENU (NEVER CLIPPED, FULL VIEW) */}
      {openActionId && activeActionApp && (
        <div
          style={{
            position: 'fixed',
            top: `${actionMenuPos.top}px`,
            right: `${actionMenuPos.right}px`,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-48 bg-white border border-gray-200 rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 select-none"
        >
          <button
            type="button"
            onClick={() => {
              handlePatientClick(activeActionApp.resource.patientId);
              setOpenActionId(null);
              setActiveActionApp(null);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-100 cursor-pointer"
          >
            <User size={13} />
            <span>View Profile</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const app = activeActionApp;
              setOpenActionId(null);
              setActiveActionApp(null);
              setEditingNotesApp(app);
              setNoteInput(app?.resource?.notes || app?.resource?.visitNotes || '');
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2 border-b border-gray-100 cursor-pointer"
          >
            <Edit3 size={12} className="text-amber-600" />
            <span>{activeActionApp?.resource?.notes || activeActionApp?.resource?.visitNotes ? 'Edit Doctor Note' : '+ Add Doctor Note'}</span>
          </button>
          <div className="px-3.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-400 bg-slate-50">
            Set Status
          </div>
          <button
            type="button"
            onClick={() => {
              handleStatusUpdate(activeActionApp.id, 'arrived');
              setOpenActionId(null);
              setActiveActionApp(null);
            }}
            className="w-full text-left px-3.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
          >
            <UserCheck size={12} />
            <span>Mark Arrived</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleStatusUpdate(activeActionApp.id, 'in-progress');
              setOpenActionId(null);
              setActiveActionApp(null);
            }}
            className="w-full text-left px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer"
          >
            <Stethoscope size={12} />
            <span>Mark With Doctor</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleStatusUpdate(activeActionApp.id, 'completed');
              setOpenActionId(null);
              setActiveActionApp(null);
            }}
            className="w-full text-left px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle size={12} />
            <span>Mark Checkout</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleStatusUpdate(activeActionApp.id, 'cancelled');
              setOpenActionId(null);
              setActiveActionApp(null);
            }}
            className="w-full text-left px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 border-t border-gray-100 cursor-pointer"
          >
            <XCircle size={12} />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* NATIVE MOBILE BOTTOM ACTION SHEET FOR DOCTOR */}
      <AnimatePresence>
        {mobileActionApp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileActionApp(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm shrink-0">
                    {mobileActionApp.resource.patientName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {mobileActionApp.resource.patientName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {mobileActionApp.resource.time || (mobileActionApp.start ? format(mobileActionApp.start, 'hh:mm a') : '')} • ID: {mobileActionApp.resource.patientId || 'N/A'}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusBadge(mobileActionApp.resource.status).bg}`}>
                  {getStatusBadge(mobileActionApp.resource.status).label}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handlePatientClick(mobileActionApp.resource.patientId);
                    setMobileActionApp(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <User size={16} />
                    <span>View Patient Profile</span>
                  </div>
                  <ChevronRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const app = mobileActionApp;
                    setMobileActionApp(null);
                    setEditingNotesApp(app);
                    setNoteInput(app.resource.notes || app.resource.visitNotes || '');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Edit3 size={16} />
                    <span>{mobileActionApp.resource.notes ? 'Edit Doctor Note' : '+ Add Doctor Note'}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>

                <div className="pt-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                    Update Appointment Status
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleStatusUpdate(mobileActionApp.id, 'arrived');
                        setMobileActionApp(null);
                      }}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 text-amber-800 font-bold text-xs hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <UserCheck size={14} className="text-amber-600" />
                      <span>Mark Arrived</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleStatusUpdate(mobileActionApp.id, 'in-progress');
                        setMobileActionApp(null);
                      }}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-indigo-800 font-bold text-xs hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <Stethoscope size={14} className="text-indigo-600" />
                      <span>With Doctor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleStatusUpdate(mobileActionApp.id, 'completed');
                        setMobileActionApp(null);
                      }}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <CheckCircle size={14} className="text-emerald-600" />
                      <span>Checkout</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleStatusUpdate(mobileActionApp.id, 'cancelled');
                        setMobileActionApp(null);
                      }}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-800 font-bold text-xs hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <XCircle size={14} className="text-rose-600" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileActionApp(null)}
                className="mt-4 w-full py-2.5 text-center text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-daily-schedule, #printable-daily-schedule * {
            visibility: visible !important;
          }
          #printable-daily-schedule {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

// Sub-components
function StatCard({ title, value, icon, color, onClick, isActive }) {
  const colors = {
    blue: "from-blue-500 to-blue-600 shadow-blue-200 hover:shadow-blue-300",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-200 hover:shadow-emerald-300",
    amber: "from-amber-500 to-amber-600 shadow-amber-200 hover:shadow-amber-300",
    rose: "from-rose-500 to-rose-600 shadow-rose-200 hover:shadow-rose-300",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200 hover:shadow-indigo-300"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-gradient-to-br ${colors[color]} p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-xl text-white cursor-pointer transition-all ${
        isActive ? 'ring-4 ring-white/30 scale-105 shadow-2xl z-10' : 'opacity-90'
      }`}
    >
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-80">{title}</span>
        <div className="p-1.5 md:p-2 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-md">
          {React.cloneElement(icon, { size: 16 })}
        </div>
      </div>
      <p className="text-xl md:text-3xl font-black">{value}</p>
    </motion.div>
  );
}

export default AppointmentManagment;
