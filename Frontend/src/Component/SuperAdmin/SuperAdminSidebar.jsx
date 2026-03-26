import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  IndianRupee, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  ChevronRight,
  History,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SuperAdminSidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { 
      path: '/superadmin/dashboard', 
      name: 'Dashboard', 
      icon: LayoutDashboard,
      color: 'text-blue-500'
    },
    { 
      path: '/superadmin/organizations', 
      name: 'Organizations', 
      icon: Building2,
      color: 'text-indigo-500' 
    },
    { 
      path: '/superadmin/subscriptions', 
      name: 'Subscriptions', 
      icon: CreditCard,
      color: 'text-purple-500'
    },
    { 
      path: '/superadmin/revenue', 
      name: 'Revenue', 
      icon: IndianRupee,
      color: 'text-emerald-500'
    },
    { 
      path: '/superadmin/pharmacies', 
      name: 'Pharmacies', 
      icon: Store,
      color: 'text-orange-500'
    },
    { 
      path: '/superadmin/audit-logs', 
      name: 'Audit Trail', 
      icon: History,
      color: 'text-slate-600'
    },
    { 
      path: '/superadmin/settings', 
      name: 'Settings', 
      icon: Settings,
      color: 'text-gray-500'
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/superadmin');
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg md:hidden hover:bg-gray-50 transition-colors"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -280,
          width: 280 
        }}
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-100 z-50 shadow-2xl md:shadow-none transition-all duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Slotify</h1>
                <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Super Admin</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-indigo-50/50 text-indigo-700 shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 transition-colors ${isActive ? item.color : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className="font-semibold text-sm">{item.name}</span>
                  </div>
                  {isActive && (
                    <motion.div layoutId="activeInd" className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  )}
                  {!isActive && <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-gray-50 bg-gray-50/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold text-sm"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default SuperAdminSidebar;
