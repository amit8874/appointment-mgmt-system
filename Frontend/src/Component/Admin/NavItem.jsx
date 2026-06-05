import React from 'react';
import { LayoutDashboard, Users, Stethoscope, HandHeart, CalendarCheck, Wallet, BarChart3 } from 'lucide-react';

const NavItem = ({ id, name, icon: Icon, currentTab, onClick, toggleSidebar, isSidebarCollapsed }) => {
  const isActive = currentTab === name;

  // Add logic to close sidebar on click in mobile view and reset selectedDoctor
  const handleClick = () => {
    onClick(name);
    // Automatically close sidebar if toggleSidebar is provided (usually on mobile)
    if (toggleSidebar && window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  return (
    <button
      id={id}
      onClick={handleClick}
      className={`flex items-center relative w-full px-3 py-2.5 rounded-none transition-all duration-200 ${isActive
        ? 'bg-indigo-50 text-indigo-700 font-bold'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 font-medium'
        } ${isSidebarCollapsed ? 'justify-center flex-col px-0 py-2' : ''}`}
    >
      {isActive && !isSidebarCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-indigo-600 rounded-none shadow-[2px_0_8px_rgba(79,70,229,0.3)]"></div>}
      <Icon className={`w-6 h-6 z-10 ${isSidebarCollapsed ? 'mb-1' : 'mr-3'} ${isActive ? 'text-indigo-600' : 'text-gray-400 dark:text-gray-500'}`} />
      {isSidebarCollapsed ? (
        <span className="z-10 text-[11px] font-semibold leading-tight text-center truncate w-full px-0.5 uppercase tracking-wide">
          {name.length > 10 ? name.substring(0, 9) + '…' : name}
        </span>
      ) : (
        <span className="z-10 text-base whitespace-nowrap">{name}</span>
      )}
    </button>
  );
};

export default NavItem;
