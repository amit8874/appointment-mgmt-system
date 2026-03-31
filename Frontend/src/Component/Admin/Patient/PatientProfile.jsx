import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Mail, Phone, Calendar, Heart, Beaker, Pill, Stethoscope,
  Clock, CheckCircle, FileText, File, Download, XCircle,
  RefreshCcw, BookOpen, User, ClipboardList, ChevronLeft,
  ArrowLeft, MapPin, Globe, Shield, Calendar as CalendarIcon
} from 'lucide-react';
import { patientApi, appointmentApi } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// --- Utility Components ---

const DetailCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 transition duration-300 hover:shadow-md h-full">
    <div className="flex items-center text-indigo-600 mb-4">
      <div className="p-2 bg-indigo-50 rounded-lg mr-3">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    </div>
    <div className="text-slate-600 text-sm">
      {children}
    </div>
  </div>
);

const InfoItem = ({ label, value, icon: Icon }) => (
  <div className="flex items-start space-x-3 py-2 border-b border-slate-50 last:border-0">
    {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5" />}
    <div className="flex-1">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{label}</span>
      <span className="text-slate-700 font-semibold break-words">{value || 'N/A'}</span>
    </div>
  </div>
);

// --- Tab Content Renderers ---

const TabPersonalInfo = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <DetailCard title="Basic Details" icon={User}>
      <InfoItem label="Full Name" value={data.fullName || `${data.firstName} ${data.lastName}`} icon={User} />
      <InfoItem label="Date of Birth" value={data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : 'N/A'} icon={Calendar} />
      <InfoItem label="Gender" value={data.gender} />
      <InfoItem label="Blood Group" value={data.bloodGroup} />
    </DetailCard>
    <DetailCard title="Contact Information" icon={Phone}>
      <InfoItem label="Contact Number" value={data.contactNumber || data.mobile} icon={Phone} />
      <InfoItem label="Email Address" value={data.email} icon={Mail} />
      <div className="pt-2 pl-7">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Residential Address</span>
        <p className="text-slate-700 font-medium text-sm leading-relaxed">{data.address}, {data.city}, {data.state} {data.zip}</p>
      </div>
    </DetailCard>
  </div>
);

const TabMedicalHistory = ({ data }) => (
  <div className="space-y-6">
    <DetailCard title="Emergency Contact" icon={Shield}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoItem label="Contact Person" value={data.emergencyContact} icon={User} />
        <InfoItem label="Emergency Phone" value={data.emergencyPhone} icon={Phone} />
      </div>
    </DetailCard>

    <DetailCard title="Conditions & Allergies" icon={BookOpen}>
      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Past Medical History</span>
          <p className="text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
            {data.pastMedicalHistory || data.medicalHistory || 'No history recorded'}
          </p>
        </div>
        <div>
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-2">Known Allergies</span>
          <p className="text-red-700 font-medium bg-red-50 p-3 rounded-xl border border-red-100 italic">
            {data.allergies || 'None reported'}
          </p>
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Current Medications</span>
          <p className="text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
            {data.currentMedications || 'None recorded'}
          </p>
        </div>
      </div>
    </DetailCard>
    
    <DetailCard title="Vitals & Metrics" icon={Heart}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoItem label="Blood Pressure" value={data.vitals?.bloodPressure || data.bloodPressure} />
        <InfoItem label="Weight (kg)" value={data.vitals?.weight || data.weight} />
        <InfoItem label="Height (cm)" value={data.vitals?.height || data.height} />
      </div>
    </DetailCard>
  </div>
);

const TabAppointments = ({ appointments, onRebook }) => {
  const upcoming = appointments.filter(a => a.status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'confirmed');
  const past = appointments.filter(a => a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'cancelled');

  const AppointmentItem = ({ appt }) => (
    <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
            <CalendarIcon size={18} />
          </div>
          <div>
            <p className="font-bold text-slate-800">{new Date(appt.date).toLocaleDateString()} at {appt.time}</p>
            <p className="text-xs text-slate-500 font-medium flex items-center mt-0.5">
              <Stethoscope size={12} className="mr-1" /> {appt.doctorName} ({appt.specialty})
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
          appt.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700' :
            appt.status?.toLowerCase() === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
          }`}>
          {appt.status}
        </span>
      </div>
      <p className="text-sm text-slate-600 italic bg-white/50 p-2 rounded-lg border border-slate-50 mb-4">"{appt.reason || 'No reason specified'}"</p>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => onRebook(appt)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
        >
          <RefreshCcw size={12} /> Re-book
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Current & Upcoming</h3>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-black">{upcoming.length}</span>
        </div>
        <div className="space-y-3">
          {upcoming.length > 0 ? (
            upcoming.map(appt => <AppointmentItem key={appt._id} appt={appt} />)
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm font-medium">No active appointments</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">History</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black">{past.length}</span>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {past.map(appt => <AppointmentItem key={appt._id} appt={appt} />)}
        </div>
      </div>
    </div>
  );
};

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    { key: 'personal', name: 'Personal Info', icon: User },
    { key: 'medical', name: 'Medical History', icon: ClipboardList },
    { key: 'appointments', name: 'Appointments', icon: Calendar },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Get patient details
        const patientData = await patientApi.getById(id);
        setData(patientData);

        // 2. Fetch ALL appointments for this patient (including history, mobile-linked, etc)
        // Using the smart summary endpoint that links via clinical ID and mobile
        const summaryResponse = await appointmentApi.getSummary(id);
        setAppointments(summaryResponse);
      } catch (error) {
        console.error('Error fetching patient profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleGoBack = () => {
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin-dashboard?tab=Patients');
    } else {
      navigate('/receptionist/patients');
    }
  };

  const handleRebook = (appt) => {
    // Navigate to appointment form with pre-filled state
    if (location.pathname.startsWith('/admin')) {
      const rebookData = {
        patientId: data.patientId,
        patientName: data.fullName || `${data.firstName} ${data.lastName}`,
        firstName: data.firstName || data.fullName?.split(' ')[0] || '',
        lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
        patientPhone: data.mobile || data.phone || data.contactNumber || data.contact || '',
        patientEmail: data.email || '',
        gender: data.gender,
        patientAge: data.age,
        ageType: data.ageType || 'Year',
        doctorId: appt.doctorId,
        doctorName: appt.doctorName,
        specialty: appt.specialty,
        reason: appt.reason,
        patient: data
      };
      navigate('/admin-dashboard', { state: { activeTab: 'Calendar View', rebookData } });
    } else {
      const rebookData = {
        patientId: data.patientId,
        patientName: data.fullName || `${data.firstName} ${data.lastName}`,
        firstName: data.firstName || data.fullName?.split(' ')[0] || '',
        lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
        patientPhone: data.mobile || data.phone || data.contactNumber || data.contact || '',
        patientEmail: data.email || '',
        gender: data.gender,
        patientAge: data.age,
        ageType: data.ageType || 'Year',
        doctorId: appt.doctorId,
        doctorName: appt.doctorName,
        specialty: appt.specialty,
        reason: appt.reason,
        patient: data
      };
      navigate('/receptionist/new-appointment', { state: { rebookData } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
          />
          <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
      {/* Premium Hero Section */}
      <div className="relative h-64 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-end pb-12 relative z-10">
          <div className="flex items-center space-x-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative group"
            >
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl border-4 border-white/20 shadow-2xl flex items-center justify-center bg-indigo-600/30 backdrop-blur-sm">
                <User size={64} className="text-white opacity-80" />
              </div>
            </motion.div>

            <div className="text-white">
              <div className="flex items-center gap-3">
                <button onClick={handleGoBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors mb-2">
                  <ArrowLeft size={18} />
                </button>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                  {data.fullName || `${data.firstName} ${data.lastName}`}
                </h1>
              </div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center gap-3 text-slate-300"
              >
                <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  Patient ID: {data.patientId}
                </span>
                <div className="flex items-center text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Active Patient
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-3xl p-4 sticky top-8">
              <nav className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === tab.key
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                      }`}
                  >
                    <tab.icon size={20} className={`${activeTab === tab.key ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                    <span className="font-bold text-sm tracking-wide">{tab.name}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={() => handleRebook({ doctorId: data.assignedDoctorId, doctorName: data.assignedDoctor, specialty: 'General' })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100"
                >
                  <RefreshCcw size={18} /> New Appointment
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 min-h-[500px]"
              >
                {activeTab === 'personal' && <TabPersonalInfo data={data} />}
                {activeTab === 'medical' && <TabMedicalHistory data={data} />}
                {activeTab === 'appointments' && (
                  <TabAppointments appointments={appointments} onRebook={handleRebook} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
