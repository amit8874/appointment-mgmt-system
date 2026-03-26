import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Search, PlusCircle, IndianRupee, BarChart3, Users, Stethoscope, HandHeart, CalendarCheck 
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, Legend
} from 'recharts';
import NewAppointmentForm from './NewAppointmentForm';

const AdminDashboardPanel = ({
  stats = [],
  doctors = [],
  timeRange = "daily",
  setTimeRange = () => {},
  setActiveTab = () => {},
  selectedDoctorFilter = "all",
  setSelectedDoctorFilter = () => {},
  openModal = () => {},
  openPatientForm = () => {},
  openDoctorForm = () => {},
  openReceptionistForm = () => {},
  appointmentTrendsData = [],
  revenueByDoctorData = [],
  monthlyIncomeExpenseData = [],
}) => {
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [appointmentInitialData, setAppointmentInitialData] = useState(null);

  // Check for booking parameters in URL
  useEffect(() => {
    const bookAppointment = searchParams.get('bookAppointment');
    const doctorId = searchParams.get('doctorId');
    const doctorName = searchParams.get('doctorName');
    const specialization = searchParams.get('specialization');
    const department = searchParams.get('department');
    const fee = searchParams.get('fee');

    if (bookAppointment === 'true' && doctorId) {
      setAppointmentInitialData({
        doctor: doctorId,
        doctorName: doctorName,
        specialization: specialization,
        department: department,
        fee: fee
      });
      setShowAppointmentForm(true);
      // Clear the query parameters after detecting
      navigate('/admin-dashboard', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 p-4 sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Dashboard Title */}
      <motion.h2
        className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight transition-colors flex items-center"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <BarChart3 className="w-5 h-5 mr-3 text-blue-600" />
        Clinic Status Summary
      </motion.h2>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {stats.length > 0 ? stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            className={`flex items-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl dark:hover:shadow-gray-700/50 border border-gray-100 dark:border-gray-700 ${stat.link ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''} min-h-[100px]`}
            onClick={() => stat.link && setActiveTab?.(stat.link)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className={`p-3 sm:p-4 rounded-xl ${stat.bg || 'bg-gray-200'} shadow-md flex-shrink-0`}
              whileHover={{ rotate: 5 }}
            >
              {stat.icon && <stat.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${stat.color || 'text-gray-500'}`} />}
            </motion.div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase leading-tight">{stat.name}</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-50 mt-1 break-words overflow-hidden">
                <span className="inline-block">{stat.prefix || ''}</span>
                <span className="inline-block">{(stat.count || 0).toLocaleString()}</span>
              </p>
            </div>
          </motion.div>
        )) : (
          <p className="text-gray-400 text-center col-span-full py-10">No stats available</p>
        )}
      </motion.div>

      {/* Quick Action Button */}
      <motion.div
        className="mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <motion.button
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/40 hover:bg-blue-700 transition-all duration-200 font-semibold"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAppointmentForm(true)}
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          New Appointment
        </motion.button>
      </motion.div>

      {/* New Appointment Modal */}
      {showAppointmentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAppointmentForm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <NewAppointmentForm 
              onClose={() => {
                setShowAppointmentForm(false);
                setAppointmentInitialData(null);
              }} 
              onSuccess={() => {
                setShowAppointmentForm(false);
                setAppointmentInitialData(null);
              }}
              initialData={appointmentInitialData}
            />
          </div>
        </div>
      )}

      {/* Charts Section */}
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {/* Line Chart: Appointment Trends */}
        <div className="xl:col-span-2 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 border-b pb-3 border-gray-100 dark:border-gray-700 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Appointment Trends ({timeRange})
            </h3>
          </div>
          <div className="h-64">
            {appointmentTrendsData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={appointmentTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line type="monotone" dataKey="appointments" name="Appointments" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="patients" name="Unique Patients" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }} />
                  <Legend verticalAlign="top" height={36} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-20">No appointment trend data available</p>
            )}
          </div>
        </div>

        {/* Pie Chart: Revenue by Doctor */}
        <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 border-b pb-3 border-gray-100 dark:border-gray-700 flex items-center">
            <IndianRupee className="w-5 h-5 mr-2 text-green-600" />
            Revenue by Doctor
          </h3>
          <div className="h-64">
            {revenueByDoctorData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={revenueByDoctorData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={40} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {revenueByDoctorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                   <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-20">No revenue data available</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Monthly Income vs Expenses */}
      <motion.div className="grid grid-cols-1 gap-4 sm:gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
        <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 border-b pb-3 border-gray-100 dark:border-gray-700 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Monthly Income vs Expenses
            </h3>
          </div>
          <div className="h-64">
            {monthlyIncomeExpenseData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={monthlyIncomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="income" fill="#10B981" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" fill="#EF4444" radius={[4,4,0,0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-20">No monthly income/expenses data available</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Performance Summary */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.0 }}>
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Growth Rate</p>
              <p className="text-2xl font-bold">+12.5%</p>
              <p className="text-blue-100 text-xs mt-1">vs last month</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Patient Satisfaction</p>
              <p className="text-2xl font-bold">4.8/5</p>
              <p className="text-green-100 text-xs mt-1">Excellent rating</p>
            </div>
            <Users className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Active Doctors</p>
              <p className="text-2xl font-bold">{doctors?.length || 0}</p>
              <p className="text-purple-100 text-xs mt-1">On Duty</p>
            </div>
            <Stethoscope className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboardPanel;
