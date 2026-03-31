import { Search, User, Trash2, X, AlertTriangle, PlusCircle, Eye, CheckCircle, XCircle, Clock, MoreVertical, FileText, CalendarPlus, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../services/api";
import { toast } from "react-toastify";
import Pagination from "../../../components/common/Pagination";
import PaymentModeModal from "../../../components/common/PaymentModeModal";

const PatientPanel = ({
  onViewPatient,
  patients = [],
  patientsLoading,
  patientsError,
  onAddPatient,
  setActiveTab,
  setRebookData,
  currentPage: serverCurrentPage,
  totalPages,
  onPageChange
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPatientForPayment, setSelectedPatientForPayment] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Filter patients
  const filteredPatients = useMemo(() => {
    return (patients || []).filter((patient) => {
      const matchesSearch =
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.mobile || patient.phone || patient.contactNumber || patient.contact || '').includes(searchTerm);

      const patientStatus = patient.paymentStatus || patient.status || 'active';
      let matchesStatus = true;
      if (statusFilter === 'Paid') {
        matchesStatus = patientStatus === 'paid';
      } else if (statusFilter === 'Pending') {
        matchesStatus = patientStatus === 'pending';
      } else if (statusFilter === 'Active') {
        matchesStatus = patientStatus !== 'dead';
      } else if (statusFilter === 'Dead') {
        matchesStatus = patientStatus === 'dead';
      }

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  // Use the filtered patients directly (already limited by server)
  const paginatedPatients = filteredPatients;

  // Calculate counts for each status
  const statusCounts = useMemo(() => {
    const all = patients || [];
    return {
      All: all.length,
      Paid: all.filter(p => (p.paymentStatus || p.status) === 'paid').length,
      Pending: all.filter(p => (p.paymentStatus || p.status) === 'pending').length,
      Active: all.filter(p => {
        const s = p.paymentStatus || p.status;
        return s !== 'dead';
      }).length,
      Dead: all.filter(p => (p.paymentStatus || p.status) === 'dead').length
    };
  }, [patients]);

  // Open delete confirmation modal
  const openDeleteModal = (patient) => {
    setPatientToDelete(patient);
    setDeleteModalOpen(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setPatientToDelete(null);
  };

  // Confirm delete patient
  const confirmDeletePatient = async () => {
    if (!patientToDelete || !patientToDelete._id) {
      toast.error("Invalid patient ID");
      return;
    }

    const id = patientToDelete._id;
    setDeletingId(id);

    try {
      await api.delete(`/patients/${id}`);
      toast.success("Patient deleted successfully");
      closeDeleteModal();
      // Trigger page refresh to sync data
      window.location.reload();
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting patient. Please try again.';
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

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
    navigate(`/admin/patient/${patient._id}`);
  };

  const handleReappointment = (patient) => {
    setOpenMenuId(null);
    const rebookInfo = {
      patientName: patient.name,
      firstName: patient.firstName || patient.name?.split(' ')[0] || '',
      lastName: patient.lastName || patient.name?.split(' ').slice(1).join(' ') || '',
      patientPhone: patient.mobile || patient.phone || patient.contactNumber || patient.contact || '',
      patientEmail: patient.email || '',
      patientId: patient.patientId,
      gender: patient.gender,
      patientAge: patient.age,
      ageType: patient.ageType || 'Year',
      bloodGroup: patient.bloodGroup,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      zip: patient.zip
    };

    if (setRebookData && setActiveTab) {
      setRebookData(rebookInfo);
      setActiveTab('Calendar View');
    } else {
      navigate('?tab=Calendar View', {
        state: {
          rebookData: rebookInfo
        }
      });
    }
  };

  const handleMarkAsDead = async (patient) => {
    setOpenMenuId(null);
    try {
      // Find the patient's billing records
      const billsResponse = await api.get('/billing');
      
      // Match by patientId or patient name - be more flexible with matching
      const patientBills = billsResponse.data.filter(bill => {
        const billPatientId = String(bill.patientId || '');
        const patientIdStr = String(patient.patientId || '');
        const patientIdObj = String(patient._id || '');
        const patientNameLower = (patient.name || '').toLowerCase();
        const billPatientNameLower = (bill.patientName || '').toLowerCase();
        
        return billPatientId === patientIdStr || 
               billPatientId === patientIdObj ||
               billPatientNameLower === patientNameLower;
      });

      if (patientBills.length === 0) {
        toast.warning(`No billing records found for ${patient.name}. Patient will still be marked as dead.`);
      }

      // Update each bill to Dead status (capitalized to match billing model)
      let updatedCount = 0;
      for (const bill of patientBills) {
        try {
          await api.put(`/billing/${bill._id}`, { 
            status: 'Dead'
          });
          updatedCount++;
        } catch (billError) {
          console.log('Bill update error:', billError);
        }
      }

      // Also update the patient user status (even if no bills found)
      try {
        await api.put(`/patients/${patient._id}`, { 
          status: 'dead',
          isDead: true,
          deathDate: new Date().toISOString()
        });
      } catch (e) {
        console.log('Patient update error:', e);
      }

      toast.success(`${patient.name} has been marked as dead (${updatedCount} bills updated)`);
      
      // Small delay to ensure database updates are committed before refresh
      setTimeout(() => {
        // Refresh using the add prop callback if available
        if (onAddPatient) {
          onAddPatient();
        }
        // Fallback to reload
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error marking patient as dead:', error);
      toast.error('Error updating patient status: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle marking a dead patient as undead (active again)
  const handleMarkAsUndead = async (patient) => {
    setOpenMenuId(null);
    try {
      // Find the patient's billing records
      const billsResponse = await api.get('/billing');
      
      // Match by patientId or patient name
      const patientBills = billsResponse.data.filter(bill => {
        const billPatientId = String(bill.patientId || '');
        const patientIdStr = String(patient.patientId || '');
        const patientIdObj = String(patient._id || '');
        const patientNameLower = (patient.name || '').toLowerCase();
        const billPatientNameLower = (bill.patientName || '').toLowerCase();
        
        return billPatientId === patientIdStr || 
               billPatientId === patientIdObj ||
               billPatientNameLower === patientNameLower;
      });

      // Update each bill back to Pending status
      let updatedCount = 0;
      for (const bill of patientBills) {
        try {
          await api.put(`/billing/${bill._id}`, { 
            status: 'Pending'
          });
          updatedCount++;
        } catch (billError) {
          console.log('Bill update error:', billError);
        }
      }

      // Update the patient status back to active
      try {
        await api.put(`/patients/${patient._id}`, { 
          status: 'active',
          isDead: false,
          deathDate: null
        });
      } catch (e) {
        console.log('Patient update error:', e);
      }

      toast.success(`${patient.name} has been marked as active (${updatedCount} bills updated)`);
      
      // Small delay to ensure database updates are committed before refresh
      setTimeout(() => {
        if (onAddPatient) {
          onAddPatient();
        }
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error marking patient as undead:', error);
      toast.error('Error updating patient status: ' + (error.message || 'Unknown error'));
    }
  };

  // Keep delete for actual deletion if needed
  const handleDeletePatient = (patient) => {
    setOpenMenuId(null);
    openDeleteModal(patient);
  };

  const handleMarkAsPaid = (patient) => {
    setOpenMenuId(null);
    setSelectedPatientForPayment(patient);
    setIsPaymentModalOpen(true);
  };

  const confirmMarkAsPaid = async (paymentMethod) => {
    if (!selectedPatientForPayment) return;
    const patient = selectedPatientForPayment;
    setIsPaymentModalOpen(false);
    
    try {
      // Find pending bills for this patient and mark as paid
      const response = await api.get('/billing');
      const pendingBills = response.data.filter(bill => 
        bill.patientId === patient.patientId && (bill.status === 'Pending' || bill.status === 'pending')
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
      
      // Small delay and refresh to show updated status
      setTimeout(() => {
        if (onAddPatient) {
          onAddPatient();
        }
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Error updating billing status');
    } finally {
      setSelectedPatientForPayment(null);
    }
  };

  const handleGenerateReport = (patient) => {
    setOpenMenuId(null);
    // Generate a simple report - could be expanded to generate PDF, etc.
    const reportData = {
      patientName: patient.name,
      patientId: patient.patientId,
      phone: patient.phone,
      email: patient.email,
      paymentStatus: patient.paymentStatus,
      paidAmount: patient.paidAmount,
      pendingAmount: patient.pendingAmount,
      generatedAt: new Date().toLocaleString()
    };
    
    // Open report in new window
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
            <p>Generated: ${reportData.generatedAt}</p>
          </div>
          <table>
            <tr><td>Patient Name:</td><td>${reportData.patientName}</td></tr>
            <tr><td>Patient ID:</td><td>${reportData.patientId}</td></tr>
            <tr><td>Phone:</td><td>${reportData.phone || 'N/A'}</td></tr>
            <tr><td>Email:</td><td>${reportData.email || 'N/A'}</td></tr>
            <tr><td>Payment Status:</td><td>${reportData.paymentStatus}</td></tr>
            <tr><td>Paid Amount:</td><td>₹${reportData.paidAmount || 0}</td></tr>
            <tr><td>Pending Amount:</td><td>₹${reportData.pendingAmount || 0}</td></tr>
          </table>
          <script>window.print()</script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  };

  return (

    <motion.div
      initial={{ x: "100%", opacity: 0 }}      // Start off-screen (right side)
      animate={{ x: 0, opacity: 1 }}           // Slide in
      exit={{ x: "100%", opacity: 0 }}         // Slide out (if using route transitions)
      transition={{ duration: 1.0, ease: "easeInOut" }}  // Smooth and slow
      className="space-y-6 sm:space-y-8 p-4 sm:p-8"
    >
      {/*Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight flex items-center">
          <User className="w-8 h-8 mr-3 text-blue-600" /> Patient Directory
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white dark:bg-gray-800">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          {['All', 'Paid', 'Pending', 'Active', 'Dead'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {status}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                statusFilter === status
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>

        {patientsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            <span className="ml-3 text-gray-700 dark:text-gray-300 text-lg">
              Loading patients...
            </span>
          </div>
        ) : patientsError ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-2xl mx-auto text-center">
            <div className="flex flex-col items-center">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
                Unable to load patients
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {patientsError}
              </p>
              <button
                onClick={() => {
                  setPatientsError(null);
                  fetchPatients();
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg mb-4">No patients found in the database.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Add First Patient
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg mb-4">No patients match your search criteria.</p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-blue-50 dark:bg-blue-900/40">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Patient ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Last Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Amount (₹)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedPatients.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {p.patientId || p.id || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {p.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {p.age || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {p.mobile || p.phone || p.contactNumber || p.contact || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {p.lastVisit || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      ₹{(p.paidAmount || p.pendingAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {p.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                          <CheckCircle className="w-3 h-3" /> Paid
                        </span>
                      ) : p.paymentStatus === 'cancelled' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" /> Cancelled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending{p.pendingAmount > 0 ? ` ₹${p.pendingAmount.toLocaleString('en-IN')}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm relative">
                      <div className="flex items-center gap-2" ref={menuRef}>
                        <a 
                          href={`https://wa.me/${(p.mobile || p.phone || p.contactNumber || p.contact || '').replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 transition-colors"
                          title="WhatsApp Patient"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === p._id ? null : p._id)}
                          className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                          title="More options"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {openMenuId === p._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                              style={{ zIndex: 100 }}
                            >
                              <button
                                onClick={() => handleViewProfile(p)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                                View Profile
                              </button>
                              <button
                                onClick={() => handleGenerateReport(p)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/30"
                              >
                                <FileText className="h-4 w-4 text-green-600" />
                                Generate Report
                              </button>
                              <button
                                onClick={() => handleReappointment(p)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                              >
                                <CalendarPlus className="h-4 w-4 text-orange-600" />
                                Re-Appointment
                              </button>
                              {p.paymentStatus !== 'paid' && (
                                <button
                                  onClick={() => handleMarkAsPaid(p)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                                >
                                  <span className="h-4 w-4 text-amber-600 font-bold">₹</span>
                                  Mark as Paid
                                </button>
                              )}
                              {p.paymentStatus === 'dead' ? (
                                <button
                                  onClick={() => handleMarkAsUndead(p)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Mark as Undead
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMarkAsDead(p)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
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
                ))}
              </tbody>
            </table>
            <Pagination 
              currentPage={serverCurrentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
          >
            {/* Close button */}
            <button
              onClick={closeDeleteModal}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Delete Patient
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {patientToDelete?.name}
              </span>
              ? This will also delete all their appointments and related records.
            </p>

            {/* Warning text */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
              <p className="text-amber-800 dark:text-amber-200 text-sm text-center">
                ⚠️ This action cannot be undone. All appointments, billing records, and notifications associated with this patient will also be deleted.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePatient}
                disabled={deletingId}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {deletingId ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
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