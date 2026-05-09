import React from 'react';
import { Lightbulb, TrendingUp, AlertTriangle, Star } from 'lucide-react';

const SmartInsights = ({ insights }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'revenue': return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'appointment': return <Star className="w-4 h-4 text-blue-600" />;
      case 'pharmacy': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'billing': return <TrendingUp className="w-4 h-4 text-rose-600" />;
      default: return <Lightbulb className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'revenue': return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
      case 'appointment': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800';
      case 'pharmacy': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800';
      case 'billing': return 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800';
      default: return 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Clinical Insights</h3>
      </div>
      
      <div className="space-y-4">
        {(!insights || insights.length === 0) ? (
          <p className="text-sm text-gray-500 text-center py-8 italic">No specific insights available for the selected period.</p>
        ) : (
          insights.map((insight, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${getBgColor(insight.type)} transition-all`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getIcon(insight.type)}
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {insight.type || 'General'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                {insight.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SmartInsights;
