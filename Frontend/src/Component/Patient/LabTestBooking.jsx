import React from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Sparkles, ArrowRight, Activity, HeartPulse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LabTestBooking = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-white to-blue-50/50 rounded-3xl">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 blur-[100px] rounded-full mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 blur-[100px] rounded-full mix-blend-multiply pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-2xl w-full text-center relative z-10 flex flex-col items-center"
      >
        {/* Floating Icon Container */}
        <div className="relative mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            className="w-32 h-32 bg-white rounded-full shadow-2xl flex items-center justify-center relative z-10 border border-blue-50"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full opacity-10 animate-ping" style={{ animationDuration: '3s' }} />
            <FlaskConical size={56} className="text-blue-600 ml-1" />
          </motion.div>
          
          {/* Orbiting Icons */}
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-4rem] rounded-full border border-dashed border-blue-200/50 pointer-events-none"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-indigo-500">
              <Activity size={18} />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-rose-400">
              <HeartPulse size={18} />
            </div>
          </motion.div>
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs uppercase tracking-widest mb-6 shadow-sm border border-blue-200"
        >
          <Sparkles size={14} className="animate-pulse" />
          Something Huge is Cooking
        </motion.div>

        {/* Typography */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-800 tracking-tight leading-tight mb-6"
        >
          Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Lab Diagnostics</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg sm:text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto mb-10"
        >
          We're partnering with top-tier pathology labs to bring you instantaneous online bookings, at-home sample collections, and AI-driven biological analysis.
        </motion.p>

        {/* Call to Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button 
            onClick={() => navigate('/patient-dashboard')}
            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-3 group"
          >
            Explore Other Features
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
        
      </motion.div>
    </div>
  );
};

export default LabTestBooking;
