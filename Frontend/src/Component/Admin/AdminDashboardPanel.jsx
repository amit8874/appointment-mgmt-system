import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Search, PlusCircle, IndianRupee, BarChart3, Users, Stethoscope, HandHeart, CalendarCheck, Wallet, Smartphone, CreditCard, Sparkles, BrainCircuit, Zap, X, Activity
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, Legend
} from 'recharts';
import api from '../../services/api';
import { billingApi, analyticsApi } from '../../services/api';
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

  // AI Analyst State
  const [showMayaModal, setShowMayaModal] = useState(false);
  const [activeAiCategory, setActiveAiCategory] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiAnalysis = async (category) => {
    setActiveAiCategory(category);
    setIsAiLoading(true);
    setAiReport(null);
    
    // Bundle the dashboard data context securely
    const dashboardData = {
       stats: stats.map(s => ({ name: s.name, count: s.count })),
       appointmentTrendsData: appointmentTrendsData.slice(-7), // last 7 days
       revenueByDoctorData,
       monthlyIncomeExpenseData: monthlyIncomeExpenseData.slice(-3), // last 3 months
    };

    try {
       const res = await analyticsApi.getAiReport(category, dashboardData);
       setAiReport(res.report || "Analysis complete but no report returned.");
    } catch (err) {
       console.error("AI Analysis Failed:", err);
       setAiReport("⚠️ Maya is temporarily offline or encountered an error processing your clinic data.");
    } finally {
       setIsAiLoading(false);
    }
  };

  const renderMarkdownLine = (line, i) => {
    if (!line.trim()) return <br key={i} />;
    
    let isHeader = false;
    let headerLevel = 0;
    if (line.startsWith('### ')) { isHeader = true; headerLevel = 3; }
    else if (line.startsWith('## ')) { isHeader = true; headerLevel = 2; }
    else if (line.startsWith('# ')) { isHeader = true; headerLevel = 1; }
    
    if (isHeader) {
       const text = line.replace(/^#+\s/, '');
       if (headerLevel === 1) return <h1 key={i} className="text-2xl font-black text-slate-900 dark:text-white mt-8 mb-4">{text}</h1>;
       if (headerLevel === 2) return <h2 key={i} className="text-xl font-black text-slate-800 dark:text-slate-100 mt-6 mb-3">{text}</h2>;
       return <h3 key={i} className="text-lg font-black text-slate-700 dark:text-slate-200 mt-4 mb-2">{text}</h3>;
    }
    
    if (line.match(/^[-*]\s/)) {
       const text = line.replace(/^[-*]\s/, '');
       const parts = text.split(/(\*\*.*?\*\*)/g);
       return (
         <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 mb-2 ml-2 sm:ml-4">
            <span className="text-amber-500 mt-1 flex-shrink-0">•</span>
            <span className="leading-relaxed">
              {parts.map((part, idx) => {
                 if (part.startsWith('**') && part.endsWith('**')) return <strong key={idx} className="font-extrabold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
                 return part;
              })}
            </span>
         </li>
       );
    }

    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
       <p key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
          {parts.map((part, idx) => {
             if (part.startsWith('**') && part.endsWith('**')) return <strong key={idx} className="font-extrabold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
             return part;
          })}
       </p>
    );
  };

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
    if (activePaymentFilter === "All") {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#EAB308', '#F97316', '#14B8A6', '#84CC16'];
      return (revenueByDoctorData || []).map((item, index) => ({
        ...item,
        color: item.color || colors[index % colors.length]
      }));
    }
    
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Analyze with AI Button */}
          <button
            onClick={() => setShowMayaModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg shadow-amber-200 dark:shadow-amber-900/20 transform transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            Analyse with Maya AI
          </button>

          {/* Payment Mode Tabs */}
          <div className="flex overflow-x-auto custom-scrollbar bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
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
                  <Line type="monotone" dataKey="appointments" stroke="#3B82F6" strokeWidth={4} dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Appointments" />
                  <Line type="monotone" dataKey="patients" stroke="#10B981" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: 'none' }} activeDot={{ r: 6 }} name="Unique Patients" />
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
                      <Tooltip formatter={(value) => `₹${(value || 0).toLocaleString()}`} />
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
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">₹{(doctor.value || 0).toLocaleString()}</span>
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
                    formatter={(value) => [`₹${(value || 0).toLocaleString()}`, '']} 
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

      {/* MAYA AI ANALYST MODAL */}
      <AnimatePresence>
        {showMayaModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400 opacity-10 blur-3xl rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 opacity-10 blur-3xl rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none -ml-20 -mb-20"></div>

              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200 dark:shadow-none flex items-center justify-center text-white flex-shrink-0">
                    <BrainCircuit size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-1">Maya Analyst</h2>
                    <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Chief Medical Analyst</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowMayaModal(false); setAiReport(null); setActiveAiCategory(null); }}
                  className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar z-10">
                {!aiReport && !isAiLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="flex flex-col gap-6 max-w-2xl mx-auto py-4 sm:py-8"
                  >
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner">
                      <p className="text-sm sm:text-lg font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                        "Hello! I am Maya, your AI Business Analyst. What would you like me to analyze today?"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {[
                        { id: 'Overall Clinic Health', icon: Activity, color: 'blue' },
                        { id: 'Doctors Performance', icon: Stethoscope, color: 'emerald' },
                        { id: 'Patient Volume Trends', icon: Users, color: 'purple' },
                        { id: 'Revenue & Profitability', icon: Wallet, color: 'amber' },
                      ].map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => handleAiAnalysis(cat.id)}
                          className={`flex items-center p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-${cat.color}-500 hover:bg-${cat.color}-50 dark:hover:bg-${cat.color}-900/20 group transition-all duration-300 text-left bg-white dark:bg-slate-900/50`}
                        >
                          <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-${cat.color}-100 dark:group-hover:bg-${cat.color}-900/30 group-hover:text-${cat.color}-600 group-hover:scale-110 transition-all shadow-sm`}>
                            <cat.icon size={20} />
                          </div>
                          <span className="ml-4 font-black text-sm sm:text-base text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{cat.id}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {isAiLoading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-amber-100 dark:border-amber-900/30 border-t-amber-500 rounded-full animate-spin shadow-lg"></div>
                      <Sparkles className="absolute inset-0 m-auto text-amber-500 animate-pulse" size={20} />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-700 dark:text-slate-200 animate-pulse">Maya is crunching the numbers...</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{activeAiCategory}</p>
                    </div>
                  </div>
                )}

                {aiReport && !isAiLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800/30 rounded-3xl p-4 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                      <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg inline-flex w-fit shadow-xs">
                        {activeAiCategory}
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Zap size={14} className="text-amber-500 fill-amber-500/20" />
                        Live Data Generation
                      </span>
                    </div>

                    <div className="max-w-none">
                      {aiReport.split(/\n|\\n/).map((line, i) => renderMarkdownLine(line, i))}
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Footer Actions */}
              {(aiReport || isAiLoading) && (
                 <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 z-10 flex justify-end">
                    <button 
                      onClick={() => { setAiReport(null); setActiveAiCategory(null); }}
                      className="px-6 py-3 font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                       Ask Another Category
                    </button>
                 </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminDashboardPanel;
