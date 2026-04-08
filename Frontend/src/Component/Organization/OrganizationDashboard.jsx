import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Stethoscope, 
  Calendar, 
  ClipboardList, 
  Settings, 
  CreditCard, 
  LogOut, 
  LayoutDashboard, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Activity
} from 'lucide-react';
import { organizationApi, analyticsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TrialNotification from './TrialNotification';
import BurstEffect from '../BurstEffect';

const OrganizationDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [organization, setOrganization] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Get organizationId safely
  const orgRawId = user?.organizationId || localStorage.getItem('organizationId');
  const organizationId = typeof orgRawId === 'object' ? orgRawId._id : orgRawId;

  useEffect(() => {
    fetchData();
    // Check for payment success from navigation state
    if (location.state?.paymentSuccess) {
      setShowSuccessModal(true);
      // Clean up state to avoid re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, organizationId]);

  const fetchData = async () => {
    try {
      if (organizationId) {
        const [orgData, analyticsData] = await Promise.all([
          organizationApi.getById(organizationId),
          analyticsApi.getDashboard(),
        ]);
        setOrganization(orgData);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-indigo-400 font-medium animate-pulse">Syncing Clinic Data...</p>
        </div>
      </div>
    );
  }

  const planType = organization?.planType || 'FREE_TRIAL';
  const isPremium = planType === 'PAID';

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 selection:bg-indigo-500/30">
      <TrialNotification organizationId={organizationId} />
      
      {/* Success Celebration Overlay */}
      <AnimatePresence>
        {showSuccessModal && (
          <>
            <BurstEffect />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0B0F19]/80 backdrop-blur-sm"
              onClick={() => setShowSuccessModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#1E293B] border border-emerald-500/30 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 italic uppercase tracking-tight">Access Unlocked!</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Your premium subscription is now active. All features are unlocked and your clinic is ready to scale.
                </p>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95 text-sm uppercase tracking-widest"
                >
                  Let's Begin
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modern Glass Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xl border-b border-white/5 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-indigo-600/20 text-xs">
                S
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-none">
                  {organization?.name || 'Clinic Dashboard'}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isPremium ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    {isPremium ? 'Premium' : 'Trial'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/organization/subscription')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-semibold">Billing</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all group"
              >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Dashboard Hero Card - COMPACTED */}
        <section className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 opacity-90 transition-all duration-500 group-hover:scale-105" />
          
          <div className="relative p-6 md:p-8 rounded-[1.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
            <div className="text-center md:text-left space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white">
                <Sparkles className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Welcome Back</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic uppercase leading-none">
                {user?.name?.split(' ')[0] || 'Clinic Partner'}
              </h2>
              <p className="text-indigo-100 max-w-sm text-sm font-medium leading-relaxed opacity-80 decoration-indigo-300">
                Manage your medical practice with powerful premium insights.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl w-full md:w-auto shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 leading-none mb-1">Status</p>
                  <p className="text-lg font-black text-white tracking-tight leading-none">
                    {isPremium ? 'PRO ACTIVATED' : 'FREE TRIAL'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/admin-dashboard')}
                className="w-full py-2.5 bg-white text-indigo-700 rounded-xl font-black shadow-lg hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
              >
                Go to Clinic HQ
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>

        {/* Dynamic Stats Grid - TIGHTER */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PremiumStatCard
            title="Registered Doctors"
            value={analytics?.overview?.totalDoctors || 0}
            icon={Stethoscope}
            color="indigo"
            trend="+12%"
          />
          <PremiumStatCard
            title="Patient Database"
            value={analytics?.overview?.totalPatients || 0}
            icon={Users}
            color="emerald"
            trend="+5%"
          />
          <PremiumStatCard
            title="Monthly Growth"
            value={analytics?.overview?.appointmentsThisMonth || 0}
            icon={TrendingUp}
            color="violet"
            trend="NEW"
          />
          <PremiumStatCard
            title="Total Appointments"
            value={analytics?.overview?.totalAppointments || 0}
            icon={Activity}
            color="rose"
            trend="LIVE"
          />
        </section>

        {/* Action Center - BETTER PROPORTIONS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5 text-indigo-500" />
              Action Center
            </h3>
            <span className="h-[1px] flex-1 bg-gradient-to-r from-indigo-500/30 to-transparent ml-6" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard 
              label="Clinic Admin"
              desc="Full management dashboard"
              icon={Settings}
              color="from-indigo-600 to-indigo-800 shadow-indigo-600/20"
              onClick={() => navigate('/admin-dashboard')}
            />
            <ActionCard 
              label="E-Billing Hub"
              desc="Manage plans & invoices"
              icon={CreditCard}
              color="from-violet-600 to-purple-800 shadow-violet-600/20"
              onClick={() => navigate('/organization/subscription')}
            />
            <ActionCard 
              label="Receptionist"
              desc="Operational front-end"
              icon={ClipboardList}
              color="from-emerald-600 to-teal-800 shadow-emerald-600/20"
              onClick={() => navigate('/receptionist')}
            />
          </div>
        </section>

      </main>
    </div>
  );
};

const PremiumStatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colors = {
    indigo: "border-indigo-500/20 bg-indigo-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    violet: "border-violet-500/20 bg-violet-500/5",
    rose: "border-rose-500/20 bg-rose-500/5"
  };
  
  return (
    <motion.div 
      whileHover={{ y: -3, scale: 1.01 }}
      className={`relative p-5 rounded-2xl border ${colors[color]} backdrop-blur-xl transition-all shadow-xl overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 p-3 opacity-10 blur-[2px] flex scale-125 transform transition-transform group-hover:scale-110">
        <Icon className="w-12 h-12" />
      </div>
      
      <div className="relative flex justify-between items-start mb-4">
        <div className={`p-2 rounded-xl border border-white/5`}>
          <Icon className="w-4 h-4 opacity-80" />
        </div>
        <span className="text-[8px] font-black tracking-widest px-2 py-0.5 bg-white/5 rounded-full text-slate-400">
          {trend}
        </span>
      </div>
      
      <div className="relative">
        <p className="text-3xl font-black text-white tracking-tight mb-0.5">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
    </motion.div>
  );
};

const ActionCard = ({ label, desc, icon: Icon, color, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -3 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`relative h-36 rounded-2xl bg-gradient-to-br ${color} p-6 text-left transition-all border border-white/10 group overflow-hidden shadow-xl flex flex-col justify-end`}
  >
    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-105 transition-transform">
      <Icon className="w-10 h-10 text-white" />
    </div>
    <div className="relative">
      <h4 className="text-xl font-black text-white tracking-tight uppercase italic mb-0.5">{label}</h4>
      <p className="text-white/60 text-[10px] font-medium">{desc}</p>
    </div>
  </motion.button>
);

export default OrganizationDashboard;
