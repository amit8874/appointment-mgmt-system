import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const tips = [
  "Setting up your digital clinic environment...",
  "Did you know? AI helps reduce clinical documentation time by 40%.",
  "Oviaan ensures your patient data is encrypted and secure.",
  "Preparing the world's most advanced management tools for you.",
  "Almost there! We are finalizing your dashboard landing.",
  "Your health practice, now powered by next-gen intelligence.",
  "Please don't refresh or close, we are syncing your latest data."
];

const PremiumLoader = () => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12"
        >
          <motion.img
            src="/logo.png"
            alt="Oviaan"
            className="h-24 w-auto drop-shadow-2xl"
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.9, 1, 0.9]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        {/* Professional Loading Bar */}
        <div className="w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden mb-8 relative">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-indigo-600"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Shimmer effect on bar */}
          <motion.div 
            className="absolute inset-0 bg-white/20"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Text Area */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Landing Soon
          </h2>
          <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
            We're setting up your workspace. Please don't go back or close the window, we are landing soon.
          </p>
          
          <div className="h-12 flex items-center justify-center py-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600/60"
              >
                {tips[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Connection status simulation */}
        <div className="mt-12 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Connecting to secure servers...
          </span>
        </div>
      </div>
    </div>
  );
};

export default PremiumLoader;
