import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Search, PlusCircle, IndianRupee, BarChart3, Users, Stethoscope, HandHeart, CalendarCheck, Wallet, Smartphone, CreditCard
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, Legend
} from 'recharts';
import api from '../../services/api';
import { billingApi } from '../../services/api';
import NewAppointmentForm from './NewAppointmentForm';
import HorizontalAppointmentForm from './HorizontalAppointmentForm';

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
  recentAppointments = [],
  hideForm = false,
}) => {
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [appointmentInitialData, setAppointmentInitialData] = useState(null);
  const [activePaymentFilter, setActivePaymentFilter] = useState("All");
  const [allBills, setAllBills] = useState([]);
  const [isBillsLoading, setIsBillsLoading] = useState(false);

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

  // Fetch all bills for client-side filtering
  useEffect(() => {
    const fetchBills = async () => {
      setIsBillsLoading(true);
      try {
        const bills = await billingApi.getAll();
        setAllBills(bills || []);
      } catch (error) {
        console.error("Error fetching bills for analysis:", error);
      } finally {
        setIsBillsLoading(false);
      }
    };
    fetchBills();
  }, []);

  const filteredRevenueByDoctor = React.useMemo(() => {
    if (activePaymentFilter === "All") return revenueByDoctorData;
    
    // Recalculate revenue by doctor based on payment method
    const doctorRevenueMap = {};
    allBills.filter(bill => 
      bill.status === "Paid" && 
      bill.paymentMethod?.toLowerCase() === activePaymentFilter.toLowerCase()
    ).forEach(bill => {
      if (!doctorRevenueMap[bill.doctorId]) {
        doctorRevenueMap[bill.doctorId] = { name: bill.doctorName, value: 0 };
      }
      doctorRevenueMap[bill.doctorId].value += bill.amount;
    });

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#EAB308', '#F97316', '#14B8A6', '#84CC16'];
    return Object.values(doctorRevenueMap)
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({
        ...item,
        color: colors[index % colors.length]
      }));
  }, [allBills, activePaymentFilter, revenueByDoctorData]);

  const filteredStats = React.useMemo(() => {
    if (activePaymentFilter === "All") return stats;

    return stats.map(stat => {
      if (stat.name === "Total Revenue") {
        const filteredTotal = allBills
          .filter(bill => bill.status === "Paid" && bill.paymentMethod?.toLowerCase() === activePaymentFilter.toLowerCase())
          .reduce((sum, bill) => sum + bill.amount, 0);
        return { ...stat, count: filteredTotal };
      }
      if (stat.name === "Pending Payments") {
        return { ...stat, count: 0 };
      }
      return stat;
    });
  }, [allBills, activePaymentFilter, stats]);

  const filteredRecentAppointments = React.useMemo(() => {
    if (activePaymentFilter === "All") return recentAppointments;
    
    const paidApptIds = new Set(
      allBills
        .filter(bill => bill.status === "Paid" && bill.paymentMethod?.toLowerCase() === activePaymentFilter.toLowerCase())
        .map(bill => bill.appointmentId)
    );

    return recentAppointments.filter(appt => paidApptIds.has(appt._id) || paidApptIds.has(appt.id));
  }, [allBills, activePaymentFilter, recentAppointments]);

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 p-4 sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Dashboard Title & Payment Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.h2
          className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight transition-colors flex items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <BarChart3 className="w-5 h-5 mr-3 text-blue-600" />
          Clinic Analysis
        </motion.h2>

        {/* Payment Mode Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
          {[
            { id: 'All', icon: BarChart3 },
            { id: 'Cash', icon: Wallet },
            { id: 'UPI', icon: Smartphone },
            { id: 'Card', icon: CreditCard }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePaymentFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                activePaymentFilter === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md transform scale-105'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.id}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {filteredStats.length > 0 ? filteredStats.map((stat, index) => (
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

      {/* Horizontal Appointment Form - Hidden when hideForm is true */}
      {!hideForm && (
        <HorizontalAppointmentForm doctors={doctors} onSuccess={() => window.location.reload()} openDoctorForm={openDoctorForm} />
      )}

      {/* New Appointment Modal */}
      {showAppointmentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAppointmentForm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Appointment Trends */}
        <motion.div 
          className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Appointment Trends
          </h3>
          <div className="h-64">
            {appointmentTrendsData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={appointmentTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" vertical={false} />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="appointments" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Appointments" />
                  <Line type="monotone" dataKey="patients" stroke="#10B981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Unique Patients" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-20">No trends data available</p>
            )}
          </div>
        </motion.div>

        {/* Revenue by Doctor */}
        <motion.div 
          className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-600" />
            Revenue by Doctor
          </h3>
          <div className="h-64 flex flex-col sm:flex-row items-center">
            {filteredRevenueByDoctor?.length > 0 ? (
              <>
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredRevenueByDoctor}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {filteredRevenueByDoctor.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 mt-4 sm:mt-0 sm:pl-4 overflow-y-auto max-h-full custom-scrollbar">
                  <div className="space-y-2">
                    {filteredRevenueByDoctor.slice(0, 5).map((doctor, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: doctor.color }}></div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[100px]">{doctor.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">₹{doctor.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-400 py-20 w-full">No revenue data available</p>
            )}
          </div>
        </motion.div>

        {/* Monthly Income vs Expenses */}
        <motion.div 
          className="lg:col-span-2 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Monthly Income vs Expenses
            </h3>
          </div>
          <div className="h-64">
            {monthlyIncomeExpenseData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={monthlyIncomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" vertical={false} />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toLocaleString()}`, '']} 
                    contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                  />
                  <Legend iconType="rect" />
                  <Bar dataKey="income" fill="#3182ce" radius={[4,4,0,0]} name="Income" />
                  <Bar dataKey="expenses" fill="#e53e3e" radius={[4,4,0,0]} name="Expenses" />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-20">No monthly income/expenses data available</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Performance Summary and Recent Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          className="lg:col-span-1 space-y-6"
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Growth Rate</p>
                <p className="text-3xl font-bold">+12.5%</p>
                <p className="text-blue-100 text-xs mt-1">vs last month</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-200" />
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Patient Satisfaction</p>
                <p className="text-3xl font-bold">4.8/5</p>
                <p className="text-emerald-100 text-xs mt-1">Excellent rating</p>
              </div>
              <Users className="w-10 h-10 text-emerald-200" />
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Active Doctors</p>
                <p className="text-3xl font-bold">{doctors?.length || 0}</p>
                <p className="text-purple-100 text-xs mt-1">On Duty</p>
              </div>
              <Stethoscope className="w-10 h-10 text-purple-200" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="lg:col-span-2 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <CalendarCheck className="w-5 h-5 mr-2 text-indigo-600" />
              Recent Appointments
            </h3>
            <button 
              onClick={() => setActiveTab?.('Appointment Mgmt')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-700">
                  <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Patient</th>
                  <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Doctor</th>
                  <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Time</th>
                  <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredRecentAppointments?.length > 0 ? (
                  filteredRecentAppointments.slice(0, 5).map((appt, idx) => (
                    <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-4 font-bold text-gray-900 dark:text-gray-50 text-sm whitespace-nowrap">{appt.patientName}</td>
                      <td className="py-4 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">{appt.doctorName}</td>
                      <td className="py-4 text-center">
                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black uppercase">
                          {appt.time}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                          appt.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 
                          appt.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {appt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-gray-400 italic text-sm">No recent activity detected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AdminDashboardPanel;
