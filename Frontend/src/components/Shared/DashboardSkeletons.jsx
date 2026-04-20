import React from 'react';
import Skeleton from './Skeleton';

export const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <Skeleton circle width="40px" height="40px" />
      <Skeleton width="60px" height="12px" className="rounded-full" />
    </div>
    <div className="space-y-2">
      <Skeleton width="40%" height="14px" />
      <Skeleton width="60%" height="28px" className="rounded-lg" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="w-full bg-white rounded-xl border border-slate-100 overflow-hidden animate-pulse">
    <div className="bg-slate-50 px-6 py-4 flex gap-4">
      {Array(cols).fill(0).map((_, i) => (
        <Skeleton key={i} width={`${100/cols}%`} height="16px" />
      ))}
    </div>
    <div className="divide-y divide-slate-50">
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="px-6 py-4 flex gap-4">
          {Array(cols).fill(0).map((__, j) => (
            <Skeleton key={j} width={`${100/cols}%`} height="14px" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse h-[350px] flex flex-col">
    <div className="flex justify-between mb-8">
      <div className="space-y-2 w-1/3">
        <Skeleton width="100%" height="18px" />
        <Skeleton width="60%" height="12px" />
      </div>
      <Skeleton width="100px" height="32px" className="rounded-lg" />
    </div>
    <div className="flex-1 flex items-end gap-2 px-2">
      {[40, 70, 45, 90, 65, 80, 50, 60, 85, 40].map((h, i) => (
        <Skeleton 
          key={i} 
          width="100%" 
          height={`${h}%`} 
          className="rounded-t-sm"
        />
      ))}
    </div>
    <div className="mt-4 flex justify-between px-2">
        {Array(5).fill(0).map((_, i) => <Skeleton key={i} width="30px" height="10px" />)}
    </div>
  </div>
);
