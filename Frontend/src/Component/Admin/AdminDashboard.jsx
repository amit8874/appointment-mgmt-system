import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, X, User, Users, Stethoscope, HandHeart, Wallet, BarChart3, Lock } from 'lucide-react';
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

// Main App Component
const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, isAuthenticated } = useAuth();
  
  // Initialize tab from URL or fallback to 'Dashboard'
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'New Appointment';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Update URL when activeTab changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  }, [activeTab, navigate, location.pathname, location.search]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar visibility
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Dashboard filter state
  const [timeRange, setTimeRange] = useState('weekly');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [totalAppointments, setTotalAppointments] = useState(0);

  // Billing state
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [billingLoading, setBillingLoading] = useState(false);

  // Chart data state
  const [appointmentTrendsData, setAppointmentTrendsData] = useState([]);
  const [revenueByDoctorData, setRevenueByDoctorData] = useState([]);
  const [monthlyIncomeExpenseData, setMonthlyIncomeExpenseData] = useState([]);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [trialStatus, setTrialStatus] = useState(null);

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
          return { totalCollected: 0, pendingPayments: 0 };
        }),
        analyticsApi.getCharts().catch(error => {
          console.error("Error fetching admin charts", error);
          return null;
        }),
        analyticsApi.getDashboard().catch(error => {
          console.error("Error fetching admin dashboard data", error);
          return null;
        })
      ]);

      const [patientsData, doctorsData, receptionistsData, countsData, todayApptsCount, billingStats, chartsData, dashboardData] = responses;


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
      const orgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
      if (!orgId || orgId === '[object Object]') return;

      const data = await api.get(`/organizations/${orgId}/trial-status`);
      setTrialStatus(data.data || data); // Handle both wrapped and unwrapped responses safely
    } catch (error) {
      console.error('Error fetching trial status in dashboard:', error);
    }
  }, [user]);

  // On mount
  useEffect(() => {
    const locationState = window.history.state?.usr; // Accessing state directly as location might not be updated yet or use hook

    if (isAuthenticated && user) {
      fetchAllData();
      fetchTrialStatus();
      notificationsHook.fetchNotifications();

      // Check for rebookData in navigation state
      const locationState = window.history.state?.usr;
      if (locationState?.rebookData) {
        setActiveTab('New Appointment');
        setRebookData(locationState.rebookData);
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

    // Set up polling for notifications every 30 seconds
    const notificationInterval = setInterval(notificationsHook.fetchNotifications, 30000);

    return () => clearInterval(notificationInterval);
  }, [user, isAuthenticated]);

  const fetchTodayAppointmentsCount = async () => {
    try {
      const today = new Date();
      const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      const response = await api.get(`/appointments?date=${localDate}`);
      const appointments = response.data;
      return appointments.length;
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
  ], [patientsHook.patientsCountLoading, patientsHook.totalPatients, doctorsHook.doctorsCountLoading, doctorsHook.totalDoctors, receptionistsHook.receptionistsCountLoading, receptionistsHook.totalReceptionists, totalAppointments, totalRevenue, pendingPayments, billingLoading]);

  // Charts data is now managed in state variables above

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans antialiased transition-colors duration-500 overflow-x-hidden">
        <OnboardingTour role="admin" />
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
          />
        </div>
        <div className="flex flex-grow h-[calc(100vh-81px)] sm:h-[calc(100vh-89px)] overflow-hidden relative">
          <div className="no-print h-full">
            <AdminSidebar
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              user={user}
               onDoctorAdd={doctorsHook.openDoctorForm}
              isTrialExpired={trialStatus?.isTrialExpired}
              limits={trialStatus?.limits}
              totalDoctors={Math.max(doctorsHook.totalDoctors, doctorsHook.doctors.length)}
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
              onPatientsPageChange={patientsHook.fetchPatients}
              onPatientsRefresh={patientsHook.fetchPatients}
              doctorsCurrentPage={doctorsHook.currentPage}
              doctorsTotalPages={doctorsHook.totalPages}
              doctorsTotalItems={doctorsHook.totalDoctors}
              onDoctorsPageChange={doctorsHook.fetchDoctors}
              limits={trialStatus?.limits}
            />
          </main>
        </div>

        {/* Modal Components */}

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

