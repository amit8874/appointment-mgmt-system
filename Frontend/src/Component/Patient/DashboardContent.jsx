import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
    Activity,
    Calendar,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardContent = () => {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const [user, setUser] = useState({
        name: 'Patient',
        age: 0,
        gender: 'Not specified',
        patientId: 'Not available',
        bloodGroup: 'Not available',
        allergies: 'Not available',
        vitals: {
            bloodPressure: '120/80',
            heartRate: '72',
            temperature: '98.6'
        }
    });

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check both sessionStorage and localStorage
        // Check patientUser first, then userData (for regular login with password)
        let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
        if (!storedUser) {
            storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
        }
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);

                // Determine the best name to display
                let displayName = 'Patient';
                if (userData.firstName) {
                    displayName = `${userData.firstName} ${userData.lastName || ''}`.trim();
                } else if (userData.fullName) {
                    displayName = userData.fullName;
                } else if (userData.name) {
                    displayName = userData.name;
                }

                setUser(prev => ({
                    ...prev,
                    name: displayName,
                    age: userData.age || 0,
                    gender: userData.gender || 'Not specified',
                    patientId: userData.patientId || 'Not available',
                    bloodGroup: userData.bloodGroup || 'Not available',
                    allergies: userData.allergies || 'Not available',
                }));
            } catch (e) {
                console.error('Error parsing user data', e);
            }
        }
    }, []);

    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                // Check for user data in both possible storage locations
                let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
                if (!storedUser) {
                    storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
                }
                if (!storedUser) return;
                
                const userData = JSON.parse(storedUser);
                const patientId = userData._id || userData.id;

                // Fetch dynamic appointments
                const apptResponse = await api.get(`/appointments/patient-appointments/${patientId}`);
                if (apptResponse.status === 200) {
                    const data = apptResponse.data;
                    const today = new Date().toISOString().split('T')[0];
                    const upcoming = data.filter(a => a.status !== 'cancelled' && a.date >= today)
                        .sort((a, b) => new Date(a.date) - new Date(b.date));
                    setAppointments(upcoming);
                }

                // Fetch dynamic patient profile (including vitals)
                const profileResponse = await api.get(`/patients/${patientId}`);
                if (profileResponse.status === 200) {
                    const profileData = profileResponse.data;
                    setUser(prev => ({
                        ...prev,
                        bloodGroup: profileData.bloodGroup || prev.bloodGroup,
                        allergies: profileData.allergies || prev.allergies,
                        vitals: {
                            bloodPressure: profileData.vitals?.bloodPressure || prev.vitals.bloodPressure,
                            heartRate: profileData.vitals?.heartRate || prev.vitals.heartRate,
                            temperature: profileData.vitals?.temperature || prev.vitals.temperature,
                            weight: profileData.vitals?.weight || prev.vitals.weight,
                            height: profileData.vitals?.height || prev.vitals.height
                        }
                    }));
                }
            } catch (error) {
                console.error('Error fetching patient dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPatientData();
    }, []);

    const stats = [
        // Vitals removed
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-8 pb-8">
            {/* Welcome Header */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
                    <p className="text-gray-500 mt-2">Here's a summary of your upcoming activity and appointments.</p>
                    <div className="flex flex-wrap gap-4 mt-6">
                        <button
                            onClick={() => navigate('/patient-dashboard/appointments')}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200 flex items-center gap-2"
                        >
                            <Calendar className="h-5 w-5" />
                            Book Appointment
                        </button>
                        <button
                            onClick={() => navigate('/patient-dashboard/lab-booking')}
                            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 font-semibold rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            <TrendingUp className="h-5 w-5" />
                            Book Lab Test
                        </button>
                    </div>
                </div>
                <div className="hidden lg:block">
                    <img src="/src/assets/img/brain.png" alt="Health" className="h-32 object-contain opacity-80" />
                </div>
            </div>

            {/* Vitals Grid removed */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Appointments Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="text-blue-600" />
                            Upcoming Appointments
                        </h2>
                        <button
                            onClick={() => navigate('/patient-dashboard/appointments')}
                            className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
                        >
                            View All <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl"></div>)}
                            </div>
                        ) : appointments.length > 0 ? (
                            appointments.slice(0, 3).map((appt, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-50 p-4 rounded-xl text-blue-600 font-bold text-center min-w-[70px]">
                                            <div className="text-xs uppercase">{new Date(appt.date).toLocaleDateString('en-GB', { month: 'short' })}</div>
                                            <div className="text-xl">{new Date(appt.date).getDate()}</div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{appt.doctorName}</h4>
                                            <p className="text-gray-500 text-sm">{appt.specialty} • {appt.time}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${appt.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                                            }`}>
                                            {appt.status === 'confirmed' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                            {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                                        </span>
                                        <button
                                            onClick={() => navigate('/patient-dashboard/appointments')}
                                            className="p-2 hover:bg-gray-50 rounded-lg transition"
                                        >
                                            <ArrowRight className="h-5 w-5 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No upcoming appointments found</p>
                                <button
                                    onClick={() => navigate('/patient-dashboard/appointments')}
                                    className="mt-4 text-blue-600 font-bold text-sm"
                                >
                                    Book your first appointment now
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    {/* Quick Actions Card */}
                    <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100">
                        <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Order Medicines', path: '/patient-dashboard/medicine-order' },
                                { label: 'Book Lab Test', path: '/patient-dashboard/lab-booking' },
                                { label: 'Manage Appointments', path: '/patient-dashboard/appointments' }
                            ].map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(action.path)}
                                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl transition text-left flex justify-between items-center group font-medium"
                                >
                                    {action.label}
                                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Health Tip Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 bg-gradient-to-br from-white to-orange-50/30">
                    <div className="flex items-center gap-2 text-orange-600 mb-3 uppercase tracking-wider text-xs font-bold">
                        <AlertCircle className="h-4 w-4" />
                        Daily Health Tip
                    </div>
                    <p className="text-gray-700 font-medium leading-relaxed">
                        Drink at least 8 glasses of water daily to maintain skin elasticity and boost your metabolism.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
