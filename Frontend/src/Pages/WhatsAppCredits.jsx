import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, MessageSquare, History, CreditCard, AlertCircle, 
  CheckCircle2, ArrowUpRight, ArrowDownRight, RefreshCcw,
  Zap, Crown, ShieldCheck, ChevronRight, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { whatsappCreditsApi } from '../services/api';
import { toast } from 'react-toastify';

const WhatsAppCredits = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [packs, setPacks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transLoading, setTransLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = ['orgadmin', 'admin', 'superadmin'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balanceRes, packsRes] = await Promise.all([
        whatsappCreditsApi.getBalance(),
        whatsappCreditsApi.getPacks()
      ]);

      if (balanceRes.success) setBalance(balanceRes.data);
      if (packsRes.success) setPacks(packsRes.data);
      
      await fetchTransactions(1);
    } catch (error) {
      console.error('Error fetching WhatsApp credits data:', error);
      toast.error('Failed to load credit details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (pageNum) => {
    try {
      setTransLoading(true);
      const res = await whatsappCreditsApi.getTransactions({ page: pageNum, limit: 10 });
      if (res.success) {
        setTransactions(res.data);
        setTotalPages(res.pagination.totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRechargeClick = (pack) => {
    if (isAdmin) {
      toast.info('Payment integration coming soon. Please contact support (8874614138 / amitmaurya3276@gmail.com) for manual recharge.', {
        position: "top-center",
        autoClose: 5000
      });
    } else {
      toast.warning('Please contact support (8874614138 / amitmaurya3276@gmail.com) or your clinic admin to recharge WhatsApp credits.', {
        position: "top-center"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <Wallet className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <MessageSquare className="text-white" size={28} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
              WhatsApp Credits
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
            Track patient communication credits used for appointment updates, invoices, prescriptions, reminders and manual WhatsApp messages.
          </p>
        </div>
        
        {balance && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={18} />
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
              Plan: {balance.planName}
            </span>
          </div>
        )}
      </div>

      {/* Low Credit Warning */}
      {balance && balance.totalAvailable > 0 && balance.totalAvailable < 50 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-4 shadow-sm"
        >
          <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full text-red-600 dark:text-red-200">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="font-black text-red-800 dark:text-red-200 uppercase text-sm tracking-tight">Low Credits Warning</h4>
            <p className="text-red-700 dark:text-red-300 text-sm font-medium mt-0.5">
              WhatsApp communication credits are running low. Please recharge to avoid interruption in patient messages.
            </p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => document.getElementById('recharge-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="ml-auto bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-200 dark:shadow-none"
            >
              Recharge Now
            </button>
          )}
        </motion.div>
      )}

      {/* Zero Credit Warning */}
      {balance && balance.totalAvailable <= 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="bg-red-500 p-4 rounded-3xl shadow-lg shadow-red-500/20 relative z-10">
            <Zap size={40} className="text-white fill-white/20" />
          </div>
          <div className="flex-1 space-y-2 relative z-10 text-center md:text-left">
            <h2 className="text-2xl font-black uppercase tracking-tight italic">No WhatsApp Communication Credits Left</h2>
            <p className="text-slate-400 font-medium max-w-xl">
              {isAdmin 
                ? "Recharge credits to continue sending appointment updates, invoices, prescriptions, reminders and patient messages."
                : "WhatsApp communication credits are finished. Please ask the clinic admin to recharge credits to resume patient messaging."
              }
            </p>
          </div>
          {isAdmin ? (
            <button 
              onClick={() => document.getElementById('recharge-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 relative z-10"
            >
              Recharge Now
            </button>
          ) : (
            <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/10 relative z-10">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Action Required</p>
               <p className="text-xs font-bold">Ask Admin to Recharge</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Balance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Available Credits', 
            value: balance?.totalAvailable || 0, 
            icon: Wallet, 
            color: 'indigo', 
            desc: 'Ready to use messages' 
          },
          { 
            label: 'Used This Month', 
            value: balance?.usedThisMonth || 0, 
            icon: ArrowUpRight, 
            color: 'orange', 
            desc: 'Communication volume' 
          },
          { 
            label: 'Monthly Included', 
            value: balance?.monthlyIncluded || 0, 
            icon: Zap, 
            color: 'emerald', 
            desc: 'Reset every month' 
          },
          { 
            label: 'Purchased Credits', 
            value: balance?.purchasedCredits || 0, 
            icon: Crown, 
            color: 'violet', 
            desc: 'Permanent lifetime' 
          }
        ].map((item, idx) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-gray-700 hover:shadow-2xl transition-all group"
          >
            <div className={`p-4 rounded-2xl bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600 dark:text-${item.color}-400 w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <item.icon size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
              {item.value.toLocaleString()}
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1.5">
              <Info size={12} />
              {item.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recharge Section */}
      <div id="recharge-section" className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <CreditCard size={24} className="text-indigo-600" />
            Recharge Credits
          </h2>
          {!isAdmin && (
            <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest border border-orange-100">
              Admin Access Required
            </span>
          )}
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-3">
          <Info size={18} className="text-indigo-600" />
          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
            Purchased credits are added to your available balance and carry forward indefinitely. Monthly included credits reset based on your current plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packs.map((pack, idx) => (
            <motion.div 
              key={pack.id}
              whileHover={{ y: -10 }}
              className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 ${idx === 1 ? 'border-indigo-500 shadow-2xl shadow-indigo-100' : 'border-slate-100 dark:border-gray-700 shadow-xl'} p-8 flex flex-col items-center text-center`}
            >
              {idx === 1 && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white px-6 py-2 rounded-bl-3xl font-black text-[10px] uppercase tracking-widest">
                  Best Value
                </div>
              )}
              
              <div className={`p-4 rounded-full ${idx === 1 ? 'bg-indigo-50' : 'bg-slate-50'} mb-6`}>
                <Zap size={32} className={idx === 1 ? 'text-indigo-600' : 'text-slate-400'} />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{pack.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 dark:text-white">₹{pack.price}</span>
                <span className="text-slate-400 font-bold text-sm">/ pack</span>
              </div>
              
              <div className="mt-6 space-y-3 w-full">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-700/50 rounded-2xl border border-slate-100 dark:border-gray-600">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Messages</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{pack.credits.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 pl-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Permanent Validity</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 pl-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>All Features Included</span>
                </div>
              </div>

              <button 
                onClick={() => handleRechargeClick(pack)}
                className={`mt-8 w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                  isAdmin 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isAdmin ? 'Recharge Now' : 'Ask Admin to Recharge'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <History size={24} className="text-indigo-600" />
            Transaction History
          </h2>
          <button 
            onClick={() => fetchTransactions(1)}
            disabled={transLoading}
            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
          >
            <RefreshCcw size={18} className={transLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-slate-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-600">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Message Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Balance After</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                <AnimatePresence mode="wait">
                  {transactions.map((tx, idx) => (
                    <motion.tr 
                      key={tx._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {new Date(tx.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          tx.type === 'credit' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-orange-50 text-orange-600 border border-orange-100'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                          {tx.messageType?.replace(/_/g, ' ') || 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center font-black ${
                          tx.type === 'credit' ? 'text-emerald-600' : 'text-orange-600'
                        }`}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.credits}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{tx.balanceAfter.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xs truncate" title={tx.description}>
                          {tx.description}
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {!transLoading && transactions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <History size={48} className="text-slate-200" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No transactions found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 bg-slate-50 dark:bg-gray-700/50 border-t border-slate-100 dark:border-gray-600 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1 || transLoading}
                  onClick={() => fetchTransactions(page - 1)}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-slate-400 hover:border-indigo-500 disabled:opacity-50 transition-all shadow-sm"
                >
                  Prev
                </button>
                <button 
                  disabled={page === totalPages || transLoading}
                  onClick={() => fetchTransactions(page + 1)}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-slate-400 hover:border-indigo-500 disabled:opacity-50 transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppCredits;
