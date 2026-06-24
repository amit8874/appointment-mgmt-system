import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  PlusCircle,
  User,
  CalendarPlus,
  X,
  Eye,
  Printer,
  ChevronLeft,
  Phone,
  FileText
} from 'lucide-react';
import { billingApi, appointmentApi, centralDoctorApi, authApi, whatsappApi, pharmacyApi, medicineApi } from '../../../services/api';
import InvoiceTemplate from '../../Shared/InvoiceTemplate';
import { useAuth } from '../../../context/AuthContext';
import Pagination from '../../common/Pagination';
import { normalizePharmacyInvoice } from '../../../utils/pharmacyInvoiceCalculator';

// --- Status Badge Component ---
const StatusBadge = ({ status }) => {
  const isPaid = status === 'Paid';
  const colorClass = isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${colorClass} whitespace-nowrap`}>
      {status}
    </span>
  );
};

// --- Invoice List View Component ---
const InvoiceList = React.memo(({
  filteredInvoices,
  summaryMetrics,
  activeFilter,
  setActiveFilter,
  searchTerm,
  setSearchTerm,
  setViewMode,
  handleAction,
  billingTab,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}) => (
  <>
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 border-b pb-2">
      <h2 className="text-lg font-black text-gray-800 mb-1 md:mb-0">
        Invoice List ({filteredInvoices.length} Found)
      </h2>
      {/* Generate New Bill removed as per user request */}
    </div>

    {/* Summary Cards removed for Receptionist as per request */}

    {/* Filtering & Search Bar */}
    <div className="flex flex-col sm:flex-row justify-end items-center mb-3 gap-3">
      <div className="relative w-full sm:max-w-xs">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search by Name, ID, or Mobile..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-green-500 transition duration-150"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredInvoices.map((invoice) => (
        <div key={invoice.id}
          className="group relative bg-white rounded-xl shadow-lg border border-green-200 overflow-hidden
                        transition-all duration-300 ease-in-out transform cursor-pointer
                        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
                        active:shadow-2xl active:scale-[1.02] active:-translate-y-1"
        >
          <div className="absolute inset-0 bg-green-700 transform translate-y-full transition-transform duration-500 ease-out group-hover:translate-y-0 group-active:translate-y-0 z-0"></div>

          <div className="relative z-10">
            <div className={`p-4 flex justify-between items-center border-b-2 border-green-100 group-hover:border-green-600 transition-colors duration-300`}>
              <span className={`text-sm font-bold tracking-wider text-green-700 group-hover:text-white transition-colors duration-300`}>
                {invoice.id}
              </span>
              <StatusBadge status={invoice.status} />
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-lg font-extrabold text-gray-900 truncate group-hover:text-white transition-colors duration-300">
                  {invoice.patient}
                </p>
                <div className={`text-2xl font-extrabold text-green-800 group-hover:text-white transition-colors duration-300`}>
                  {formatCurrency(invoice.amount)}
                </div>
              </div>

              <div className="text-sm text-black space-y-1">
                <p className="group-hover:text-green-200 transition-colors duration-300">
                  <span className="font-medium text-black group-hover:text-green-100 transition-colors duration-300">Doctor:</span> {invoice.doctor}
                </p>
                <p className="group-hover:text-green-200 transition-colors duration-300">
                  <span className="font-medium text-black group-hover:text-green-100 transition-colors duration-300">Date:</span> {invoice.date}
                </p>
              </div>
            </div>

            <div className="p-4 bg-green-100 border-t border-green-200 flex justify-end space-x-3 group-hover:bg-green-800 group-hover:border-green-900 transition-colors duration-300">
              <button
                onClick={() => handleAction('View', invoice.id)}
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition ease-in-out duration-150 group-hover:bg-green-500 group-hover:hover:bg-green-400`}
              >
                <EyeIcon />
                View
              </button>
              <button
                onClick={() => handleAction('Print', invoice.id)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition ease-in-out duration-150 group-hover:bg-green-100 group-hover:text-green-800 group-hover:border-green-400"
              >
                <PrinterIcon className="text-gray-500 group-hover:text-green-800 transition-colors duration-300" />
                Print
              </button>
              <button
                onClick={() => handleAction('WhatsApp', invoice.id)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition ease-in-out duration-150 group-hover:bg-indigo-500"
                title="Send to WhatsApp"
              >
                <Phone size={14} className="mr-1" />
                Send
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>

    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
    />
  </>
));

// --- Global Setup ---
const PRIMARY_COLOR = 'sky';
const ACCENT_COLOR_CLASS = `bg-${PRIMARY_COLOR}-600 hover:bg-${PRIMARY_COLOR}-700 focus:ring-${PRIMARY_COLOR}-500`;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const transformApiData = (apiBill) => {
  if (apiBill.billType === 'Pharmacy') {
    const normalized = normalizePharmacyInvoice(apiBill);
    return {
      id: apiBill.billId,
      _id: apiBill._id,
      patient: String(apiBill.patientName || ''),
      patientId: String(apiBill.patientId || ''),
      doctor: String(apiBill.doctorName || ''),
      doctorId: String(apiBill.doctorId || ''),
      date: apiBill.date ? new Date(apiBill.date).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
      dateRaw: apiBill.date,
      amount: normalized.grandTotal,
      status: apiBill.status,
      patientPhone: apiBill.patientPhone || '',
      billType: 'Pharmacy',
      items: normalized.items,
      installments: apiBill.installments || [],
      paidAmount: apiBill.paidAmount !== undefined ? apiBill.paidAmount : (normalized.paidAmount || 0),
      dueAmount: apiBill.dueAmount !== undefined ? apiBill.dueAmount : (normalized.dueAmount || 0),
      details: {
        ...getInitialBillState(),
        patient: String(apiBill.patientName || ''),
        doctor: String(apiBill.doctorName || ''),
        appointmentDate: apiBill.date ? new Date(apiBill.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        consultationFee: 0,
        tests: 0,
        medicines: normalized.grossAmount,
        additionalCharges: 0,
        discount: normalized.discountAmount,
        discounts: normalized.discountAmount,
        taxRate: normalized.taxAmount > 0 ? (normalized.taxAmount / normalized.taxableAmount) * 100 : 0,
        taxAmount: normalized.taxAmount,
        totalAmount: normalized.grandTotal,
        paymentMode: apiBill.paymentMethod || 'N/A',
        status: apiBill.status,
        notes: apiBill.notes
      }
    };
  }

  const itemsSubtotal = (apiBill.items || []).reduce((sum, i) =>
    sum + (parseFloat(i.subtotal) || (parseFloat(i.qty || 1) * parseFloat(i.unitPrice || i.cost || 0))), 0
  );
  const discountAmount = parseFloat(apiBill.discount) || Math.max(0, itemsSubtotal - (apiBill.amount || 0));

  return {
    id: apiBill.billId,
    _id: apiBill._id,
    patient: String(apiBill.patientName || ''),
    patientId: String(apiBill.patientId || ''),
    doctor: String(apiBill.doctorName || ''),
    doctorId: String(apiBill.doctorId || ''),
    date: apiBill.date ? new Date(apiBill.date).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
    dateRaw: apiBill.date,
    amount: apiBill.amount,
    status: apiBill.status,
    patientPhone: apiBill.patientPhone || '',
    billType: apiBill.billType || 'General',
    items: apiBill.items || [],
    installments: apiBill.installments || [],
    paidAmount: apiBill.paidAmount !== undefined ? apiBill.paidAmount : (apiBill.amount || 0),
    dueAmount: apiBill.dueAmount !== undefined ? apiBill.dueAmount : 0,
    details: {
      patient: String(apiBill.patientName || ''),
      doctor: String(apiBill.doctorName || ''),
      appointmentDate: apiBill.date ? new Date(apiBill.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      consultationFee: (() => {
        const item = apiBill.items?.find(i => i.description?.toLowerCase().includes('consultation'));
        return item ? (item.cost ?? item.unitPrice ?? item.subtotal ?? apiBill.amount ?? 0) : 0;
      })(),
      tests: (() => {
        const item = apiBill.items?.find(i => i.description?.toLowerCase().includes('test'));
        return item ? (item.cost ?? item.unitPrice ?? item.subtotal ?? 0) : 0;
      })(),
      medicines: (() => {
        const item = apiBill.items?.find(i => i.description?.toLowerCase().includes('medicine'));
        return item ? (item.cost ?? item.unitPrice ?? item.subtotal ?? 0) : 0;
      })(),
      additionalCharges: apiBill.items?.filter(i =>
        !i.description?.toLowerCase().includes('consultation') &&
        !i.description?.toLowerCase().includes('test') &&
        !i.description?.toLowerCase().includes('medicine')
      ).reduce((sum, item) => sum + (item.cost || item.unitPrice || item.subtotal || 0), 0) || 0,
      discount: discountAmount,
      discounts: discountAmount,
      taxRate: apiBill.taxRate || 0,
      totalAmount: apiBill.amount,
      paymentMode: apiBill.paymentMethod || 'N/A',
      status: apiBill.status,
      notes: apiBill.notes
    }
  };
};

const getInitialBillState = () => ({
  patientName: '',
  patientId: '',
  patientPhone: '',
  doctorName: '',
  doctorId: '',
  appointmentId: '',
  appointmentDate: new Date().toISOString().substring(0, 10),
  consultationFee: 0,
  tests: 0,
  medicines: 0,
  additionalCharges: 0,
  discounts: 0,
  taxRate: 5,
  totalAmount: 0,
  paymentMode: 'Cash',
  status: 'Paid',
});

// Helper Icons
const EyeIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const PrinterIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1">
    <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" />
  </svg>
);
const PlusCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
    <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" />
  </svg>
);
const BackIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
    <path d="m15 18-6-6 6-6" />
  </svg>
);
const SearchIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-400">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const RupeeIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 8 2 5" /><path d="m18 8-2 5" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="m8 17-2 4" /><path d="m16 17 2 4" />
  </svg>
);
const XIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);
const WalletIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v12a4 4 0 0 1 4 4v1a2 2 0 0 1-2 2h-3" /><path d="M3 7v10h18" />
  </svg>
);
const CreditCardIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
    <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);
const SmartphoneIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />
  </svg>
);
const ShieldIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const paymentModeIcons = {
  Cash: WalletIcon,
  Card: CreditCardIcon,
  UPI: SmartphoneIcon,
  Insurance: ShieldIcon,
};

const InputField = ({ label, name, type = 'text', value, onChange, placeholder = '', unit = '', ...props }) => (
  <div className="flex flex-col">
    <label htmlFor={name} className="text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <div className="relative rounded-lg shadow-sm">
      {unit && type === 'number' && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm font-semibold">{unit}</span>
        </div>
      )}
      <input
        type={type}
        name={name}
        id={name}
        value={value === 0 && type === 'number' ? '' : value}
        onChange={onChange}
        onFocus={(e) => {
          if (type === 'number' && (e.target.value === '0' || value === 0)) {
            e.target.select();
          }
        }}
        placeholder={placeholder || (type === 'number' ? '0' : '')}
        min={type === 'number' ? 0 : undefined}
        className={`block w-full rounded-lg border-gray-300 shadow-inner p-2 sm:text-sm focus:ring-${PRIMARY_COLOR}-500 focus:border-${PRIMARY_COLOR}-500 transition duration-150 ${unit === '₹' ? 'pl-9' : ''} bg-white font-bold text-slate-700`}
        {...props}
      />
      {unit === '%' && type === 'number' && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-gray-500 sm:text-sm font-semibold">%</span>
        </div>
      )}
    </div>
  </div>
);

const GenerateBillForm = ({ onSave, onCancel, setStatusMessage, appointments = [], doctors = [], billType = 'General' }) => {
  const [billData, setBillData] = useState({
    ...getInitialBillState(),
    billType
  });
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [itemList, setItemList] = useState([{ description: '', qty: 1, unitPrice: 0, subtotal: 0 }]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(-1);
  const [apptSearchQuery, setApptSearchQuery] = useState('');
  const [showApptDropdown, setShowApptDropdown] = useState(false);

  // Global medicine autocomplete state
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [activeMedicineRow, setActiveMedicineRow] = useState(-1);
  const [medicineQuery, setMedicineQuery] = useState('');

  useEffect(() => {
    if (billType !== 'General') {
      const fetchProducts = async () => {
        try {
          const data = await pharmacyApi.getProducts();
          const filtered = data.filter(p => {
            if (billType === 'Pharmacy') return p.category?.toLowerCase().includes('medicine');
            if (billType === 'Lab') return p.category?.toLowerCase().includes('lab') || p.category?.toLowerCase().includes('test');
            return true;
          });
          setProducts(filtered);
        } catch (err) {
          console.warn('Failed to fetch products for billing:', err);
        }
      };
      fetchProducts();
    }
  }, [billType]);

  // Debounced global medicine search
  useEffect(() => {
    if (billType !== 'Pharmacy' || medicineQuery.trim().length < 1) {
      setMedicineSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await medicineApi.search(medicineQuery);
        setMedicineSuggestions(results);
      } catch { setMedicineSuggestions([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [medicineQuery, billType]);

  const filteredAppts = useMemo(() => {
    if (!apptSearchQuery.trim()) return appointments.slice(0, 5);
    const query = apptSearchQuery.toLowerCase();
    return appointments.filter(a =>
      String(a.patientName || '').toLowerCase().includes(query) ||
      String(a.patientId || '').toLowerCase().includes(query) ||
      String(a.patientPhone || '').includes(query)
    ).slice(0, 8);
  }, [appointments, apptSearchQuery]);

  const handleSelectAppointment = (appt) => {
    setSelectedAppointmentId(appt._id || appt.id);
    setApptSearchQuery(appt.patientName || appt.patient?.name || '');
    setShowApptDropdown(false);

    const doctorId = appt.doctorId || appt.doctor?._id || appt.doctor || '';
    const doctor = doctors.find(d => (d._id === doctorId || d.id === doctorId));

    setBillData(prev => ({
      ...prev,
      patientName: String(appt.patientName || appt.patient?.name || ''),
      patientId: String(appt.patientId || appt.patient?._id || appt.patient || ''),
      patientPhone: String(appt.patientPhone || appt.patient?.mobile || appt.patient?.phone || ''),
      doctorName: String(appt.doctorName || doctor?.name || doctor?.fullName || ''),
      doctorId: String(doctorId),
      appointmentId: String(appt._id || appt.id || ''),
      appointmentDate: (() => {
        if (!appt.date) return prev.appointmentDate;
        try {
          const d = new Date(appt.date);
          if (isNaN(d.getTime())) return prev.appointmentDate;
          return d.toISOString().substring(0, 10);
        } catch (e) {
          return prev.appointmentDate;
        }
      })(),
      consultationFee: doctor?.consultantFee || doctor?.fee || 0
    }));
  };

  const handleAddItem = () => setItemList(prev => [...prev, { description: '', qty: 1, unitPrice: 0, subtotal: 0 }]);
  const handleRemoveItem = (index) => setItemList(prev => prev.filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    setItemList(prev => {
      const newList = [...prev];
      newList[index][field] = value;
      if (field === 'qty' || field === 'unitPrice') {
        newList[index].subtotal = parseFloat((newList[index].qty * newList[index].unitPrice).toFixed(2));
      }
      return newList;
    });
  };

  const handleSelectProduct = (index, product) => {
    handleItemChange(index, 'description', product.name);
    handleItemChange(index, 'unitPrice', product.price);
    handleItemChange(index, 'productId', product._id);
    setShowProductDropdown(-1);
    setActiveMedicineRow(-1);
    setMedicineSuggestions([]);
  };

  const handleSelectMedicine = (index, medicineName) => {
    handleItemChange(index, 'description', medicineName);
    setActiveMedicineRow(-1);
    setMedicineSuggestions([]);
    setMedicineQuery('');
  };

  useEffect(() => {
    const consultation = billType === 'General' ? (parseFloat(billData.consultationFee) || 0) : 0;
    const test = billType === 'General' ? (parseFloat(billData.tests) || 0) : 0;
    const medicine = billType === 'General' ? (parseFloat(billData.medicines) || 0) : 0;
    const additional = parseFloat(billData.additionalCharges) || 0;
    const itemTotal = billType !== 'General' ? itemList.reduce((sum, item) => sum + (item.subtotal || 0), 0) : 0;
    const discount = parseFloat(billData.discounts) || 0;
    const tax = parseFloat(billData.taxRate) || 0;

    const subtotal = consultation + test + medicine + additional + itemTotal;
    const amountAfterDiscount = Math.max(0, subtotal - discount);
    const taxAmount = amountAfterDiscount * (tax / 100);
    const total = amountAfterDiscount + taxAmount;

    setBillData(prev => ({ ...prev, totalAmount: parseFloat(total.toFixed(2)) }));
  }, [billData.consultationFee, billData.tests, billData.medicines, billData.additionalCharges, billData.discounts, billData.taxRate, itemList, billType]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = type === 'number' ? ((value === '' || value === '.') ? '' : parseFloat(value) || 0) : value;
    setBillData(prev => ({ ...prev, [name]: newValue }));

    if (name === 'paymentMode') {
      setBillData(prev => ({ ...prev, status: value === 'Insurance' ? 'Pending' : 'Paid' }));
    }
  };

  const handleSave = async (shouldPrint = false) => {
    if (billData.patientName === '' || billData.totalAmount <= 0) {
      setStatusMessage('Error: Please ensure patient name is filled and total amount is greater than zero.');
      return;
    }

    setSaving(true);
    try {
      let items = [];
      if (billType === 'General') {
        if (billData.consultationFee > 0) items.push({ description: 'Consultation Fee', cost: billData.consultationFee, unitPrice: billData.consultationFee, subtotal: billData.consultationFee, qty: 1 });
        if (billData.tests > 0) items.push({ description: 'Tests/Lab Fees', cost: billData.tests, unitPrice: billData.tests, subtotal: billData.tests, qty: 1 });
        if (billData.medicines > 0) items.push({ description: 'Medicines/Pharmacy', cost: billData.medicines, unitPrice: billData.medicines, subtotal: billData.medicines, qty: 1 });
        if (billData.additionalCharges > 0) items.push({ description: 'Additional Charges', cost: billData.additionalCharges, unitPrice: billData.additionalCharges, subtotal: billData.additionalCharges, qty: 1 });
      } else {
        items = itemList.filter(i => i.description && i.subtotal > 0).map(i => ({
          productId: i.productId,
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
          cost: i.unitPrice,
          subtotal: i.subtotal
        }));
        if (billData.additionalCharges > 0) items.push({ description: 'Additional Charges', cost: billData.additionalCharges, unitPrice: billData.additionalCharges, subtotal: billData.additionalCharges, qty: 1 });
      }

      const newBill = await billingApi.create({
        patientId: billData.patientId || 'PID-' + Date.now(),
        patientName: billData.patientName,
        patientPhone: billData.patientPhone,
        doctorId: billData.doctorId || 'DID-001',
        doctorName: billData.doctorName,
        amount: billData.totalAmount,
        items: items,
        status: billData.status,
        discount: billData.discounts,
        notes: `Bill Type: ${billType}`,
        paymentMethod: billData.paymentMode,
        billType: billType
      });

      const transformedBill = transformApiData(newBill);
      // Auto-save medicine names to global DB (non-blocking)
      if (billType === 'Pharmacy') {
        const names = items.map(i => i.description).filter(n => n && n.length >= 2);
        if (names.length > 0) medicineApi.bulkSave(names).catch(() => { });
      }
      onSave(transformedBill, shouldPrint);
      setStatusMessage(`Success! Invoice ${newBill.billId} generated.`);
      onCancel();
    } catch (error) {
      console.error('Error creating bill:', error);
      setStatusMessage('Error: Failed to create bill.');
    } finally {
      setSaving(false);
    }
  };

  const itemTotal = billType !== 'General' ? itemList.reduce((sum, item) => sum + (item.subtotal || 0), 0) : 0;
  const subtotalCharges = parseFloat(((billType === 'General' ? (parseFloat(billData.consultationFee) || 0) : 0) + (billType === 'General' ? (parseFloat(billData.tests) || 0) : 0) + (billType === 'General' ? (parseFloat(billData.medicines) || 0) : 0) + (parseFloat(billData.additionalCharges) || 0) + itemTotal).toFixed(2));
  const amountAfterDiscount = Math.max(0, subtotalCharges - (parseFloat(billData.discounts) || 0));
  const taxAmount = parseFloat((amountAfterDiscount * ((parseFloat(billData.taxRate) || 0) / 100)).toFixed(2));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Generate New Bill</h2>
        <button onClick={onCancel} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl shadow-md text-gray-700 bg-white hover:bg-gray-100 transition ease-in-out duration-150">
          <BackIcon /> Back to List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="p-6 bg-sky-50 rounded-xl shadow-lg border border-sky-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">Select Appointment</h3>
            <div className="mb-6 relative">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Search Patient/Appointment</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"><SearchIcon /></div>
                <input
                  type="text"
                  value={apptSearchQuery}
                  onChange={(e) => { setApptSearchQuery(e.target.value); setShowApptDropdown(true); }}
                  onFocus={() => setShowApptDropdown(true)}
                  placeholder="Search by Name, ID, or Number..."
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-sky-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-bold text-slate-700 shadow-sm"
                />
              </div>
              {showApptDropdown && filteredAppts.length > 0 && (
                <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-sky-100 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {filteredAppts.map(appt => (
                      <div key={appt._id || appt.id} onClick={() => handleSelectAppointment(appt)} className="px-5 py-4 hover:bg-sky-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                        <h4 className="text-md font-bold text-slate-800">{appt.patientName}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                          <span>Dr. {appt.doctorName}</span>
                          <span>{new Date(appt.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showApptDropdown && <div className="fixed inset-0 z-[90] bg-transparent" onClick={() => setShowApptDropdown(false)} />}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-sky-100">
              <InputField label="Patient Name" name="patientName" value={billData.patientName} onChange={handleInputChange} readOnly />
              <InputField label="Doctor" name="doctorName" value={billData.doctorName} onChange={handleInputChange} readOnly />
              <InputField label="Date" name="appointmentDate" type="date" value={billData.appointmentDate} onChange={handleInputChange} />
            </div>
          </div>

          <div className="p-6 bg-sky-50 rounded-xl shadow-lg border border-sky-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">{billType} Details</h3>
              {billType !== 'General' && (
                <button onClick={handleAddItem} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg">
                  <PlusCircleIcon className="w-3 h-3" /> Add {billType === 'Pharmacy' ? 'Medicine' : 'Test'}
                </button>
              )}
            </div>
            {billType === 'General' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <InputField label="Consultation Fee" name="consultationFee" type="number" value={billData.consultationFee} onChange={handleInputChange} unit="₹" />
                <InputField label="Tests/Lab Fees" name="tests" type="number" value={billData.tests} onChange={handleInputChange} unit="₹" />
                <InputField label="Medicines/Pharmacy" name="medicines" type="number" value={billData.medicines} onChange={handleInputChange} unit="₹" />
                <InputField label="Additional Charges" name="additionalCharges" type="number" value={billData.additionalCharges} onChange={handleInputChange} unit="₹" />
              </div>
            ) : (
              <div className="space-y-4">
                {itemList.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center bg-white/50 p-3 rounded-xl border border-sky-100 relative">
                    <div className="col-span-1 md:col-span-5 relative">
                      <input type="text" placeholder="Description..."
                        value={item.description}
                        onChange={(e) => {
                          handleItemChange(index, 'description', e.target.value);
                          setProductSearch(e.target.value);
                          setShowProductDropdown(index);
                          if (billType === 'Pharmacy') {
                            setMedicineQuery(e.target.value);
                            setActiveMedicineRow(index);
                          }
                        }}
                        onFocus={() => {
                          setShowProductDropdown(index);
                          if (billType === 'Pharmacy') setActiveMedicineRow(index);
                        }}
                        onBlur={() => setTimeout(() => { setActiveMedicineRow(-1); setMedicineSuggestions([]); }, 200)}
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-lg text-xs font-bold"
                      />
                      {/* Global Medicine Suggestions (Pharmacy only) */}
                      {activeMedicineRow === index && medicineSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-indigo-100 overflow-hidden max-h-48 overflow-y-auto">
                          <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">💊 Global Medicine Database</p>
                          </div>
                          {medicineSuggestions.map((med) => (
                            <div
                              key={med._id}
                              onMouseDown={() => handleSelectMedicine(index, med.name)}
                              className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between group"
                            >
                              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{med.name}</span>
                              <span className="text-[9px] text-slate-300 font-medium">used {med.usageCount}×</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Local Product Dropdown */}
                      {showProductDropdown === index && productSearch && activeMedicineRow !== index && (
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border max-h-48 overflow-y-auto">
                          {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(product => (
                            <div key={product._id} onClick={() => handleSelectProduct(index, product)} className="px-4 py-2 hover:bg-sky-50 cursor-pointer border-b last:border-0">
                              <p className="text-xs font-bold">{product.name}</p>
                              <p className="text-[10px] text-slate-400">{formatCurrency(product.price)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <input type="number" value={item.qty === 0 ? '' : item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value === '' ? 0 : parseInt(e.target.value))} className="w-full px-3 py-2 bg-white border rounded-lg text-xs" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <input type="number" value={item.unitPrice === 0 ? '' : item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full px-3 py-2 bg-white border rounded-lg text-xs" />
                    </div>
                    <div className="col-span-1 md:col-span-2"><p className="px-3 py-2 bg-slate-50 border rounded-lg text-xs font-black">{formatCurrency(item.subtotal)}</p></div>
                    <div className="col-span-1 text-right">{itemList.length > 1 && <button onClick={() => handleRemoveItem(index)} className="text-rose-500"><XIcon /></button>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-sky-50 rounded-xl shadow-lg border border-sky-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Payment & Adjustments</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <InputField label="Total Discount" name="discounts" type="number" value={billData.discounts} onChange={handleInputChange} unit="₹" />
              <InputField label="Tax Rate" name="taxRate" type="number" value={billData.taxRate} onChange={handleInputChange} unit="%" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Cash', 'Card', 'UPI', 'Insurance'].map(mode => {
                const isSelected = billData.paymentMode === mode;
                return (
                  <label key={mode} className={`flex items-center p-3 border rounded-xl cursor-pointer ${isSelected ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-500' : 'bg-white'}`}>
                    <input type="radio" name="paymentMode" value={mode} checked={isSelected} onChange={handleInputChange} className="hidden" />
                    <span className="text-sm font-semibold">{mode}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4 p-6 bg-sky-50 rounded-xl shadow-2xl border-t-4 border-sky-600 h-fit lg:sticky lg:top-8">
          <h3 className="text-xl font-extrabold text-sky-700 mb-4 border-b pb-3">Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold">{formatCurrency(subtotalCharges)}</span></div>
            <div className="flex justify-between text-red-600"><span>Discount:</span><span className="font-bold">-{formatCurrency(billData.discounts)}</span></div>
            <div className="flex justify-between"><span>Tax:</span><span className="font-bold">{formatCurrency(taxAmount)}</span></div>
          </div>
          <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-sky-400">
            <span className="text-xl font-extrabold">Total:</span>
            <span className="text-2xl font-extrabold text-sky-800">{formatCurrency(billData.totalAmount)}</span>
          </div>
          <div className="pt-6 space-y-3">
            <button onClick={() => handleSave(true)} disabled={billData.totalAmount <= 0} className="w-full py-3 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 shadow-md">Save & Print</button>
            <button onClick={() => handleSave(false)} disabled={billData.totalAmount <= 0} className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 shadow-lg">Save Invoice</button>
          </div>
        </div>
      </div>
    </div>
  );
};


const InvoiceDetailModal = ({ invoice, onClose, onUpdateStatus, onDelete, onPrint, onSendWhatsApp, clinicInfo = {}, onUpdateBill }) => {
  const [newInstallmentAmount, setNewInstallmentAmount] = useState('');
  const [newInstallmentMode, setNewInstallmentMode] = useState('Cash');
  const [newInstallmentTxId, setNewInstallmentTxId] = useState('');
  const [newInstallmentNotes, setNewInstallmentNotes] = useState('');
  const [savingInstallment, setSavingInstallment] = useState(false);
  const [installmentError, setInstallmentError] = useState('');

  const details = invoice.details || {};

  const paymentHistory = (invoice.installments && invoice.installments.length > 0)
    ? invoice.installments
    : (invoice.paidAmount > 0
        ? [{
            date: invoice.dateRaw || invoice.date || new Date(),
            amount: invoice.paidAmount,
            paymentMethod: details.paymentMode || invoice.paymentMethod || 'N/A',
            transactionId: invoice.transactionId || '',
            notes: 'Single payment'
          }]
        : []);
  const isItemized = invoice.items && invoice.items.length > 0;
  const chargeItems = isItemized
    ? invoice.items.map(item => ({ label: item.description, value: item.subtotal || (item.qty * (item.unitPrice || item.cost)) || 0, qty: item.qty, unitPrice: item.unitPrice || item.cost }))
    : [
      { label: 'Consultation Fee', value: details.consultationFee },
      { label: 'Tests/Lab Fees', value: details.tests },
      { label: 'Medicines/Pharmacy', value: details.medicines },
      { label: 'Additional Charges', value: details.additionalCharges },
    ].filter(item => (parseFloat(item.value) || 0) > 0);

  const subtotalCharges = isItemized ? chargeItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0) : [details.consultationFee, details.tests, details.medicines, details.additionalCharges].reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const amountAfterDiscount = Math.max(0, subtotalCharges - (parseFloat(details.discount || details.discounts) || 0));
  const taxAmount = amountAfterDiscount * ((parseFloat(details.taxRate) || 0) / 100);

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    setInstallmentError('');
    const amt = parseFloat(newInstallmentAmount);
    if (isNaN(amt) || amt <= 0) {
      setInstallmentError('Please enter a valid installment amount.');
      return;
    }
    if (amt > invoice.dueAmount) {
      setInstallmentError(`Installment amount cannot exceed remaining due (₹${invoice.dueAmount}).`);
      return;
    }

    setSavingInstallment(true);
    try {
      const baseInstallments = (invoice.installments && invoice.installments.length > 0)
        ? invoice.installments
        : (invoice.paidAmount > 0
            ? [{
                date: invoice.dateRaw || invoice.date || new Date(),
                amount: invoice.paidAmount,
                paymentMethod: details.paymentMode || invoice.paymentMethod || 'N/A',
                transactionId: invoice.transactionId || '',
                notes: 'Initial payment'
              }]
            : []);

      const updatedInstallments = [
        ...baseInstallments,
        {
          date: new Date(),
          amount: amt,
          paymentMethod: newInstallmentMode,
          transactionId: newInstallmentTxId,
          notes: newInstallmentNotes || 'Subsequent payment'
        }
      ];

      const updatedBill = await billingApi.update(invoice._id, {
        installments: updatedInstallments
      });

      if (onUpdateBill) {
        onUpdateBill(updatedBill);
      }
      
      setNewInstallmentAmount('');
      setNewInstallmentTxId('');
      setNewInstallmentNotes('');
    } catch (err) {
      console.error(err);
      setInstallmentError('Failed to record installment payment. Please try again.');
    } finally {
      setSavingInstallment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 sm:p-6 no-print" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative p-6 border-4 border-black" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-black hover:text-red-500 font-bold"><XIcon /></button>
        <div className="border-b-2 border-black pb-4 mb-4">
          <h1 className="text-3xl font-black text-black tracking-tight uppercase mb-1">INVOICE</h1>
          <p className="text-xs font-black text-black">#{invoice.id}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-black">
            <p className="text-[10px] font-black uppercase text-black mb-2">Patient</p>
            <h3 className="font-extrabold text-lg text-black">{invoice.patient}</h3>
            <p className="text-xs font-bold text-black">ID: {invoice.patientId}</p>
          </div>
          <div className="text-right text-black">
            <p className="text-xs font-black">Date: {invoice.date}</p>
            <p className="text-xs font-black">Mode: {details.paymentMode}</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black mt-2 ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>{invoice.status}</span>
          </div>
        </div>
        <table className="w-full mb-6 border-2 border-black rounded-lg overflow-hidden">
          <thead className="bg-black text-white text-[10px] uppercase font-black">
            <tr><th className="px-4 py-2 text-left border-r border-black">Description</th>{isItemized && <th className="px-4 py-2 border-r border-black">Qty</th>}<th className="px-4 py-2 text-right">Amount</th></tr>
          </thead>
          <tbody className="text-xs divide-y-2 divide-black text-black">
            {chargeItems.map((item, i) => (
              <tr key={i}><td className="px-4 py-2 font-bold border-r border-black">{item.label}</td>{isItemized && <td className="px-4 py-2 text-center font-bold border-r border-black">{item.qty}</td>}<td className="px-4 py-2 text-right font-black">{formatCurrency(item.value)}</td></tr>
            ))}
          </tbody>
        </table>

        {/* Payment Installments / History Section */}
        {paymentHistory.length > 0 && (
          <div className="mb-6 p-4 border-2 border-black rounded-xl bg-slate-50">
            <h4 className="text-xs font-black text-black uppercase tracking-widest mb-3 border-b-2 border-black pb-1.5">
              Payment Installments / History
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-black text-xs">
                <thead>
                  <tr className="text-black font-black">
                    <th className="px-2 py-1.5 text-left font-black tracking-wider border-r border-black">Date</th>
                    <th className="px-2 py-1.5 text-left font-black tracking-wider border-r border-black">Patient Name</th>
                    <th className="px-2 py-1.5 text-left font-black tracking-wider border-r border-black">Mode</th>
                    <th className="px-2 py-1.5 text-left font-black tracking-wider border-r border-black">Transaction ID</th>
                    <th className="px-2 py-1.5 text-right font-black tracking-wider">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-black">
                  {paymentHistory.map((inst, index) => (
                    <tr key={index}>
                      <td className="px-2 py-1.5 font-bold border-r border-black">
                        {new Date(inst.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-2 py-1.5 font-bold border-r border-black">{invoice.patient}</td>
                      <td className="px-2 py-1.5 border-r border-black">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          inst.paymentMethod === 'Cash' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                          inst.paymentMethod === 'UPI' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          inst.paymentMethod === 'Card' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}>
                          {inst.paymentMethod}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[10px] font-bold border-r border-black">{inst.transactionId || '—'}</td>
                      <td className="px-2 py-1.5 text-right font-black">{formatCurrency(inst.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Record New Installment payment Mode */}
        {invoice.dueAmount > 0 && (
          <div className="mb-6 p-4 border-2 border-black rounded-xl bg-green-50/20">
            <h4 className="text-xs font-black text-black uppercase tracking-widest mb-3 border-b-2 border-black pb-1.5">
              Record New Payment / Installment
            </h4>
            {installmentError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-black">
                {installmentError}
              </div>
            )}
            <form onSubmit={handleAddInstallment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={newInstallmentMode}
                    onChange={(e) => setNewInstallmentMode(e.target.value)}
                    className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={invoice.dueAmount}
                    value={newInstallmentAmount}
                    onChange={(e) => setNewInstallmentAmount(e.target.value)}
                    placeholder={`Max ₹${invoice.dueAmount}`}
                    className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none"
                    required
                  />
                </div>
                {newInstallmentMode !== 'Cash' ? (
                  <div>
                    <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={newInstallmentTxId}
                      onChange={(e) => setNewInstallmentTxId(e.target.value)}
                      placeholder="Tx ID"
                      className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none"
                    />
                  </div>
                ) : (
                  <div className="hidden sm:block"></div>
                )}
                <div>
                  <button
                    type="submit"
                    disabled={savingInstallment || !newInstallmentAmount}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition disabled:opacity-50 border border-black"
                  >
                    {savingInstallment ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  value={newInstallmentNotes}
                  onChange={(e) => setNewInstallmentNotes(e.target.value)}
                  placeholder="Installment payment notes..."
                  className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none"
                />
              </div>
            </form>
          </div>
        )}

        <div className="flex justify-end mb-6">
          <div className="w-64 bg-slate-50 p-4 border-2 border-black rounded-xl space-y-2 text-black">
            <div className="flex justify-between text-xs font-bold"><span>Subtotal:</span><span>{formatCurrency(subtotalCharges)}</span></div>
            <div className="flex justify-between text-xs font-bold"><span>Tax:</span><span>{formatCurrency(taxAmount)}</span></div>
            {parseFloat(details.discount || details.discounts) > 0 && <div className="flex justify-between text-xs text-red-650 font-bold"><span>Discount:</span><span>-{formatCurrency(details.discount || details.discounts)}</span></div>}
            
            {invoice.installments && invoice.installments.length > 0 ? (
              <>
                <div className="flex justify-between items-center pt-2 text-xs text-green-700 border-t-2 border-black mt-2 font-black">
                  <span className="uppercase tracking-wide">Paid So Far</span>
                  <span>{formatCurrency(invoice.paidAmount)}</span>
                </div>
                {invoice.dueAmount > 0 ? (
                  <div className="flex justify-between items-center pt-2 text-xs text-red-700 font-black">
                    <span className="uppercase tracking-wide">Due Amount</span>
                    <span>{formatCurrency(invoice.dueAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center pt-2 text-xs text-green-700 font-black border-t-2 border-black mt-2">
                    <span className="uppercase tracking-wide">STATUS</span>
                    <span>FULLY PAID</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between font-black text-lg border-t-2 border-black pt-2 mt-2"><span>Total:</span><span className="text-black">{formatCurrency(details.totalAmount)}</span></div>
            )}
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button onClick={() => onPrint(invoice)} className="px-6 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 font-black border border-black"><PrinterIcon /> Print</button>
          <button onClick={() => onSendWhatsApp(invoice)} className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 font-black border border-black"><Phone size={18} /> WhatsApp</button>
        </div>
      </div>
    </div>
  );
};

const BillingMgmt = () => {
  const { user, updateUser, isDentistClinic } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};
  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 15 });
  const itemsPerPage = 15;
  const [statusMessage, setStatusMessage] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [billingTab, setBillingTab] = useState('General');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);

  const fetchData = useCallback(async (page = 1, overrideBillType) => {
    const currentBillType = overrideBillType !== undefined ? overrideBillType : billingTab;
    try {
      setLoading(true);
      const [billingResponse, appointmentData, doctorData] = await Promise.all([
        billingApi.getAll({
          page,
          limit: itemsPerPage,
          search: searchTerm,
          status: activeFilter === 'All' ? '' : activeFilter,
          billType: currentBillType
        }),
        appointmentApi.getAll(),
        centralDoctorApi.getAll()
      ]);

      const billsData = billingResponse.bills || (Array.isArray(billingResponse) ? billingResponse : []);
      setInvoices(billsData.map(transformApiData));
      setPagination(billingResponse.pagination || { total: billsData.length, totalPages: 1, limit: itemsPerPage });
      setCurrentPage(page);

      setAppointments(appointmentData || []);
      setDoctors(doctorData?.doctors || (Array.isArray(doctorData) ? doctorData : []));
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeFilter, billingTab]);

  useEffect(() => {
    fetchData(1, billingTab);
  }, [activeFilter, billingTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAction = (action, invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    if (action === 'View') setSelectedInvoice(invoice);
    else if (action === 'Print') setPrintingInvoice(invoice);
    else if (action === 'WhatsApp') handleSendWhatsApp(invoice);
  };

  const handleSendWhatsApp = async (invoice) => {
    try {
      setStatusMessage('Sending WhatsApp...');
      await billingApi.sendWhatsApp(invoice._id);
      setStatusMessage('WhatsApp sent!');
    } catch (err) { setStatusMessage('WhatsApp failed.'); }
  };

  const handleUpdateBill = (updatedBill) => {
    const transformed = transformApiData(updatedBill);
    setInvoices(prev => prev.map(inv => inv.id === transformed.id ? transformed : inv));
    if (selectedInvoice && selectedInvoice.id === transformed.id) {
      setSelectedInvoice(transformed);
    }
  };

  useEffect(() => {
    if (!printingInvoice) return;
    const timeout = setTimeout(() => { window.print(); setPrintingInvoice(null); }, 1500);
    return () => clearTimeout(timeout);
  }, [printingInvoice]);

  const paginatedInvoices = invoices; // Now paginated on server-side

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print { 
          .no-print { display: none !important; } 
          .print-only { 
            display: block !important; 
            position: absolute !important; 
            top: 0 !important; 
            left: 0 !important;
            width: 100% !important; 
            padding: 1.5cm !important;
          } 
          @page { margin: 0; }
        }
        @media screen { .print-only { display: none; } }
      `}} />

      <div className="min-h-screen bg-gray-100 p-4 no-print">
        <header className="mb-6"><h1 className="text-2xl font-black text-gray-900 md:pl-10 transition-all">Billing Management</h1></header>
        {statusMessage && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg font-bold">{statusMessage}</div>}

        <div className={`grid grid-cols-1 ${isDentistClinic ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6`}>
          {[
            { id: 'General', label: 'Consultation', icon: User, color: 'sky' },
            { id: 'Pharmacy', label: 'Pharmacy', icon: PlusCircle, color: 'indigo' },
            ...(isDentistClinic ? [{ id: 'Dental', label: 'Dental', icon: FileText, color: 'emerald' }] : [])
          ].map(tab => (
            <button key={tab.id} onClick={() => { setBillingTab(tab.id); setViewMode('list'); }}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${billingTab === tab.id ? `bg-white border-${tab.color}-500 shadow-xl ring-4 ring-${tab.color}-500/10` : 'bg-slate-50 border-slate-100 hover:bg-white'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${billingTab === tab.id ? `bg-${tab.color}-600 text-white` : 'bg-white text-slate-400 shadow-sm'}`}><tab.icon size={24} /></div>
                <div><h3 className="text-sm font-black uppercase tracking-tight">{tab.label} Billing</h3><p className="text-[10px] font-bold text-slate-400 uppercase">Manage {tab.id} Bills</p></div>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          {viewMode === 'list' ? (
            <InvoiceList
              filteredInvoices={paginatedInvoices}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setViewMode={setViewMode}
              handleAction={handleAction}
              billingTab={billingTab}
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={fetchData}
              totalItems={pagination.total}
              itemsPerPage={itemsPerPage}
            />
          ) : (
            <GenerateBillForm onSave={(inv) => { setInvoices(p => [inv, ...p]); setViewMode('list'); }} onCancel={() => setViewMode('list')} setStatusMessage={setStatusMessage} appointments={appointments} doctors={doctors} billType={billingTab} />
          )}
        </div>
        {selectedInvoice && (
          <InvoiceDetailModal 
            invoice={selectedInvoice} 
            onClose={() => setSelectedInvoice(null)} 
            onPrint={i => setPrintingInvoice(i)} 
            onSendWhatsApp={handleSendWhatsApp} 
            clinicInfo={clinicInfo} 
            onUpdateBill={handleUpdateBill}
          />
        )}
      </div>

      <div className="print-only bg-white text-black">
        {printingInvoice && (
          <InvoiceTemplate
            clinicInfo={clinicInfo}
            invoiceData={{
              billId: printingInvoice.id,
              date: printingInvoice.dateRaw || printingInvoice.date,
              patientName: printingInvoice.patient,
              patientId: printingInvoice.patientId,
              doctorName: printingInvoice.doctor,
              items: printingInvoice.items.length > 0 ? printingInvoice.items.map(i => ({ description: i.description, price: i.unitPrice || i.cost, quantity: i.qty })) : [{ description: 'Service', price: printingInvoice.amount, quantity: 1 }],
              subtotal: printingInvoice.details?.totalAmount,
              discount: printingInvoice.details?.discount || 0,
              taxRate: printingInvoice.details?.taxRate || 0,
              total: printingInvoice.amount,
              paymentMethod: printingInvoice.details?.paymentMode || 'Cash',
              status: printingInvoice.status,
              installments: printingInvoice.installments || [],
              paidAmount: printingInvoice.paidAmount,
              dueAmount: printingInvoice.dueAmount
            }}
          />
        )}
      </div>
    </>
  );
};

export default BillingMgmt;
