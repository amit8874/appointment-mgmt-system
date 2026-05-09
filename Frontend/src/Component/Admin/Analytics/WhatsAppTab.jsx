import React from 'react';
import { MessageSquare, CreditCard, Send, AlertCircle } from 'lucide-react';

const WhatsAppTab = ({ data }) => {
  const stats = data || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">WhatsApp Analytics</h3>
            <p className="text-gray-400 text-sm">Communication and notification performance tracking</p>
          </div>
        </div>

        {stats.length === 0 ? (
          <div className="lg:col-span-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-8 rounded-xl flex items-center justify-center gap-4 text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-6 h-6" />
            <p className="text-base font-semibold italic text-center">WhatsApp analytics is not available yet for this clinic.</p>
          </div>
        ) : (
          stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat._id} Messages</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.total}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WhatsAppTab;
