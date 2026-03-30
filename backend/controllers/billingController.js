import Billing from '../models/Billing.js';
import Counter from '../models/Counter.js';
import Product from '../models/Product.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import Appointment from '../models/Appointment.js';

// Helper to sync payment status with Appointment across all collections
const syncAppointmentStatus = async (appointmentId, billStatus) => {
  if (!appointmentId) return;
  
  // Map billing status to appointment paymentStatus enum: ['pending', 'paid', 'refunded']
  let paymentStatus = 'pending';
  if (billStatus === 'Paid') paymentStatus = 'paid';
  else if (billStatus === 'Refunded') paymentStatus = 'refunded';
  // 'Due' or 'Pending' bills map to 'pending' appointment paymentStatus
  
  try {
    const updateData = { paymentStatus };
    await Promise.all([
      PendingAppointment.findByIdAndUpdate(appointmentId, updateData),
      ConfirmedAppointment.findByIdAndUpdate(appointmentId, updateData),
      CancelledAppointment.findByIdAndUpdate(appointmentId, updateData),
      Appointment.findByIdAndUpdate(appointmentId, updateData)
    ]);
  } catch (error) {
    console.error(`Sync error for appointment ${appointmentId}:`, error);
  }
};

export const getAllBills = async (req, res) => {
  try {
    const bills = await Billing.find({ organizationId: req.tenantId }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBillingStats = async (req, res) => {
  try {
    const totalCollected = await Billing.aggregate([
      { $match: { organizationId: req.tenantId, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingPayments = await Billing.aggregate([
      { $match: { organizationId: req.tenantId, status: 'Pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const duePayments = await Billing.aggregate([
      { $match: { organizationId: req.tenantId, status: 'Due' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      totalCollected: totalCollected[0]?.total || 0,
      pendingPayments: pendingPayments[0]?.total || 0,
      duePayments: duePayments[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBill = async (req, res) => {
  try {
    const { patientId, patientName, patientPhone, doctorId, doctorName, amount, items, status, notes, paymentMethod, transactionId, appointmentId, appointmentDate, appointmentTime, paidAmount, dueAmount } = req.body;

    if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });
    if (!patientName) return res.status(400).json({ message: 'Patient name is required' });
    if (!doctorId) return res.status(400).json({ message: 'Doctor ID is required' });
    if (!doctorName) return res.status(400).json({ message: 'Doctor name is required' });
    if (!amount || isNaN(amount)) return res.status(400).json({ message: 'Valid amount is required' });

    const counter = await Counter.findOneAndUpdate(
      { name: `billId_${req.tenantId}` },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const billId = `BIL${String(counter.value).padStart(6, '0')}`;

    const newBill = new Billing({
      billId,
      organizationId: req.tenantId,
      patientId,
      patientName,
      patientPhone: patientPhone || '',
      doctorId,
      doctorName,
      amount: parseFloat(amount),
      paidAmount: paidAmount || 0,
      dueAmount: dueAmount || 0,
      appointmentId: appointmentId || null,
      appointmentDate: appointmentDate || null,
      appointmentTime: appointmentTime || null,
      items: items || [],
      status: status || 'Pending',
      notes: notes || '',
      paymentMethod: paymentMethod || 'N/A'
    });

    await newBill.save();

    // Sync with Appointment paymentStatus
    await syncAppointmentStatus(appointmentId, status);

    res.status(201).json(newBill);
  } catch (error) {
    console.error('Billing error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const updateBillStatus = async (req, res) => {
  try {
    const { status, paymentMethod, transactionId, notes } = req.body;
    const bill = await Billing.findOne({ _id: req.params.id, organizationId: req.tenantId });
    
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (status) bill.status = status;
    if (paymentMethod) bill.paymentMethod = paymentMethod;
    if (transactionId) bill.transactionId = transactionId;
    if (notes) bill.notes = notes;

    await bill.save();

    // Sync with Appointment paymentStatus if appointmentId exists
    if (bill.appointmentId) {
      // Use bill.status as it was just updated above
      await syncAppointmentStatus(bill.appointmentId, bill.status);
    }

    res.json(bill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteBill = async (req, res) => {
  try {
    const bill = await Billing.findOneAndDelete({ _id: req.params.id, organizationId: req.tenantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBillById = async (req, res) => {
  try {
    const bill = await Billing.findOne({ _id: req.params.id, organizationId: req.tenantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const createPOSBill = async (req, res) => {
  try {
    const { patientId, patientName, patientPhone, items, discount = 0, paymentMethod, templateId, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // 1. Generate Invoice Number (CLINIC-YYYY-XXXX)
    const year = new Date().getFullYear();
    const counterName = `invoice_${req.tenantId}_${year}`;
    const counter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const invoiceNumber = `CLINIC-${year}-${String(counter.value).padStart(4, '0')}`;

    // 2. Process items and calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, organizationId: req.tenantId });
      if (!product) continue;

      const qty = item.qty || 1;
      const itemSubtotal = product.price * qty;
      const itemTax = (itemSubtotal * (product.tax || 0)) / 100;

      subtotal += itemSubtotal;
      totalTax += itemTax;

      processedItems.push({
        productId: product._id,
        description: product.name,
        qty: qty,
        unitPrice: product.price,
        tax: product.tax,
        subtotal: itemSubtotal
      });

      // 3. Deduct Stock
      product.stock = Math.max(0, (product.stock || 0) - qty);
      await product.save();
    }

    const totalAmount = subtotal + totalTax - discount;

    const newBill = new Billing({
      organizationId: req.tenantId,
      invoiceNumber,
      billId: `POS-${Date.now()}`, // Temporary internal ID
      patientId: patientId || 'WALKIN',
      patientName: patientName || 'Walk-in Patient',
      patientPhone: patientPhone || '',
      amount: totalAmount,
      subtotal,
      taxAmount: totalTax,
      discount,
      paidAmount: totalAmount, // POS usually assumes full payment
      status: 'Paid',
      paymentMethod: paymentMethod || 'Cash',
      templateId,
      items: processedItems,
      notes
    });

    await newBill.save();
    res.status(201).json(newBill);
  } catch (error) {
    console.error('POS Billing error:', error);
    res.status(400).json({ message: error.message });
  }
};
