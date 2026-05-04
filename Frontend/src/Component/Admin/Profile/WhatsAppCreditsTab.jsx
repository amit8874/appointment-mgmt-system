import React, { useState, useEffect } from 'react';
import { 
  Wallet, MessageSquare, History, CreditCard, AlertCircle, 
  CheckCircle2, RefreshCcw, Zap, Crown, ShieldCheck, Info
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { whatsappCreditsApi } from '../../../services/api';
import { toast } from 'react-toastify';

const WhatsAppCreditsTab = () => {
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
      
      // Initialize with page 1
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

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRechargeClick = async (pack) => {
    try {
      setLoading(true);
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        return;
      }

      // 1. Create order
      const orderRes = await whatsappCreditsApi.createRechargeOrder(pack.id);
      if (!orderRes.success) {
        toast.error(orderRes.message || 'Failed to create order');
        return;
      }

      const { order } = orderRes;

      // 2. Open Razorpay
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Oviaan CRM',
        description: `Recharge: ${pack.name}`,
        image: '/logo192.png', // Or your logo URL
        order_id: order.id,
        handler: async (response) => {
          try {
            setLoading(true);
            const verifyRes = await whatsappCreditsApi.verifyRecharge({
              ...response,
              packId: pack.id
            });

            if (verifyRes.success) {
              toast.success(`${pack.credits} credits added successfully!`);
              // Update local state or re-fetch
              fetchData();
            } else {
              toast.error(verifyRes.message || 'Verification failed');
            }
          } catch (err) {
            console.error('Verification error:', err);
            toast.error('Error verifying payment');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.mobile || ''
        },
        theme: {
          color: '#4F46E5' // indigo-600
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error('Recharge error:', error);
      toast.error('Failed to initiate recharge');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">WhatsApp Communication Credits</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your messaging quota for appointment updates, invoices, and patient engagement.
          </p>
        </div>
        {balance && (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
            <ShieldCheck size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 tracking-wide uppercase">Plan: {balance.planName}</span>
          </div>
        )}
      </div>

      {/* Low/Zero Balance Alerts */}
      {balance && balance.totalAvailable < 50 && (
        <div className={`p-4 rounded-xl border flex items-start gap-4 ${
          balance.totalAvailable <= 0 
            ? 'bg-red-50 border-red-100 text-red-800' 
            : 'bg-amber-50 border-amber-100 text-amber-800'
        }`}>
          <AlertCircle size={20} className={balance.totalAvailable <= 0 ? 'text-red-500' : 'text-amber-500'} />
          <div className="flex-1">
            <h4 className="text-sm font-bold uppercase tracking-tight">
              {balance.totalAvailable <= 0 ? 'Credits Exhausted' : 'Low Credit Warning'}
            </h4>
            <p className="text-sm mt-1 opacity-90 font-medium leading-relaxed">
              {balance.totalAvailable <= 0 
                ? "Your clinic's WhatsApp messaging is currently paused. Please recharge to resume patient communications."
                : "Your credits are running low. Recharge soon to ensure uninterrupted patient messaging."
              }
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Balance', value: balance?.totalAvailable || 0, icon: Wallet },
          { label: 'Used This Month', value: balance?.usedThisMonth || 0, icon: RefreshCcw },
          { label: 'Monthly Quota', value: balance?.monthlyIncluded || 0, icon: Zap },
          { label: 'Purchased Total', value: balance?.purchasedCredits || 0, icon: Crown }
        ].map((item) => (
          <div key={item.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{item.label}</span>
              <item.icon size={16} className="text-slate-300" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {item.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Recharge Packs */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.15em] mb-6">Recharge Packs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packs.map((pack) => (
            <div key={pack.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col hover:border-indigo-300 transition-colors shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-slate-900 tracking-tight">{pack.name}</h4>
                <div className="text-indigo-600 font-bold">₹{pack.price}</div>
              </div>
              <div className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-6">
                {pack.credits.toLocaleString()} <span className="text-xs text-slate-400 font-semibold tracking-normal uppercase">Credits</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Permanent Validity
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Direct CRM Integration
                </li>
              </ul>
              <button 
                onClick={() => handleRechargeClick(pack)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.15em]">Transaction History</h3>
          <button 
            onClick={() => fetchTransactions(1)}
            disabled={transLoading}
            className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCcw size={14} className={transLoading ? 'animate-spin' : ''} />
            Refresh History
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Transaction Type</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Post Balance</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isCredit = ['RECHARGE', 'MONTHLY_RESET', 'REFUND'].includes(tx.type) || (tx.type === 'ADJUSTMENT' && tx.balanceAfter > tx.balanceBefore);
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isCredit ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {tx.type}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {(() => {
                        const isCredit = ['RECHARGE', 'MONTHLY_RESET', 'REFUND'].includes(tx.type) || (tx.type === 'ADJUSTMENT' && tx.balanceAfter > tx.balanceBefore);
                        return (
                          <span className={isCredit ? 'text-emerald-600' : 'text-slate-700'}>
                            {isCredit ? '+' : '-'}{tx.credits}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {tx.balanceAfter.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-semibold max-w-[200px] truncate">
                      {tx.description}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && !transLoading && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                      No transaction history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button 
                  disabled={page === 1 || transLoading}
                  onClick={() => fetchTransactions(page - 1)}
                  className="px-4 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Previous
                </button>
                <button 
                  disabled={page === totalPages || transLoading}
                  onClick={() => fetchTransactions(page + 1)}
                  className="px-4 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
        <Info size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          Monthly included credits are allocated at the start of your billing cycle. Purchased packs have permanent validity and will be consumed only after monthly credits are exhausted.
        </p>
      </div>
    </div>
  );
};

export default WhatsAppCreditsTab;
