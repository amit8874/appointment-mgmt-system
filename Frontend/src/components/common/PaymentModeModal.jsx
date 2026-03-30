import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Smartphone, CreditCard } from 'lucide-react';

const PaymentModeModal = ({ isOpen, onClose, onConfirm, patientName }) => {
  if (!isOpen) return null;

  const paymentModes = [
    { id: 'Cash', icon: Wallet, color: 'text-green-600', bg: 'bg-green-50', hover: 'hover:bg-green-100', border: 'border-green-200' },
    { id: 'UPI', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200' },
    { id: 'Card', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-200' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-gray-700"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-slate-50/50 dark:bg-gray-900/50">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Select Payment Mode</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Billing for: {patientName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center font-medium">
              Please choose a payment method to mark the pending bills as paid.
            </p>

            <div className="grid grid-cols-1 gap-4">
              {paymentModes.map((mode) => (
                <motion.button
                  key={mode.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onConfirm(mode.id)}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 ${mode.bg} ${mode.border} ${mode.hover} transition-all group`}
                >
                  <div className={`p-3 rounded-xl bg-white shadow-sm group-hover:shadow-md transition-shadow`}>
                    <mode.icon className={`w-6 h-6 ${mode.color}`} />
                  </div>
                  <div className="text-left">
                    <span className="block text-lg font-black text-slate-800 dark:text-white leading-none">{mode.id}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter mt-1 block">Pay via {mode.id}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-center">
            <button
              onClick={onClose}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-widest"
            >
              Cancel Payment
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModeModal;
