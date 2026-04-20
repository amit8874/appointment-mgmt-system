import React from 'react';
import Skeleton from './Skeleton';
import { StatCardSkeleton, TableSkeleton, ChartSkeleton } from './DashboardSkeletons';

export const SuperAdminDashboardSkeleton = () => (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton width="250px" height="36px" />
          <Skeleton width="400px" height="16px" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton width="180px" height="40px" className="rounded-2xl" />
          <Skeleton width="260px" height="40px" className="rounded-2xl" />
        </div>
      </div>

      {/* Quick Action Buttons Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} width="100%" height="72px" className="rounded-2xl" />
        ))}
      </div>
          
      {/* Main Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <ChartSkeleton />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <Skeleton circle width="200px" height="200px" />
            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                {[1,2,3,4].map(i => <Skeleton key={i} width="100%" height="12px" />)}
            </div>
        </div>
      </div>

      {/* Table Section Skeleton */}
      <div className="space-y-6">
        <Skeleton width="300px" height="24px" className="mb-4" />
        <TableSkeleton rows={5} cols={5} />
      </div>
    </div>
);
