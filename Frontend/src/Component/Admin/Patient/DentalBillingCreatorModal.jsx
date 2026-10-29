import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, IndianRupee, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import { billingApi, dentistApi } from '../../../services/api';
import InvoiceTemplate from '../../../components/Shared/InvoiceTemplate';
import { createPortal } from 'react-dom';
import { STANDARD_DENTAL_PROCEDURES } from './dentalUtils';

const DentalBillingCreatorModal = ({ patientId, patientData = {}, appointments = [], onClose, onComplete }) => {
  const { user } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};

  const [items, setItems] = useState([
    { description: '', qty: 1, price: 0, discount: 0, subtotal: 0 }
  ]);
  const [customProcedures, setCustomProcedures] = useState([]);

  useEffect(() => {
    const fetchCustomProcedures = async () => {
      try {
        const res = await dentistApi.getCustomProcedures(patientData?.assignedDoctorId);
        setCustomProcedures(res || []);
      } catch (err) {
        console.error('Error fetching custom procedures in billing creator:', err);
      }
    };
    fetchCustomProcedures();
  }, [patientData?.assignedDoctorId]);

  // Merge custom procedures and standard presets, prioritizing custom default prices
  const mergedPresets = STANDARD_DENTAL_PROCEDURES.map(p => ({ ...p }));
  customProcedures.forEach(cp => {
    const existingIndex = mergedPresets.findIndex(sp => sp.name.toLowerCase() === cp.name.toLowerCase());
    if (existingIndex !== -1) {
      mergedPresets[existingIndex].defaultCost = cp.defaultCost;
    } else {
      mergedPresets.push({ name: cp.name, defaultCost: cp.defaultCost });
    }
  });
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [taxRate, setTaxRate] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedBill, setGeneratedBill] = useState(null);

  // Auto-fill patient name/phone from patientData
  const patientName = patientData.fullName || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Valued Patient';
  const patientPhone = patientData.mobile || patientData.contactNumber || '';
  const patientAddress = patientData.address || '';
  const age = patientData.age || '';
  const gender = patientData.gender || '';

  // Get most relevant appointment
  const getRelevantAppointment = () => {
    if (!appointments || appointments.length === 0) return {};
    const sorted = [...appointments].sort((a, b) => new Date(b.date) - new Date(a.date));
    const active = sorted.find(a => ['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase()));
    return active || sorted[0] || {};
  };

  const relevantAppt = getRelevantAppointment();

  // Handle changes for a specific item row
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index][field] = value;

      // Calculate item subtotal with percentage discount
      const qty = parseFloat(updated[index].qty) || 0;
      const price = parseFloat(updated[index].price) || 0;
      const discountPercent = parseFloat(updated[index].discount) || 0;
      const basePrice = qty * price;
      const discountAmount = (basePrice * discountPercent) / 100;
      updated[index].subtotal = Math.max(0, parseFloat((basePrice - discountAmount).toFixed(2)));

      return updated;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { description: '', qty: 1, price: 0, discount: 0, subtotal: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      toast.warning('A bill must contain at least one item');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePresetSelect = (index, presetName) => {
    const preset = mergedPresets.find(p => p.name === presetName);
    if (!preset) return;

    handleItemChange(index, 'description', preset.name);
    handleItemChange(index, 'price', preset.defaultCost);
  };

  // Calculations
  const calculateItemsSubtotal = () => {
    return items.reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)), 0);
  };

  const calculateItemsDiscount = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.price) || 0;
      const discountPercent = parseFloat(item.discount) || 0;
      return sum + ((qty * price * discountPercent) / 100);
    }, 0);
  };

  const calculateOverallDiscountValue = () => {
    const subtotal = calculateItemsSubtotal();
    const itemDiscounts = calculateItemsDiscount();
    const subtotalAfterItemDiscounts = Math.max(0, subtotal - itemDiscounts);

    if (discountType === 'percentage') {
      return parseFloat(((subtotalAfterItemDiscounts * (overallDiscount || 0)) / 100).toFixed(2));
    }
    return parseFloat((overallDiscount || 0).toFixed(2));
  };

  const calculateTotalDiscount = () => {
    return calculateItemsDiscount() + calculateOverallDiscountValue();
  };

  const calculateTaxableAmount = () => {
    const subtotal = calculateItemsSubtotal();
    const totalDiscount = calculateTotalDiscount();
    return Math.max(0, subtotal - totalDiscount);
  };

  const calculateTaxValue = () => {
    const taxable = calculateTaxableAmount();
    return parseFloat(((taxable * (taxRate || 0)) / 100).toFixed(2));
  };

  const calculateNetPayable = () => {
    const taxable = calculateTaxableAmount();
    const tax = calculateTaxValue();
    return parseFloat((taxable + tax).toFixed(2));
  };

  const calculateDue = () => {
    const payable = calculateNetPayable();
    const paid = parseFloat(amountPaid) || 0;
    return Math.max(0, parseFloat((payable - paid).toFixed(2)));
  };

  // Keep paid amount in sync with total unless edited
  const netPayable = calculateNetPayable();
  useEffect(() => {
    setAmountPaid(netPayable.toString());
  }, [netPayable]);

  const handleSubmit = async (action) => {
    setError('');

    // Validations
    if (items.some(item => !item.description.trim())) {
      setError('Please provide a description/procedure name for all items');
      return;
    }
    if (items.some(item => {
      const q = parseInt(item.qty);
      return isNaN(q) || q <= 0;
    })) {
      setError('Quantity must be at least 1 for all items');
      return;
    }
    if (items.some(item => (parseFloat(item.price) || 0) < 0)) {
      setError('Prices cannot be negative');
      return;
    }
    const payableCheck = calculateNetPayable();
    if (payableCheck <= 0) {
      setError('Total bill amount must be greater than ₹0. Please enter the procedure prices.');
      return;
    }

    setSubmitting(true);
    const payable = calculateNetPayable();
    const paid = parseFloat(amountPaid) || 0;
    
    let status = 'Pending';
    if (paid >= payable) {
      status = 'Paid';
    } else if (paid > 0) {
      status = 'Due';
    }

    const payload = {
      patientId: patientData.patientId || patientId || 'WALKIN',
      patientName,
      patientPhone,
      patientAddress,
      age,
      gender,
      doctorId: patientData.assignedDoctorId || user?._id || 'System',
      doctorName: patientData.assignedDoctor || user?.name || 'General Clinic',
      date: billDate ? new Date(billDate) : new Date(),
      billDate: billDate,
      amount: payable,
      subtotal: calculateItemsSubtotal(),
      discount: calculateTotalDiscount(),
      grossAmount: calculateItemsSubtotal(),
      discountAmount: calculateTotalDiscount(),
      taxableAmount: calculateTaxableAmount(),
      taxAmount: calculateTaxValue(),
      paidAmount: paid,
      dueAmount: calculateDue(),
      appointmentId: relevantAppt._id || relevantAppt.id || null,
      appointmentDate: relevantAppt.date || null,
      appointmentTime: relevantAppt.time || null,
      notes: notes.trim(),
      paymentMethod: paymentMode,
      transactionId: transactionId.trim() || null,
      billType: 'Dental',
      status,
      installments: paid > 0 ? [{
        date: billDate ? new Date(billDate) : new Date(),
        amount: paid,
        paymentMethod: paymentMode,
        transactionId: transactionId.trim() || '',
        notes: 'Initial payment / Installment'
      }] : [],
      items: items.map(item => {
        const qtyVal = parseInt(item.qty) || 1;
        const priceVal = parseFloat(item.price) || 0;
        const discountPct = parseFloat(item.discount) || 0;
        const discountRupees = parseFloat(((qtyVal * priceVal * discountPct) / 100).toFixed(2));
        return {
          description: item.description,
          qty: qtyVal,
          quantity: qtyVal,
          unitPrice: priceVal,
          cost: priceVal,
          price: priceVal,
          discountPercent: discountPct,
          discount: discountRupees,
          discountAmount: discountRupees,
          subtotal: item.subtotal,
          total: item.subtotal
        };
      })
    };

    try {
      const newBill = await billingApi.create(payload);
      
      if (action === 'download') {
        toast.info('Preparing invoice download...');
        try {
          const response = await billingApi.downloadPDF(newBill._id || newBill.id, true);
          if (response && response.url) {
            const link = document.createElement('a');
            link.href = response.url;
            link.target = "_blank";
            link.download = `Invoice-${newBill.invoiceNumber || newBill.billId || 'invoice'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Download started!");
          }
        } catch (pdfErr) {
          console.error("PDF download error:", pdfErr);
          toast.error("Failed to download PDF");
        }
        if (onComplete) onComplete(newBill);
        onClose();
      } else if (action === 'whatsapp') {
        toast.info('Sending invoice via WhatsApp...');
        try {
          await billingApi.sendWhatsApp(newBill._id || newBill.id);
          toast.success('Invoice sent via WhatsApp successfully!');
        } catch (waErr) {
          console.error("WhatsApp error:", waErr);
          toast.error(waErr.response?.data?.message || 'Failed to send WhatsApp invoice.');
        }
        if (onComplete) onComplete(newBill);
        onClose();
      } else if (action === 'print') {
        setGeneratedBill(newBill);
        setTimeout(() => {
          window.print();
          if (onComplete) onComplete(newBill);
          onClose();
        }, 500);
      } else {
        toast.success('Bill generated successfully!');
        if (onComplete) onComplete(newBill);
        onClose();
      }
    } catch (err) {
      console.error('Error creating Dental bill:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save bill');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-100 max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <IndianRupee className="w-5 h-5 animate-pulse" /> Create Dental Invoice
            </h4>
            <p className="text-xs opacity-90 font-semibold mt-0.5">
              Generate custom bill for {patientName} (ID: {patientId || 'WALKIN'})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Patient Details Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div>
              <p className="text-[10px] font-black text-black uppercase tracking-widest">Patient Details</p>
              <p className="text-sm font-black text-black mt-1">{patientName}</p>
              {age || gender ? (
                <p className="text-xs text-slate-950 font-bold mt-0.5">{age} Yrs • {gender}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[10px] font-black text-black uppercase tracking-widest">Contact Number</p>
              <p className="text-sm font-black text-black mt-1">{patientPhone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-black uppercase tracking-widest">Attending Dentist</p>
              <p className="text-sm font-black text-black mt-1">
                {patientData.assignedDoctor || user?.name || 'General Clinic'}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-600" /> Invoice / Bill Date
              </label>
              <input 
                type="date"
                value={billDate}
                onChange={e => setBillDate(e.target.value)}
                className="mt-1 w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Items / Procedures List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h5 className="text-xs font-black text-black uppercase tracking-wider">Line Items / Clinical Services</h5>
              <button 
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-3.5">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 relative hover:border-indigo-200 transition-colors">
                  {/* TOP ROW: Procedure Label + Presets Selector + Delete Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                        Procedure / Cap / Clinical Service
                      </label>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Preset selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-indigo-600 whitespace-nowrap hidden sm:inline">Presets:</span>
                        <select
                          onChange={(e) => handlePresetSelect(idx, e.target.value)}
                          className="border border-slate-300 hover:border-indigo-400 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none bg-white cursor-pointer shadow-2xs max-w-[220px]"
                          defaultValue=""
                        >
                          <option value="" disabled>Select from Presets...</option>
                          {mergedPresets.map(proc => (
                            <option key={proc.name} value={proc.name}>
                              {proc.name.replace(/ Treatment| Placement| Surgery/g, '')}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Remove Button */}
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                          title="Remove line item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FULL WIDTH BIG TEXT INPUT FOR PROCEDURE DESCRIPTION */}
                  <div>
                    <input
                      type="text"
                      placeholder="Type procedure name, cap specification, tooth #, or custom treatment description..."
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none bg-white shadow-inner placeholder:text-slate-400 transition-all leading-normal"
                    />
                  </div>

                  {/* BOTTOM ROW: Financials (Qty, Price, Discount, Subtotal) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80 items-end">
                    {/* Quantity */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Qty</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                        className="border border-slate-300 focus:border-indigo-600 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none text-center bg-white w-full shadow-2xs"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Price (₹)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={item.price || ''}
                        placeholder="0"
                        onChange={(e) => handleItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 outline-none bg-white w-full placeholder:text-slate-400 shadow-2xs"
                      />
                    </div>

                    {/* Discount (%) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Discount (%)</label>
                        {item.discount > 0 && item.price > 0 && (
                          <span className="text-[9px] font-bold text-emerald-600">
                            -₹{(((parseFloat(item.qty) || 1) * (parseFloat(item.price) || 0) * (parseFloat(item.discount) || 0)) / 100).toFixed(0)}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            handleItemChange(idx, 'discount', Math.min(100, Math.max(0, isNaN(val) ? 0 : val)));
                          }}
                          className="border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 pr-7 text-xs font-black text-slate-900 outline-none bg-white w-full placeholder:text-slate-400 shadow-2xs"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 block text-right">Subtotal</label>
                      <div className="px-3.5 py-2 bg-indigo-50/80 text-xs font-black text-indigo-950 border border-indigo-100 rounded-xl text-right shadow-2xs">
                        ₹{item.subtotal}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Adjustments & Payments Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left Side: Discounts, Notes, Payment Details */}
            <div className="space-y-4">
              <h5 className="text-xs font-black text-black uppercase tracking-wider">Invoice Adjustments & Payment</h5>
              
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-4">
                {/* Overall Discount */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[9px] font-bold text-black uppercase tracking-widest block">Overall Discount</label>
                      {discountType === 'percentage' && overallDiscount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600">
                          = -₹{calculateOverallDiscountValue()}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? 100 : undefined}
                        value={overallDiscount || ''}
                        placeholder={discountType === 'percentage' ? "e.g. 10%" : "Enter discount (₹)"}
                        onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                        className="border border-slate-350 rounded-xl px-4 py-2 text-xs font-black text-black outline-none bg-white w-full placeholder:text-slate-400"
                      />
                      {discountType === 'percentage' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                          %
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-28">
                    <label className="text-[9px] font-bold text-black uppercase tracking-widest mb-1.5 block">Disc. Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="border border-slate-350 rounded-xl px-3 py-2 text-xs font-black text-black outline-none bg-white w-full cursor-pointer"
                    >
                      <option value="percentage">Percent (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                  </div>
                </div>

                {/* Tax rate */}
                <div>
                  <label className="text-[9px] font-bold text-black uppercase tracking-widest mb-1.5 block">Tax / GST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={taxRate || ''}
                    placeholder="e.g. 5"
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="border border-slate-350 rounded-xl px-4 py-2 text-xs font-black text-black outline-none bg-white w-full placeholder:text-slate-400"
                  />
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-3 gap-2.5">
                  {['UPI', 'Cash', 'Card'].map(mode => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 px-3 border-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all ${
                        paymentMode === mode
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-black shadow-inner'
                          : 'border-slate-300 bg-white text-slate-800 font-bold hover:border-slate-450'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Transaction ID */}
                {paymentMode !== 'Cash' && (
                  <div>
                    <label className="text-[9px] font-bold text-black uppercase tracking-widest mb-1.5 block">Transaction Reference ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR / Ref Number"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="border border-slate-350 rounded-xl px-4 py-2 text-xs font-black text-black outline-none bg-white w-full font-sans placeholder:text-slate-400"
                    />
                  </div>
                )}

                {/* Amount Paid */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="text-[9px] font-bold text-black uppercase tracking-widest mb-1.5 block">Amount Paid (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="border border-slate-350 rounded-xl px-4 py-2.5 text-xs font-black text-emerald-800 outline-none bg-white w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-black uppercase tracking-widest mb-1.5 block">Outstanding Due</label>
                    <p className={`px-4 py-2.5 rounded-xl border text-xs font-black text-right ${
                      calculateDue() > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      ₹{calculateDue()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Total Summary Panel */}
            <div className="space-y-4">
              <h5 className="text-xs font-black text-black uppercase tracking-wider">Invoice Summary</h5>
              
              <div className="bg-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="space-y-3 text-xs border-b border-white/10 pb-4">
                  <div className="flex justify-between">
                    <span className="opacity-100 font-extrabold text-white">Subtotal (Gross)</span>
                    <span className="font-black text-white">₹{calculateItemsSubtotal()}</span>
                  </div>
                  {calculateItemsDiscount() > 0 && (
                    <div className="flex justify-between text-rose-300 font-bold">
                      <span className="opacity-100">Itemized Discounts</span>
                      <span className="font-black">-₹{calculateItemsDiscount()}</span>
                    </div>
                  )}
                  {calculateOverallDiscountValue() > 0 && (
                    <div className="flex justify-between text-rose-300 font-bold">
                      <span className="opacity-100">Overall Discount</span>
                      <span className="font-black">-₹{calculateOverallDiscountValue()}</span>
                    </div>
                  )}
                  {calculateTaxValue() > 0 && (
                    <div className="flex justify-between text-slate-300 font-bold">
                      <span className="opacity-100">Tax / GST ({taxRate}%)</span>
                      <span className="font-black">+₹{calculateTaxValue()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-black uppercase tracking-wider text-white">Net Payable</span>
                  <span className="text-3xl font-black text-indigo-300">₹{calculateNetPayable()}</span>
                </div>

                {/* Diagnosis Notes */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10 text-indigo-900">
                  <label className="text-[9px] font-black text-white uppercase tracking-widest">Billing & Treatment Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Enter custom clinical notes, details of dental materials used, or terms of service..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="border-0 rounded-2xl px-4 py-2.5 text-xs font-black text-black outline-none resize-none bg-white/95 w-full font-sans shadow-inner placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('save')}
            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-60 transition-colors shadow-lg cursor-pointer"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>

      {/* Hidden Portal for Invoice Printing */}
      {generatedBill && createPortal(
        <div className="print-only">
          <InvoiceTemplate
            clinicInfo={clinicInfo}
            invoiceData={{
              billId: generatedBill.billId || generatedBill.id,
              date: generatedBill.date || new Date().toISOString(),
              patientName: generatedBill.patientName,
              patientId: generatedBill.patientId || 'N/A',
              doctorName: generatedBill.doctorName || 'N/A',
              items: (generatedBill.items || []).map(item => ({
                description: item.description,
                quantity: item.quantity || item.qty || 1,
                price: item.unitPrice || item.price || item.cost || 0,
                subtotal: item.subtotal
              })),
              subtotal: generatedBill.grossAmount || generatedBill.subtotal || generatedBill.amount,
              discount: generatedBill.discount || generatedBill.discountAmount || 0,
              taxAmount: generatedBill.taxAmount || 0,
              total: generatedBill.amount,
              notes: generatedBill.notes,
              paymentMethod: generatedBill.paymentMode || generatedBill.status,
              status: generatedBill.status || 'Paid',
              installments: generatedBill.installments || [],
              paidAmount: generatedBill.paidAmount,
              dueAmount: generatedBill.dueAmount
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default DentalBillingCreatorModal;
