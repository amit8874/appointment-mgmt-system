import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Stethoscope,
    Search,
    Filter,
    List,
    LayoutGrid,
    Plus,
    MoreVertical,
    Calendar as CalendarIcon,
    ChevronRight
} from 'lucide-react';
import { centralDoctorApi } from '../../../services/api';
import Pagination from '../../common/Pagination';

const DoctorGrid = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const getNextAvailable = (availability) => {
        if (!availability) return 'Not Available';

        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const nextDate = new Date(today);
            nextDate.setDate(today.getDate() + i);
            const dayName = days[nextDate.getDay()];

            if (availability[dayName]) {
                if (i === 0) return `Today, ${nextDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                return nextDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            }
        }
        return 'No upcoming slots';
    };

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

    const totalPages = Math.ceil(doctors.length / itemsPerPage);
    const paginatedDoctors = doctors.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-800">Doctor Grid</h1>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                        Total Doctors : {doctors.length}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Filters Button */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                        <Filter size={18} />
                        <span className="text-sm font-medium">Filters</span>
                    </button>

                    {/* View Toggles */}
                    <div className="flex items-center p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <List size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </div>

                    {/* Add Doctor Button */}
                    <Link to="/receptionist/add-doctor">
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
                            <Plus size={18} />
                            <span className="text-sm font-medium">New Doctor</span>
                        </button>
                    </Link>
                </div>
            </div>

            {/* Grid view */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {paginatedDoctors.map((doctor) => (
                    <motion.div
                        key={doctor.id}
                        variants={cardVariants}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative group"
                    >
                        {/* Top Right Menu */}
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors">
                            <MoreVertical size={20} />
                        </button>

                        <div className="flex items-start gap-4">
                            {/* Doctor Image */}
                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-50">
                                {doctor.photo ? (
                                    <img src={doctor.photo} alt={doctor.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Stethoscope size={40} />
                                    </div>
                                )}
                            </div>

                            {/* Doctor Info */}
                            <div className="flex-1 min-w-0">
                                <Link to={`/receptionist/doctor/${doctor.id}`} className="block group/name">
                                    <h3 className="text-lg font-bold text-gray-800 truncate mb-1 group-hover/name:text-indigo-600 transition-colors">
                                        {doctor.name}
                                    </h3>
                                </Link>
                                <p className="text-sm text-gray-400 font-medium mb-3">
                                    {doctor.specialization}
                                </p>

                                <div className="space-y-2">
                                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                        Available : <span className="text-gray-500 font-medium">{getNextAvailable(doctor.availability)}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                        Starts From : <span className="text-indigo-600 font-bold text-sm">₹{doctor.fee || doctor.consultationFee || '500'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Right Icon */}
                        <div className="mt-4 flex justify-end">
                            <button className="p-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-md hover:bg-white hover:text-indigo-600 hover:border-indigo-100 transition-colors shadow-sm">
                                <CalendarIcon size={18} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
            <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={doctors.length}
                itemsPerPage={itemsPerPage}
            />
        </div>
    );
};

export default DoctorGrid;
