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
        className="fixed inset-y-0 left-0 z-30 w-64 bg-gray-100 dark:bg-cyan-800 shadow-xl transform lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-200 ease-in-out"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 px-4 bg-transparent border-b border-gray-200/50 dark:border-cyan-700">
            {user?.organization?.branding?.logo ? (
              <img
                src={user.organization.branding.logo}
                alt="Organization Logo"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <h1 className="text-cyan-600 text-xl font-bold">Hospital Management</h1>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  // Parent menu with children (expandable)
                  <div>
                    <button
                      id={item.id}
                      onClick={() => toggleExpand(item.name)}
                      className={`group flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 text-gray-700 hover:bg-cyan-400 dark:text-gray-200 dark:hover:bg-cyan-700`}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className="mr-3 h-5 w-5 flex-shrink-0 text-gray-600 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                          aria-hidden="true"
                        />
                        <span className="text-gray-700 dark:text-gray-200">{item.name}</span>
                      </div>
                      {expandedItems[item.name] ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    {/* Sub-menu items */}
                    {expandedItems[item.name] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-6 mt-1 space-y-1"
                      >
                        {item.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            className={({ isActive }) =>
                              `group flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${isActive
                                ? 'bg-cyan-500 text-white'
                                : 'text-gray-600 hover:bg-cyan-400 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-cyan-700 dark:hover:text-white'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <child.icon
                                  className={`mr-3 h-4 w-4 flex-shrink-0 ${isActive
                                    ? 'text-white'
                                    : 'text-gray-500 group-hover:text-gray-700'
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
                      `group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 ${isActive
                        ? 'bg-cyan-500 text-white'
                        : 'text-gray-700 hover:bg-cyan-400 dark:text-gray-200 dark:hover:bg-cyan-700'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive
                            ? 'text-white'
                            : 'text-gray-600 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                            }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            ))}
          </nav>

          {/* Profile & Logout */}
          <div className="p-4 border-t border-cyan-600 dark:border-cyan-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img
                    className="h-9 w-9 rounded-full object-cover"
                    src={user?.profilePhoto || `https://ui-avatars.com/api/?name=${user?.name || 'Receptionist'}&background=4f46e5&color=fff`}
                    alt={user?.name || 'Receptionist'}
                  />
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {user?.name || 'Receptionist'}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-200 dark:hover:text-cyan-100"
                    onClick={() => navigate('/receptionist/profile')}
                  >
                    View profile
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="ml-4 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="sr-only">Logout</span>
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
