import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    X,
    ChevronDown,
    Check
} from 'lucide-react';
import { centralDoctorApi } from '../../../services/api';
import { exportDoctorsToExcel } from '../../../utils/excelExport';

/* ─────────────────────────────────────────────
   INLINE DOCTOR DETAIL MODAL (Calendar button)
───────────────────────────────────────────── */
const DoctorScheduleModal = ({ doctor: initialDoctor, onClose }) => {
    const [doctor, setDoctor] = useState(initialDoctor);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [isEditingShifts, setIsEditingShifts] = useState(false);
    const [tempWorkingHours, setTempWorkingHours] = useState([]);

    // Generate next 14 days
    const dateRange = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    const getOverrideForDate = (date) => {
        return doctor.availabilityOverrides?.find(o => o.date === date);
    };

    const currentOverride = getOverrideForDate(selectedDate);
    const isActuallyAvailable = currentOverride 
        ? currentOverride.isAvailable 
        : doctor.availability?.[new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()];

    const getBaseWorkingHours = () => {
        const day = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        return currentOverride?.workingHours || doctor.workingHours || [{ start: '09:00', end: '13:00' }];
    };

    const currentWorkingHours = getBaseWorkingHours();

    // Initialize temp working hours when selectedDate or currentOverride changes
    useEffect(() => {
        setTempWorkingHours(currentWorkingHours);
        setIsEditingShifts(false);
    }, [selectedDate, currentOverride]);

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

    const handleUpdateOverride = async (updateData = {}) => {
        setIsSaving(true);
        setMessage(null);
        try {
            const newOverride = {
                date: selectedDate,
                isAvailable: updateData.hasOwnProperty('isAvailable') ? updateData.isAvailable : isActuallyAvailable,
                workingHours: updateData.hasOwnProperty('workingHours') ? updateData.workingHours : currentWorkingHours
            };
            const response = await centralDoctorApi.setAvailabilityOverride(doctor.id || doctor._id, newOverride);
            setDoctor(prev => ({ ...prev, availabilityOverrides: response.availabilityOverrides }));
            setMessage({ type: 'success', text: `Schedule updated for ${selectedDate}` });
            setIsEditingShifts(false);
        } catch (error) {
            console.error('Error updating override:', error);
            setMessage({ type: 'error', text: 'Failed to update schedule' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleAvailability = () => handleUpdateOverride({ isAvailable: !isActuallyAvailable });
    const handleSaveShifts = () => handleUpdateOverride({ workingHours: tempWorkingHours, isAvailable: true });

    const handleRemoveOverride = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const response = await centralDoctorApi.removeAvailabilityOverride(doctor.id || doctor._id, selectedDate);
            setDoctor(prev => ({ ...prev, availabilityOverrides: response.availabilityOverrides }));
            setMessage({ type: 'success', text: `Reverted to default schedule for ${selectedDate}` });
        } catch (error) {
            console.error('Error removing override:', error);
            setMessage({ type: 'error', text: 'Failed to remove override' });
        } finally {
            setIsSaving(false);
        }
    };

    const slots = generateTimeSlots(currentWorkingHours);

    if (!doctor) return null;

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
                    {/* Date Selector */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Select Date</h3>
                            {currentOverride && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded border border-amber-100 uppercase">
                                    Custom Schedule Applied
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {dateRange.map((date) => {
                                const d = new Date(date);
                                const isSelected = selectedDate === date;
                                const hasOverride = getOverrideForDate(date);
                                return (
                                    <button
                                        key={date}
                                        onClick={() => setSelectedDate(date)}
                                        className={`flex-shrink-0 w-16 py-3 rounded-xl border flex flex-col items-center transition-all ${
                                            isSelected 
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                                            : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                                        } ${hasOverride && !isSelected ? 'border-amber-200 bg-amber-50/30' : ''}`}
                                    >
                                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                        <span className="text-lg font-bold">
                                            {d.getDate()}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-gray-800 font-bold">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </h4>
                                <p className="text-xs text-gray-400 font-medium">
                                    {isActuallyAvailable ? 'Available for appointments' : 'Doctor is currently unavailable'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {currentOverride && (
                                    <button
                                        onClick={handleRemoveOverride}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors"
                                    >
                                        Reset to Default
                                    </button>
                                )}
                                <button
                                    onClick={handleToggleAvailability}
                                    disabled={isSaving}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                        isActuallyAvailable 
                                        ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' 
                                        : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                                    }`}
                                >
                                    {isSaving ? 'Saving...' : (isActuallyAvailable ? 'Mark as Unavailable' : 'Make Available')}
                                </button>
                            </div>
                        </div>

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-3 rounded-lg text-xs font-bold text-center ${
                                    message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}
                            >
                                {message.text}
                            </motion.div>
                        )}

                        {/* Slots Display & Editing */}
                        {isActuallyAvailable && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} />
                                        Expected Time Slots
                                    </h5>
                                    {!isEditingShifts ? (
                                        <button 
                                            onClick={() => setIsEditingShifts(true)}
                                            className="text-[10px] font-bold text-indigo-600 uppercase border-b border-indigo-200 hover:border-indigo-600 transition-all"
                                        >
                                            Edit Shifts for this day
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setIsEditingShifts(false)}
                                                className="text-[10px] font-bold text-gray-400 uppercase"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={handleSaveShifts}
                                                disabled={isSaving}
                                                className="text-[10px] font-bold text-indigo-600 uppercase"
                                            >
                                                {isSaving ? 'Saving...' : 'Save Shifts'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isEditingShifts ? (
                                    <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
                                        {tempWorkingHours.map((shift, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <input 
                                                        type="time" 
                                                        value={shift.start} 
                                                        onChange={(e) => {
                                                            const newHours = [...tempWorkingHours];
                                                            newHours[idx] = { ...newHours[idx], start: e.target.value };
                                                            setTempWorkingHours(newHours);
                                                        }}
                                                        className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-xs font-bold"
                                                    />
                                                </div>
                                                <span className="text-gray-300 text-xs">to</span>
                                                <div className="flex-1">
                                                    <input 
                                                        type="time" 
                                                        value={shift.end} 
                                                        onChange={(e) => {
                                                            const newHours = [...tempWorkingHours];
                                                            newHours[idx] = { ...newHours[idx], end: e.target.value };
                                                            setTempWorkingHours(newHours);
                                                        }}
                                                        className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-xs font-bold"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => setTempWorkingHours(tempWorkingHours.filter((_, i) => i !== idx))}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => setTempWorkingHours([...tempWorkingHours, { start: '09:00', end: '13:00' }])}
                                            className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-[10px] font-bold text-gray-400 uppercase hover:border-indigo-200 hover:text-indigo-600 transition-all"
                                        >
                                            + Add Shift
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {slots.length > 0 ? slots.map((slot, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2 bg-white border border-gray-100 rounded-lg text-center text-[11px] font-bold text-gray-600 shadow-sm"
                                            >
                                                {slot}
                                            </div>
                                        )) : (
                                            <p className="col-span-full text-center text-gray-400 py-4 italic text-xs">
                                                No time slots configured
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info Grid (Simplified/Restored) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Phone Number', value: doctor.phone || 'N/A', icon: Phone },
                            { label: 'Email Address', value: doctor.email || 'N/A', icon: Mail },
                            { label: 'Location', value: doctor.address || 'N/A', icon: MapPin },
                            { label: 'License Number', value: doctor.licenseNumber || 'N/A', icon: FileText },
                            { label: 'Date of Birth', value: doctor.dob ? new Date(doctor.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A', icon: Calendar },
                            { label: 'Blood Group', value: doctor.bloodGroup || 'N/A', icon: Droplet },
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-2 p-3 rounded-xl bg-gray-50/50 border border-transparent hover:border-gray-100 transition-all flex-col">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm mb-1">
                                    <item.icon size={14} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                    <p className="text-xs font-bold text-gray-700 truncate">{item.value}</p>
                                </div>
                            </div>
                        ))}
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
    const [sortBy, setSortBy] = useState('recent');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [scheduleDoctor, setScheduleDoctor] = useState(null); 
    const filterRef = useRef(null);
    const sortRef = useRef(null);
    const doctorsPerPage = 10;

    const loading = doctorsLoading;

    // Get unique departments
    const departments = useMemo(() => {
        const deps = doctors.map(d => d.department).filter(Boolean);
        return ['All', ...new Set(deps)];
    }, [doctors]);

    // Handle outside clicks for dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
            if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter and Sort Logic
    const filteredAndSortedDoctors = useMemo(() => {
        let result = doctors.filter(doctor =>
            (doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doctor.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (departmentFilter === 'All' || doctor.department === departmentFilter)
        );

        // Sort logic
        result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'department') return (a.department || '').localeCompare(b.department || '');
            if (sortBy === 'recent') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            return 0;
        });

        return result;
    }, [doctors, searchTerm, departmentFilter, sortBy]);

    const filteredDoctors = filteredAndSortedDoctors;

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
                        <button 
                            onClick={() => exportDoctorsToExcel(filteredDoctors)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                        >
                            <Download size={18} />
                            <span className="text-sm font-bold">Export Schedule</span>
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
                        {/* Filter Dropdown */}
                        <div className="relative" ref={filterRef}>
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                    departmentFilter !== 'All' 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                } shadow-sm`}
                            >
                                <Filter size={18} />
                                {departmentFilter === 'All' ? 'Filters' : departmentFilter}
                                <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isFilterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2"
                                    >
                                        <p className="px-4 py-1 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">By Department</p>
                                        {departments.map(dept => (
                                            <button
                                                key={dept}
                                                onClick={() => {
                                                    setDepartmentFilter(dept);
                                                    setIsFilterOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center justify-between transition-colors ${
                                                    departmentFilter === dept ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {dept}
                                                {departmentFilter === dept && <Check size={14} />}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative" ref={sortRef}>
                            <button 
                                onClick={() => setIsSortOpen(!isSortOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm transition-all"
                            >
                                <span className="text-sm font-bold flex items-center gap-2">
                                    Sort By : {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                                </span>
                                <ChevronDown size={16} className={`transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isSortOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2"
                                    >
                                        {[
                                            { id: 'recent', label: 'Recently Added' },
                                            { id: 'name', label: 'Doctor Name' },
                                            { id: 'department', label: 'Department' }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setSortBy(item.id);
                                                    setIsSortOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center justify-between transition-colors ${
                                                    sortBy === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {item.label}
                                                {sortBy === item.id && <Check size={14} />}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
