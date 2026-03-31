import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Edit, Eye, EyeOff, X, User, Search, Activity, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/common/Pagination';

const UserManagementPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    role: 'receptionist'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      if (response.status === 200) {
        const allUsers = response.data;
        // Filter users to show only doctor, receptionist, and patient roles
        const filteredUsers = allUsers
          .filter(u => ['doctor', 'receptionist', 'patient'].includes(u.role))
          .map(u => ({ ...u, _id: u._id || u.id }));
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'superadmin' || user?.role === 'orgadmin' || user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const totalPages = Math.ceil(users.length / itemsPerPage);

  // Debounced Search for Patients
  useEffect(() => {
    const searchPatients = async () => {
      if (formData.role !== 'patient' || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await api.get(`/patients/search-available?query=${searchQuery}`);
        setSearchResults(response.data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchPatients, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, formData.role]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      name: patient.fullName,
      mobile: patient.mobile,
      age: patient.age,
      gender: patient.gender,
      patientObjectId: patient._id
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  // Paginate users
  const paginatedUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle creating/registering user
  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.role === 'patient' && !formData.name) {
      toast.error('Please select a patient or enter a name.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/create-user', formData);
      toast.success(response.data.message || 'User registered successfully');
      setIsModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register user');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', mobile: '', password: '', role: 'receptionist' });
    setSearchQuery('');
    setSelectedPatient(null);
  };

  // Handle deleting user
  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        const response = await api.delete(`/auth/delete-user/${userId}`);

        if (response.status === 200) {
          setUsers(prev => prev.filter(u => (u._id || u.id) !== userId));
          toast.success('User deleted successfully!');
        } else {
          const error = response.data;
          toast.error(`Error deleting user: ${error.message}`);
        }
      } catch (error) {
        toast.error('Error deleting user. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
            User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium text-slate-400">Manage Doctors, Receptionists and Patients</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 italic">Users</h3>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading secure user data...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-gray-700/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-600">
            <User className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-400 font-medium">No users found. Click "Add User" to get started.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">User Info</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Mobile</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-gray-700/50">
                  {paginatedUsers.map((userItem) => (
                    <tr key={userItem._id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                            {userItem.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-gray-200">{userItem.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Member since {new Date(userItem.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-gray-300">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          userItem.role === 'doctor' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' :
                          userItem.role === 'receptionist' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        }`}>
                          {userItem.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600 dark:text-gray-300">
                        {userItem.mobile}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteUser(userItem._id, userItem.name)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={users.length}
              itemsPerPage={itemsPerPage}
            />
          </>
        )}
      </div>

      {/* Add New User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-gray-700">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Add New User</h2>
                  <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest font-black italic">Organization Staff</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                {/* 1. SELECT ROLE AT TOP */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Role</label>
                  <select
                    className="w-full px-4 py-4 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800 dark:text-white appearance-none cursor-pointer"
                    value={formData.role}
                    onChange={(e) => {
                      resetForm();
                      setFormData({ ...formData, role: e.target.value });
                    }}
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="doctor">Doctor</option>
                    <option value="patient">Patient</option>
                  </select>
                </div>

                {/* 2. SEARCH FOR PATIENT OR FULL NAME */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {formData.role === 'patient' ? 'Search & Select Patient' : 'Full Name'}
                  </label>
                  
                  {formData.role === 'patient' ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full px-4 py-4 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 dark:text-white pl-12"
                          placeholder="Search Name, Mobile or ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        {isSearching && (
                          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={18} />
                        )}
                      </div>

                      {/* Search Results Dropdown */}
                      {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                          {searchResults.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => handleSelectPatient(p)}
                              className="w-full p-4 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-slate-50 dark:border-gray-700/50 last:border-0 transition-colors group"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{p.fullName}</p>
                                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.patientId} • {p.mobile}</p>
                                </div>
                                <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Selected Patient Preview */}
                      {selectedPatient && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-lg shadow-blue-200">
                              {selectedPatient.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-blue-900 dark:text-blue-200">{selectedPatient.fullName}</p>
                              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Selected Clinical Record</p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => { setSelectedPatient(null); setFormData(p => ({ ...p, name: '', mobile: '' })); }}
                            className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-4 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 dark:text-white"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  )}
                </div>

                {/* 3. MOBILE NUMBER (READ-ONLY IF LINKED) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    readOnly={!!selectedPatient}
                    className={`w-full px-4 py-4 ${selectedPatient ? 'bg-slate-100 dark:bg-gray-800 text-slate-400 cursor-not-allowed' : 'bg-slate-50 dark:bg-gray-700/50'} border border-slate-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 dark:text-white`}
                    placeholder="10-digit number"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                  {selectedPatient && <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1 ml-1">Locked to Patient's Clinical ID</p>}
                </div>

                <div className="space-y-2 pb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Set Account Password</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      className="w-full px-4 py-4 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 dark:text-white pr-12"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-blue-500/25 active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Authorizing...' : 'Create Account'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPanel;
