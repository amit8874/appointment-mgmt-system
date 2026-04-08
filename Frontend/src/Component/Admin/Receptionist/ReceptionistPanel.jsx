import React, { useState, useEffect } from 'react';
import { 
  User, Search, PlusCircle, Edit2, Trash2, Eye, 
  Calendar, Clock, MapPin, Mail, Phone, Briefcase,
  CheckCircle2, XCircle, Clock3, Filter,
  ChevronDown, ChevronUp, X, UserCircle, Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import Pagination from "../../../components/common/Pagination";

const InfoCard = ({ title, children, icon: Icon, className = "" }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 ${className}`}>
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

const ReceptionistPanel = ({ 
  openReceptionistForm, 
  onViewReceptionist, 
  onEditReceptionist, 
  onDeleteReceptionist,
  receptionists = [],
  receptionistsLoading,
  receptionistsError,
  refreshReceptionists,
  limits
}) => {
  const isLimitReached = (receptionists || []).length >= (limits?.receptionists || 1) && limits?.receptionists !== -1;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceptionist, setSelectedReceptionist] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;


  // Filter receptionists based on search term and status
  const filteredReceptionists = (receptionists || []).filter(receptionist => {
    const matchesSearch = !searchTerm || 
      receptionist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receptionist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receptionist.phone.includes(searchTerm);
      
    const matchesStatus = statusFilter === 'All' || 
      (receptionist.status && receptionist.status.toLowerCase() === statusFilter.toLowerCase());
      
    return matchesSearch && matchesStatus;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Paginate receptionists
  const paginatedReceptionists = filteredReceptionists.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredReceptionists.length / itemsPerPage);

  // Handle view receptionist details
  const handleViewReceptionist = (receptionist) => {
    setSelectedReceptionist(receptionist);
    setActiveTab('overview');
  };

  if (receptionistsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (receptionistsError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {receptionistsError}
      </div>
    );
  }


  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="space-y-6 sm:space-y-8 p-4 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receptionist Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage receptionist accounts and their details
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <div 
            className="group relative"
            title={isLimitReached ? `Receptionist limit reached for your plan. Please upgrade to add more.` : ""}
          >
            <button
              onClick={() => !isLimitReached && openReceptionistForm(null)}
              disabled={isLimitReached}
              className={`flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white transition-all duration-200 
                ${isLimitReached 
                  ? "bg-gray-400 cursor-not-allowed opacity-75" 
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"} 
                whitespace-nowrap`}
            >
              {isLimitReached ? (
                <Lock className="w-5 h-5 mr-2" />
              ) : (
                <PlusCircle className="w-5 h-5 mr-2" />
              )}
              Add Receptionist
            </button>
            {isLimitReached && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                Plan limit reached: {limits?.receptionists} Receptionist(s) Max
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search receptionists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Filter className="h-5 w-5 text-gray-500 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Receptionists List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedReceptionists.length > 0 ? (
                paginatedReceptionists.map((receptionist) => (
                  <tr key={receptionist.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {receptionist.profilePhoto ? (
                            <img className="h-10 w-10 rounded-full" src={receptionist.profilePhoto} alt={receptionist.name} />
                          ) : (
                            <UserCircle className="h-10 w-10 text-gray-300" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {receptionist.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {receptionist.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{receptionist.phone}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{receptionist.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={receptionist.status || 'Active'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewReceptionist(receptionist)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditReceptionist(receptionist)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteReceptionist(receptionist.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No receptionists found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredReceptionists.length}
          itemsPerPage={itemsPerPage}
        />
      </div>

      {/* Receptionist Detail View */}
      {selectedReceptionist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Receptionist Details
                </h2>
                <button
                  onClick={() => setSelectedReceptionist(null)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  {selectedReceptionist.profilePhoto ? (
                    <img
                      className="h-24 w-24 rounded-full mb-4 object-cover"
                      src={selectedReceptionist.profilePhoto}
                      alt={selectedReceptionist.name}
                    />
                  ) : (
                    <UserCircle className="h-24 w-24 text-gray-300 mb-4" />
                  )}
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedReceptionist.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedReceptionist.role || 'Receptionist'}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={selectedReceptionist.status || 'Active'} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoCard title="Contact Information" icon={User}>
                    <DetailItem 
                      label="Email" 
                      value={selectedReceptionist.email || 'N/A'} 
                    />
                    <DetailItem 
                      label="Phone" 
                      value={selectedReceptionist.phone || 'N/A'} 
                    />
                    <DetailItem 
                      label="Address" 
                      value={selectedReceptionist.address || 'N/A'} 
                    />
                  </InfoCard>
                  
                  <InfoCard title="Employment Details" icon={Briefcase}>
                    <DetailItem 
                      label="Join Date" 
                      value={selectedReceptionist.joinDate || 'N/A'} 
                    />
                    <DetailItem 
                      label="Shift" 
                      value={selectedReceptionist.shift || 'N/A'} 
                    />
                    <DetailItem 
                      label="Status" 
                      value={selectedReceptionist.status || 'N/A'} 
                    />
                  </InfoCard>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      onEditReceptionist(selectedReceptionist);
                      setSelectedReceptionist(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this receptionist?')) {
                        onDeleteReceptionist(selectedReceptionist.id);
                        setSelectedReceptionist(null);
                      }
                    }}
                    className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

ReceptionistPanel.defaultProps = {
  openReceptionistForm: () => {},
  onViewReceptionist: null,
  onEditReceptionist: null,
  onDeleteReceptionist: null,
  refreshReceptionists: () => {}
};

export default ReceptionistPanel;
