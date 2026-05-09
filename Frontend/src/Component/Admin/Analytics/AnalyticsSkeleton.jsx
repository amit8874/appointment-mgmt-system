import React from 'react';

const AnalyticsSkeleton = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm h-32" />
      
      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 h-24 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm" />
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 h-[400px] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm" />
        <div className="bg-white dark:bg-gray-800 h-[400px] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 h-64 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm" />
    </div>
  );
};

export default AnalyticsSkeleton;
