import React from 'react';
import Skeleton from './Skeleton';

export const OrderCardSkeleton = () => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-4">
        <Skeleton width="48px" height="48px" className="rounded-2xl" />
        <div className="space-y-2">
            <Skeleton width="120px" height="14px" />
            <Skeleton width="180px" height="10px" />
        </div>
      </div>
      <Skeleton width="80px" height="20px" className="rounded-full" />
    </div>

    <div className="space-y-3">
        <Skeleton width="100%" height="40px" className="rounded-2xl" />
    </div>

    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="space-y-1">
            <Skeleton width="60px" height="8px" />
            <Skeleton width="40px" height="18px" />
        </div>
        <Skeleton width="100px" height="32px" className="rounded-xl" />
    </div>
  </div>
);

export const OrderHistorySkeleton = () => (
    <div className="space-y-6">
        {[1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
    </div>
);
