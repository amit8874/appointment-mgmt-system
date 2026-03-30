import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const Sidebar = ({ navigation, sidebarOpen, setSidebarOpen, onLogout }) => {
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
        animate={{ x: sidebarOpen ? 0 : -256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-xl transform lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300 border-r border-gray-100 dark:border-gray-700"
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8 px-4 bg-transparent">
            {user?.organization?.branding?.logo ? (
              <img
                src={user.organization.branding.logo}
                alt="Organization Logo"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <h1 className="text-blue-600 text-2xl font-black italic tracking-tighter">SLOTIFY</h1>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-3 overflow-y-auto">
            <h2 className="text-[10px] font-black uppercase text-gray-400 mb-5 ml-4 tracking-[0.2em]">MAIN</h2>
            {navigation.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  // Parent menu with children (expandable)
                  <div>
                    <button
                      id={item.id}
                      onClick={() => toggleExpand(item.name)}
                      className={`group flex items-center justify-between w-full px-4 py-3 text-sm rounded-2xl transition-all duration-300 transform hover:translate-x-1 ${
                        item.children.some(child => window.location.pathname === child.href)
                        ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/50 font-bold'
                        : 'bg-slate-100/80 text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400 font-bold'
                      }`}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className={`mr-3 h-5 w-5 flex-shrink-0 z-10 ${
                            item.children.some(child => window.location.pathname === child.href) 
                            ? 'text-white' 
                            : 'text-blue-500 dark:text-blue-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="z-10">{item.name}</span>
                      </div>
                      {expandedItems[item.name] ? (
                        <ChevronDown className={`h-5 w-5 ${item.children.some(child => window.location.pathname === child.href) ? 'text-white' : 'text-slate-700 dark:text-gray-300 font-black'}`} />
                      ) : (
                        <ChevronRight className={`h-5 w-5 ${item.children.some(child => window.location.pathname === child.href) ? 'text-white' : 'text-slate-700 dark:text-gray-300 font-black'}`} />
                      )}
                    </button>
                    {/* Sub-menu items */}
                    {expandedItems[item.name] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-6 mt-2 space-y-1.5"
                      >
                        {item.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            className={({ isActive }) =>
                              `group flex items-center px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 transform hover:translate-x-1 ${isActive
                                ? 'bg-blue-500 text-white shadow-md font-black'
                                : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-blue-400'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <child.icon
                                  className={`mr-3 h-4 w-4 flex-shrink-0 ${isActive
                                    ? 'text-white'
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
                    to={item.href}
                    className={({ isActive }) =>
                      `group flex items-center px-4 py-3 text-sm rounded-2xl transition-all duration-300 transform hover:translate-x-1 ${isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50 font-bold'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400 font-medium'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3/4 w-1 bg-white rounded-full"></div>}
                        <item.icon
                          className={`mr-3 h-5 w-5 flex-shrink-0 z-10 ${isActive
                            ? 'text-white'
                            : 'text-blue-500 dark:text-blue-400'
                            }`}
                          aria-hidden="true"
                        />
                        <span className="z-10">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            ))}
          </nav>

          {/* User Profile Section (Matching Admin Style) */}
          <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div className="relative">
                  <img
                    className="h-10 w-10 rounded-xl object-cover border-2 border-white shadow-sm"
                    src={user?.profilePhoto || `https://ui-avatars.com/api/?name=${user?.name || 'Rec'}&background=2563eb&color=fff`}
                    alt={user?.name || 'Receptionist'}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">
                    {user?.name || 'Receptionist'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 truncate tracking-wide">
                    RECEPTIONIST
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
