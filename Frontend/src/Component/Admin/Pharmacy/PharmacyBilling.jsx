import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  Printer,
  X,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Package,
  ChevronRight
} from 'lucide-react';
import api, { billingApi, authApi } from '../../../services/api';
import { calculatePharmacyInvoice } from '../../../utils/pharmacyInvoiceCalculator';
import OviaanDefaultPharmacyInvoiceTemplate from '../../../components/billing/templates/OviaanDefaultPharmacyInvoiceTemplate';

const numberToWords = (num) => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return;
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only' : '';
  return str;
};

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${serverUrl}${cleanPath}`;
};

const PharmacyBilling = () => {
  const [billInfo, setBillInfo] = useState({
    patientName: '',
    patientPhone: '',
    paymentMethod: 'Cash',
    status: 'Paid',
    notes: '',
    age: '',
    gender: '',
    patientAddress: ''
  });

  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clinicData, setClinicData] = useState({});
  const [defaultTemplate, setDefaultTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastGeneratedBill, setLastGeneratedBill] = useState(null);

  // Patient search state
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  useEffect(() => {
    fetchClinicData();
  }, []);

  const fetchClinicData = async () => {
    try {
      const response = await authApi.checkSession();
      const organization = response.user?.organization || response.user?.organizationId || {};
      setClinicData(organization);
      
      // Also fetch the default template to ensure settings persist on refresh
      const templateRes = await api.get('/invoice-templates');
      const templates = templateRes.data?.templates || templateRes.data || [];
      const defTemplate = templates.find(t => t.isDefault) || templates.find(t => t.layoutType === 'pharmacy') || null;
      setDefaultTemplate(defTemplate);
    } catch (error) {
      console.error('Error fetching clinic data:', error);
    }
  };

  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);

  const searchMedicines = useCallback(async (query) => {
    try {
      // Fetch all sellable medicines if query is empty, otherwise search
      const response = await api.get(`/internal-pharmacy/inventory?search=${query}&stockStatus=In Stock`);
      const sorted = response.data.sort((a, b) => a.name.localeCompare(b.name));
      setSearchResults(sorted);
      setShowMedicineDropdown(true);
    } catch (error) {
      console.error('Error searching medicines:', error);
    }
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const timer = setTimeout(() => searchMedicines(searchTerm), 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowMedicineDropdown(false);
    }
  }, [searchTerm, searchMedicines]);

  const addItem = (med) => {
    setSearchResults([]);
    setShowMedicineDropdown(false);
    setSearchTerm('');
    fetchBatches(med);
  };

  // Patient search logic
  const fetchPatients = useCallback(async (query = '') => {
    try {
      const response = await api.get(`/patients?search=${query}&limit=15`);
      // handle both array and object responses
      const results = Array.isArray(response.data) ? response.data : (response.data.patients || []);
      setPatientSearchResults(results);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  }, []);

  useEffect(() => {
    if (showPatientDropdown) {
      const timer = setTimeout(() => fetchPatients(patientSearchTerm), 200);
      return () => clearTimeout(timer);
    }
  }, [patientSearchTerm, showPatientDropdown, fetchPatients]);

  const handleSelectPatient = (patient) => {
    setBillInfo({
      ...billInfo,
      patientName: patient.fullName || `${patient.firstName} ${patient.lastName || ''}`.trim(),
      patientPhone: patient.mobile || '',
      patientAddress: patient.address || '',
      age: patient.age || '',
      gender: patient.gender || '',
      patientId: patient.patientId,
      doctorName: patient.assignedDoctor || ''
    });
    setPatientSearchTerm('');
    setPatientSearchResults([]);
    setShowPatientDropdown(false);
  };

  const fetchBatches = async (med) => {
    try {
      // In a real app, you'd have a specific endpoint for batches of a medicine
      // For now I'll assume the inventory object has some batch info or I fetch it
      const response = await api.get(`/internal-pharmacy/inventory?search=${med.name}`);
      // The controller returns medicines with batch summary. I need actual batches.
      // I'll assume there's a way to get batches.

      // For now, I'll use a simplified approach: 
      // Just add a placeholder if no batch logic is fully ready in backend.
      // But the user asked for batch-wise.

      const newItem = {
        medicineId: med._id,
        medicineName: med.name || searchTerm || 'Medicine',
        category: med.category || 'General',
        type: med.type || 'Tablet',
        batchNo: med.batchNo || 'AUTO-FEFO',
        expiryDate: med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A',
        mrp: Number(med.mrp || 0),
        sellingPrice: Number(med.sellingPrice || med.price || 0),
        quantity: 1,
        maxQuantity: med.totalStock || 999,
        gstPercentage: Number(med.gstPercentage || 0),
        discountPercentage: 0,
        totalAmount: Number(med.sellingPrice || med.price || 0)
      };
      setItems([...items, newItem]);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'quantity' && value > newItems[index].maxQuantity) {
      alert(`Only ${newItems[index].maxQuantity} units available in stock!`);
      newItems[index].quantity = newItems[index].maxQuantity;
    }

    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].sellingPrice) || 0;
    const disc = Number(newItems[index].discountPercentage) || 0;
    const gst = Number(newItems[index].gstPercentage) || 0;

    const afterDisc = (qty * price) * (1 - disc / 100);
    const total = afterDisc * (1 + gst / 100);
    newItems[index].totalAmount = Number(total.toFixed(2));

    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateGrandTotal = () => {
    return items.reduce((acc, item) => acc + item.totalAmount, 0).toFixed(2);
  };

  const handleSaveBill = async (action) => {
    if (items.length === 0) return alert('Add at least one item');
    try {
      setSaving(true);

      const totals = calculatePharmacyInvoice(items, {
        paymentMode: billInfo.paymentMethod || 'Cash'
      });

      const response = await api.post('/internal-pharmacy/billing', {
        ...billInfo,
        items,
        ...totals,
        // Ensure standard fields are also sent for compatibility
        amount: totals.grandTotal,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        netAmount: totals.grandTotal
      });

      const billData = response.data;
      setLastGeneratedBill({
        ...billData,
        amountInWords: numberToWords(Math.round(billData.grandTotal || billData.amount || 0))
      });

      alert('Bill generated successfully!');

      if (action === 'Print') {
        setTimeout(() => window.print(), 500);
      }

      setItems([]);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!lastGeneratedBill) {
      alert('Please save the bill first');
      return;
    }
    window.print();
  };


  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Pharmacy Billing</h1>
          <p className="text-sm text-slate-500 font-medium">Create and manage pharmacy invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Area: Patient Info + Items Table */}
        <div className="lg:col-span-9 space-y-6">
          {/* Patient Info Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 mb-1">
              <User className="w-5 h-5" />
              <h3 className="text-sm font-bold">Patient Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1 relative">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Patient Name</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none"
                    placeholder="Search or select patient..."
                    value={patientSearchTerm || billInfo.patientName}
                    onChange={(e) => {
                      setPatientSearchTerm(e.target.value);
                      setBillInfo({ ...billInfo, patientName: e.target.value });
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => {
                      setShowPatientDropdown(true);
                      fetchPatients(patientSearchTerm);
                    }}
                    onClick={() => {
                      setShowPatientDropdown(true);
                      fetchPatients(patientSearchTerm);
                    }}
                  />
                  {patientSearchResults.length > 0 && showPatientDropdown && (
                    <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto">
                      {patientSearchResults.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => handleSelectPatient(p)}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b last:border-0 border-slate-100 dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-white">{p.fullName || `${p.firstName} ${p.lastName || ''}`.trim()}</p>
                              <p className="text-[10px] text-slate-500 font-medium">ID: {p.patientId} • {p.mobile}</p>
                            </div>
                            {p.gender && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300 rounded font-black uppercase">
                                {p.gender}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Backdrop to close dropdown */}
                  {showPatientDropdown && (
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowPatientDropdown(false)}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Mobile Number</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none"
                  placeholder="10-digit mobile..."
                  value={billInfo.patientPhone}
                  onChange={(e) => setBillInfo({ ...billInfo, patientPhone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Prescribing Doctor</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none"
                  placeholder="Dr. Name"
                  value={billInfo.doctorName || ''}
                  onChange={(e) => setBillInfo({ ...billInfo, doctorName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Age / Gender</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none"
                    placeholder="Age"
                    value={billInfo.age || ''}
                    onChange={(e) => setBillInfo({ ...billInfo, age: e.target.value })}
                  />
                  <select
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-slate-400 outline-none"
                    value={billInfo.gender || ''}
                    onChange={(e) => setBillInfo({ ...billInfo, gender: e.target.value })}
                  >
                    <option value="">Sex</option>
                    <option value="Male">M</option>
                    <option value="Female">F</option>
                    <option value="Other">O</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-1 pt-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Patient Address</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none"
                placeholder="Full address..."
                value={billInfo.patientAddress || ''}
                onChange={(e) => setBillInfo({ ...billInfo, patientAddress: e.target.value })}
              />
            </div>
          </div>

          {/* Medicine Search & Items */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search medicine by name or manufacturer..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowMedicineDropdown(true);
                }}
                onFocus={() => {
                  setShowMedicineDropdown(true);
                  searchMedicines(searchTerm);
                }}
              />

              {/* Search Results Dropdown */}
              {showMedicineDropdown && searchResults.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMedicineDropdown(false)} />
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-100 dark:bg-gray-900 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-gray-700">
                      Found {searchResults.length} medicines
                    </div>
                    <div className="max-h-60 overflow-y-auto font-medium">
                      {searchResults.map((med) => (
                        <div
                          key={med._id}
                          onClick={() => {
                            addItem(med);
                            setShowMedicineDropdown(false);
                          }}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex justify-between items-center border-b last:border-0 border-slate-100 dark:border-gray-700"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{med.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                              {med.manufacturer} • {med.category || 'General'} • Exp: {med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A'}
                            </p>
                            <p className="text-[9px] text-indigo-600 font-bold uppercase mt-0.5">Stock: {med.totalStock} {med.type || 'units'} available</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 line-through">MRP: ₹{med.mrp}</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Rate: ₹{med.sellingPrice}</p>
                            <p className="text-[9px] text-indigo-600 font-bold uppercase mt-1">Select +</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {showMedicineDropdown && searchTerm.length > 0 && searchResults.length === 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMedicineDropdown(false)} />
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No "In Stock" medicines found for "{searchTerm}"</p>
                    <p className="text-[9px] text-slate-500 mt-1">Note: Only medicines with active stock batches appear here. Add stock in "Opening Stock" or "Purchase Stock" first.</p>
                  </div>
                </>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-gray-700">
              <table className="w-full text-xs border-collapse min-w-[900px]">
                <thead className="bg-slate-50 dark:bg-gray-900">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left w-12">Sr.</th>
                    <th className="px-4 py-3 text-left min-w-[200px]">Medicine / Details</th>
                    <th className="px-4 py-3 text-center w-28">Batch / Exp</th>
                    <th className="px-4 py-3 text-center w-24">MRP</th>
                    <th className="px-4 py-3 text-center w-24">Rate</th>
                    <th className="px-4 py-3 text-center min-w-[150px]">Qty *</th>
                    <th className="px-4 py-3 text-center min-w-[120px]">Disc%</th>
                    <th className="px-4 py-3 text-center min-w-[120px]">GST%</th>
                    <th className="px-4 py-3 text-right min-w-[180px]">Amount</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-slate-300 font-bold">
                  {items.length > 0 ? items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-400 font-medium">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{item.medicineName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.category} • {item.type}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">{item.batchNo}</p>
                        <p className="text-[10px] text-rose-500 font-bold">E: {item.expiryDate}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400 line-through text-[11px]">₹{item.mrp}</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-slate-800 dark:text-white">₹{item.sellingPrice}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          className="w-full px-4 py-1.5 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 rounded text-sm text-center font-bold outline-none focus:ring-1 focus:ring-indigo-400 shadow-sm transition-all"
                          style={{ minWidth: '140px' }}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          className="w-full px-4 py-1.5 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 rounded text-sm text-center font-bold outline-none focus:ring-1 focus:ring-indigo-400 shadow-sm transition-all text-indigo-600"
                          style={{ minWidth: '110px' }}
                          value={item.discountPercentage}
                          onChange={(e) => updateItem(index, 'discountPercentage', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          className="w-full px-4 py-1.5 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 rounded text-sm text-center font-bold outline-none focus:ring-1 focus:ring-indigo-400 shadow-sm transition-all text-slate-500"
                          style={{ minWidth: '110px' }}
                          value={item.gstPercentage}
                          onChange={(e) => updateItem(index, 'gstPercentage', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">₹{Number(item.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeItem(index)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center text-slate-400 italic font-medium">Search and select medicines to start billing</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar: Narrow Column */}
        <div className="lg:col-span-3 space-y-6 sticky top-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-gray-700 pb-3">Order Summary</h3>

            {(() => {
              const totals = calculatePharmacyInvoice(items, {
                paymentMode: billInfo.paymentMethod || 'Cash'
              });
              return (
                <div className="space-y-3 font-medium">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 uppercase tracking-wider">Subtotal</span>
                    <span className="text-slate-800 dark:text-white font-bold">₹{totals.grossAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-rose-500">
                    <span className="uppercase tracking-wider">Discount</span>
                    <span className="font-bold">- ₹{totals.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 uppercase tracking-wider">Tax (GST)</span>
                    <span className="text-slate-800 dark:text-white font-bold">₹{totals.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-gray-700 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Amount</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2 pt-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Payment</label>
              <div className="grid grid-cols-2 gap-2">
                {['Cash', 'UPI', 'Card'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setBillInfo({ ...billInfo, paymentMethod: m })}
                    className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${billInfo.paymentMethod === m ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-gray-700">
              <button
                onClick={() => handleSaveBill('Save')}
                disabled={saving}
                className={`w-full py-3.5 ${saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'} text-white rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs`}
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Bill
                  </>
                )}
              </button>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={handlePrint}
                  className="py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>

              </div>
            </div>
          </div>

          {/* Hidden Print Area */}
          <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
            {lastGeneratedBill && (
              <OviaanDefaultPharmacyInvoiceTemplate
                billData={{
                  ...lastGeneratedBill,
                  billNo: lastGeneratedBill.billId || lastGeneratedBill._id,
                  billDate: new Date(lastGeneratedBill.date).toLocaleDateString(),
                  medicines: items.length > 0 ? items : lastGeneratedBill.items // Fallback for immediate print
                }}
                clinicData={(() => {
                  // Safety parse metadata if it comes as a string
                  let templateMetadata = defaultTemplate?.metadata || {};
                  if (typeof templateMetadata === 'string') {
                    try {
                      templateMetadata = JSON.parse(templateMetadata);
                    } catch (e) {
                      templateMetadata = {};
                    }
                  }

                  return {
                    ...clinicData,
                    ...templateMetadata,
                    headerType: defaultTemplate?.headerType || 'default',
                    headerImage: getImageUrl(defaultTemplate?.headerImage || clinicData.branding?.logo || clinicData.logo),
                    logo: getImageUrl(defaultTemplate?.headerImage || clinicData.branding?.logo || clinicData.logo),
                    footerType: defaultTemplate?.footerType || 'default',
                    doctorSignature: getImageUrl(defaultTemplate?.footerImage || clinicData.doctorSignature),
                    showGst: templateMetadata?.showGst !== undefined ? templateMetadata.showGst : true,
                    gstNumber: (templateMetadata?.showGst !== false) ? (templateMetadata?.gstNumber || clinicData.gstNumber || '') : ''
                  };
                })()}
              />
            )}
          </div>

          <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1">Inventory Notice</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">Selling medicines automatically reduces stock from the nearest expiry batch. Expired items are excluded from search.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyBilling;
