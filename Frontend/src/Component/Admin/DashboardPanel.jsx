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
  openReceptionistForm,
  appointmentTrendsData = [],
  revenueByDoctorData = [],
  monthlyIncomeExpenseData = []
}) => {

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


    </motion.div>
  );
};

export default DashboardPanel;
