import React from 'react';
import Skeleton from './Skeleton';

export const DoctorCardSkeleton = () => (
  <div className="flex flex-col md:flex-row gap-6 p-6 border-b border-slate-100 last:border-0 animate-pulse">
    <div className="relative shrink-0 flex flex-col items-center">
      <Skeleton circle width="112px" height="112px" className="border-4 border-slate-50 shadow-sm" />
    </div>
    <div className="flex-1 space-y-4">
      <Skeleton width="40%" height="24px" className="rounded-lg" />
      <Skeleton width="25%" height="16px" />
      <Skeleton width="20%" height="14px" />
      <div className="mt-4 space-y-2">
        <Skeleton width="60%" height="14px" />
        <Skeleton width="30%" height="14px" />
      </div>
      <div className="mt-4 flex gap-3">
        <Skeleton width="60px" height="24px" className="rounded" />
        <Skeleton width="120px" height="20px" />
      </div>
    </div>
    <div className="md:w-44 shrink-0 flex flex-col justify-end gap-3">
      <Skeleton width="100%" height="40px" className="rounded-lg" />
      <Skeleton width="100%" height="40px" className="rounded-lg" />
    </div>
  </div>
);

export const SlotSelectorSkeleton = () => (
  <div className="border-t border-slate-100 pt-6 mt-4 space-y-8 animate-pulse">
    <div className="flex items-center gap-4 mb-8">
      <Skeleton circle width="40px" height="40px" />
      <div className="flex-1 flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} width="120px" height="60px" className="shrink-0" />
        ))}
      </div>
      <Skeleton circle width="40px" height="40px" />
    </div>
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex flex-col md:flex-row gap-6">
          <Skeleton width="80px" height="20px" className="shrink-0" />
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map(j => (
              <Skeleton key={j} width="80px" height="36px" className="rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ReviewSkeleton = () => (
    <div className="bg-white p-6 border border-slate-100 shadow-sm space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton circle width="32px" height="32px" />
          <Skeleton width="100px" height="16px" />
        </div>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => <Skeleton key={i} width="14px" height="14px" />)}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height="14px" />
        <Skeleton width="90%" height="14px" />
      </div>
      <div className="mt-4 flex justify-between border-t border-slate-50 pt-3">
        <Skeleton width="80px" height="10px" />
        <Skeleton width="60px" height="10px" />
      </div>
    </div>
);
