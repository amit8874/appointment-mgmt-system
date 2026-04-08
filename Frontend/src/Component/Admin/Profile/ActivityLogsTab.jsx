import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Download, Search, Filter, Calendar, 
  Monitor, Smartphone, Globe, Shield, User,
  FileText, CreditCard, CheckCircle, Clock
} from 'lucide-react';

const ActivityLogsTab = ({ logs = [] }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const actionIcons = {
    'UPDATE_PROFILE': { icon: User, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Updated Profile Details' },
    'PASSWORD_CHANGE': { icon: Shield, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Password Changed' },
    'UPDATE_CLINIC_DETAILS': { icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Updated Clinic Info' },
    'LOGO_UPLOAD': { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Clinic Logo Uploaded' },
    'LOGIN': { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Successful Login' },
    'UPGRADE_PLAN': { icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Subscription Upgraded' },
  };

  const getActionData = (action) => {
    return actionIcons[action] || { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-50', label: action.replace(/_/g, ' ') };
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesFilter = filter === 'all' || 
        (filter === 'security' && ['PASSWORD_CHANGE', 'LOGIN'].includes(log.action)) ||
        (filter === 'profile' && ['UPDATE_PROFILE', 'UPDATE_CLINIC_DETAILS', 'LOGO_UPLOAD'].includes(log.action)) ||
        (filter === 'billing' && ['UPGRADE_PLAN'].includes(log.action));
      
      const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (log.adminName && log.adminName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesFilter && matchesSearch;
    });
  }, [logs, filter, searchQuery]);

  const handleDownloadCSV = () => {
    const headers = ['Action', 'Admin', 'Time', 'IP Address', 'Details'];
    const rows = filteredLogs.map(log => [
      log.action,
      log.adminName,
      new Date(log.time).toLocaleString(),
      log.ip || 'N/A',
      JSON.stringify(log.details || {})
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffInDays} days ago`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Activity History</h3>
            <p className="text-xs font-bold text-slate-500">Track all administrative actions and security events.</p>
          </div>
        </div>
        <button 
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 uppercase tracking-widest hover:bg-slate-100 transition-all"
        >
          <Download size={14} /> Download CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {['all', 'security', 'profile', 'billing'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            <AnimatePresence mode="popLayout">
              {filteredLogs.map((log, index) => {
                const actionData = getActionData(log.action);
                const Icon = actionData.icon;
                
                return (
                  <motion.div
                    key={log.id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`mt-1 w-10 h-10 rounded-xl ${actionData.bg} flex items-center justify-center ${actionData.color}`}>
                      <Icon size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {actionData.label}
                        </h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md">
                          {log.ip || '0.0.0.0'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <Clock size={12} className="text-slate-400" />
                          {formatTime(log.time)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <User size={12} className="text-slate-400" />
                          {log.adminName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <Monitor size={12} className="text-slate-400" />
                          Windows Desktop
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <Activity size={32} />
            </div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">No actions found</h4>
            <p className="text-xs font-bold text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogsTab;
