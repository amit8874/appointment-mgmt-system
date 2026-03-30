import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserPlus, FileText, Search, User, X, Stethoscope, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import HorizontalAppointmentForm from '../../../Component/Admin/HorizontalAppointmentForm';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { default: api } = await import('../../../services/api');
      const response = await api.get('/doctors');
      const data = response.data;
      const doctorsList = Array.isArray(data) ? data : (data?.doctors || []);
      setDoctors(doctorsList);
    } catch (error) {
      console.error('Error fetching doctors for appointment form:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="bg-gray-100/50 min-h-screen pb-12">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-3">
              <Calendar className="w-10 h-10 text-blue-600 bg-blue-50 p-2 rounded-xl" />
              New Appointment
            </h1>
            <p className="text-gray-500 font-medium ml-1">Schedule and manage clinic appointments with ease.</p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Quick Stats Summary */}
             <div className="hidden sm:flex items-center gap-6 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
               <div className="text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today</p>
                 <p className="text-xl font-black text-blue-600 uppercase">{new Date().toLocaleString('en-US', { day: '2-digit', month: 'short' })}</p>
               </div>
               <div className="w-px h-8 bg-gray-100"></div>
               <div className="text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</p>
                 <p className="text-xl font-black text-gray-900 uppercase">REC</p>
               </div>
             </div>
          </div>
        </div>

        {/* Integrated Horizontal Appointment Booking Form - Exact Admin Style */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="w-full"
        >
          <HorizontalAppointmentForm 
            doctors={doctors}
            onSuccess={() => {
              navigate('/receptionist/appointments');
            }}
          />
        </motion.div>

        {/* Informational Cards (Optional - can be replaced with more relevant ones) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
               <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <UserPlus className="w-6 h-6" />
               </div>
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Register Patient</h3>
               <p className="text-sm text-gray-500 mt-2">New to our clinic? Register patient profile first for easier booking next time.</p>
               <button onClick={() => navigate('/receptionist/patients')} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Go to Patients →</button>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
               <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4 group-hover:bg-green-600 group-hover:text-white transition-all">
                  <Stethoscope className="w-6 h-6" />
               </div>
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Check Availability</h3>
               <p className="text-sm text-gray-500 mt-2">View doctor schedules and session times to provide accurate booking slots.</p>
               <button onClick={() => navigate('/receptionist/doctor-schedule')} className="mt-4 text-green-600 font-bold text-sm hover:underline">View Schedule →</button>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
               <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Clock className="w-6 h-6" />
               </div>
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Quick Check-in</h3>
               <p className="text-sm text-gray-500 mt-2">Check-in arriving patients for their scheduled appointments smoothly.</p>
               <button onClick={() => navigate('/receptionist/track-appointments')} className="mt-4 text-purple-600 font-bold text-sm hover:underline">Manage Appts →</button>
            </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
