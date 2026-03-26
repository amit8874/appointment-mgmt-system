import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope, Search, PlusCircle, Edit2, Trash2, Eye,
  Calendar, Clock, MapPin, Mail, Phone, User, Briefcase,
  IndianRupee, CheckCircle2, XCircle, Clock3, ArrowLeft, Filter,
  ChevronDown, ChevronUp, X, Upload,
  UserCircle, LayoutGrid, List, MoreVertical
} from 'lucide-react';
import { motion } from 'framer-motion';
import Pagination from "../../../components/common/Pagination";

// Sub-components
const InfoCard = ({ title, children, icon: Icon, className = "" }) => (
  <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 ${className}`}>
    <div className="flex items-center mb-4 text-blue-600 dark:text-blue-400">
      <Icon className="w-6 h-6 mr-3" />
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
    </div>
    <dl className="space-y-3 text-gray-600 dark:text-gray-300">
      {children}
    </dl>
  </div>
);

const DetailItem = ({ label, value }) => (
  <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-2">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-right">{value}</dd>
  </div>
);

const StatusBadge = ({ status }) => {
  const color = status === 'Active'
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${color}`}>
      {status}
    </span>
  );
};

// Tab Components
const OverviewTab = ({ doctor }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="md:col-span-2 space-y-6">
      <InfoCard title="Personal Information" icon={UserCircle}>
        <DetailItem label="Full Name" value={doctor.name || 'N/A'} />
        <DetailItem label="Email" value={doctor.email || 'N/A'} />
        <DetailItem label="Phone" value={doctor.phone || 'N/A'} />
        <DetailItem label="Specialization" value={doctor.specialization || 'N/A'} />
        <DetailItem label="Department" value={doctor.department || 'N/A'} />
      </InfoCard>

      <InfoCard title="Professional Details" icon={Award}>
        <DetailItem label="License Number" value={doctor.licenseNumber || 'N/A'} />
        <DetailItem label="Years of Experience" value={doctor.experience || 'N/A'} />
        <DetailItem label="Education" value={doctor.education || 'N/A'} />
      </InfoCard>
    </div>

    <div className="space-y-6">
      <InfoCard title="Quick Stats" icon={Award}>
        <DetailItem label="Total Patients" value="1,245" />
        <DetailItem label="Appointments Today" value="12" />
        <DetailItem label="Rating" value="4.8/5.0" />
      </InfoCard>

      <InfoCard title="Schedule" icon={Clock}>
        <DetailItem label="Monday - Friday" value="9:00 AM - 5:00 PM" />
        <DetailItem label="Saturday" value="9:00 AM - 1:00 PM" />
        <DetailItem label="Sunday" value="Closed" />
      </InfoCard>
    </div>
  </div>
);

const AppointmentsTab = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
    <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Upcoming Appointments</h3>
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">John Doe</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Routine Checkup</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Today, 2:00 PM</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Confirmed
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DoctorPanel = ({ doctors = [], doctorsLoading, doctorsError, onViewDoctor, onEditDoctor, onDeleteDoctor, onAddDoctor, refreshDoctors, forceAddDoctor }) => {
  const navigate = useNavigate();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [showFilters, setShowFilters] = useState(false);

  // Doctor view state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Handle forceAddDoctor prop
  useEffect(() => {
    if (forceAddDoctor && onAddDoctor) {
      onAddDoctor();
    }
  }, [forceAddDoctor, onAddDoctor]);

  // Handle view doctor - sets selected doctor to show details modal
  const handleViewDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setActiveTab('overview');
  };

  // Handle close doctor details
  const handleCloseDoctorDetails = () => {
    setSelectedDoctor(null);
  };


  // Specializations

  // Specializations
  const specializations = [
    'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics',
    'Orthopedics', 'Ophthalmology', 'Gynecology', 'General Medicine'
  ];

  const daysOfWeek = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' }
  ];

  // Get unique departments for filter
  const departments = ['All', ...new Set(doctors.map(doc => doc.department).filter(Boolean))];
  const statuses = ['All', 'Active', 'Inactive', 'On Leave'];

  // Filter doctors based on all filters
  const filteredDoctors = doctors.filter(doctor => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      doctor.name?.toLowerCase().includes(searchLower) ||
      doctor.specialization?.toLowerCase().includes(searchLower) ||
      doctor.id?.toLowerCase().includes(searchLower);

    const matchesDepartment =
      departmentFilter === 'All' ||
      (doctor.department && doctor.department === departmentFilter);

    const matchesStatus =
      statusFilter === 'All' ||
      (doctor.status && doctor.status.toLowerCase() === statusFilter.toLowerCase());

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, statusFilter]);

  // Paginate doctors
  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);




  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}      // Start off-screen (right side)
      animate={{ x: 0, opacity: 1 }}           // Slide in
      exit={{ x: "100%", opacity: 0 }}         // Slide out (if using route transitions)
      transition={{ duration: 0.8, ease: "easeInOut" }}  // Smooth and slow
      className="p-6 space-y-6 bg-gray-50 min-h-screen"
    >
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Doctor Management</h1>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
            Total Doctors : {filteredDoctors.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Filters Button */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
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
          <button
            onClick={onAddDoctor}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
          >
            <PlusCircle size={18} />
            <span className="text-sm font-medium">New Doctor</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="All">All Departments</option>
                {departments.map((dept, index) => (
                  <option key={index} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statuses.map((status, index) => (
                  <option key={index} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedDoctors.length > 0 ? (
            paginatedDoctors.map((doctor) => (
              <div key={doctor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative group">
                {/* Top Right Menu */}
                <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors">
                  <MoreVertical size={20} />
                </button>

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
                      onClick={() => handleViewDoctor(doctor)}
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
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    doctor.status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : doctor.status === 'On Leave'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {doctor.status || 'Active'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDoctor(doctor)}
                      className="p-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-md hover:bg-white hover:text-indigo-600 hover:border-indigo-100 transition-colors shadow-sm"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditDoctor && onEditDoctor(doctor)}
                      className="p-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-md hover:bg-white hover:text-yellow-600 hover:border-yellow-100 transition-colors shadow-sm"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteDoctor && onDeleteDoctor(doctor.id)}
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
      ) : (
        /* List View - Table */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDoctors.length > 0 ? (
                  paginatedDoctors.map((doctor) => (
                    <tr key={doctor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {doctor.photo || doctor.profilePhoto ? (
                              <img className="h-10 w-10 rounded-full" src={doctor.photo || doctor.profilePhoto} alt={doctor.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <User className="h-6 w-6 text-indigo-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div 
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                              onClick={() => handleViewDoctor(doctor)}
                            >
                              {doctor.name}
                            </div>
                            <div className="text-sm text-gray-500">{doctor.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doctor.specialization || doctor.department || 'General Medicine'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doctor.experience || 0} Years
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{doctor.fee || doctor.consultationFee || '500'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          doctor.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : doctor.status === 'On Leave'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {doctor.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDoctor(doctor)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditDoctor ? onEditDoctor(doctor) : null}
                          className="text-yellow-600 hover:text-yellow-900 mr-3"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteDoctor ? onDeleteDoctor(doctor.id) : null}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No doctors found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredDoctors.length}
        itemsPerPage={itemsPerPage}
      />



      {/* Doctor Detail View Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Doctor Details
                </h2>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Header with basic info */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex flex-col md:flex-row items-start md:items-center">
                    <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                      {selectedDoctor.photo ? (
                        <img className="h-24 w-24 rounded-full" src={selectedDoctor.photo} alt={selectedDoctor.name} />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <User className="h-12 w-12 text-blue-600 dark:text-blue-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedDoctor.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{selectedDoctor.specialization}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{selectedDoctor.qualification}</p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedDoctor.status === 'Active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : selectedDoctor.status === 'On Leave'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {selectedDoctor.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <Briefcase className="w-4 h-4 mr-1.5 text-gray-400" />
                          {selectedDoctor.experience} {parseInt(selectedDoctor.experience) === 1 ? 'year' : 'years'} experience
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <IndianRupee className="w-4 h-4 mr-1.5 text-gray-400" />
                          {selectedDoctor.fee} consultation fee
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <Clock3 className="w-4 h-4 mr-1.5 text-gray-400" />
                          {selectedDoctor.workingHours?.start} - {selectedDoctor.workingHours?.end}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8">
                    {['overview', 'schedule', 'reviews'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`${activeTab === tab
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="pt-2">
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-500 dark:text-gray-400">
                              <Mail className="h-5 w-5" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                              <p className="text-sm text-gray-900 dark:text-white">{selectedDoctor.email}</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-500 dark:text-gray-400">
                              <Phone className="h-5 w-5" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                              <p className="text-sm text-gray-900 dark:text-white">{selectedDoctor.phone || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-500 dark:text-gray-400">
                              <MapPin className="h-5 w-5" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                              <p className="text-sm text-gray-900 dark:text-white">{selectedDoctor.address || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-gray-500 dark:text-gray-400">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {selectedDoctor.dob ? new Date(selectedDoctor.dob).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Availability</h3>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {daysOfWeek.map((day) => (
                              <div key={day.id} className="flex items-center">
                                {selectedDoctor.availability?.[day.id] ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                )}
                                <span className="text-sm text-gray-900 dark:text-white">{day.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'schedule' && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Weekly Schedule</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Day</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Working Hours</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {daysOfWeek.map((day) => (
                              <tr key={day.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {day.label}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {selectedDoctor.availability?.[day.id] ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      Available
                                    </span>
                                  ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                      Not Available
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {selectedDoctor.availability?.[day.id]
                                    ? `${selectedDoctor.workingHours?.start || '09:00'} - ${selectedDoctor.workingHours?.end || '17:00'}`
                                    : 'Not Available'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Patient Reviews</h3>
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>No reviews available yet.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

DoctorPanel.defaultProps = {
  onViewDoctor: null,
  onEditDoctor: null,
  onDeleteDoctor: null,
  refreshDoctors: () => { },
  forceAddDoctor: false
};

export default DoctorPanel;
