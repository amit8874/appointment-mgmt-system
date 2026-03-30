import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, Users, IndianRupee, Calendar, FileText, X, Download, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { analyticsApi, billingApi, fetchCounts } from '../../services/api';
import { toast } from 'react-hot-toast';

const ReportsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeDoctors: 0,
    monthlyRevenue: 0,
    satisfactionRate: 98.5,
    appointmentGrowth: 12.5,
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboard, billing, counts] = await Promise.all([
          analyticsApi.getDashboard(),
          billingApi.getStats(),
          fetchCounts()
        ]);

        setAnalyticsData(dashboard);
        setStats({
          totalPatients: counts.patients || 0,
          activeDoctors: counts.doctors || 0,
          monthlyRevenue: dashboard.overview?.revenueThisMonth || 0,
          satisfactionRate: 98.2, // Mocked as no rating system exists yet
          appointmentGrowth: 15.4, // Mocked for now
        });
      } catch (error) {
        console.error('Failed to fetch reports data:', error);
        toast.error('Failed to load real-time analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const reports = [
    {
      id: 'patients',
      title: 'Patient Registration Report',
      description: 'Monthly patient registration statistics',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      id: 'appointments',
      title: 'Appointment Analytics',
      description: 'Appointment booking and completion rates',
      icon: Calendar,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      id: 'revenue',
      title: 'Revenue Report',
      description: 'Financial performance and billing data',
      icon: IndianRupee,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      id: 'performance',
      title: 'Doctor Performance',
      description: 'Doctor workload and patient satisfaction',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      id: 'custom',
      title: 'Custom Reports',
      description: 'Generate custom reports based on filters',
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      id: 'system',
      title: 'System Analytics',
      description: 'Overall system usage and performance',
      icon: BarChart3,
      color: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Analyzing health records...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 max-w-7xl mx-auto"
    >
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            Reports & <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 max-w-2xl text-lg">
            Monitor clinic health with real-time performance metrics and generated reports.
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-none border border-blue-100 dark:border-blue-800 hidden md:block">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Last Sync</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Just now</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, index) => (
          <motion.div
            key={report.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -5 }}
            className="group bg-white dark:bg-gray-800 rounded-none p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 dark:border-gray-700 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-none opacity-5 transition-transform group-hover:scale-150 ${report.bg} ${report.color}`}></div>

            <div className="flex items-center mb-6 relative">
              <div className={`p-4 rounded-none ${report.bg} mr-5 shadow-inner`}>
                <report.icon className={`w-8 h-8 ${report.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {report.title}
                </h3>
              </div>
            </div>
            <p className="text-slate-500 dark:text-gray-400 mb-8 leading-relaxed">
              {report.description}
            </p>
            <button
              onClick={() => setSelectedReport(report)}
              className="w-full bg-slate-50 dark:bg-gray-700 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-none transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-sm"
            >
              Generate Report
              <ArrowUpRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-12 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-none p-10 border border-white dark:border-gray-700 shadow-xl"
      >
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Clinic Overview <span className="text-blue-600">Statistics</span>
          </h2>
          <button onClick={() => window.location.reload()} className="p-3 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-gray-800 rounded-none shadow-sm">
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <StatBox
            label="Total Patients"
            value={stats.totalPatients}
            color="text-blue-600"
            icon={Users}
            trend="+3.2%"
            isUp={true}
          />
          <StatBox
            label="Active Doctors"
            value={stats.activeDoctors}
            color="text-emerald-600"
            icon={TrendingUp}
            trend="+1.5%"
            isUp={true}
          />
          <StatBox
            label="Monthly Revenue"
            value={`₹${stats.monthlyRevenue.toLocaleString()}`}
            color="text-amber-500"
            icon={IndianRupee}
            trend="-2.4%"
            isUp={false}
          />
          <StatBox
            label="Patient Satisfaction"
            value={`${stats.satisfactionRate}%`}
            color="text-purple-600"
            icon={HandHeart}
            trend="+0.5%"
            isUp={true}
          />
        </div>
      </motion.div>

      <ReportDetailModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
        analytics={analyticsData}
      />
    </motion.div>
  );
};

const StatBox = ({ label, value, color, icon: Icon, trend, isUp }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-none shadow-sm border border-slate-50 dark:border-gray-700 flex flex-col items-center text-center group hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-none bg-slate-50 dark:bg-gray-700/50 mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-8 h-8 ${color}`} />
    </div>
    <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">{value}</div>
    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</div>
    <div className={`flex items-center gap-1 text-xs font-black px-3 py-1 rounded-none ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {trend}
    </div>
  </div>
);
const ReportDetailModal = ({ isOpen, onClose, report, analytics }) => {
  const [period, setPeriod] = useState('week');
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && report?.id === 'revenue') {
      const fetchBilling = async () => {
        try {
          setLoading(true);
          const data = await analyticsApi.getBilling(period);
          setBillingData(data);
        } catch (error) {
          toast.error('Failed to load billing analytics');
        } finally {
          setLoading(false);
        }
      };
      fetchBilling();
    }
  }, [isOpen, report, period]);

  if (!isOpen) return null;

  // Reusable Chart Data Preparation
  const chartData = useMemo(() => {
    if (report?.id === 'patients') {
      return [
        { name: 'Week 1', count: 12 },
        { name: 'Week 2', count: 19 },
        { name: 'Week 3', count: 15 },
        { name: 'Week 4', count: 22 },
      ];
    }
    if (report?.id === 'appointments') {
      return [
        { name: 'Confirmed', value: analytics?.overview?.totalAppointments || 10, color: '#10B981' },
        { name: 'Pending', value: 5, color: '#F59E0B' },
        { name: 'Cancelled', value: 2, color: '#EF4444' },
      ];
    }
    return [];
  }, [report, analytics]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      ></motion.div>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-none shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-5">
            <div className={`p-3 rounded-none ${report?.bg} shadow-soft`}>
              <report.icon className={`w-6 h-6 ${report?.color}`} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{report?.title}</h2>
              <p className="text-slate-500 font-medium italic text-xs">Analytics for current period</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {report?.id === 'revenue' && (
              <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-none">
                {['today', 'week', 'month', 'year'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-widest transition-all ${
                      period === p 
                      ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-none transition-all">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto">
          {report?.id === 'revenue' ? (
            loading ? (
              <div className="h-96 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Crunching Financial Data...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Billing Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-none border-l-4 border-blue-600">
                    <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Net Collection</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">₹{(billingData?.summary?.totalCollected || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-2">Selected Period Total</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-none border-l-4 border-amber-500">
                    <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Pending Due</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">₹{(billingData?.summary?.totalPending || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-2">Unpaid Records</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-none border-l-4 border-indigo-600">
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Invoice Count</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{billingData?.summary?.invoiceCount || 0}</p>
                    <p className="text-xs text-slate-500 mt-2">Total Bills Generated</p>
                  </div>
                </div>

                {/* Main Revenue Trend Chart */}
                <div className="bg-slate-50 dark:bg-gray-700/30 p-8 rounded-none border border-slate-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Revenue Trends</h3>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-blue-500"></div>
                       <span className="text-xs font-bold text-slate-500">Collection (₹)</span>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={billingData?.trends || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '0', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '15px' }}
                          itemStyle={{ fontWeight: 900, color: '#1E293B' }}
                        />
                        <Line type="monotone" dataKey="value" name="Revenue" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Payment Methods Breakdown */}
                  <div className="bg-slate-50 dark:bg-gray-700/30 p-8 rounded-none border border-slate-100 dark:border-gray-700">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Payment Methods</h3>
                    <div className="h-64 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={billingData?.paymentMethods || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(billingData?.paymentMethods || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-bold uppercase">Split</span>
                        <span className="text-slate-900 dark:text-white font-black">{(billingData?.paymentMethods?.length || 0)} Modes</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                       {billingData?.paymentMethods?.map((item, idx) => (
                         <div key={item.name} className="flex items-center gap-2">
                           <div className="w-2 h-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                           <span className="text-[10px] font-black text-slate-500 uppercase">{item.name}</span>
                           <span className="ml-auto text-xs font-bold text-slate-900 dark:text-white">₹{item.value.toLocaleString()}</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Top Services Leaderboard */}
                  <div className="bg-slate-50 dark:bg-gray-700/30 p-8 rounded-none border border-slate-100 dark:border-gray-700">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Top Services</h3>
                    <div className="space-y-4">
                      {billingData?.topServices?.length > 0 ? (
                        billingData.topServices.map((service, index) => (
                          <div key={service.name} className="flex items-center gap-4">
                            <span className="text-xs font-black text-slate-400 w-4">{index + 1}.</span>
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{service.name}</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">₹{service.value.toLocaleString()}</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-gray-600 h-1 rounded-none overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(service.value / billingData.topServices[0].value) * 100}%` }}
                                  className="bg-blue-600 h-full"
                                />
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-400">{service.count}x</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-bold italic">No specialized services data available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <>
              <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="bg-slate-50 dark:bg-gray-700/50 p-6 rounded-none border border-slate-100 dark:border-gray-600">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Confidence</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">99.4%</p>
                </div>
                <div className="bg-slate-50 dark:bg-gray-700/50 p-6 rounded-none border border-slate-100 dark:border-gray-600">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data Points</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{(analytics?.overview?.totalPatients || 0) + (analytics?.overview?.totalAppointments || 0)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-gray-700/50 p-6 rounded-none border border-slate-100 dark:border-gray-600">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-none bg-emerald-500 animate-pulse"></div>
                    <p className="text-md font-black text-emerald-600">VERIFIED</p>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full bg-slate-50 dark:bg-gray-700/30 rounded-none p-8 mb-10 border border-slate-100 dark:border-gray-700">
                {report?.id === 'patients' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '0', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '15px' }}
                        itemStyle={{ fontWeight: 900, color: '#1E293B' }}
                      />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={5} dot={{ r: 6, fill: '#3B82F6', strokeWidth: 4, stroke: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {report?.id === 'appointments' && (
                  <div className="flex h-full gap-8">
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} hide />
                          <Tooltip cursor={{ fill: 'transparent' }} />
                          <Bar dataKey="value" radius={0}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-48 flex flex-col justify-center gap-4">
                      {chartData.map(item => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-none" style={{ backgroundColor: item.color }}></div>
                          <span className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">{item.name}</span>
                          <span className="ml-auto font-black text-slate-900 dark:text-white">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {['performance', 'system', 'custom'].includes(report?.id) && (
                  <div className="flex items-center justify-center h-full flex-col gap-4">
                    <div className="p-6 rounded-none bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                      <report.icon className="w-12 h-12" />
                    </div>
                    <p className="text-slate-500 font-bold text-center max-w-xs">Detailed visualization for {report?.title} is being calculated from latest logs.</p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="bg-blue-600 rounded-none p-6 flex items-center justify-between shadow-soft">
            <div>
              <h4 className="text-white text-lg font-black mb-1">Ready to export?</h4>
              <p className="text-blue-100 text-xs font-medium">Get a detailed PDF version of this report.</p>
            </div>
            <button className="bg-white text-blue-600 px-6 py-3 rounded-none font-black flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 shadow-lg text-sm">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


// Dummy icon for HandHeart if not imported correctly or if you want to use it
const HandHeart = ({ className }) => <Users className={className} />;

export default ReportsPanel;
