import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiGlobe, FiMessageSquare, FiChevronDown, FiLogIn, FiShoppingBag, FiClock } from 'react-icons/fi';
import { FaHospital, FaUserCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { pharmacyApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ onMenuClick }) => {
  const { isAuthenticated, user, logout } = useAuth();

  const [isHealthEaseOpen, setIsHealthEaseOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [activePresCount, setActivePresCount] = useState(0);
  const navigate = useNavigate();

  // Fetch active prescription count for the 'Cart' badge
  const updatePresCount = async () => {
    try {
      let count = 0;
      // 1. Guest Count
      const guestId = sessionStorage.getItem('guestOrderId');
      if (guestId) count++;

      // 2. Auth Count (if logged in)
      if (isAuthenticated) {
        const presData = await pharmacyApi.getPatientPrescriptions();
        // Only count active ones
        const activeTypes = ['broadcast', 'quoted', 'selected', 'confirmed', 'pending', 'processing', 'ready', 'shipped'];
        const activePres = (presData || []).filter(p => activeTypes.includes(p.status?.toLowerCase()));
        
        // Merge without double counting
        const uniqueIds = new Set(activePres.map(p => p._id.toString()));
        if (guestId) uniqueIds.add(guestId);
        count = uniqueIds.size;
      }
      setActivePresCount(count);
    } catch (err) {
      console.error("Header count fetch failed:", err);
    }
  };

  useEffect(() => {
    updatePresCount();
    const interval = setInterval(updatePresCount, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center px-6 justify-between border-b border-slate-100">
      <div className="flex items-center gap-6">
        <button onClick={onMenuClick} className="text-gray-600 hover:text-gray-800">
          <FiMenu size={24} />
        </button>

        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
          className="flex items-center gap-2 group"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <FaHospital size={20} />
          </div>
          <span className="text-xl font-black text-slate-800 tracking-tight hidden sm:inline">HealthEase</span>
        </a>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        {/* Prescription Tracking Badge */}
        <div className="relative group">
          <button 
            onClick={() => navigate('/patient/orders')}
            className={`p-2.5 rounded-xl transition-all relative ${activePresCount > 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <FiShoppingBag size={22} />
            {activePresCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-lg flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                {activePresCount}
              </span>
            )}
          </button>
          
          <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-all scale-95 group-hover:scale-100 z-[110] origin-top-right">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <FiClock size={14} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Requests</p>
            </div>
            <p className="text-xs font-black text-slate-700 leading-tight">
              {activePresCount > 0 
                ? `Tracking ${activePresCount} active prescription broadcast(s)` 
                : 'No active prescriptions to track.'}
            </p>
            <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">Click to view details →</p>
          </div>
        </div>

        {/* Action Icons */}
        <div className="hidden sm:flex items-center gap-1">
          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
            <FiMessageSquare size={20} />
          </button>
          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
            <FiGlobe size={20} />
          </button>
        </div>

        {/* User Profile Area */}
        <div className="relative">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-50 rounded-2xl transition-all focus:outline-none border border-transparent hover:border-slate-100"
              >
                <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm overflow-hidden text-indigo-600">
                  {user?.profilePic ? (
                    <img src={user.profilePic} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <FaUserCircle size={24} />
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-black text-slate-800 leading-none mb-1">
                    {user?.fullName || 'My Account'}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                    {user?.mobile || user?.phone || 'Logged In'}
                  </p>
                </div>
                <FiChevronDown size={14} className="text-slate-400 ml-1" />
              </button>
              
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-3xl py-2 z-[120] border border-slate-100 overflow-hidden origin-top-right box-shadow-custom"
                  >
                    <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/30">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account</p>
                      <p className="text-sm font-black text-slate-900 truncate">
                        {user?.fullName || user?.mobile}
                      </p>
                    </div>
                    <div className="p-2">
                      <button onClick={() => { navigate('/patient/orders'); setIsProfileOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors flex items-center gap-3">
                        <FiShoppingBag size={18} /> My Orders
                      </button>
                      <button onClick={() => { navigate('/profile'); setIsProfileOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors flex items-center gap-3">
                        <FaUserCircle size={18} /> Profile Settings
                      </button>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-50 p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                      >
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-[0.1em] hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95"
            >
              <FiLogIn size={16} />
              Login / Sign Up
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
