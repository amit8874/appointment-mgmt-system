import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Users, IndianRupee, Activity, TrendingUp, Filter, 
  Download, Printer, Share2, AlertCircle, RefreshCw, 
  Stethoscope, ShoppingBag, MessageSquare, ChevronDown
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { analyticsApi, centralDoctorApi } from '../../../services/api';
import AnalyticsCard from './AnalyticsCard';
import DoctorPerformanceTable from './DoctorPerformanceTable';
import SmartInsights from './SmartInsights';
import AnalyticsSkeleton from './AnalyticsSkeleton';
import OverviewTab from './OverviewTab';
import RevenueTab from './RevenueTab';
import AppointmentTab from './AppointmentTab';
import PatientTab from './PatientTab';
import PharmacyTab from './PharmacyTab';
import BillingTab from './BillingTab';
import WhatsAppTab from './WhatsAppTab';

const ClinicAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  
  // Navigation & Filters
  const [activeTab, setActiveTab] = useState('Overview');
  const [dateRange, setDateRange] = useState('This Month');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const now = new Date();
      let startDate;
      let endDate = now.toISOString();
      
      if (dateRange === 'Today') {
        startDate = new Date(now.setHours(0,0,0,0)).toISOString();
      } else if (dateRange === 'Yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDate = new Date(yesterday.setHours(0,0,0,0)).toISOString();
        endDate = new Date(yesterday.setHours(23,59,59,999)).toISOString();
      } else if (dateRange === 'Last 7 Days') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else if (dateRange === 'This Month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (dateRange === 'Last Month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      }

      const params = { startDate, endDate, doctorId: selectedDoctor };
      const [analyticsRes, doctorsRes] = await Promise.all([
        analyticsApi.getClinicAnalytics(params),
        centralDoctorApi.getAll()
      ]);

      if (analyticsRes.success) {
        setData(analyticsRes.data);
      } else {
        throw new Error(analyticsRes.message || "Failed to fetch data");
      }
      
      const doctorsList = Array.isArray(doctorsRes) ? doctorsRes : (doctorsRes.doctors || []);
      setDoctors(doctorsList);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Failed to load clinic analytics. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedDoctor]);

  if (loading) return <AnalyticsSkeleton />;

  const tabs = ['Overview', 'Revenue', 'Appointments', 'Patients', 'Doctors', 'Pharmacy', 'Billing', 'WhatsApp', 'Insights'];

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-gray-900 min-h-screen font-sans">
      {/* HEADER & GLOBAL CONTROLS */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Clinic Analysis</h1>
            <p className="text-gray-500 text-sm mt-1">Detailed performance metrics and clinic insights</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Range Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition-all"
              >
                <Calendar className="w-4 h-4 text-gray-400" />
                {dateRange}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showFilters && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    {['Today', 'Yesterday', 'Last 7 Days', 'This Month', 'Last Month'].map((range) => (
                      <button
                        key={range}
                        onClick={() => { setDateRange(range); setShowFilters(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${dateRange === range ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-gray-600 dark:text-gray-400'}`}
                      >
                        {range}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Doctor Filter */}
            <select 
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="all">All Doctors</option>
              {doctors.map(doc => (
                <option key={doc._id} value={doc._id}>{doc.name}</option>
              ))}
            </select>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Export Actions */}
            <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Print Report">
              <Printer className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="Export Excel">
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={fetchAnalytics}
              className={`p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all ${refreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-gray-100 dark:border-gray-700 pt-4">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* TAB CONTENT */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'Overview' && <OverviewTab data={data} />}
        {activeTab === 'Revenue' && <RevenueTab data={data?.revenue} />}
        {activeTab === 'Appointments' && <AppointmentTab data={data?.appointments} />}
        {activeTab === 'Patients' && <PatientTab data={data?.patients} />}
        {activeTab === 'Doctors' && <DoctorPerformanceTable doctors={data?.doctors} />}
        {activeTab === 'Pharmacy' && <PharmacyTab data={data?.pharmacy} />}
        {activeTab === 'Billing' && <BillingTab data={data?.billing} />}
        {activeTab === 'WhatsApp' && <WhatsAppTab data={data?.whatsapp} />}
        {activeTab === 'Insights' && <SmartInsights insights={data?.insights} />}
      </motion.div>
    </div>
  );
};

export default ClinicAnalytics;
