import React, { useState, useMemo, useEffect } from 'react';
import { Search, PlusCircle, Clock, UserCheck, Stethoscope, LogOut, X, User, Phone, Mail, Calendar, Heart, Trash2, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../common/Pagination';

// Status configuration for colors and icons
const statusConfig = {
  Scheduled: { color: 'text-blue-500 bg-blue-100', icon: Clock, label: 'Scheduled' },
  Waiting: { color: 'text-yellow-600 bg-yellow-100', icon: UserCheck, label: 'Waiting' },
  'In-Progress': { color: 'text-emerald-600 bg-emerald-100', icon: Stethoscope, label: 'In-Progress' },
  'Checked-Out': { color: 'text-gray-500 bg-gray-100', icon: LogOut, label: 'Checked Out' },
  Pending: { color: 'text-orange-500 bg-orange-100', icon: Clock, label: 'Pending' },
  Confirmed: { color: 'text-green-500 bg-green-100', icon: UserCheck, label: 'Confirmed' },
  Cancelled: { color: 'text-red-500 bg-red-100', icon: LogOut, label: 'Cancelled' },
};

// --- Helper Components ---

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || { 
    color: 'text-gray-500 bg-gray-100', 
    icon: Clock, 
    label: status || 'Unknown' 
  };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
};

const PatientRow = ({ patient, onUpdateStatus, onViewRecord, onDelete, deletingId }) => {
  const { id, patientId, name, time, reason, doctor, status, arrival } = patient;

  const handleAction = () => {
    let newStatus;
    if (status === 'Scheduled') newStatus = 'Waiting';
    else if (status === 'Waiting') newStatus = 'In-Progress';
    else if (status === 'In-Progress') newStatus = 'Checked-Out';

    if (newStatus) {
      onUpdateStatus(id, newStatus);
    }
  };

  const getActionLabel = () => {
    if (status === 'Scheduled') return 'Check In';
    if (status === 'Waiting') return 'Call Back';
    if (status === 'In-Progress') return 'Check Out';
    return 'View Record';
  };

  const isActionDisabled = status === 'Checked-Out';

  const handleButtonClick = () => {
    if (status === 'Checked-Out') {
      onViewRecord(patient);
    } else {
      handleAction();
    }
  };

  const isDeleting = deletingId === id;

  return (
    <tr className="border-b hover:bg-gray-50 transition duration-150">
      <td className="p-4 text-sm font-medium text-gray-900">{patientId}</td>
      <td className="p-4 text-sm font-semibold text-gray-900">{name}</td>
      <td className="p-4 text-sm text-gray-500">{time}</td>
      <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{reason}</td>
      <td className="p-4 text-sm text-gray-700 font-medium hidden lg:table-cell">{doctor}</td>
      <td className="p-4 text-sm text-gray-500 hidden sm:table-cell">{arrival || '-'}</td>
      <td className="p-4">
        <StatusBadge status={status} />
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* View Record Button - Always Visible */}
          <button
            onClick={() => onViewRecord(patient)}
            className="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition duration-200"
            title="View Patient Record"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(id, name)}
            disabled={isDeleting}
            className={`p-2 rounded-lg transition duration-200 ${isDeleting 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
            }`}
            title="Delete Appointment"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
};


// --- Main Component ---
const Appointment = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [savingDetails, setSavingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { appointmentApi } = await import('../../../services/api');
      const data = await appointmentApi.getTodayAppointments();
      setPatients(data.map(appt => ({
        id: appt._id,
        patientId: appt.patientId, // The string ID like PAT000001
        name: appt.patientName,
        time: appt.time,
        reason: appt.reason || 'Consultation',
        doctor: appt.doctorName,
        status: appt.status.charAt(0).toUpperCase() + appt.status.slice(1),
        arrival: appt.updatedAt ? new Date(appt.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
      })));
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Function to update patient status (Check In/Out/Start Appt)
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { api } = await import('../../../services/api');
      const statusMap = {
        'Waiting': 'pending',
        'In-Progress': 'confirmed',
        'Checked-Out': 'completed'
      };

      const backendStatus = statusMap[newStatus] || newStatus.toLowerCase();
      await api.put(`/appointments/${id}`, { status: backendStatus });

      // Refresh list
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Function to view patient record
  const handleViewRecord = async (patient) => {
    try {
      setSelectedPatient(patient);
      setLoadingDetails(true);
      setIsEditing(false);
      const { patientApi } = await import('../../../services/api');
      const data = await patientApi.getByPatientId(patient.patientId);
      setPatientDetails(data);
      setEditFormData(data);
    } catch (error) {
      console.error('Error fetching patient details:', error);
      setPatientDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Function to save edited patient details
  const handleSavePatient = async () => {
    try {
      setSavingDetails(true);
      const { api } = await import('../../../services/api');
      const apiDefault = (await import('../../../services/api')).default;
      await apiDefault.put(`/patients/${editFormData._id}`, editFormData);
      setPatientDetails(editFormData);
      setIsEditing(false);
      alert('Patient details updated successfully!');
    } catch (error) {
      console.error('Error saving patient details:', error);
      alert('Failed to save patient details. Please try again.');
    } finally {
      setSavingDetails(false);
    }
  };

  // Function to handle edit form changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  // Function to delete appointment
  const handleDelete = async (id, patientName) => {
    if (window.confirm(`Are you sure you want to delete the appointment for ${patientName}? This action cannot be undone.`)) {
      try {
        setDeletingId(id);
        const { appointmentApi } = await import('../../../services/api');
        await appointmentApi.delete(id);
        // Refresh list
        fetchAppointments();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Failed to delete appointment. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const closeModal = () => {
    setSelectedPatient(null);
    setPatientDetails(null);
    setIsEditing(false);
    setEditFormData({});
  };

  // Filter and sort the patient list
  const filteredPatients = useMemo(() => {
    let list = patients;

    // 1. Filter by Status
    if (filterStatus !== 'All') {
      list = list.filter(p => p.status === filterStatus);
    }

    // 2. Filter by Search Term (Name or ID)
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(lowerCaseSearch) ||
          p.id.toLowerCase().includes(lowerCaseSearch)
      );
    }

    // 3. Sort (Prioritize Waiting, then In-Progress, then by Appointment Time)
    const statusOrder = { Waiting: 1, 'In-Progress': 2, Scheduled: 3, 'Checked-Out': 4 };
    list.sort((a, b) => {
      // Primary sort: Status priority
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Secondary sort: Appointment time (for Waiting/Scheduled patients)
      const timeA = new Date(`2000/01/01 ${a.time}`);
      const timeB = new Date(`2000/01/01 ${b.time}`);
      return timeA - timeB;
    });

    return list;
  }, [patients, searchTerm, filterStatus]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Paginate appointments
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

  // Generate status options for the filter dropdown
  const statusOptions = ['All', ...Object.keys(statusConfig)];

  // Summary counts for the dashboard cards
  const summaryCounts = useMemo(() => {
    return patients.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, { Scheduled: 0, Waiting: 0, 'In-Progress': 0, 'Checked-Out': 0 });
  }, [patients]);


  return (
    <div className="pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Clinic Patient Flow
        </h1>
        <button
          onClick={() => navigate('/receptionist/patients')}
          className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-md text-white bg-green-600 hover:bg-green-700 transition"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          New Patient
        </button>
      </div>

      <div className="">
        {/* Quick Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const CurrentIcon = config.icon; // <-- FIX: Define the icon component here
            return (
              <div
                key={status}
                className={`p-4 rounded-xl shadow-lg border-l-4 ${status === 'Waiting' ? 'border-yellow-500' : status === 'In-Progress' ? 'border-emerald-500' : 'border-gray-300'} bg-white`}
              >
                <div className="flex items-center">
                  <CurrentIcon className={`w-6 h-6 mr-3 ${config.color.split(' ')[0]}`} /> {/* <-- FIX: Use CurrentIcon */}
                  <div>
                    <p className="text-sm font-medium text-gray-500">{config.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryCounts[status]}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6 flex flex-col sm:flex-row gap-4 items-center">
          {/* Search Input */}
          <div className="relative w-full sm:w-2/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Patient Name or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-1/3">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition appearance-none"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === 'All' ? 'All Statuses' : statusConfig[status].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Patient Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient ID
                </th>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient Name
                </th>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appt Time
                </th>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Reason
                </th>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Doctor
                </th>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Arrival
                </th>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPatients.length > 0 ? (
                paginatedPatients.map(patient => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    onUpdateStatus={handleUpdateStatus}
                    onViewRecord={handleViewRecord}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-gray-500">
                    No patients match the current search or filter criteria.
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
          totalItems={filteredPatients.length}
          itemsPerPage={itemsPerPage}
        />

        {/* Accessibility Note */}
        <div className="mt-4 p-4 text-center text-xs text-gray-400">
          * List prioritizes 'Waiting', 'In-Progress', then 'Scheduled' patients.
        </div>

        {/* Patient Details Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Patient Record' : 'Patient Record'}</h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {loadingDetails ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : patientDetails ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Patient ID</p>
                        {isEditing ? (
                          <input
                            type="text"
                            name="patientId"
                            value={editFormData.patientId || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">{patientDetails.patientId}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        {isEditing ? (
                          <input
                            type="text"
                            name="fullName"
                            value={editFormData.fullName || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">{patientDetails.fullName}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Age</p>
                        {isEditing ? (
                          <input
                            type="number"
                            name="age"
                            value={editFormData.age || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">{patientDetails.age || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Gender</p>
                        {isEditing ? (
                          <select
                            name="gender"
                            value={editFormData.gender || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <p className="font-medium text-gray-900">{patientDetails.gender || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Blood Group</p>
                        {isEditing ? (
                          <select
                            name="bloodGroup"
                            value={editFormData.bloodGroup || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                          </select>
                        ) : (
                          <p className="font-medium text-gray-900">{patientDetails.bloodGroup || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        {isEditing ? (
                          <input
                            type="text"
                            name="mobile"
                            value={editFormData.mobile || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">{patientDetails.mobile}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Email</p>
                        {isEditing ? (
                          <input
                            type="email"
                            name="email"
                            value={editFormData.email || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">{patientDetails.email || 'N/A'}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Address</p>
                        {isEditing ? (
                          <input
                            type="text"
                            name="address"
                            value={editFormData.address || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">
                            {[patientDetails.address, patientDetails.city, patientDetails.state, patientDetails.zip]
                              .filter(Boolean).join(', ') || 'N/A'}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Assigned Doctor</p>
                        {isEditing ? (
                          <input
                            type="text"
                            name="assignedDoctor"
                            value={editFormData.assignedDoctor || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">{patientDetails.assignedDoctor || 'Unassigned'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Emergency Contact</p>
                        {isEditing ? (
                          <input
                            type="text"
                            name="emergencyContact"
                            value={editFormData.emergencyContact || ''}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Contact name & phone"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">
                            {patientDetails.emergencyContact ? `${patientDetails.emergencyContact} (${patientDetails.emergencyPhone})` : 'N/A'}
                          </p>
                        )}
                      </div>
                      {patientDetails.pastMedicalHistory && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Medical History</p>
                          {isEditing ? (
                            <textarea
                              name="pastMedicalHistory"
                              value={editFormData.pastMedicalHistory || ''}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              rows="3"
                            />
                          ) : (
                            <p className="font-medium text-gray-900">{patientDetails.pastMedicalHistory}</p>
                          )}
                        </div>
                      )}
                      {patientDetails.allergies && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Allergies</p>
                          {isEditing ? (
                            <textarea
                              name="allergies"
                              value={editFormData.allergies || ''}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              rows="2"
                            />
                          ) : (
                            <p className="font-medium text-red-600">{patientDetails.allergies}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>Patient details not found.</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t bg-gray-50 flex justify-between gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePatient}
                      disabled={savingDetails}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {savingDetails ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointment;