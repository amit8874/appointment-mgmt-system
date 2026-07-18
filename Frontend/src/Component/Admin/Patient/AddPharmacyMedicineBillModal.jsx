import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Download, Printer, Phone, Loader2, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import { billingApi, centralDoctorApi, medicineApi } from '../../../services/api';

const AddPharmacyMedicineBillModal = ({ isOpen, patientData = {}, onClose, onComplete, onPrint, onDownload, onWhatsApp }) => {
  const { user } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [items, setItems] = useState([
    { description: '', qty: 1, price: 0, subtotal: 0 }
  ]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Medicine autocomplete state
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [activeMedicineRow, setActiveMedicineRow] = useState(-1);
  const [medicineQuery, setMedicineQuery] = useState('');

  // Patient Info details
  const patientName = (patientData.fullName || `${patientData.firstName || ''} ${patientData.lastName || ''}`).trim().replace(/\b(MR|MS|MRS|DR|SHRI|SMT)\.?\s+\1\.?\b/gi, '$1.') || 'Valued Patient';
  const patientPhone = patientData.mobile || patientData.contactNumber || patientData.phone || '';

  // Fetch doctors on mount
  useEffect(() => {
    if (!isOpen) return;
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const response = await centralDoctorApi.getAll();
        const docsList = response?.doctors || (Array.isArray(response) ? response : []);
        setDoctors(docsList);
        
        // Auto-select assigned doctor or match by name/user role
        let foundDoc = null;
        if (patientData.assignedDoctorId) {
          foundDoc = docsList.find(d => (d._id === patientData.assignedDoctorId || d.id === patientData.assignedDoctorId));
        }
        if (!foundDoc && patientData.assignedDoctor) {
          const cleanName = patientData.assignedDoctor.toLowerCase().replace(/^(dr|dr\.)\s+/i, '').trim();
          foundDoc = docsList.find(d => {
            const fullName = `${d.firstName || ''} ${d.lastName || ''}`.toLowerCase().trim();
            return fullName.includes(cleanName) || cleanName.includes(fullName);
          });
        }

        if (foundDoc) {
          setSelectedDoctorId(foundDoc._id || foundDoc.id);
        } else if (user?.role === 'doctor') {
          const userDoc = docsList.find(d => (d._id === user._id || d.id === user.id || d.email === user.email));
          if (userDoc) {
            setSelectedDoctorId(userDoc._id || userDoc.id);
          } else if (docsList.length > 0) {
            setSelectedDoctorId(docsList[0]._id || docsList[0].id);
          }
        } else if (docsList.length > 0) {
          setSelectedDoctorId(docsList[0]._id || docsList[0].id);
        }
      } catch (err) {
        console.error('Error fetching doctors:', err);
        toast.error('Failed to load clinic doctors');
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, [isOpen, patientData.assignedDoctorId]);

  // Debounced medicine autocomplete search
  useEffect(() => {
    if (medicineQuery.trim().length < 1) {
      setMedicineSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await medicineApi.search(medicineQuery);
        setMedicineSuggestions(results);
      } catch {
        setMedicineSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [medicineQuery]);

  if (!isOpen) return null;

  // Row handlers
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index][field] = value;

      const qty = parseFloat(updated[index].qty) || 0;
      const price = parseFloat(updated[index].price) || 0;
      updated[index].subtotal = parseFloat((qty * price).toFixed(2));

      return updated;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { description: '', qty: 1, price: 0, subtotal: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      toast.warning('Bill must contain at least one item');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectMedicine = (index, medicineName) => {
    handleItemChange(index, 'description', medicineName);
    setActiveMedicineRow(-1);
    setMedicineSuggestions([]);
    setMedicineQuery('');
  };

  // Financial calculations
  const calculateItemsSubtotal = () => {
    return parseFloat(items.reduce((sum, item) => sum + (item.subtotal || 0), 0).toFixed(2));
  };

  const calculateTaxValue = () => {
    const subtotal = calculateItemsSubtotal();
    const discount = parseFloat(overallDiscount) || 0;
    const rate = parseFloat(taxRate) || 0;
    const base = Math.max(0, subtotal - discount);
    return parseFloat((base * (rate / 100)).toFixed(2));
  };

  const calculateNetPayable = () => {
    const subtotal = calculateItemsSubtotal();
    const discount = parseFloat(overallDiscount) || 0;
    const tax = calculateTaxValue();
    return parseFloat((Math.max(0, subtotal - discount) + tax).toFixed(2));
  };

  const calculateDue = () => {
    const net = calculateNetPayable();
    const paid = parseFloat(amountPaid) || 0;
    return parseFloat(Math.max(0, net - paid).toFixed(2));
  };

  // Action submission handler
  const handleAction = async (actionType) => {
    if (!selectedDoctorId) {
      toast.error('Please select an attending doctor');
      return;
    }
    const validItems = items.filter(i => i.description.trim() !== '' && i.qty > 0 && i.price >= 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid medicine item');
      return;
    }

    setSubmitting(true);
    try {
      const selectedDoctor = doctors.find(d => (d._id === selectedDoctorId || d.id === selectedDoctorId));
      const doctorName = selectedDoctor 
        ? (selectedDoctor.name || selectedDoctor.fullName || `${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim() || 'Attending Doctor') 
        : 'Attending Doctor';

      const subtotal = calculateItemsSubtotal();
      const discPercent = subtotal > 0 ? (parseFloat(overallDiscount) || 0) / subtotal * 100 : 0;
      const gstPercent = parseFloat(taxRate) || 0;

      const invoicePayload = {
        patientId: patientData.patientId || patientData.id || 'N/A',
        patientName: patientName,
        patientPhone: patientPhone,
        doctorId: selectedDoctorId,
        doctorName: doctorName,
        amount: calculateNetPayable(),
        items: validItems.map(i => ({
          description: i.description.trim(),
          qty: parseInt(i.qty),
          unitPrice: parseFloat(i.price),
          cost: parseFloat(i.price),
          subtotal: parseFloat(i.subtotal),
          discountPercentage: discPercent,
          gstPercentage: gstPercent,
          taxRate: gstPercent,
          date: date
        })),
        status: (parseFloat(amountPaid) || 0) >= calculateNetPayable() ? 'Paid' : ((parseFloat(amountPaid) || 0) > 0 ? 'Partial' : 'Pending'),
        discount: parseFloat(overallDiscount) || 0,
        taxRate: parseFloat(taxRate) || 0,
        paymentMethod: paymentMode,
        billType: 'Pharmacy',
        notes: notes || 'Pharmacy Invoice',
        paidAmount: parseFloat(amountPaid) || 0,
        dueAmount: calculateDue(),
        date: date
      };

      // Create invoice
      const newBill = await billingApi.create(invoicePayload);

      // Save medicines in DB asynchronously
      const names = validItems.map(i => i.description).filter(n => n && n.length >= 2);
      if (names.length > 0) {
        medicineApi.bulkSave(names).catch(() => {});
      }

      toast.success('Pharmacy invoice created successfully!');
      
      // Execute the action callback
      if (actionType === 'print') {
        onPrint(newBill);
      } else if (actionType === 'download') {
        onDownload(newBill);
      } else if (actionType === 'whatsapp') {
        onWhatsApp(newBill);
      }

      onComplete();
      onClose();
    } catch (err) {
      console.error('Error creating pharmacy bill:', err);
      toast.error(err.response?.data?.message || 'Failed to create pharmacy bill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
              💊
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">Add Medical Pharmacy Bill</h2>
              <p className="text-[10px] font-bold text-indigo-200">Patient Profile Pharmacy Desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          
          {/* General Metadata Section */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Patient Name</label>
              <div className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-black text-slate-800 border border-slate-100">
                {patientName}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mobile Number</label>
              <div className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-black text-slate-800 border border-slate-100">
                {patientPhone || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-350 rounded-xl text-xs font-black text-slate-850 bg-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Attending Doctor</label>
              {loadingDoctors ? (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 py-2.5 pl-2">
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : (
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-350 rounded-xl text-xs font-black text-slate-850 bg-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map(d => {
                    const docName = d.name || d.fullName || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Attending Doctor';
                    return (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        {docName.toLowerCase().startsWith('dr') ? docName : `Dr. ${docName}`} ({d.specialization || d.specialty || 'General'})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>

          {/* Grid Layout: Medicines List (Left) & Summary/Checkout (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Medicine Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Medicines Added</h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  <Plus size={14} /> Add Medicine
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm relative">
                    
                    {/* Medicine Name with autocomplete */}
                    <div className="col-span-6 relative">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Medicine Name</label>
                      <input
                        type="text"
                        placeholder="Type medicine name..."
                        value={item.description}
                        onChange={(e) => {
                          handleItemChange(index, 'description', e.target.value);
                          setMedicineQuery(e.target.value);
                          setActiveMedicineRow(index);
                        }}
                        onFocus={() => {
                          setMedicineQuery(item.description);
                          setActiveMedicineRow(index);
                        }}
                        onBlur={() => setTimeout(() => {
                          if (activeMedicineRow === index) {
                            setActiveMedicineRow(-1);
                            setMedicineSuggestions([]);
                          }
                        }, 200)}
                        className="w-full px-3 py-2 border border-slate-350 rounded-xl text-xs font-black text-slate-800 bg-white outline-none placeholder:text-slate-400 focus:border-indigo-500"
                      />
                      {/* Suggestions list */}
                      {activeMedicineRow === index && medicineSuggestions.length > 0 && (
                        <div className="absolute z-[100] w-full mt-1 bg-white rounded-xl shadow-2xl border border-indigo-100 overflow-hidden max-h-48 overflow-y-auto">
                          <div className="px-3 py-1 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Global Medicines Database</span>
                            <Search size={10} className="text-indigo-400" />
                          </div>
                          {medicineSuggestions.map((med) => (
                            <div
                              key={med._id}
                              onMouseDown={() => handleSelectMedicine(index, med.name)}
                              className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between group"
                            >
                              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">{med.name}</span>
                              <span className="text-[8px] text-slate-300 font-medium">used {med.usageCount}×</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty === 0 ? '' : item.qty}
                        placeholder="1"
                        onChange={(e) => {
                          const raw = e.target.value;
                          // Allow clearing the field while typing
                          if (raw === '' || raw === '0') {
                            handleItemChange(index, 'qty', 0);
                          } else {
                            const parsed = parseInt(raw);
                            if (!isNaN(parsed) && parsed > 0) {
                              handleItemChange(index, 'qty', parsed);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // On blur, ensure at least 1
                          const val = parseInt(e.target.value);
                          handleItemChange(index, 'qty', (!val || val < 1) ? 1 : val);
                        }}
                        className="w-full px-3 py-2 border border-slate-350 rounded-xl text-xs font-black text-slate-800 bg-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price === 0 ? '' : item.price}
                        placeholder="0.00"
                        onChange={(e) => handleItemChange(index, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 border border-slate-350 rounded-xl text-xs font-black text-slate-800 bg-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Total Cost */}
                    <div className="col-span-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total</label>
                      <div className="py-2.5 text-xs font-black text-slate-900">
                        ₹{item.subtotal}
                      </div>
                    </div>

                    {/* Delete Icon */}
                    <div className="col-span-1 text-right pt-4 md:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Remove medicine"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Checkout & Billing Details */}
            <div className="space-y-4">
              
              {/* Payment Settings */}
              <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2">Payment Details</h4>
                
                {/* Discounts & Tax */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Overall Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={overallDiscount === 0 ? '' : overallDiscount}
                      placeholder="0"
                      onChange={(e) => setOverallDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-350 rounded-xl text-xs font-black text-slate-800 bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tax / GST (%)</label>
                    <input
                      type="number"
                      min="0"
                      value={taxRate === 0 ? '' : taxRate}
                      placeholder="0"
                      onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-350 rounded-xl text-xs font-black text-slate-800 bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Card', 'UPI'].map(mode => (
                      <button
                        type="button"
                        key={mode}
                        onClick={() => setPaymentMode(mode)}
                        className={`py-2 px-3 border-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all cursor-pointer ${
                          paymentMode === mode
                            ? 'bg-indigo-50 text-indigo-700 font-black shadow-inner'
                            : 'border-slate-300 bg-white text-slate-700 font-bold hover:border-slate-450'
                        }`}
                        style={paymentMode === mode ? { borderColor: '#4f46e5' } : {}}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Paid & Outstanding Due */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={amountPaid}
                      placeholder="0"
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-350 rounded-xl text-xs font-black text-emerald-800 bg-white outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Outstanding Due</label>
                    <div className={`px-3 py-2.5 rounded-xl border text-xs font-black text-right ${
                      calculateDue() > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      ₹{calculateDue()}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="Enter invoice descriptions or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-350 rounded-xl text-xs font-black text-slate-800 bg-white outline-none resize-none placeholder:text-slate-400 focus:border-indigo-500 font-sans"
                  />
                </div>

              </div>

              {/* Net Total Summary Card */}
              <div className="bg-indigo-950 text-white rounded-3xl p-5 shadow-lg space-y-3">
                <div className="space-y-2 text-xs border-b border-white/10 pb-3">
                  <div className="flex justify-between">
                    <span className="opacity-80">Subtotal:</span>
                    <span className="font-black">₹{calculateItemsSubtotal()}</span>
                  </div>
                  {parseFloat(overallDiscount) > 0 && (
                    <div className="flex justify-between text-rose-300 font-bold">
                      <span>Discount:</span>
                      <span className="font-black">-₹{overallDiscount}</span>
                    </div>
                  )}
                  {calculateTaxValue() > 0 && (
                    <div className="flex justify-between text-slate-350 font-bold">
                      <span>Tax ({taxRate}%):</span>
                      <span className="font-black">+₹{calculateTaxValue()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-wider">Grand Net Total</span>
                  <span className="text-2xl font-black text-indigo-300">₹{calculateNetPayable()}</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer Actions with separated buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-all cursor-pointer font-bold"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('save')}
              className="w-full sm:w-auto px-5 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all cursor-pointer font-bold animate-pulse-subtle"
              style={{ backgroundColor: '#4f46e5' }}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Save Invoice
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('download')}
              className="w-full sm:w-auto px-5 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all cursor-pointer font-bold"
              style={{ backgroundColor: '#2563eb' }}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download Invoice
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('print')}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              Print Invoice
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('whatsapp')}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Phone className="w-3.5 h-3.5" />
              )}
              WhatsApp Invoice
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AddPharmacyMedicineBillModal;
