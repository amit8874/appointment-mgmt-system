import React, { useState, useEffect } from 'react';
import {
  TrendingUp, BarChart3, Calendar, RefreshCw, Info,
  Filter, Landmark, ShieldCheck, PieChart as PieIcon, LineChart as LineIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  Legend, BarChart, Bar, LineChart, Line, CartesianGrid
} from 'recharts';
import { expenseApi } from '../../../services/api';

const ExpenseAnalytics = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('year'); // default: this year
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
  }, [filterType, customStartDate, customEndDate]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const params = {
        filterType,
        startDate: filterType === 'custom' ? customStartDate : undefined,
        endDate: filterType === 'custom' ? customEndDate : undefined
      };
      const res = await expenseApi.getExpenseAnalytics(params);
      setData(res || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load expense analytics charts.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/50 p-3 rounded-xl shadow-xl text-white text-xs font-semibold space-y-1.5">
          <p className="font-black border-b border-slate-700 pb-1 uppercase tracking-wider text-[10px] text-slate-400">{label}</p>
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 justify-between">
              <span style={{ color: item.color }} className="capitalize">{item.name}:</span>
              <span className="font-extrabold">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-gray-900/50 min-h-screen">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            📈 Expense Analytics
          </h1>
          <p className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest mt-1">
            Reconciled visual charts and trends for expenses, revenue margins & profitability
          </p>
        </div>

        <button
          onClick={fetchAnalyticsData}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Filter Timeframe:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none bg-slate-50/50 dark:bg-gray-900/50"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {filterType === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-medium outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-medium outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
              />
            </div>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-12 text-center rounded-3xl">
          <Info size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-black uppercase text-slate-700 dark:text-white tracking-wider">No Analytics Data</h3>
          <p className="text-xs text-slate-400 mt-1">Please select another timeframe or add expense/payment records.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Monthly Expenses (Area Chart) */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                📈 Total Expense Trend
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Sum of all categorised expenses over time</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotalExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="totalExpenses" name="Total Expenses" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTotalExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Revenue vs Expenses (Bar Chart) */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                📊 Revenue vs Expenses Comparison
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Comparing invoice income against total outflows</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="totalExpenses" name="Expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Equipment Expenses (Bar Chart) */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                🛠️ Dental Equipment Expenses
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Purchases of capital assets, machinery & tools</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="equipment" name="Equipment" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Consumer Product Expenses (Bar/Line Chart) */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                📦 Dental Consumer Product Expenses
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Purchases of daily supplies, consumables & materials</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="consumer" name="Consumer Products" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: Lab Expenses (Bar Chart) */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                🧪 Dental Lab case Expenses
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Payments sent to external prosthetics & crown labs</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="lab" name="Lab Expenses" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5.1: More Expenses (Bar Chart) */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                💸 More Clinic Expenses
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">General clinic payments, utilities, rent, and custom expenses</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="other" name="More Expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 6: Monthly Net Profit (Area Chart) */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                💰 Monthly Net Profit Trend
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Profit margin margin (Revenue - Expenses) timeline</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseAnalytics;
