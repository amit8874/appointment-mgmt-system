import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, PlusCircle, FileText, User, Filter, ChevronLeft, ChevronRight, Send, Phone, Trash2, CheckCircle, Clock, AlertCircle, Eye, Printer, X, Download } from 'lucide-react';
import { billingApi, appointmentApi, centralDoctorApi, authApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import InvoiceTemplate from '../../../components/Shared/InvoiceTemplate';
import Pagination from '../../../components/common/Pagination';
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
    </div>

    {/* NEW: Summary Cards - Horizontal on mobile */}
    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
      {summaryMetrics.map(metric => (
        <SummaryCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          colorClass={metric.colorClass}
          icon={metric.icon}
        />
      ))}
    </div>

    {/* NEW: Filtering & Search Bar */}
    <div className="flex flex-col sm:flex-row justify-end items-center mb-3 gap-3">

      {/* Search Bar */}
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


    {/* Invoice Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredInvoices.map((invoice) => (
        <div key={invoice.id}
          // Added 'group' for hover targeting, set base bg to white
          className="group relative bg-white rounded-xl shadow-lg border border-green-200 overflow-hidden
                        transition-all duration-300 ease-in-out transform cursor-pointer
                        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
                        active:shadow-2xl active:scale-[1.02] active:-translate-y-1"
        >

          {/* 1. The Wipe Layer: Dark green swap effect (Top to Bottom) */}
          <div className="absolute inset-0 bg-green-700 transform translate-y-full transition-transform duration-500 ease-out group-hover:translate-y-0 group-active:translate-y-0 z-0"></div>

          {/* 2. Content Wrapper: Ensures content stays on top of the wipe layer */}
          <div className="relative z-10">
            {/* Header: ID and Status */}
            <div className={`p-4 flex justify-between items-center border-b-2 border-green-100 group-hover:border-green-600 transition-colors duration-300`}>
              <span className={`text-sm font-bold tracking-wider text-green-700 group-hover:text-white transition-colors duration-300`}>
                {invoice.id}
              </span>
              <StatusBadge status={invoice.status} />
            </div>

            {/* Body: Details */}
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

            {/* Footer: Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2 group-hover:bg-slate-800 transition-colors duration-300">
              <button
                onClick={() => handleAction('Email', invoice.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm active:scale-95"
                title="Send via Email"
              >
                <Send className="w-3.5 h-3.5" />
                Email
              </button>
              <button
                onClick={() => handleAction('WhatsApp', invoice.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm active:scale-95"
                title="Send via WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={() => handleAction('View', invoice.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm active:scale-95"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button
                onClick={() => handleAction('Print', invoice.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm group-hover:bg-slate-700 group-hover:text-white group-hover:border-slate-600 active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Pagination Component */}
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

// Primary accent color (Cyan/Sky Blue for a modern look)
const PRIMARY_COLOR = 'sky';
const ACCENT_COLOR_CLASS = `bg-${PRIMARY_COLOR}-600 hover:bg-${PRIMARY_COLOR}-700 focus:ring-${PRIMARY_COLOR}-500`;

// Currency Formatter - UPDATED TO INR (Indian Rupees)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

// Function to transform API data to component format
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
        medicines: normalized.grossAmount, // Pharmacy bills are essentially all "medicines"
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
        // Ultimate fallback: if it's a consultation item but has no cost/price fields, 
        // use the total amount as a fallback for these legacy/broken records
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

// --- Form State Initialization & Mock Data Helpers ---
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
  taxRate: 5, // Default 5%
  totalAmount: 0,
  paidAmount: 0,
  paidAmountModified: false,
  paymentMode: 'Cash',
  status: 'Paid',
});

// Function to generate full details for mock data based on a base amount
const createMockInvoiceDetails = (id, patient, doctor, date, amount, status) => {
  // Reverse-engineer charges to total the amount
  const taxRate = 8;
  const discounts = status === 'Pending' ? 0.00 : Math.round(amount * 0.05); // Small discount if paid

  // Total without tax (before discount)
  const totalWithoutTax = amount / (1 + (taxRate / 100));
  const preDiscountTotal = totalWithoutTax + discounts;

  const consultation = Math.round(preDiscountTotal * 0.4);
  const tests = Math.round(preDiscountTotal * 0.3);
  const medicines = Math.round(preDiscountTotal * 0.3);

  return {
    id, patient, doctor, date, amount, status,
    details: {
      ...getInitialBillState(),
      patient: patient + ' (Mock)',
      doctor,
      appointmentDate: date,
      consultationFee: consultation,
      tests: tests,
      medicines: medicines,
      discounts: discounts,
      taxRate: taxRate,
      totalAmount: amount,
      paymentMode: status === 'Pending' ? 'Insurance' : 'Card',
      status,
    }
  };
};

// --- Helper Icon Components ---
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


// Payment Mode Icons (imported for form, kept here for completeness)
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

const CalendarPlus = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4" /><path d="M16 2v4" /><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" /><path d="M3 10h18" /><path d="M16 19h6" /><path d="M19 16v6" />
  </svg>
);

const ShieldIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

// Helper mapping for payment modes to icons
const paymentModeIcons = {
  Cash: WalletIcon,
  Card: CreditCardIcon,
  UPI: SmartphoneIcon,
  Insurance: ShieldIcon,
};


// --- Input Field Component (Used in Form) ---
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
            // This allows the user to start typing immediately without deleting the 0
            e.target.select();
          }
        }}
        placeholder={placeholder || (type === 'number' ? '0' : '')}
        min={type === 'number' ? 0 : undefined}
        // Check for '₹' unit to adjust padding
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


// --- Billing Form Component (Used in generate mode) ---
const GenerateBillForm = ({ onSave, onCancel, setStatusMessage, appointments = [], doctors = [], billType = 'General' }) => {
  const [billData, setBillData] = useState({
    ...getInitialBillState(),
    billType
  });
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [saving, setSaving] = useState(false);

  // Itemized billing state for Pharmacy/Lab
  const [itemList, setItemList] = useState([{ description: '', qty: 1, unitPrice: 0, subtotal: 0 }]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(-1); // Index of the row being searched

  // Search state for appointments
  const [apptSearchQuery, setApptSearchQuery] = useState('');
  const [showApptDropdown, setShowApptDropdown] = useState(false);

  // Global medicine autocomplete state
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [activeMedicineRow, setActiveMedicineRow] = useState(-1);
  const [medicineQuery, setMedicineQuery] = useState('');

  // Fetch products for Pharmacy or Lab
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

  // Filtered appointments for the search
  const filteredAppts = useMemo(() => {
    if (!apptSearchQuery.trim()) return appointments.slice(0, 5);
    const query = apptSearchQuery.toLowerCase();
    return appointments.filter(a =>
      String(a.patientName || '').toLowerCase().includes(query) ||
      String(a.patientId || '').toLowerCase().includes(query) ||
      String(a.patientPhone || '').includes(query)
    ).slice(0, 8);
  }, [appointments, apptSearchQuery]);

  // Handle manual selection from dropdown
  const handleSelectAppointment = (appt) => {
    setSelectedAppointmentId(appt._id || appt.id);
    setApptSearchQuery(appt.patientName || appt.patient?.name || '');
    setShowApptDropdown(false);

    // Find doctor to get their fee
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
          if (isNaN(d.getTime())) {
            // Try to parse DD/MM/YYYY or DD-MM-YYYY
            if (typeof appt.date === 'string') {
              const parts = appt.date.split(/[-/]/);
              if (parts.length === 3) {
                const fallbackDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (!isNaN(fallbackDate.getTime())) {
                  return fallbackDate.toISOString().substring(0, 10);
                }
              }
            }
            return prev.appointmentDate;
          }
          return d.toISOString().substring(0, 10);
        } catch (e) {
          return prev.appointmentDate;
        }
      })(),
      consultationFee: doctor?.consultantFee || doctor?.fee || 0
    }));
  };

  // Item List Handlers
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

  // Auto-calculation logic
  useEffect(() => {
    const consultation = billType === 'General' ? (parseFloat(billData.consultationFee) || 0) : 0;
    const test = billType === 'General' ? (parseFloat(billData.tests) || 0) : 0;
    const medicine = billType === 'General' ? (parseFloat(billData.medicines) || 0) : 0;
    const additional = parseFloat(billData.additionalCharges) || 0;

    // Sum from item list if itemized
    const itemTotal = billType !== 'General'
      ? itemList.reduce((sum, item) => sum + (item.subtotal || 0), 0)
      : 0;

    const discount = parseFloat(billData.discounts) || 0;
    const tax = parseFloat(billData.taxRate) || 0;

    const subtotal = consultation + test + medicine + additional + itemTotal;
    const amountAfterDiscount = Math.max(0, subtotal - discount);
    const taxAmount = amountAfterDiscount * (tax / 100);
    const total = parseFloat((amountAfterDiscount + taxAmount).toFixed(2));

    setBillData(prev => {
      const isFullyPaid = prev.status === 'Paid';
      const newPaid = isFullyPaid ? total : 0;
      return {
        ...prev,
        totalAmount: total,
        paidAmount: prev.paidAmountModified ? prev.paidAmount : newPaid
      };
    });
  }, [
    billData.consultationFee,
    billData.tests,
    billData.medicines,
    billData.additionalCharges,
    billData.discounts,
    billData.taxRate,
    itemList,
    billType,
    billData.status
  ]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    // Handle number inputs to ensure they are valid floats or empty string
    let newValue = value;
    if (type === 'number') {
      newValue = (value === '' || value === '.') ? '' : parseFloat(value) || 0;
    }

    setBillData(prev => {
      const updated = { ...prev, [name]: newValue };
      if (name === 'paidAmount') {
        updated.paidAmountModified = true;
        if (newValue >= prev.totalAmount) {
          updated.status = 'Paid';
        } else if (newValue > 0) {
          updated.status = 'Due';
        } else {
          updated.status = 'Pending';
        }
      }
      // Update status to Paid if mode is cash/card/UPI, otherwise Pending for Insurance
      if (name === 'paymentMode') {
        updated.status = value === 'Insurance' ? 'Pending' : 'Paid';
        if (!prev.paidAmountModified) {
          updated.paidAmount = value === 'Insurance' ? 0 : prev.totalAmount;
        }
      }
      return updated;
    });
  };

  const handleSave = async (shouldPrint = false) => {
    if (billData.patientName === '' || billData.totalAmount <= 0) {
      setStatusMessage('Error: Please ensure patient name is filled and total amount is greater than zero.');
      return;
    }

    setSaving(true);
    try {
      // Prepare items array
      let items = [];
      if (billType === 'General') {
        if (billData.consultationFee > 0) items.push({ description: 'Consultation Fee', cost: billData.consultationFee, unitPrice: billData.consultationFee, subtotal: billData.consultationFee, qty: 1 });
        if (billData.tests > 0) items.push({ description: 'Tests/Lab Fees', cost: billData.tests, unitPrice: billData.tests, subtotal: billData.tests, qty: 1 });
        if (billData.medicines > 0) items.push({ description: 'Medicines/Pharmacy', cost: billData.medicines, unitPrice: billData.medicines, subtotal: billData.medicines, qty: 1 });
        if (billData.additionalCharges > 0) items.push({ description: 'Additional Charges', cost: billData.additionalCharges, unitPrice: billData.additionalCharges, subtotal: billData.additionalCharges, qty: 1 });
      } else {
        // For Pharmacy/Lab, use the itemized list
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

      // Map payment mode to API format
      const paymentModeMap = {
        'Cash': 'Cash',
        'Card': 'Card',
        'UPI': 'UPI',
        'Insurance': 'Insurance'
      };

      const initialPaid = parseFloat(billData.paidAmount) || 0;
      const initialDue = Math.max(0, billData.totalAmount - initialPaid);
      let calculatedStatus = 'Pending';
      if (initialPaid >= billData.totalAmount) {
        calculatedStatus = 'Paid';
      } else if (initialPaid > 0) {
        calculatedStatus = 'Due';
      }

      // Create bill via API
      const newBill = await billingApi.create({
        patientId: billData.patientId || 'PID-' + Date.now(),
        patientName: billData.patientName,
        patientPhone: billData.patientPhone,
        doctorId: billData.doctorId || 'DID-001',
        doctorName: billData.doctorName,
        amount: billData.totalAmount,
        paidAmount: initialPaid,
        dueAmount: initialDue,
        items: items,
        status: calculatedStatus,
        discount: billData.discounts,
        notes: `Bill Type: ${billType}${billData.appointmentDate ? ` | Appt Date: ${billData.appointmentDate}` : ''}`,
        paymentMethod: paymentModeMap[billData.paymentMode] || 'Cash',
        billType: billType,
        installments: initialPaid > 0 ? [{
          date: new Date(),
          amount: initialPaid,
          paymentMethod: paymentModeMap[billData.paymentMode] || 'Cash',
          notes: 'Initial payment / Installment'
        }] : []
      });

      // Auto-save medicine names to global DB (non-blocking)
      if (billType === 'Pharmacy') {
        const names = items.map(i => i.description).filter(n => n && n.length >= 2);
        if (names.length > 0) medicineApi.bulkSave(names).catch(() => { });
      }

      // Transform API response to component format
      const transformedBill = transformApiData(newBill);
      onSave(transformedBill, shouldPrint);
      setStatusMessage(`Success! Invoice ${newBill.billId} generated and marked as ${newBill.status}.`);
      onCancel();
    } catch (error) {
      console.error('Error creating bill:', error);
      setStatusMessage('Error: Failed to create bill. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    handleSave(true);
  }

  const itemTotal = billType !== 'General'
    ? itemList.reduce((sum, item) => sum + (item.subtotal || 0), 0)
    : 0;

  const subtotalCharges = parseFloat((
    (billType === 'General' ? (parseFloat(billData.consultationFee) || 0) : 0) +
    (billType === 'General' ? (parseFloat(billData.tests) || 0) : 0) +
    (billType === 'General' ? (parseFloat(billData.medicines) || 0) : 0) +
    (parseFloat(billData.additionalCharges) || 0) +
    itemTotal
  ).toFixed(2));
  const amountAfterDiscount = Math.max(0, subtotalCharges - (parseFloat(billData.discounts) || 0));
  const taxAmount = parseFloat((amountAfterDiscount * ((parseFloat(billData.taxRate) || 0) / 100)).toFixed(2));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
          Generate New Bill
        </h2>
        <button
          onClick={onCancel}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl shadow-md text-gray-700 bg-white hover:bg-gray-100 transition ease-in-out duration-150"
        >
          <BackIcon />
          Back to List
        </button>
      </div>

      {/* Main Billing Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Charges, Discount & Payment (3/4 width) */}
        <div className="lg:col-span-3 space-y-6">

          {/* Patient Details Card */}
          <div className="p-6 bg-sky-50 rounded-xl shadow-lg border border-sky-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              Select Appointment
              <span className={`ml-3 text-sm font-medium text-${PRIMARY_COLOR}-600 uppercase tracking-widest text-[10px]`}> (Required for Dynamic Billing)</span>
            </h3>
            <div className="mb-6 relative">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Search Appointment (Name, ID, or Phone)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-sky-400" />
                </div>
                <input
                  type="text"
                  value={apptSearchQuery}
                  onChange={(e) => {
                    setApptSearchQuery(e.target.value);
                    setShowApptDropdown(true);
                  }}
                  onFocus={() => setShowApptDropdown(true)}
                  placeholder="Search by Patient Name, ID, or Number..."
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-sky-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-bold text-slate-700 shadow-sm placeholder:text-slate-300"
                />
                {apptSearchQuery && (
                  <button
                    onClick={() => { setApptSearchQuery(''); setBillData(getInitialBillState()); }}
                    className="absolute inset-y-0 right-4 flex items-center text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showApptDropdown && filteredAppts.length > 0 && (
                <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-sky-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-64 overflow-y-auto">
                    {filteredAppts.map(appt => (
                      <div
                        key={appt._id || appt.id}
                        onClick={() => handleSelectAppointment(appt)}
                        className="px-5 py-4 hover:bg-sky-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-md font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                            {appt.patientName}
                          </h4>
                          <span className="text-[10px] font-black bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full uppercase">
                            #{appt.patientId || 'NEW'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> Dr. {appt.doctorName}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarPlus className="h-3 w-3" /> {new Date(appt.date).toLocaleDateString()}
                          </span>
                          {appt.patientPhone && (
                            <span className="flex items-center gap-1">
                              <SmartphoneIcon className="h-3 w-3" /> {appt.patientPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-t border-gray-100">
                    Showing Top Matches
                  </div>
                </div>
              )}

              {/* Backdrop to close dropdown */}
              {showApptDropdown && (
                <div
                  className="fixed inset-0 z-[90] bg-transparent"
                  onClick={() => setShowApptDropdown(false)}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-sky-100">
              <InputField label="Patient Name" name="patientName" value={billData.patientName} onChange={handleInputChange} readOnly />
              <InputField label="Doctor" name="doctorName" value={billData.doctorName} onChange={handleInputChange} readOnly />
              <InputField label="Date" name="appointmentDate" type="date" value={billData.appointmentDate} onChange={handleInputChange} />
            </div>
          </div>

          {/* Service Charges Card / Itemized List */}
          <div className="p-6 bg-sky-50 rounded-xl shadow-lg border border-sky-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">{billType} Billing Details</h3>
              {billType !== 'General' && (
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg shadow-md hover:bg-indigo-700 transition-all"
                >
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
                <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2">Subtotal</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {itemList.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center bg-white/50 p-3 rounded-xl border border-sky-100 relative group animate-in slide-in-from-left-2" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="col-span-1 md:col-span-5 relative">
                      <input
                        type="text"
                        placeholder={`Search ${billType === 'Pharmacy' ? 'Medicine' : 'Test'}...`}
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
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-700"
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
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-sky-100 overflow-hidden max-h-48 overflow-y-auto">
                          {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(product => (
                            <div
                              key={product._id}
                              onClick={() => handleSelectProduct(index, product)}
                              className="px-4 py-2 hover:bg-sky-50 cursor-pointer transition-colors border-b border-sky-50 last:border-0"
                            >
                              <p className="text-xs font-bold text-slate-700">{product.name}</p>
                              <p className="text-[10px] text-slate-400">Price: {formatCurrency(product.price)} | {product.manufacturer || 'General'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <input
                        type="number"
                        value={item.qty === 0 ? '' : item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-lg text-xs font-bold text-slate-700"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                        <input
                          type="number"
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="w-full pl-6 pr-3 py-2 bg-white border border-sky-100 rounded-lg text-xs font-bold text-slate-700"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <p className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black text-indigo-600">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                    <div className="col-span-1 md:col-span-1 text-right">
                      {itemList.length > 1 && (
                        <button onClick={() => handleRemoveItem(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <XIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-sky-100">
                  <InputField label="Additional Charges (Admin/Service)" name="additionalCharges" type="number" value={billData.additionalCharges} onChange={handleInputChange} unit="₹" />
                </div>
              </div>
            )}
          </div>

          {/* Discount, Tax & Payment Card */}
          <div className="p-6 bg-sky-50 rounded-xl shadow-lg border border-sky-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Adjustment & Payment</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 pb-6 border-b border-gray-100">
              <InputField label="Discounts" name="discounts" type="number" value={billData.discounts} onChange={handleInputChange} unit="₹" />
              <InputField label="Tax Rate (e.g. VAT/GST)" name="taxRate" type="number" value={billData.taxRate} onChange={handleInputChange} unit="%" />
            </div>

            <div>
              <h4 className="text-md font-bold text-gray-700 mb-3">Payment Mode</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Cash', 'Card', 'UPI', 'Insurance'].map(mode => {
                  const IconComponent = paymentModeIcons[mode];
                  const isSelected = billData.paymentMode === mode;
                  const iconColor = isSelected ? `text-${PRIMARY_COLOR}-600` : 'text-gray-500';

                  return (
                    <label
                      key={mode}
                      className={`flex items-center p-3 border rounded-xl cursor-pointer transition duration-150 shadow-sm
                                      ${isSelected ? `border-${PRIMARY_COLOR}-500 bg-${PRIMARY_COLOR}-50 ring-2 ring-${PRIMARY_COLOR}-500` : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <input
                        type="radio"
                        name="paymentMode"
                        value={mode}
                        checked={isSelected}
                        onChange={handleInputChange}
                        className={`h-4 w-4 text-${PRIMARY_COLOR}-600 border-gray-300 focus:ring-${PRIMARY_COLOR}-500 hidden`}
                      />
                      <IconComponent className={iconColor} />
                      <span className="ml-1 text-sm font-semibold text-gray-700">{mode}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-sky-100">
                <InputField 
                  label="Paid Amount (₹)" 
                  name="paidAmount" 
                  type="number" 
                  value={billData.paidAmount} 
                  onChange={handleInputChange} 
                  placeholder="Enter paid amount" 
                  unit="₹" 
                />
                {billData.totalAmount - billData.paidAmount > 0 && (
                  <div className="flex flex-col justify-end pb-1 text-red-600 text-sm font-black uppercase tracking-wider">
                    Remaining Due: {formatCurrency(Math.max(0, billData.totalAmount - billData.paidAmount))}
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Invoice status upon saving: <span className={`font-semibold ${billData.status === 'Paid' ? 'text-green-600' : (billData.status === 'Due' ? 'text-orange-500' : 'text-red-500')}`}>
                  {billData.status}
                </span> (Based on **{billData.paymentMode}**).
              </p>
            </div>
          </div>
        </div>

        {/* Calculation Summary Column (1/4 width) */}
        <div className="lg:col-span-1 space-y-4 p-4 sm:p-6 bg-sky-50 rounded-xl shadow-2xl border-t-4 border-sky-600 h-fit lg:sticky lg:top-8">
          <h3 className="text-xl font-extrabold text-${PRIMARY_COLOR}-700 mb-4 border-b pb-3">Bill Summary</h3>

          <div className="space-y-3 text-gray-700">
            <div className="flex justify-between">
              <span className="text-md font-medium">Subtotal (Charges):</span>
              <span className="font-bold">{formatCurrency(subtotalCharges)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span className="text-md font-medium">(-) Discounts:</span>
              <span className="font-bold">-{formatCurrency(billData.discounts)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-md font-medium">Tax ({billData.taxRate}%):</span>
              <span className="font-bold">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 text-green-600">
              <span className="text-md font-medium">Paid Amount:</span>
              <span className="font-bold">{formatCurrency(billData.paidAmount)}</span>
            </div>
          </div>

          <div className={`flex justify-between items-center pt-4 mt-4 border-t-2 border-${PRIMARY_COLOR}-400`}>
            <span className="text-lg font-extrabold text-gray-900">Remaining Balance:</span>
            <span className="text-2xl font-extrabold text-${PRIMARY_COLOR}-800">
              {formatCurrency(Math.max(0, billData.totalAmount - billData.paidAmount))}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-6 flex justify-end space-x-4 border-t border-gray-200">
        <button
          onClick={handlePrint}
          disabled={billData.totalAmount <= 0}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl shadow-md text-gray-700 bg-white hover:bg-gray-50 transition ease-in-out duration-150 disabled:opacity-50"
        >
          <PrinterIcon className="text-gray-700" />
          Save & Print
        </button>
        <button
          onClick={handleSave}
          disabled={billData.totalAmount <= 0}
          className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white ${ACCENT_COLOR_CLASS} transition ease-in-out duration-150 disabled:opacity-50`}
        >
          Save Invoice
        </button>
      </div>
    </div>
  );
};

// --- Summary Card Component ---
const SummaryCard = ({ title, value, colorClass, icon: Icon }) => (
  <div className={`p-2 md:p-4 rounded-xl shadow-md border-t-4 ${colorClass} bg-white transition duration-300 hover:shadow-xl flex flex-col justify-center h-full`}>
    <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left">
      <div className={`p-1.5 md:p-2 rounded-full md:mr-3 bg-opacity-20 flex-shrink-0 mb-1 md:mb-0`}>
        <Icon className="w-4 h-4 md:w-6 md:h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[8px] md:text-sm font-medium text-gray-500 uppercase md:normal-case tracking-tighter md:tracking-normal truncate">{String(title || '')}</p>
        <p className="text-xs md:text-2xl font-black text-gray-900 tracking-tight truncate">
          {String(value || '')}
        </p>
      </div>
    </div>
  </div>
);


// --- Invoice Detail Modal Component ---
const InvoiceDetailModal = ({ invoice, onClose, onUpdateStatus, onDelete, onPrint, onSend, clinicInfo = {}, onUpdateBill }) => {
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

  // Map the detail fields to readable labels or use the itemized list
  const isItemized = invoice.items && invoice.items.length > 0;
  const chargeItems = isItemized
    ? invoice.items.map(item => ({
      label: item.description,
      value: item.subtotal || (item.qty * (item.unitPrice || item.cost)) || 0,
      qty: item.qty,
      unitPrice: item.unitPrice || item.cost
    }))
    : [
      { label: 'Consultation Fee', value: details.consultationFee },
      { label: 'Tests/Lab Fees', value: details.tests },
      { label: 'Medicines/Pharmacy', value: details.medicines },
      { label: 'Additional Charges', value: details.additionalCharges },
    ].filter(item => (parseFloat(item.value) || 0) > 0);

  // Calculate totals for summary section
  const isPharmacy = invoice.billType === 'Pharmacy';

  const subtotalCharges = isPharmacy
    ? (details.medicines || 0) // normalized.grossAmount
    : (isItemized
      ? chargeItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0)
      : [
        details.consultationFee,
        details.tests,
        details.medicines,
        details.additionalCharges
      ].reduce((sum, val) => sum + (parseFloat(val) || 0), 0));

  const totalDiscount = parseFloat(details.discount || details.discounts || 0);
  const amountAfterDiscount = Math.max(0, subtotalCharges - totalDiscount);
  const taxAmount = isPharmacy
    ? (parseFloat(details.taxAmount) || 0)
    : (amountAfterDiscount * ((parseFloat(details.taxRate) || 0) / 100));

  // Override chargeItems for Pharmacy to show unit price and line total clearly
  if (isPharmacy && isItemized) {
    chargeItems.forEach((item, idx) => {
      const apiItem = invoice.items[idx];
      if (apiItem) {
        item.value = (apiItem.qty || 1) * (apiItem.unitPrice || apiItem.sellingPrice || 0); // Gross for line item
      }
    });
  }

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

  const handleStatusChange = (newStatus) => {
    if (onUpdateStatus) {
      onUpdateStatus(invoice.id, newStatus);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(invoice.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 sm:p-6 no-print" onClick={onClose}>
      <div
        className="bg-white shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 scale-100 border-4 border-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status Watermark */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none z-0 print:opacity-10" style={{ zIndex: 0 }}>
          <span className={`text-[100px] font-black uppercase transform -rotate-45 block ${invoice.status === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>
            {String(invoice.status || '')}
          </span>
        </div>

        {/* Invoice Actions (Hidden on Print) */}
        <div className="absolute top-0 right-0 p-4 flex gap-2 print:hidden z-50 bg-white/90 rounded-bl-xl shadow-sm">
          <button
            onClick={onClose}
            className="p-2 text-black hover:text-red-650 hover:bg-gray-100 rounded-lg transition font-bold"
          >
            <XIcon />
          </button>
        </div>

        {/* Invoice Content */}
        <div className="p-4 sm:p-5 print:p-4 relative z-10 w-full bg-transparent text-black">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-black pb-4 mb-4">
            <div>
              <h1 className="text-3xl font-black text-black tracking-tight uppercase mb-1">INVOICE</h1>
              <p className="text-xs font-black text-black">#{String(invoice.id || '')}</p>
            </div>

            <div className="flex items-start text-right mt-2 sm:mt-0 gap-4 text-black">
              <div className="text-right flex-1">
                <h2 className="text-xl font-black text-black">{clinicInfo.name || clinicInfo.clinicName || 'Clinic Name'}</h2>
                <p className="text-xs font-bold text-black mt-1">
                  {(() => {
                    const addr = clinicInfo.address || clinicInfo.clinicAddress || clinicInfo.location;
                    if (!addr) return '';
                    if (typeof addr === 'string') return addr;
                    const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
                    return parts.join(', ');
                  })()}
                </p>
                <p className="text-xs font-bold text-black">{clinicInfo.email || clinicInfo.clinicEmail || clinicInfo.contactEmail || ''}</p>
                <p className="text-xs font-bold text-black">{clinicInfo.phone || clinicInfo.mobile || clinicInfo.contact || ''}</p>
              </div>
              {clinicInfo.branding?.logo && (
                <div className="flex-shrink-0">
                  <img src={clinicInfo.branding.logo} alt="Organization Logo" className="h-16 w-16 object-contain rounded border border-black p-1" />
                </div>
              )}
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-black text-black uppercase tracking-wider mb-1">Billed To</p>
              <div className="bg-slate-50 p-3 rounded-lg border-2 border-black">
                <h3 className="text-md font-extrabold text-black">{String(invoice.patient || '')}</h3>
                <p className="text-xs text-black mt-0.5 font-bold">Patient ID: {String(details.patientId || invoice.patientId || 'N/A')}</p>
                <p className="text-xs text-black font-bold">Attending Doctor: <span className="font-extrabold">{String(invoice.doctor || '')}</span></p>
              </div>
            </div>
            <div className="sm:text-right text-black">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black text-black uppercase tracking-wider mb-0.5">Invoice Date</p>
                  <p className="text-xs font-black text-black">{String(invoice.date || '')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black text-black uppercase tracking-wider mb-0.5">Due Date</p>
                  <p className="text-xs font-black text-black">{String(invoice.date || '')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black text-black uppercase tracking-wider mb-0.5">Payment Mode</p>
                  <p className="text-xs font-black text-black">{String(details.paymentMode || 'N/A')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black text-black uppercase tracking-wider mb-0.5">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="mb-6 rounded-lg overflow-hidden border-2 border-black">
            <table className="min-w-full divide-y divide-black">
              <thead className="bg-black">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-[10px] font-black text-white uppercase tracking-wider">Item Description</th>
                  {isItemized && <th scope="col" className="px-4 py-2 text-center text-[10px] font-black text-white uppercase tracking-wider">Qty</th>}
                  {isItemized && <th scope="col" className="px-4 py-2 text-center text-[10px] font-black text-white uppercase tracking-wider">Unit Price</th>}
                  <th scope="col" className="px-4 py-2 text-right text-[10px] font-black text-white uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-black text-black">
                {chargeItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-black">{item.label}</td>
                    {isItemized && <td className="px-4 py-2 whitespace-nowrap text-xs text-center font-bold text-black">{item.qty || 1}</td>}
                    {isItemized && <td className="px-4 py-2 whitespace-nowrap text-xs text-center font-bold text-black">{formatCurrency(item.unitPrice)}</td>}
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-right font-black text-black">{formatCurrency(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Installments / History Section */}
          {paymentHistory.length > 0 && (
            <div className="mb-6 p-4 border-2 border-black rounded-xl bg-slate-50">
              <h4 className="text-xs font-black text-black uppercase tracking-widest mb-3 border-b-2 border-black pb-1.5 flex items-center gap-1.5">
                <span>Payment Installments / History</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-black text-xs text-black">
                  <thead>
                    <tr className="font-black text-black">
                      <th className="px-2 py-1.5 text-left font-black uppercase tracking-wider border-r border-black">Date</th>
                      <th className="px-2 py-1.5 text-left font-black uppercase tracking-wider border-r border-black">Patient Name</th>
                      <th className="px-2 py-1.5 text-left font-black uppercase tracking-wider border-r border-black">Mode</th>
                      <th className="px-2 py-1.5 text-left font-black uppercase tracking-wider border-r border-black">Transaction ID</th>
                      <th className="px-2 py-1.5 text-right font-black uppercase tracking-wider">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black text-black">
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

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-end items-start pt-4 mb-6">
            <div className="w-full sm:w-5/12 ml-auto">
              <div className="bg-slate-50 rounded-lg p-4 border-2 border-black text-black">
                <div className="flex justify-between mb-2 text-xs font-bold">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotalCharges)}</span>
                </div>
                <div className="flex justify-between mb-2 text-xs font-bold">
                  <span>Tax ({details.taxRate || 0}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                {(totalDiscount > 0) && (
                  <div className="flex justify-between mb-2 text-xs text-red-650 font-bold">
                    <span>Total Discount</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-t-2 border-black mt-2 font-black">
                  <span className="text-lg uppercase tracking-tight">Total</span>
                  <span className="text-xl">{formatCurrency(details.totalAmount)}</span>
                </div>

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
                  invoice.status === 'Paid' && (
                    <div className="flex justify-between items-center pt-2 text-xs text-green-700 border-t border-black mt-2 font-black">
                      <span className="uppercase tracking-wide">Amount Paid</span>
                      <span>{formatCurrency(details.totalAmount)}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-black pt-4 mt-6 text-center text-[10px] font-bold text-black uppercase tracking-wider">
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>

          {/* Action Buttons (Hidden on Print) */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 no-print px-2">
            <button
              onClick={() => onSend(invoice, 'Email')}
              className="flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-100 active:scale-95 border border-black"
            >
              <Send className="w-4 h-4 mr-2" />
              Email Invoice
            </button>
            <button
              onClick={() => onSend(invoice, 'WhatsApp')}
              className="flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-750 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-100 active:scale-95 border border-black"
            >
              <Phone className="w-4 h-4 mr-2" />
              WhatsApp
            </button>
            <button
              onClick={() => {
                if (onPrint) {
                  onPrint(invoice);
                } else {
                  window.print();
                }
              }}
              className="flex items-center justify-center px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-slate-100 active:scale-95 border border-black"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};


// --- Main Application Component ---
const BillingDashboard = () => {
  const { user, updateUser } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};

  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 15 });
  const [summary, setSummary] = useState({ totalPaid: 0, totalPending: 0, totalBilled: 0, averageInvoice: 0 });
  const itemsPerPage = 15;
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'generate'
  const [billingTab, setBillingTab] = useState('General'); // 'General', 'Pharmacy', 'Dental'
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Paid', 'Pending'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null); // State for modal
  const [printingInvoice, setPrintingInvoice] = useState(null); // State for single invoice printing

  // --- Session Sync ---
  // Ensure we have the latest organization data populated
  useEffect(() => {
    const syncSession = async () => {
      try {
        const data = await authApi.checkSession();
        if (data && data.user) {
          // Update auth context with the latest populated user data
          updateUser(data.user);
        }
      } catch (err) {
        // Suppress session sync errors to prevent console noise if cert is invalid
        // The rest of the dashboard will still function with existing auth state
        console.warn('Session sync skipped or failed (likely SSL/Network issue):', err.message);
      }
    };

    // Only sync if the organization data seems to be missing vital contact info
    const hasContactInfo = clinicInfo.email || clinicInfo.phone || clinicInfo.address;
    const isActuallyPopulated = typeof clinicInfo === 'object' && Object.keys(clinicInfo).length > 5;

    if (!hasContactInfo || !isActuallyPopulated) {
      syncSession();
    }
  }, []);

  // Fetch bills from API on component mount
  const fetchData = useCallback(async (page = 1, overrideBillType) => {
    const currentBillType = overrideBillType !== undefined ? overrideBillType : billingTab;
    try {
      setLoading(true);
      setError(null);
      console.log('[BILLING FRONTEND] Fetching with billType:', currentBillType, 'page:', page);
      const [billingResponse, appointmentData, doctorData] = await Promise.all([
        billingApi.getAll({
          page,
          limit: itemsPerPage,
          search: searchTerm,
          status: ['Paid', 'Pending', 'Due'].includes(activeFilter) ? activeFilter : '',
          paymentMethod: ['Cash', 'UPI', 'Card'].includes(activeFilter) ? activeFilter : '',
          billType: currentBillType
        }),
        appointmentApi.getAll(),
        centralDoctorApi.getAll()
      ]);

      console.log('[BILLING FRONTEND] Response:', billingResponse?.bills?.length, 'bills found');
      const billsData = billingResponse.bills || (Array.isArray(billingResponse) ? billingResponse : []);
      const transformedData = billsData.map(transformApiData);
      setInvoices(transformedData);
      setPagination(billingResponse.pagination || { total: billsData.length, totalPages: 1, limit: itemsPerPage });
      setSummary(billingResponse.summary || { totalPaid: 0, totalPending: 0, totalBilled: 0, averageInvoice: 0 });
      setCurrentPage(page);

      setAppointments(appointmentData || []);
      setDoctors(doctorData?.doctors || (Array.isArray(doctorData) ? doctorData : []));
    } catch (error) {
      console.error('Error fetching billing dashboard data:', error);
      setError('Failed to load billing data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeFilter, billingTab]);

  // Re-fetch whenever tab or filter changes — pass the new value directly to avoid stale closure
  useEffect(() => {
    fetchData(1, billingTab);
  }, [activeFilter, billingTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);


  // Handler for actions from the list
  const handleAction = async (action, invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      if (action === 'View') {
        setSelectedInvoice(invoice);
      } else if (action === 'Print') {
        setPrintingInvoice(invoice);
      } else if (action === 'Email' || action === 'Send') {
        try {
          setStatusMessage(`Sending invoice ${invoice.id} to patient email...`);
          await billingApi.sendEmail(invoice._id);
          setStatusMessage(`Success! Invoice ${invoice.id} sent to patient's email.`);
        } catch (err) {
          console.error('Error sending invoice:', err);
          setStatusMessage(`Error: ${err.response?.data?.message || 'Failed to send invoice email.'}`);
        }
      } else if (action === 'WhatsApp') {
        try {
          setStatusMessage(`Sending invoice ${invoice.id} via WhatsApp...`);
          await billingApi.sendWhatsApp(invoice._id);
          setStatusMessage(`Success! Invoice ${invoice.id} sent via WhatsApp.`);
        } catch (err) {
          console.error('Error sending WhatsApp invoice:', err);
          setStatusMessage(`Error: ${err.response?.data?.message || 'Failed to send WhatsApp invoice.'}`);
        }
      }
    }
  };

  // Handler for printing from modal - uses same mechanism as list
  const handlePrintFromModal = (invoice) => {
    setPrintingInvoice(invoice);
    setStatusMessage(`Printing Invoice ${invoice.id} for ${invoice.patient}`);
  };

  // Ensure HTML for invoice is rendered before calling window.print()
  useEffect(() => {
    if (!printingInvoice) return;
    window.scrollTo(0, 0);
    const timeout = setTimeout(() => {
      window.print();
      setPrintingInvoice(null);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [printingInvoice]);

  // Handler for saving a new invoice from the form
  const handleSaveNewInvoice = (newInvoice, shouldPrint = false) => {
    setInvoices(prev => [newInvoice, ...prev]);
    if (shouldPrint) {
      setPrintingInvoice(newInvoice);
      setStatusMessage(`Success! Invoice ${newInvoice.id} generated and sent to print.`);
    }
  };

  // Handler for updating invoice status (mark as paid/pending)
  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice || !invoice._id) return;

      await billingApi.update(invoice._id, { status: newStatus });

      // Update local state
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: newStatus, details: { ...inv.details, status: newStatus } }
          : inv
      ));

      setStatusMessage(`Success! Invoice ${invoiceId} marked as ${newStatus}.`);

      // Refresh the selected invoice if it's open
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        const updatedInvoice = invoices.find(inv => inv.id === invoiceId);
        if (updatedInvoice) {
          setSelectedInvoice({ ...updatedInvoice, status: newStatus, details: { ...updatedInvoice.details, status: newStatus } });
        }
      }
    } catch (err) {
      console.error('Error updating bill status:', err);
      setStatusMessage('Error: Failed to update bill status.');
    }
  };

  const handleUpdateBill = (updatedBill) => {
    const transformed = transformApiData(updatedBill);
    setInvoices(prev => prev.map(inv => inv.id === transformed.id ? transformed : inv));
    if (selectedInvoice && selectedInvoice.id === transformed.id) {
      setSelectedInvoice(transformed);
    }
  };

  // Handler for deleting invoice
  const handleDeleteInvoice = async (invoiceId) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice || !invoice._id) return;

      if (!window.confirm(`Are you sure you want to delete invoice ${invoiceId}?`)) return;

      await billingApi.delete(invoice._id);

      // Update local state
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      setStatusMessage(`Success! Invoice ${invoiceId} has been deleted.`);

      // Close modal if open
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(null);
      }
    } catch (err) {
      console.error('Error deleting bill:', err);
      setStatusMessage('Error: Failed to delete bill.');
    }
  };

  const clearStatusMessage = () => {
    setTimeout(() => setStatusMessage(''), 5000);
  };

  useEffect(() => {
    if (statusMessage) {
      clearStatusMessage();
    }
  }, [statusMessage]);

  const paginatedInvoices = invoices; // Now paginated on server-side

  const summaryMetrics = [
    { title: 'Total Paid Value', value: formatCurrency(summary.totalPaid), colorClass: 'border-green-500', icon: RupeeIcon, textClass: 'text-green-500' },
    { title: 'Outstanding Receivables', value: formatCurrency(summary.totalPending), colorClass: 'border-red-500', icon: RupeeIcon, textClass: 'text-red-500' },
    { title: 'Average Invoice Value', value: formatCurrency(summary.averageInvoice), colorClass: `border-sky-500`, icon: RupeeIcon, textClass: `text-sky-500` },
  ];

  const totalPages = pagination.totalPages;

  return (
    <>
      {/* Print-specific Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { 
            display: block !important; 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important;
            margin: 0 !important;
            padding: 1.5cm !important;
          }
          @page { 
            margin: 0; 
            size: auto; 
          }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}} />

      <div className="min-h-screen bg-gray-100 p-2 sm:p-4 font-['Inter'] no-print">

        {/* Header and Title */}
        <header className="mb-3 md:pl-10 transition-all">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Billing & Payments
          </h1>
          <p className="text-[11px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider">
            Centralized financial management for patient services.
          </p>
        </header>

        {/* Status Message Display */}
        {statusMessage && (
          <div className={`mb-3 p-3 ${statusMessage.startsWith('Error') ? 'bg-red-50 text-red-800 border-red-100' : 'bg-blue-50 text-blue-800 border-blue-100'} rounded-lg shadow-sm border text-xs font-bold transition-opacity duration-300`}>
            {statusMessage}
          </div>
        )}

        {/* Category Tabs (Three Boxes) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { id: 'General', label: 'Consultation & General', icon: User, color: 'sky', description: 'Doctors, Appointments & OPD' },
            { id: 'Pharmacy', label: 'Pharmacy Billing', icon: PlusCircle, color: 'indigo', description: 'Medicines, Inventory & Retail' },
            { id: 'Dental', label: 'Dental Billing', icon: FileText, color: 'emerald', description: 'Dental Procedures & Treatments' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setBillingTab(tab.id);
                setViewMode('list');
              }}
              className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all duration-500 text-left group
                ${billingTab === tab.id
                  ? `bg-white border-${tab.color}-500 shadow-2xl ring-4 ring-${tab.color}-500/10 scale-[1.03]`
                  : `bg-slate-50 border-slate-100 hover:border-${tab.color}-200 hover:bg-white shadow-sm hover:scale-[1.01]`}`}
            >
              <div className="flex items-center gap-5 relative z-10">
                <div className={`p-4 rounded-2xl transition-all duration-500 shadow-lg
                  ${billingTab === tab.id
                    ? `bg-${tab.color}-600 text-white rotate-3`
                    : `bg-white text-${tab.color}-600 group-hover:bg-${tab.color}-50`}`}>
                  <tab.icon size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-tight transition-colors duration-300
                    ${billingTab === tab.id ? `text-${tab.color}-700` : 'text-slate-600'}`}>
                    {tab.label}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1 uppercase tracking-widest opacity-80">
                    {tab.description}
                  </p>
                </div>
              </div>

              {/* Decorative Background Icon */}
              <div className={`absolute -right-6 -bottom-6 opacity-[0.03] transition-all duration-700 group-hover:scale-125 group-hover:rotate-12
                ${billingTab === tab.id ? 'text-slate-900 opacity-[0.05]' : `text-${tab.color}-900`}`}>
                <tab.icon size={120} />
              </div>

              {/* Active Pulse Indicator */}
              {billingTab === tab.id && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Active</span>
                  <div className={`w-2 h-2 rounded-full bg-${tab.color}-500 animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.2)]`} />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-5">
          {viewMode === 'list' ? (
            <InvoiceList
              filteredInvoices={paginatedInvoices}
              summaryMetrics={summaryMetrics}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setViewMode={setViewMode}
              handleAction={handleAction}
              billingTab={billingTab}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={fetchData}
              totalItems={pagination.total}
              itemsPerPage={itemsPerPage}
            />
          ) : (
            <GenerateBillForm
              onSave={handleSaveNewInvoice}
              onCancel={() => setViewMode('list')}
              setStatusMessage={setStatusMessage}
              appointments={appointments}
              doctors={doctors}
              billType={billingTab}
            />
          )}
        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <InvoiceDetailModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteInvoice}
            onPrint={handlePrintFromModal}
            onSend={(invoice, method) => handleAction(method, invoice.id)}
            clinicInfo={clinicInfo}
            onUpdateBill={handleUpdateBill}
          />
        )}
      </div>

      {/* Dedicated Print Portal */}
      <div className="print-only bg-white text-black">
        {printingInvoice && (
          <InvoiceTemplate
            clinicInfo={clinicInfo}
            invoiceData={{
              billId: printingInvoice.id,
              date: printingInvoice.dateRaw || printingInvoice.date,
              patientName: printingInvoice.patient,
              patientId: printingInvoice.details?.patientId || printingInvoice.patientId || 'N/A',
              doctorName: printingInvoice.doctor || 'N/A',
              items: (printingInvoice.items && printingInvoice.items.length > 0)
                ? printingInvoice.items.map(i => ({
                  description: i.description,
                  price: parseFloat(i.unitPrice || i.cost || 0),
                  quantity: parseInt(i.qty || 1)
                }))
                : [
                  { description: 'Consultation Fee', price: parseFloat(printingInvoice.details?.consultationFee) || 0, quantity: 1 },
                  { description: 'Tests/Lab Fees', price: parseFloat(printingInvoice.details?.tests) || 0, quantity: 1 },
                  { description: 'Medicines/Pharmacy', price: parseFloat(printingInvoice.details?.medicines) || 0, quantity: 1 },
                  { description: 'Additional Charges', price: parseFloat(printingInvoice.details?.additionalCharges) || 0, quantity: 1 }
                ].filter(item => item.price > 0),
              subtotal: (printingInvoice.items && printingInvoice.items.length > 0)
                ? printingInvoice.items.reduce((sum, i) => sum + (parseFloat(i.subtotal) || (parseFloat(i.qty || 1) * parseFloat(i.unitPrice || i.cost || 0))), 0)
                : (parseFloat(printingInvoice.details?.consultationFee) || 0) +
                (parseFloat(printingInvoice.details?.tests) || 0) +
                (parseFloat(printingInvoice.details?.medicines) || 0) +
                (parseFloat(printingInvoice.details?.additionalCharges) || 0),
              discount: parseFloat(printingInvoice.details?.discount || printingInvoice.details?.discounts || printingInvoice.discount) || 0,
              taxRate: parseFloat(printingInvoice.details?.taxRate) || 0,
              total: parseFloat(printingInvoice.amount) || 0,
              notes: printingInvoice.details?.remarks || printingInvoice.notes || '',
              paymentMethod: printingInvoice.details?.paymentMode || printingInvoice.paymentMethod || 'N/A',
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

export default BillingDashboard;
