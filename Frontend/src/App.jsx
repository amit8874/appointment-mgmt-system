import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import api from "./services/api";
import { AnimatePresence } from "framer-motion";
import AccountDeactivatedModal from "./Component/Organization/AccountDeactivatedModal";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Lazy load components
const ProtectedRoute = lazy(() => import("./Component/ProtectedRoute"));
const LandingPage = lazy(() => import("./Pages/LandingPage"));
const Login = lazy(() => import("./Pages/Login"));
const AdminDashboard = lazy(() => import("./Component/Admin/AdminDashboard"));

const ReceptionistDashboard = lazy(() => import("./components/Receptionist/ReceptionistDashboard"));
const PatientPage = lazy(() => import("./Component/Patient/PatientPage"));
const LabTestBooking = lazy(() => import("./Component/Patient/LabTestBooking"));
const MedicineOrdering = lazy(() => import("./Component/Patient/MedicineOrdering"));
const AppoitmentWebsite = lazy(() => import("./Component/Patient/AppoitmentWebsite"));
const PatientEditProfile = lazy(() => import("./Component/Patient/PatientEditProfile"));
const PaymentDashboard = lazy(() => import("./Component/Patient/PaymentDashboard"));
const AdminProfilePage = lazy(() => import("./Component/Admin/AdminProfilePage"));
const Dashboard = lazy(() => import("./components/Receptionist/Dashboard/Dashboard"));
const Appointments = lazy(() => import("./components/Receptionist/Appointments/Appointments"));
const AppointmentTable = lazy(() => import("./Component/Admin/AppointmentMgmt/AppointmentTable.jsx"));
const NewAppointmentForm = lazy(() => import("./Component/Admin/NewAppointmentForm"));
const AdminPatientPanel = lazy(() => import("./Component/Admin/Patient/PatientPanel.jsx"));
const ReceptionistPatientPanel = lazy(() => import("./components/Receptionist/Patients/PatientPanel.jsx"));
const PatientProfile = lazy(() => import("./Component/Admin/Patient/PatientProfile.jsx"));
const BillingMgmt = lazy(() => import("./components/Receptionist/Billing/BillingMgmt"));
const DoctorGrid = lazy(() => import("./components/Receptionist/Doctors/DoctorGrid"));
const DoctorDetail = lazy(() => import("./components/Receptionist/Doctors/DoctorDetail"));
const AddDoctor = lazy(() => import("./components/Receptionist/Doctors/AddDoctor"));
const DoctorSchedule = lazy(() => import("./components/Receptionist/Doctors/DoctorSchedule"));
const PatientLayout = lazy(() => import("./Component/Patient/PatientLayout"));
const DashboardContent = lazy(() => import("./Component/Patient/DashboardContent"));
const FindDoctors = lazy(() => import("./Pages/FindDoctors"));
const BookingCheckout = lazy(() => import("./Pages/BookingCheckout"));


// SaaS Components
const RegisterOrganization = lazy(() => import("./Pages/RegisterOrganization"));
const ChoosePlan = lazy(() => import("./Pages/ChoosePlan"));
const Payment = lazy(() => import("./Pages/Payment"));
const SuperAdminLogin = lazy(() => import("./Pages/SuperAdminLogin"));
const SuperAdminDashboard = lazy(() => import("./Component/SuperAdmin/SuperAdminDashboard"));
const SuperAdminLayout = lazy(() => import("./Component/SuperAdmin/SuperAdminLayout"));
const Organizations = lazy(() => import("./Component/SuperAdmin/Organizations"));
const ManageOrganisation = lazy(() => import("./Component/SuperAdmin/ManageOrganisation"));
const AllSubscriptions = lazy(() => import("./Component/SuperAdmin/AllSubscriptions"));
const RevenueAnalytics = lazy(() => import("./Component/SuperAdmin/RevenueAnalytics"));
const AuditLogsPage = lazy(() => import("./Component/SuperAdmin/AuditLogsPage"));
const SuperAdminSettings = lazy(() => import("./Component/SuperAdmin/SuperAdminSettings"));
const PharmacyManagement = lazy(() => import("./Component/SuperAdmin/PharmacyManagement"));
const SubscriptionManagement = lazy(() => import("./Component/Organization/SubscriptionManagement"));
const OrganizationDashboard = lazy(() => import("./Component/Organization/OrganizationDashboard"));
const PharmacyLayout = lazy(() => import("./Component/Pharmacy/PharmacyLayout"));
const PharmacyDashboard = lazy(() => import("./Component/Pharmacy/PharmacyDashboard"));
const PharmacyOrders = lazy(() => import("./Component/Pharmacy/PharmacyOrders"));
const PharmacyInventory = lazy(() => import("./Component/Pharmacy/PharmacyInventory"));
const PharmacyBroadcasts = lazy(() => import("./Component/Pharmacy/PharmacyBroadcasts"));
const PharmacySettings = lazy(() => import("./Component/Pharmacy/PharmacySettings"));
const OrderOnline = lazy(() => import("./Pages/OrderOnline"));
const PharmacyRegistration = lazy(() => import("./Pages/PharmacyRegistration"));
const PatientOrders = lazy(() => import("./Component/Patient/PatientOrders"));

// Loading Component
const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-slate-500 font-medium animate-pulse">Loading CMS Professional...</p>
  </div>
);


export default function App() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    // Check if we are in shadow mode
    const originalToken = localStorage.getItem('originalToken');
    if (originalToken) {
      setIsImpersonating(true);
    } else {
      setIsImpersonating(false);
    }
  }, [user]);

  const handleExitShadowMode = () => {
    const originalToken = localStorage.getItem('originalToken');
    const originalUserData = localStorage.getItem('originalUserData');
    const originalRole = localStorage.getItem('originalRole');

    if (originalToken && originalUserData) {
      // Restore original session
      const parsedUserData = JSON.parse(originalUserData);
      login(parsedUserData);

      // Clean up backup keys
      localStorage.removeItem('originalToken');
      localStorage.removeItem('originalUserData');
      localStorage.removeItem('originalRole');
      
      setIsImpersonating(false);
      window.location.href = '/superadmin/dashboard';
    }
  };

  const ShadowModeBanner = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-3 z-[9999] flex justify-between items-center shadow-2xl animate-bounce-subtle">
      <div className="flex items-center gap-3 ml-4">
        <div className="bg-white/20 p-2 rounded-full animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-sm uppercase tracking-wider">Shadow Mode Active</p>
          <p className="text-xs text-red-100">Viewing as <span className="font-semibold">{user?.name || 'User'}</span> ({user?.role})</p>
        </div>
      </div>
      <button
        onClick={handleExitShadowMode}
        className="mr-4 px-5 py-2 bg-white text-red-600 rounded-full font-bold text-sm hover:bg-gray-100 transition shadow-lg flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 11-2 0V4H5v12a1 1 0 11-2 0V3z" clipRule="evenodd" />
        </svg>
        Exit Shadow Mode
      </button>
    </div>
  );

  // Listen for account deactivation events
  useEffect(() => {
    const handleAccountDeactivated = () => {
      setShowDeactivatedModal(true);
    };

    window.addEventListener('account-deactivated', handleAccountDeactivated);
    return () => window.removeEventListener('account-deactivated', handleAccountDeactivated);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !logout) return;

    let isSubscribed = true;
    const checkSession = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token') || 
                     JSON.parse(sessionStorage.getItem('userData') || localStorage.getItem('userData') || '{}').token ||
                     JSON.parse(sessionStorage.getItem('patientUser') || '{}').token;

        if (!token) return;

        const response = await api.get('/users/check-session');

        if (isSubscribed && response.status === 401) {
          logout();
        }
      } catch (error) {
        if (isSubscribed && error.response?.status === 401) {
          logout();
        }
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 10000); // 10 seconds is safer

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, logout]);


  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      {isImpersonating && <ShadowModeBanner />}
      <AnimatePresence mode="wait">
        <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/find-doctors" element={<FindDoctors />} />
            <Route path="/booking/checkout/:doctorId" element={<BookingCheckout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register-pharmacy" element={<PharmacyRegistration />} />
            <Route path="/order-online-medicine" element={<OrderOnline />} />
            <Route path="/patient/orders" element={<PatientOrders />} />



            {/* Organization Registration & Onboarding */}
            <Route path="/register-organization" element={<RegisterOrganization />} />
            <Route path="/choose-plan" element={<ChoosePlan />} />
            <Route path="/payment" element={<Payment />} />

            {/* Super Admin Routes */}
            <Route path="/superadmin" element={<SuperAdminLogin />} />
            <Route path="/superadmin" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="organizations" element={<Organizations />} />
              <Route path="manage-organizations" element={<ManageOrganisation />} />
              <Route path="pharmacies" element={<PharmacyManagement />} />
              <Route path="subscriptions" element={<AllSubscriptions />} />
              <Route path="revenue" element={<RevenueAnalytics />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<SuperAdminSettings />} />
            </Route>

            {/* Organization Admin Routes */}
            <Route path="/organization-dashboard" element={
              <ProtectedRoute allowedRoles={['orgadmin', 'admin']}>
                <OrganizationDashboard />
              </ProtectedRoute>
            } />
            <Route path="/organization/subscription" element={
              <ProtectedRoute allowedRoles={['orgadmin']}>
                <SubscriptionManagement />
              </ProtectedRoute>
            } />

            {/* Existing Admin Routes */}
            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin', 'orgadmin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin-profile-page" element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin', 'orgadmin']}>
                <AdminProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/admin/doctor/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin', 'orgadmin']}>
                <DoctorDetail />
              </ProtectedRoute>
            } />
            <Route path="/admin/patient/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin', 'orgadmin']}>
                <PatientProfile />
              </ProtectedRoute>
            } />
            <Route path="/receptionist" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <ReceptionistDashboard />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="appointments" element={<AppointmentTable />} />
              <Route path="patients" element={<ReceptionistPatientPanel />} />
              <Route path="billing" element={<BillingMgmt />} />
              <Route path="doctor" element={<DoctorGrid />} />
              <Route path="doctor/:id" element={<DoctorDetail />} />
              <Route path="patient/:id" element={<PatientProfile />} />
              <Route path="new-appointment" element={<NewAppointmentForm />} />
              <Route path="add-doctor" element={<AddDoctor />} />
              <Route path="doctor-schedule" element={<DoctorSchedule />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>
            <Route path="/patient-dashboard" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardContent />} />
              <Route path="profile" element={<PatientEditProfile />} />
              <Route path="appointments" element={<AppoitmentWebsite />} />
              <Route path="lab-booking" element={<LabTestBooking />} />
              <Route path="medicine-order" element={<MedicineOrdering />} />
            </Route>

            {/* Pharmacy Routes */}
            <Route path="/pharmacy" element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<PharmacyDashboard />} />
              <Route path="broadcasts" element={<PharmacyBroadcasts />} />
              <Route path="orders" element={<PharmacyOrders />} />
              <Route path="inventory" element={<PharmacyInventory />} />
              <Route path="settings" element={<PharmacySettings />} />
            </Route>
          </Routes>
        </Suspense>

        {/* Account Deactivated Modal - shown when organization is deactivated */}
        <AccountDeactivatedModal
          isOpen={showDeactivatedModal}
          onLogout={logout}
        />
      </Router>
    </AnimatePresence>
    </>
  );
}
