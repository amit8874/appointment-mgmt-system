import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, Building, RefreshCw, Plus } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ClinicSwitcher = () => {
  const { user, login } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // We only show the switcher to admins, doctors, and receptionists
  const canSwitch = ['admin', 'orgadmin', 'doctor', 'receptionist'].includes(user?.role?.toLowerCase());

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch clinics associated with the logged-in user
  useEffect(() => {
    if (!canSwitch || !user) return;

    const fetchClinics = async () => {
      try {
        const response = await api.get('/auth/my-clinics');
        if (response.data?.success) {
          setClinics(response.data.clinics || []);
        }
      } catch (err) {
        console.error('Failed to fetch clinics:', err);
      }
    };

    fetchClinics();
  }, [user?.id, user?.organizationId, canSwitch]);

  const activeOrgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id || user?.organization?.id;
  const activeOrgIdStr = activeOrgId ? activeOrgId.toString() : '';

  const handleSwitch = async (targetOrgId) => {
    if (targetOrgId === activeOrgIdStr) return;

    setLoading(true);
    setIsOpen(false);
    try {
      const response = await api.post('/auth/switch-clinic', {
        targetOrganizationId: targetOrgId
      });

      if (response.data?.success) {
        toast.success(`Switched to ${response.data.user.organization?.name || 'new clinic'} successfully!`);
        
        // Sync context
        login({
          ...response.data.user,
          token: response.data.token
        });

        // Soft reload to clear caches and let dashboard re-mount
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err) {
      console.error('Error switching clinic:', err);
      toast.error(err.response?.data?.message || 'Failed to switch clinic.');
    } finally {
      setLoading(false);
    }
  };

  if (!canSwitch || clinics.length <= 1) return null;

  const currentClinic = clinics.find(c => c.id?.toString() === activeOrgIdStr) || {
    name: user?.organization?.name || user?.organizationId?.name || 'Smile Clinic',
    branding: user?.organization?.branding || user?.organizationId?.branding
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700/80 rounded-xl transition-all border border-slate-200 dark:border-gray-700 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm shadow-sm"
        title="Switch Clinic Branch"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
        ) : (
          <Building className="w-4 h-4 text-indigo-600" />
        )}
        <span className="max-w-[120px] sm:max-w-[200px] truncate">
          {currentClinic.name}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-gray-700 py-2 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-1.5 border-b border-slate-50 dark:border-gray-700/50 mb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              My Clinic Branches
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 px-1">
            {clinics.map((clinic) => {
              const isActive = clinic.id?.toString() === activeOrgIdStr;
              return (
                <button
                  key={clinic.id}
                  onClick={() => handleSwitch(clinic.id)}
                  disabled={isActive || loading}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                    isActive 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black cursor-default' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700/50 font-bold'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-gray-700 text-slate-500'
                  }`}>
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <p className="text-xs sm:text-sm truncate leading-tight">{clinic.name}</p>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                      Role: {clinic.role || 'Admin'}
                    </p>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicSwitcher;
