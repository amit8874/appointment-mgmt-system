import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, User, Trash2, X, AlertTriangle, PlusCircle, Eye, CheckCircle, Clock, MoreVertical, FileText, CalendarPlus, Phone, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../common/Pagination';
import PaymentModeModal from '../../common/PaymentModeModal';

const PatientPanel = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPatientForPayment, setSelectedPatientForPayment] = useState(null);
  const itemsPerPage = 15;
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Fetch patients from backend
  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { patientApi } = await import('../../../services/api');
      const data = await patientApi.getAll();
      // Handle both array (legacy) and object (paginated) responses
      if (data && data.patients && Array.isArray(data.patients)) {
        setPatients(data.patients);
      } else {
        setPatients(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError("Failed to load patients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Filter patients
  const filteredPatients = useMemo(() => {
    return (patients || []).filter((patient) => {
      const matchesSearch =
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.patientId || patient.id)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm) ||
        patient.contact?.includes(searchTerm);

      // Status filter - check paymentStatus or status field
      const patientStatus = (patient.paymentStatus || patient.status || 'active').toLowerCase();
      let matchesStatus = true;
      if (statusFilter === 'Paid') {
        matchesStatus = patientStatus === 'paid';
      } else if (statusFilter === 'Pending') {
        matchesStatus = patientStatus === 'pending';
      } else if (statusFilter === 'Active') {
        // Active = not dead (includes paid, pending, or undefined/null)
        matchesStatus = patientStatus !== 'dead';
      } else if (statusFilter === 'Dead') {
        matchesStatus = patientStatus === 'dead';
      }

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Paginate patients
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

  // Calculate counts for each status
  const statusCounts = useMemo(() => {
    const all = patients || [];
    return {
      All: all.length,
      Paid: all.filter(p => (p.paymentStatus || p.status || '').toLowerCase() === 'paid').length,
      Pending: all.filter(p => (p.paymentStatus || p.status || '').toLowerCase() === 'pending').length,
      Active: all.filter(p => {
        const s = (p.paymentStatus || p.status || '').toLowerCase();
        return s !== 'dead';
      }).length,
      Dead: all.filter(p => (p.paymentStatus || p.status || '').toLowerCase() === 'dead').length
    };
  }, [patients]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle menu actions
  const handleViewProfile = (patient) => {
    setOpenMenuId(null);
    navigate(`/receptionist/patient/${patient._id}`);
  };

  const handleReappointment = (patient) => {
    setOpenMenuId(null);
    // Navigate to new appointment page with patient info
    navigate('/receptionist/new-appointment', {
      state: {
        rebookData: {
          patient: patient
        }
      }
    });
  };

  const handleMarkAsDead = async (patient) => {
    setOpenMenuId(null);
    try {
      const { patientApi } = await import('../../../services/api');
      await api.put(`/patients/${patient._id}`, { 
        status: 'dead',
        isDead: true,
        deathDate: new Date().toISOString()
      });
      
      toast.success(`${patient.name} has been marked as dead`);
      fetchPatients();
    } catch (error) {
      console.error('Error marking patient as dead:', error);
      toast.error('Error updating patient status');
    }
  };

  const handleMarkAsUndead = async (patient) => {
    setOpenMenuId(null);
    try {
      await api.put(`/patients/${patient._id}`, { 
        status: 'active',
        isDead: false,
        deathDate: null
      });
      
      toast.success(`${patient.name} has been marked as active`);
      fetchPatients();
    } catch (error) {
      console.error('Error marking patient as undead:', error);
      toast.error('Error updating patient status');
    }
  };

  const handleMarkAsPaid = async (patient) => {
    setOpenMenuId(null);
    setSelectedPatientForPayment(patient);
    setIsPaymentModalOpen(true);
  };

  const confirmMarkAsPaid = async (paymentMethod) => {
    if (!selectedPatientForPayment) return;
    const patient = selectedPatientForPayment;
    setIsPaymentModalOpen(false);
    
    try {
      const response = await api.get('/billing');
      const pendingBills = response.data.filter(bill => 
        (bill.patientId === patient.patientId || bill.patientId === patient._id) && 
        (bill.status === 'Pending' || bill.status === 'pending')
      );
      
      if (pendingBills.length === 0) {
        toast.info('No pending bills found for this patient');
        return;
      }

      for (const bill of pendingBills) {
        await api.put(`/billing/${bill._id}`, { 
          status: 'Paid',
          paymentMethod: paymentMethod 
        });
      }
      toast.success(`Marked ${pendingBills.length} bill(s) as Paid via ${paymentMethod}`);
      fetchPatients();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Error updating billing status');
    } finally {
      setSelectedPatientForPayment(null);
    }
  };

  const handleGenerateReport = (patient) => {
    setOpenMenuId(null);
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(`
      <html>
        <head>
          <title>Patient Report - ${patient.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            td:first-child { font-weight: bold; width: 40%; }
            .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Patient Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <tr><td>Patient Name:</td><td>${patient.name}</td></tr>
            <tr><td>Patient ID:</td><td>${patient.patientId || patient.id || '-'}</td></tr>
            <tr><td>Phone:</td><td>${patient.mobile || patient.phone || patient.contactNumber || patient.contact || 'N/A'}</td></tr>
            <tr><td>Email:</td><td>${patient.email || 'N/A'}</td></tr>
            <tr><td>Payment Status:</td><td>${patient.paymentStatus || 'N/A'}</td></tr>
            <tr><td>Paid Amount:</td><td>₹${patient.paidAmount || 0}</td></tr>
            <tr><td>Pending Amount:</td><td>₹${patient.pendingAmount || 0}</td></tr>
          </table>
          <script>window.print()</script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  };

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return;
    setDeletingId(patientToDelete._id);
    try {
      await api.delete(`/patients/${patientToDelete._id}`);
      toast.success("Patient deleted successfully");
      setDeleteModalOpen(false);
      fetchPatients();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Error deleting patient');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        <span className="ml-3 text-gray-700 text-lg">Loading patients...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600 bg-blue-50 p-1.5 rounded-lg" />
            Patient Directory
          </h1>
          <p className="text-gray-500 mt-1">Manage and track all patients in one place</p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Stats and Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 p-4 border-b border-gray-100 bg-gray-50/50">
          {['All', 'Paid', 'Pending', 'Active', 'Dead'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {status}
              <span className={`px-2 py-0.5 rounded-lg text-xs ${
                statusFilter === status ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
              }`}>
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-blue-50/50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Patient ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Last Visit</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Amount (₹)</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500 italic">
                    No patients found matching your criteria
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">#{p.patientId || p.id || '-'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{p.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.age || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {p.mobile || p.phone || p.contactNumber || p.contact || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.lastVisit || p.date || '-'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      ₹{(p.paidAmount || p.pendingAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {(p.paymentStatus || p.status || '').toLowerCase() === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                          <CheckCircle className="w-3.5 h-3.5" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm relative">
                      <div className="flex items-center gap-2" ref={menuRef}>
                        <a 
                          href={`https://wa.me/${(p.mobile || p.phone || p.contactNumber || p.contact || '').replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all shadow-sm active:scale-95"
                          title="WhatsApp Patient"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === p._id ? null : p._id)}
                          className={`p-2 rounded-xl transition-all ${
                            openMenuId === p._id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        <AnimatePresence>
                          {openMenuId === p._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, x: -20 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95, x: -20 }}
                              className="absolute right-full mr-2 top-0 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden"
                            >
                              <button
                                onClick={() => handleViewProfile(p)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                                View Profile
                              </button>
                              <button
                                onClick={() => handleGenerateReport(p)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                              >
                                <FileText className="h-4 w-4 text-green-600" />
                                Generate Report
                              </button>
                              <button
                                onClick={() => handleReappointment(p)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                              >
                                <CalendarPlus className="h-4 w-4 text-orange-600" />
                                Re-Appointment
                              </button>
                              {(p.paymentStatus || p.status || '').toLowerCase() !== 'paid' && (
                                <button
                                  onClick={() => handleMarkAsPaid(p)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 transition-colors"
                                >
                                  <span className="h-4 w-4 text-amber-600 font-bold ml-1">₹</span>
                                  Mark as Paid
                                </button>
                              )}
                              {(p.paymentStatus || p.status || '').toLowerCase() === 'dead' ? (
                                <button
                                  onClick={() => handleMarkAsUndead(p)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Mark as Undead
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMarkAsDead(p)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50 mt-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Mark as Dead
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredPatients.length}
          itemsPerPage={itemsPerPage}
        />
      </div>

      {/* Delete Modal Placeholder - can be expanded as needed */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Patient</h3>
            <p className="text-gray-600 mb-8">Are you sure you want to delete {patientToDelete?.name}? This action is irreversible.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all border border-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletePatient}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Mode Selection Modal */}
      <PaymentModeModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={confirmMarkAsPaid}
        patientName={selectedPatientForPayment?.name}
      />
    </motion.div>
  );
};

export default PatientPanel;
