import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  PlusCircle, 
  User, 
  CalendarPlus, 
  Smartphone, 
  X,
  Eye,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { billingApi, appointmentApi, centralDoctorApi, authApi } from '../../../services/api';
import InvoiceTemplate from '../../../components/Shared/InvoiceTemplate';
import { useAuth } from '../../../context/AuthContext';
import Pagination from '../../../components/common/Pagination';
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
      <button
        onClick={() => setViewMode('generate')}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-md text-black ${ACCENT_COLOR_CLASS} transition ease-in-out duration-150`}
      >
        <PlusCircleIcon />
        Generate New Bill
      </button>
    </div>

    {/* NEW: Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
    <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-3">

      {/* Filter Tabs */}
      <div className="flex space-x-2 text-black bg-gray-200 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
        {['All', 'Cash', 'UPI', 'Card'].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                      ${activeFilter === filter
                ? `bg-${PRIMARY_COLOR}-600 text-black shadow-md`
                : 'text-gray-600 hover:bg-gray-200'
              }`}
          >
            {filter}
          </button>
        ))}
      </div>

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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

// Function to transform API data to component format
const transformApiData = (apiBill) => {
  return {
    id: apiBill.billId,
    _id: apiBill._id,
    patient: String(apiBill.patientName || ''),
    patientId: String(apiBill.patientId || ''),
    doctor: String(apiBill.doctorName || ''),
    doctorId: String(apiBill.doctorId || ''),
    date: apiBill.date ? new Date(apiBill.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
    dateRaw: apiBill.date,
    amount: apiBill.amount,
    status: apiBill.status,
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
      discounts: 0,
      taxRate: 0,
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
const InputField = ({ label, name, type = 'text', value, onChange, placeholder = '', unit = '' }) => (
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
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={type === 'number' ? 0 : undefined}
        // Check for '₹' unit to adjust padding
        className={`block w-full rounded-lg border-gray-300 shadow-inner p-2 sm:text-sm focus:ring-${PRIMARY_COLOR}-500 focus:border-${PRIMARY_COLOR}-500 transition duration-150 ${unit === '₹' ? 'pl-9' : ''} bg-white font-bold text-slate-700`}
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
const GenerateBillForm = ({ onSave, onCancel, setStatusMessage, appointments = [], doctors = [] }) => {
  const [billData, setBillData] = useState(getInitialBillState());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Search state for appointments
  const [apptSearchQuery, setApptSearchQuery] = useState('');
  const [showApptDropdown, setShowApptDropdown] = useState(false);

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
    setApptSearchQuery(appt.patientName);
    setShowApptDropdown(false);

    // Find doctor to get their fee
    const doctor = doctors.find(d => d._id === appt.doctorId || d.id === appt.doctorId);
    
    setBillData(prev => ({
      ...prev,
      patientName: String(appt.patientName || ''),
      patientId: String(appt.patientId || appt.patient?._id || appt.patient || ''),
      doctorName: String(appt.doctorName || ''),
      doctorId: String(appt.doctorId || appt.doctor?._id || appt.doctor || ''),
      appointmentId: String(appt._id || appt.id || ''),
      appointmentDate: appt.date ? new Date(appt.date).toISOString().substring(0, 10) : prev.appointmentDate,
      consultationFee: doctor?.consultantFee || doctor?.fee || 0
    }));
  };

  // Auto-calculation logic
  useEffect(() => {
    const consultation = parseFloat(billData.consultationFee) || 0;
    const test = parseFloat(billData.tests) || 0;
    const medicine = parseFloat(billData.medicines) || 0;
    const additional = parseFloat(billData.additionalCharges) || 0;
    const discount = parseFloat(billData.discounts) || 0;
    const tax = parseFloat(billData.taxRate) || 0;

    const subtotal = consultation + test + medicine + additional;
    const amountAfterDiscount = Math.max(0, subtotal - discount);
    const taxAmount = amountAfterDiscount * (tax / 100);
    const total = amountAfterDiscount + taxAmount;

    setBillData(prev => ({ ...prev, totalAmount: parseFloat(total.toFixed(2)) }));
  }, [
    billData.consultationFee,
    billData.tests,
    billData.medicines,
    billData.additionalCharges,
    billData.discounts,
    billData.taxRate,
  ]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    // Handle number inputs to ensure they are valid floats or empty string
    let newValue = value;
    if (type === 'number') {
      newValue = (value === '' || value === '.') ? '' : parseFloat(value) || 0;
    }

    setBillData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Update status to Paid if mode is cash/card/UPI, otherwise Pending for Insurance
    if (name === 'paymentMode') {
      setBillData(prev => ({
        ...prev,
        status: value === 'Insurance' ? 'Pending' : 'Paid'
      }));
    }
  };

  const handleSave = async (shouldPrint = false) => {
    if (billData.patientName === '' || billData.totalAmount <= 0) {
      setStatusMessage('Error: Please ensure patient name is filled and total amount is greater than zero.');
      return;
    }

    setSaving(true);
    try {
      // Prepare items array
      const items = [];
      if (billData.consultationFee > 0) items.push({ description: 'Consultation Fee', cost: billData.consultationFee, unitPrice: billData.consultationFee, subtotal: billData.consultationFee, qty: 1 });
      if (billData.tests > 0) items.push({ description: 'Tests/Lab Fees', cost: billData.tests, unitPrice: billData.tests, subtotal: billData.tests, qty: 1 });
      if (billData.medicines > 0) items.push({ description: 'Medicines/Pharmacy', cost: billData.medicines, unitPrice: billData.medicines, subtotal: billData.medicines, qty: 1 });
      if (billData.additionalCharges > 0) items.push({ description: 'Additional Charges', cost: billData.additionalCharges, unitPrice: billData.additionalCharges, subtotal: billData.additionalCharges, qty: 1 });

      // Map payment mode to API format
      const paymentModeMap = {
        'Cash': 'Cash',
        'Card': 'Card',
        'UPI': 'UPI',
        'Insurance': 'Insurance'
      };

      // Create bill via API
      const newBill = await billingApi.create({
        patientId: billData.patientId || 'PID-' + Date.now(),
        patientName: billData.patientName,
        doctorId: billData.doctorId || 'DID-001',
        doctorName: billData.doctorName,
        amount: billData.totalAmount,
        items: items,
        status: billData.status,
        notes: `Appointment Date: ${billData.appointmentDate}`,
        paymentMethod: paymentModeMap[billData.paymentMode] || 'Cash'
      });

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

  const subtotalCharges = parseFloat(((parseFloat(billData.consultationFee) || 0) + (parseFloat(billData.tests) || 0) + (parseFloat(billData.medicines) || 0) + (parseFloat(billData.additionalCharges) || 0)).toFixed(2));
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

          {/* Service Charges Card */}
          <div className="p-6 bg-sky-50 rounded-xl shadow-lg border border-sky-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Charges Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <InputField label="Consultation Fee" name="consultationFee" type="number" value={billData.consultationFee} onChange={handleInputChange} unit="₹" />
              <InputField label="Tests/Lab Fees" name="tests" type="number" value={billData.tests} onChange={handleInputChange} unit="₹" />
              <InputField label="Medicines/Pharmacy" name="medicines" type="number" value={billData.medicines} onChange={handleInputChange} unit="₹" />
              <InputField label="Additional Charges" name="additionalCharges" type="number" value={billData.additionalCharges} onChange={handleInputChange} unit="₹" />
            </div>
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
              <p className="mt-4 text-sm text-gray-500">
                Invoice status upon saving: <span className={`font-semibold ${billData.status === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
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
          </div>

          <div className={`flex justify-between items-center pt-4 mt-4 border-t-2 border-${PRIMARY_COLOR}-400`}>
            <span className="text-xl font-extrabold text-gray-900">Total Due:</span>
            <span className="text-3xl font-extrabold text-${PRIMARY_COLOR}-800">
              {formatCurrency(billData.totalAmount)}
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
  <div className={`p-4 rounded-xl shadow-md border-t-4 ${colorClass} bg-white transition duration-300 hover:shadow-xl`}>
    <div className="flex items-center">
      <div className={`p-2 rounded-full mr-3 bg-opacity-20 flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{String(title || '')}</p>
        <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {String(value || '')}
        </p>
      </div>
    </div>
  </div>
);


// --- Invoice Detail Modal Component ---
const InvoiceDetailModal = ({ invoice, onClose, onUpdateStatus, onDelete, onPrint, clinicInfo = {} }) => {
  const details = invoice.details || {};

  // Map the detail fields to readable labels
  const chargeItems = [
    { label: 'Consultation Fee', value: details.consultationFee },
    { label: 'Tests/Lab Fees', value: details.tests },
    { label: 'Medicines/Pharmacy', value: details.medicines },
    { label: 'Additional Charges', value: details.additionalCharges },
  ];

  // Calculate totals for summary section
  const subtotalCharges = chargeItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
  const amountAfterDiscount = Math.max(0, subtotalCharges - (parseFloat(details.discounts) || 0));
  const taxAmount = amountAfterDiscount * ((parseFloat(details.taxRate) || 0) / 100);

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
        className="bg-white shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 scale-100"
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
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
          >
            <XIcon />
          </button>
        </div>

        {/* Invoice Content */}
        <div className="p-4 sm:p-5 print:p-4 relative z-10 w-full bg-transparent">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase mb-1">INVOICE</h1>
              <p className="text-xs font-bold text-slate-500">#{String(invoice.id || '')}</p>
            </div>
            
            <div className="flex items-start text-right mt-2 sm:mt-0 gap-4">
              <div className="text-right flex-1">
                <h2 className="text-xl font-bold text-slate-800">{clinicInfo.name || clinicInfo.clinicName || 'Clinic Name'}</h2>
                <p className="text-xs text-slate-600 mt-1">
                  {(() => {
                    const addr = clinicInfo.address || clinicInfo.clinicAddress || clinicInfo.location;
                    if (!addr) return '';
                    if (typeof addr === 'string') return addr;
                    const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
                    return parts.join(', ');
                  })()}
                </p>
                <p className="text-xs text-slate-600">{clinicInfo.email || clinicInfo.clinicEmail || clinicInfo.contactEmail || ''}</p>
                <p className="text-xs text-slate-600">{clinicInfo.phone || clinicInfo.mobile || clinicInfo.contact || ''}</p>
              </div>
              {clinicInfo.branding?.logo && (
                <div className="flex-shrink-0">
                  <img src={clinicInfo.branding.logo} alt="Organization Logo" className="h-16 w-16 object-contain rounded border border-gray-100 p-1" />
                </div>
              )}
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billed To</p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <h3 className="text-md font-bold text-slate-800">{String(invoice.patient || '')}</h3>
                <p className="text-xs text-slate-600 mt-0.5">Patient ID: {String(details.patientId || invoice.patientId || 'N/A')}</p>
                <p className="text-xs text-slate-600">Attending Doctor: <span className="font-semibold">{String(invoice.doctor || '')}</span></p>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Invoice Date</p>
                  <p className="text-xs font-semibold text-slate-800">{String(invoice.date || '')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Due Date</p>
                  <p className="text-xs font-semibold text-slate-800">{String(invoice.date || '')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Payment Mode</p>
                  <p className="text-xs font-semibold text-slate-800">{String(details.paymentMode || 'N/A')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${invoice.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="mb-6 rounded-lg overflow-hidden border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-[10px] font-bold text-white uppercase tracking-wider">Item Description</th>
                  <th scope="col" className="px-4 py-2 text-right text-[10px] font-bold text-white uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {chargeItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-slate-800">{item.label}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-right font-medium text-slate-700">{formatCurrency(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-end items-start pt-4 mb-6">
            <div className="w-full sm:w-5/12 ml-auto">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex justify-between mb-2 text-xs">
                  <span className="font-medium text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(subtotalCharges)}</span>
                </div>
                {details.discounts > 0 && (
                  <div className="flex justify-between mb-2 text-xs text-red-600">
                    <span className="font-medium">Discount Applied</span>
                    <span className="font-semibold">-{formatCurrency(details.discounts)}</span>
                  </div>
                )}
                <div className="flex justify-between mb-2 text-xs">
                  <span className="font-medium text-slate-600">Tax ({details.taxRate || 0}%)</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(taxAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-slate-800 mt-2">
                  <span className="text-lg font-black text-slate-800 uppercase tracking-tight">Total</span>
                  <span className="text-xl font-black text-indigo-600">{formatCurrency(details.totalAmount)}</span>
                </div>
                
                {invoice.status === 'Paid' && (
                  <div className="flex justify-between items-center pt-2 text-xs text-green-600">
                    <span className="font-bold uppercase tracking-wide">Amount Paid</span>
                    <span className="font-bold">{formatCurrency(details.totalAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 mt-6 text-center text-[10px] text-slate-400">
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>

          {/* Print Button (Hidden on Print) */}
          <div className="mt-6 flex justify-center no-print">
            <button
              onClick={() => {
                if (onPrint) {
                  onPrint(invoice);
                } else {
                  window.print();
                }
              }}
              className="inline-flex items-center px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors shadow-md shadow-slate-100"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
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
  const itemsPerPage = 15;
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'generate'
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
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [billingData, appointmentData, doctorData] = await Promise.all([
        billingApi.getAll(),
        appointmentApi.getAll(),
        centralDoctorApi.getAll()
      ]);
      
      const transformedData = billingData.map(transformApiData);
      setInvoices(transformedData);
      setAppointments(appointmentData || []);
      setDoctors(doctorData || []);
    } catch (error) {
      console.error('Error fetching billing dashboard data:', error);
      setError('Failed to load billing data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler for View/Print actions on the list
  const handleAction = (action, invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      if (action === 'View') {
        setSelectedInvoice(invoice); // Open modal
      } else if (action === 'Print') {
        setPrintingInvoice(invoice);
        setStatusMessage(`Printing Invoice ${invoice.id} for ${invoice.patient}`);
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
    const timeout = setTimeout(() => {
      window.print();
      setPrintingInvoice(null);
    }, 1000);

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

  // --- Filtering and Calculation Logic (Memoized for performance) ---
  const { filteredInvoices, summaryMetrics } = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();

    // 1. Filtering
    // Create a phone map from appointments for mobile number search
    const patientPhoneMap = {};
    (appointments || []).forEach(appt => {
      if (appt.patientId && appt.patientPhone) {
        patientPhoneMap[appt.patientId] = appt.patientPhone;
      }
    });

    let filtered = invoices.filter(invoice => {
      // Apply status/paymentMode filter
      if (activeFilter !== 'All') {
        if (['Cash', 'UPI', 'Card'].includes(activeFilter)) {
          // Filter by payment mode (case insensitive check for safety)
          if (invoice.details?.paymentMode?.toLowerCase() !== activeFilter.toLowerCase()) {
            return false;
          }
        } else if (invoice.status !== activeFilter) {
          // Fallback for status filters like 'Paid' or 'Pending' if they are ever added back
          return false;
        }
      }

      // Apply search term filter
      if (searchTerm) {
        const patientPhone = patientPhoneMap[invoice.patientId] || "";
        const matchesPatient = invoice.patient.toLowerCase().includes(lowerCaseSearch);
        const matchesDoctor = invoice.doctor.toLowerCase().includes(lowerCaseSearch);
        const matchesId = invoice.id.toLowerCase().includes(lowerCaseSearch);
        const matchesPatientId = invoice.patientId?.toLowerCase().includes(lowerCaseSearch);
        const matchesPhone = patientPhone.includes(searchTerm);

        return matchesPatient || matchesDoctor || matchesId || matchesPatientId || matchesPhone;
      }
      return true;
    });

    // 2. Calculation
    const totalPaid = invoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalPending = invoices
      .filter(inv => inv.status === 'Pending')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalAll = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const averageInvoice = invoices.length > 0 ? totalAll / invoices.length : 0;

    return {
      filteredInvoices: filtered,
      summaryMetrics: [
        { title: 'Total Paid Value', value: formatCurrency(totalPaid), colorClass: 'border-green-500', icon: RupeeIcon, textClass: 'text-green-500' },
        { title: 'Outstanding Receivables', value: formatCurrency(totalPending), colorClass: 'border-red-500', icon: RupeeIcon, textClass: 'text-red-500' },
        { title: 'Average Invoice Value', value: formatCurrency(averageInvoice), colorClass: `border-${PRIMARY_COLOR}-500`, icon: RupeeIcon, textClass: `text-${PRIMARY_COLOR}-500` },
      ]
    };

  }, [invoices, activeFilter, searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  // Paginate invoices
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);





  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 font-['Inter'] print:bg-white print:p-0">

      {/* Header and Title (Hidden on Print) */}
      <header className="mb-3 print:hidden">
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

      {/* Main Card Container (Hidden on Print) */}
      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-5 print:hidden">

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
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredInvoices.length}
            itemsPerPage={itemsPerPage}
          />
        ) : (
          <GenerateBillForm
            onSave={handleSaveNewInvoice}
            onCancel={() => setViewMode('list')}
            setStatusMessage={setStatusMessage}
            appointments={appointments}
            doctors={doctors}
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
          clinicInfo={clinicInfo} 
        />
      )}

      {/* Dedicated Print Portal */}
      <div className="print-only bg-white text-black">
        {printingInvoice && (
          <InvoiceTemplate
            clinicInfo={clinicInfo}
            invoiceData={{
              billId: printingInvoice.id,
              date: printingInvoice.date,
              patientName: printingInvoice.patient,
              patientId: printingInvoice.details?.patientId || printingInvoice.patientId || 'N/A',
              doctorName: printingInvoice.doctor || 'N/A',
              items: [
                { description: 'Consultation Fee', price: parseFloat(printingInvoice.details?.consultationFee) || 0 },
                { description: 'Tests/Lab Fees', price: parseFloat(printingInvoice.details?.tests) || 0 },
                { description: 'Medicines/Pharmacy', price: parseFloat(printingInvoice.details?.medicines) || 0 },
                { description: 'Additional Charges', price: parseFloat(printingInvoice.details?.additionalCharges) || 0 }
              ].filter(item => item.price > 0),
              subtotal: (parseFloat(printingInvoice.details?.consultationFee) || 0) + 
                        (parseFloat(printingInvoice.details?.tests) || 0) + 
                        (parseFloat(printingInvoice.details?.medicines) || 0) + 
                        (parseFloat(printingInvoice.details?.additionalCharges) || 0),
              discount: parseFloat(printingInvoice.details?.discounts) || 0,
              taxRate: parseFloat(printingInvoice.details?.taxRate) || 0,
              total: parseFloat(printingInvoice.amount) || 0,
              notes: printingInvoice.details?.remarks || '',
              paymentMethod: printingInvoice.details?.paymentMode || 'N/A',
              status: printingInvoice.status
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BillingDashboard;

