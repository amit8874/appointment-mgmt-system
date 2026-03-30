// --- 3. BOOKING MODAL COMPONENT ---

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, Bell, BookMarked, CalendarDays, CalendarIcon,
  Check, Clock, Info, List, User, X, UserPlus, Edit, Trash2,
  XCircle, FileText, Star, Hash, ClockIcon, Loader2
} from "lucide-react";
import api from "../../../services/api";
import format from 'date-fns/format';
import parse from 'date-fns/parse';

// ─────────────────────────────────────────────────────────────────────────────
// BookAppointmentModal
// Props:
//   isOpen, onClose, onBook, slotInfo, existingEvent
//   doctors: [{ id, name, specialization }]  ← from API
//   patients: [{ id, name }]                  ← from API
// ─────────────────────────────────────────────────────────────────────────────
function BookAppointmentModal({
  isOpen,
  onClose,
  onBook,
  slotInfo,
  existingEvent,
  doctors = [],
  patients = [],
}) {
  const [patientName, setPatientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  // Pre-fill form when slotInfo or existingEvent changes
  React.useEffect(() => {
    if (existingEvent) {
      setPatientName(existingEvent.resource.patientName);
      setDoctorId(existingEvent.resource.doctorId);
      setReason(existingEvent.resource.reason);
      setDate(format(existingEvent.start, 'yyyy-MM-dd'));
      setTime(format(existingEvent.start, 'HH:mm'));
    } else if (slotInfo) {
      setPatientName('');
      setDoctorId('');
      setReason('');
      setDate(format(slotInfo.start, 'yyyy-MM-dd'));
      setTime(format(slotInfo.start, 'HH:mm'));
    } else {
      // Fresh open with no slot
      setPatientName('');
      setDoctorId('');
      setReason('');
      setDate('');
      setTime('');
    }
    setAvailableSlots([]);
    setSlotsError('');
  }, [slotInfo, existingEvent, isOpen]);

  // Fetch real available slots from API when doctor + date are selected
  React.useEffect(() => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      setSlotsError('');
      return;
    }



    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError('');
      try {
        const res = await api.get(`/doctors/${doctorId}/slots?date=${date}`);
        const data = res.data;
        if (res.status !== 200) {
          setSlotsError(data.message || 'Failed to load slots');
          setAvailableSlots([]);
        } else if (!data.available) {
          setSlotsError(data.message || 'Doctor is not available on this day');
          setAvailableSlots([]);
        } else {
          // API returns 12-hour display strings like "9:00 AM"
          // We need to also store the 24h value so we can submit it
          // NEW: Handle slot objects { time, isBooked, isPast }
          const mapped = (data.slots || []).map((slotObj) => {
            const label = typeof slotObj === 'object' ? slotObj.time : slotObj;
            const isBooked = typeof slotObj === 'object' ? slotObj.isBooked : false;
            const isPast = typeof slotObj === 'object' ? slotObj.isPast : false;
            
            // Convert "9:00 AM" → "09:00"  |  "2:30 PM" → "14:30"
            const parsedDate = parse(label, 'h:mm a', new Date());
            const value = format(parsedDate, 'HH:mm');
            return { label, value, isBooked, isPast };
          });
          setAvailableSlots(mapped);
        }
      } catch (err) {
        setSlotsError('Unable to load available slots. Please try again.');
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [doctorId, date]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientName || !doctorId || !reason || !date || !time) {
      alert('Please fill all fields.');
      return;
    }
    onBook({ patientName, doctorId, reason, date, time });
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-lg w-full max-w-lg m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
                {existingEvent ? 'Reschedule Appointment' : 'Book Appointment'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Patient Name — autocomplete from live patients */}
              <FormInput label="Patient Name" icon={<User size={18} />}>
                <input
                  type="text"
                  id="patientName"
                  list="patient-list"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter or search patient name..."
                  required
                />
                <datalist id="patient-list">
                  {patients.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </FormInput>

              {/* Select Doctor — populated from live API */}
              <FormInput label="Doctor" icon={<UserPlus size={18} />}>
                <select
                  id="doctor"
                  value={doctorId}
                  onChange={(e) => {
                    setDoctorId(e.target.value);
                    setTime(''); // reset time when doctor changes
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  required
                >
                  <option value="" disabled>Select a doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}{doc.specialization ? ` — ${doc.specialization}` : ''}
                    </option>
                  ))}
                </select>
              </FormInput>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Date" icon={<CalendarIcon size={18} />}>
                  <input
                    type="date"
                    id="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setTime(''); // reset time when date changes
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </FormInput>

                {/* Time — loaded from real API slots */}
                <FormInput label="Time" icon={<Clock size={18} />}>
                  {slotsLoading ? (
                    <div className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl flex items-center gap-2 text-gray-500 text-sm">
                      <Loader2 className="animate-spin h-4 w-4" />
                      Loading slots…
                    </div>
                  ) : (
                    <select
                      id="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      required
                      disabled={availableSlots.length === 0 || slotsLoading}
                    >
                      <option value="" disabled>
                        {!doctorId || !date
                          ? 'Select doctor & date first'
                          : slotsError
                            ? slotsError
                            : availableSlots.length === 0
                              ? 'No slots available'
                              : 'Select time'}
                      </option>
                      {availableSlots.map((slot) => (
                        <option 
                          key={slot.value} 
                          value={slot.value}
                          disabled={slot.isBooked || slot.isPast}
                        >
                          {slot.label} {slot.isPast ? '(Expired)' : slot.isBooked ? '(Booked)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </FormInput>
              </div>

              {/* Slots error banner */}
              {slotsError && !slotsLoading && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle size={13} /> {slotsError}
                </p>
              )}

              {/* Reason for Visit */}
              <FormInput label="Reason for Visit" icon={<Info size={18} />}>
                <input
                  type="text"
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Annual Checkup"
                  required
                />
              </FormInput>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-2xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
                >
                  <BookMarked size={18} />
                  {existingEvent ? 'Update Booking' : 'Book Now'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper for form inputs
function FormInput({ label, icon, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

// --- 4. DETAILS MODAL COMPONENT ---

function AppointmentDetailsModal({
  isOpen,
  onClose,
  event,
  onCancel,
  onReschedule,
  onComplete,
}) {
  if (!event) return null;

  const { resource, start, end, id } = event;
  const statusConfig = {
    confirmed: {
      color: 'text-green-600 bg-green-100',
      icon: <Check size={16} />,
    },
    pending: {
      color: 'text-yellow-600 bg-yellow-100',
      icon: <Clock size={16} />,
    },
    cancelled: {
      color: 'text-red-600 bg-red-100',
      icon: <X size={16} />,
    },
    completed: {
      color: 'text-blue-600 bg-blue-100',
      icon: <Check size={16} />,
    },
  };
  const currentStatus = statusConfig[resource.status] || statusConfig.pending;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-lg w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
                Appointment Details
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <InfoRow
                icon={<Hash size={18} className="text-purple-500" />}
                label="Appointment ID"
                value={<span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{id}</span>}
              />
              <InfoRow
                icon={<User size={18} className="text-blue-500" />}
                label="Patient"
                value={`${resource.patientName}${resource.patientAge ? ` (${resource.patientAge} years)` : ''}`}
              />
              <InfoRow
                icon={<UserPlus size={18} className="text-green-500" />}
                label="Doctor"
                value={resource.doctorName}
              />
              <InfoRow
                icon={<CalendarDays size={18} className="text-gray-500" />}
                label="Date & Time"
                value={`${format(start, 'PPP')} @ ${format(start, 'p')} - ${format(end, 'p')}`}
              />
              <InfoRow
                icon={<ClockIcon size={18} className="text-orange-500" />}
                label="Booking Date"
                value={format(new Date(resource.bookingDate), 'PPP')}
              />
              <InfoRow
                icon={<Info size={18} className="text-purple-500" />}
                label="Reason"
                value={resource.reason}
              />

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  <span
                    className={`flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full w-fit ${currentStatus.color}`}
                  >
                    {currentStatus.icon}
                    {resource.status}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">Payment</span>
                  <span className="text-base font-semibold text-gray-800">
                    {resource.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-b-2xl border-t">
              {resource.status !== 'cancelled' && resource.status !== 'completed' && (
                <>
                  {resource.status !== 'confirmed' && (new Date(start).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0)) && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onComplete(id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Check size={18} />
                      Mark Complete
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onReschedule}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Edit size={18} />
                    Reschedule
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this appointment?')) {
                        onCancel(id);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Trash2 size={18} />
                    Cancel
                  </motion.button>
                </>
              )}
              {(resource.status === 'cancelled' || resource.status === 'completed') && (
                <div className="w-full text-center">
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`font-medium flex items-center justify-center gap-2 ${resource.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'
                      }`}
                  >
                    <XCircle size={20} />
                    This appointment has been {resource.status}.
                  </motion.p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper for info rows
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-1">{icon}</div>
      <div>
        <span className="block text-sm font-medium text-gray-500">{label}</span>
        <span className="block text-base font-semibold text-gray-800">{value}</span>
      </div>
    </div>
  );
}

// --- 5. WAITLIST MODAL COMPONENT ---

function WaitlistModal({ isOpen, onClose, waitlist, onSchedule, onRemove, onUpdatePriority }) {
  const sortedWaitlist = [...waitlist].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.addedToWaitlist) - new Date(b.addedToWaitlist);
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertTriangle size={16} />;
      case 'medium': return <Clock size={16} />;
      case 'low': return <Check size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-lg w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <List className="h-6 w-6 text-orange-500" />
                Patient Waitlist ({waitlist.length})
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {sortedWaitlist.length === 0 ? (
                <div className="text-center py-12">
                  <List className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No patients in waitlist</h3>
                  <p className="text-gray-500">All requested appointments have been scheduled.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedWaitlist.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{item.patientName}</h3>
                            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(item.priority)}`}>
                              {getPriorityIcon(item.priority)}
                              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <InfoRow
                              icon={<User size={16} className="text-blue-500" />}
                              label="Doctor"
                              value={item.doctorName}
                            />
                            <InfoRow
                              icon={<CalendarDays size={16} className="text-gray-500" />}
                              label="Requested Date & Time"
                              value={`${format(new Date(item.requestedDate), 'PPP')} @ ${item.requestedTime}`}
                            />
                            <InfoRow
                              icon={<Info size={16} className="text-purple-500" />}
                              label="Reason"
                              value={item.reason}
                            />
                            <InfoRow
                              icon={<Clock size={16} className="text-orange-500" />}
                              label="Added to Waitlist"
                              value={format(new Date(item.addedToWaitlist), 'PPP p')}
                            />
                          </div>
                          {item.contactInfo && (
                            <div className="mt-3">
                              <InfoRow
                                icon={<Bell size={16} className="text-green-500" />}
                                label="Contact Info"
                                value={item.contactInfo}
                              />
                            </div>
                          )}
                          {item.notes && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Notes:</strong> {item.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onSchedule(item)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-2xl hover:bg-green-600 transition-colors"
                        >
                          <Check size={16} />
                          Schedule Now
                        </motion.button>

                        <div className="flex gap-1">
                          {['high', 'medium', 'low'].map((level) => (
                            <motion.button
                              key={level}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onUpdatePriority(item.id, level)}
                              className={`px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${item.priority === level
                                ? level === 'high'
                                  ? 'bg-red-500 text-white'
                                  : level === 'medium'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-green-500 text-white'
                                : level === 'high'
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : level === 'medium'
                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                            >
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </motion.button>
                          ))}
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (window.confirm('Remove this patient from the waitlist?')) {
                              onRemove(item.id);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-2xl hover:bg-red-600 transition-colors"
                        >
                          <X size={16} />
                          Remove
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- 6. ADD TO WAITLIST MODAL COMPONENT ---

function AddToWaitlistModal({
  isOpen,
  onClose,
  onAdd,
  doctors = [],
  patients = [],
}) {
  const [patientName, setPatientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState('medium');
  const [contactInfo, setContactInfo] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setPatientName('');
      setDoctorId('');
      setReason('');
      setDate('');
      setTime('');
      setPriority('medium');
      setContactInfo('');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientName || !doctorId || !reason || !date || !time) {
      alert('Please fill all required fields.');
      return;
    }
    onAdd({ patientName, doctorId, reason, date, time, priority, contactInfo, notes });
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-lg w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Bell className="h-6 w-6 text-purple-500" />
                Add to Waitlist
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Patient Name */}
              <FormInput label="Patient Name" icon={<User size={18} />}>
                <input
                  type="text"
                  id="wl-patientName"
                  list="wl-patient-list"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter or search patient name..."
                  required
                />
                <datalist id="wl-patient-list">
                  {patients.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </FormInput>

              {/* Select Doctor */}
              <FormInput label="Doctor" icon={<UserPlus size={18} />}>
                <select
                  id="wl-doctor"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                  required
                >
                  <option value="" disabled>Select a doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}{doc.specialization ? ` — ${doc.specialization}` : ''}
                    </option>
                  ))}
                </select>
              </FormInput>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Preferred Date" icon={<CalendarIcon size={18} />}>
                  <input
                    type="date"
                    id="wl-date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </FormInput>
                <FormInput label="Preferred Time" icon={<Clock size={18} />}>
                  <input
                    type="time"
                    id="wl-time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </FormInput>
              </div>

              {/* Priority */}
              <FormInput label="Priority" icon={<Star size={18} />}>
                <select
                  id="wl-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </FormInput>

              {/* Reason for Visit */}
              <FormInput label="Reason for Visit" icon={<Info size={18} />}>
                <input
                  type="text"
                  id="wl-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Emergency Consultation"
                  required
                />
              </FormInput>

              {/* Contact Info */}
              <FormInput label="Contact Info (Email/Phone)" icon={<Bell size={18} />}>
                <input
                  type="text"
                  id="wl-contactInfo"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="email@example.com or phone number"
                />
              </FormInput>

              {/* Notes */}
              <FormInput label="Additional Notes" icon={<FileText size={18} />}>
                <textarea
                  id="wl-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Any additional information..."
                  rows={3}
                />
              </FormInput>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-2xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:bg-purple-700 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
                >
                  <Bell size={18} />
                  Add to Waitlist
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { BookAppointmentModal, AppointmentDetailsModal, WaitlistModal, AddToWaitlistModal, FormInput, InfoRow };
