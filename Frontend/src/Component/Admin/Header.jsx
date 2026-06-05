import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, UserCircle, Bell, Sun, Moon, Menu, ShieldCheck, MoreVertical, ChevronDown, User, CreditCard, Pill, CalendarCheck, Users, Stethoscope, Calendar, Activity } from 'lucide-react';
import { getNotifications, markAllAsRead, markAsRead } from '../../api/notificationApi';
import { organizationApi } from '../../services/api';

const Header = ({ 
  toggleSidebar, 
  isSidebarOpen, 
  onLogout, 
  isTrialExpired, 
  dashboardMode, 
  onModeSwitch,
  activeTab,
  setActiveTab,
  onDoctorAdd,
  limits,
  totalDoctors
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showApptDropdown, setShowApptDropdown] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [planInfo, setPlanInfo] = useState({
    plan: user?.organization?.plan || 'free',
    planName: user?.organization?.planName || 'Free Trial',
    status: user?.organization?.status || 'trial'
  });
  const [planLoading, setPlanLoading] = useState(false);
  const notificationRef = useRef(null);
  const profileMenuRef = useRef(null);
  const doctorDropdownRef = useRef(null);
  const apptDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(event.target)) {
        setShowDoctorDropdown(false);
      }
      if (apptDropdownRef.current && !apptDropdownRef.current.contains(event.target)) {
        setShowApptDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const rawOrgId = user?.organizationId || user?.organization?._id || user?.organization;
    const orgId = typeof rawOrgId === 'object' ? (rawOrgId?._id || rawOrgId?.id) : rawOrgId;

    if (!orgId || typeof orgId !== 'string' || orgId.includes('[object')) return;

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
    setShowProfileMenu(false);
  };

  // Plan badge color helpers
  const planBadgeClasses = planInfo.plan === 'enterprise'
    ? 'bg-purple-50 border-purple-200 text-purple-700'
    : planInfo.plan === 'pro'
    ? 'bg-blue-50 border-blue-200 text-blue-700'
    : planInfo.plan === 'basic'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : (planInfo.status === 'trial' || planInfo.plan === 'free')
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-rose-50 border-rose-200 text-rose-700';

  const planDotClass = planInfo.plan === 'enterprise' ? 'bg-purple-500'
    : planInfo.plan === 'pro' ? 'bg-blue-500'
    : planInfo.plan === 'basic' ? 'bg-emerald-500'
    : (planInfo.status === 'trial' || planInfo.plan === 'free') ? 'bg-amber-500'
    : 'bg-rose-500';

  const planLabel = planInfo.status === 'inactive' || planInfo.status === 'suspended'
    ? 'EXPIRED'
    : planInfo.planName.replace(' Plan', '').toUpperCase();

  return (
    <header className="flex items-center justify-between py-3 px-5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm sticky top-0 z-20 transition-colors">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-none text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors md:hidden"
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
          <img src="/logo.png" alt="Oviaan Logo" className="h-20 w-auto" />
        )}

        {/* Middle: Header Navigation Tabs */}
        {dashboardMode === 'admin' && (
          <div className="hidden md:flex items-center gap-1.5 mx-4 border-l border-gray-200 dark:border-gray-700 pl-4">
            {/* New Appointment */}
            <button
              onClick={() => setActiveTab('New Appointment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'New Appointment'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-extrabold'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>New Appointment</span>
            </button>
  
            {/* Patients */}
            <button
              onClick={() => setActiveTab('Patients')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'Patients'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-extrabold'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Patients</span>
            </button>
  
            {/* Doctor Dropdown */}
            <div className="relative" ref={doctorDropdownRef}>
              <button
                onClick={() => {
                  setShowDoctorDropdown(!showDoctorDropdown);
                  setShowApptDropdown(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                  ['Doctor', 'Doctor Schedule'].includes(activeTab)
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-extrabold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showDoctorDropdown ? 'rotate-180' : ''}`} />
              </button>
  
              {showDoctorDropdown && (
                <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 border border-gray-100 dark:border-gray-700 z-50 py-1">
                  <button
                    onClick={() => {
                      setActiveTab('Doctor');
                      setShowDoctorDropdown(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                      activeTab === 'Doctor' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                    List Doctors
                  </button>
                  <button
                    onClick={() => {
                      if (limits?.doctors !== -1 && totalDoctors >= limits?.doctors) return;
                      onDoctorAdd();
                      setShowDoctorDropdown(false);
                    }}
                    disabled={limits?.doctors !== -1 && totalDoctors >= limits?.doctors}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                      limits?.doctors !== -1 && totalDoctors >= limits?.doctors
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    title={limits?.doctors !== -1 && totalDoctors >= limits?.doctors ? "UPGRADE TO ADD MORE DOCTORS" : ""}
                  >
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    Add Doctor
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('Doctor Schedule');
                      setShowDoctorDropdown(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                      activeTab === 'Doctor Schedule' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Schedule
                  </button>
                </div>
              )}
            </div>
  
            {/* Appointment Mgmt Dropdown */}
            <div className="relative" ref={apptDropdownRef}>
              <button
                onClick={() => {
                  setShowApptDropdown(!showApptDropdown);
                  setShowDoctorDropdown(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                  ['Calendar View', 'Today Appointment'].includes(activeTab)
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-extrabold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Appointments</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showApptDropdown ? 'rotate-180' : ''}`} />
              </button>
  
              {showApptDropdown && (
                <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 border border-gray-100 dark:border-gray-700 z-50 py-1">
                  <button
                    onClick={() => {
                      setActiveTab('Calendar View');
                      setShowApptDropdown(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                      activeTab === 'Calendar View' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Calendar View
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('Today Appointment');
                      setShowApptDropdown(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                      activeTab === 'Today Appointment' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-gray-400" />
                    Today's Appts
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Compact action icons + Profile avatar */}
      <div className="flex items-center gap-2">

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-gray-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 transition-all shadow-sm"
          aria-label="Toggle Theme"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-gray-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 relative transition-all shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.some(n => !n.isRead) && (
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-700 rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 z-50 border border-gray-200">
              <div className="p-4 border-b border-gray-100 dark:border-gray-600">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Notifications ({notifications.length})</h3>
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

        {/* Profile Avatar — dropdown trigger */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-gray-200 bg-slate-50 hover:bg-slate-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all shadow-sm group"
            title="Profile & Settings"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden ring-2 ring-indigo-100 dark:ring-indigo-800">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</span>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ring-1 ring-black/5 border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
              
              {/* User info header */}
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-900/20 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden ring-2 ring-white shadow-sm">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</span>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{user?.name || 'User'}</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{user?.role || 'Admin'}</p>
                  </div>
                </div>

                {/* Plan badge */}
                {!planLoading && (
                  <div className={`flex items-center mt-2.5 px-2.5 py-1 rounded-full border w-fit ${planBadgeClasses}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${planDotClass}`}></span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{planLabel}</span>
                  </div>
                )}
              </div>

              {/* Mode Switcher */}
              <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Dashboard Mode</p>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => { onModeSwitch('admin'); setShowProfileMenu(false); }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      dashboardMode === 'admin'
                        ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-md ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <ShieldCheck className={`w-3 h-3 ${dashboardMode === 'admin' ? 'animate-pulse' : ''}`} />
                    Admin
                  </button>
                  <button
                    onClick={() => { onModeSwitch('pharmacy'); setShowProfileMenu(false); }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      dashboardMode === 'pharmacy'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <span>💊</span>
                    Pharmacy
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1.5">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 transition-colors"
                >
                  <User className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold">My Profile</span>
                </button>

                {user?.role === 'superadmin' && (
                  <button
                    onClick={() => { navigate('/superadmin/dashboard'); setShowProfileMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="font-semibold">Super Admin Panel</span>
                  </button>
                )}

                {user?.role === 'orgadmin' && (
                  <button
                    onClick={() => { navigate('/organization/subscription'); setShowProfileMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="font-semibold">Billing & Subscription</span>
                  </button>
                )}
              </div>

              {/* Logout */}
              <div className="border-t border-gray-100 dark:border-gray-700 py-1.5">
                <button
                  onClick={() => { onLogout(); setShowProfileMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-semibold">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
