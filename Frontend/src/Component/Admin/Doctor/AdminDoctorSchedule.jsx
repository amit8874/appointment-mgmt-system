import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    Download,
    Eye,
    Calendar,
    Stethoscope,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Phone,
    Mail,
    FileText,
    Droplet,
    Clock,
    X
} from 'lucide-react';

/* ─────────────────────────────────────────────
   INLINE DOCTOR DETAIL MODAL (Calendar button)
───────────────────────────────────────────── */
const DoctorScheduleModal = ({ doctor, onClose }) => {
    const [activeDay, setActiveDay] = useState('Monday');

    useEffect(() => {
        if (doctor?.availability) {
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const firstAvailable = days.find(day => doctor.availability[day.toLowerCase()]);
            if (firstAvailable) setActiveDay(firstAvailable);
        }
    }, [doctor]);

    const generateTimeSlots = (workingHours) => {
        const slots = [];
        try {
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
            return [];
        }
        return slots;
    };

    if (!doctor) return null;

    const allDaysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const availableDays = allDaysOrder.filter(day => doctor.availability?.[day.toLowerCase()]);
    const slots = generateTimeSlots(doctor.workingHours);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-cyan-500 flex-shrink-0 flex items-center justify-center">
                            {doctor.photo ? (
                                <img src={doctor.photo} alt={doctor.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-white"><Stethoscope size={32} /></div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{doctor.name}</h2>
                            <p className="text-sm text-indigo-600 font-medium">{doctor.specialization}</p>
                            <p className="text-xs text-gray-400">{doctor.department || 'General'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Availability Section */}
                    <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                        <div className="p-4 border-b border-gray-100 bg-white">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-600" />
                                Weekly Schedule
                            </h3>
                        </div>
                        {/* Day Tabs */}
                        <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/30">
                            {availableDays.map((day) => (
                                <button
                                    key={day}
                                    onClick={() => setActiveDay(day)}
                                    className={`flex-1 min-w-[80px] py-3 text-xs font-bold transition-all border-b-2 text-center uppercase tracking-wider ${activeDay === day
                                            ? 'border-indigo-600 text-gray-800 bg-white'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                        {/* Time Slots */}
                        <div className="p-4">
                            {doctor.availability?.[activeDay.toLowerCase()] ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {slots.length > 0 ? slots.map((slot, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-white border border-gray-100 rounded-lg text-center text-xs font-bold text-gray-600 hover:border-indigo-100 hover:text-indigo-600 transition-all shadow-sm"
                                        >
                                            {slot}
                                        </div>
                                    )) : (
                                        <p className="col-span-full text-center text-gray-400 py-4 font-medium italic text-sm">
                                            No time slots configured
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Clock size={32} className="text-gray-200 mx-auto mb-2" />
                                    <p className="text-gray-400 font-medium text-sm">Not available on {activeDay}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: 'Phone Number', value: doctor.phone || 'N/A', icon: Phone },
                            { label: 'Email Address', value: doctor.email || 'N/A', icon: Mail },
                            { label: 'License Number', value: doctor.licenseNumber || 'N/A', icon: FileText },
                            { label: 'Location', value: doctor.address || 'N/A', icon: MapPin },
                            { label: 'Date of Birth', value: doctor.dob ? new Date(doctor.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A', icon: Calendar },
                            { label: 'Blood Group', value: doctor.bloodGroup || 'N/A', icon: Droplet },
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-3 group p-3 rounded-lg hover:bg-indigo-50 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors flex-shrink-0">
                                    <item.icon size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800">{item.label}</p>
                                    <p className="text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors break-all">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Consultation Charge */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Consultation Charge</p>
                            <p className="text-2xl font-bold text-indigo-700">
                                ₹{doctor.fee || doctor.consultationFee || '499'}
                                <span className="text-indigo-400 text-sm font-normal"> / 30 Min</span>
                            </p>
                        </div>
                        {doctor.status === 'Active' && (
                            <span className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-100 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Available
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

/* ─────────────────────────────────────────
   MAIN ADMIN DOCTOR SCHEDULE TABLE
───────────────────────────────────────── */
const AdminDoctorSchedule = ({ doctors = [], doctorsLoading, doctorsError }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [scheduleDoctor, setScheduleDoctor] = useState(null); // for Calendar modal
    const doctorsPerPage = 10;

    const loading = doctorsLoading;


    const filteredDoctors = doctors.filter(doctor =>
        doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastDoctor = currentPage * doctorsPerPage;
    const indexOfFirstDoctor = indexOfLastDoctor - doctorsPerPage;
    const currentDoctors = filteredDoctors.slice(indexOfFirstDoctor, indexOfLastDoctor);
    const totalPages = Math.ceil(filteredDoctors.length / doctorsPerPage);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const rowVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    };

    const AvailabilityCircle = ({ day, isActive }) => (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-black border border-gray-200'
            }`}>
            {day}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <>
            {/* Schedule Modal (Calendar button) */}
            {scheduleDoctor && (
                <DoctorScheduleModal
                    doctor={scheduleDoctor}
                    onClose={() => setScheduleDoctor(null)}
                />
            )}

            <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-800">Doctor Schedule</h1>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                            Total Doctors : {doctors.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                            <Download size={18} />
                            <span className="text-sm font-medium">Export</span>
                        </button>
                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                            <MoreVertical size={18} />
                        </button>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, department or specialization..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm flex-1 md:flex-none justify-center">
                            <Filter size={18} />
                            <span className="text-sm font-medium">Filters</span>
                        </button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 shadow-sm flex-1 md:flex-none justify-center">
                            <span className="text-sm font-medium">Sort By : Recent</span>
                            <ChevronRight size={16} className="rotate-90" />
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Doctor</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Phone</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Availability</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <motion.tbody
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="divide-y divide-gray-50"
                            >
                                {currentDoctors.map((doctor) => {
                                    const avail = doctor.availability || {};
                                    const isMonday = avail.monday === true || avail.monday === 'true';
                                    const isTuesday = avail.tuesday === true || avail.tuesday === 'true';
                                    const isWednesday = avail.wednesday === true || avail.wednesday === 'true';
                                    const isThursday = avail.thursday === true || avail.thursday === 'true';
                                    const isFriday = avail.friday === true || avail.friday === 'true';
                                    const isSaturday = avail.saturday === true || avail.saturday === 'true';
                                    const isSunday = avail.sunday === true || avail.sunday === 'true';

                                    return (
                                        <motion.tr
                                            key={doctor.id}
                                            variants={rowVariants}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            {/* Doctor Info */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-50 flex-shrink-0 border-2 border-white shadow-sm">
                                                        {doctor.photo ? (
                                                            <img src={doctor.photo} alt={doctor.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-indigo-300">
                                                                <Stethoscope size={24} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-800">{doctor.name}</h3>
                                                        <p className="text-xs text-gray-400 font-medium">{doctor.specialization}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Department */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-500 font-medium">
                                                    {doctor.department || 'General'}
                                                </span>
                                            </td>

                                            {/* Phone */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                                {doctor.phone || 'N/A'}
                                            </td>

                                            {/* Availability Circles */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <AvailabilityCircle day="M" isActive={isMonday} />
                                                    <AvailabilityCircle day="T" isActive={isTuesday} />
                                                    <AvailabilityCircle day="W" isActive={isWednesday} />
                                                    <AvailabilityCircle day="T" isActive={isThursday} />
                                                    <AvailabilityCircle day="F" isActive={isFriday} />
                                                    <AvailabilityCircle day="S" isActive={isSaturday} />
                                                    <AvailabilityCircle day="S" isActive={isSunday} />
                                                </div>
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Calendar → opens inline Schedule Modal */}
                                                    <button
                                                        onClick={() => setScheduleDoctor(doctor)}
                                                        title="View Schedule"
                                                        className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                                                    >
                                                        <Calendar size={18} />
                                                    </button>

                                                    {/* Eye → navigates to /admin/doctor/:id (full detail page) */}
                                                    <button
                                                        onClick={() => navigate(`/admin/doctor/${doctor.id}`)}
                                                        title="View Full Profile"
                                                        className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}

                                {currentDoctors.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search size={40} className="text-gray-200" />
                                                <p className="text-gray-400 font-medium">No doctors found matching your search</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </motion.tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                            <p className="text-sm text-gray-500 font-medium">
                                Showing <span className="text-indigo-600">{indexOfFirstDoctor + 1}</span> to{' '}
                                <span className="text-indigo-600">{Math.min(indexOfLastDoctor, filteredDoctors.length)}</span> of{' '}
                                <span className="text-gray-800">{filteredDoctors.length}</span> doctors
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${currentPage === page
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminDoctorSchedule;
