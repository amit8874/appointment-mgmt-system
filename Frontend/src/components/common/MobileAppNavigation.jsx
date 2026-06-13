import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Activity, Users, Plus } from 'lucide-react';

const MobileAppNavigation = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) return null;

  const role = user.role?.toLowerCase();
  const isAdmin = ['admin', 'orgadmin', 'superadmin'].includes(role);
  const isReceptionist = role === 'receptionist';

  // Only render for admin and receptionist roles
  if (!isAdmin && !isReceptionist) return null;

  const queryParams = new URLSearchParams(location.search);
  const currentTab = queryParams.get('tab');
  const pathname = location.pathname;

  // Determine which tab is active
  let activeTab = '';
  if (isAdmin) {
    if (pathname.includes('/admin/patient/')) {
      activeTab = 'patients';
    } else if (currentTab === 'Patients') {
      activeTab = 'patients';
    } else if (currentTab === 'Today Appointment') {
      activeTab = 'today';
    } else if (currentTab === 'Calendar View' || currentTab === 'Appointment Mgmt') {
      activeTab = 'grid';
    }
  } else if (isReceptionist) {
    if (pathname.includes('/receptionist/patients') || pathname.includes('/receptionist/patient/')) {
      activeTab = 'patients';
    } else if (pathname.includes('/receptionist/track-appointments')) {
      activeTab = 'today';
    } else if (pathname.includes('/receptionist/appointments')) {
      activeTab = 'grid';
    }
  }

  // Navigation handlers
  const handleGridClick = () => {
    if (isAdmin) {
      navigate('/admin-dashboard?tab=Calendar View');
      if (window.handleTabChange) window.handleTabChange('Calendar View');
    } else {
      navigate('/receptionist/appointments');
    }
  };

  const handleTodayClick = () => {
    if (isAdmin) {
      navigate('/admin-dashboard?tab=Today Appointment');
      if (window.handleTabChange) window.handleTabChange('Today Appointment');
    } else {
      navigate('/receptionist/track-appointments');
    }
  };

  const handlePatientsClick = () => {
    if (isAdmin) {
      navigate('/admin-dashboard?tab=Patients');
      if (window.handleTabChange) window.handleTabChange('Patients');
    } else {
      navigate('/receptionist/patients');
    }
  };

  const handleAddClick = () => {
    if (isAdmin) {
      navigate('/admin-dashboard?tab=New Appointment');
      if (window.handleTabChange) window.handleTabChange('New Appointment');
    } else {
      navigate('/receptionist/new-appointment');
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={handleAddClick}
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 z-50 transition-transform active:scale-90 border border-indigo-400/20"
        aria-label="New Appointment"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 text-white border-t-2 border-blue-900 flex items-center z-50 pb-safe shadow-lg">
        {/* Grid View */}
        <button
          onClick={handleGridClick}
          className={`flex-1 flex flex-col items-center justify-center h-full transition-colors border-r-2 border-blue-900 ${
            activeTab === 'grid'
              ? 'bg-slate-800 text-blue-400 font-extrabold'
              : 'text-gray-300 hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-5.5 h-5.5 mb-1 transition-transform active:scale-95 text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            Grid View
          </span>
        </button>

        {/* Today Appointment */}
        <button
          onClick={handleTodayClick}
          className={`flex-1 flex flex-col items-center justify-center h-full transition-colors border-r-2 border-blue-900 ${
            activeTab === 'today'
              ? 'bg-slate-800 text-blue-400 font-extrabold'
              : 'text-gray-300 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-5.5 h-5.5 mb-1 transition-transform active:scale-95 text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-center">
            Today Appt
          </span>
        </button>

        {/* Patients */}
        <button
          onClick={handlePatientsClick}
          className={`flex-1 flex flex-col items-center justify-center h-full transition-colors ${
            activeTab === 'patients'
              ? 'bg-slate-800 text-blue-400 font-extrabold'
              : 'text-gray-300 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-5.5 h-5.5 mb-1 transition-transform active:scale-95 text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            Patient
          </span>
        </button>
      </div>
    </>
  );
};

export default MobileAppNavigation;
