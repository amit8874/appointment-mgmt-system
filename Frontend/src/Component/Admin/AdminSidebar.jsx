import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LayoutDashboard, Users, Stethoscope, HandHeart, CalendarCheck, Wallet, BarChart3, ChevronDown, ChevronRight, ChevronLeft, User, Calendar, ShieldCheck, Grid, Activity, PlusSquare, Upload, Package, ShoppingCart, AlertTriangle, Truck, FileText, Bell, FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NavItem from './NavItem.jsx';
import { useAuth } from '../../context/AuthContext';
import ClinicSwitcher from '../../components/common/ClinicSwitcher';

const AdminSidebar = ({
  isSidebarOpen,
  toggleSidebar,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  activeTab,
  setActiveTab,
  user,
  onDoctorAdd,
  onDoctorAddProps,
  limits,
  totalDoctors,
  dashboardMode
}) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const { isDentistClinic } = useAuth();

  const toggleExpand = (name) => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
    setExpandedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Parent menu with children (expandable)
  const ExpandableNavItem = ({ id, name, icon: Icon, children }) => {
    const hasActiveChild = children.some(child => activeTab === child.name);

    return (
      <div className="relative group/expandable">
        <button
          id={id}
          onClick={() => toggleExpand(name)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-none transition-all duration-200 ${hasActiveChild
            ? 'bg-indigo-100/50 text-indigo-800 font-bold'
            : 'bg-gray-100/40 text-gray-700 hover:bg-gray-200/50 hover:text-gray-900 dark:bg-gray-700/30 dark:text-gray-300 dark:hover:bg-gray-700 font-bold border-y border-gray-100/50 dark:border-gray-700/50'
            } ${isSidebarCollapsed ? 'md:justify-center md:flex-col md:px-0 md:py-2' : ''}`}
        >
          <div className={`flex items-center ${isSidebarCollapsed ? 'md:justify-center md:w-full' : ''}`}>
            <Icon className={`w-6 h-6 ${isSidebarCollapsed ? 'md:mb-1 mr-3 md:mr-0' : 'mr-3'} ${hasActiveChild ? 'text-indigo-600' : 'text-gray-400 dark:text-gray-500'}`} />
            {isSidebarCollapsed ? (
              <>
                <span className="hidden md:inline-block text-[11px] font-semibold leading-tight text-center truncate w-full px-0.5 uppercase tracking-wide">
                  {name.length > 10 ? name.substring(0, 9) + '…' : name}
                </span>
                <span className="md:hidden text-base">{name}</span>
              </>
            ) : (
              <span className="text-base">{name}</span>
            )}
          </div>
          {(!isSidebarCollapsed || window.innerWidth < 768) && (
            expandedItems[name] ? (
              <ChevronDown className={`w-5 h-5 ${hasActiveChild ? 'text-indigo-800' : 'text-gray-700 dark:text-gray-400'}`} />
            ) : (
              <ChevronRight className={`w-5 h-5 ${hasActiveChild ? 'text-indigo-800' : 'text-gray-700 dark:text-gray-400'}`} />
            )
          )}
        </button>
        {/* Sub-menu items */}
        {expandedItems[name] && (!isSidebarCollapsed || window.innerWidth < 768) && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 dark:border-gray-700">
            {children.map((child) => (
              <button
                key={child.name}
                onClick={() => {
                  if (child.name === 'Add Doctor' && limits && limits.doctors !== -1 && (totalDoctors >= limits.doctors)) {
                    return; // Prevent action if limit reached
                  }
                  if (child.action) {
                    child.action();
                  } else {
                    setActiveTab(child.name);
                  }
                  // Close sidebar on mobile
                  if (window.innerWidth < 1024) {
                    toggleSidebar();
                  }
                }}
                disabled={child.name === 'Add Doctor' && limits && limits.doctors !== -1 && (totalDoctors >= limits.doctors)}
                className={`flex items-center w-full pl-6 pr-3 py-1.5 rounded-none transition-all duration-200 ${activeTab === child.name
                  ? 'bg-indigo-50/30 text-indigo-600 font-bold text-sm'
                  : child.name === 'Add Doctor' && limits && limits.doctors !== -1 && (totalDoctors >= limits.doctors)
                    ? 'text-gray-400 cursor-not-allowed opacity-50 font-medium text-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 font-medium text-sm'
                  }`}
                title={child.name === 'Add Doctor' && limits && limits.doctors !== -1 && (totalDoctors >= limits.doctors) ? "UPGRADE TO ADD MORE DOCTORS" : ""}
              >
                <child.icon className={`w-4 h-4 mr-2.5 ${activeTab === child.name ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span>{child.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Doctor submenu items - exactly like Receptionist
  const doctorChildren = [
    { name: 'Doctor', icon: Stethoscope },
    { name: 'Add Doctor', icon: User, action: onDoctorAdd },
    { name: 'Doctor Schedule', icon: Calendar },
  ];

  const appointmentChildren = [
    { name: 'Calendar View', icon: Calendar },
    { name: 'Today Appointment', icon: Activity },
  ];

  const expensesChildren = [
    { name: 'Expense Dashboard', icon: LayoutDashboard },
    { name: 'Expense Reports', icon: BarChart3 },
    { name: 'Expense Analytics', icon: Activity },
    { name: 'Dental Equipment', icon: Wallet },
    { name: 'Dental Consumable Products', icon: Package },
    { name: 'Dental Lab Expenses', icon: FileText },
    { name: 'More Expenses', icon: Wallet },
  ];

  return (
    <aside
      className={`w-80 max-w-[85vw] ${isSidebarCollapsed ? 'md:w-28' : 'md:w-64'} fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 px-3 py-4 border-r border-gray-400 dark:border-gray-600
        h-full overflow-y-auto overflow-x-hidden z-[9999] transition-all duration-300 ease-in-out pb-24 md:pb-4`}
    >
      <div className={`flex ${isSidebarCollapsed ? 'justify-between' : 'justify-between'} items-center mb-2 px-2 md:justify-end`}>
        <div className="md:hidden flex items-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clinic Branch</span>
        </div>
        <button onClick={toggleSidebar} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none md:hidden">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Clinic Branch Switcher */}
      <div className="md:hidden mb-3 px-1 pb-2 border-b border-gray-200 dark:border-gray-700">
        <ClinicSwitcher />
      </div>

      <nav className="space-y-1">
        {dashboardMode === 'admin' ? (
          <>
            <NavItem id="tour-admin-followup-reminder" name="Followup and Reminder" icon={Bell} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            {isDentistClinic && (
              <NavItem id="tour-admin-dentist-dashboard" name="Dentist Dashboard" icon={LayoutDashboard} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            )}
            {isDentistClinic && (
              <NavItem id="tour-admin-lab-work" name="Lab Work" icon={FlaskConical} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            )}
            <NavItem id="tour-admin-analysis" name="Analysis" icon={BarChart3} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="tour-admin-billing" name="Billing & Payments" icon={Wallet} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            {(user?.role === 'superadmin' || user?.role === 'orgadmin' || user?.role === 'admin') && (
              <>
                <NavItem id="tour-admin-users" name="User Management" icon={Users} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
                {user?.role === 'superadmin' && (
                  <button
                    onClick={() => {
                      navigate('/superadmin/dashboard');
                      if (window.innerWidth < 1024) toggleSidebar();
                    }}
                    className={`flex items-center w-full px-3 py-2.5 mt-1 rounded-none text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-bold transition-all duration-200 ${isSidebarCollapsed ? 'justify-center flex-col px-0 py-2' : ''}`}
                  >
                    <ShieldCheck className={`w-6 h-6 ${isSidebarCollapsed ? 'mb-1' : 'mr-3'} text-indigo-600`} />
                    {isSidebarCollapsed ? (
                      <span className="text-[11px] font-semibold leading-tight text-center w-full uppercase tracking-wide text-indigo-600">Admin</span>
                    ) : (
                      <span className="text-base text-black">Super Admin Panel</span>
                    )}
                  </button>
                )}
              </>
            )}
            
            {/* On mobile screens, show the header items in the sidebar since the header has no space */}
            <div className="md:hidden space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700/50 mt-2">
              <NavItem id="tour-admin-new-appointment" name="New Appointment" icon={CalendarCheck} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
              <NavItem id="tour-admin-patients" name="Patients" icon={Users} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
              <ExpandableNavItem
                id="tour-admin-doctors"
                name="Doctor"
                icon={Stethoscope}
                children={doctorChildren}
              />
              <ExpandableNavItem
                id="tour-admin-appointments"
                name="Appointment Mgmt"
                icon={CalendarCheck}
                children={appointmentChildren}
              />
              {isDentistClinic && (
                <ExpandableNavItem
                  id="tour-admin-expenses"
                  name="Expenses"
                  icon={Wallet}
                  children={expensesChildren}
                />
              )}
              {isDentistClinic && (
                <NavItem id="tour-admin-lab-work" name="Lab Work" icon={FlaskConical} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
              )}
            </div>
          </>
        ) : (
          <>
            {!isSidebarCollapsed && <h2 className="text-xs font-semibold uppercase text-gray-400 mb-2 ml-3 tracking-wider text-purple-600 dark:text-purple-400">PHARMACY MODULE</h2>}
            <NavItem id="pharmacy-dashboard" name="Pharmacy Dashboard" icon={LayoutDashboard} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="pharmacy-inventory" name="Inventory" icon={Grid} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="pharmacy-bulk-upload" name="Bulk Upload" icon={Upload} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="pharmacy-opening-stock" name="Opening Stock" icon={Package} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="pharmacy-purchase-stock" name="Purchase Stock" icon={ShoppingCart} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="pharmacy-billing" name="Pharmacy Billing" icon={Wallet} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="pharmacy-expiry-low-stock" name="Expiry & Low Stock" icon={AlertTriangle} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="pharmacy-suppliers" name="Suppliers" icon={Truck} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem id="pharmacy-reports" name="Reports" icon={FileText} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
          </>
        )}

        {/* Profile Section */}
        <div className={`mt-8 pt-4 border-t border-gray-200 dark:border-gray-700/50 ${isSidebarCollapsed ? 'px-1' : ''}`}>
          <button
            onClick={() => {
              navigate('/admin-profile-page');
              if (window.innerWidth < 1024) toggleSidebar();
            }}
            className={`flex items-center w-full px-3 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 transition-all hover:bg-indigo-100 group ${isSidebarCollapsed ? 'justify-center flex-col px-0 py-2' : ''}`}
          >
            <div className={`w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-600/20 overflow-hidden ${isSidebarCollapsed ? 'mb-1' : 'mr-3'}`}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'A'
              )}
            </div>
            {isSidebarCollapsed ? (
              <span className="text-[11px] font-semibold leading-tight text-center w-full uppercase tracking-wide text-indigo-600 truncate px-0.5">
                {(user?.name || 'Profile').substring(0, 8)}
              </span>
            ) : (
              <>
                <div className="text-left overflow-hidden">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter">
                    {user?.name || 'My Profile'}
                  </p>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                    View Account
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-indigo-300 group-hover:text-indigo-600 transition-colors" />
              </>
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
