import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserPlus, FileText, Search, User, X, Stethoscope, Clock, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import HorizontalAppointmentForm from '../../../Component/Admin/HorizontalAppointmentForm';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [whatsappBalance, setWhatsappBalance] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { default: api } = await import('../../../services/api');
      const response = await api.get('/doctors');
      const data = response.data;
      const doctorsList = Array.isArray(data) ? data : (data?.doctors || []);
      setDoctors(doctorsList);

      const whatsappRes = await api.get('/whatsapp-credits/balance');
      if (whatsappRes.success) {
        setWhatsappBalance(whatsappRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="bg-gray-100/50 min-h-screen pb-4 px-0">
      {/* Header Section */}
      <div className="w-full px-0 pt-0 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-end gap-2 mb-2 pr-4">
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

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group cursor-pointer" onClick={() => navigate('/receptionist/whatsapp-credits')}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all ${whatsappBalance?.totalAvailable < 50
                ? 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'
                : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
              }`}>
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">WhatsApp Credits</h3>
            <p className={`text-3xl font-black mt-2 ${whatsappBalance?.totalAvailable < 50 ? 'text-red-600' : 'text-indigo-600'}`}>
              {whatsappBalance?.totalAvailable?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Available Balance</p>
            <button className="mt-4 text-indigo-600 font-bold text-sm hover:underline">View History →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
