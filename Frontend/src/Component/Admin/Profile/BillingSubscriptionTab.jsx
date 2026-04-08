import React from 'react';
import { CreditCard, Calendar, CheckCircle2, AlertCircle, ArrowUpCircle, History } from 'lucide-react';

const BillingSubscriptionTab = ({ subscription, onUpgrade }) => {
  const plan = subscription?.plan || 'free';
  const planName = subscription?.planName || 'Free Trial';
  const nextBilling = subscription?.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A';
  const status = subscription?.status || 'active';
  const amount = subscription?.amount || 0;
  
  const features = {
    free: ['1 Doctor', '100 Appointments/mo', 'Basic Analytics'],
    basic: ['1 Doctor', '500 Appointments/mo', 'Full Analytics', 'Email Support'],
    pro: ['3 Doctors', '2000 Appointments/mo', 'Advanced AI Insights', 'Priority Support'],
    enterprise: ['Unlimited Doctors', 'Unlimited Appointments', 'Whitelabeling', 'Dedicated Account Manager']
  };

  const curFeatures = features[plan] || features.free;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Current Plan Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <CreditCard size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Subscription Plan</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}>
                {status}
              </span>
            </div>

            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h4 className="text-3xl font-black text-slate-900">{planName}</h4>
                  <p className="text-slate-500 mt-1">Your current monthly billing cycle</p>
                </div>
                <div className="text-right">
                  <h4 className="text-3xl font-black text-slate-900">₹{amount}</h4>
                  <p className="text-slate-500 mt-1">per month</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {curFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar size={16} />
                  <span>Next Billing: <span className="font-bold text-slate-900">{nextBilling}</span></span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={onUpgrade}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                  <ArrowUpCircle size={18} />
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>

          {/* Payment History Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                  <History size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Payment History</h3>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Amount</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(subscription?.paymentHistory || []).length > 0 ? (
                    subscription.paymentHistory.map((payment, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4 text-sm font-bold text-slate-700">{new Date(payment.date).toLocaleDateString()}</td>
                        <td className="px-8 py-4 text-sm font-black text-slate-900">₹{payment.amount}</td>
                        <td className="px-8 py-4">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-lg border border-emerald-100">
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button className="text-xs font-bold text-indigo-600 hover:underline">Download</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-8 py-12 text-center text-slate-400 font-medium">
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Billing Contact Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Support & Billing</h4>
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="mt-1">
                  <AlertCircle size={20} className="text-orange-500" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-900">Have questions?</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    If you have issues with your subscription or billing, contact our support team.
                  </p>
                  <button className="text-xs font-bold text-orange-600 mt-3 hover:underline">Contact Support</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingSubscriptionTab;
