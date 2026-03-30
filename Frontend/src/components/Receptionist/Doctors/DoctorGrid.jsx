import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope, Search, PlusCircle, Edit2, Trash2, Eye,
  Calendar, Clock, MapPin, Mail, Phone, User, Briefcase,
  IndianRupee, CheckCircle2, XCircle, Clock3, ArrowLeft, Filter,
  Award, GraduationCap, Building2, Map, Fingerprint,
  CheckCircle, AlertCircle, XCircle as XCircleIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { centralDoctorApi } from '../../../services/api';
import Pagination from '../../common/Pagination';

// Sub-components (Copied from Admin for identical UI)
const StatusBadge = ({ status }) => {
  const getColors = () => {
    switch (status) {
      case 'Active':
      case 'Verified':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
      case 'Rejected':
      case 'Inactive':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200';
      case 'On Leave':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'Active':
      case 'Verified':
        return <CheckCircle size={12} className="mr-1" />;
      case 'Pending':
        return <AlertCircle size={12} className="mr-1" />;
      case 'Rejected':
      case 'Inactive':
        return <XCircle size={12} className="mr-1" />;
      default:
        return null;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${getColors()}`}>
      {getIcon()}
      {status || 'Active'}
    </span>
  );
};

const DoctorGrid = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Matching Admin Grid for identical layout

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await centralDoctorApi.getAll();
        const doctorsList = Array.isArray(data) ? data : (data?.doctors || []);
        setDoctors(doctorsList);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="p-6 space-y-6 bg-gray-50 min-h-screen"
    >
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Doctor Management</h1>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
            Total Doctors : {doctors.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/receptionist/add-doctor">
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
              <PlusCircle size={18} />
              <span className="text-sm font-medium">New Doctor</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Doctor Grid View - IDENTICAL TO ADMIN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedDoctors.length > 0 ? (
          paginatedDoctors.map((doctor) => (
            <div key={doctor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative group">
              <div className="flex items-start gap-4">
                {/* Doctor Image */}
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-50">
                  {doctor.photo || doctor.profilePhoto ? (
                    <img src={doctor.photo || doctor.profilePhoto} alt={doctor.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Stethoscope size={40} />
                    </div>
                  )}
                </div>

                {/* Doctor Info */}
                <div className="flex-1 min-w-0">
                  <h3 
                    className="text-lg font-bold text-gray-800 truncate mb-1 cursor-pointer hover:text-indigo-600"
                    onClick={() => navigate(`/receptionist/doctor/${doctor.id}`)}
                  >
                    {doctor.name}
                  </h3>
                  <p className="text-sm text-gray-400 font-medium mb-3">
                    {doctor.specialization || doctor.department || 'General Medicine'}
                  </p>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      Experience : <span className="text-gray-500 font-medium">{doctor.experience || 0} Years</span>
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      Starts From : <span className="text-indigo-600 font-bold text-sm">₹{doctor.fee || doctor.consultationFee || '500'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex justify-between items-center">
                <StatusBadge status={doctor.status || 'Active'} />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => navigate(`/receptionist/doctor/${doctor.id}`)}
                    className="p-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-md hover:bg-white hover:text-indigo-600 hover:border-indigo-100 transition-colors shadow-sm"
                    title="View Profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {/* Note: Receptionists might not have edit/delete, but we keep the UI same as requested */}
                  <button
                    className="p-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-md hover:bg-white hover:text-yellow-600 hover:border-yellow-100 transition-colors shadow-sm"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-md hover:bg-white hover:text-red-600 hover:border-red-100 transition-colors shadow-sm"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            No doctors found matching your criteria.
          </div>
        )}
      </div>

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={doctors.length}
        itemsPerPage={itemsPerPage}
      />
    </motion.div>
  );
};

export default DoctorGrid;
