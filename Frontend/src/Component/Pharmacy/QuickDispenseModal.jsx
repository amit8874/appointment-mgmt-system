import React, { useState } from 'react';
import { 
  X, 
  Minus, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Package,
  ArrowDownToLine,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';

const QuickDispenseModal = ({ item, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispenseSuccess, setDispenseSuccess] = useState(false);

  const handleDispense = async () => {
    if (quantity <= 0) return;

    try {
      setIsSubmitting(true);
      await pharmacyApi.dispenseMedicine({
        productId: item.productId._id,
        quantity,
        orderId: null, // Manual dispense
        notes: notes || 'Manual Quick Dispense'
      });

      setDispenseSuccess(true);
      toast.success('Inventory updated successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dispensing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
      >
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
                <ArrowDownToLine size={20} />
            </div>
            <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Quick Dispense</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!dispenseSuccess ? (
            <>
              {/* Product Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Package size={20} className="text-slate-400" />
                    <div>
                        <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{item.productId.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.productId.category}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stock</p>
                    <p className="font-black text-slate-900">{item.stockLevel} <span className="text-[10px] opacity-50 uppercase">units</span></p>
                </div>
              </div>

              {/* Counter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity to Subtract</label>
                <div className="flex items-center bg-white rounded-2xl p-1 border border-slate-200 focus-within:border-orange-500/50 transition-all">
                    <button 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                        className="p-4 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-orange-600 transition-colors"
                    >
                        <Minus size={20} />
                    </button>
                    <input 
                        type="number" 
                        value={quantity} 
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full text-center font-black text-2xl text-slate-900 outline-none"
                    />
                    <button 
                        onClick={() => setQuantity(q => q + 1)} 
                        className="p-4 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-orange-600 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usage Notes (Optional)</label>
                <div className="relative">
                    <FileText className="absolute left-4 top-4 text-slate-300" size={16} />
                    <textarea 
                        placeholder="e.g. Walk-in customer or Internal use..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 transition-all min-h-[100px] resize-none"
                    />
                </div>
              </div>

              {/* Projection */}
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">New Balance</span>
                </div>
                <p className="font-black text-orange-900 text-lg">
                    {item.stockLevel - quantity} <span className="text-[10px] uppercase">units left</span>
                </p>
              </div>

              {item.stockLevel - quantity < 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
                    <AlertCircle size={14} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Insufficient stock!</p>
                </div>
              )}

              <button
                disabled={isSubmitting || (item.stockLevel - quantity < 0) || quantity <= 0}
                onClick={handleDispense}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 flex items-center justify-center gap-3"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> Confirm & Subtract</>}
              </button>
            </>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10 space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-50">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Stock Subtracted</h3>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">History Logged Successfully</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Inventory</p>
                 <p className="text-2xl font-black text-slate-900">{item.stockLevel - quantity} units</p>
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">Closing dialogue...</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuickDispenseModal;
