import React, { useState, useEffect } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, Eye, Calendar, Filter,
  FileSpreadsheet, FileDown, X, Upload, CheckCircle2, AlertCircle,
  Clock, RefreshCw, ChevronLeft, ChevronRight, Info, IndianRupee, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { expenseApi, commonApi } from '../../../services/api';
import RecordVault from './RecordVault';

const DentalEquipment = () => {
  // Lists and loading states
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Form Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Form fields state
  const [formData, setFormData] = useState({
    equipmentName: '',
    brand: '',
    modelNumber: '',
    vendor: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    warrantyExpiryDate: '',
    quantity: 1,
    unitPrice: 0,
    gstAmount: 0,
    totalAmount: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    notes: '',
    invoiceUrl: '',
    invoicePublicId: ''
  });

  // Uploading file state
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  // KPI / Stats states
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0
  });

  // Fetch expenses on change of filters or page
  useEffect(() => {
    fetchExpenses();
  }, [searchTerm, filterType, customStartDate, customEndDate, currentPage]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        filterType,
        startDate: filterType === 'custom' ? customStartDate : undefined,
        endDate: filterType === 'custom' ? customEndDate : undefined,
        page: currentPage,
        limit: 10
      };
      const res = await expenseApi.getEquipment(params);
      setExpenses(res.expenses || []);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.total || 0);

      // Simple local KPI calculation based on filtered set (or full set)
      const totalAmountVal = (res.expenses || []).reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      const paidVal = (res.expenses || []).filter(e => e.paymentStatus === 'Paid').reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      const pendingVal = (res.expenses || []).filter(e => e.paymentStatus !== 'Paid').reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

      setStats({
        total: totalAmountVal,
        paid: paidVal,
        pending: pendingVal
      });
    } catch (error) {
      console.error('Error fetching equipment expenses:', error);
      toast.error('Failed to load expenses list.');
    } finally {
      setLoading(false);
    }
  };

  // Recalculate total amount when quantity, unit price, or GST changes
  useEffect(() => {
    const qty = Number(formData.quantity || 0);
    const price = Number(formData.unitPrice || 0);
    const gst = Number(formData.gstAmount || 0);
    setFormData(prev => ({
      ...prev,
      totalAmount: (qty * price) + gst
    }));
  }, [formData.quantity, formData.unitPrice, formData.gstAmount]);

  // Form input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Upload bill/invoice handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setFileName(file.name);
    const uploadData = new FormData();
    uploadData.append('image', file);
    uploadData.append('type', 'expenses');

    try {
      const res = await commonApi.uploadImage(uploadData);
      setFormData(prev => ({
        ...prev,
        invoiceUrl: res.imageUrl,
        invoicePublicId: res.s3Metadata?.s3Key || ''
      }));
      toast.success('Invoice uploaded successfully!');
    } catch (error) {
      console.error('Error uploading invoice:', error);
      toast.error('Failed to upload invoice file.');
      setFileName('');
    } finally {
      setUploading(false);
    }
  };

  // Open Modal logic
  const openModal = (mode, expense = null) => {
    setModalMode(mode);
    setSelectedExpense(expense);
    setFileName('');

    if (mode === 'add') {
      setFormData({
        equipmentName: '',
        brand: '',
        modelNumber: '',
        vendor: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        warrantyExpiryDate: '',
        quantity: 1,
        unitPrice: 0,
        gstAmount: 0,
        totalAmount: 0,
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        notes: '',
        invoiceUrl: '',
        invoicePublicId: ''
      });
    } else if (expense) {
      setFormData({
        equipmentName: expense.equipmentName || '',
        brand: expense.brand || '',
        modelNumber: expense.modelNumber || '',
        vendor: expense.vendor || '',
        purchaseDate: expense.purchaseDate ? new Date(expense.purchaseDate).toISOString().split('T')[0] : '',
        invoiceNumber: expense.invoiceNumber || '',
        warrantyExpiryDate: expense.warrantyExpiryDate ? new Date(expense.warrantyExpiryDate).toISOString().split('T')[0] : '',
        quantity: expense.quantity || 1,
        unitPrice: expense.unitPrice || 0,
        gstAmount: expense.gstAmount || 0,
        totalAmount: expense.totalAmount || 0,
        paymentMethod: expense.paymentMethod || 'Cash',
        paymentStatus: expense.paymentStatus || 'Paid',
        notes: expense.notes || '',
        invoiceUrl: expense.invoiceUrl || '',
        invoicePublicId: expense.invoicePublicId || ''
      });
      if (expense.invoiceUrl) {
        const parts = expense.invoiceUrl.split('/');
        setFileName(parts[parts.length - 1]);
      }
    }

    setIsModalOpen(true);
  };

  // Submit Handler (Create/Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.equipmentName) {
      toast.warning('Equipment Name is required.');
      return;
    }

    try {
      if (modalMode === 'add') {
        await expenseApi.createEquipment(formData);
        toast.success('Equipment expense recorded successfully!');
      } else {
        await expenseApi.updateEquipment(selectedExpense._id, formData);
        toast.success('Equipment expense updated successfully!');
      }
      setIsModalOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense details.');
    }
  };

  // Delete Handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;

    try {
      await expenseApi.deleteEquipment(id);
      toast.success('Expense record deleted successfully!');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense.');
    }
  };

  // Export to Excel (Client-side)
  const handleExportExcel = () => {
    if (expenses.length === 0) {
      toast.warning('No data available to export.');
      return;
    }

    const exportData = expenses.map((e, idx) => ({
      'S.No': idx + 1,
      'Equipment Name': e.equipmentName,
      'Brand': e.brand || '-',
      'Model Number': e.modelNumber || '-',
      'Vendor/Supplier': e.vendor || '-',
      'Purchase Date': e.purchaseDate ? new Date(e.purchaseDate).toLocaleDateString() : '-',
      'Invoice Number': e.invoiceNumber || '-',
      'Warranty Expiry': e.warrantyExpiryDate ? new Date(e.warrantyExpiryDate).toLocaleDateString() : '-',
      'Quantity': e.quantity,
      'Unit Price (INR)': e.unitPrice,
      'GST Amount (INR)': e.gstAmount,
      'Total Amount (INR)': e.totalAmount,
      'Payment Method': e.paymentMethod,
      'Payment Status': e.paymentStatus,
      'Notes': e.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipment Expenses');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Dental_Equipment_Expenses_${dateStr}.xlsx`);
    toast.success('Excel file exported successfully!');
  };

  // Export to PDF (Backend Puppeteer call)
  const handleExportPDF = async () => {
    try {
      const params = {
        search: searchTerm,
        filterType,
        startDate: filterType === 'custom' ? customStartDate : undefined,
        endDate: filterType === 'custom' ? customEndDate : undefined
      };
      toast.info('Generating PDF Report...');
      const response = await expenseApi.downloadEquipmentPdf(params);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Dental_Equipment_Expenses_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate PDF report.');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-gray-900/50 min-h-screen">
      {/* Header & Main KPIs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            🛠️ Dental Equipment Expenses
          </h1>
          <p className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest mt-1">
            Track and manage expensive assets and equipment purchases
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => openModal('add')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/10 transition-all active:scale-95"
          >
            <PlusCircle size={16} />
            <span>Add Equipment</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <FileSpreadsheet size={16} className="text-green-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <FileDown size={16} className="text-rose-600" />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* Quick stats KPI widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <IndianRupee size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Total Active Purchase</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">₹{stats.total.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Total Paid</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">₹{stats.paid.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Total Pending/Due</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">₹{stats.pending.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by equipment name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 outline-none text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none bg-slate-50/50 dark:bg-gray-900/50"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {filterType === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-medium outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-medium outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/40 text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
              <tr>
                <th className="p-4 font-black uppercase tracking-widest text-[10px]">Equipment Name</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px]">Brand / Model</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px]">Vendor</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px]">Purchase Date</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px]">Quantity</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px]">Amount</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] text-center">Status</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] text-center">Invoice</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-slate-600 dark:text-gray-300">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan="9" className="p-6 text-center text-slate-400">Loading records...</td>
                  </tr>
                ))
              ) : expenses.length > 0 ? (
                expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 font-bold text-slate-800 dark:text-white">{exp.equipmentName}</td>
                    <td className="p-4 font-medium">{exp.brand || '-'} / {exp.modelNumber || '-'}</td>
                    <td className="p-4 font-medium">{exp.vendor || '-'}</td>
                    <td className="p-4 font-medium">{exp.purchaseDate ? new Date(exp.purchaseDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td className="p-4 font-bold">{exp.quantity}</td>
                    <td className="p-4 font-extrabold text-slate-800 dark:text-white">₹{exp.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        exp.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : exp.paymentStatus === 'Partially Paid'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}>
                        {exp.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {exp.invoiceUrl ? (
                        <a
                          href={exp.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                          title="View Invoice Document"
                        >
                          <FileText size={14} />
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal('view', exp)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openModal('edit', exp)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-700 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(exp._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-700 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    <Info size={24} className="mx-auto text-slate-300 mb-2" />
                    <span>No equipment expenses recorded yet.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Showing page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 border border-slate-200 dark:border-gray-700 rounded-xl disabled:opacity-50 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 border border-slate-200 dark:border-gray-700 rounded-xl disabled:opacity-50 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit / View Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-gray-700 z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Title Section */}
              <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-slate-50 dark:bg-gray-900/20">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                  {modalMode === 'add' ? '🛠️ Add Equipment Expense' : modalMode === 'edit' ? '✏️ Edit Equipment Expense' : '👁️ View Equipment Details'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Equipment Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Equipment Name *</label>
                    <input
                      type="text"
                      name="equipmentName"
                      value={formData.equipmentName}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      required
                      placeholder="e.g. Dental Laser Treatment System"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Brand</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      placeholder="e.g. Philips"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Model Number */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Model Number</label>
                    <input
                      type="text"
                      name="modelNumber"
                      value={formData.modelNumber}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      placeholder="e.g. DL-2026"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Vendor/Supplier</label>
                    <input
                      type="text"
                      name="vendor"
                      value={formData.vendor}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      placeholder="e.g. Prime Dental Supplies"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      placeholder="e.g. INV-1090"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Purchase Date *</label>
                    <input
                      type="date"
                      name="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Warranty Expiry Date */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Warranty Expiry Date</label>
                    <input
                      type="date"
                      name="warrantyExpiryDate"
                      value={formData.warrantyExpiryDate}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Unit Price (INR)</label>
                    <input
                      type="number"
                      name="unitPrice"
                      min="0"
                      value={formData.unitPrice}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* GST Amount */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">GST Amount (INR)</label>
                    <input
                      type="number"
                      name="gstAmount"
                      min="0"
                      value={formData.gstAmount}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Total Amount (Auto Calculated) */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-1 font-bold">Total Amount (Auto Calculated)</label>
                    <div className="w-full px-4 py-2.5 border border-indigo-100 dark:border-gray-700 bg-indigo-50/50 dark:bg-gray-900/80 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400">
                      ₹{formData.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Method</label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Status</label>
                    <select
                      name="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      rows="2"
                      value={formData.notes}
                      onChange={handleInputChange}
                      disabled={modalMode === 'view'}
                      placeholder="Add any specific description or notes..."
                      className="w-full px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white resize-none"
                    />
                  </div>

                  {/* Upload Invoice */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Invoice Document / Bill</label>
                    <div className="flex items-center gap-3">
                      {modalMode !== 'view' && (
                        <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all">
                          <Upload size={14} />
                          <span>{uploading ? 'Uploading...' : 'Choose File'}</span>
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={uploading || modalMode === 'view'}
                            className="hidden"
                          />
                        </label>
                      )}

                      {formData.invoiceUrl ? (
                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 px-3 py-1.5 rounded-xl text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 size={14} />
                          <a
                            href={formData.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold hover:underline truncate max-w-[200px]"
                          >
                            {fileName || 'View invoice bill'}
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">No document uploaded.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-gray-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Close
                  </button>
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {modalMode === 'add' ? 'Save record' : 'Save changes'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <RecordVault expenseType="Dental Equipment" />
    </div>
  );
};

export default DentalEquipment;
