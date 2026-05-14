import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Calendar as CalendarIcon, Tag, User, CheckCircle, X, 
  Trash2, Loader2, Search, Filter, Phone, Eye, Clock, 
  AlertCircle, ChevronDown, MoreHorizontal, CalendarClock,
  TrendingUp, CheckSquare, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { followUpReminderApi } from '../../services/api';
import { toast } from 'react-toastify';
import AddFollowUpReminderModal from '../../components/reminders/AddFollowUpReminderModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const FollowUpReminderPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); 
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchReminders = async () => {
    setLoading(true);
    try {
      let response;
      response = await followUpReminderApi.getFollowUpReminders();
      setReminders(response.reminders || []);
    } catch (error) {
      console.error("Failed to fetch reminders:", error);
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    return {
      total: reminders.length,
      today: reminders.filter(r => r.reminderAt.startsWith(todayStr)).length,
      due: reminders.filter(r => new Date(r.reminderAt) <= now && r.status !== 'COMPLETED').length,
      completed: reminders.filter(r => r.status === 'COMPLETED').length,
      highPriority: reminders.filter(r => r.priority === 'HIGH' || r.priority === 'URGENT').length
    };
  }, [reminders]);

  const handleAction = async (actionFn, id, successMsg) => {
    try {
      await actionFn(id);
      toast.success(successMsg);
      fetchReminders();
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this reminder?")) {
      handleAction(followUpReminderApi.deleteFollowUpReminder, id, "Reminder deleted");
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setShowAddModal(true);
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LOW': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      case 'PENDING': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SNOOZED': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'RESCHEDULED': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const processedReminders = useMemo(() => {
    let filtered = reminders.filter(r => {
      const matchesSearch = 
        r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.patientId?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customPatientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.patientId?.mobile?.includes(searchQuery) ||
        r.customPatientMobile?.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      let matchesType = true;
      if (filterType === 'today') matchesType = r.reminderAt.startsWith(todayStr);
      else if (filterType === 'due') matchesType = new Date(r.reminderAt) <= now;

      return matchesSearch && matchesStatus && matchesType;
    });

    return filtered;
  }, [reminders, searchQuery, statusFilter, filterType]);

  const paginatedReminders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedReminders.slice(startIndex, startIndex + itemsPerPage);
  }, [processedReminders, currentPage]);

  const totalPages = Math.ceil(processedReminders.length / itemsPerPage);

  const SummaryCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:bg-gray-50">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">{title}</p>
        <p className="text-xl font-bold text-black">{value}</p>
      </div>
    </div>
  );

  const TableSkeleton = () => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="animate-pulse">
          <td colSpan="11" className="px-4 py-4 border-b">
            <div className="flex gap-4 items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-md"></div>
              <div className="h-3 bg-gray-100 rounded w-48"></div>
              <div className="h-3 bg-gray-100 rounded w-24 ml-auto"></div>
              <div className="h-3 bg-gray-100 rounded w-16"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="p-5 space-y-5 bg-white dark:bg-gray-900 min-h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">
            Followup & Reminders
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Manage patient follow-ups and care coordination
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingReminder(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
        >
          <Bell size={16} /> Add Reminder
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard title="Total" value={stats.total} icon={Bell} colorClass="bg-blue-50 text-blue-600" />
        <SummaryCard title="Today" value={stats.today} icon={CalendarIcon} colorClass="bg-indigo-50 text-indigo-600" />
        <SummaryCard title="Due" value={stats.due} icon={AlertTriangle} colorClass="bg-red-50 text-red-600" />
        <SummaryCard title="Completed" value={stats.completed} icon={CheckSquare} colorClass="bg-green-50 text-green-600" />
        <SummaryCard title="High Priority" value={stats.highPriority} icon={TrendingUp} colorClass="bg-orange-50 text-orange-600" />
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search patient, mobile, title..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm text-black"
          />
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex border rounded-lg overflow-hidden bg-white">
            {['all', 'today', 'due'].map((type) => (
              <button
                key={type}
                onClick={() => { setFilterType(type); setCurrentPage(1); }}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-all ${
                  filterType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border bg-white px-3 py-2 rounded-lg">
            <Filter size={14} className="text-gray-400" />
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-0 text-xs font-semibold outline-none cursor-pointer text-black"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="SNOOZED">Snoozed</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* CRM Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200">
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">SR No.</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Patient Name</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Mobile</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Reminder</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Note</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Type</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Priority</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Date</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Time</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase text-gray-500 tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton />
              ) : paginatedReminders.length > 0 ? (
                paginatedReminders.map((r, index) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4 text-xs text-gray-400">
                      {((currentPage - 1) * itemsPerPage + index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xs">
                          {(r.patientId?.fullName || r.customPatientName || 'P').charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-black dark:text-white truncate max-w-[150px]">
                          {r.patientId?.fullName || r.customPatientName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone size={12} className="text-gray-400" />
                        {r.patientId?.mobile || r.customPatientMobile || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-black dark:text-gray-200">
                        {r.title}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[150px]" title={r.note}>
                        <p className="text-xs text-gray-500 truncate">
                          {r.note || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {r.reminderType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getPriorityBadge(r.priority)}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-700">
                      {new Date(r.reminderAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-700 uppercase">
                      {new Date(r.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => {
                            const id = r.patientId?._id || r.patientId?.id;
                            if (id) {
                              const patientUrl = user?.role === 'receptionist' 
                                ? `/receptionist/patient/${id}` 
                                : `/admin-dashboard?tab=Patients&patientId=${id}`;
                              navigate(patientUrl);
                            } else {
                              toast.info("No profile linked.");
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                          <button 
                            onClick={() => handleAction(followUpReminderApi.completeFollowUpReminder, r._id, "Completed")}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}

                        <button 
                          onClick={() => handleEdit(r)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Edit Reminder"
                        >
                          <CalendarClock size={16} />
                        </button>

                        <button 
                          onClick={() => handleDelete(r._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="py-20 text-center">
                    <div className="flex flex-col items-center">
                      <Bell size={32} className="text-gray-200 mb-4" />
                      <h3 className="text-base font-bold text-black">No follow-up reminders found</h3>
                      <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                        Create reminders to never miss patient follow-ups and ensure high-quality care coordination.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-[11px] text-gray-500 font-medium">
              Showing {((currentPage - 1) * itemsPerPage + 1)} to {Math.min(currentPage * itemsPerPage, processedReminders.length)} of {processedReminders.length}
            </p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded-md hover:bg-white disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-md text-[11px] font-semibold transition-all ${
                    currentPage === i + 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-500 hover:text-black border'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded-md hover:bg-white disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddFollowUpReminderModal 
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingReminder(null);
          }}
          editReminder={editingReminder}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingReminder(null);
            fetchReminders();
          }}
        />
      )}
    </div>
  );
};

export default FollowUpReminderPanel;
