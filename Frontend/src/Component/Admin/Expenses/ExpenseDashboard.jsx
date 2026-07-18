import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Package, FileText,
  ArrowRight, Shield, Award, Sparkles, RefreshCw, BarChart2, PlusCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { expenseApi } from '../../../services/api';

const ExpenseDashboard = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    equipmentExpenses: 0,
    consumerExpenses: 0,
    labExpenses: 0,
    totalExpenses: 0,
    netProfit: 0
  });

  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch KPI Dashboard Stats
      const dashboardStats = await expenseApi.getDashboardStats();
      setStats(dashboardStats);

      // 2. Fetch recent expenses to display a unified recent feed
      const [eqRes, consRes, labRes] = await Promise.all([
        expenseApi.getEquipment({ page: 1, limit: 3 }).catch(() => ({ expenses: [] })),
        expenseApi.getConsumerProducts({ page: 1, limit: 3 }).catch(() => ({ expenses: [] })),
        expenseApi.getLabExpenses({ page: 1, limit: 3 }).catch(() => ({ expenses: [] }))
      ]);

      const formatted = [
        ...(eqRes.expenses || []).map(e => ({
          id: e._id,
          name: e.equipmentName,
          category: 'Equipment',
          amount: e.totalAmount,
          date: e.purchaseDate ? new Date(e.purchaseDate) : new Date(e.createdAt),
          badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
        })),
        ...(consRes.expenses || []).map(e => ({
          id: e._id,
          name: e.productName,
          category: 'Consumer Products',
          amount: e.totalAmount,
          date: e.purchaseDate ? new Date(e.purchaseDate) : new Date(e.createdAt),
          badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300'
        })),
        ...(labRes.expenses || []).map(e => ({
          id: e._id,
          name: `${e.labName} (${e.treatmentType || e.workType || 'Lab Case'})`,
          category: 'Lab Expenses',
          amount: e.totalAmount,
          date: e.sentDate ? new Date(e.sentDate) : new Date(e.createdAt),
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
        }))
      ];

      // Sort by date descending and take top 5
      formatted.sort((a, b) => b.date - a.date);
      setRecentExpenses(formatted.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Failed to load expense dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  // Recharts data processing
  const pieData = [
    { name: 'Equipment', value: stats.equipmentExpenses, color: '#6366f1' },
    { name: 'Consumer Products', value: stats.consumerExpenses, color: '#06b6d4' },
    { name: 'Lab Expenses', value: stats.labExpenses, color: '#a855f7' }
  ].filter(item => item.value > 0);

  const barData = [
    {
      name: 'Financial Overview',
      Revenue: stats.totalRevenue,
      Expenses: stats.totalExpenses,
      Profit: stats.netProfit
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-gray-900/50 min-h-screen">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            📊 Expense Dashboard
          </h1>
          <p className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest mt-1">
            Real-time financial reconciliation, profitability tracking & resource analytics
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-950/20 dark:via-gray-800 dark:to-gray-800 border border-emerald-100 dark:border-emerald-900/50 p-6 rounded-3xl shadow-sm flex items-center justify-between"
        >
          <div className="space-y-2">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">Total Revenue</span>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">₹{stats.totalRevenue.toLocaleString('en-IN')}</h3>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Gross patient invoice payments</span>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <DollarSign size={28} />
          </div>
        </motion.div>

        {/* Total Expenses */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-950/20 dark:via-gray-800 dark:to-gray-800 border border-amber-100 dark:border-amber-900/50 p-6 rounded-3xl shadow-sm flex items-center justify-between"
        >
          <div className="space-y-2">
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Total Expenses</span>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">₹{stats.totalExpenses.toLocaleString('en-IN')}</h3>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Combined lab, tools, & supplies</span>
          </div>
          <div className="p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <TrendingDown size={28} />
          </div>
        </motion.div>

        {/* Net Profit */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`bg-gradient-to-br via-white to-white dark:via-gray-800 dark:to-gray-800 border p-6 rounded-3xl shadow-sm flex items-center justify-between ${
            stats.netProfit >= 0
              ? 'from-indigo-500/10 border-indigo-100 dark:from-indigo-950/20 dark:border-indigo-900/50'
              : 'from-rose-500/10 border-rose-100 dark:from-rose-950/20 dark:border-rose-900/50'
          }`}
        >
          <div className="space-y-2">
            <span className={`text-[10px] font-black uppercase tracking-widest block ${stats.netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>Net Profit</span>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">₹{stats.netProfit.toLocaleString('en-IN')}</h3>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Revenue minus all expenses</span>
          </div>
          <div className={`p-4 rounded-2xl ${stats.netProfit >= 0 ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
            <TrendingUp size={28} />
          </div>
        </motion.div>
      </div>

      {/* Sub-Expenses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dental Equipment Card */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => setActiveTab('Dental Equipment')}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Equipment Expenses</p>
              <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">₹{stats.equipmentExpenses.toLocaleString('en-IN')}</h4>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400" />
        </div>

        {/* Dental Consumer Products Card */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-cyan-500/50 transition-all cursor-pointer" onClick={() => setActiveTab('Dental Consumable Products')}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Consumable Products</p>
              <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">₹{stats.consumerExpenses.toLocaleString('en-IN')}</h4>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400" />
        </div>

        {/* Dental Lab Expenses Card */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-purple-500/50 transition-all cursor-pointer" onClick={() => setActiveTab('Dental Lab Expenses')}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Lab case Expenses</p>
              <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">₹{stats.labExpenses.toLocaleString('en-IN')}</h4>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400" />
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Overview Chart */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart2 size={16} className="text-indigo-600" />
              Financial Ratio Chart
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue vs Expenses</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `₹${val / 1000}k`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                <Bar dataKey="Revenue" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
                <Bar dataKey="Expenses" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={40} />
                <Bar dataKey="Profit" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown Chart */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              Expense Channel Breakdown
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Percentage allocation</span>
          </div>

          <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-6">
            {pieData.length > 0 ? (
              <>
                <div className="h-full w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1">
                  {pieData.map((entry, idx) => {
                    const pct = ((entry.value / stats.totalExpenses) * 100).toFixed(1);
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="font-bold text-slate-600 dark:text-slate-300">{entry.name}</span>
                        </div>
                        <span className="font-extrabold text-slate-800 dark:text-white">{pct}% (₹{entry.value.toLocaleString()})</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 text-xs py-10">
                No expense data recorded to build breakdown chart.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified Feed of Recent Expenses */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            🔔 Recent Expenses Feed
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 5 records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-gray-700 text-slate-400 uppercase tracking-widest font-black text-[9px]">
                <th className="pb-3">Name / Supplier</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Transaction Date</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-slate-600 dark:text-slate-300">
              {recentExpenses.length > 0 ? (
                recentExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="py-3.5 font-bold text-slate-800 dark:text-white">{exp.name}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${exp.badgeColor}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 font-semibold text-slate-500">{exp.date.toLocaleDateString('en-GB')}</td>
                    <td className="py-3.5 text-right font-black text-slate-800 dark:text-white">₹{exp.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400">
                    No expense transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDashboard;
