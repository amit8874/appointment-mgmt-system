import mongoose from 'mongoose';
import Billing from '../models/Billing.js';
import Counter from '../models/Counter.js';
import Product from '../models/Product.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import Appointment from '../models/Appointment.js';
import Organization from '../models/Organization.js';
import InvoiceTemplate from '../models/InvoiceTemplate.js';
import { sendWhatsAppMediaTemplate } from '../services/whatsappService.js';
import { generateInvoicePDF } from '../services/pdfService.js';
import { v2 as cloudinary } from 'cloudinary';
import { sanitizePhone } from '../utils/phoneUtils.js';
import { saveMedicineNames } from './medicineController.js';

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
    const orgId = new mongoose.Types.ObjectId(req.tenantId);
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const totalCollected = await Billing.aggregate([
      { $match: { organizationId: orgId, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingPayments = await Billing.aggregate([
      { $match: { organizationId: orgId, status: 'Pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const duePayments = await Billing.aggregate([
      { $match: { organizationId: orgId, status: 'Due' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const todayRevenue = await Billing.aggregate([
      { 
        $match: { 
          organizationId: orgId, 
          status: 'Paid',
          $or: [
            // Case 1: Bills explicitly linked to today's appointments
            { appointmentDate: todayStr },
            // Case 2: Bills created today that are NOT linked to any specific appointment date (e.g. Pharmacy, Lab, General)
            { 
              $and: [
                { $or: [{ appointmentDate: null }, { appointmentDate: "" }] },
                { 
                  $or: [
                    { createdAt: { $gte: startOfToday, $lte: endOfToday } },
                    { date: { $gte: startOfToday, $lte: endOfToday } }
                  ]
                }
              ]
            }
          ]
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      totalCollected: totalCollected[0]?.total || 0,
      pendingPayments: (pendingPayments[0]?.total || 0) + (duePayments[0]?.total || 0),
      duePayments: duePayments[0]?.total || 0,
      todayRevenue: todayRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBill = async (req, res) => {
  try {
    const { patientId, patientName, patientPhone, doctorId, doctorName, amount, items, status, notes, paymentMethod, transactionId, appointmentId, appointmentDate, appointmentTime, paidAmount, dueAmount, billType, discount } = req.body;

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
      paymentMethod: paymentMethod || 'N/A',
      billType: billType || 'General',
      discount: parseFloat(discount) || 0
    });

    await newBill.save();

    // Auto-save medicine names to global DB for Pharmacy bills
    if ((billType || 'General') === 'Pharmacy' && Array.isArray(items) && items.length > 0) {
      const medicineNames = items
        .map(i => i.description || '')
        .filter(n => n.trim().length >= 2);
      // Non-blocking — runs in background, won't break billing
      saveMedicineNames(medicineNames);
    }

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

export const sendWhatsAppInvoice = async (req, res) => {
  try {
    const { id } = req.params; // MongoDB _id of the bill
    const bill = await Billing.findOne({ _id: id, organizationId: req.tenantId });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (!bill.patientPhone) {
      return res.status(400).json({ success: false, message: 'Patient phone number is missing in this bill.' });
    }

    // Get Organization Details for branding
    const org = await Organization.findById(req.tenantId);
    const clinicName = org?.clinicName || org?.name || 'Our Clinic';
    const clinicLogo = org.branding?.logo ? `<img src="${org.branding.logo}" style="max-height: 80px;" />` : '';

    // Get Default Invoice Template for this organization
    const template = await InvoiceTemplate.findOne({ organizationId: req.tenantId, isDefault: true }) || 
                     await InvoiceTemplate.findOne({ organizationId: req.tenantId });


    // Sanitize phone
    const sanitizedPhone = sanitizePhone(bill.patientPhone);
    const invoiceTemplateName = process.env.WHATSAPP_INVOICE_TEMPLATE || 'billing_invoice_pdf';

    // Meta Template Parameters
    // Variables: {{1}} = Patient Name, {{2}} = Clinic Name
    const bodyParameters = [
      bill.patientName || 'Valued Patient',
      clinicName
    ];

    // Generate REAL PDF Invoice
    console.log(`[WhatsApp Billing] Generating PDF for invoice ${bill.billId}...`);
    const pdfPath = await generateInvoicePDF(bill, org, template);
    
    // 2. Upload PDF to Cloudinary to ensure it has a public URL
    console.log(`[WhatsApp Billing] Uploading PDF to Cloudinary for ${bill.billId}...`);
    
    let invoicePdfUrl = '';
    try {
      const uploadResult = await cloudinary.uploader.upload(pdfPath, {
        resource_type: 'image', // Cloudinary treats PDF as image for better handling/preview
        public_id: `invoices/Invoice-${bill.billId}-${Date.now()}`,
        folder: 'oviaan_invoices',
        access_mode: 'public'
      });
      invoicePdfUrl = uploadResult.secure_url;
      console.log(`[WhatsApp Billing] Cloudinary Upload Success: ${invoicePdfUrl}`);
    } catch (uploadError) {
      console.error('[WhatsApp Billing] Cloudinary Upload Failed:', uploadError);
      throw new Error(`Failed to upload invoice to cloud storage: ${uploadError.message}`);
    }
    
    const result = await sendWhatsAppMediaTemplate(
      sanitizedPhone,
      invoiceTemplateName,
      invoicePdfUrl,
      'document',
      'en',
      bodyParameters,
      `Invoice-${bill.billId}.pdf`,
      {
        organizationId: req.tenantId,
        chargeCredit: true,
        messageType: 'INVOICE_SENT',
        relatedEntityType: 'Billing',
        relatedEntityId: bill._id,
        createdBy: req.user?._id,
        metadata: {
          source: 'billingController',
          templateName: invoiceTemplateName,
          billId: bill.billId,
          publicUrl: invoicePdfUrl
        },
        io: req.app.get('io')
      }
    );

    res.json({
      success: true,
      message: `Invoice sent successfully to ${sanitizedPhone}`,
      data: result
    });
  } catch (error) {
    console.error('[WhatsApp Billing Error]:', error.response?.data || error.message);
    
    // Return 402 if credits are insufficient
    if (error.code === "INSUFFICIENT_WHATSAPP_CREDITS") {
      return res.status(402).json({
        success: false,
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        message: "Your WhatsApp communication credits are finished. Please recharge to continue sending patient messages."
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send WhatsApp invoice.',
      error: error.response?.data || error.message
    });
  }
};
