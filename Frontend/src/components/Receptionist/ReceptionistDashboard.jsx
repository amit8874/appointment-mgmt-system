import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, Users, FileText, BarChart3, Bell, User, LogOut, Stethoscope, Grid, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Notification from './components/Notification';
import { useAuth } from '../../context/AuthContext';
import LogoutConfirmationModal from '../../components/common/LogoutConfirmationModal';
import OnboardingTour from '../../components/common/OnboardingTour';
import api, { centralDoctorApi } from '../../services/api';

const ReceptionistLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [subscriptionLimits, setSubscriptionLimits] = useState(null);
  const [doctorCount, setDoctorCount] = useState(0);
  const [limitsLoading, setLimitsLoading] = useState(true);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Handle window resize to auto-hide sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSubscriptionLimits = async () => {
    try {
      setLimitsLoading(true);
      const rawOrgId = user?.organizationId || user?.organization?._id || user?.organization;
      const orgId = typeof rawOrgId === 'object' ? (rawOrgId?._id || rawOrgId?.id) : rawOrgId;

      if (!orgId || typeof orgId !== 'string' || orgId.includes('[object')) {
        setLimitsLoading(false);
        return;
      }

      const response = await api.get(`/organizations/${orgId}/trial-status`);
      const data = response.data || response;
      const limits = data.limits;
      setSubscriptionLimits(limits);

      // Also fetch doctor count
      const count = await centralDoctorApi.getCount();
      setDoctorCount(count || 0);
    } catch (error) {
      console.error('Error fetching subscription limits:', error);
    } finally {
      setLimitsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptionLimits();
    }
  }, [user?.id || user?._id]);

  const navigation = [
    { name: 'Follow up & Reminder', href: '/receptionist/followup', icon: Bell },
    { name: 'New Appointment', href: '/receptionist', icon: Calendar },
    {
      name: 'Appointment Mgmt',
      icon: Calendar,
      children: [
        { name: 'Calendar View', href: '/receptionist/appointments', icon: Calendar },
        { name: 'Today Appointment', href: '/receptionist/track-appointments', icon: Grid },
      ]
    },
    { name: 'Patients', href: '/receptionist/patients', icon: Users },
    { name: 'Messages', href: '/receptionist/messages', icon: MessageSquare },

    { name: 'Billing', href: '/receptionist/billing', icon: FileText },
    {
      name: 'Doctor',
      icon: Stethoscope,
      children: [
        { name: 'Doctor', href: '/receptionist/doctor', icon: Stethoscope },
        {
          name: 'Add Doctor',
          href: '/receptionist/add-doctor',
          icon: User,
          disabled: !limitsLoading && subscriptionLimits && subscriptionLimits.doctors !== -1 && doctorCount >= subscriptionLimits.doctors
        },
        { name: 'Doctor Schedule', href: '/receptionist/doctor-schedule', icon: Calendar },
      ]
    },
  ].filter(item => {
    if (item.name === 'Messages' && subscriptionLimits?.messaging === false) {
      return false;
    }
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchNotifications = async () => {
    try {
      const { notificationApi } = await import('../../services/api');
      const data = await notificationApi.getAll();
      const formatted = data.map(n => ({
        id: n._id,
        message: n.message,
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: n.isRead
      }));
      setNotifications(formatted);
      setUnreadCount(formatted.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      const { notificationApi } = await import('../../services/api');
      await notificationApi.markAsRead(id);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <OnboardingTour role="receptionist" />
      {/* Sidebar */}
      <div 
        onMouseEnter={() => setIsSidebarCollapsed(false)}
        onMouseLeave={() => setIsSidebarCollapsed(true)}
      >
        <Sidebar
          navigation={navigation}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          onLogout={() => setIsLogoutModalOpen(true)}
        />
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300`}>
        {/* Top navigation */}
        <TopNav
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          onNotificationClick={markAsRead}
          onLogout={() => setIsLogoutModalOpen(true)}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gray-200 focus:outline-none relative">

          <div className="bg-gray-200 h-full">
            <div className="w-full px-0">
              <AnimatePresence mode="wait">
                <PageTransition>
                  <Outlet context={{ limits: subscriptionLimits, doctorCount, limitsLoading }} />
                </PageTransition>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

// Page transition component
const PageTransition = ({ children }) => {
  const location = useLocation();
  const transitionKey = location.pathname.split('/').slice(0, 3).join('/');

  return (
    <motion.div
      key={transitionKey}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        duration: 1.0
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export default ReceptionistLayout;
