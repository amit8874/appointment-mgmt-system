import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Search,
    Filter,
    Download,
    Eye,
    Calendar,
    Stethoscope,
    MoreVertical,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { centralDoctorApi } from '../../../services/api';

const DoctorSchedule = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const doctorsPerPage = 10;

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const data = await centralDoctorApi.getAll();
                setDoctors(data);
            } catch (error) {
                console.error('Error fetching doctors:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

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
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const rowVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    };

    const AvailabilityCircle = ({ day, isActive }) => (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-white text-black border border-gray-200'
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
                        placeholder="Search..."
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
                                // Convert string "true"/"false" to boolean, default to false if undefined
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-500 font-medium">
                                                {doctor.department || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                            {doctor.phone || 'N/A'}
                                        </td>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100">
                                                    <Calendar size={18} />
                                                </button>
                                                <Link to={`/receptionist/doctor/${doctor.id}`}>
                                                    <button className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100">
                                                        <Eye size={18} />
                                                    </button>
                                                </Link>
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

                {/* Pagination Section */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                        <p className="text-sm text-gray-500 font-medium">
                            Showing <span className="text-indigo-600">{indexOfFirstDoctor + 1}</span> to <span className="text-indigo-600">{Math.min(indexOfLastDoctor, filteredDoctors.length)}</span> of <span className="text-gray-800">{filteredDoctors.length}</span> doctors
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
    );
};

export default DoctorSchedule;
