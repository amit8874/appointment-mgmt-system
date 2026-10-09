import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ChevronLeft, Shield, UserSearch, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ManageOrganisation = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleImpersonate = async (org) => {
    if (!org.ownerId) {
      toast.error('Owner ID not found');
      return;
    }

    try {
      toast.info(`Starting Shadow Mode for ${org.name}...`);
      
      const currentToken = localStorage.getItem('token');
      const currentUserData = localStorage.getItem('userData');
      const currentRole = localStorage.getItem('role');

      if (currentToken && currentUserData) {
        localStorage.setItem('originalToken', currentToken);
        localStorage.setItem('originalUserData', currentUserData);
        localStorage.setItem('originalRole', currentRole);
      }

      const response = await superAdminApi.impersonateUser(org.ownerId);
      login(response.user);
      
      toast.success(`Shadow Mode active: Logging in as ${org.ownerName}`);
      
      if (response.user.role === 'orgadmin' || response.user.role === 'admin') {
        navigate('/organization-dashboard');
      } else {
        navigate('/admin-dashboard');
      }
    } catch (err) {
      console.error('Impersonation failed:', err);
      toast.error(err.response?.data?.message || 'Shadow Mode failed');
    }
  };

  const openDeleteModal = (org) => {
    setOrgToDelete(org);
    setConfirmDeleteInput('');
    setShowDeleteModal(true);
  };

  const handleDeleteOrganization = async () => {
    if (!orgToDelete) return;
    if (confirmDeleteInput.trim().toLowerCase() !== orgToDelete.name.trim().toLowerCase()) {
      toast.error(`Please type "${orgToDelete.name}" accurately to confirm.`);
      return;
    }

    try {
      setIsDeleting(true);
      await superAdminApi.deleteOrganization(orgToDelete._id);
      toast.success(`Organization "${orgToDelete.name}" deleted permanently.`);
      setShowDeleteModal(false);
      setOrgToDelete(null);
      fetchOrganizations();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete organization');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getOrganizationsWithCredentials();
      setOrganizations(data.organizations || []);
    } catch (err) {
      setError(err.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (orgId) => {
    setShowPasswords(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.subdomain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Error: {error}</p>
          <button
            onClick={fetchOrganizations}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Organizations</h1>
            <p className="text-gray-600 mt-1">
              Total Organizations: {organizations.length}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 font-bold border border-slate-200 shadow-sm"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, subdomain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Organizations Grid */}
        {filteredOrganizations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500 text-lg">No organizations found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {filteredOrganizations.map((org) => (
              <div
                key={org._id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Organization Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                  <div className="flex justify-between items-start">
                    <div className="text-white">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold truncate">{org.name}</h3>
                        {(org.isBranch || org.parentOrganizationId) && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-white/20 text-white rounded-full border border-white/30 backdrop-blur-sm">
                            Branch of {org.parentOrgName || 'Parent Clinic'}
                          </span>
                        )}
                      </div>
                      <p className="text-blue-100 text-sm">{org.subdomain}</p>
                      {org.branches && org.branches.length > 0 && (
                        <div className="mt-1.5 text-xs font-semibold text-blue-100 bg-white/15 px-2.5 py-1 rounded-md border border-white/20 inline-block">
                          🏢 {org.branches.length} Branch{org.branches.length > 1 ? 'es' : ''}: {org.branches.map(b => b.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(org.status)}`}>
                      {org.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleImpersonate(org)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all border border-white/30 backdrop-blur-sm group"
                    >
                      <UserSearch size={14} className="group-hover:scale-110 transition-transform" />
                      Shadow Mode
                    </button>
                    <button
                      onClick={() => openDeleteModal(org)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all border border-red-400/30 backdrop-blur-sm"
                      title="Delete Organization Permanently"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Organization Details */}
                <div className="p-5">
                  {/* Basic Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500">Organization Email</p>
                        <p className="text-sm font-medium text-gray-900">{org.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-gray-900">{org.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm font-medium text-gray-900">
                          {org.address?.city || org.address?.state ? 
                            `${org.address?.city || ''}, ${org.address?.state || ''}`.trim() : 
                            'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <hr className="my-4 border-gray-200" />

                  {/* Owner Credentials */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Owner Credentials
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Owner Name:</span>
                        <span className="text-sm font-medium text-gray-900">{org.ownerName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Owner Email (ID):</span>
                        <span className="text-sm font-medium text-gray-900">{org.ownerEmail}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium text-gray-900 bg-white px-2 py-1 rounded border">
                            {showPasswords[org._id] ? org.ownerPassword : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePassword(org._id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title={showPasswords[org._id] ? 'Hide password' : 'Show password'}
                          >
                            {showPasswords[org._id] ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  {org.subscription && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Plan</p>
                          <p className="text-sm font-medium text-gray-900">{org.subscription.planName || org.subscription.plan}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          org.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {org.subscription.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Created: {org.createdAt ? new Date(org.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity z-[10000]" 
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          ></div>
          
          <div className="relative w-full max-w-lg mx-auto z-[10001] transform transition-all duration-300">
            <div className="bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-red-100 text-red-600 shadow-inner">
                    <Trash2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                      Delete Organization Permanently
                    </h3>
                    <p className="text-red-600 font-bold text-sm">
                      This action is permanent and irreversible!
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
                    <p className="text-xs text-red-900 font-medium leading-relaxed">
                      You are about to permanently delete <strong className="font-bold underline">{orgToDelete?.name}</strong>. 
                      All associated users, doctors, staff, patients, appointments, medical records, billing invoices, prescriptions, and inventory will be <span className="font-bold uppercase tracking-wider text-red-700">permanently erased</span>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      To confirm, type <span className="text-red-600 font-bold select-all">"{orgToDelete?.name}"</span> below:
                    </label>
                    <input
                      type="text"
                      value={confirmDeleteInput}
                      onChange={(e) => setConfirmDeleteInput(e.target.value)}
                      placeholder={orgToDelete?.name}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none font-medium text-gray-900 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-8 py-5 flex flex-row-reverse gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteOrganization}
                  disabled={isDeleting || confirmDeleteInput.trim().toLowerCase() !== orgToDelete?.name?.trim().toLowerCase()}
                  className="inline-flex justify-center items-center rounded-xl px-6 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 focus:outline-none transition-all shadow-lg shadow-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="inline-flex justify-center rounded-xl px-6 py-3 bg-white text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageOrganisation;
