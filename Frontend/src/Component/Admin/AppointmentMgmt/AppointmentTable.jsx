import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  IndianRupee,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  X,
  List,
  CalendarDays,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Brain
} from "lucide-react";
import api from "../../../services/api";
import AppointmentManagement from "./AppointmentManagment.jsx";
import Pagination from "../../../components/common/Pagination";

export default function AppointmentTable({ rebookData }) {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'calendar'

  // Handle re-booking from navigation state
  useEffect(() => {
    if (rebookData) {
      setViewMode("calendar");
      // The AppointmentManagement component will handle the actual modal opening
    }
  }, [rebookData]);



  // Fetch appointments from API
  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { default: api } = await import("../../../services/api");
      const [appointmentsRes, billsRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/billing')
      ]);
      
      const appointmentsData = appointmentsRes.data || [];
      const billsData = billsRes.data || [];

      // Map appointmentId to its corresponding bill amount
      const billMap = {};
      billsData.forEach(bill => {
        if (bill.appointmentId) {
          billMap[bill.appointmentId] = bill.amount;
        }
      });

      // Join appointments with bill amounts if amount is 0 or missing
      const joinedAppointments = appointmentsData.map(appt => ({
        ...appt,
        amount: appt.amount || billMap[appt._id] || billMap[appt.appointmentId] || 0
      }));

      setAppointments(joinedAppointments);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    setUpdatingId(appointmentId);
    try {
      const response = await api.put(`/appointments/${appointmentId}/status`, { status: newStatus });

      if (response.status !== 200) {
        throw new Error('Failed to update status');
      }

      // Update local state
      setAppointments(prev =>
        prev.map(app =>
          app._id === appointmentId ? { ...app, status: newStatus } : app
        )
      );
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
      fetchAppointments();
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle WhatsApp Notify
  const handleWhatsAppNotify = (app) => {
    const phone = app.patientPhone?.replace(/\D/g, '');
    if (!phone) return alert('No phone number available for this patient.');
    
    const message = `Today is your appointment book with ${app.doctorName} on ${app.time} and ${app.date}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Handle status toggle (One-Click Arrived -> Completed)
  const handleStatusToggle = (appointment) => {
    // If pending/confirmed/arrived -> mark as completed (Confirmed)
    if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
        updateAppointmentStatus(appointment._id, 'completed');
    }
  };

  // Filter appointments based on search and status
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const matchesSearch =
        appointment.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.patientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.patientPhone?.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAppointments = filteredAppointments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

  // Format time
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800' // Show green Confirmed for completed
    };
    
    const label = status === 'completed' ? 'CONFIRMED' : (status?.charAt(0).toUpperCase() + status?.slice(1));
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {label}
      </span>
    );
  };

  // Get AI Risk Indicator
  const getRiskIndicator = (patientId, patientName) => {
    // In a real app, this would be a calculated field from the backend
    // For this demo, we'll use a stable hash-based logic to simulate risk for all patients
    const hash = (patientId || patientName || "").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const riskScore = hash % 100;

    if (riskScore < 60) {
      return { 
        level: 'Low', 
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100', 
        icon: <ShieldCheck className="w-3 h-3" />,
        desc: 'Consistent attendance history.'
      };
    } else if (riskScore < 85) {
      return { 
        level: 'Medium', 
        color: 'text-amber-600 bg-amber-50 border-amber-100', 
        icon: <ShieldAlert className="w-3 h-3" />,
        desc: 'Occasional rescheduling detected.'
      };
    } else {
      return { 
        level: 'High', 
        color: 'text-red-600 bg-red-50 border-red-100', 
        icon: <ShieldX className="w-3 h-3" />,
        desc: 'High probability of No-Show.'
      };
    }
  };

  // Open details modal
  const openDetailsModal = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setSelectedAppointment(null);
    setIsDetailsModalOpen(false);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle items per page
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-100 min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading appointments...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-100 min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600">Error: {error}</p>
            <button
              onClick={fetchAppointments}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700">Appointments</h1>
            <p className="text-gray-500 mt-1">
              Dashboard <span className="mx-2">/</span> Appointments
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-white border rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${viewMode === "list"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">List View</span>
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${viewMode === "calendar"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span className="text-sm font-medium">Calendar View</span>
              </button>
            </div>

            <button
              onClick={fetchAppointments}
              className="p-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-600 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {viewMode === "calendar" ? (
          <div className="mt-6">
            <AppointmentManagement isEmbedded={true} rebookData={rebookData} />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Appointments</p>
                    <p className="text-2xl font-semibold text-gray-700">{appointments.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Confirmed</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {appointments.filter(a => a.status === 'confirmed').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Pending</p>
                    <p className="text-2xl font-semibold text-yellow-600">
                      {appointments.filter(a => a.status === 'pending').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Cancelled</p>
                    <p className="text-2xl font-semibold text-red-600">
                      {appointments.filter(a => a.status === 'cancelled').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card */}
            <div className="bg-white mt-6 rounded shadow-sm border">

              <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-700">
                  Appointment List
                </h2>

                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search appointments..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-4 pr-10 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-600 border-b bg-gray-50">
                    <tr>
                      <th className="p-4">Doctor</th>
                      <th className="p-4">Speciality</th>
                      <th className="p-4">Patient</th>
                      <th className="p-4">Appointment Date & Time</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentAppointments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">
                          No appointments found
                        </td>
                      </tr>
                    ) : (
                      currentAppointments.map((appointment) => (
                        <tr key={appointment._id} className="border-b hover:bg-gray-50">

                          {/* Doctor */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-gray-700 font-medium">{appointment.doctorName || 'N/A'}</p>
                                <p className="text-xs text-gray-500">ID: {appointment.doctorId || '-'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Speciality */}
                          <td className="p-4">
                            <span className="text-gray-600">{appointment.specialty || '-'}</span>
                          </td>

                          {/* Patient */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-green-500" />
                              </div>
                              <div>
                                <p className="text-gray-700 font-medium">{appointment.patientName || 'N/A'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-gray-500">{appointment.patientPhone || '-'}</p>
                                  {/* AI Risk Badge */}
                                  {(() => {
                                    const risk = getRiskIndicator(appointment.patientId, appointment.patientName);
                                    return (
                                      <div 
                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tighter ${risk.color}`}
                                        title={`AI Prediction: ${risk.level} Risk. ${risk.desc}`}
                                      >
                                        {risk.icon}
                                        {risk.level}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="p-4">
                            <div className="text-gray-700">{formatDate(appointment.date)}</div>
                            <div className="text-xs text-gray-500">{formatTime(appointment.time)}</div>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            {getStatusBadge(appointment.status)}
                          </td>

                          {/* Amount */}
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-gray-700">
                              <IndianRupee className="w-4 h-4 text-gray-400" />
                              {appointment.amount || '0.00'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {/* View Details */}
                              <button
                                onClick={() => openDetailsModal(appointment)}
                                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                                {/* One-Click Arrive Button - Hidden for future dates */}
                                {appointment.status !== 'completed' && appointment.status !== 'cancelled' && !isFutureDate(appointment.date) && (
                                  <button
                                    onClick={() => handleStatusToggle(appointment)}
                                    disabled={updatingId === appointment._id}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="Mark as Arrived"
                                  >
                                    {updatingId === appointment._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                  </button>
                                )}

                                {/* Cancel Button (Only for non-completed) */}
                                {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                                  <button
                                    onClick={() => updateAppointmentStatus(appointment._id, 'cancelled')}
                                    disabled={updatingId === appointment._id}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Cancel Appointment"
                                  >
                                    {updatingId === appointment._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                  </button>
                                )}

                                {/* WhatsApp Notify */}
                                {appointment.patientPhone && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                                  <button 
                                    onClick={() => handleWhatsAppNotify(appointment)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors border-l border-gray-100 ml-1 pl-3"
                                    title="Notify via WhatsApp"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredAppointments.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-semibold text-gray-700">Appointment Details</h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-500">Status</span>
                  {getStatusBadge(selectedAppointment.status)}
                </div>

                {/* Doctor Info */}
                <div className="py-3 border-b">
                  <span className="text-gray-500 block mb-2">Doctor</span>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">{selectedAppointment.doctorName || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{selectedAppointment.specialty}</p>
                    </div>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="py-3 border-b">
                  <span className="text-gray-500 block mb-2">Patient</span>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">{selectedAppointment.patientName || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{selectedAppointment.patientAge ? `${selectedAppointment.patientAge} years` : ''}</p>
                      <p className="text-sm text-gray-500">{selectedAppointment.patientPhone}</p>
                      <p className="text-sm text-gray-500">{selectedAppointment.patientEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="py-3 border-b">
                  <span className="text-gray-500 block mb-2">Appointment Date & Time</span>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    {formatDate(selectedAppointment.date)} at {formatTime(selectedAppointment.time)}
                  </div>
                </div>

                {/* Reason */}
                {selectedAppointment.reason && (
                  <div className="py-3 border-b">
                    <span className="text-gray-500 block mb-2">Reason for Visit</span>
                    <p className="text-gray-700">{selectedAppointment.reason}</p>
                  </div>
                )}

                {/* Symptoms */}
                {selectedAppointment.symptoms && (
                  <div className="py-3 border-b">
                    <span className="text-gray-500 block mb-2">Symptoms</span>
                    <p className="text-gray-700">{selectedAppointment.symptoms}</p>
                  </div>
                )}

                {/* Amount */}
                <div className="py-3">
                  <span className="text-gray-500 block mb-2">Amount</span>
                  <p className="text-xl font-semibold text-gray-700">
                    ₹{selectedAppointment.amount || '0.00'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Close
                </button>
                {selectedAppointment.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment._id, 'confirmed');
                      closeModal();
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Confirm Appointment
                  </button>
                )}
                {selectedAppointment.status === 'confirmed' && (
                  <button
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment._id, 'cancelled');
                      closeModal();
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
