import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Printer, Mail, X, Check, Clock,
  Percent, Trash2, Edit, ArrowLeft,
  FileText, User, Calendar, Clock as ClockIcon,
  Save,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import InvoiceTemplate from '../../Shared/InvoiceTemplate';
import { useAuth } from '../../../context/AuthContext';
import Pagination from '../../common/Pagination';

const BillingMgmt = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'create' or 'view'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    appointmentId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    items: [],
    discount: 0,
    paymentStatus: 'Pending',
    paymentMethod: 'Cash',
    notes: ''
  });

  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    price: 0,
    type: 'consultation' // 'consultation', 'procedure', 'medication', 'other'
  });

  // Fetch bills from API
  const fetchBills = async () => {
    try {
      const { billingApi } = await import('../../../services/api');
      const data = await billingApi.getAll();
      setBills(data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // Find patient details
  const findPatient = async () => {
    if (!formData.patientId) return;
    try {
      const { patientApi } = await import('../../../services/api');
      const patient = await patientApi.getById(formData.patientId);
      if (patient) {
        setFormData(prev => ({
          ...prev,
          patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
        }));
      }
    } catch (error) {
      console.error('Error finding patient:', error);
      alert('Patient not found');
    }
  };

  // Calculate totals
  const calculateSubtotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const price = Number(item.price || item.cost || 0);
      const quantity = Number(item.quantity || 1);
      return sum + (price * quantity);
    }, 0);
  };

  const calculateTotal = (items, discount = 0) => {
    if (!items || !Array.isArray(items)) return 0;
    const subtotal = calculateSubtotal(items);
    const discountAmount = (subtotal * discount) / 100;
    return subtotal - discountAmount;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle new item input changes
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  // Add new item to the bill
  const addItem = () => {
    if (!newItem.description || newItem.price <= 0) return;

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...newItem, id: Date.now() }]
    }));

    // Reset new item form
    setNewItem({
      description: '',
      quantity: 1,
      price: 0,
      type: 'consultation'
    });
  };

  // Remove item from bill
  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Save bill
  const saveBill = async () => {
    if (!formData.patientId || formData.items.length === 0) {
      alert('Please fill in all required fields and add at least one item');
      return;
    }

    try {
      const { billingApi } = await import('../../../services/api');
      const total = calculateTotal(formData.items, formData.discount);

      await billingApi.create({
        patientId: formData.patientId,
        patientName: formData.patientName,
        doctorId: formData.doctorId || 'System', // Fallback
        doctorName: formData.doctorName || 'General Clinic',
        amount: total,
        items: formData.items.map(item => ({ description: item.description, cost: item.price })),
        status: formData.paymentStatus,
        notes: formData.notes
      });

      // Refresh list
      fetchBills();

      // Reset form and go back to list view
      setFormData({
        patientId: '',
        patientName: '',
        appointmentId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        discount: 0,
        paymentStatus: 'Pending',
        paymentMethod: 'Cash',
        notes: ''
      });

      setViewMode('list');
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Failed to save bill');
    }
  };

  // Update payment status
  const updatePaymentStatus = async (billId, status) => {
    try {
      const { api } = await import('../../../services/api');
      await api.put(`/billing/${billId}`, { status });
      fetchBills();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  // Filter bills based on search term and active filter
  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      (bill.patientName && bill.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.id && bill.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.appointmentId && bill.appointmentId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = 
      activeFilter === 'All' || 
      (activeFilter === 'Paid' && bill.status === 'Paid') ||
      (activeFilter === 'Pending' && bill.status === 'Pending');
    
    return matchesSearch && matchesFilter;
  });

  // Paginate bills
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);

  // Calculate summary
  const totalBills = bills.length;
  const paidBills = bills.filter(bill => bill.status === 'Paid').length;
  const pendingBills = totalBills - paidBills;
  const totalRevenue = bills.reduce((sum, bill) =>
    sum + (bill.amount || calculateTotal(bill.items, bill.discount) || 0), 0
  );

  // Render bill list
  const renderBillList = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="w-full md:w-1/3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search bills by patient, ID, or appointment..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => {
            setViewMode('create');
            setFormData({
              patientId: '',
              patientName: '',
              appointmentId: '',
              date: format(new Date(), 'yyyy-MM-dd'),
              items: [],
              discount: 0,
              paymentStatus: 'Pending',
              paymentMethod: 'Cash',
              notes: ''
            });
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Bill
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Bills</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{totalBills}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Paid</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{paidBills}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">{pendingBills}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">
            ₹{(Number(totalRevenue) || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex space-x-2 bg-gray-200 p-1 rounded-xl w-full sm:w-auto">
          {['All', 'Paid', 'Pending'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 w-full sm:w-auto
                ${activeFilter === filter
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-300'
                }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedBills.length > 0 ? (
                paginatedBills.map((bill) => (
                  <tr key={bill._id || bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bill.billId || bill.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bill.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bill.date ? format(parseISO(bill.date), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{((bill.amount !== undefined ? bill.amount : calculateTotal(bill.items, bill.discount)) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${bill.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setViewMode('view');
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setViewMode('view');
                            // Small timeout to ensure the view mode changes and InvoiceTemplate mounts
                            setTimeout(() => {
                              window.print();
                            }, 300);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="Print Bill"
                        >
                          <Printer className="h-5 w-5" />
                        </button>
                        {bill.status === 'Pending' && (
                          <button
                            onClick={() => updatePaymentStatus(bill.id, 'Paid')}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as Paid"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    No bills found. Create a new bill to get started.
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
          totalItems={filteredBills.length}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </div>
  );

  // Render create bill form
  const renderCreateBillForm = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          <button
            onClick={() => setViewMode('list')}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          Create New Bill
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient ID <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type="text"
              name="patientId"
              value={formData.patientId}
              onChange={handleInputChange}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter patient ID"
              required
            />
            <button
              type="button"
              onClick={findPatient}
              className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-r-md"
            >
              <User className="h-4 w-4 mr-1" /> Find
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="patientName"
            value={formData.patientName}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Patient's full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment ID (Optional)
          </label>
          <div className="flex">
            <input
              type="text"
              name="appointmentId"
              value={formData.appointmentId}
              onChange={handleInputChange}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter appointment ID"
            />
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-r-md"
            >
              <Calendar className="h-4 w-4 mr-1" /> Find
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Bill Items */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Bill Items</h3>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                name="description"
                value={newItem.description}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Item description"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                name="type"
                value={newItem.type}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="consultation">Consultation</option>
                <option value="procedure">Procedure</option>
                <option value="medication">Medication</option>
                <option value="test">Test</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
              <input
                type="number"
                name="quantity"
                min="1"
                value={newItem.quantity}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={newItem.price}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Items Table */}
        {formData.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.description}
                      <span className="block text-xs text-gray-500">{item.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ₹{(Number(item.price || item.cost || 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      ₹{(Number(item.quantity || 1) * Number(item.price || item.cost || 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No items added to the bill yet. Add items using the form above.
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-full md:w-1/3">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">Subtotal:</span>
              <span className="text-sm text-gray-900">
                ₹{(Number(calculateSubtotal(formData.items)) || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Discount:</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="discount"
                    min="0"
                    max="100"
                    value={formData.discount}
                    onChange={handleInputChange}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <span className="ml-1 text-sm text-gray-500">%</span>
                </div>
              </div>
              <span className="text-sm text-gray-900">
                -₹{(Number(calculateSubtotal(formData.items) * formData.discount / 100) || 0).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span className="text-base font-semibold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-blue-700">
                  ₹{(Number(calculateTotal(formData.items, formData.discount)) || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status <span className="text-red-500">*</span>
            </label>
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Insurance">Insurance</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Any additional notes or instructions..."
            ></textarea>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveBill}
          disabled={formData.items.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Bill
        </button>
      </div>
    </div>
  );

  // Render bill details view
  const renderBillDetails = () => {
    if (!selectedBill) return null;

    const { id, patientName, date, items, discount, status, paymentMethod, notes } = selectedBill;
    const subtotal = calculateSubtotal(items);
    const total = calculateTotal(items, discount);

    return (
      <div className="bg-white p-6 rounded-lg shadow max-w-5xl mx-auto">
        {/* View Header */}
        <div className="flex items-center justify-between mb-6 no-print">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <button
              onClick={() => setViewMode('list')}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            Bill Details - {selectedBill.billId || selectedBill.id}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md font-bold"
            >
              <Printer className="h-4 w-4 mr-2" /> Print Invoice
            </button>
          </div>
        </div>

        {/* Invoice Area */}
        <div className="invoice-print-container">
          <InvoiceTemplate
            invoiceData={{
              billId: selectedBill.billId || selectedBill.id,
              date: selectedBill.date || new Date().toISOString(),
              patientName: selectedBill.patientName,
              patientId: selectedBill.patientId || 'N/A',
              doctorName: selectedBill.doctorName || selectedBill.doctor || 'N/A',
              patientContact: selectedBill.patientContact || selectedBill.phone || '',
              patientAddress: selectedBill.patientAddress || selectedBill.address || '',
              items: selectedBill.items || [],
              subtotal: subtotal,
              discount: selectedBill.discountAmount || (subtotal * (selectedBill.discount || 0)) / 100,
              taxRate: selectedBill.taxRate || 0,
              taxAmount: selectedBill.taxAmount || 0,
              total: total,
              notes: selectedBill.notes || '',
              paymentMethod: selectedBill.paymentMethod || selectedBill.paymentMode || 'Cash',
              status: selectedBill.status || 'Paid'
            }}
            clinicInfo={user?.organization || user?.organizationId || {}}
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center no-print">
          <button
            onClick={() => setViewMode('list')}
            className="px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
          >
            Close / Back to List
          </button>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="pb-12">
      {viewMode === 'list' && renderBillList()}
      {viewMode === 'create' && renderCreateBillForm()}
      {viewMode === 'view' && selectedBill && renderBillDetails()}
    </div>
  );
};

export default BillingMgmt;
