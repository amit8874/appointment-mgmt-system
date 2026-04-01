import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Settings, 
  LogOut,
  Store,
  Radio,
  X,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useAuth } from '../../context/AuthContext';

const PharmacySidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const { logout } = useAuth();
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/pharmacy/dashboard' },
    { name: 'Analysis', icon: BarChart3, path: '/pharmacy/analysis' },
    { name: 'Nearby Broadcasts', icon: Radio, path: '/pharmacy/broadcasts' },
    { name: 'Orders', icon: ShoppingCart, path: '/pharmacy/orders' },
    { name: 'Inventory', icon: Package, path: '/pharmacy/inventory' },
    { name: 'Settings', icon: Settings, path: '/pharmacy/settings' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                <Store size={24} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 leading-tight">Pharmacy</h2>
                <p className="text-xs text-slate-500 font-medium">Partner Portal</p>
              </div>
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) toggleSidebar();
                }}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all
                  ${isActive 
                    ? 'bg-orange-50 text-orange-600 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-slate-50">
            <button 
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all"
              onClick={logout}
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default PharmacySidebar;
