import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, Users, FileText, BarChart3, Bell, User, LogOut, Stethoscope } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Notification from './components/Notification';
import { useAuth } from '../../context/AuthContext';
import LogoutConfirmationModal from '../../components/common/LogoutConfirmationModal';
import OnboardingTour from '../../components/common/OnboardingTour';

const ReceptionistLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { logout } = useAuth();
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

  const navigation = [
    { name: 'Dashboard', href: '/receptionist', icon: LayoutDashboard },
    { name: 'Appointments', href: '/receptionist/appointments', icon: Calendar },
    { name: 'Patients', href: '/receptionist/patients', icon: Users },
    { name: 'Billing', href: '/receptionist/billing', icon: FileText },
    {
      name: 'Doctor',
      icon: Stethoscope,
      children: [
        { name: 'Doctor', href: '/receptionist/doctor', icon: Stethoscope },
        { name: 'Add Doctor', href: '/receptionist/add-doctor', icon: User },
        { name: 'Doctor Schedule', href: '/receptionist/doctor-schedule', icon: Calendar },
      ]
    },
  ];

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
      <Sidebar
        navigation={navigation}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={() => setIsLogoutModalOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
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
        <main className="flex-1 overflow-y-auto bg-gray-200 focus:outline-none">
          <div className="bg-gray-200 h-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 ">
              <AnimatePresence mode="wait">
                <PageTransition>
                  <Outlet />
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

  return (
    <motion.div
      key={location.pathname}
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
