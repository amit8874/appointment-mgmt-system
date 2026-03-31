import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ChevronDown
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

  // Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isAddToWaitlistModalOpen, setIsAddToWaitlistModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookingSlotInfo, setBookingSlotInfo] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [waitlist, setWaitlist] = useState([]);

  const stats = useMemo(() => {
    const getStatus = (a) => (a.resource?.status || '').toLowerCase();
    return {
      total: appointments.length,
      confirmed: appointments.filter(a => ['confirmed', 'completed', 'arrived'].includes(getStatus(a))).length,
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
            patientName: app.patientName,
            patientId: app.patientId,
            doctorName: app.doctorName,
            doctorId: app.doctorId,
            reason: app.reason,
            status: app.status,
            patientAge: app.patientAge,
            bookingDate: app.createdAt,
            paymentStatus: app.paymentStatus || 'pending',
            // Added patient details for rescheduling
            firstName: app.firstName || app.patientName?.split(' ')[0] || '',
            lastName: app.lastName || app.patientName?.split(' ').slice(1).join(' ') || '',
            phone: app.patientPhone || '',
            email: app.patientEmail || '',
            gender: app.gender || 'Male',
            designation: app.designation || 'MR.',
            ageType: app.ageType || 'Year',
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
    else setCurrentMonth(addDays(currentMonth, 1));
  };

  const prev = () => {
    if (view === 'month') setCurrentMonth(subMonths(currentMonth, 1));
    else if (view === 'week') setCurrentMonth(addDays(currentMonth, -7));
    else setCurrentMonth(addDays(currentMonth, -1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const onDateClick = (day) => {
    setSelectedDate(day);
    if (view === 'month') setView('day');
    else setCurrentMonth(day);
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
        matchesStatus = ['confirmed', 'completed', 'arrived'].includes(status);
      } else if (statusFilter !== 'all') {
        matchesStatus = status === statusFilter.toLowerCase();
      }

      const matchesSearch = patientName.includes(search) || reason.includes(search);
      
      return matchesDoc && matchesStatus && matchesSearch;
    });
  }, [appointments, doctorFilter, statusFilter, searchQuery]);

  // --- Rendering Helpers ---
  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md rounded-t-3xl border-b border-slate-100">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight min-w-[200px]">
            {format(currentMonth, view === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            <button onClick={prev} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <button onClick={goToToday} className="px-4 text-xs font-bold text-slate-500 hover:text-blue-600 uppercase tracking-wider">Today</button>
            <button onClick={next} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
            className={`min-h-[140px] bg-white border-r border-b border-slate-100 p-3 group transition-all hover:bg-blue-50/20 cursor-pointer relative ${!isCurrentMonth ? "bg-slate-50/50 opacity-40 shadow-inner" : ""
              }`}
            key={day.toString()}
            onClick={() => onDateClick(cloneDay)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className={`text-sm font-bold transition-all ${isToday(day)
                  ? "bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-2xl shadow-lg shadow-blue-200 -mt-1 -ml-1 scale-110"
                  : isCurrentMonth ? "text-slate-700" : "text-slate-400"
                  }`}>
                  {format(day, "d")}
                </span>
                {dayAppointments.length > 0 && isCurrentMonth && (
                  <span className="text-[10px] font-black text-blue-600/60 mt-1 uppercase tracking-tighter">
                    {dayAppointments.length} Appt{dayAppointments.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {dayAppointments.length > 0 && isCurrentMonth && (
                <div className="flex -space-x-1">
                  {dayAppointments.slice(0, 3).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 border border-white" />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
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
              {dayAppointments.length > 3 && (
                <div className="text-[9px] font-black text-slate-400 text-center py-1 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  + {dayAppointments.length - 3} MORE
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
              className="absolute bottom-2 right-2 p-1.5 bg-blue-50 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectSlot(cloneDay);
              }}
            >
              <UserPlus size={14} />
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
      <div className="bg-white rounded-b-3xl overflow-hidden shadow-sm flex flex-col">
        <div className="grid grid-cols-[80px_1fr] bg-slate-50/50 border-b border-slate-100">
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
                <div key={hour} className="h-20 border-r border-b border-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {format(setHours(new Date(), hour), 'hh:mm a')}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 relative">
              {days.map((day, dayIdx) => (
                <div key={dayIdx} className="relative border-r border-slate-50">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="h-20 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group relative"
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
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayAppointments = filteredAppointments.filter(app => isSameDay(app.start, currentMonth));

    return (
      <div className="bg-white rounded-b-3xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center border border-slate-100">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{format(currentMonth, 'MMM')}</span>
              <span className="text-xl font-black text-slate-800">{format(currentMonth, 'd')}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{format(currentMonth, 'EEEE')}</h3>
              <p className="text-sm text-slate-400 font-medium">{dayAppointments.length} Appointments Scheduled</p>
            </div>
          </div>
          <button
            onClick={() => handleSelectSlot(currentMonth)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
          >
            <UserPlus size={18} />
            Book Slot
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-hide">
          <div className="grid grid-cols-[100px_1fr]">
            <div className="bg-slate-50/20 border-r border-slate-100">
              {hours.map(hour => (
                <div key={hour} className="h-24 flex items-center justify-center text-xs font-black text-slate-400 border-b border-slate-50">
                  {format(setHours(new Date(), hour), 'hh:00 a')}
                </div>
              ))}
            </div>
            <div className="relative">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-24 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group relative"
                  onClick={() => handleSelectSlot(setHours(currentMonth, hour))}
                >
                  <div className="absolute inset-0 flex flex-wrap gap-2 p-3">
                    {dayAppointments
                      .filter(app => app.start.getHours() === hour)
                      .map(app => (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={app.id}
                          className={`min-w-[200px] h-fit p-3 rounded-2xl shadow-sm border-l-4 flex flex-col gap-1 transition-all ${app.resource.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-400' :
                            app.resource.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-400' :
                              'bg-blue-50 text-blue-700 border-blue-400'
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEvent(app);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase opacity-60 px-2 py-0.5 bg-white/50 rounded-lg">
                              {format(app.start, 'hh:mm a')}
                            </span>
                            <div className="flex gap-1">
                              <button className="p-1 hover:bg-white/80 rounded-lg transition-colors"><MoreHorizontal size={14} /></button>
                            </div>
                          </div>
                          <h4 className="font-bold text-sm tracking-tight">{app.resource.patientName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Activity size={12} className="opacity-40" />
                            <span className="text-[10px] font-bold opacity-60 truncate">Dr. {app.resource.doctorName}</span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-6 min-h-screen transition-all duration-500 ${isEmbedded ? 'bg-transparent' : 'bg-slate-50'}`}>
      <ToastContainer position="bottom-right" theme="colored" />

      {!isEmbedded && (
        <div className="mb-10 grid grid-cols-2 lg:grid-cols-5 gap-6">
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
        {/* Sidebar / Filters */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search patient..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 placeholder:text-slate-400 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 block">Filter by Doctor</label>
              <select
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
              >
                <option value="all">All Doctors</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
              </select>
            </div>

            <button
              onClick={() => setIsAddToWaitlistModalOpen(true)}
              className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-600 hover:text-white transition-all group"
            >
              <Bell size={20} className="group-hover:animate-bounce" />
              Join Waitlist
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-xl shadow-blue-200 text-white relative overflow-hidden">
            <div className="relative z-10">
              <CalendarIcon className="mb-4 opacity-50" size={32} />
              <h3 className="text-xl font-bold mb-2">Efficient Scheduling</h3>
              <p className="text-blue-100 text-xs leading-relaxed font-medium">Click on any empty time slot in the Day or Week view to quickly book an appointment.</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
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
      className={`bg-gradient-to-br ${colors[color]} p-6 rounded-[2rem] shadow-xl text-white cursor-pointer transition-all ${
        isActive ? 'ring-4 ring-white/30 scale-105 shadow-2xl z-10' : 'opacity-90'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</span>
        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
          {React.cloneElement(icon, { size: 20 })}
        </div>
      </div>
      <p className="text-3xl font-black">{value}</p>
    </motion.div>
  );
}

export default AppointmentManagment;