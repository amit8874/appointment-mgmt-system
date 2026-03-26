import Billing from '../models/Billing.js';
import Counter from '../models/Counter.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import Appointment from '../models/Appointment.js';

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
    const { patientId, patientName, doctorId, doctorName, amount, items, status, notes, paymentMethod, transactionId, appointmentId, appointmentDate, appointmentTime, paidAmount, dueAmount } = req.body;

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

    if (appointmentId) {
      const paymentStatus = status === 'Paid' ? 'paid' : status === 'Due' ? 'due' : 'pending';
      let updated = await PendingAppointment.findByIdAndUpdate(
        appointmentId,
        { amount: parseFloat(amount), paymentStatus },
        { new: true }
      );
      if (!updated) {
        updated = await ConfirmedAppointment.findByIdAndUpdate(
          appointmentId,
          { amount: parseFloat(amount), paymentStatus },
          { new: true }
        );
      }
      if (!updated) {
        updated = await Appointment.findByIdAndUpdate(
          appointmentId,
          { amount: parseFloat(amount), paymentStatus },
          { new: true }
        );
      }
    }

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
