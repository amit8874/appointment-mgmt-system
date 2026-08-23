import React, { useState, useEffect } from 'react';
import { 
  Building, Phone, MapPin, User, Plus, Search, Filter, 
  Calendar, AlertTriangle, CheckCircle, Clock, Trash2, 
  Edit, Eye, MoreVertical, Truck, FileText, ChevronLeft, 
  ChevronRight, X, Sparkles, RefreshCw, Send, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { dentalLabApi, patientApi } from '../../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const LabWorkDashboard = () => {
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' or 'labs'
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [labs, setLabs] = useState([]);
  
  // Cases Filtering & Search State
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 15 });

  // Labs State & Modals
  const [showLabModal, setShowLabModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [labForm, setLabForm] = useState({ name: '', contactPerson: '', phone: '', address: '', notes: '' });
  const [savingLab, setSavingLab] = useState(false);

  // Case Details / Edit Case Modals
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [showEditCaseModal, setShowEditCaseModal] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [savingCase, setSavingCase] = useState(false);

  // Fetch Cases from API
  const fetchCases = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        filter: statusFilter,
        search: searchTerm,
        page,
        limit: pagination.limit
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await dentalLabApi.getCases(params);
      if (res?.success) {
        setCases(res.cases || []);
        setPagination(res.pagination || { total: 0, page: 1, pages: 1, limit: 15 });
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
      toast.error('Failed to fetch dental lab cases.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Labs from API
  const fetchLabs = async () => {
    try {
      setLoading(true);
      const data = await dentalLabApi.getLabs();
      setLabs(data || []);
    } catch (err) {
      console.error('Error fetching labs:', err);
      toast.error('Failed to load dental laboratories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cases') {
      fetchCases(1);
    } else {
      fetchLabs();
    }
  }, [activeTab, statusFilter, startDate, endDate]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (activeTab === 'cases') {
        fetchCases(1);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // Handle Lab Form submit (Create/Update)
  const handleLabSubmit = async (e) => {
    e.preventDefault();
    if (!labForm.name.trim()) {
      toast.error('Laboratory name is required');
      return;
    }

    setSavingLab(true);
    try {
      if (editingLab) {
        const updated = await dentalLabApi.updateLab(editingLab._id, labForm);
        if (updated) {
          toast.success('Laboratory updated successfully!');
          fetchLabs();
          setShowLabModal(false);
        }
      } else {
        const created = await dentalLabApi.createLab(labForm);
        if (created) {
          toast.success('Laboratory added successfully!');
          fetchLabs();
          setShowLabModal(false);
        }
      }
    } catch (err) {
      console.error('Error saving lab:', err);
      toast.error('Failed to save laboratory.');
    } finally {
      setSavingLab(false);
    }
  };

  // Open Lab Modal for edit
  const handleEditLabClick = (lab) => {
    setEditingLab(lab);
    setLabForm({
      name: lab.name || '',
      contactPerson: lab.contactPerson || '',
      phone: lab.phone || '',
      address: lab.address || '',
      notes: lab.notes || ''
    });
    setShowLabModal(true);
  };

  // Delete Lab
  const handleDeleteLabClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this laboratory?')) {
      try {
        await dentalLabApi.deleteLab(id);
        toast.success('Laboratory deleted successfully');
        fetchLabs();
      } catch (err) {
        console.error('Error deleting lab:', err);
        toast.error('Failed to delete laboratory.');
      }
    }
  };

  // Case Status One-Click Action
  const handleQuickStatusUpdate = async (caseId, status) => {
    try {
      const updated = await dentalLabApi.updateStatus(caseId, status);
      if (updated) {
        toast.success(`Case status updated to ${status}`);
        fetchCases(pagination.page);
        if (selectedCase && selectedCase._id === caseId) {
          setSelectedCase(updated);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update case status.');
    }
  };

  // Delete Case
  const handleDeleteCaseClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this lab case record? The patient record will remain intact.')) {
      try {
        await dentalLabApi.deleteCase(id);
        toast.success('Lab case record deleted successfully');
        fetchCases(pagination.page);
        setShowCaseDetails(false);
      } catch (err) {
        console.error('Error deleting case:', err);
        toast.error('Failed to delete case.');
      }
    }
  };

  // Handle Edit Case Submit
  const handleEditCaseSubmit = async (e) => {
    e.preventDefault();
    setSavingCase(true);
    try {
      const updated = await dentalLabApi.updateCase(editingCase._id, editingCase);
      if (updated) {
        toast.success('Lab case updated successfully!');
        fetchCases(pagination.page);
        setShowEditCaseModal(false);
        if (selectedCase && selectedCase._id === editingCase._id) {
          setSelectedCase(updated);
        }
      }
    } catch (err) {
      console.error('Error updating case:', err);
      toast.error('Failed to update lab case details.');
    } finally {
      setSavingCase(false);
    }
  };

  const statusColors = {
    'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
    'Sent to Lab': 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    'Received': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Delivered': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Cancelled': 'bg-rose-50 text-rose-700 border-rose-200'
  };

  // Compute if a case is overdue
  const isCaseOverdue = (item) => {
    if (!item.expectedReturnDate) return false;
    const isCompleted = ['Received', 'Delivered', 'Cancelled'].includes(item.status);
    const returnDate = new Date(item.expectedReturnDate);
    return !isCompleted && returnDate < new Date();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Dental Lab Cases & Lab Work Tracking
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Monitor prosthesis fabrication processes, delivery expected times and external laboratories.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 dark:bg-gray-700 p-1.5 rounded-2xl border border-slate-200/50 dark:border-gray-600 w-fit">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'cases'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5'
                : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Track Cases
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'labs'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5'
                : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Laboratories
          </button>
        </div>
      </div>

      {activeTab === 'cases' ? (
        // ==========================================
        // CASES DASHBOARD TAB
        // ==========================================
        <div className="space-y-6">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-gray-800/40 p-2.5 rounded-2xl border border-slate-100 dark:border-gray-700/50">
            <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest pl-2 pr-1 select-none">
              Status Filter:
            </span>
            {['All', 'With Lab', 'In Progress', 'Received', 'Delivered', 'Overdue'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  statusFilter === filter
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 hover:border-indigo-200 dark:hover:border-indigo-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Search and Date Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white dark:bg-gray-800 p-5 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-sm">
            {/* Text Search */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Patient name, Case ID, Lab name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Cases Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading cases list...</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-gray-500 text-center">
                <FileText className="w-12 h-12 mb-3 text-indigo-500 opacity-40 animate-pulse" />
                <p className="text-base font-bold">No Dental Lab Cases Found</p>
                <p className="text-xs opacity-75 mt-1">Try resetting filters or checking another search keyword.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Tooth No.</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Type / Prosthesis</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Laboratory</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Case ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                    {cases.map((item) => {
                      const overdue = isCaseOverdue(item);
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/40 dark:hover:bg-gray-900/10 transition-colors">
                          {/* Patient */}
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-800 dark:text-white text-sm uppercase">{item.patientName}</div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Dr. {item.dentistName}</div>
                          </td>
                          {/* Tooth No */}
                          <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 text-sm">
                            {item.toothNumbers?.join(', ') || '—'}
                          </td>
                          {/* Tooth Type */}
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-slate-50 dark:bg-gray-900/60 border border-slate-200/60 dark:border-gray-700 rounded-lg text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                              {item.toothType === 'Other' ? item.toothTypeCustom : item.toothType}
                            </span>
                          </td>
                          {/* Lab Name */}
                          <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm uppercase">
                            {item.laboratoryName}
                          </td>
                          {/* Case ID */}
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-gray-900 px-2 py-0.5 rounded border border-slate-200/40 dark:border-gray-800">
                              {item.caseId}
                            </span>
                          </td>
                          {/* Dates */}
                          <td className="px-6 py-4">
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-semibold">Sent:</span>
                              {format(new Date(item.sendingDate), 'dd MMM yyyy')}
                            </div>
                            {item.expectedReturnDate && (
                              <div className={`text-xs mt-1 font-bold ${overdue ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-semibold">Expected:</span>
                                {format(new Date(item.expectedReturnDate), 'dd MMM yyyy')}
                                {overdue && <span className="inline-block ml-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded">Overdue</span>}
                              </div>
                            )}
                            {item.receivedDate && (
                              <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 font-bold">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-semibold">Received:</span>
                                {format(new Date(item.receivedDate), 'dd MMM yyyy')}
                              </div>
                            )}
                          </td>
                          {/* Status */}
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusColors[item.status] || 'bg-slate-50 text-slate-600'}`}>
                              {item.status}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setSelectedCase(item); setShowCaseDetails(true); }}
                                className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 cursor-pointer"
                                title="View details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => { setEditingCase(JSON.parse(JSON.stringify(item))); setShowEditCaseModal(true); }}
                                className="p-1.5 bg-slate-50 dark:bg-gray-700 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 cursor-pointer"
                                title="Edit case"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {item.status !== 'Received' && item.status !== 'Delivered' && (
                                <button
                                  onClick={() => handleQuickStatusUpdate(item._id, 'Received')}
                                  className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 cursor-pointer"
                                  title="Mark as Received (Log Today's Date)"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {item.status === 'Received' && (
                                <button
                                  onClick={() => handleQuickStatusUpdate(item._id, 'Delivered')}
                                  className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 cursor-pointer"
                                  title="Mark as Delivered"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteCaseClick(item._id)}
                                className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-100 cursor-pointer"
                                title="Delete case record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-gray-700 bg-slate-50/30">
                <span className="text-xs text-slate-500 font-medium">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} cases)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchCases(pagination.page - 1)}
                    className="p-1.5 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-900 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchCases(pagination.page + 1)}
                    className="p-1.5 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-900 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ==========================================
        // LABORATORIES MANAGEMENT TAB
        // ==========================================
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-5 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-sm">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Saved Laboratories</h2>
              <p className="text-xs text-slate-400 font-semibold">Manage lists of clinics' external laboratories.</p>
            </div>
            <button
              onClick={() => {
                setEditingLab(null);
                setLabForm({ name: '', contactPerson: '', phone: '', address: '', notes: '' });
                setShowLabModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl tracking-wider shadow-md shadow-indigo-600/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Laboratory
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labs.map((lab) => (
              <div 
                key={lab._id} 
                className="bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3 border-b border-slate-100 dark:border-gray-700 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Building className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{lab.name}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleEditLabClick(lab)}
                        className="p-1.5 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 text-slate-500 dark:text-slate-400 rounded-lg cursor-pointer"
                        title="Edit lab details"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteLabClick(lab._id)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-500 dark:text-rose-400 rounded-lg cursor-pointer"
                        title="Delete laboratory"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-4">
                    {lab.contactPerson && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lab.contactPerson} (Contact Person)</span>
                      </div>
                    )}
                    {lab.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lab.phone}</span>
                      </div>
                    )}
                    {lab.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{lab.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {lab.notes && (
                  <div className="mt-auto p-3 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800">
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium italic">"{lab.notes}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
      // MODAL: ADD / EDIT LABORATORY
      // ========================================== */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/50 dark:border-gray-700 animate-fade">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">
                  {editingLab ? 'Edit Dental Laboratory' : 'Add Dental Laboratory'}
                </h3>
                <p className="text-xs opacity-80 font-medium">Save clinic's laboratory partner for future cases.</p>
              </div>
              <button 
                onClick={() => setShowLabModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLabSubmit} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Lab Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Dental Laboratory"
                  value={labForm.name}
                  onChange={(e) => setLabForm({ ...labForm, name: e.target.value })}
                  className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={labForm.contactPerson}
                    onChange={(e) => setLabForm({ ...labForm, contactPerson: e.target.value })}
                    className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={labForm.phone}
                    onChange={(e) => setLabForm({ ...labForm, phone: e.target.value })}
                    className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Sector-4, Rohini, New Delhi"
                  value={labForm.address}
                  onChange={(e) => setLabForm({ ...labForm, address: e.target.value })}
                  className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Additional details about services, pricing, logistics..."
                  value={labForm.notes}
                  onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })}
                  className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLab}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                >
                  {savingLab ? 'Saving...' : 'Save Laboratory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
      // MODAL: DENTAL LAB CASE DETAILS (timeline view)
      // ========================================== */}
      {showCaseDetails && selectedCase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/50 dark:border-gray-700 animate-fade">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">Dental Lab Case Sheet</h3>
                <p className="text-xs opacity-80 font-medium">Tracking code: {selectedCase.caseId} (Lab Partner: {selectedCase.laboratoryName})</p>
              </div>
              <button 
                onClick={() => setShowCaseDetails(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Interactive Timeline */}
              <div className="bg-slate-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-slate-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                  Interactive Status Timeline (Click state to transition):
                </p>
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                  {['Draft', 'Sent to Lab', 'In Progress', 'Received', 'Delivered'].map((step, idx) => {
                    const steps = ['Draft', 'Sent to Lab', 'In Progress', 'Received', 'Delivered'];
                    const currentIdx = steps.indexOf(selectedCase.status);
                    const isActive = steps.indexOf(step) <= currentIdx;
                    const isCurrent = selectedCase.status === step;
                    
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => handleQuickStatusUpdate(selectedCase._id, step)}
                        className={`flex-1 flex items-center justify-center py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400'
                            : 'bg-white dark:bg-gray-850 border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500 hover:border-slate-300'
                        }`}
                      >
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></span>}
                        {step}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Case details sheet */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs font-semibold border-b border-slate-100 dark:border-gray-700 pb-5">
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5">Patient Name</span>
                  <span className="text-slate-800 dark:text-white uppercase font-black text-sm">{selectedCase.patientName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5">Dentist / Doctor</span>
                  <span className="text-slate-700 dark:text-slate-300">Dr. {selectedCase.dentistName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5">Tooth Numbers (FDI)</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-900 border border-slate-200/50 dark:border-gray-800 rounded font-black text-slate-800 dark:text-slate-200 w-fit block mt-0.5">
                    {selectedCase.toothNumbers?.join(', ') || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5">Prosthesis Type</span>
                  <span className="text-slate-700 dark:text-slate-300 uppercase font-black">
                    {selectedCase.toothType === 'Other' ? selectedCase.toothTypeCustom : selectedCase.toothType}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5">Lab Name</span>
                  <span className="text-slate-700 dark:text-slate-300 uppercase font-black">{selectedCase.laboratoryName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5">Case Reference ID</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedCase.caseId}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5">Sending Date</span>
                  <span className="text-slate-700 dark:text-slate-300">{format(new Date(selectedCase.sendingDate), 'dd MMMM yyyy')}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5">Expected Return Date</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {selectedCase.expectedReturnDate ? format(new Date(selectedCase.expectedReturnDate), 'dd MMMM yyyy') : 'Not Scheduled'}
                  </span>
                </div>
                {selectedCase.receivedDate && (
                  <div>
                    <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-0.5 text-emerald-600 dark:text-emerald-500">Received Date</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{format(new Date(selectedCase.receivedDate), 'dd MMMM yyyy')}</span>
                  </div>
                )}
              </div>

              {/* Instructions field */}
              {selectedCase.instructions && Object.values(selectedCase.instructions).some(v => v) && (
                <div className="bg-indigo-50/20 dark:bg-indigo-950/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                  <p className="text-[9px] font-black text-indigo-900/60 dark:text-indigo-400 uppercase tracking-widest mb-3">Lab Prescription Instructions:</p>
                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                    {selectedCase.instructions.shade && (
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Shade</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedCase.instructions.shade}</span>
                      </div>
                    )}
                    {selectedCase.instructions.material && (
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Material</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedCase.instructions.material}</span>
                      </div>
                    )}
                    {selectedCase.instructions.design && (
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Design</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedCase.instructions.design}</span>
                      </div>
                    )}
                    {selectedCase.instructions.occlusion && (
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Occlusion</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedCase.instructions.occlusion}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCase.notes && (
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-1.5">Additional Notes</span>
                  <div className="bg-slate-50 dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    "{selectedCase.notes}"
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedCase.attachments && selectedCase.attachments.length > 0 && (
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block tracking-wider font-bold mb-2">Attachments</span>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedCase.attachments.map((file, i) => (
                      <a 
                        key={i} 
                        href={file.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-900 text-center transition-colors select-none"
                      >
                        <FileText className="w-6 h-6 text-indigo-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate w-full uppercase">{file.filename || `File ${i+1}`}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="bg-slate-50 dark:bg-gray-900/60 border-t border-slate-100 dark:border-gray-700 px-6 py-4 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteCaseClick(selectedCase._id)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Delete Record
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCase(JSON.parse(JSON.stringify(selectedCase)));
                    setShowEditCaseModal(true);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => setShowCaseDetails(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
      // MODAL: EDIT LAB CASE DETAILS
      // ========================================== */}
      {showEditCaseModal && editingCase && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/50 dark:border-gray-700 animate-fade">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">Edit Dental Lab Case</h3>
                <p className="text-xs opacity-80 font-medium">Update status, expected dates and clinical instructions.</p>
              </div>
              <button 
                onClick={() => setShowEditCaseModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditCaseSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Case ID</label>
                  <input
                    type="text"
                    required
                    value={editingCase.caseId}
                    onChange={(e) => setEditingCase({ ...editingCase, caseId: e.target.value })}
                    className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Status</label>
                  <select
                    value={editingCase.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      const updates = { ...editingCase, status: newStatus };
                      if (newStatus === 'Received' && !editingCase.receivedDate) {
                        updates.receivedDate = new Date().toISOString().split('T')[0];
                      }
                      setEditingCase(updates);
                    }}
                    className="border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    {['Draft', 'Sent to Lab', 'In Progress', 'Received', 'Delivered', 'Cancelled'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Sending Date</label>
                  <input
                    type="date"
                    required
                    value={editingCase.sendingDate ? new Date(editingCase.sendingDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingCase({ ...editingCase, sendingDate: e.target.value })}
                    className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Expected Return Date</label>
                  <input
                    type="date"
                    value={editingCase.expectedReturnDate ? new Date(editingCase.expectedReturnDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingCase({ ...editingCase, expectedReturnDate: e.target.value })}
                    className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {editingCase.status === 'Received' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Received Date</label>
                  <input
                    type="date"
                    value={editingCase.receivedDate ? new Date(editingCase.receivedDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingCase({ ...editingCase, receivedDate: e.target.value })}
                    className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              )}

              {/* Lab instructions */}
              <div className="bg-slate-50 dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 space-y-3">
                <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Prescription Instructions:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Shade (e.g. A1, A2)</label>
                    <input
                      type="text"
                      value={editingCase.instructions?.shade || ''}
                      onChange={(e) => setEditingCase({ 
                        ...editingCase, 
                        instructions: { ...editingCase.instructions, shade: e.target.value } 
                      })}
                      className="border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Material</label>
                    <input
                      type="text"
                      value={editingCase.instructions?.material || ''}
                      onChange={(e) => setEditingCase({ 
                        ...editingCase, 
                        instructions: { ...editingCase.instructions, material: e.target.value } 
                      })}
                      className="border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Design</label>
                    <input
                      type="text"
                      value={editingCase.instructions?.design || ''}
                      onChange={(e) => setEditingCase({ 
                        ...editingCase, 
                        instructions: { ...editingCase.instructions, design: e.target.value } 
                      })}
                      className="border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Occlusion</label>
                    <input
                      type="text"
                      value={editingCase.instructions?.occlusion || ''}
                      onChange={(e) => setEditingCase({ 
                        ...editingCase, 
                        instructions: { ...editingCase.instructions, occlusion: e.target.value } 
                      })}
                      className="border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Notes</label>
                <textarea
                  rows={3}
                  value={editingCase.notes || ''}
                  onChange={(e) => setEditingCase({ ...editingCase, notes: e.target.value })}
                  className="border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowEditCaseModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCase}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                >
                  {savingCase ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LabWorkDashboard;
