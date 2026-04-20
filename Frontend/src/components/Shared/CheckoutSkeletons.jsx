import React from 'react';
import Skeleton from './Skeleton';

export const CheckoutSkeleton = () => (
  <div className="min-h-screen bg-[#f0f0f5] font-sans">
    {/* Header Skeleton */}
    <header className="bg-white border-b border-slate-200 px-4 md:px-20 py-4 flex items-center justify-between sticky top-0 z-50">
      <Skeleton width="120px" height="40px" />
      <Skeleton width="100px" height="32px" className="rounded" />
    </header>

    <main className="max-w-6xl mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row gap-12 items-start animate-pulse">
      {/* Left Column Skeleton */}
      <div className="w-full md:w-[480px] shrink-0 space-y-4">
        <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <Skeleton circle width="32px" height="32px" />
            <Skeleton width="150px" height="20px" />
          </div>
          <div className="p-5 bg-slate-50/50 border-b border-slate-100 space-y-2">
            <Skeleton width="200px" height="16px" />
            <Skeleton width="100px" height="12px" />
          </div>
          <div className="p-5 flex gap-4 border-b border-slate-100">
            <Skeleton width="80px" height="80px" className="rounded" />
            <div className="flex-1 space-y-2 pt-2">
                <Skeleton width="60%" height="18px" />
                <Skeleton width="40%" height="14px" />
            </div>
          </div>
          <div className="p-5 flex gap-4">
            <Skeleton width="64px" height="64px" className="rounded" />
            <div className="flex-1 space-y-2 pt-1">
                <Skeleton width="50%" height="16px" />
                <Skeleton width="80%" height="12px" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column Skeleton */}
      <div className="flex-1 w-full space-y-8">
        <Skeleton width="70%" height="40px" />
        <div className="space-y-6 max-w-sm">
            <div className="space-y-2">
                <Skeleton width="40px" height="12px" />
                <Skeleton width="100%" height="48px" className="rounded" />
            </div>
            <Skeleton width="100%" height="16px" />
            <Skeleton width="100%" height="48px" className="rounded" />
        </div>
      </div>
    </main>
  </div>
);
