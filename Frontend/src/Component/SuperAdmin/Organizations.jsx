import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Organizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, currentPage: 1 });
  const [processingId, setProcessingId] = useState(null);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [newTrialEndDate, setNewTrialEndDate] = useState('');
  const [isUpdatingTrial, setIsUpdatingTrial] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations();
  }, [filters]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getOrganizations(filters);
      setOrganizations(data.organizations || []);
      setPagination({
        total: data.total || 0,
        totalPages: data.totalPages || 1,
        currentPage: data.currentPage || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orgId, newStatus) => {
    try {
      setProcessingId(orgId);
      await superAdminApi.updateOrganizationStatus(orgId, newStatus);
      fetchOrganizations();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleUpdateTrial = async (e) => {
    e.preventDefault();
    if (!selectedOrg || !newTrialEndDate) return;
    
    try {
      setIsUpdatingTrial(true);
      await superAdminApi.updateTrialPeriod(selectedOrg._id, newTrialEndDate);
      setShowTrialModal(false);
      fetchOrganizations();
      alert('Trial period updated successfully');
    } catch (err) {
      alert('Failed to update trial period: ' + err.message);
    } finally {
      setIsUpdatingTrial(false);
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!selectedOrg || !selectedPlan) return;
    
    try {
      setIsUpdatingPlan(true);
      await superAdminApi.updateOrganizationPlan(selectedOrg._id, selectedPlan);
      setShowPlanModal(false);
      fetchOrganizations();
      alert(`Organization successfully upgraded to ${selectedPlan.toUpperCase()} plan`);
    } catch (err) {
      alert('Failed to upgrade plan: ' + err.message);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const openTrialModal = (e, org) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedOrg(org);
    
    // Format date for input[type="date"] (YYYY-MM-DD)
    try {
      const dateStr = org.trialEndDate;
      let dateObj;
      
      if (dateStr && !isNaN(new Date(dateStr).getTime())) {
        dateObj = new Date(dateStr);
      } else {
        dateObj = new Date();
      }
      
      setNewTrialEndDate(dateObj.toISOString().split('T')[0]);
    } catch (err) {
      console.error('Date parsing error:', err);
      // Fallback to today if parsing fails
      setNewTrialEndDate(new Date().toISOString().split('T')[0]);
    }
    
    setShowTrialModal(true);
  };

  const openPlanModal = (e, org) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedOrg(org);
    setSelectedPlan(org.subscriptionId?.plan || 'basic');
    setShowPlanModal(true);
  };

  const getDisplayStatus = (org) => {
    // Check trial status first
    if (org.isTrialActive === false && org.status !== 'active') {
      return 'Trial Expired';
    }
    if (org.isTrialActive && org.status === 'trial') {
      return 'Trial Active';
    }
    if (org.status === 'active') {
      return 'Active';
    }
    if (org.status === 'inactive' || org.status === 'suspended') {
      return 'Deactivated';
    }
    return org.status || 'Unknown';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Deactivated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Trial Active':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Trial Expired':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && organizations.length === 0) {
    return <div className="p-8 text-center">Loading organizations...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organizations Management</h1>
            <p className="text-gray-500 mt-1">Manage and control organization access</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/superadmin/manage-organizations')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              View Credentials
            </button>
            <button
              onClick={() => navigate('/superadmin/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search organizations..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
              <option value="trial">Trial Active</option>
              <option value="expired">Trial Expired</option>
            </select>
            <div className="md:col-span-2 flex items-center justify-end">
              <span className="text-sm text-gray-500">
                Total: {pagination.total} organizations
              </span>
            </div>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Organization Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trial Start Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trial End Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Activation Control</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => {
                  const displayStatus = getDisplayStatus(org);
                  const isActive = displayStatus === 'Active';
                  const isProcessing = processingId === org._id;
                  
                  return (
                    <tr key={org._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            {org.name?.charAt(0).toUpperCase() || 'O'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{org.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{org.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{formatDate(org.trialStartDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{formatDate(org.trialEndDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(displayStatus)}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <button
                              onClick={() => handleStatusChange(org._id, 'inactive')}
                              disabled={isProcessing}
                              className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 019.08 14.89l8.363 3.78-3.78 8.363-8.364-3.78zM10 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                              )}
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(org._id, 'active')}
                              disabled={isProcessing}
                              className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              Activate
                            </button>
                          )}
                          
                          <button
                            type="button"
                            onClick={(e) => openTrialModal(e, org)}
                            className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
                            title="Adjust Trial Period"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Edit Trial
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => openPlanModal(e, org)}
                            className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition text-sm font-medium"
                            title="Upgrade Organization Plan"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM5 10a5 5 0 1110 0 5 5 0 01-10 0z" clipRule="evenodd" />
                            </svg>
                            Upgrade Plan
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trial Update Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
          {/* Enhanced Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity z-[10000]" 
            onClick={() => setShowTrialModal(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative w-full max-w-lg mx-auto z-[10001] transform transition-all duration-300">
            <div className="bg-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-5 mb-8">
                  <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-50 shadow-inner">
                    <svg className="h-7 w-7 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight" id="modal-title">
                      Adjust Trial Period
                    </h3>
                    <p className="text-gray-500 font-medium">
                      Managing trial for <span className="text-indigo-600 font-bold">{selectedOrg?.name}</span>
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-sm font-bold text-gray-700 mb-2 transition-colors group-focus-within:text-indigo-600">
                      New Trial Expiration Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={newTrialEndDate}
                        onChange={(e) => setNewTrialEndDate(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-semibold text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100 flex gap-3">
                    <div className="h-6 w-6 mt-0.5 flex-shrink-0 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-blue-800 leading-relaxed font-medium">
                      Extending the date beyond today will <span className="font-bold underline">reactivate</span> the organization. Shortening it will expire the account immediately.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50/80 px-8 py-5 flex flex-row-reverse gap-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={(e) => handleUpdateTrial(e)}
                  disabled={isUpdatingTrial}
                  className="inline-flex justify-center rounded-2xl px-8 py-3.5 bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isUpdatingTrial ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4" />
                      </svg>
                      Updating...
                    </span>
                  ) : 'Confirm Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTrialModal(false)}
                  className="inline-flex justify-center rounded-2xl px-8 py-3.5 bg-white text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 focus:outline-none transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Plan Upgrade Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity z-[10000]" 
            onClick={() => setShowPlanModal(false)}
          ></div>
          
          <div className="relative w-full max-w-lg mx-auto z-[10001] transform transition-all duration-300">
            <div className="bg-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-5 mb-8">
                  <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-50 shadow-inner">
                    <svg className="h-7 w-7 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                      Manual Plan Upgrade
                    </h3>
                    <p className="text-gray-500 font-medium">
                      Upgrading <span className="text-amber-600 font-bold">{selectedOrg?.name}</span>
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'basic', name: 'Basic Plan', price: '₹299', color: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
                      { id: 'pro', name: 'Standard Plan', price: '₹499', color: 'border-blue-500 text-blue-700 bg-blue-50' },
                      { id: 'enterprise', name: 'Premium Plan', price: '₹699', color: 'border-purple-500 text-purple-700 bg-purple-50' }
                    ].map((plan) => (
                      <label 
                        key={plan.id}
                        className={`relative flex items-center p-4 cursor-pointer rounded-2xl border-2 transition-all ${
                          selectedPlan === plan.id ? plan.color : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="plan"
                          value={plan.id}
                          checked={selectedPlan === plan.id}
                          onChange={(e) => setSelectedPlan(e.target.value)}
                          className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <div className="ml-4 flex flex-col">
                          <span className="block text-lg font-bold">{plan.name}</span>
                          <span className="block text-sm font-medium opacity-70">Official Price: {plan.price}/mo</span>
                        </div>
                        {selectedPlan === plan.id && (
                          <div className="ml-auto">
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <div className="h-6 w-6 mt-0.5 flex-shrink-0 bg-amber-500 rounded-full flex items-center justify-center text-white">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-amber-800 leading-relaxed font-medium">
                      This manual upgrade will process with <span className="font-bold underline">₹0 charge</span> and set the subscription expiration to 1 month from today.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50/80 px-8 py-5 flex flex-row-reverse gap-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={(e) => handleUpdatePlan(e)}
                  disabled={isUpdatingPlan}
                  className="inline-flex justify-center rounded-2xl px-8 py-3.5 bg-amber-600 text-sm font-bold text-white hover:bg-amber-700 shadow-xl shadow-amber-100 transition-all disabled:opacity-50"
                >
                  {isUpdatingPlan ? 'Upgrading...' : 'Confirm Upgrade'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="inline-flex justify-center rounded-2xl px-8 py-3.5 bg-white text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
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

export default Organizations;
