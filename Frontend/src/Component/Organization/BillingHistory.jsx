import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { subscriptionApi } from '../../services/api';
import { format } from 'date-fns';

const BillingHistory = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await subscriptionApi.getMySubscription();
        setSubscription(data);
      } catch (err) {
        console.error('Failed to fetch billing history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!subscription || !subscription.paymentHistory || subscription.paymentHistory.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-900/40 rounded-2xl border border-white/5">
        <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Payment History</h3>
        <p className="text-gray-400 mb-6">You haven't made any subscription payments yet.</p>
        <button className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors inline-flex items-center gap-2">
          View Plans <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-violet-400" />
          Billing History
        </h2>
        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
          Active: {subscription.planName}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-gray-900/20 backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {subscription.paymentHistory.map((payment, index) => (
              <tr key={index} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 text-white font-medium">
                  {format(new Date(payment.date), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 text-gray-300">
                  {subscription.planName}
                </td>
                <td className="px-6 py-4 text-white font-bold">
                  ₹{payment.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    payment.status === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'bg-red-500/10 text-red-400'
                  }`}>
                    {payment.status === 'success' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {payment.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                  {payment.orderId}
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-lg group-hover:bg-violet-600/20">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-600/10 to-indigo-600/10 border border-violet-500/20 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-600 rounded-xl text-white shadow-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-1">Next Billing Date</h4>
            <p className="text-gray-400 text-sm">
              Your next payment of ₹{subscription.amount} will be processed on 
              <span className="text-white font-bold mx-1">
                {subscription.nextBillingDate ? format(new Date(subscription.nextBillingDate), 'MMMM dd, yyyy') : 'N/A'}
              </span>
            </p>
          </div>
          <button className="ml-auto flex items-center gap-2 text-sm text-violet-400 font-bold hover:text-violet-300 transition-colors uppercase tracking-widest">
            Manage <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingHistory;
