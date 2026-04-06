import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    MapPin,
    Phone,
    Mail,
    Calendar as CalendarIcon,
    User,
    FileText,
    Stethoscope,
    Droplet,
    MoreVertical,
    Clock
} from 'lucide-react';
import { centralDoctorApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const DoctorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Monday');

    useEffect(() => {
        const fetchDoctor = async () => {
            try {
                const data = await centralDoctorApi.getById(id);
                setDoctor(data);

                // Set initial active tab based on availability
                if (data.availability) {
                    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    const firstAvailableDay = days.find(day => data.availability[day.toLowerCase()]);
                    if (firstAvailableDay) setActiveTab(firstAvailableDay);
                }
            } catch (error) {
                console.error('Error fetching doctor details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctor();
    }, [id]);

    const generateTimeSlots = (workingHours) => {
        const slots = [];
        try {
            // Normalize workingHours to an array
            const shifts = Array.isArray(workingHours) ? workingHours : 
                          (workingHours?.start ? [workingHours] : [{ start: '09:00', end: '17:00' }]);

            shifts.forEach(shift => {
                const start = shift.start || '09:00';
                const end = shift.end || '17:00';
                
                let current = new Date(`1970-01-01T${start}:00`);
                const last = new Date(`1970-01-01T${end}:00`);

                if (isNaN(current.getTime()) || isNaN(last.getTime())) return;

                while (current < last) {
                    const startTime = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    current.setMinutes(current.getMinutes() + 30);
                    const endTime = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    slots.push(`${startTime} - ${endTime}`);
                }
            });
        } catch (e) {
            console.error("Error generating slots:", e);
        }
        return slots;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="p-8 text-center bg-gray-50 h-screen">
                <h2 className="text-xl font-bold text-gray-800">Doctor not found</h2>
                <button onClick={() => navigate('/receptionist/doctor')} className="mt-4 text-indigo-600 hover:underline">
                    Go back to Doctors
                </button>
            </div>
        );
    }

    const allDaysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const availableDays = allDaysOrder.filter(day => doctor.availability?.[day.toLowerCase()]);
    const slots = generateTimeSlots(doctor.workingHours);

    return (
        <div className="p-6 bg-gray-100 min-h-screen space-y-6">
            {/* Breadcrumb / Back Button */}
            <div className="flex items-center gap-2 mb-4">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 font-bold transition-colors group bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back</span>
                </button>
            </div>

            {/* Profile Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 relative">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-cyan-500 flex-shrink-0 flex items-center justify-center">
                    {doctor.photo ? (
                        <img src={doctor.photo} alt={doctor.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-white">
                            <Stethoscope size={64} />
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-gray-800">{doctor.name}</h1>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            {doctor.specialization}
                        </span>
                    </div>

                    <p className="text-gray-400 text-sm font-medium">
                        {doctor.qualification || 'MBBS, M.D, Cardiology'}
                    </p>

                    <div className="flex items-center gap-4 text-sm font-medium flex-wrap">
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <span className="p-1 rounded bg-gray-50 border border-gray-100">
                                <Stethoscope size={14} />
                            </span>
                            Clinic : <span className="text-gray-600">{doctor.organization?.name || doctor.clinicName || 'Downtown Medical Clinic'}</span>
                        </div>
                        {doctor.status === 'Active' && (
                            <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-md text-[10px] uppercase font-bold tracking-wider border border-green-100 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                                Available
                            </span>
                        )}
                    </div>
                </div>

                {/* Action Section */}
                <div className="flex flex-col items-end justify-between min-w-[200px] gap-4">
                    <div className="text-right">
                        <p className="text-gray-400 text-xs font-semibold mb-1">Consultation Charge</p>
                        <p className="text-2xl font-bold text-gray-800">₹{doctor.fee || doctor.consultationFee || '499'} <span className="text-gray-400 text-sm font-normal">/ 30 Min</span></p>
                    </div>
                    <button 
                        onClick={() => {
                            const rebookData = {
                                doctorId: doctor.id || doctor._id,
                                doctorName: doctor.name,
                                specialization: doctor.specialization,
                                department: doctor.department || doctor.specialization,
                                fee: doctor.fee || doctor.consultationFee || 499
                            };
                            
                            if (user?.role === 'receptionist') {
                                navigate('/receptionist/new-appointment', { state: { rebookData } });
                            } else {
                                // For Admin/SuperAdmin, send to dashboard which handles rebookData state
                                navigate('/admin-dashboard', { state: { rebookData } });
                            }
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold text-sm shadow-indigo-100 shadow-lg"
                    >
                        <CalendarIcon size={18} />
                        Book Appointment
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Availability Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">Availability</h2>
                        </div>

                        {/* Day Tabs */}
                        <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/30">
                            {availableDays.map((day) => (
                                <button
                                    key={day}
                                    onClick={() => setActiveTab(day)}
                                    className={`flex-1 min-w-[100px] py-4 text-sm font-bold transition-all border-b-2 text-center uppercase tracking-wider ${activeTab === day
                                        ? 'border-indigo-600 text-gray-800 bg-white'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>

                        {/* Time Slots */}
                        <div className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {slots.length > 0 ? slots.map((slot, idx) => (
                                    <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center text-xs font-bold text-gray-600 hover:bg-white hover:border-indigo-100 hover:text-indigo-600 cursor-pointer transition-all shadow-sm">
                                        {slot}
                                    </div>
                                )) : (
                                    <p className="col-span-full text-center text-gray-400 py-4 font-medium italic">No slots available for this day</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Short Bio Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-800">Short Bio</h2>
                        <p className="text-gray-500 text-sm leading-relaxed font-normal">
                            {doctor.bio || `Dr. ${doctor.name.split(' ').pop()} has been practicing medicine for over ${doctor.experience || 'several'} years.
                            ${doctor.gender === 'Female' ? ' She' : ' He'} has extensive experience in managing patient care and treating a wide range of medical conditions.`}
                        </p>
                        <button className="text-indigo-600 text-sm font-bold hover:text-indigo-700 flex items-center gap-1 transition-colors">
                            See More <ChevronLeft size={14} className="-rotate-90" />
                        </button>
                    </div>
                </div>

                {/* Sidebar Area */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                        <h2 className="text-xl font-bold text-gray-800">About</h2>

                        <div className="space-y-6">
                            {/* Detail Items */}
                            {[
                                { label: 'Medical License Number', value: doctor.licenseNumber || 'Not Available', icon: FileText },
                                { label: 'Phone Number', value: doctor.phone || 'Not Available', icon: Phone },
                                { label: 'Email Address', value: doctor.email || 'Not Available', icon: Mail },
                                { label: 'Location', value: doctor.address || (doctor.addressInfo?.address1 ? `${doctor.addressInfo.address1}, ${doctor.addressInfo.city}` : 'Not Available'), icon: MapPin },
                                { label: 'DOB', value: doctor.dob ? new Date(doctor.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Available', icon: CalendarIcon },
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors flex-shrink-0 border border-gray-50">
                                        <item.icon size={18} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-gray-800">{item.label}</p>
                                        <p className="text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorDetail;
