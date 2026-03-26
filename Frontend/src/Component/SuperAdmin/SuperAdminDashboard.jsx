import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Stethoscope, 
  CreditCard, 
  IndianRupee, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Download,
  Settings,
  X,
  ChevronRight,
  Store
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import SuperAdminSidebar from './SuperAdminSidebar.jsx';

const SuperAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideData, setOverrideData] = useState({
    plan: 'basic',
    amount: 0,
    endDate: '',
    trialEndDate: '',
    overrideNote: ''
  });

  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await superAdminApi.getSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Health check failed');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getDashboard();
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            Retry Fetching Data
          </button>
        </div>
      </div>
    );
  }

  const { overview, recentOrganizations, atRiskOrganizations, organizationsByStatus, subscriptionsByPlan, charts } = dashboardData || {};

  const handleOpenOverride = (org) => {
    setSelectedOrg(org);
    setOverrideData({
      plan: org.subscriptionId?.plan || 'basic',
      amount: org.subscriptionId?.amount || 0,
      endDate: org.subscriptionId?.endDate ? new Date(org.subscriptionId.endDate).toISOString().split('T')[0] : '',
      trialEndDate: org.trialEndDate ? new Date(org.trialEndDate).toISOString().split('T')[0] : '',
      overrideNote: org.subscriptionId?.overrideNote || ''
    });
    setIsOverrideModalOpen(true);
  };

  const handleSaveOverride = async () => {
    try {
      await superAdminApi.overrideSubscription(selectedOrg._id, overrideData);
      setIsOverrideModalOpen(false);
      fetchDashboardData(); // Refresh
    } catch (err) {
      alert('Failed to update subscription');
    }
  };

  const chartData = [
    ...(charts?.revenueTrend || []),
    ...(Array.isArray(charts?.forecast) ? charts.forecast.filter(f => f.month === 'Forecast').map(f => ({ _id: 'Forecast (Est)', total: f.revenue, isForecast: true })) : [])
  ];

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Overview</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-500 font-medium">Platform-wide statistics and management</p>
            {health && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-black text-green-700 uppercase tracking-wider leading-none">
                  System {health.status} • {health.apiLatency}ms
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
             <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-3 animate-pulse"></div>
             <span className="text-sm font-bold text-gray-700">Live Status: Active</span>
          </div>
          <div className="hidden lg:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search resource..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <QuickActionButton 
            label="Manage Organizations" 
            icon={Building2} 
            onClick={() => navigate('/superadmin/organizations')} 
            color="bg-blue-50 text-blue-600"
          />
          <QuickActionButton 
            label="Revenue Analytics" 
            icon={TrendingUp} 
            onClick={() => navigate('/superadmin/revenue')} 
            color="bg-emerald-50 text-emerald-600"
          />
          <QuickActionButton 
            label="View Subscriptions" 
            icon={CreditCard} 
            onClick={() => navigate('/superadmin/subscriptions')} 
            color="bg-purple-50 text-purple-600"
          />
          <QuickActionButton 
            label="Pharmacy Management" 
            icon={Store} 
            onClick={() => navigate('/superadmin/pharmacies')} 
            color="bg-orange-50 text-orange-600"
          />
          <QuickActionButton 
            label="System Settings" 
            icon={Settings} 
            onClick={() => navigate('/superadmin/settings')} 
            color="bg-slate-100 text-slate-700"
          />
      </div>
          
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Organizations" 
              value={overview?.totalOrganizations || 0} 
              icon={Building2} 
              trend="+12%" 
              color="indigo" 
            />
            <StatCard 
              title="Monthly Revenue" 
              value={`₹${(overview?.revenueThisMonth || 0).toLocaleString('en-IN')}`} 
              icon={IndianRupee} 
              trend="+8.4%" 
              color="emerald" 
            />
            <StatCard 
              title="Active Subscriptions" 
              value={overview?.activeSubscriptions || 0} 
              icon={CreditCard} 
              trend="+4%" 
              color="blue" 
            />
            <StatCard 
              title="Forecasted Revenue (Next Month)" 
              value={`₹${(overview?.forecastedRevenue || 0).toLocaleString('en-IN')}`} 
              icon={TrendingUp} 
              trend="+15%" 
              color="cyan" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <StatCard 
              title="Trial Signups" 
              value={overview?.trialOrganizations || 0} 
              icon={Clock} 
              trend="-2%" 
              color="amber" 
            />
             <StatCard 
              title="Global Doctors" 
              value={overview?.totalDoctors || 0} 
              icon={Stethoscope} 
              trend="+15%" 
              color="cyan" 
            />
             <StatCard 
              title="Total Patients" 
              value={overview?.totalPatients || 0} 
              icon={UserCheck} 
              trend="+21%" 
              color="rose" 
            />
             <StatCard 
              title="Total Appointments" 
              value={overview?.totalAppointments || 0} 
              icon={Activity} 
              trend="+32%" 
              color="violet" 
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Revenue Trend Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Revenue Analytics</h3>
                  <p className="text-sm text-gray-500">Subscription revenue growth over time</p>
                </div>
                <div className="flex gap-2">
                   <button className="px-4 py-2 bg-gray-50 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors">6M</button>
                   <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-100">1Y</button>
                </div>
              </div>
              
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="_id" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 500}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 500}} 
                      tickFormatter={(value) => `₹${value/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#4F46E5" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      strokeDasharray={(props) => props.payload.isForecast ? "5 5" : "0"}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Distribution Pie */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-2">User Distribution</h3>
              <p className="text-sm text-gray-500 mb-8">Platform users by clinical role</p>
              
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts?.usersByRole || []}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="count"
                      nameKey="_id"
                    >
                      {(charts?.usersByRole || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', shadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                {(charts?.usersByRole || []).map((entry, index) => (
                  <div key={entry._id} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                    <span className="text-xs font-bold text-gray-600 capitalize">{entry._id}s</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8">
            {/* Churn Analytics: At-Risk Organizations */}
            <div className="lg:col-span-12 bg-white border border-red-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-red-50 bg-red-50/30 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-red-900 flex items-center gap-2">
                    <Activity className="text-red-500" size={20} />
                    At-Risk Organizations (Churn Watch)
                  </h3>
                  <p className="text-sm text-red-700/70">Organizations with expiring trials or subscriptions in the next 7 days</p>
                </div>
                <div className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  {atRiskOrganizations?.length || 0} Alerts
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Organization</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Expiry Date</th>
                      <th className="px-6 py-4">Owner Contact</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {atRiskOrganizations?.map((org) => (
                      <tr key={org._id} className="hover:bg-red-50/20 transition-all group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center font-bold text-red-600 text-sm">
                              {org.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{org.name}</p>
                              <p className="text-xs text-gray-500">{org.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            org.status === 'trial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {org.status} Expiring
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                          {new Date(org.trialEndDate || org.subscriptionId?.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <p className="text-sm font-medium text-gray-700">{org.ownerId?.email}</p>
                           <p className="text-xs text-gray-400">{org.ownerId?.phone || 'No phone'}</p>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenOverride(org)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-all border border-red-100"
                          >
                            Override
                          </button>
                          <button 
                            onClick={() => navigate(`/superadmin/organizations?id=${org._id}`)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <ExternalLink size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!atRiskOrganizations || atRiskOrganizations.length === 0) && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium">
                           No at-risk organizations detected. Everything looks stable!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activities Section */}
            <div className="lg:col-span-8 bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Recent Onboarding</h3>
                  <p className="text-sm text-gray-500">Latest organizations to join the platform</p>
                </div>
                <button 
                  onClick={() => navigate('/superadmin/organizations')}
                  className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  View All <ArrowUpRight size={16} />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Organization</th>
                      <th className="px-6 py-4">Registration</th>
                      <th className="px-6 py-4">Account Status</th>
                      <th className="px-6 py-4">Subscription</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrganizations?.slice(0, 6).map((org) => (
                      <tr key={org._id} className="hover:bg-gray-50/50 transition-all group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-sm">
                              {org.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{org.name}</p>
                              <p className="text-xs text-gray-500">{org.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            org.status === 'active' 
                              ? 'bg-green-50 text-green-700 border-green-100' 
                              : org.status === 'trial' 
                              ? 'bg-amber-50 text-amber-700 border-amber-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {org.status}
                          </span>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            {org.subscriptionId?.plan || 'Basic'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => navigate(`/superadmin/organizations?id=${org._id}`)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <ExternalLink size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Growth Chart & Future Widgets */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative h-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50 blur-2xl"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Organization Growth</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts?.orgGrowth || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="_id" hide />
                      <Tooltip 
                         contentStyle={{borderRadius: '16px', border: 'none', shadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                      />
                      <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <span>Past 12 Months</span>
                  <span className="text-indigo-600 font-black">Total: {overview?.totalOrganizations}</span>
                </div>
              </div>
            </div>
          </div>

          <ManualOverrideModal 
            isOpen={isOverrideModalOpen}
            onClose={() => setIsOverrideModalOpen(false)}
            onSave={handleSaveOverride}
            data={overrideData}
            setData={setOverrideData}
            organization={selectedOrg}
          />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, color }) => {
  const colorMap = {
    indigo: 'bg-indigo-500 shadow-indigo-200',
    emerald: 'bg-emerald-500 shadow-emerald-200',
    blue: 'bg-blue-500 shadow-blue-200',
    purple: 'bg-purple-500 shadow-purple-200',
    amber: 'bg-amber-500 shadow-amber-200',
    cyan: 'bg-cyan-500 shadow-cyan-200',
    rose: 'bg-rose-500 shadow-rose-200',
    violet: 'bg-violet-500 shadow-violet-200',
  };

  const isPositive = trend.startsWith('+');

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]} text-white shadow-lg`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
          isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</h4>
        <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
};

const ManualOverrideModal = ({ isOpen, onClose, onSave, data, setData, organization }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Subscription Override</h3>
              <p className="text-sm text-gray-500">{organization?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-gray-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Target Plan</label>
                  <select 
                    value={data.plan}
                    onChange={(e) => setData({...data, plan: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="free">Free Trial</option>
                    <option value="basic">Basic Plan</option>
                    <option value="pro">Pro Plan</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Custom Amount</label>
                  <input 
                    type="number"
                    value={data.amount}
                    onChange={(e) => setData({...data, amount: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Trial Expiry</label>
                  <input 
                    type="date"
                    value={data.trialEndDate}
                    onChange={(e) => setData({...data, trialEndDate: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Subscription Expiry</label>
                  <input 
                    type="date"
                    value={data.endDate}
                    onChange={(e) => setData({...data, endDate: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-xs font-bold text-gray-400 uppercase">Internal Note (Reason)</label>
               <textarea 
                  value={data.overrideNote}
                  onChange={(e) => setData({...data, overrideNote: e.target.value})}
                  placeholder="Why is this override being applied?"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none h-24 resize-none"
               />
            </div>
          </div>

          <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
             <button 
               onClick={onClose}
               className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
             >
               Cancel
             </button>
             <button 
               onClick={onSave}
               className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
             >
               Save Changes
             </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const QuickActionButton = ({ label, icon: Icon, onClick, color }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-100 hover:scale-[1.02] active:scale-[0.98] rounded-2xl transition-all group shadow-sm"
  >
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${color} shadow-sm border border-current opacity-90`}>
        <Icon size={18} />
      </div>
      <span className="text-sm font-bold text-gray-700">{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
  </button>
);

export default SuperAdminDashboard;
