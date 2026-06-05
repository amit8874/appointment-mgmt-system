import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, X, User, Users, Stethoscope, HandHeart, Wallet, BarChart3, Lock, TrendingUp, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import PatientForm from './Patient/PatientForm.jsx';
import AddDoctorForm from './Doctor/AddDoctorForm.jsx';
import ReceptionistForm from './Receptionist/ReceptionistForm.jsx';
import { fetchCounts } from '../../services/api';
import api from '../../services/api';
import { billingApi, analyticsApi } from '../../services/api';
import ErrorBoundary from './ErrorBoundary';
import Header from './Header';
import AdminSidebar from './AdminSidebar';
import MainContent from './MainContent';
import AdminFormModal from './AdminFormModal';
import { usePatients } from '../../hooks/usePatients';
import { useDoctors } from '../../hooks/useDoctors';
import { useReceptionists } from '../../hooks/useReceptionists';
import { useNotifications } from '../../hooks/useNotifications';
import { useTheme } from '../../hooks/useTheme';
import { useUserManagement } from '../../hooks/useUserManagement';
import TrialNotification from '../Organization/TrialNotification';
import LogoutConfirmationModal from '../../components/common/LogoutConfirmationModal';
import OnboardingTour from '../../components/common/OnboardingTour';
import AddMedicine from './Pharmacy/AddMedicine.jsx';

// Main App Component
const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, isAuthenticated } = useAuth();

  // Initialize tab and mode from URL or fallback
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'New Appointment';

  // List of tabs that belong to pharmacy mode to help with auto-detection if mode param is missing
  const pharmacyTabs = [
    'Pharmacy Dashboard', 'Inventory', 'Bulk Upload', 'Opening Stock',
    'Purchase Stock', 'Pharmacy Billing', 'Expiry & Low Stock', 'Suppliers', 'Reports'
  ];

  const initialMode = queryParams.get('mode') || (pharmacyTabs.includes(initialTab) ? 'pharmacy' : 'admin');

  const [activeTab, setActiveTab] = useState(initialTab);
  const [dashboardMode, setDashboardMode] = useState(initialMode);

  // Handle mode switching
  const handleModeSwitch = (mode) => {
    setDashboardMode(mode);
    if (mode === 'pharmacy') {
      setActiveTab('Pharmacy Dashboard');
    } else {
      setActiveTab('New Appointment');
    }
    setPreSelectedMedicine(null);
    setEditingMedicine(null);
  };

  // Expose tab change to window for Header/Notifications to use
  useEffect(() => {
    window.handleTabChange = (tabName) => {
      setActiveTab(tabName);
    };
    return () => { delete window.handleTabChange; };
  }, []);

  // Update URL when activeTab or dashboardMode changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let hasChanged = false;

    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab);
      hasChanged = true;
    }

    if (params.get('mode') !== dashboardMode) {
      params.set('mode', dashboardMode);
      hasChanged = true;
    }

    if (hasChanged) {
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [activeTab, dashboardMode, navigate]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('weekly');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [totalAppointments, setTotalAppointments] = useState(0);

  // Billing state
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [billingLoading, setBillingLoading] = useState(false);

  // Chart data state
  const [appointmentTrendsData, setAppointmentTrendsData] = useState([]);
  const [revenueByDoctorData, setRevenueByDoctorData] = useState([]);
  const [monthlyIncomeExpenseData, setMonthlyIncomeExpenseData] = useState([]);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [trialStatus, setTrialStatus] = useState(null);
  const [whatsappBalance, setWhatsappBalance] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // For form
  const [activeModal, setActiveModal] = useState(null);
  const [rebookData, setRebookData] = useState(null);

  // Use custom hooks
  const patientsHook = usePatients();
  const doctorsHook = useDoctors();
  const receptionistsHook = useReceptionists();
  const notificationsHook = useNotifications();
  const themeHook = useTheme();
  const userManagementHook = useUserManagement();

  const openModal = (type) => setActiveModal(type);
  const closeModal = () => {
    setActiveModal(null);
    patientsHook.setSelectedPatient(null);
  };

  const openPatientForm = (patient = null) => {
    patientsHook.setSelectedPatient(patient);
    setActiveModal('patient');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Fetch all data
  const fetchAllData = async () => {
    try {
      // Set all loading states to true
      patientsHook.setPatientsLoading(true);
      doctorsHook.setDoctorsLoading(true);
      receptionistsHook.setReceptionistsLoading(true);
      patientsHook.setPatientsCountLoading(true);
      doctorsHook.setDoctorsCountLoading(true);
      receptionistsHook.setReceptionistsCountLoading(true);
      setBillingLoading(true);

      // Clear any previous errors
      patientsHook.setPatientsError('');
      doctorsHook.setDoctorsError('');
      receptionistsHook.setReceptionistsError('');

      // Fetch all data in parallel
      const responses = await Promise.all([
        patientsHook.fetchPatients().catch(error => {
          patientsHook.setPatientsError('Error loading patients');
          return [];
        }),
        doctorsHook.fetchDoctors().catch(error => {
          doctorsHook.setDoctorsError('Error loading doctors');
          return [];
        }),
        receptionistsHook.fetchReceptionists().catch(error => {
          receptionistsHook.setReceptionistsError('Error loading receptionists');
          return [];
        }),
        fetchCounts().catch(error => {
          return { patients: 0, doctors: 0, receptionists: 0 };
        }),
        fetchTodayAppointmentsCount().catch(error => {
          return 0;
        }),
        billingApi.getStats().catch(error => {
          return { totalCollected: 0, pendingPayments: 0, todayRevenue: 0 };
        }),
        analyticsApi.getCharts().catch(error => {
          console.error("Error fetching admin charts", error);
          return null;
        }),
        analyticsApi.getDashboard().catch(error => {
          console.error("Error fetching admin dashboard data", error);
          return null;
        }),
        api.get('/whatsapp-credits/balance').catch(error => {
          console.error("Error fetching whatsapp balance", error);
          return { success: false };
        })
      ]);

      const [patientsData, doctorsData, receptionistsData, countsData, todayApptsCount, billingStats, chartsData, dashboardData, whatsappData] = responses;

      if (whatsappData?.success) {
        setWhatsappBalance(whatsappData.data);
      }


      // Update state with fetched data
      patientsHook.setPatients(patientsData);
      doctorsHook.setDoctors(doctorsData);
      receptionistsHook.setReceptionists(receptionistsData);
      patientsHook.setTotalPatients(countsData.patients);
      doctorsHook.setTotalDoctors(countsData.doctors);
      receptionistsHook.setTotalReceptionists(countsData.receptionists);
      setTotalAppointments(todayApptsCount);

      // Update billing state
      setTotalRevenue(billingStats.totalCollected || 0);
      setTodayRevenue(billingStats.todayRevenue || 0);
      setPendingPayments(billingStats.pendingPayments || 0);

      // Update charts data
      if (chartsData) {
        setAppointmentTrendsData(chartsData.appointmentTrends || []);
        setRevenueByDoctorData(chartsData.revenueByDoctor || []);
        setMonthlyIncomeExpenseData(chartsData.incomeExpense || []);
      }

      // Update dashboard specific data (recent appointments)
      if (dashboardData) {
        setRecentAppointments(dashboardData.recentAppointments || []);
      }

    } catch (error) {
    } finally {
      // Reset all loading states
      patientsHook.setPatientsLoading(false);
      doctorsHook.setDoctorsLoading(false);
      receptionistsHook.setReceptionistsLoading(false);
      patientsHook.setPatientsCountLoading(false);
      doctorsHook.setDoctorsCountLoading(false);
      receptionistsHook.setReceptionistsCountLoading(false);
      setBillingLoading(false);
    }
  };

  const fetchTrialStatus = useCallback(async () => {
    try {
      const rawOrgId = user?.organizationId || user?.organization?._id || user?.organization;
      const orgId = typeof rawOrgId === 'object' ? (rawOrgId?._id || rawOrgId?.id) : rawOrgId;

      if (!orgId || typeof orgId !== 'string' || orgId.includes('[object')) return;

      const data = await api.get(`/organizations/${orgId}/trial-status`);
      setTrialStatus(data.data || data); // Handle both wrapped and unwrapped responses safely
    } catch (error) {
      console.error('Error fetching trial status in dashboard:', error);
    }
  }, [user]);

  // On mount
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAllData();
      fetchTrialStatus();
      notificationsHook.fetchNotifications();

      // Check for rebookData in navigation state (React Router location.state)
      if (location.state?.rebookData) {
        setActiveTab('New Appointment');
        setRebookData(location.state.rebookData);
        // Clear state to avoid re-triggering on refresh
        window.history.replaceState({}, document.title);
      }

      // Fetch admins if super admin
      if (user.role === 'superadmin') {
        userManagementHook.fetchAdmins();
      }
    } else {
      console.log('AdminDashboard: User not authenticated, skipping data fetch');
    }

    // Set up polling for notifications every 2 minutes
    const notificationInterval = setInterval(notificationsHook.fetchNotifications, 120000);

    return () => clearInterval(notificationInterval);
  }, [user?.id || user?._id, isAuthenticated]);

  // Enforce adding a doctor if none exists
  useEffect(() => {
    if (!doctorsHook.doctorsCountLoading && doctorsHook.totalDoctors === 0) {
      if (!doctorsHook.showDoctorForm) {
        doctorsHook.openDoctorForm();
      }
    }
  }, [doctorsHook.doctorsCountLoading, doctorsHook.totalDoctors, doctorsHook.showDoctorForm, doctorsHook.openDoctorForm]);

  const fetchTodayAppointmentsCount = async () => {
    try {
      const today = new Date();
      const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      const response = await api.get(`/appointments?date=${localDate}`);
      const appointments = response.data || [];
      return Array.isArray(appointments) ? appointments.length : 0;
    } catch (error) {
      return 0;
    }
  };

  // --- Stats Data (dynamic for patients and doctors) ---
  const stats = useMemo(() => [
    {
      name: "Total Patients",
      count: patientsHook.patientsCountLoading ? "Loading..." : patientsHook.totalPatients,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      name: "Total Doctors",
      count: doctorsHook.doctorsCountLoading ? "Loading..." : doctorsHook.totalDoctors,
      icon: Stethoscope,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      link: "Doctor"
    },
    {
      name: "Total Receptionists",
      count: receptionistsHook.receptionistsCountLoading ? "Loading..." : receptionistsHook.totalReceptionists,
      icon: HandHeart,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30",
      link: "Receptionist"
    },
    {
      name: "Today’s Appointments",
      count: totalAppointments,
      icon: CalendarCheck,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/50",
    },
    {
      name: "Today Revenue",
      count: billingLoading ? "Loading..." : todayRevenue,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/50",
      prefix: "₹",
    },
    {
      name: "Pending Payments",
      count: billingLoading ? "Loading..." : pendingPayments,
      icon: Wallet,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/50",
    },
    {
      name: "Total Revenue",
      count: billingLoading ? "Loading..." : totalRevenue,
      icon: BarChart3,
      color: "text-yellow-600",
      bg: "bg-yellow-50 dark:bg-yellow-900/50",
      prefix: "₹",
    },
    {
      name: "WhatsApp Credits",
      count: whatsappLoading ? "Loading..." : (whatsappBalance?.totalAvailable || 0),
      icon: MessageSquare,
      color: "text-indigo-600",
      bg: "bg-indigo-50 dark:bg-indigo-900/50",
      link: "WhatsApp Credits"
    },
  ], [patientsHook.patientsCountLoading, patientsHook.totalPatients, doctorsHook.doctorsCountLoading, doctorsHook.totalDoctors, receptionistsHook.receptionistsCountLoading, receptionistsHook.totalReceptionists, totalAppointments, totalRevenue, todayRevenue, pendingPayments, billingLoading, whatsappBalance, whatsappLoading]);

  // Charts data is now managed in state variables above

  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [preSelectedMedicine, setPreSelectedMedicine] = useState(null);

  const handleEditMedicine = (medicine) => {
    setEditingMedicine(medicine);
    setShowAddMedicineModal(true);
  };

  const handleAddStock = (medicine) => {
    setPreSelectedMedicine(medicine);
    setActiveTab('Opening Stock');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans antialiased transition-colors duration-500 overflow-x-hidden">
        <OnboardingTour 
          role="admin" 
          disabled={doctorsHook.doctorsCountLoading || doctorsHook.totalDoctors === 0 || doctorsHook.showDoctorForm} 
        />
        {(user?.organizationId || user?.organization?._id) && (
          <TrialNotification organizationId={user?.organizationId?._id || user?.organizationId || user?.organization?._id} />
        )}
        <AnimatePresence>
          {trialStatus?.isTrialExpired && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] backdrop-blur-md bg-white/40 dark:bg-gray-900/60 flex items-center justify-center p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-700 p-8"
              >
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 italic uppercase tracking-tight">Access Restricted</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                  Your 14-day free trial has officially ended. To continue managing your clinic and serving patients, please choose a subscription plan.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/organization/subscription')}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 text-sm uppercase tracking-widest"
                  >
                    Select Plan & Unlock
                  </button>
                  <button
                    onClick={() => logout()}
                    className="w-full py-3 bg-transparent text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 transition-all text-xs"
                  >
                    Log out
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="no-print">
          <Header
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            notifications={notificationsHook.notifications}
            showNotifications={notificationsHook.showNotifications}
            setShowNotifications={notificationsHook.setShowNotifications}
            notificationsLoading={notificationsHook.notificationsLoading}
            handleNotificationClick={notificationsHook.handleNotificationClick}
            markAllAsRead={notificationsHook.markAllAsRead}
            setNotifications={notificationsHook.setNotifications}
            onLogout={() => setIsLogoutModalOpen(true)}
            navigate={navigate}
            user={user}
            isTrialExpired={trialStatus?.isTrialExpired}
            dashboardMode={dashboardMode}
            onModeSwitch={handleModeSwitch}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onDoctorAdd={doctorsHook.openDoctorForm}
            limits={trialStatus?.limits}
            totalDoctors={Math.max(doctorsHook.totalDoctors || 0, (doctorsHook.doctors || []).length)}
          />
        </div>
        <div className="flex flex-grow h-[calc(100vh-81px)] sm:h-[calc(100vh-89px)] overflow-hidden relative">
          <div 
            className="no-print h-full"
          >
            <AdminSidebar
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              isSidebarCollapsed={isSidebarCollapsed}
              setIsSidebarCollapsed={setIsSidebarCollapsed}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              user={user}
              onDoctorAdd={doctorsHook.openDoctorForm}
              isTrialExpired={trialStatus?.isTrialExpired}
              limits={trialStatus?.limits}
              totalDoctors={Math.max(doctorsHook.totalDoctors || 0, (doctorsHook.doctors || []).length)}
              dashboardMode={dashboardMode}
            />
          </div>

          {/* Mobile Overlay for Sidebar */}
          {isSidebarOpen && (
            <div
              onClick={toggleSidebar}
              className="fixed inset-0 backdrop-blur-sm z-40 md:hidden"
            ></div>
          )}

          <main className="flex-1 overflow-y-auto p-0 relative">
            <MainContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedPatient={patientsHook.selectedPatient}
              setSelectedPatient={patientsHook.setSelectedPatient}
              patients={patientsHook.patients}
              patientsLoading={patientsHook.patientsLoading}
              patientsError={patientsHook.patientsError}
              handleViewPatient={patientsHook.handleViewPatient}
              openPatientForm={openPatientForm}
              doctors={doctorsHook.doctors}
              doctorsLoading={doctorsHook.doctorsLoading}
              doctorsError={doctorsHook.doctorsError}
              handleViewDoctor={doctorsHook.handleViewDoctor}
              handleEditDoctor={doctorsHook.handleEditDoctor}
              handleDeleteDoctor={doctorsHook.handleDeleteDoctor}
              openDoctorForm={doctorsHook.openDoctorForm}
              onVerifyDoctor={doctorsHook.handleVerifyDoctor}
              onRejectDoctor={doctorsHook.handleRejectDoctor}
              receptionists={receptionistsHook.receptionists}
              receptionistsLoading={receptionistsHook.receptionistsLoading}
              receptionistsError={receptionistsHook.receptionistsError}
              openReceptionistForm={receptionistsHook.openReceptionistForm}
              handleDeleteReceptionist={receptionistsHook.handleDeleteReceptionist}
              stats={stats}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              selectedDoctorFilter={selectedDoctorFilter}
              setSelectedDoctorFilter={setSelectedDoctorFilter}
              openModal={openModal}
              appointmentTrendsData={appointmentTrendsData}
              revenueByDoctorData={revenueByDoctorData}
              monthlyIncomeExpenseData={monthlyIncomeExpenseData}
              recentAppointments={recentAppointments}
              rebookData={rebookData}
              setRebookData={setRebookData}
              setSelectedDoctor={doctorsHook.setSelectedDoctor}
              handleEditDoctorFromProfile={doctorsHook.handleEditDoctorFromProfile}
              handleDeleteDoctorFromProfile={doctorsHook.handleDeleteDoctorFromProfile}
              refreshDoctors={doctorsHook.fetchDoctors}
              // Pagination Props
              patientsCurrentPage={patientsHook.currentPage}
              patientsTotalPages={patientsHook.totalPages}
              patientsTotalItems={patientsHook.totalPatients}
              onPatientsPageChange={(page) => patientsHook.fetchPatients(page, 15, patientsHook.searchTerm)}
              onPatientsRefresh={patientsHook.fetchPatients}
              searchTerm={patientsHook.searchTerm}
              onPatientsSearch={(search) => {
                patientsHook.setSearchTerm(search);
                patientsHook.fetchPatients(1, 15, search);
              }}
              doctorsCurrentPage={doctorsHook.currentPage}
              doctorsTotalPages={doctorsHook.totalPages}
              doctorsTotalItems={doctorsHook.totalDoctors}
              onDoctorsPageChange={doctorsHook.fetchDoctors}
              limits={trialStatus?.limits}
              onAddMedicine={() => {
                setEditingMedicine(null);
                setShowAddMedicineModal(true);
              }}
              onEditMedicine={handleEditMedicine}
              onAddStock={handleAddStock}
              preSelectedMedicine={preSelectedMedicine}
            />
          </main>
        </div>

        {/* Modal Components */}

        {/* Add Medicine Modal */}
        <AnimatePresence>
          {showAddMedicineModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddMedicineModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-5xl max-h-[90vh] overflow-hidden"
              >
                <div className="overflow-y-auto max-h-[90vh]">
                  <AddMedicine
                    medicine={editingMedicine}
                    onSuccess={() => {
                      setShowAddMedicineModal(false);
                      setEditingMedicine(null);
                    }}
                    onCancel={() => {
                      setShowAddMedicineModal(false);
                      setEditingMedicine(null);
                    }}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Patient Form Modal */}
        <AnimatePresence>
          {activeModal === "patient" && (
            <PatientForm
              isOpen={activeModal === 'patient'}
              onClose={closeModal}
              onSuccess={(newPatient) => {
                patientsHook.handlePatientSuccess(newPatient);
                closeModal();
              }}
              patient={patientsHook.selectedPatient}
            />
          )}
        </AnimatePresence>

        {/* Doctor Form Modal */}
        <AddDoctorForm
          key={doctorsHook.editingDoctor ? 'edit' : 'add'}
          isOpen={doctorsHook.showDoctorForm}
          onClose={doctorsHook.closeDoctorForm}
          onSave={doctorsHook.handleDoctorSuccess}
          doctor={doctorsHook.editingDoctor}
          isForced={!doctorsHook.doctorsCountLoading && doctorsHook.totalDoctors === 0}
        />

        {/* Receptionist Form Modal */}
        <ReceptionistForm
          isOpen={receptionistsHook.showReceptionistForm}
          onClose={() => {
            receptionistsHook.setShowReceptionistForm(false);
            receptionistsHook.setEditingReceptionist(null);
          }}
          onSave={receptionistsHook.handleReceptionistSuccess}
          receptionist={receptionistsHook.editingReceptionist}
        />

        {/* Admin Form Modal */}
        <AdminFormModal
          showAdminForm={userManagementHook.showAdminForm}
          setShowAdminForm={userManagementHook.setShowAdminForm}
          editingAdmin={userManagementHook.editingAdmin}
          handleCreateAdmin={userManagementHook.handleCreateAdmin}
        />

        <LogoutConfirmationModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={() => {
            logout();
            navigate('/login');
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Admin;

