import React from 'react';
import { LayoutDashboard, Users, Stethoscope, HandHeart, CalendarCheck, Wallet, BarChart3 } from 'lucide-react';

const NavItem = ({ id, name, icon: Icon, currentTab, onClick }) => {
  const isActive = currentTab === name;

  // Add logic to close sidebar on click in mobile view and reset selectedDoctor
  const handleClick = () => {
    onClick(name);
    // Sidebar closes automatically via overlay click, so no need to call toggleSidebar
  };

  return (
    <button
      id={id}
      onClick={handleClick}
      className={`flex items-center relative w-full px-3 py-2.5 rounded-none transition-all duration-200 ${isActive
        ? 'bg-indigo-50 text-indigo-700 font-bold'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 font-medium'
        }`}
    >
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-indigo-600 rounded-none shadow-[2px_0_8px_rgba(79,70,229,0.3)]"></div>}
      <Icon className={`w-5 h-5 mr-3 z-10 ${isActive ? 'text-indigo-600' : 'text-gray-400 dark:text-gray-500'}`} />
      <span className="z-10 text-base">{name}</span>
    </button>
  );
};

export default NavItem;
