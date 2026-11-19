import { Search, User, Users, Trash2, X, AlertTriangle, PlusCircle, Eye, CheckCircle, XCircle, Clock, MoreVertical, FileText, CalendarPlus, Phone, MessageCircle, Download, MessageSquare, Upload } from "lucide-react";
import { exportPatientsToExcel } from "../../../utils/excelExport";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../services/api";
import { toast } from "react-toastify";
import Pagination from "../../../components/common/Pagination";
import PaymentModeModal from "../../../components/common/PaymentModeModal";
import { TableSkeleton } from "../../../components/Shared/DashboardSkeletons";
import BulkImportModal from "./BulkImportModal";
import DailyCaseRegisterModal from "../../../components/Shared/DailyCaseRegisterModal";
import { useAuth } from "../../../context/AuthContext";
import DentalConsentFormModal from "./DentalConsentFormModal";
import BulkMessageModal from "../../../components/Patient/BulkMessageModal";

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
  totalItems,
  itemsPerPage,
  isSeeAll: propIsSeeAll,
  onPageChange,
  onRefresh,
  searchTerm: globalSearchTerm,
  onSearchChange
}) => {
  const { isDentistClinic } = useAuth();
  const [localSearchTerm, setLocalSearchTerm] = useState(globalSearchTerm || "");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [activeMenuPatient, setActiveMenuPatient] = useState(null);
  const [mobileActionPatient, setMobileActionPatient] = useState(null);

  const handleMenuClick = (e, p) => {
    e.stopPropagation();
    if (window.innerWidth < 768) {
      setMobileActionPatient(p);
      setOpenMenuId(null);
      setActiveMenuPatient(null);
      return;
    }
    if (openMenuId === p._id) {
      setOpenMenuId(null);
      setActiveMenuPatient(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
    setOpenMenuId(p._id);
    setActiveMenuPatient(p);
  };
  const [statusFilter, setStatusFilter] = useState("All");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPatientForPayment, setSelectedPatientForPayment] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeConsentPatient, setActiveConsentPatient] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClose = () => {
      setOpenMenuId(null);
      setActiveMenuPatient(null);
    };
    document.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      document.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);
  const navigate = useNavigate();
  const [selectedPatientIds, setSelectedPatientIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [localIsSeeAll, setLocalIsSeeAll] = useState(false);
  const isSeeAll = propIsSeeAll !== undefined ? propIsSeeAll : localIsSeeAll;

  const handleToggleSeeAll = (seeAll) => {
    setLocalIsSeeAll(seeAll);
    if (onPageChange) {
      onPageChange(1, seeAll ? 'all' : 15);
    }
  };

  // Clear selection on page change or filter change
  useEffect(() => {
    setSelectedPatientIds([]);
  }, [serverCurrentPage, statusFilter, isSeeAll]);



  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== globalSearchTerm) {
        onSearchChange(localSearchTerm);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearchTerm, onSearchChange, globalSearchTerm]);

  // Sync local search with global if changed externally (e.g. cleared)
  useEffect(() => {
    setLocalSearchTerm(globalSearchTerm || "");
  }, [globalSearchTerm]);

  // Filter patients by status (Search is now handled by backend)
  const filteredPatients = useMemo(() => {
    return (patients || []).filter((patient) => {
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

      return matchesStatus;
    });
  }, [patients, statusFilter]);

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
        if (onRefresh) {
          onRefresh();
        }
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
      className="space-y-6 sm:space-y-8 p-4 sm:p-8 pb-24 sm:pb-8 w-full max-w-full overflow-x-hidden"
    >
      {/*Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-50 flex items-center transition-all">
          <User className="w-5 h-5 mr-2 text-blue-600" /> Patient Directory
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search patient..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>
          <div className="flex flex-row gap-2 w-full sm:w-auto">

            <button
              onClick={() => exportPatientsToExcel(patients)}
              className="flex-1 inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 font-bold text-xs sm:text-sm whitespace-nowrap"
              title="Export to Excel"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Export
            </button>

            <button
              onClick={() => {
                if (typeof setActiveTab === 'function') {
                  setActiveTab('Notes');
                } else {
                  navigate('/admin/notes');
                }
              }}
              className="flex-1 inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-md shadow-amber-500/20 font-bold text-xs sm:text-sm whitespace-nowrap"
              title="Doctor & Patient Notes"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Notes
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 font-bold text-xs sm:text-sm whitespace-nowrap"
              title="Import from Excel/CSV"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Import
            </button>

            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex-1 inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-600/20 font-bold text-xs sm:text-sm whitespace-nowrap"
              title="Form 25 Daily Case Register"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Form 25 Register
            </button>

            {selectedPatientIds.length > 0 && (
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 font-bold text-xs sm:text-sm whitespace-nowrap"
                title="Send Bulk WhatsApp Update"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                Bulk Message ({selectedPatientIds.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white dark:bg-gray-800">
        {/* Status Filter Tabs & View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {['All', 'Paid', 'Pending', 'Active', 'Dead'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${statusFilter === status
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                {status}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusFilter === status
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSeeAll ? (
              <button
                type="button"
                onClick={() => handleToggleSeeAll(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all shadow-xs cursor-pointer"
                title="Switch back to 15 patients per page"
              >
                <span>Viewing: <strong className="font-black text-indigo-900 dark:text-indigo-100">All ({totalItems || patients.length})</strong></span>
                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-black">Show 15 / Page</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleSeeAll(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="See all patients on one page"
              >
                <Users className="w-3.5 h-3.5" />
                <span>See All ({totalItems || statusCounts.All})</span>
              </button>
            )}

            {isSeeAll && paginatedPatients.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allIds = paginatedPatients.map(p => p._id);
                  const isAllSelected = allIds.length > 0 && allIds.every(id => selectedPatientIds.includes(id));
                  if (isAllSelected) {
                    setSelectedPatientIds([]);
                  } else {
                    setSelectedPatientIds(allIds);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  paginatedPatients.length > 0 && paginatedPatients.every(p => selectedPatientIds.includes(p._id))
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100'
                }`}
                title="Select all patients for bulk messaging"
              >
                <Users className="w-3.5 h-3.5" />
                {paginatedPatients.length > 0 && paginatedPatients.every(p => selectedPatientIds.includes(p._id))
                  ? `✓ All ${paginatedPatients.length} Selected`
                  : `Select All (${paginatedPatients.length})`}
              </button>
            )}
          </div>
        </div>

        {patientsLoading ? (
          <div className="p-4">
            <TableSkeleton rows={10} cols={8} />
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
              onClick={() => setActiveTab('New Appointment')}
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
              onClick={() => {
                setLocalSearchTerm('');
                onSearchChange('');
              }}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full min-h-[360px] pb-32">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-blue-50 dark:bg-blue-900/40">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider w-10">
                      <input
                        type="checkbox"
                        checked={paginatedPatients.length > 0 && paginatedPatients.every(p => selectedPatientIds.includes(p._id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = [...new Set([...selectedPatientIds, ...paginatedPatients.map(p => p._id)])];
                            setSelectedPatientIds(newIds);
                          } else {
                            const paginatedIds = paginatedPatients.map(p => p._id);
                            setSelectedPatientIds(selectedPatientIds.filter(id => !paginatedIds.includes(id)));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
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
                      Appointment Date
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
                  {paginatedPatients.map((p, index) => {
                    const isDropUp = index >= paginatedPatients.length - 3 || paginatedPatients.length <= 3;
                    return (
                    <tr
                      key={p._id}
                      className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedPatientIds.includes(p._id)}
                          onChange={() => {
                            if (selectedPatientIds.includes(p._id)) {
                              setSelectedPatientIds(selectedPatientIds.filter(id => id !== p._id));
                            } else {
                              setSelectedPatientIds([...selectedPatientIds, p._id]);
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {p.patientId || p.id || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewProfile(p)}
                          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline transition-colors text-left"
                          title="View Patient Profile"
                        >
                          {p.name || '-'}
                        </button>
                        {p.lastShortId && (
                          <div className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">Last Appt ID: {p.lastShortId}</div>
                        )}
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
                        ₹{(p.totalAmount !== undefined && p.totalAmount !== null ? p.totalAmount : ((p.paidAmount || 0) + (p.pendingAmount || 0))).toLocaleString('en-US')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {p.paymentStatus === 'paid' || (p.pendingAmount === 0 && (p.paidAmount > 0 || (p.totalAmount || 0) === 0)) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="w-3 h-3" /> Paid
                          </span>
                        ) : p.paymentStatus === 'cancelled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" /> Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending{p.pendingAmount > 0 ? ` ₹${p.pendingAmount.toLocaleString('en-US')}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm relative">
                        <div className="flex items-center gap-2" ref={menuRef}>

                          <button
                            onClick={(e) => handleMenuClick(e, p)}
                            className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                            title="More options"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
            {isSeeAll ? (
              <div className="flex flex-col sm:flex-row justify-between items-center p-4 text-sm text-gray-500 gap-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <span className="font-medium">
                  Showing all <strong className="text-gray-900 dark:text-white">{paginatedPatients.length}</strong> patients
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleSeeAll(false)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
                >
                  Show 15 Per Page
                </button>
              </div>
            ) : (
              <Pagination
                currentPage={serverCurrentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={onPageChange}
              />
            )}
          </>
        )}
      </div>



      {/* FIXED VIEWPORT DOWNSIDE PATIENT ACTION MENU (NEVER CLIPPED, FULL VIEW) */}
      {openMenuId && activeMenuPatient && (
        <div
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            right: `${menuPos.right}px`,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 animate-in fade-in zoom-in-95 select-none"
        >
          {isDentistClinic && (
            <button
              onClick={() => {
                const p = activeMenuPatient;
                setOpenMenuId(null);
                setActiveMenuPatient(null);
                setActiveConsentPatient(p);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-bold cursor-pointer"
            >
              <FileText className="h-4 w-4 text-indigo-650" />
              <span>Consent Form</span>
            </button>
          )}
          <button
            onClick={() => {
              const p = activeMenuPatient;
              setOpenMenuId(null);
              setActiveMenuPatient(null);
              handleViewProfile(p);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"
          >
            <Eye className="h-4 w-4 text-blue-600" />
            <span>View Profile</span>
          </button>
          <button
            onClick={() => {
              const p = activeMenuPatient;
              setOpenMenuId(null);
              setActiveMenuPatient(null);
              handleGenerateReport(p);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer"
          >
            <FileText className="h-4 w-4 text-green-600" />
            <span>Generate Report</span>
          </button>
          <button
            onClick={() => {
              const p = activeMenuPatient;
              setOpenMenuId(null);
              setActiveMenuPatient(null);
              handleReappointment(p);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer"
          >
            <CalendarPlus className="h-4 w-4 text-orange-600" />
            <span>Re-Appointment</span>
          </button>
          {activeMenuPatient.paymentStatus !== 'paid' && (
            <button
              onClick={() => {
                const p = activeMenuPatient;
                setOpenMenuId(null);
                setActiveMenuPatient(null);
                handleMarkAsPaid(p);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 cursor-pointer"
            >
              <span className="h-4 w-4 text-amber-600 font-bold">₹</span>
              <span>Mark as Paid</span>
            </button>
          )}
          {activeMenuPatient.paymentStatus === 'dead' ? (
            <button
              onClick={() => {
                const p = activeMenuPatient;
                setOpenMenuId(null);
                setActiveMenuPatient(null);
                handleMarkAsUndead(p);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Mark as Undead</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const p = activeMenuPatient;
                setOpenMenuId(null);
                setActiveMenuPatient(null);
                handleMarkAsDead(p);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Mark as Dead</span>
            </button>
          )}
          <button
            onClick={() => {
              const p = activeMenuPatient;
              setOpenMenuId(null);
              setActiveMenuPatient(null);
              handleDeletePatient(p);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 font-semibold border-t border-gray-100 dark:border-gray-700 mt-0.5 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* NATIVE MOBILE ACTION SHEET FOR PATIENT */}
      <AnimatePresence>
        {mobileActionPatient && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileActionPatient(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm">
                  {mobileActionPatient.fullName?.charAt(0) || 'P'}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">
                    {mobileActionPatient.fullName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {mobileActionPatient.patientId} • Phone: {mobileActionPatient.phone || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    const p = mobileActionPatient;
                    setMobileActionPatient(null);
                    handleViewProfile(p);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl font-medium"
                >
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span>View Profile</span>
                </button>

                {isDentistClinic && (
                  <button
                    onClick={() => {
                      const p = mobileActionPatient;
                      setMobileActionPatient(null);
                      setActiveConsentPatient(p);
                    }}
                    className="w-full flex items-center gap-3 p-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl font-bold"
                  >
                    <FileText className="h-4 w-4 text-indigo-650" />
                    <span>Consent Form</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const p = mobileActionPatient;
                    setMobileActionPatient(null);
                    handleGenerateReport(p);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl font-medium"
                >
                  <FileText className="h-4 w-4 text-green-600" />
                  <span>Generate Report</span>
                </button>

                <button
                  onClick={() => {
                    const p = mobileActionPatient;
                    setMobileActionPatient(null);
                    handleReappointment(p);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-xl font-medium"
                >
                  <CalendarPlus className="h-4 w-4 text-orange-600" />
                  <span>Re-Appointment</span>
                </button>

                {mobileActionPatient.paymentStatus !== 'paid' && (
                  <button
                    onClick={() => {
                      const p = mobileActionPatient;
                      setMobileActionPatient(null);
                      handleMarkAsPaid(p);
                    }}
                    className="w-full flex items-center gap-3 p-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl font-medium"
                  >
                    <span className="h-4 w-4 text-amber-600 font-bold">₹</span>
                    <span>Mark as Paid</span>
                  </button>
                )}

                {mobileActionPatient.paymentStatus === 'dead' ? (
                  <button
                    onClick={() => {
                      const p = mobileActionPatient;
                      setMobileActionPatient(null);
                      handleMarkAsUndead(p);
                    }}
                    className="w-full flex items-center gap-3 p-3 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl font-medium"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Mark as Undead</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const p = mobileActionPatient;
                      setMobileActionPatient(null);
                      handleMarkAsDead(p);
                    }}
                    className="w-full flex items-center gap-3 p-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Mark as Dead</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const p = mobileActionPatient;
                    setMobileActionPatient(null);
                    handleDeletePatient(p);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-semibold border-t border-gray-100 dark:border-gray-700 mt-1"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Patient</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMobileActionPatient(null)}
                className="mt-4 w-full py-2.5 text-center text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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


      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onRefresh={() => {
          if (onRefresh) {
            onRefresh();
          } else {
            window.location.reload();
          }
        }}
      />

      {/* Daily Case Register Form 25 Modal */}
      <DailyCaseRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      {/* Dental Consent Form Modal */}
      <DentalConsentFormModal
        isOpen={!!activeConsentPatient}
        onClose={() => setActiveConsentPatient(null)}
        patientData={activeConsentPatient}
      />

      {/* Bulk WhatsApp Message Modal */}
      {isBulkModalOpen && (
        <BulkMessageModal
          isOpen={isBulkModalOpen}
          onClose={() => {
            setIsBulkModalOpen(false);
            setSelectedPatientIds([]);
          }}
          selectedPatients={patients.filter(p => selectedPatientIds.includes(p._id))}
        />
      )}

    </motion.div>
  );
};

export default PatientPanel;
