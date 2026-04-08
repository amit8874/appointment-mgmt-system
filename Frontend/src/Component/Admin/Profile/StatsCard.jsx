import React from 'react';
import { Users, CalendarDays, IndianRupee, TrendingUp } from 'lucide-react';

const StatsCard = ({ patients, appointments, revenue, loading }) => {
  const stats = [
    {
      label: 'Total Patients',
      value: patients,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Appointments',
      sublabel: '(This Month)',
      value: appointments,
      icon: CalendarDays,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Revenue',
      sublabel: '(This Month)',
      value: `₹${revenue.toLocaleString()}`,
      icon: IndianRupee,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Clinic Stats</h3>
        <TrendingUp className="w-4 h-4 text-slate-400" />
      </div>
      
      <div className="space-y-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} mr-4`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                {stat.label} <span className="text-[10px] font-medium opacity-70">{stat.sublabel}</span>
              </p>
              <h4 className={`text-xl font-bold ${loading ? 'animate-pulse bg-slate-100 h-6 w-20 rounded mt-1' : 'text-slate-900'}`}>
                {!loading && stat.value}
              </h4>
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-2">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[10px] text-slate-400 leading-relaxed italic">
            * Data is updated in real-time based on clinic operations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
