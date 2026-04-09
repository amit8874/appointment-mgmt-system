import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, UserCircle, Bell, Sun, Moon, Menu, ShieldCheck } from 'lucide-react';
import { getNotifications, markAllAsRead, markAsRead } from '../../api/notificationApi';
import { organizationApi } from '../../services/api';

const Header = ({ toggleSidebar, isSidebarOpen, onLogout, isTrialExpired }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [planInfo, setPlanInfo] = useState({
    plan: user?.organization?.plan || 'free',
    planName: user?.organization?.planName || 'Free Trial',
    status: user?.organization?.status || 'trial'
  });
  const [planLoading, setPlanLoading] = useState(false);

  // Theme toggle logic
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Fetch notifications
  const fetchNotificationsData = async () => {
    try {
      setNotificationsLoading(true);
      const data = await getNotifications(50);
      const transformedNotifications = data.map(notification => ({
        id: notification._id,
        message: notification.message,
        time: formatTimeAgo(notification.createdAt),
        type: notification.type,
        isRead: notification.isRead,
        category: notification.category,
      }));
      setNotifications(transformedNotifications);
    } catch (error) {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsData();
    fetchPlanStatus();
    const notificationInterval = setInterval(fetchNotificationsData, 30000);
    return () => clearInterval(notificationInterval);
  }, []);

  const fetchPlanStatus = async () => {
    const orgId = user?.organizationId || user?.organization?._id;
    if (!orgId) return;

    try {
      setPlanLoading(true);
      const data = await organizationApi.getTrialStatus(orgId);
      if (data) {
        setPlanInfo({
          plan: data.plan,
          planName: data.planName,
          status: data.status
        });
      }
    } catch (err) {
      console.error('Failed to fetch plan status:', err);
    } finally {
      setPlanLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      }

      let targetTab = 'Dashboard';
      if (notification.category === 'user_registration') {
        targetTab = 'Patients';
      } else if (notification.category === 'appointment_booking') {
        targetTab = 'Calendar View';
      }

      setShowNotifications(false);
      // This will be handled by parent component
      if (window.handleTabChange) {
        window.handleTabChange(targetTab);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleProfileClick = () => {
    if (isTrialExpired) return;
    navigate('/admin-profile-page');
  };

  return (
    <header className="flex items-center justify-between py-4 px-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm sticky top-0 z-20 transition-colors">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-none text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors md:hidden mr-2"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {(user?.organization?.branding?.logo || user?.organizationId?.branding?.logo) ? (
          <img
            src={user?.organization?.branding?.logo || user?.organizationId?.branding?.logo}
            alt="Organization Logo"
            className="h-8 max-w-[150px] object-contain"
          />
        ) : (user?.organization?.name || user?.organizationId?.name) ? (
          <div className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span className="text-blue-800 dark:text-blue-300 font-black text-xs uppercase tracking-widest truncate max-w-[150px]">
            {user?.organization?.name || user?.organizationId?.name || 'ADMIN'}
          </span>
        </div>
        ) : (
          <img src="/logo.png" alt="Slotify Logo" className="h-20 w-auto" />
        )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {user?.role === 'superadmin' && (
          <button
            onClick={() => navigate('/superadmin/dashboard')}
            className="flex items-center px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all shadow-sm font-bold text-sm mr-2"
            aria-label="Super Admin Panel"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Super Admin</span>
          </button>
        )}

        {/* Subscription Plan Badge */}
        {!planLoading && (
          <div className={`hidden sm:flex items-center px-3 py-1 rounded-full border shadow-sm transition-all duration-300 ${
            planInfo.plan === 'enterprise'
              ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400'
              : planInfo.plan === 'pro'
              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
              : planInfo.plan === 'basic'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
              : (planInfo.status === 'trial' || planInfo.plan === 'free')
              ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${
              planInfo.plan === 'enterprise' ? 'bg-purple-500' :
              planInfo.plan === 'pro' ? 'bg-blue-500' :
              planInfo.plan === 'basic' ? 'bg-emerald-500' :
              (planInfo.status === 'trial' || planInfo.plan === 'free') ? 'bg-amber-500' : 'bg-rose-500'
            }`}></span>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
              {planInfo.status === 'inactive' || planInfo.status === 'suspended' ? 'EXPIRED' : planInfo.planName.replace(' Plan', '').toUpperCase()}
            </span>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-gray-300 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 Transition-all shadow-sm"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-gray-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 relative Transition-all shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.some(n => !n.isRead) && (
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white dark:bg-gray-700 rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 z-50 notification-dropdown border border-gray-200">
              <div className="p-4 border-b border-gray-100 dark:border-gray-600">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Notifications ({notifications.length})</h3>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-600 max-h-72 overflow-y-auto">
                {notificationsLoading ? (
                  <li className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading notifications...</li>
                ) : notifications.length > 0 ? (
                  notifications.map((n, idx) => (
                    <li
                      key={n.id || n._id || `notif-${idx}`}
                      className={`p-4 hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{n.message}</p>
                      <p className="text-xs text-blue-400 mt-0.5">{n.time}</p>
                    </li>
                  ))
                ) : (
                  <li className="p-4 text-sm text-gray-500 dark:text-gray-400">No new notifications.</li>
                )}
              </ul>
              <div className="p-3 border-t border-gray-100 dark:border-gray-600 text-center">
                <button
                  onClick={async () => {
                    try {
                      await markAllAsRead();
                      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    } catch (error) {
                      // Error handled silently
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium transition-colors"
                >
                  Mark All as Read
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="flex items-center px-1.5 sm:px-3 py-1.5 rounded-xl border border-gray-300 bg-slate-50 text-xs sm:text-sm font-medium text-gray-700 hover:bg-slate-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 group Transition-all shadow-sm"
          onClick={handleProfileClick}
          title="My Profile"
        >
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center sm:mr-2 ring-1 ring-gray-200 dark:ring-gray-600 overflow-hidden">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </span>
            )}
          </div>
          <span className="hidden sm:inline-block max-w-[100px] truncate">{user?.name || 'Profile'}</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-gray-300 rounded-xl shadow-sm hover:bg-rose-100 transition duration-200"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
