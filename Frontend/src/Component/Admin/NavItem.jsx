import React from 'react';

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

  const sidebarColors = {
    'Followup and Reminder': {
      active: 'bg-slate-200 dark:bg-slate-800 border-slate-500 text-slate-950 dark:text-slate-100',
      inactive: 'border-slate-350 bg-slate-100/60 text-slate-950 dark:text-slate-200 hover:bg-slate-200 hover:border-slate-500',
      icon: 'text-slate-800 dark:text-slate-200'
    },
    'Dentist Dashboard': {
      active: 'bg-indigo-100 dark:bg-indigo-950/40 border-indigo-455 text-indigo-950 dark:text-indigo-250',
      inactive: 'border-indigo-300 bg-indigo-50/40 text-indigo-950 dark:text-indigo-200 hover:bg-indigo-100/50 hover:border-indigo-400',
      icon: 'text-indigo-700'
    },
    'Lab Work': {
      active: 'bg-teal-100 dark:bg-teal-950/40 border-teal-400 text-teal-950 dark:text-teal-250',
      inactive: 'border-teal-300 bg-teal-50/40 text-teal-950 dark:text-teal-200 hover:bg-teal-100/50 hover:border-teal-400',
      icon: 'text-teal-700'
    },
    'Analysis': {
      active: 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-250',
      inactive: 'border-amber-300 bg-amber-50/40 text-amber-950 dark:text-amber-200 hover:bg-amber-100/50 hover:border-amber-400',
      icon: 'text-amber-700'
    },
    'Billing & Payments': {
      active: 'bg-rose-100 dark:bg-rose-950/40 border-rose-400 text-rose-955 dark:text-rose-250',
      inactive: 'border-rose-300 bg-rose-50/40 text-rose-955 dark:text-rose-200 hover:bg-rose-100/50 hover:border-rose-400',
      icon: 'text-rose-750'
    },
    'User Management': {
      active: 'bg-purple-100 dark:bg-purple-950/40 border-purple-400 text-purple-955 dark:text-purple-250',
      inactive: 'border-purple-300 bg-purple-50/40 text-purple-955 dark:text-purple-200 hover:bg-purple-100/50 hover:border-purple-400',
      icon: 'text-purple-700'
    },
    'New Appointment': {
      active: 'bg-indigo-100 dark:bg-indigo-950/40 border-indigo-400 text-indigo-955 dark:text-indigo-250',
      inactive: 'border-indigo-300 bg-indigo-50/40 text-indigo-955 dark:text-indigo-200 hover:bg-indigo-100/50 hover:border-indigo-400',
      icon: 'text-indigo-700'
    },
    'Patients': {
      active: 'bg-emerald-100 dark:bg-emerald-950/20 border-emerald-400 text-emerald-955 dark:text-emerald-250',
      inactive: 'border-emerald-300 bg-emerald-50/40 text-emerald-955 dark:text-emerald-200 hover:bg-emerald-100/50 hover:border-emerald-400',
      icon: 'text-emerald-700'
    }
  };

  const colors = sidebarColors[name] || {
    active: 'bg-indigo-50 border-indigo-300 text-indigo-955',
    inactive: 'border-slate-200 bg-slate-50/20 text-slate-900 hover:bg-slate-100',
    icon: 'text-indigo-650'
  };

  return (
    <button
      id={id}
      onClick={handleClick}
      className={`flex items-center relative rounded-xl border m-1.5 transition-all duration-200 shadow-sm ${
        isActive ? colors.active : colors.inactive
      } ${
        isSidebarCollapsed 
          ? 'justify-center flex-col px-1.5 py-3 gap-1.5 text-center' 
          : 'px-4 py-2.5 gap-3'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? colors.icon : 'text-slate-800 dark:text-slate-350'}`} />
      {isSidebarCollapsed ? (
        <span className="text-[9px] font-black uppercase tracking-wider leading-tight truncate w-full px-0.5">
          {name.length > 10 ? name.substring(0, 9) + '…' : name}
        </span>
      ) : (
        <span className="text-xs font-black uppercase tracking-wider text-left whitespace-nowrap">{name}</span>
      )}
    </button>
  );
};

export default NavItem;
