import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, UserCircle, Bell, Sun, Moon, Menu, ShieldCheck, MoreVertical, ChevronDown, User, CreditCard, Pill, CalendarCheck, Users, Stethoscope, Calendar, Activity, Wallet } from 'lucide-react';
import { getNotifications, markAllAsRead, markAsRead } from '../../api/notificationApi';
import { organizationApi } from '../../services/api';
import ClinicSwitcher from '../../components/common/ClinicSwitcher';

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
  const { user, isDentistClinic } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showApptDropdown, setShowApptDropdown] = useState(false);
  const [showExpensesDropdown, setShowExpensesDropdown] = useState(false);
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
  const expensesDropdownRef = useRef(null);

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
      if (expensesDropdownRef.current && !expensesDropdownRef.current.contains(event.target)) {
        setShowExpensesDropdown(false);
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
    <header className="flex items-center justify-between py-4 px-6 min-h-[76px] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md sticky top-0 z-20 transition-all duration-300">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors md:hidden"
          aria-label="Open Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center justify-center select-none py-0.5 px-1">
          <img src="/logo.png" alt="Oviaan Logo" className="h-8 sm:h-9 w-auto object-contain" />
          <span className="text-[10px] sm:text-[11px] font-black tracking-[0.25em] text-indigo-950 dark:text-indigo-300 uppercase leading-none mt-0.5">
            OVIAAN
          </span>
        </div>

        {/* Middle: Header Navigation Tabs */}
        {dashboardMode === 'admin' && (
          <div className="hidden md:flex items-center gap-2.5 mx-4 border-l border-gray-200 dark:border-gray-700 pl-4">
            {/* New Appointment */}
            <button
              onClick={() => setActiveTab('New Appointment')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border shadow-sm ${
                activeTab === 'New Appointment'
                  ? 'bg-indigo-900 border-indigo-700 text-white ring-2 ring-indigo-400 shadow-md scale-[1.02]'
                  : 'bg-indigo-900/90 border-indigo-800 text-white hover:bg-indigo-900 hover:scale-[1.02]'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-white" />
              <span>New Appointment</span>
            </button>
  
            {/* Patients */}
            <button
              onClick={() => setActiveTab('Patients')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border shadow-sm ${
                activeTab === 'Patients'
                  ? 'bg-emerald-900 border-emerald-700 text-white ring-2 ring-emerald-400 shadow-md scale-[1.02]'
                  : 'bg-emerald-900/90 border-emerald-800 text-white hover:bg-emerald-900 hover:scale-[1.02]'
              }`}
            >
              <Users className="w-4 h-4 text-white" />
              <span>Patients</span>
            </button>
  
            {/* Doctor Dropdown */}
            <div className="relative" ref={doctorDropdownRef}>
              <button
                onClick={() => {
                  setShowDoctorDropdown(!showDoctorDropdown);
                  setShowApptDropdown(false);
                  setShowExpensesDropdown(false);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border shadow-sm ${
                  ['Doctor', 'Doctor Schedule'].includes(activeTab)
                    ? 'bg-amber-900 border-amber-700 text-white ring-2 ring-amber-400 shadow-md scale-[1.02]'
                    : 'bg-amber-900/90 border-amber-800 text-white hover:bg-amber-900 hover:scale-[1.02]'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-white" />
                <span>Doctor</span>
                <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${showDoctorDropdown ? 'rotate-180' : ''}`} />
              </button>
  
              {showDoctorDropdown && (
                <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl ring-1 ring-black/5 border border-gray-100 dark:border-gray-700 z-50 py-1.5">
                  <button
                    onClick={() => {
                      setActiveTab('Doctor');
                      setShowDoctorDropdown(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-black text-left uppercase tracking-wider ${
                      activeTab === 'Doctor' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-amber-600" />
                    List Doctors
                  </button>
                  <button
                    onClick={() => {
                      if (limits?.doctors !== -1 && totalDoctors >= limits?.doctors) return;
                      onDoctorAdd();
                      setShowDoctorDropdown(false);
                    }}
                    disabled={limits?.doctors !== -1 && totalDoctors >= limits?.doctors}
                    className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-black text-left uppercase tracking-wider ${
                      limits?.doctors !== -1 && totalDoctors >= limits?.doctors
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    title={limits?.doctors !== -1 && totalDoctors >= limits?.doctors ? "UPGRADE TO ADD MORE DOCTORS" : ""}
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    Add Doctor
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('Doctor Schedule');
                      setShowDoctorDropdown(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-black text-left uppercase tracking-wider ${
                      activeTab === 'Doctor Schedule' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-amber-600" />
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
                  setShowExpensesDropdown(false);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border shadow-sm ${
                  ['Calendar View', 'Today Appointment'].includes(activeTab)
                    ? 'bg-purple-900 border-purple-700 text-white ring-2 ring-purple-400 shadow-md scale-[1.02]'
                    : 'bg-purple-900/90 border-purple-800 text-white hover:bg-purple-900 hover:scale-[1.02]'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-white" />
                <span>Appointments</span>
                <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${showApptDropdown ? 'rotate-180' : ''}`} />
              </button>
  
              {showApptDropdown && (
                <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl ring-1 ring-black/5 border border-gray-100 dark:border-gray-700 z-50 py-1.5">
                  <button
                    onClick={() => {
                      setActiveTab('Calendar View');
                      setShowApptDropdown(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-black text-left uppercase tracking-wider ${
                      activeTab === 'Calendar View' ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Calendar View
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('Today Appointment');
                      setShowApptDropdown(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-black text-left uppercase tracking-wider ${
                      activeTab === 'Today Appointment' ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-purple-600" />
                    Today's Appts
                  </button>
                </div>
              )}
            </div>
  
            {/* Expenses Dropdown */}
            {isDentistClinic && (
              <div className="relative" ref={expensesDropdownRef}>
                <button
                  onClick={() => {
                    setShowExpensesDropdown(!showExpensesDropdown);
                    setShowDoctorDropdown(false);
                    setShowApptDropdown(false);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border shadow-sm ${
                    ['Expense Dashboard', 'Expense Reports', 'Expense Analytics', 'Dental Equipment', 'Dental Consumable Products', 'Dental Lab Expenses', 'More Expenses'].includes(activeTab)
                      ? 'bg-rose-900 border-rose-700 text-white ring-2 ring-rose-400 shadow-md scale-[1.02]'
                      : 'bg-rose-900/90 border-rose-800 text-white hover:bg-rose-900 hover:scale-[1.02]'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-white" />
                  <span>Expenses</span>
                  <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${showExpensesDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showExpensesDropdown && (
                  <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 border border-gray-100 dark:border-gray-700 z-50 py-1">
                    <button
                      onClick={() => {
                        setActiveTab('Expense Dashboard');
                        setShowExpensesDropdown(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                        activeTab === 'Expense Dashboard' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-gray-400">📊</span>
                      Expense Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('Expense Reports');
                        setShowExpensesDropdown(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                        activeTab === 'Expense Reports' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-gray-400">📂</span>
                      Expense Reports
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('Expense Analytics');
                        setShowExpensesDropdown(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                        activeTab === 'Expense Analytics' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-gray-400">📈</span>
                      Expense Analytics
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('Dental Equipment');
                        setShowExpensesDropdown(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                        activeTab === 'Dental Equipment' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-gray-400">🛠️</span>
                      Dental Equipment
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('Dental Consumable Products');
                        setShowExpensesDropdown(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                        activeTab === 'Dental Consumable Products' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-gray-400">📦</span>
                      Dental Consumable Products
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('Dental Lab Expenses');
                        setShowExpensesDropdown(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                        activeTab === 'Dental Lab Expenses' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-gray-400">🧪</span>
                      Dental Lab Expenses
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('More Expenses');
                        setShowExpensesDropdown(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-xs font-bold text-left uppercase tracking-wider ${
                        activeTab === 'More Expenses' ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-extrabold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-gray-400">💸</span>
                      More Expenses
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Compact action icons + Profile avatar */}
      <div className="flex items-center gap-2">
        
        {/* Clinic Switcher (Desktop view only, shown in sidebar on mobile) */}
        <div className="hidden md:block">
          <ClinicSwitcher />
        </div>

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
