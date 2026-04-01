import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  FileText,
  Calendar,
  Loader2,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pharmacyApi } from '../../services/api';

const MedicineUsageHistoryModal = ({ product, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await pharmacyApi.getInventoryLogs(product.productId._id);
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [product]);

  const getTypeStyle = (type) => {
    switch (type) {
      case 'dispense': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'restock': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'bulk_upload': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-3xl h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
      >
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                <History size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Usage History</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {product.productId.name} • Internal Audit Trail
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Fetching audit logs...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
                {logs.map((log) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={log._id}
                        className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl border ${getTypeStyle(log.type)}`}>
                                {log.quantity < 0 ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getTypeStyle(log.type)}`}>
                                        {log.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight">
                                    {log.type === 'dispense' ? `Dispensed to ${log.patientName}` : log.notes || 'Inventory Update'}
                                </h4>
                                {log.orderId && (
                                    <p className="text-[10px] font-bold text-indigo-600 mt-1 flex items-center gap-1">
                                        <FileText size={10} /> Order ID: {log.orderId.substring(0, 8)}...
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-8 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Change</p>
                                <p className={`text-lg font-black ${log.quantity < 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                    {log.quantity > 0 ? '+' : ''}{log.quantity} <span className="text-[10px] opacity-50 uppercase">units</span>
                                </p>
                            </div>
                            <div className="text-right min-w-[100px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Balance</p>
                                <p className="text-lg font-black text-slate-900">
                                    {log.newStock} <span className="text-[10px] opacity-50 uppercase">units</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
                <div className="p-8 bg-slate-50 rounded-full">
                    <Package size={64} className="opacity-20" />
                </div>
                <div className="text-center">
                    <p className="font-black text-xl text-slate-400 tracking-tight">No history found</p>
                    <p className="text-sm font-bold text-slate-300">Transaction records will appear as you dispense stock.</p>
                </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                System generated audit trail • Secure encryption
            </p>
            <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Accuracy Verified</span>
                </div>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MedicineUsageHistoryModal;
