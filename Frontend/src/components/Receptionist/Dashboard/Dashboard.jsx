import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserPlus, FileText, Search, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardStats from './DashboardStats';
import { useAuth } from '../../../context/AuthContext';
import NewAppointmentForm from '../../../Component/Admin/NewAppointmentForm';
import Pagination from '../../common/Pagination';

const PAGE_SIZE = 15;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    todayAppointments: 0,
    patientsToday: 0,
    waitingForCheckin: 0,
    newPatients: 0,
    totalCollected: 0,
    pendingPayments: 0,
  });

  const userName = user?.name || 'there';
  const [loading, setLoading] = useState(true);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { appointmentApi, patientApi, billingApi } = await import('../../../services/api');

      const [apptStats, patientStats, billingStats, recentAppts] = await Promise.all([
        appointmentApi.getTodayStats(),
        patientApi.getTodayStats(),
        billingApi.getStats(),
        appointmentApi.getTodayAppointments()
      ]);

      setStats({
        todayAppointments: apptStats.total || 0,
        patientsToday: patientStats || 0,
        waitingForCheckin: apptStats.waiting || 0,
        newPatients: patientStats || 0,
        totalCollected: billingStats?.totalCollected || 0,
        pendingPayments: billingStats?.pendingPayments || 0,
      });

      setRecentAppointments(recentAppts.map(appt => ({
        id: appt._id,
        patient: appt.patientName,
        doctor: appt.doctorName,
        specialty: appt.specialty || '',
        time: appt.time,
        room: appt.room || '',
        status: appt.status
          ? appt.status.charAt(0).toUpperCase() + appt.status.slice(1)
          : 'Scheduled',
        isUrgent: appt.reason?.toLowerCase().includes('urgent') || false,
        type: appt.reason || 'Consultation',
        duration: appt.duration || '',
      })));
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ─── Status chip ────────────────────────────────────────────────────────────
  const StatusChip = ({ status, onStatusChange, appointmentId }) => {
    const statusColors = {
      'Scheduled': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'Checked In': 'bg-green-100 text-green-800 hover:bg-green-200',
      'Pending': 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      'Confirmed': 'bg-green-100 text-green-800 hover:bg-green-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      'Completed': 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      'Cancelled': 'bg-red-100 text-red-800 hover:bg-red-200',
    };

    const nextStatusMap = {
      'Scheduled': 'Checked In',
      'Checked In': 'In Progress',
      'Pending': 'Confirmed',
      'Confirmed': 'In Progress',
      'In Progress': 'Completed',
    };

    const next = nextStatusMap[status];

    return (
      <button
        onClick={() => next && onStatusChange(appointmentId, next)}
        title={next ? `Click to → ${next}` : 'Final status'}
        className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${statusColors[status] || 'bg-gray-100 text-gray-800'
          }`}
      >
        {status}
      </button>
    );
  };

  // ─── Status update via API ───────────────────────────────────────────────
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    // Optimistic UI update
    setRecentAppointments(prev =>
      prev.map(appt =>
        appt.id === appointmentId ? { ...appt, status: newStatus } : appt
      )
    );

    // Backend status map
    const backendMap = {
      'Checked In': 'pending',
      'In Progress': 'confirmed',
      'Completed': 'completed',
      'Confirmed': 'confirmed',
      'Cancelled': 'cancelled',
    };

    try {
      const { default: api } = await import('../../../services/api');
      await api.put(`/appointments/${appointmentId}`, {
        status: backendMap[newStatus] || newStatus.toLowerCase()
      });
      // Refresh stats after status change
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      // Rollback on failure
      fetchDashboardData();
    }
  };

  // ─── Quick Actions ────────────────────────────────────────────────────────
  const quickActions = [
    {
      id: 'new-appointment',
      name: 'New Appointment',
      icon: Calendar,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-200',
      action: () => setShowNewAppointmentModal(true)
    },
    {
      id: 'new-patient',
      name: 'New Patient',
      icon: UserPlus,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-200',
      action: () => navigate('/receptionist/patients')
    },
    {
      id: 'search',
      name: 'Search Patient',
      icon: Search,
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-200',
      action: () => navigate('/receptionist/patients')
    },
    {
      id: 'new-bill',
      name: 'New Bill',
      icon: FileText,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-200',
      action: () => navigate('/receptionist/billing')
    }
  ];

  // ─── Pagination ─────────────────────────────────────────────────────────
  const totalAppointments = recentAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointments / PAGE_SIZE));
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return recentAppointments.slice(start, start + PAGE_SIZE);
  }, [recentAppointments, currentPage]);

  const firstEntry = totalAppointments === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastEntry = Math.min(currentPage * PAGE_SIZE, totalAppointments);

  return (
    <div className="bg-gray-50 pb-8">
      {/* Masthead */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-t-lg -mx-4 sm:-mx-6 md:-mx-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {userName}!</h1>
          <p className="text-teal-100 mt-1 text-sm md:text-base">Here's what's happening today</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 -mt-6">
        <div className="space-y-6">

          {/* Stats Cards */}
          <DashboardStats stats={stats} loading={loading} />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <motion.button
                key={action.id}
                whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={action.action}
                className={`p-6 bg-white rounded-xl shadow-md border border-gray-200 text-left hover:border-teal-200 transition-all duration-300`}
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${action.color} mb-4 shadow-lg`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{action.name}</h3>
                <p className="mt-1 text-sm text-gray-500">Click to {action.name.toLowerCase()}</p>
              </motion.button>
            ))}
          </div>

          {/* Today's Appointments Table */}
          <div className="bg-white shadow-xl overflow-hidden rounded-xl border border-gray-100 mt-8">
            {/* Header */}
            <div className="px-6 py-5 sm:px-8 flex justify-between items-center border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Today's Appointments</h3>
                <p className="mt-1 text-sm text-gray-500">Click a status badge to advance it</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate('/receptionist/appointments')}
                  className="inline-flex items-center px-4 py-2 border border-teal-300 shadow-sm text-sm font-medium rounded-lg text-teal-700 bg-white hover:bg-teal-50 transition-colors duration-200"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Appointments
                </button>
                <button
                  onClick={() => navigate('/receptionist/appointments')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transition-all duration-200"
                >
                  View All
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginatedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">
                        No appointments scheduled for today.
                      </td>
                    </tr>
                  ) : (
                    paginatedAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className={`${appointment.isUrgent
                          ? 'bg-rose-50 border-l-4 border-rose-500'
                          : 'hover:bg-gray-50'
                          } ${appointment.status === 'Completed' ? 'opacity-70' : 'opacity-100'} transition-all duration-200`}
                      >
                        {/* Patient */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center border-2 border-white shadow">
                              <User className="h-5 w-5 text-teal-700" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {appointment.patient}
                                {appointment.isUrgent && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                                    URGENT
                                  </span>
                                )}
                              </div>
                              {appointment.duration && (
                                <div className="text-xs text-gray-400">{appointment.duration}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{appointment.doctor}</div>
                          {appointment.specialty && (
                            <div className="text-xs text-gray-400">{appointment.specialty}</div>
                          )}
                        </td>

                        {/* Time */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{appointment.time}</div>
                          {appointment.room && (
                            <div className="text-xs text-gray-400">{appointment.room}</div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appointment.type}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusChip
                            status={appointment.status}
                            onStatusChange={handleStatusUpdate}
                            appointmentId={appointment.id}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && totalAppointments > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalAppointments}
                itemsPerPage={PAGE_SIZE}
              />
            )}

            {/* View All link */}
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-100">
              <button
                onClick={() => navigate('/receptionist/appointments')}
                className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline transition-colors"
              >
                View all appointments →
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-700">New Appointment</h2>
              <button
                onClick={() => setShowNewAppointmentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <NewAppointmentForm
              onClose={() => setShowNewAppointmentModal(false)}
              onSuccess={() => {
                setShowNewAppointmentModal(false);
                fetchDashboardData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
export default Dashboard;
