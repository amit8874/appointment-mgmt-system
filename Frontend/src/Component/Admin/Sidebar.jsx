import React, { useState } from 'react';
import { LayoutDashboard, Users, Stethoscope, HandHeart, BarChart, CalendarCheck, Wallet, X, ChevronDown, ChevronRight, User, Calendar, Activity, Brain } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isSidebarOpen, toggleSidebar, user }) => {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (name) => {
    setExpandedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Renders a single navigation item in the sidebar
  const NavItem = ({ name, icon: Icon, currentTab, onClick, isChild = false }) => {
    const isActive = currentTab === name;

    const handleClick = () => {
      onClick(name);
    };

    return (
      <button
        onClick={handleClick}
        className={`flex items-center relative w-full px-4 py-3 rounded-2xl transition-all duration-300 transform hover:translate-x-1 ${isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50 font-bold'
          : isChild
            ? 'text-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400 font-medium text-sm py-2'
            : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400 font-medium'
          }`}
      >
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3/4 w-1 bg-white rounded-full"></div>}
        <Icon className={`w-5 h-5 mr-3 z-10 ${isActive ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
        <span className="z-10">{name}</span>
      </button>
    );
  };

  // Parent menu with children (expandable)
  const ExpandableNavItem = ({ name, icon: Icon, children, currentTab, onClick, isExpanded, onToggle }) => {
    const hasActiveChild = children.some(child => currentTab === child.name);

    return (
      <div>
        <button
          onClick={onToggle}
          className={`group flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all duration-300 transform hover:translate-x-1 ${hasActiveChild
            ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/50 font-bold'
            : 'bg-slate-100/80 text-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400 font-bold'
          }`}
        >
          <div className="flex items-center">
            <Icon className={`w-5 h-5 mr-3 z-10 ${hasActiveChild ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
            <span className="z-10">{name}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className={`w-5 h-5 ${hasActiveChild ? 'text-white' : 'text-slate-700 dark:text-gray-300 font-black'}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${hasActiveChild ? 'text-white' : 'text-slate-700 dark:text-gray-300 font-black'}`} />
          )}
        </button>
        {/* Sub-menu items */}
        {isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {children.map((child) => (
              <NavItem
                key={child.name}
                name={child.name}
                icon={child.icon}
                currentTab={currentTab}
                onClick={onClick}
                isChild={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Doctor submenu items
  const doctorChildren = [
    { name: 'Doctor', icon: Stethoscope },
    { name: 'Add Doctor', icon: User },
    { name: 'Doctor Schedule', icon: Calendar },
  ];

  const appointmentChildren = [
    { name: 'Calendar View', icon: Calendar },
    { name: 'Track Appointment', icon: Activity },
  ];

  return (
    <aside
      className={`w-64 fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 flex-shrink-0 bg-white dark:bg-gray-800 p-4 border-r border-gray-100 dark:border-gray-700 shadow-xl
        md:shadow-lg h-full overflow-y-auto z-50 transition-transform duration-300`}
    >
      <div className="flex justify-between items-center mb-5 md:hidden">
        <h2 className="text-xl font-extrabold text-blue-700 dark:text-blue-400 tracking-wider">Navigation</h2>
        <button onClick={toggleSidebar} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase text-gray-400 mb-5 ml-4 tracking-wider">MAIN</h2>
        <NavItem name="Dashboard" icon={LayoutDashboard} currentTab={activeTab} onClick={setActiveTab} />
        <NavItem name="Patients" icon={Users} currentTab={activeTab} onClick={setActiveTab} />

        <h2 className="text-xs font-extrabold uppercase text-gray-400 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 mb-5 ml-4 tracking-wider">STAFF & RESOURCES</h2>
        
        {/* Doctor with submenu - exactly like Receptionist */}
        <ExpandableNavItem
          name="Doctor"
          icon={Stethoscope}
          children={doctorChildren}
          currentTab={activeTab}
          onClick={setActiveTab}
          isExpanded={expandedItems['Doctor']}
          onToggle={() => toggleExpand('Doctor')}
        />

        <h2 className="text-xs font-extrabold uppercase text-gray-400 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 mb-5 ml-4 tracking-wider">OPERATIONS</h2>
        <ExpandableNavItem
          name="Appointment Mgmt"
          icon={CalendarCheck}
          children={appointmentChildren}
          currentTab={activeTab}
          onClick={setActiveTab}
          isExpanded={expandedItems['Appointment Mgmt']}
          onToggle={() => toggleExpand('Appointment Mgmt')}
        />
        <NavItem name="Billing & Payments" icon={Wallet} currentTab={activeTab} onClick={setActiveTab} />
        <NavItem name="Slotify Intelligence" icon={Brain} currentTab={activeTab} onClick={setActiveTab} />
        {(user?.role === 'superadmin' || user?.role === 'orgadmin' || user?.role === 'admin') && (
          <>
            <h2 className="text-xs font-extrabold uppercase text-gray-400 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 mb-5 ml-4 tracking-wider">ADMIN</h2>
            <NavItem name="User Management" icon={Users} currentTab={activeTab} onClick={setActiveTab} />
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
