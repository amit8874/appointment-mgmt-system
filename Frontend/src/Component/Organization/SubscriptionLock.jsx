import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Crown, ArrowRight, ShieldAlert, PhoneCall } from 'lucide-react';

const SubscriptionLock = ({ isExpired, planName = 'Trial', role = 'admin' }) => {
  const navigate = useNavigate();
  
  const isStaff = role === 'receptionist' || role === 'doctor' || role === 'staff';

  if (!isExpired) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Dynamic Blur Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-white/40 backdrop-blur-xl"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100 max-w-lg w-full overflow-hidden"
      >
        {/* Top Decorative Banner */}
        <div className="h-2 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600" />
        
        <div className="p-8 md:p-10">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500 blur-2xl opacity-20 animate-pulse" />
              <div className="relative bg-rose-50 rounded-3xl p-5 border border-rose-100">
                <AlertCircle size={48} className="text-rose-500" />
              </div>
              <div className="absolute -top-2 -right-2 bg-amber-400 p-2 rounded-xl shadow-lg border-2 border-white">
                <Crown size={16} className="text-white" />
              </div>
            </div>
          </div>

          <div className="text-center space-y-4 mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">
              {planName} Expired
            </h2>
            <div className="flex items-center justify-center gap-2">
               <div className="h-px w-8 bg-slate-200" />
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Access Restricted</p>
               <div className="h-px w-8 bg-slate-200" />
            </div>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">
              {isStaff 
                ? `Your clinic's ${planName.toLowerCase()} period has ended. Please contact your clinic administrator or owner to renew the subscription and resume work.`
                : `Your ${planName.toLowerCase()} period has ended. To continue managing your clinic and access your patient data, please subscribe to a plan.`
              }
            </p>
          </div>

          <div className="space-y-4">
            {!isStaff ? (
              <button
                onClick={() => navigate('/organization/subscription')}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-slate-900 active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 group uppercase tracking-widest text-sm"
              >
                Buy a Plan Now
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/login';
                }}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group uppercase tracking-widest text-sm"
              >
                Back to Login
              </button>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                     <ShieldAlert size={16} />
                  </div>
                  <div className="leading-none">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Safe</p>
                     <p className="text-[11px] font-bold text-slate-600">Encrypted</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-600 shadow-sm">
                     <PhoneCall size={16} />
                  </div>
                  <div className="leading-none">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support</p>
                     <p className="text-[11px] font-bold text-slate-600">24/7 Help</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <button 
              onClick={() => window.open('https://wa.me/918874614138', '_blank')}
              className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
              Contact Admin for Assistance
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SubscriptionLock;
