import React, { useState, useEffect } from 'react';
import { dentistApi, billingApi } from '../../../services/api';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit3, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Smile
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { getToothLabel, getToothDisplayName } from './dentalUtils';
import { useAuth } from '../../../context/AuthContext';
import BillingModal from '../../../components/Shared/BillingModal';

const DentalTreatmentTab = ({ patientId, patientData, appointments = [] }) => {
  const { user } = useAuth();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Custom persistent dental numbering system choice
  const [numberingSystem, setNumberingSystem] = useState(() => {
    return localStorage.getItem('dentalNumberingSystem') || 'FDI';
  });

  // Payment Logging Modal state
  const [activeTreatment, setActiveTreatment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [loggingPayment, setLoggingPayment] = useState(false);

  // Edit status modal state
  const [editingStatusTreatment, setEditingStatusTreatment] = useState(null);
  const [newStatus, setNewStatus] = useState('Planned');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Billing Modal states
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingInitData, setBillingInitData] = useState({});

  // Selected treatments for multi-procedure billing
  const [selectedTreatments, setSelectedTreatments] = useState([]);

  // Synchronize numbering system choice across other dental tabs dynamically
  useEffect(() => {
    const syncSystem = () => {
      setNumberingSystem(localStorage.getItem('dentalNumberingSystem') || 'FDI');
    };
    window.addEventListener('dentalNumberingSystemChanged', syncSystem);
    return () => {
      window.removeEventListener('dentalNumberingSystemChanged', syncSystem);
    };
  }, []);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const res = await dentistApi.getPatientTreatments(patientId);
      setTreatments(res || []);
    } catch (err) {
      console.error('Error fetching patient treatments:', err);
      toast.error('Failed to load treatment plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
    setSelectedTreatments([]);
  }, [patientId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this treatment plan item?')) return;
    try {
      await dentistApi.deleteTreatment(id);
      toast.success('Treatment plan item deleted.');
      fetchTreatments();
    } catch (err) {
      console.error('Error deleting treatment:', err);
      toast.error('Failed to delete item.');
    }
  };

  const handleLogPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const currentDue = activeTreatment.dueAmount;
    if (Number(paymentAmount) > currentDue) {
      toast.error(`Payment amount cannot exceed remaining due (₹${currentDue})`);
      return;
    }

    setLoggingPayment(true);
    try {
      const updatedPaidAmount = (activeTreatment.paidAmount || 0) + Number(paymentAmount);
      const isFull = updatedPaidAmount >= activeTreatment.netAmount;
      
      await dentistApi.updateTreatment(activeTreatment._id, {
        paidAmount: updatedPaidAmount,
        status: isFull ? 'Completed' : activeTreatment.status
      });

      toast.success(`Payment of ₹${paymentAmount} logged successfully!`);
      setActiveTreatment(null);
      setPaymentAmount('');
      fetchTreatments();
    } catch (err) {
      console.error('Error logging payment:', err);
      toast.error('Failed to record payment log.');
    } finally {
      setLoggingPayment(false);
    }
  };

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      await dentistApi.updateTreatment(editingStatusTreatment._id, {
        status: newStatus
      });
      toast.success(`Status updated to ${newStatus}`);
      setEditingStatusTreatment(null);
      fetchTreatments();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update procedure status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // billing integration: generates invoice prefilled on billing panel
  const handleGenerateInvoice = (treatment) => {
    try {
      // Find the most relevant appointment for billing
      let appointmentId = null;
      let appointmentDate = null;
      let appointmentTime = null;

      if (appointments && appointments.length > 0) {
        // Sort appointments by date descending (most recent first)
        const sorted = [...appointments].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 1. Try to find a scheduled/confirmed/pending appointment
        const active = sorted.find(a => ['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase()));
        const relevantAppt = active || sorted[0];

        if (relevantAppt) {
          appointmentId = relevantAppt._id || relevantAppt.id;
          appointmentDate = relevantAppt.date;
          appointmentTime = relevantAppt.time;
        }
      }

      const initData = {
        billType: 'Dental',
        patientId: patientData.patientId || patientData._id,
        patientName: patientData.fullName || `${patientData.firstName} ${patientData.lastName}`,
        contactNumber: patientData.mobile || patientData.contactNumber || '',
        patientAddress: patientData.address || '',
        age: patientData.age || '',
        gender: patientData.gender || '',
        bloodGroup: patientData.bloodGroup || '',
        email: patientData.email || '',
        doctorId: treatment.doctorId || patientData.assignedDoctorId || user?._id || 'System',
        doctorName: treatment.doctorName || patientData.assignedDoctor || user?.name || 'General Clinic',
        total: treatment.estimatedCost,
        discount: treatment.discount || 0,
        discountType: 'fixed',
        paid: treatment.paidAmount || 0,
        paymentMode: 'cash',
        notes: `Dental treatment plan invoice generated for ${getToothDisplayName(treatment.toothNumber, numberingSystem)}. Notes: ${treatment.notes || ''}`,
        appointmentId,
        appointmentDate,
        appointmentTime,
        items: [{
          description: `${getToothDisplayName(treatment.toothNumber, numberingSystem)} - ${treatment.procedure}`,
          qty: 1,
          quantity: 1,
          price: treatment.estimatedCost,
          unitPrice: treatment.estimatedCost,
          discount: treatment.discount || 0,
          total: treatment.netAmount,
          cost: treatment.netAmount
        }]
      };

      setBillingInitData(initData);
      setBillingOpen(true);
    } catch (err) {
      console.error('Error opening dental billing modal:', err);
      toast.error('Failed to open billing modal.');
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedTreatments(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedTreatments.length === treatments.length) {
      setSelectedTreatments([]);
    } else {
      setSelectedTreatments(treatments.map(t => t._id));
    }
  };

  const handleGenerateInvoiceForSelected = () => {
    const selectedList = treatments.filter(t => selectedTreatments.includes(t._id));
    if (selectedList.length === 0) {
      toast.error("Please select at least one procedure to generate a bill.");
      return;
    }

    try {
      // Find the most relevant appointment for billing
      let appointmentId = null;
      let appointmentDate = null;
      let appointmentTime = null;

      if (appointments && appointments.length > 0) {
        const sorted = [...appointments].sort((a, b) => new Date(b.date) - new Date(a.date));
        const active = sorted.find(a => ['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase()));
        const relevantAppt = active || sorted[0];

        if (relevantAppt) {
          appointmentId = relevantAppt._id || relevantAppt.id;
          appointmentDate = relevantAppt.date;
          appointmentTime = relevantAppt.time;
        }
      }

      // Sum values
      const totalEstimated = selectedList.reduce((acc, t) => acc + (t.estimatedCost || 0), 0);
      const totalDiscount = selectedList.reduce((acc, t) => acc + (t.discount || 0), 0);
      const totalPaid = selectedList.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
      const totalNet = selectedList.reduce((acc, t) => acc + (t.netAmount || 0), 0);

      // Create aggregated notes
      const notesArray = selectedList.map(t => `${getToothDisplayName(t.toothNumber, numberingSystem)}: ${t.procedure}`).join(', ');

      const initData = {
        billType: 'Dental',
        patientId: patientData.patientId || patientData._id,
        patientName: patientData.fullName || `${patientData.firstName} ${patientData.lastName}`,
        contactNumber: patientData.mobile || patientData.contactNumber || '',
        patientAddress: patientData.address || '',
        age: patientData.age || '',
        gender: patientData.gender || '',
        bloodGroup: patientData.bloodGroup || '',
        email: patientData.email || '',
        doctorId: selectedList[0].doctorId || patientData.assignedDoctorId || user?._id || 'System',
        doctorName: selectedList[0].doctorName || patientData.assignedDoctor || user?.name || 'General Clinic',
        total: totalEstimated,
        discount: totalDiscount,
        discountType: 'fixed',
        paid: totalPaid,
        paymentMode: 'cash',
        notes: `Dental treatments invoice generated for: ${notesArray}`,
        appointmentId,
        appointmentDate,
        appointmentTime,
        items: selectedList.map(t => ({
          description: `${getToothDisplayName(t.toothNumber, numberingSystem)} - ${t.procedure}`,
          qty: 1,
          quantity: 1,
          price: t.estimatedCost,
          unitPrice: t.estimatedCost,
          discount: t.discount || 0,
          total: t.netAmount,
          cost: t.netAmount,
          treatmentId: t._id
        }))
      };

      setBillingInitData(initData);
      setBillingOpen(true);
    } catch (err) {
      console.error('Error opening dental billing modal:', err);
      toast.error('Failed to open billing modal.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-slate-100 rounded-b-3xl mt-4 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">
            Patient Treatment Plan & procedure Ledger
          </h3>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-black rounded-xl">
          {treatments.length} Active Procedures
        </span>
      </div>

      <AnimatePresence>
        {selectedTreatments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between bg-indigo-50/55 border border-indigo-100 p-4 rounded-2xl shadow-sm gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
                <p className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                  {selectedTreatments.length} {selectedTreatments.length === 1 ? 'Procedure' : 'Procedures'} Selected for Invoice
                </p>
              </div>
              <button
                onClick={handleGenerateInvoiceForSelected}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-md shadow-indigo-600/10 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <IndianRupee className="w-3.5 h-3.5" /> Generate Bill Invoice
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {treatments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Smile className="w-12 h-12 mb-3 opacity-40 text-indigo-400" />
          <p className="font-bold text-sm">No procedures planned yet. Go to Dental Chart to assign treatments.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={treatments.length > 0 && selectedTreatments.length === treatments.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                </th>
                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tooth</th>
                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedure</th>
                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing (₹)</th>
                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {treatments.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedTreatments.includes(item._id)}
                      onChange={() => handleToggleSelect(item._id)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                  </td>
                  <td className="p-3">
                    <span 
                      className="inline-flex px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 items-center justify-center font-black text-xs text-slate-700 shadow-sm"
                      title={getToothDisplayName(item.toothNumber, numberingSystem)}
                    >
                      {getToothLabel(item.toothNumber, numberingSystem)}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-black text-slate-800 text-sm">{item.procedure}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{item.notes || 'No description notes.'}</p>
                  </td>
                  <td className="p-3">
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-slate-400">Est: <span className="font-black text-slate-700">₹{item.estimatedCost}</span></p>
                      {item.discount > 0 && <p className="font-bold text-emerald-500">Disc: <span className="font-black">-₹{item.discount}</span></p>}
                      <p className="font-bold text-indigo-500">Net: <span className="font-black">₹{item.netAmount}</span></p>
                      <p className="font-bold text-slate-400">Paid: <span className="font-black text-emerald-600">₹{item.paidAmount}</span></p>
                      {item.dueAmount > 0 && <p className="font-bold text-rose-500">Due: <span className="font-black">₹{item.dueAmount}</span></p>}
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        setEditingStatusTreatment(item);
                        setNewStatus(item.status);
                      }}
                      className={`inline-flex px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors ${
                        item.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100' :
                        item.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100' :
                        'bg-cyan-50 text-cyan-600 border border-cyan-100 hover:bg-cyan-100'
                      }`}
                    >
                      {item.status}
                    </button>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      item.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleGenerateInvoice(item)}
                        className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all"
                        title="Generate Bill Invoice"
                      >
                        <IndianRupee className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setActiveTreatment(item);
                          setPaymentAmount(item.dueAmount.toString());
                        }}
                        disabled={item.dueAmount === 0}
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
                        title="Record Local Payment"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all"
                        title="Delete Procedure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Dialog */}
      <AnimatePresence>
        {activeTreatment && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden"
            >
              <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-black uppercase tracking-tight">Record Tooth Payment</h4>
                  <p className="text-xs opacity-80 font-semibold">{getToothDisplayName(activeTreatment.toothNumber, numberingSystem)} • {activeTreatment.procedure}</p>
                </div>
                <button 
                  onClick={() => setActiveTreatment(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLogPaymentSubmit} className="p-6 space-y-4">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Total Remaining Due</p>
                    <p className="text-2xl font-black text-emerald-800">₹{activeTreatment.dueAmount}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-60 animate-pulse" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter amount to pay"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTreatment(null)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loggingPayment}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-60 shadow-lg shadow-emerald-600/10"
                  >
                    {loggingPayment ? 'Processing...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Status Dialog */}
      <AnimatePresence>
        {editingStatusTreatment && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-black uppercase tracking-tight">Update Status</h4>
                  <p className="text-xs opacity-80 font-semibold">{editingStatusTreatment.procedure}</p>
                </div>
                <button 
                  onClick={() => setEditingStatusTreatment(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleStatusUpdateSubmit} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStatusTreatment(null)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-60 shadow-lg shadow-indigo-600/10"
                  >
                    {updatingStatus ? 'Updating...' : 'Update status'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* billing modal overlay */}
      {billingOpen && (
        <BillingModal
          initialData={billingInitData}
          onClose={() => setBillingOpen(false)}
          onComplete={(newBill) => {
            setBillingOpen(false);
            setSelectedTreatments([]);
            fetchTreatments();
          }}
        />
      )}

    </div>
  );
};

export default DentalTreatmentTab;
