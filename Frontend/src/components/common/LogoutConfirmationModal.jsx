import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X } from 'lucide-react';

const LogoutConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            {/* Header / Icon */}
            <div className="bg-rose-50 dark:bg-rose-900/20 px-6 py-6 text-center">
              <div className="mx-auto w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                <LogOut className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sign Out</h3>
            </div>
            
            {/* Body */}
            <div className="px-6 py-6 text-center">
              <p className="text-gray-600 dark:text-gray-300">
                Do you really want to sign out? You will need to log in again to access your dashboard.
              </p>
            </div>
            
            {/* Footer / Actions */}
            <div className="px-6 pb-6 flex items-center space-x-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                autoFocus
              >
                No, cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-sm transition-colors"
              >
                Yes, sign out
              </button>
            </div>
            
            {/* Close Button (Top right) */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white/50 dark:bg-gray-800/50 rounded-full backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LogoutConfirmationModal;
