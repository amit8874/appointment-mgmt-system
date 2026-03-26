import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  Activity, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SuperAdminSidebar from './SuperAdminSidebar.jsx';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: ''
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getAuditLogs({ ...filters, page });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const getActionColor = (action) => {
    if (action.includes('OVERRIDE')) return 'bg-red-50 text-red-600 border-red-100';
    if (action.includes('UPDATE')) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <SuperAdminSidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <History className="text-indigo-600" size={32} />
                Audit Trail
              </h1>
              <p className="text-gray-500 font-medium mt-1">Full transparency of administrative actions</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search action type..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-600/20 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <input 
                type="date"
                className="px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white transition-all outline-none text-sm"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
              <ArrowRight size={16} className="text-gray-300" />
              <input 
                type="date"
                className="px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white transition-all outline-none text-sm"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            <button className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
               <Filter size={18} />
            </button>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Target</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Date / IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence mode="popLayout">
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="5" className="px-6 py-8 h-20 bg-gray-50/30"></td>
                        </tr>
                      ))
                    ) : (
                      logs.map((log) => (
                        <motion.tr 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          key={log._id}
                          className="hover:bg-gray-50/50 transition-all group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                <User size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900 leading-none">{log.adminId?.name}</p>
                                <p className="text-[10px] font-medium text-gray-400 mt-1">{log.adminId?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                                {log.targetType || 'N/A'}
                              </span>
                              <span className="text-sm font-medium text-gray-600 truncate max-w-[120px]">
                                {log.targetId}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="max-w-[250px]">
                              <p className="text-xs font-medium text-gray-500 line-clamp-2">
                                {JSON.stringify(log.details)}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <p className="text-sm font-bold text-gray-900 leading-none">
                              {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-tighter">
                              {new Date(log.createdAt).toLocaleTimeString()} • {log.ipAddress}
                            </p>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && total > 0 && (
              <div className="p-6 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Showing <span className="text-gray-900">{logs.length}</span> of <span className="text-gray-900">{total}</span> events
                </p>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    disabled={logs.length < 20}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuditLogsPage;
