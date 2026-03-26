import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, FileText, CreditCard, User, FlaskConical, Pill, HeartPulse } from 'lucide-react';
import PatientSidebar from './components/PatientSidebar';
import PatientTopNav from './components/PatientTopNav';
import { useAuth } from '../../context/AuthContext';
import LogoutConfirmationModal from '../../components/common/LogoutConfirmationModal';
import OnboardingTour from '../../components/common/OnboardingTour';

// Page transition component
const PageTransition = ({ children }) => {
    const location = useLocation();
    return (
        <motion.div
            key={location.pathname}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
        >
            {children}
        </motion.div>
    );
};

const PatientLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const { user, logout } = useAuth();
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
        { name: 'Dashboard', href: '/patient-dashboard', icon: LayoutDashboard },
        { name: 'Appointments', href: '/patient-dashboard/appointments', icon: Calendar },
        { name: 'Lab Booking', href: '/patient-dashboard/lab-booking', icon: FlaskConical },
        { name: 'Medicine Order', href: '/patient-dashboard/medicine-order', icon: Pill },
        { name: 'Profile', href: '/patient-dashboard/profile', icon: User },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchNotifications = async () => {
        try {
            if (!user || !user._id) return;
            const notificationApi = await import('../../api/notificationApi');
            const data = await notificationApi.getPatientNotifications(user._id);
            const formatted = data.map(n => ({
                id: n._id,
                message: n.message,
                time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: n.isRead
            }));
            setNotifications(formatted);

            const countData = await notificationApi.getPatientUnreadCount(user._id);
            setUnreadCount(countData.count);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        if (user && user._id) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            const notificationApi = await import('../../api/notificationApi');
            await notificationApi.markAsRead(id);
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };


    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <OnboardingTour role="patient" />
            {/* Sidebar */}
            <PatientSidebar
                navigation={navigation}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                onLogout={() => setIsLogoutModalOpen(true)}
            />

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top navigation */}
                <PatientTopNav
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onNotificationClick={markAsRead}
                    onLogout={() => setIsLogoutModalOpen(true)}
                />

                {/* Main content area */}
                <main className="flex-1 overflow-y-auto bg-gray-100 focus:outline-none">
                    <div className="py-2">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
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

export default PatientLayout;

