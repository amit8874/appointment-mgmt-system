import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, X, Crown, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LimitReachedModal = ({ isOpen, onClose, message, limit, feature = 'Doctor' }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 w-full max-w-md overflow-hidden"
        >
          {/* Header Decoration */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-50 dark:from-indigo-900/20 to-transparent" />
          
          <div className="relative p-10 flex flex-col items-center text-center">
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-indigo-50 dark:border-indigo-900/50 flex items-center justify-center mb-8 relative">
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900">
                <Crown size={14} className="text-white fill-white" />
              </div>
              <ShieldAlert className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight mb-4">
               Limit Reached
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
              {message || `You've reached your ${feature} limit (${limit}). To continue growing your practice, we invite you to upgrade your plan.`}
            </p>

            {/* Current Limit Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 mb-10">
              Current Plan Limit: {limit} {feature}(s)
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-4">
              <button
                onClick={() => {
                  onClose();
                  navigate('/organization/subscription');
                }}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-indigo-900 transition-all flex items-center justify-center gap-3 active:scale-95 group"
              >
                Upgrade Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3 bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LimitReachedModal;
