import React from 'react';
import { MessageSquare, CreditCard, Send, CheckCircle2 } from 'lucide-react';

const WhatsAppTab = ({ data }) => {
  const credits = data?.credits || {};
  const stats = Array.isArray(data) ? data : (data?.stats || []);

  const totalAvailable = credits.totalAvailable ?? 0;
  const monthlyIncluded = credits.monthlyIncluded ?? 0;
  const usedThisMonth = credits.usedThisMonth ?? 0;

  return (
    <div className="space-y-6">
      {/* WhatsApp Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Available Credits</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAvailable.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Used This Month</p>
            <p className="text-2xl font-bold text-blue-600">{usedThisMonth.toLocaleString()} messages</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Plan Quota</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{monthlyIncluded.toLocaleString()} credits</p>
          </div>
        </div>
      </div>

      {/* Transaction & Activity Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">WhatsApp Activity & Event Breakdown</h3>
        {stats.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-700/20 p-8 rounded-xl text-center text-gray-400 text-sm italic">
            No message transactions recorded yet for this clinic.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{stat._id || 'Messages'}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {stat.total || 0} events <span className="text-xs font-normal text-gray-400">({stat.credits || 0} credits)</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppTab;
