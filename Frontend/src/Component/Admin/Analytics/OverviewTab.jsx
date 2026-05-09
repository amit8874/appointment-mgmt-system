import React from 'react';
import { TrendingUp, IndianRupee, Users, Activity, ShoppingBag, CreditCard, UserPlus, FileText } from 'lucide-react';
import AnalyticsCard from './AnalyticsCard';

const OverviewTab = ({ data }) => {
  const overview = data?.overview || {};

  return (
    <div className="space-y-6">
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard 
          title="Today Revenue" 
          value={overview.todayRevenue} 
          prefix="₹" 
          icon={TrendingUp} 
          color="emerald" 
        />
        <AnalyticsCard 
          title="Monthly Revenue" 
          value={overview.thisMonthRevenue} 
          prefix="₹" 
          icon={TrendingUp} 
          color="blue" 
        />
        <AnalyticsCard 
          title="Total Revenue" 
          value={overview.totalRevenue} 
          prefix="₹" 
          icon={IndianRupee} 
          color="indigo" 
        />
        <AnalyticsCard 
          title="Pending Payments" 
          value={overview.pendingPayment} 
          prefix="₹"
          icon={CreditCard} 
          color="amber" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard 
          title="Total Patients" 
          value={overview.totalPatients} 
          icon={Users} 
          color="indigo" 
        />
        <AnalyticsCard 
          title="New Patients (Month)" 
          value={overview.newPatientsThisMonth} 
          icon={UserPlus} 
          color="emerald" 
        />
        <AnalyticsCard 
          title="Total Appointments" 
          value={overview.totalAppointments} 
          icon={Activity} 
          color="blue" 
        />
        <AnalyticsCard 
          title="Total Doctors" 
          value={overview.totalDoctors} 
          icon={Activity} 
          color="indigo" 
        />
      </div>

      {/* QUICK INSIGHTS CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center text-center space-y-2">
           <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
             <ShoppingBag className="w-6 h-6 text-blue-600" />
           </div>
           <h4 className="text-sm font-semibold text-gray-500">Inventory Status</h4>
           <p className="text-xl font-bold text-gray-900 dark:text-white">{data?.pharmacy?.lowStockCount || 0} Low Stock Items</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center text-center space-y-2">
           <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
             <FileText className="w-6 h-6 text-emerald-600" />
           </div>
           <h4 className="text-sm font-semibold text-gray-500">Billing Efficiency</h4>
           <p className="text-xl font-bold text-gray-900 dark:text-white">₹{(overview.totalRevenue / (overview.totalAppointments || 1)).toFixed(0)} Avg / Appointment</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center text-center space-y-2">
           <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-full">
             <Users className="w-6 h-6 text-amber-600" />
           </div>
           <h4 className="text-sm font-semibold text-gray-500">Patient Growth</h4>
           <p className="text-xl font-bold text-gray-900 dark:text-white">+{overview.newPatientsThisMonth || 0} This Month</p>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
