import React, { useState, useEffect } from 'react';
import { dentistApi } from '../../services/api';
import { 
  Stethoscope, 
  Activity, 
  Smile, 
  ShieldAlert, 
  PlusSquare, 
  TrendingUp, 
  Wallet, 
  Clock, 
  UserCheck, 
  CalendarCheck,
  ChevronRight
} from 'lucide-react';

const DentistDashboard = ({ setActiveTab }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const result = await dentistApi.getDashboard();
        setData(result);
      } catch (err) {
        console.error('Error fetching dentist dashboard:', err);
        setError('Failed to load Dentist Dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 rounded-xl m-6 border border-red-200/60">
        <ShieldAlert className="w-10 h-10 mx-auto mb-3" />
        <p className="font-semibold text-base">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalCases: 0,
    rcts: 0,
    extractions: 0,
    ortho: 0,
    planned: 0,
    inProgress: 0,
    completed: 0,
    totalEstimated: 0,
    totalPaid: 0,
    totalDue: 0
  };

  const cards = [
    {
      title: 'Root Canal Treatment (RCT)',
      value: kpis.rcts,
      subtitle: 'Active & Planned',
      icon: Smile,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      bgLight: 'bg-cyan-50 dark:bg-cyan-950/20'
    },
    {
      title: 'Extractions',
      value: kpis.extractions,
      subtitle: 'Surgical & General',
      icon: Stethoscope,
      iconColor: 'text-rose-600 dark:text-rose-400',
      bgLight: 'bg-rose-50 dark:bg-rose-950/20'
    },
    {
      title: 'Ortho Cases',
      value: kpis.ortho,
      subtitle: 'Braces & Aligners',
      icon: TrendingUp,
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgLight: 'bg-amber-50 dark:bg-amber-950/20'
    },
    {
      title: 'Outstanding Due',
      value: `₹${kpis.totalDue}`,
      subtitle: 'Dental Treatment Dues',
      icon: Wallet,
      iconColor: 'text-violet-600 dark:text-violet-400',
      bgLight: 'bg-violet-50 dark:bg-violet-950/20'
    }
  ];

  return (
    <div className="p-4 space-y-6 bg-slate-50/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            Dentist Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time analytics and management system for dental procedures.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('Patients')}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all active:scale-95 text-xs shadow-sm"
        >
          <PlusSquare className="w-4 h-4 mr-1.5" />
          Plan Treatment
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-200/70 dark:border-gray-700 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {card.subtitle}
              </span>
              <div className={`p-2 rounded-lg ${card.bgLight}`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">
                {card.value}
              </p>
              <h3 className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {card.title}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Sub KPI Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl p-4 border border-indigo-100/40 dark:border-indigo-900/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-100/60 dark:bg-cyan-950/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{kpis.planned}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Planned Procedures</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100/60 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{kpis.inProgress}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Procedures In Progress</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{kpis.completed}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Completed Treatments</p>
          </div>
        </div>
      </div>

      {/* Main Sections (Table and Side Cases) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Dental Appointments */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-200/70 dark:border-gray-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Today's Dental Queue
              </h2>
            </div>
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded">
              {data?.todayAppointments?.length || 0} Appointments
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {(!data?.todayAppointments || data.todayAppointments.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                <CalendarCheck className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs font-medium">No dental appointments scheduled for today.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-700">
                    <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient</th>
                    <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time/Slot</th>
                    <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Gender/Age</th>
                    <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {data.todayAppointments.map((appt) => (
                    <tr key={appt._id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/10 transition-colors">
                      <td className="py-3">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{appt.patientId?.name || 'Walk-in Patient'}</p>
                        <p className="text-[10px] text-slate-400">{appt.patientId?.mobile || appt.patientPhone || 'N/A'}</p>
                      </td>
                      <td className="py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {appt.time || 'N/A'}
                      </td>
                      <td className="py-3 text-xs text-slate-500 dark:text-slate-400">
                        {appt.patientId?.gender || 'N/A'} / {appt.patientId?.age || 'N/A'} Yrs
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                          appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' :
                          appt.status === 'Cancelled' ? 'bg-red-50 text-red-600 dark:bg-red-950/20' :
                          'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20'
                        }`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => {
                            if (appt.patientId) {
                              setActiveTab('Patients');
                              // Allow page jump to patient profile
                              setTimeout(() => {
                                const btn = document.querySelector(`[data-patient-id="${appt.patientId._id || appt.patientId}"]`);
                                if (btn) btn.click();
                              }, 100);
                            }
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* High Priority Dental Cases */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-200/70 dark:border-gray-700 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-gray-700">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              High-Priority & Due Cases
            </h2>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-1">
            {(!data?.highPriorityCases || data.highPriorityCases.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                <Smile className="w-10 h-10 mb-2 text-emerald-500 opacity-60" />
                <p className="text-xs font-medium">All cases on-schedule and paid!</p>
              </div>
            ) : (
              data.highPriorityCases.map((item) => (
                <div 
                  key={item._id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-gray-700/20 border border-slate-150 dark:border-gray-700 flex flex-col justify-between gap-1.5 hover:border-slate-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {item.patientId?.name || 'Walk-in Patient'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tooth {item.toothNumber} • {item.procedure}
                      </p>
                    </div>
                    <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                      item.priority === 'High' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                    }`}>
                      {item.priority}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-1.5 border-t border-dashed border-slate-200 dark:border-gray-700 pt-1.5">
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Due Amount</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">₹{item.dueAmount}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (item.patientId) {
                          setActiveTab('Patients');
                        }
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                    >
                      Open Case
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DentistDashboard;
