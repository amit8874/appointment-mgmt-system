import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LayoutDashboard, Users, Stethoscope, HandHeart, CalendarCheck, Wallet, BarChart3, ChevronDown, ChevronRight, User, Calendar, ShieldCheck, Grid, Activity, MessageSquare, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NavItem from './NavItem.jsx';

const AdminSidebar = ({
  isSidebarOpen,
  toggleSidebar,
  activeTab,
  setActiveTab,
  user,
  onDoctorAdd,
  onDoctorAddProps,
  limits,
  totalDoctors
}) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (name) => {
    setExpandedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Parent menu with children (expandable)
  const ExpandableNavItem = ({ id, name, icon: Icon, children }) => {
    const hasActiveChild = children.some(child => activeTab === child.name);

    return (
      <div>
        <button
          id={id}
          onClick={() => toggleExpand(name)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-none transition-all duration-200 ${hasActiveChild
            ? 'bg-indigo-100/50 text-indigo-800 font-bold'
            : 'bg-gray-100/40 text-gray-700 hover:bg-gray-200/50 hover:text-gray-900 dark:bg-gray-700/30 dark:text-gray-300 dark:hover:bg-gray-700 font-bold border-y border-gray-100/50 dark:border-gray-700/50'
          }`}
        >
          <div className="flex items-center">
            <Icon className={`w-5 h-5 mr-3 ${hasActiveChild ? 'text-indigo-600' : 'text-gray-400 dark:text-gray-500'}`} />
            <span className="text-base">{name}</span>
          </div>
          {expandedItems[name] ? (
            <ChevronDown className={`w-5 h-5 ${hasActiveChild ? 'text-indigo-800' : 'text-gray-700 dark:text-gray-400'}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${hasActiveChild ? 'text-indigo-800' : 'text-gray-700 dark:text-gray-400'}`} />
          )}
        </button>
        {/* Sub-menu items */}
        {expandedItems[name] && (
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

  return (
    <aside
      className={`w-60 fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 px-3 py-4 border-r border-gray-400 dark:border-gray-600
        h-full overflow-y-auto z-50 transition-transform duration-300`}
    >
      <div className="flex justify-between items-center mb-6 md:hidden">
        <h2 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 tracking-tight">Navigation</h2>
        <button onClick={toggleSidebar} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="space-y-1">
        <h2 className="text-xs font-semibold uppercase text-gray-400 mb-2 ml-3 tracking-wider">MAIN</h2>
        <NavItem id="tour-admin-new-appointment" name="New Appointment" icon={CalendarCheck} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} />
        <NavItem id="tour-admin-analysis" name="Analysis" icon={BarChart3} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} />
        <NavItem id="tour-admin-patients" name="Patients" icon={Users} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} />
        {limits?.messaging !== false && (
          <NavItem id="tour-admin-messages" name="Messages" icon={MessageSquare} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} />
        )}

        <h2 className="text-xs font-semibold uppercase text-gray-400 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 mb-2 ml-3 tracking-wider">STAFF & RESOURCES</h2>
        
        {/* Doctor with submenu - exactly like Receptionist */}
        <ExpandableNavItem
          id="tour-admin-doctors"
          name="Doctor"
          icon={Stethoscope}
          children={doctorChildren}
        />

        <h2 className="text-xs font-semibold uppercase text-gray-400 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 mb-2 ml-3 tracking-wider">OPERATIONS</h2>
        <ExpandableNavItem
          id="tour-admin-appointments"
          name="Appointment Mgmt"
          icon={CalendarCheck}
          children={appointmentChildren}
        />
        <NavItem id="tour-admin-billing" name="Billing & Payments" icon={Wallet} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} />
        <NavItem id="tour-admin-reports" name="Reports & Analytics" icon={BarChart3} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} />
        {(user?.role === 'superadmin' || user?.role === 'orgadmin' || user?.role === 'admin') && (
          <>
            <h2 className="text-xs font-semibold uppercase text-gray-400 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 mb-2 ml-3 tracking-wider">ADMIN</h2>
            <NavItem id="tour-admin-users" name="User Management" icon={Users} currentTab={activeTab} onClick={setActiveTab} toggleSidebar={toggleSidebar} />
            {user?.role === 'orgadmin' && (
              <button
                onClick={() => {
                  navigate('/organization/subscription');
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className="flex items-center w-full px-3 py-2.5 mt-1 rounded-none text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-bold transition-all duration-200"
              >
                <Crown className="w-5 h-5 mr-3 text-violet-600" />
                <span className="text-base text-black">Billing & Subscription</span>
              </button>
            )}
            {user?.role === 'superadmin' && (
              <button
                onClick={() => {
                  navigate('/superadmin/dashboard');
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className="flex items-center w-full px-3 py-2.5 mt-1 rounded-none text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-bold transition-all duration-200"
              >
                <ShieldCheck className="w-5 h-5 mr-3 text-indigo-600" />
                <span className="text-base text-black">Super Admin Panel</span>
              </button>
            )}
          </>
        )}

        {/* Profile Section for Mobile Visibility */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <button
            onClick={() => {
              navigate('/admin-profile-page');
              if (window.innerWidth < 1024) toggleSidebar();
            }}
            className="flex items-center w-full px-3 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 transition-all hover:bg-indigo-100 group"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-600/20 overflow-hidden mr-3">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'A'
              )}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter">
                {user?.name || 'My Profile'}
              </p>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                View Account
              </p>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto text-indigo-300 group-hover:text-indigo-600 transition-colors" />
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
