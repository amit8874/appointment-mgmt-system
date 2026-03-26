import { X, Printer, CreditCard, Banknote, Smartphone } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import { useAuth } from '../../context/AuthContext';

const BillingModal = ({ initialData = {}, onClose, onComplete }) => {
  const { user } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};
  const [data, setData] = useState({
    patientId: '',
    patientName: '',
    age: '',
    gender: '',
    contactNumber: '',
    email: '',
    bloodGroup: '',
    doctorId: '',
    doctorName: '',
    total: 0,
    discount: 0,
    discountType: 'percentage', // 'percentage' or 'fixed'
    paid: 0,
    paymentMode: 'cash', // 'cash', 'upi', 'netbanking'
    transactionId: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  });

  const [bill, setBill] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setData(prev => ({ ...prev, ...initialData }));
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      [name]: name === 'total' || name === 'discount' || name === 'paid'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handlePaymentModeChange = (mode) => {
    setData(prev => ({
      ...prev,
      paymentMode: mode,
      transactionId: mode === 'cash' ? '' : prev.transactionId
    }));
  };

  const calculatePayable = () => {
    const subtotal = data.total;
    let discountAmount = 0;
    
    if (data.discountType === 'percentage') {
      discountAmount = (subtotal * (data.discount || 0)) / 100;
    } else {
      discountAmount = data.discount || 0;
    }
    
    return Math.max(0, subtotal - discountAmount);
  };

  const calculateDue = () => {
    const payable = calculatePayable();
    const paid = data.paid || 0;
    return Math.max(0, payable - paid);
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);

    const payable = calculatePayable();
    const paid = data.paid || 0;
    
    // Determine status based on payment:
    // - If paid >= payable: 'Paid'
    // - If paid > 0 but paid < payable: 'Due'  
    // - If paid = 0: 'Pending'
    let status;
    if (paid >= payable) {
      status = 'Paid';
    } else if (paid > 0) {
      status = 'Due';
    } else {
      status = 'Pending';
    }

    // Validate transaction ID for UPI/Netbanking
    if ((data.paymentMode === 'upi' || data.paymentMode === 'netbanking') && !data.transactionId.trim()) {
      setError('Transaction ID is required for UPI/Netbanking payments');
      setSubmitting(false);
      return;
    }

    try {
      const { billingApi } = await import('../../services/api');
      const newBill = await billingApi.create({
        patientId: data.patientId,
        patientName: data.patientName,
        doctorId: data.doctorId || 'System',
        doctorName: data.doctorName || 'General Clinic',
        amount: payable,
        paidAmount: paid,
        dueAmount: calculateDue(),
        appointmentId: data.appointmentId || null,
        appointmentDate: data.appointmentDate || null,
        appointmentTime: data.appointmentTime || null,
        items: [
          {
            description: 'Consultation Fee',
            cost: payable
          }
        ],
        status,
        notes: data.notes,
        paymentMode: data.paymentMode,
        transactionId: data.transactionId || null
      });

      setBill(newBill);

      // auto-print when paid immediately
      if (status === 'Paid') {
        // allow modal to render bill first
        setTimeout(() => {
          window.print();
        }, 200);
      }

      if (onComplete) {
        onComplete(newBill);
      }
    } catch (err) {
      console.error('Billing error', err);
      setError(err.message || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr;
  };

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative">
        <button
          onClick={() => onClose && onClose()}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
          title="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {!bill ? (
          <>
            <div className="bg-gradient-to-r  px-6 py-4">
              <h2 className="text-2xl font-bold text-black">Billing Details</h2>
              <p className="text-gary-500 text-sm">Complete payment to register patient</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
            )}

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side - Patient Info */}
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-6 bg-blue-600 rounded mr-2"></span>
                      Patient Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Patient Name</label>
                        <p className="text-gray-900 font-semibold text-lg">{data.patientName || '—'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Age</label>
                        <p className="text-gray-700 font-medium">{data.age || '—'} years</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</label>
                        <p className="text-gray-700 font-medium">{data.gender || '—'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</label>
                        <p className="text-gray-700 font-medium">{data.contactNumber || '—'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Blood Group</label>
                        <p className="text-gray-700 font-medium">{data.bloodGroup || '—'}</p>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                        <p className="text-gray-700 font-medium">{data.email || '—'}</p>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned Doctor</label>
                        <p className="text-gray-700 font-medium">{data.doctorName || 'Unassigned'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 mt-4">
                    <h3 className="text-md font-semibold text-blue-800 mb-3">Appointment Details</h3>
                    <div className="flex gap-6">
                      <div>
                        <label className="block text-xs font-medium text-blue-600 uppercase tracking-wide">Date</label>
                        <p className="text-blue-900 font-medium">{formatDate(data.appointmentDate)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-600 uppercase tracking-wide">Time</label>
                        <p className="text-blue-900 font-medium">{formatTime(data.appointmentTime)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider Line - Visible on larger screens */}
                <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

                {/* Right Side - Billing Details */}
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-6 bg-green-600 rounded mr-2"></span>
                      Payment Details
                    </h3>
                    
                    {/* Amount Section */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Amount (₹)
                      </label>
                      <input
                        type="number"
                        name="total"
                        value={data.total}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Enter amount"
                      />
                    </div>

                    {/* Discount Section */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount
                      </label>
                      <div className="flex gap-2">
                        <select
                          name="discountType"
                          value={data.discountType}
                          onChange={handleChange}
                          className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">₹ Fixed</option>
                        </select>
                        <input
                          type="number"
                          name="discount"
                          value={data.discount}
                          onChange={handleChange}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={data.discountType === 'percentage' ? 'Enter %' : 'Enter amount'}
                        />
                      </div>
                    </div>

                    {/* Payable Amount Display */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-700">Payable Amount</span>
                        <span className="text-2xl font-bold text-green-700">₹{calculatePayable().toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Payment Mode Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePaymentModeChange('cash')}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition ${
                            data.paymentMode === 'cash'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <Banknote className="w-6 h-6 mb-1" />
                          <span className="text-sm font-medium">Cash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaymentModeChange('upi')}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition ${
                            data.paymentMode === 'upi'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <Smartphone className="w-6 h-6 mb-1" />
                          <span className="text-sm font-medium">UPI</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaymentModeChange('netbanking')}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition ${
                            data.paymentMode === 'netbanking'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <CreditCard className="w-6 h-6 mb-1" />
                          <span className="text-sm font-medium">Net Banking</span>
                        </button>
                      </div>
                    </div>

                    {/* Transaction ID - Only for UPI/Netbanking */}
                    {(data.paymentMode === 'upi' || data.paymentMode === 'netbanking') && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transaction ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="transactionId"
                          value={data.transactionId}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Enter ${data.paymentMode === 'upi' ? 'UPI' : 'Bank'} transaction ID`}
                        />
                      </div>
                    )}

                    {/* Amount Paid */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount Paid (₹)
                      </label>
                      <input
                        type="number"
                        name="paid"
                        value={data.paid}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter paid amount"
                      />
                      {calculateDue() > 0 && (
                        <p className="text-orange-600 text-sm mt-1">Due: ₹{calculateDue().toFixed(2)}</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (optional)
                      </label>
                      <textarea
                        name="notes"
                        value={data.notes}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Any additional notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => onClose && onClose()}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || data.total <= 0}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition shadow-md"
              >
                {submitting ? 'Processing...' : data.paid >= calculatePayable() ? 'Generate Bill & Register' : 'Register'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h2 className="text-2xl font-bold text-white">Invoice Preview</h2>
              <p className="text-green-100 text-sm">Bill generated successfully</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] bg-gray-100">
              {/* Invoice Template Preview - Scaled down for display */}
              <div className="transform scale-75 origin-top">
                <InvoiceTemplate
                  clinicInfo={clinicInfo}
                  invoiceData={{
                    billId: bill.billId || bill.id,
                    date: bill.date || new Date().toISOString(),
                    patientName: bill.patientName,
                    patientId: bill.patientId || 'N/A',
                    doctorName: bill.doctorName || bill.doctor || 'N/A',
                    patientContact: bill.patientContact || '',
                    patientAddress: bill.patientAddress || '',
                    items: bill.items || [{ description: 'Registration Charge', quantity: 1, cost: bill.amount }],
                    subtotal: bill.amount,
                    discount: bill.discount || 0,
                    total: bill.amount,
                    notes: bill.notes,
                    paymentMethod: bill.paymentMode || bill.status,
                    status: bill.status || 'Paid'
                  }}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="h-4 w-4 mr-2" /> Print Invoice
              </button>
              <button
                onClick={() => onClose && onClose()}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden Professional Invoice for Printing */}
      <div className="hidden print:block invoice-print-container">
        {bill && (
          <InvoiceTemplate
            clinicInfo={clinicInfo}
            invoiceData={{
              billId: bill.billId || bill.id,
              date: bill.date || new Date().toISOString(),
              patientName: bill.patientName,
              patientId: bill.patientId || 'N/A',
              doctorName: bill.doctorName || bill.doctor || 'N/A',
              items: bill.items.map(item => ({
                description: item.description,
                quantity: 1,
                price: item.cost
              })),
              subtotal: bill.amount,
              discount: 0,
              total: bill.amount,
              notes: bill.notes,
              paymentMethod: bill.paymentMode || bill.status,
              status: bill.status || 'Paid'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BillingModal;
