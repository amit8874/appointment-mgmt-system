import React from 'react';
import { User, Activity, IndianRupee, CheckCircle } from 'lucide-react';

const DoctorPerformanceTable = ({ doctors }) => {
  if (!doctors || doctors.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-500 text-sm">No doctor performance data available for this period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Doctor Performance</h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Real-time Stats</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Doctor Name</th>
              <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Total Appts</th>
              <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Completed</th>
              <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {doctors.map((doc, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{doc.doctorName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400">{doc.totalAppointments}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    {doc.completedAppointments}
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                  ₹{doc.revenue?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorPerformanceTable;
