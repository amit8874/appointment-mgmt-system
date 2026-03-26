import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { billingApi, appointmentApi, centralDoctorApi } from '../../../services/api';
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
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">

      {/* Filter Tabs */}
      <div className="flex space-x-2 text-black bg-gray-200 p-1 rounded-xl w-full sm:w-auto">
        {['All', 'Paid', 'Pending'].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 w-full sm:w-auto
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
          placeholder="Search ID, Patient, or Doctor..."
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
    patient: apiBill.patientName,
    patientId: apiBill.patientId,
    doctor: apiBill.doctorName,
    doctorId: apiBill.doctorId,
    date: apiBill.date ? new Date(apiBill.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
    dateRaw: apiBill.date,
    amount: apiBill.amount,
    status: apiBill.status,
    details: {
      patient: apiBill.patientName,
      doctor: apiBill.doctorName,
      appointmentDate: apiBill.date ? new Date(apiBill.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      consultationFee: apiBill.items?.find(i => i.description?.toLowerCase().includes('consultation'))?.cost || 0,
      tests: apiBill.items?.find(i => i.description?.toLowerCase().includes('test'))?.cost || 0,
      medicines: apiBill.items?.find(i => i.description?.toLowerCase().includes('medicine'))?.cost || 0,
      additionalCharges: apiBill.items?.filter(i => 
        !i.description?.toLowerCase().includes('consultation') && 
        !i.description?.toLowerCase().includes('test') && 
        !i.description?.toLowerCase().includes('medicine')
      ).reduce((sum, item) => sum + (item.cost || 0), 0) || 0,
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

  // Handle appointment selection
  const handleAppointmentChange = (e) => {
    const apptId = e.target.value;
    setSelectedAppointmentId(apptId);
    
    if (apptId) {
      const appt = appointments.find(a => a._id === apptId || a.id === apptId);
      if (appt) {
        // Find doctor to get their fee
        const doctor = doctors.find(d => d._id === appt.doctorId || d.id === appt.doctorId);
        
        setBillData(prev => ({
          ...prev,
          patientName: appt.patientName,
          patientId: appt.patientId || appt.patient?._id || appt.patient,
          doctorName: appt.doctorName,
          doctorId: appt.doctorId || appt.doctor?._id || appt.doctor,
          appointmentId: appt._id || appt.id,
          appointmentDate: appt.date ? new Date(appt.date).toISOString().substring(0, 10) : prev.appointmentDate,
          consultationFee: doctor?.consultantFee || doctor?.fee || 0
        }));
      }
    } else {
      setBillData(getInitialBillState());
    }
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
      if (billData.consultationFee > 0) items.push({ description: 'Consultation Fee', cost: billData.consultationFee });
      if (billData.tests > 0) items.push({ description: 'Tests/Lab Fees', cost: billData.tests });
      if (billData.medicines > 0) items.push({ description: 'Medicines/Pharmacy', cost: billData.medicines });
      if (billData.additionalCharges > 0) items.push({ description: 'Additional Charges', cost: billData.additionalCharges });

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
            <div className="mb-6">
               <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Choose Active Appointment</label>
               <select 
                value={selectedAppointmentId}
                onChange={handleAppointmentChange}
                className="w-full px-4 py-3 bg-white border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-bold text-slate-700 shadow-inner"
               >
                 <option value="">-- Select an Appointment --</option>
                 {appointments.map(appt => (
                   <option key={appt._id || appt.id} value={appt._id || appt.id}>
                     {appt.patientName} with {appt.doctorName} ({new Date(appt.date).toLocaleDateString()})
                   </option>
                 ))}
               </select>
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
  <div className={`p-5 rounded-xl shadow-md border-t-4 ${colorClass} bg-white transition duration-300 hover:shadow-xl`}>
    <div className="flex items-center">
      <div className={`p-2 rounded-full mr-3 bg-opacity-20 flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {value}
        </p>
      </div>
    </div>
  </div>
);


// --- Invoice Detail Modal Component ---
const InvoiceDetailModal = ({ invoice, onClose, onUpdateStatus, onDelete, clinicInfo = {} }) => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white" onClick={onClose}>
      <div 
        className="bg-white shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 scale-100 print:shadow-none print:w-full print:max-w-none print:m-0 print:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status Watermark */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none z-0 print:opacity-10" style={{ zIndex: 0 }}>
          <span className={`text-[100px] font-black uppercase transform -rotate-45 block ${invoice.status === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>
            {invoice.status}
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
              <p className="text-xs font-bold text-slate-500">#{invoice.id}</p>
            </div>
            
            <div className="flex items-start text-right mt-2 sm:mt-0 gap-4">
              <div className="text-right flex-1">
                <h2 className="text-xl font-bold text-slate-800">{clinicInfo.name || 'Slotify'}</h2>
                <p className="text-xs text-slate-600 mt-1">{clinicInfo.address || '123 Health Avenue, Medical District'}</p>
                <p className="text-xs text-slate-600">{clinicInfo.email || 'contact@clinicmanagement.com'}</p>
                <p className="text-xs text-slate-600">{clinicInfo.phone || '+1 (555) 123-4567'}</p>
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
                <h3 className="text-md font-bold text-slate-800">{invoice.patient}</h3>
                <p className="text-xs text-slate-600 mt-0.5">Patient ID: {details.patientId || invoice.patientId || 'N/A'}</p>
                <p className="text-xs text-slate-600">Attending Doctor: <span className="font-semibold">{invoice.doctor}</span></p>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Invoice Date</p>
                  <p className="text-xs font-semibold text-slate-800">{invoice.date}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Due Date</p>
                  <p className="text-xs font-semibold text-slate-800">{invoice.date}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Payment Mode</p>
                  <p className="text-xs font-semibold text-slate-800">{details.paymentMode || 'N/A'}</p>
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
          <div className="mt-6 flex justify-center print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors shadow-md"
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
  const { user } = useAuth();
  const clinicInfo = user?.organization || {};

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
        // Allow time for the hidden print container to populate before triggering print
        setTimeout(() => {
          window.print();
          setPrintingInvoice(null);
        }, 100);
        setStatusMessage(`Printing Invoice ${invoice.id} for ${invoice.patient}`);
      }
    }
  };

  // Handler for saving a new invoice from the form
  const handleSaveNewInvoice = (newInvoice, shouldPrint = false) => {
    setInvoices(prev => [newInvoice, ...prev]);
    if (shouldPrint) {
      setPrintingInvoice(newInvoice);
      setTimeout(() => {
        window.print();
        setPrintingInvoice(null);
      }, 150);
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
    let filtered = invoices.filter(invoice => {
      // Apply status filter
      if (activeFilter !== 'All' && invoice.status !== activeFilter) {
        return false;
      }

      // Apply search term filter
      if (searchTerm) {
        const matchesPatient = invoice.patient.toLowerCase().includes(lowerCaseSearch);
        const matchesDoctor = invoice.doctor.toLowerCase().includes(lowerCaseSearch);
        const matchesId = invoice.id.toLowerCase().includes(lowerCaseSearch);
        return matchesPatient || matchesDoctor || matchesId;
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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-10 font-['Inter']">

      {/* Header and Title */}
      <header className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tighter">
          Billing & Payments
        </h1>
        <p className="mt-2 text-xl text-gray-500">
          Centralized financial management for patient services.
        </p>
      </header>

      {/* Status Message Display */}
      {statusMessage && (
        <div className={`mb-8 p-4 ${statusMessage.startsWith('Error') ? 'bg-red-100 text-red-800 border-red-200' : 'bg-blue-100 text-blue-800 border-blue-200'} rounded-xl shadow-lg border transition-opacity duration-300`}>
          {statusMessage}
        </div>
      )}

      {/* Main Card Container */}
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-10">

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
      {selectedInvoice && <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteInvoice} clinicInfo={clinicInfo} />}

      {/* Hidden Invoice Template for Printing */}
      <div className="hidden print:block invoice-print-container">
        {printingInvoice && (
          <div key={`print-${printingInvoice.id}`} className="print-only-item">
            <InvoiceTemplate
              clinicInfo={clinicInfo}
              invoiceData={{
                billId: printingInvoice.id,
                date: printingInvoice.date,
                patientName: printingInvoice.patient,
                items: [
                  { description: 'Consultation Fee', price: printingInvoice.details?.consultationFee || 0 },
                  { description: 'Tests/Lab Fees', price: printingInvoice.details?.tests || 0 },
                  { description: 'Medicines/Pharmacy', price: printingInvoice.details?.medicines || 0 },
                  { description: 'Additional Charges', price: printingInvoice.details?.additionalCharges || 0 }
                ],
                subtotal: (printingInvoice.details?.consultationFee || 0) + (printingInvoice.details?.tests || 0) + (printingInvoice.details?.medicines || 0) + (printingInvoice.details?.additionalCharges || 0),
                discount: printingInvoice.details?.discounts || 0,
                total: printingInvoice.amount,
                notes: '',
                paymentMethod: printingInvoice.details?.paymentMode || 'N/A'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingDashboard;

