import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  Users, Activity, Clock, Layout, ArrowUp, ArrowDown, 
  Search, RefreshCw, Filter, ExternalLink, Smartphone, Monitor
} from 'lucide-react';
import { usageAnalyticsApi } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const UsageAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await usageAnalyticsApi.getStats();
      setStats(data);
    } catch (err) {
      toast.error("Failed to fetch usage analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const filteredList = stats?.detailedList?.filter(item => 
    item.orgName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-1 md:p-1 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Software Usage Analytics</h1>
          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Monitor organization engagement & product utility</p>
        </div>
        <button 
          onClick={fetchStats}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-100"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users size={18} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Orgs</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats?.topOrganizations?.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
              <Clock size={18} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Time (Hrs)</span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {(stats?.topOrganizations?.reduce((acc, curr) => acc + curr.totalMinutes, 0) / 60).toFixed(1)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity size={18} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peak Hour</span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.hourlyDistribution?.sort((a,b) => b.totalTime - a.totalTime)[0]?._id}:00
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Layout size={18} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Page</span>
          </div>
          <p className="text-2xl font-black text-slate-900 truncate" title={stats?.pageUsage[0]?.path}>
            {stats?.pageUsage[0]?.path?.split('/').pop() || 'Dashboard'}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Active Organizations */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Engagement by Organization</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topOrganizations}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="totalMinutes" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Page Popularity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Page Utility Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.pageUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="totalMinutes"
                  nameKey="path"
                >
                  {stats?.pageUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Trend */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">24-Hour Activity Pulse</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.hourlyDistribution}>
              <defs>
                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 10}} label={{ value: 'Hour of Day', position: 'bottom', fontSize: 10 }} />
              <YAxis hide />
              <Tooltip 
                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="totalTime" stroke="#6366f1" fillOpacity={1} fill="url(#colorTime)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Real-time Usage Audit</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search org or user..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization & Owner</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Last Active</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Favorite Area</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredList?.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-900 text-sm uppercase">{item.orgName || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{item.userName} • {item.userEmail}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">
                      {item.totalMinutes.toFixed(1)} min
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-[10px] font-bold text-slate-600">
                    {format(new Date(item.lastSeen), 'PPp')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[9px] font-black uppercase tracking-widest border border-slate-100">
                      /{item.favPath.split('/').pop() || 'Dashboard'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <div className={`w-2 h-2 rounded-full ${new Date(item.lastSeen) > new Date(Date.now() - 5 * 60 * 1000) ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {new Date(item.lastSeen) > new Date(Date.now() - 5 * 60 * 1000) ? 'Active' : 'Offline'}
                       </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics;
