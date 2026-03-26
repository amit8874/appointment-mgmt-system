import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, Users, Stethoscope, HandHeart, BarChart, CalendarCheck, Wallet, PlusCircle, Search, FileText, Package, MessageSquare, Activity, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DashboardPanel = ({
  stats,
  timeRange,
  setTimeRange,
  selectedDoctorFilter,
  setSelectedDoctorFilter,
  doctors,
  openModal,
  openPatientForm,
  openDoctorForm,
  openReceptionistForm
}) => {
  // Chart Data
  const appointmentTrendsData = [
    { day: 'Mon', appointments: 15, patients: 12 },
    { day: 'Tue', appointments: 22, patients: 18 },
    { day: 'Wed', appointments: 18, patients: 15 },
    { day: 'Thu', appointments: 25, patients: 20 },
    { day: 'Fri', appointments: 20, patients: 17 },
    { day: 'Sat', appointments: 12, patients: 10 },
    { day: 'Sun', appointments: 8, patients: 6 },
  ];

  const revenueByDoctorData = [
    { name: 'Dr. Smith', value: 15000, percentage: 45, color: '#3B82F6' },
    { name: 'Dr. Lee', value: 12500, percentage: 38, color: '#10B981' },
    { name: 'Dr. Chen', value: 5800, percentage: 17, color: '#F59E0B' },
  ];

  const monthlyIncomeExpenseData = [
    { month: 'Jan', income: 45000, expenses: 32000 },
    { month: 'Feb', income: 52000, expenses: 35000 },
    { month: 'Mar', income: 48000, expenses: 33000 },
    { month: 'Apr', income: 61000, expenses: 38000 },
    { month: 'May', income: 55000, expenses: 36000 },
    { month: 'Jun', income: 67000, expenses: 41000 },
  ];

  return (
    <motion.div
      className="space-y-6 p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.h2
        className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight flex items-center"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Activity className="w-5 h-5 mr-2 text-indigo-600" />
        Clinic Status Summary
      </motion.h2>

      {/* Enhanced Stats Cards with animations */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            className={`flex items-center p-4 bg-white dark:bg-gray-800 rounded-none border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-200 ${stat.link ? 'cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-900 group' : ''}`}
            onClick={() => stat.link && setActiveTab && setActiveTab(stat.link)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * index }}
            whileHover={{ y: -2 }}
          >
            <div className={`p-2.5 rounded-none ${stat.bg} flex-shrink-0 group-hover:scale-110 transition-transform`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">{stat.name}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-50 mt-0.5">
                <span className="text-sm font-medium mr-0.5">{stat.prefix || ''}</span>
                {stat.count.toLocaleString()}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Enhanced Filter Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="lg:col-span-2 p-5 bg-white dark:bg-gray-800 rounded-none border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
            <Search className="w-4 h-4 mr-2 text-indigo-600" />
            Filters & Analytics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-xs font-semibold transition-all outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Doctor Filter</label>
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-xs font-semibold transition-all outline-none"
              >
                <option value="all">All Doctors</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.name.toLowerCase().replace('dr. ', '')}>{doctor.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-gray-800 rounded-none border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
            <PlusCircle className="w-4 h-4 mr-2 text-emerald-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
            {[
              { label: 'Schedule', icon: CalendarCheck, color: 'bg-indigo-600 hover:bg-indigo-700', action: () => openModal('appointment') },
              { label: 'Patient', icon: PlusCircle, color: 'bg-emerald-600 hover:bg-emerald-700', action: openPatientForm },
              { label: 'Doctor', icon: Stethoscope, color: 'bg-violet-600 hover:bg-violet-700', action: openDoctorForm },
              { label: 'Recep.', icon: HandHeart, color: 'bg-sky-600 hover:bg-sky-700', action: openReceptionistForm },
            ].map((btn) => (
              <motion.button
                key={btn.label}
                className={`flex items-center justify-center px-3 py-2 ${btn.color} text-white rounded-none shadow-sm transition-all duration-200 font-bold text-[11px] uppercase tracking-wider`}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={btn.action}
              >
                <btn.icon className="w-3.5 h-3.5 mr-1.5" />
                {btn.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Interactive Charts */}
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        {/* Line Chart: Appointment Trends */}
        <div className="xl:col-span-2 p-5 bg-white dark:bg-gray-800 rounded-none border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" />
              Appointment Trends
            </h3>
            <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-1.5"></div>
                <span className="text-gray-400">Appts</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></div>
                <span className="text-gray-400">Patients</span>
              </div>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={appointmentTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #f1f5f9', borderRadius: '0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="appointments" stroke="#4f46e5" strokeWidth={2.5} dot={{ fill: '#4f46e5', r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="patients" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Revenue Share by Doctor */}
        <div className="p-5 bg-white dark:bg-gray-800 rounded-none border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
            <IndianRupee className="w-4 h-4 mr-2 text-emerald-600" />
            Revenue Share
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByDoctorData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                  {revenueByDoctorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-1.5">
            {revenueByDoctorData.map((doctor) => (
              <div key={doctor.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: doctor.color }}></div>
                  <span className="text-gray-500 font-medium">{doctor.name}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100">{doctor.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      {/* Bar Chart: Monthly Income vs Expenses */}
      <motion.div
        className="grid grid-cols-1 gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        <div className="p-5 bg-white dark:bg-gray-800 rounded-none border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <BarChart className="w-4 h-4 mr-2 text-violet-600" />
              Monthly Income vs Expenses
            </h3>
            <div className="flex items-center space-x-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></div>
                <span className="text-gray-400">Income</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-rose-500 rounded-full mr-1.5"></div>
                <span className="text-gray-400">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={monthlyIncomeExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
                <Bar dataKey="income" fill="#10b981" radius={0} barSize={30} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={0} barSize={30} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Performance Summary Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.0 }}
      >
        {[
          { label: 'Monthly Growth', value: '+12.5%', sub: 'vs last month', icon: TrendingUp, color: 'from-indigo-600 to-indigo-700', iconColor: 'text-indigo-200' },
          { label: 'Patient Satisfaction', value: '4.8/5', sub: 'Excellent rating', icon: Users, color: 'from-emerald-600 to-emerald-700', iconColor: 'text-emerald-200' },
          { label: 'Active Doctors', value: '12', sub: 'All departments', icon: Stethoscope, color: 'from-violet-600 to-violet-700', iconColor: 'text-violet-200' },
        ].map((item) => (
          <div key={item.label} className={`p-5 bg-gradient-to-br ${item.color} text-white rounded-none shadow-md border border-white/10`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
                <p className="text-2xl font-bold mt-1">{item.value}</p>
                <p className="text-white/60 text-[10px] mt-1 font-medium">{item.sub}</p>
              </div>
              <item.icon className={`w-8 h-8 ${item.iconColor} opacity-50`} />
            </div>
          </div>
        ))}
      </motion.div>

    </motion.div>
  );
};

export default DashboardPanel;
