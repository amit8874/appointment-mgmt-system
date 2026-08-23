import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, ChevronDown, ChevronRight, ChevronLeft, Bell } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const Sidebar = ({ navigation, sidebarOpen, setSidebarOpen, isSidebarCollapsed, setIsSidebarCollapsed, onLogout }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (name) => {
    setExpandedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <>
      {/* Sidebar backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden ${sidebarOpen ? 'block' : 'hidden'
          }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <motion.div
        initial={{ x: -256 }}
        animate={{ x: sidebarOpen ? 0 : (isSidebarCollapsed ? -80 : -256) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed inset-y-0 left-0 z-30 ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 shadow-xl transform lg:translate-x-0 lg:static lg:inset-0 transition-all duration-300 border-r border-gray-100 dark:border-gray-700`}
      >
        <div className="flex flex-col h-full p-4 relative">
          {/* Logo */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center'} mb-2 px-4 bg-transparent text-center transition-all duration-300`}>
            {(user?.organization?.branding?.logo || user?.organizationId?.branding?.logo) ? (
              <img
                src={user?.organization?.branding?.logo || user?.organizationId?.branding?.logo}
                alt="Clinic Logo"
                className={`${isSidebarCollapsed ? 'h-8' : 'h-16'} w-auto object-contain transition-all duration-300`}
              />
            ) : (
              !isSidebarCollapsed && (
                <h1 className="text-blue-600 text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap">
                  {user?.organization?.name || user?.organizationId?.name || "Oviaan"}
                </h1>
              )
            )}
            {isSidebarCollapsed && !(user?.organization?.branding?.logo || user?.organizationId?.branding?.logo) && (
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">
                {(user?.organization?.name || user?.organizationId?.name || "O").charAt(0)}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className={`flex-1 space-y-2 overflow-y-auto ${isSidebarCollapsed ? 'px-0' : ''}`}>
            {(() => {
              const getSidebarItemStyles = (name, isActive) => {
                const sidebarColors = {
                  'Follow up & Reminder': {
                    active: 'bg-slate-200 dark:bg-slate-800 border-slate-500 text-slate-950 dark:text-slate-100',
                    inactive: 'border-slate-350 bg-slate-100/60 text-slate-950 dark:text-slate-200 hover:bg-slate-200 hover:border-slate-500',
                    iconActive: 'text-slate-800 dark:text-slate-200',
                    iconInactive: 'text-slate-700 dark:text-slate-350'
                  },
                  'New Appointment': {
                    active: 'bg-indigo-100 dark:bg-indigo-950/40 border-indigo-400 text-indigo-955 dark:text-indigo-250',
                    inactive: 'border-indigo-300 bg-indigo-50/40 text-indigo-955 dark:text-indigo-200 hover:bg-indigo-100/50 hover:border-indigo-400',
                    iconActive: 'text-indigo-700',
                    iconInactive: 'text-indigo-500'
                  },
                  'Appointment Mgmt': {
                    active: 'bg-violet-100 dark:bg-violet-950/40 border-violet-400 text-violet-955 dark:text-violet-250',
                    inactive: 'border-violet-300 bg-violet-50/40 text-violet-955 dark:text-violet-200 hover:bg-violet-100/50 hover:border-violet-400',
                    iconActive: 'text-violet-700',
                    iconInactive: 'text-violet-550'
                  },
                  'Patients': {
                    active: 'bg-emerald-100 dark:bg-emerald-950/20 border-emerald-400 text-emerald-955 dark:text-emerald-250',
                    inactive: 'border-emerald-300 bg-emerald-50/40 text-emerald-955 dark:text-emerald-200 hover:bg-emerald-100/50 hover:border-emerald-400',
                    iconActive: 'text-emerald-700',
                    iconInactive: 'text-emerald-500'
                  },
                  'Billing': {
                    active: 'bg-rose-100 dark:bg-rose-950/20 border-rose-400 text-rose-955 dark:text-rose-250',
                    inactive: 'border-rose-300 bg-rose-50/40 text-rose-955 dark:text-rose-200 hover:bg-rose-100/50 hover:border-rose-400',
                    iconActive: 'text-rose-700',
                    iconInactive: 'text-rose-550'
                  },
                  'Doctor': {
                    active: 'bg-amber-100 dark:bg-amber-950/20 border-amber-400 text-amber-955 dark:text-amber-250',
                    inactive: 'border-amber-300 bg-amber-50/40 text-amber-955 dark:text-amber-200 hover:bg-amber-100/50 hover:border-amber-400',
                    iconActive: 'text-amber-700',
                    iconInactive: 'text-amber-550'
                  }
                };

                return sidebarColors[name] || {
                  active: 'bg-blue-100 border-blue-400 text-blue-955',
                  inactive: 'border-slate-200 bg-slate-50/20 text-slate-900 hover:bg-slate-100',
                  iconActive: 'text-blue-700',
                  iconInactive: 'text-blue-500'
                };
              };

              return (
                <>
                  {!isSidebarCollapsed && <h2 className="text-[10px] font-black uppercase text-gray-400 mb-4 ml-4 tracking-[0.2em] mt-2">MAIN</h2>}
                  {navigation.map((item) => {
                    const isParentActive = item.children ? item.children.some(child => window.location.pathname === child.href) : false;
                    const colors = getSidebarItemStyles(item.name, isParentActive);

                    return (
                      <div key={item.name}>
                        {item.children ? (
                          // Parent menu with children (expandable)
                          <div>
                            <button
                              id={item.id}
                              onClick={() => toggleExpand(item.name)}
                              className={`group flex items-center justify-between w-full rounded-xl border m-1.5 transition-all duration-300 shadow-sm ${
                                isSidebarCollapsed 
                                  ? 'justify-center flex-col px-1.5 py-3 gap-1.5 text-center' 
                                  : 'px-4 py-2.5 gap-3'
                              } ${
                                isParentActive ? colors.active : colors.inactive
                              }`}
                            >
                              <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-1.5' : 'gap-3'}`}>
                                <item.icon
                                  className={`h-5 w-5 flex-shrink-0 z-10 ${
                                    isParentActive ? colors.iconActive : colors.iconInactive
                                  }`}
                                  aria-hidden="true"
                                />
                                {isSidebarCollapsed ? (
                                  <span className="text-[9px] font-black uppercase tracking-wider leading-tight truncate w-full px-0.5 z-10">
                                    {item.name.length > 10 ? item.name.substring(0, 9) + '…' : item.name}
                                  </span>
                                ) : (
                                  <span className="text-xs font-black uppercase tracking-wider text-left z-10">{item.name}</span>
                                )}
                              </div>
                              {!isSidebarCollapsed && (
                                expandedItems[item.name] ? (
                                  <ChevronDown className={`h-4.5 w-4.5 ${isParentActive ? 'text-slate-950 dark:text-white' : 'text-slate-700 dark:text-gray-300 font-black'}`} />
                                ) : (
                                  <ChevronRight className={`h-4.5 w-4.5 ${isParentActive ? 'text-slate-950 dark:text-white' : 'text-slate-700 dark:text-gray-300 font-black'}`} />
                                )
                              )}
                            </button>
                            {/* Sub-menu items */}
                            {expandedItems[item.name] && !isSidebarCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="ml-6 mt-1.5 space-y-1"
                              >
                                {item.children.map((child) => (
                                  <NavLink
                                    key={child.name}
                                    to={child.disabled ? '#' : child.href}
                                    onClick={(e) => {
                                      if (child.disabled) {
                                        e.preventDefault();
                                        return;
                                      }
                                      if (window.innerWidth <= 1024) setSidebarOpen(false);
                                    }}
                                    className={({ isActive }) =>
                                      `group flex items-center px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${
                                        child.disabled
                                        ? 'text-gray-300 cursor-not-allowed opacity-50 border-transparent'
                                        : isActive
                                        ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-sm font-black'
                                        : 'text-slate-900 dark:text-slate-350 hover:bg-blue-50/50 hover:text-blue-700 border-transparent'
                                      }`
                                    }
                                    title={child.disabled ? "UPGRADE TO ADD MORE DOCTORS" : ""}
                                  >
                                    {({ isActive }) => (
                                      <>
                                        <child.icon
                                          className={`mr-3 h-4 w-4 flex-shrink-0 ${isActive && !child.disabled
                                            ? 'text-blue-700'
                                            : 'text-blue-400 group-hover:text-blue-500'
                                            }`}
                                          aria-hidden="true"
                                        />
                                        {child.name}
                                      </>
                                    )}
                                  </NavLink>
                                ))}
                              </motion.div>
                            )}
                          </div>
                        ) : (
                          // Regular menu item without children
                          <NavLink
                            id={item.id}
                            to={item.disabled ? '#' : item.href}
                            onClick={(e) => {
                              if (item.disabled) {
                                e.preventDefault();
                                  return;
                              }
                              if (window.innerWidth <= 1024) setSidebarOpen(false);
                            }}
                            className={({ isActive }) => {
                              const itemColors = getSidebarItemStyles(item.name, isActive);
                              return `group flex items-center rounded-xl border m-1.5 transition-all duration-300 shadow-sm ${
                                isSidebarCollapsed 
                                  ? 'justify-center flex-col px-1.5 py-3 gap-1.5 text-center' 
                                  : 'px-4 py-2.5 gap-3'
                              } ${
                                item.disabled
                                ? 'text-gray-400 cursor-not-allowed opacity-50'
                                : isActive
                                ? itemColors.active
                                : itemColors.inactive
                              }`;
                            }}
                            title={item.disabled ? "UPGRADE TO ADD MORE DOCTORS" : ""}
                          >
                            {({ isActive }) => {
                              const itemColors = getSidebarItemStyles(item.name, isActive);
                              return (
                                <>
                                  <item.icon
                                    className={`h-5 w-5 flex-shrink-0 z-10 ${
                                      isActive && !item.disabled ? itemColors.iconActive : itemColors.iconInactive
                                    }`}
                                    aria-hidden="true"
                                  />
                                  {isSidebarCollapsed ? (
                                    <span className="text-[9px] font-black uppercase tracking-wider leading-tight truncate w-full px-0.5 z-10">
                                      {item.name.length > 10 ? item.name.substring(0, 9) + '…' : item.name}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-black uppercase tracking-wider text-left z-10">{item.name}</span>
                                  )}
                                </>
                              );
                            }}
                          </NavLink>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </nav>

          {/* User Profile Section (Matching Admin Style) */}
          <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
            <div 
              onClick={() => navigate('/receptionist/profile')}
              className={`bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-all ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className="flex items-center min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    className="h-10 w-10 rounded-xl object-cover border-2 border-white shadow-sm"
                    src={user?.profilePhoto || `https://ui-avatars.com/api/?name=${user?.name || 'Rec'}&background=2563eb&color=fff`}
                    alt={user?.name || 'Receptionist'}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                {!isSidebarCollapsed && (
                  <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">
                      {user?.name || 'Receptionist'}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 truncate tracking-wide">
                      {user?.role?.toUpperCase() || 'RECEPTIONIST'}
                    </p>
                  </div>
                )}
              </div>
              {!isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent navigation when clicking logout
                    onLogout();
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
