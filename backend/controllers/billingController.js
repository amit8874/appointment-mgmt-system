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
import Patient from '../models/PaitentEditProfile.js';
import { sendWhatsAppMediaTemplate, uploadWhatsAppMediaFromFile } from '../services/whatsappService.js';
import { sendInvoiceEmail } from '../services/emailService.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { uploadToS3 } from '../utils/uploadToS3.js';
import { getSignedDownloadUrl } from '../services/s3Service.js';
import { generateInvoicePDF } from '../services/pdfService.js';

import { sanitizePhone } from '../utils/phoneUtils.js';
import { saveMedicineNames } from './medicineController.js';
import { calculateInvoiceTotals } from '../utils/billingCalculations.js';

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000000; // Large default for legacy calls
    const skip = (page - 1) * limit;

    const query = { organizationId: req.tenantId };
    
    // Support filtering in the query
    if (req.query.billType) query.billType = req.query.billType;
    if (req.query.status) query.status = req.query.status;
    if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod;
    
    // Support search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { patientName: searchRegex },
        { patientId: searchRegex },
        { billId: searchRegex },
        { patientPhone: searchRegex }
      ];
    }

    const [bills, total] = await Promise.all([
      Billing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Billing.countDocuments(query)
    ]);
    
    // Attach signed URLs for S3 stored invoices
    for (let bill of bills) {
      if (bill.storageProvider === 'aws_s3' && bill.invoiceS3Key) {
        try {
          bill.invoiceSignedUrl = await getSignedDownloadUrl({ key: bill.invoiceS3Key, expiresInSeconds: 3600 });
        } catch (err) {
          console.warn(`Could not generate signed URL for bill ${bill._id}:`, err.message);
        }
      }
    }

    // Calculate summary metrics for the filtered query
    // NOTE: aggregate match requires explicit ObjectId casting
    const aggregateQuery = { ...query };
    if (aggregateQuery.organizationId && typeof aggregateQuery.organizationId === 'string') {
      aggregateQuery.organizationId = new mongoose.Types.ObjectId(aggregateQuery.organizationId);
    }

    const summary = await Billing.aggregate([
      { $match: aggregateQuery },
      { $group: {
          _id: null,
          totalPaid: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0] } },
          totalPending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, "$amount", 0] } },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
      }}
    ]);

    const metrics = summary.length > 0 ? summary[0] : { totalPaid: 0, totalPending: 0, totalAmount: 0, count: 0 };
    
    if (req.query.page) {
      return res.json({
        bills,
        summary: {
          totalPaid: metrics.totalPaid,
          totalPending: metrics.totalPending,
          totalBilled: metrics.totalAmount,
          averageInvoice: metrics.count > 0 ? metrics.totalAmount / metrics.count : 0,
          invoiceCount: metrics.count
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // Legacy support: if no page is specified, return as array
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

    const totals = calculateInvoiceTotals({
      amount,
      discountValue: discount,
      discountType: 'flat',
      items: items || [],
      status: status || 'Pending',
      paidAmount: paidAmount || 0
    });

    const newBill = new Billing({
      billId,
      organizationId: req.tenantId,
      patientId,
      patientName,
      patientPhone: patientPhone || '',
      doctorId,
      doctorName,
      amount: totals.grandTotal,
      grossAmount: totals.grossAmount,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      taxableAmount: totals.taxableAmount,
      paidAmount: totals.paidAmount,
      dueAmount: totals.dueAmount,
      appointmentId: appointmentId || null,
      appointmentDate: appointmentDate || null,
      appointmentTime: appointmentTime || null,
      items: items || [],
      status: status || 'Pending',
      notes: notes || '',
      paymentMethod: paymentMethod || 'N/A',
      billType: billType || 'General',
      discount: totals.discountAmount
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

export const updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Safety check: ensure organizationId matches
    const bill = await Billing.findOne({ _id: id, organizationId: req.tenantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'organizationId' && key !== 'invoiceUrl' && key !== 'invoiceS3Key') {
        bill[key] = updateData[key];
      }
    });

    // Clear PDF cache to force regeneration on next download
    bill.invoiceUrl = undefined;
    bill.invoiceS3Key = undefined;
    bill.storageProvider = undefined;

    await bill.save();

    // Sync with Appointment status
    if (bill.appointmentId) {
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
    const bill = await Billing.findOne({ _id: req.params.id, organizationId: req.tenantId }).lean();
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    
    if (bill.storageProvider === 'aws_s3' && bill.invoiceS3Key) {
      try {
        bill.invoiceSignedUrl = await getSignedDownloadUrl({ key: bill.invoiceS3Key, expiresInSeconds: 3600 });
      } catch (err) {
        console.warn(`Could not generate signed URL for bill ${bill._id}:`, err.message);
      }
    }
    
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

    const totals = calculateInvoiceTotals({
      items: processedItems,
      discountValue: discount,
      discountType: 'flat'
    });

    const newBill = new Billing({
      organizationId: req.tenantId,
      invoiceNumber,
      billId: `POS-${Date.now()}`, // Temporary internal ID
      patientId: patientId || 'WALKIN',
      patientName: patientName || 'Walk-in Patient',
      patientPhone: patientPhone || '',
      amount: totals.grandTotal,
      subtotal: totals.grossAmount,
      grossAmount: totals.grossAmount,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      discount: totals.discountAmount,
      taxableAmount: totals.taxableAmount,
      paidAmount: totals.grandTotal, // POS usually assumes full payment
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

    // Generate REAL PDF Invoice Buffer
    console.log(`[WhatsApp Billing] Generating PDF for invoice ${bill.billId}...`);
    const pdfBuffer = await generateInvoicePDF(bill, org, template);
    
    // Upload to AWS S3
    console.log(`[WhatsApp Billing] Uploading PDF to AWS S3 for ${bill.billId}...`);
    let invoicePdfUrl = '';
    try {
      const s3Result = await uploadToS3({
        buffer: pdfBuffer,
        originalName: `Invoice-${bill.billId}.pdf`,
        mimeType: 'application/pdf',
        folderType: 'invoices',
        organizationId: req.tenantId || bill.organizationId,
      });
      
      invoicePdfUrl = s3Result.signedUrl || s3Result.fileUrl;
      
      // Save fields to bill model
      bill.storageProvider = s3Result.storageProvider;
      bill.invoiceS3Bucket = s3Result.s3Bucket;
      bill.invoiceS3Key = s3Result.s3Key;
      bill.invoiceUrl = s3Result.fileUrl;
      bill.invoiceFileName = s3Result.fileName;
      bill.invoiceMimeType = s3Result.mimeType;
      await bill.save();
      console.log(`[WhatsApp Billing] S3 Upload Success: ${bill.invoiceUrl}`);
    } catch (uploadError) {
      console.error('[WhatsApp Billing] S3 Upload Failed:', uploadError);
      return res.status(500).json({ success: false, message: 'Failed to upload invoice to S3.', error: uploadError.message });
    }

    // NEW: Upload PDF directly to WhatsApp Media API using a temp file
    const tempPdfPath = path.join(os.tmpdir(), `temp-invoice-${bill.billId}-${Date.now()}.pdf`);
    
    let mediaId = null;
    try {
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      console.log(`[WhatsApp Billing] Uploading local temp PDF to WhatsApp Media API...`);
      mediaId = await uploadWhatsAppMediaFromFile(tempPdfPath, "application/pdf");
      console.log(`[WhatsApp Invoice] Uploaded Media ID: ${mediaId}`);
    } catch (mediaError) {
      console.error('[WhatsApp Invoice] Media upload failed:', mediaError);
      return res.status(500).json({ 
        success: false, 
        message: "Invoice PDF upload to WhatsApp failed. Please try again." 
      });
    } finally {
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
    }

    console.log(`[WhatsApp Invoice] Sending invoice template using media_id`);
    const result = await sendWhatsAppMediaTemplate(
      sanitizedPhone,
      invoiceTemplateName,
      invoicePdfUrl, // Fallback link
      'document',
      'en',
      bodyParameters,
      `Invoice-${bill.billId}.pdf`,
      {
        mediaId, // Use uploaded media ID
        organizationId: bill.organizationId || req.tenantId || req.user?.organizationId,
        chargeCredit: true,
        messageType: 'INVOICE_SENT',
        relatedEntityType: 'Billing',
        relatedEntityId: bill._id,
        createdBy: req.user?._id,
        metadata: {
          source: 'billingController',
          templateName: invoiceTemplateName,
          billId: bill.billId,
          publicUrl: invoicePdfUrl,
          mediaUploadMode: "media_id",
          mediaId
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

export const sendEmailInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Billing.findOne({ _id: id, organizationId: req.tenantId });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Get Patient Details for Email
    const patient = await Patient.findOne({ patientId: bill.patientId, organizationId: req.tenantId });
    const patientEmail = patient?.email || req.body.email; // Fallback to email in body if provided

    if (!patientEmail) {
      return res.status(400).json({ success: false, message: 'Patient email address is missing. Please update patient profile or provide an email.' });
    }

    // Get Organization Details for branding
    const org = await Organization.findById(req.tenantId);
    const clinicName = org?.clinicName || org?.name || 'Our Clinic';

    // Get Default Invoice Template
    const template = await InvoiceTemplate.findOne({ organizationId: req.tenantId, isDefault: true }) || 
                     await InvoiceTemplate.findOne({ organizationId: req.tenantId });

    // Generate REAL PDF Invoice Buffer
    console.log(`[Email Billing] Generating PDF for invoice ${bill.billId}...`);
    const pdfBuffer = await generateInvoicePDF(bill, org, template);

    // Send Email
    console.log(`[Email Billing] Sending invoice to ${patientEmail}...`);
    await sendInvoiceEmail(
      patientEmail,
      bill.patientName || 'Valued Patient',
      bill.billId,
      bill.amount,
      clinicName,
      pdfBuffer
    );

    res.json({
      success: true,
      message: `Invoice email sent successfully to ${patientEmail}`
    });
  } catch (error) {
    console.error('[Email Billing Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send email invoice.',
      error: error.message
    });
  }
};

export const getBillsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit for pagination
    const skip = (page - 1) * limit;
    
    let query = { organizationId: req.tenantId, patientId: patientId };

    // Support filtering in the query
    if (req.query.billType) query.billType = req.query.billType;
    if (req.query.status) query.status = req.query.status;
    
    // Support search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { patientName: searchRegex },
        { patientId: searchRegex },
        { billId: searchRegex },
        { invoiceNumber: searchRegex },
        { patientPhone: searchRegex }
      ];
    }

    const [bills, total] = await Promise.all([
      Billing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Billing.countDocuments(query)
    ]);
    
    // Attach signed URLs for S3 stored invoices
    for (let bill of bills) {
      if (bill.storageProvider === 'aws_s3' && bill.invoiceS3Key) {
        try {
          bill.invoiceSignedUrl = await getSignedDownloadUrl({ key: bill.invoiceS3Key, expiresInSeconds: 3600 });
        } catch (err) {
          console.warn(`Could not generate signed URL for bill ${bill._id}:`, err.message);
        }
      }
    }
    
    // Calculate totals for summary (always based on ALL bills for this patient for accurate metrics)
    const summaryQuery = { organizationId: req.tenantId, patientId: patientId };
    const allBillsForSummary = await Billing.find(summaryQuery).lean();
    let totalBilled = 0;
    let totalPaid = 0;
    let totalDue = 0;
    
    allBillsForSummary.forEach(b => {
      const totals = calculateInvoiceTotals(b);
      totalBilled += totals.grandTotal;
      totalPaid += totals.paidAmount;
      totalDue += totals.dueAmount;
    });

    if (req.query.page) {
      return res.json({
        bills,
        summary: {
          totalBilled,
          totalPaid,
          totalDue,
          invoiceCount: total
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    res.json({
      bills,
      summary: {
        totalBilled,
        totalPaid,
        totalDue,
        invoiceCount: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const isDownload = req.query.download === 'true';
    
    const bill = await Billing.findOne({ _id: id, organizationId: req.tenantId });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    const fileName = `Invoice-${bill.billId || 'bill'}.pdf`;
    const contentDisposition = isDownload 
      ? `attachment; filename="${fileName}"`
      : `inline; filename="${fileName}"`;

    // If already generated and in S3, just return a fresh signed URL
    // UNLESS a specific templateId is requested that might be different
    if (bill.storageProvider === 'aws_s3' && bill.invoiceS3Key && !req.query.templateId) {
      const signedUrl = await getSignedDownloadUrl({ 
        key: bill.invoiceS3Key, 
        expiresInSeconds: 3600,
        responseContentDisposition: contentDisposition
      });
      return res.json({ success: true, url: signedUrl });
    }
    
    // If it has an old local/cloudinary url, return it (note: standard URLs don't easily support force-download via presigned params)
    if (bill.invoiceUrl && bill.storageProvider !== 'aws_s3') {
       return res.json({ success: true, url: bill.invoiceUrl });
    }

    // Generate on the fly
    const org = await Organization.findById(req.tenantId);
    
    // Determine template: Priority: Query Param > Saved on Bill > Default
    let template = null;
    const targetTemplateId = req.query.templateId || bill.templateId;
    
    if (targetTemplateId && mongoose.Types.ObjectId.isValid(targetTemplateId)) {
      template = await InvoiceTemplate.findOne({ _id: targetTemplateId, organizationId: req.tenantId });
    }
    
    if (!template) {
      if (bill.billType === 'Pharmacy') {
        template = await InvoiceTemplate.findOne({ organizationId: req.tenantId, layoutType: 'pharmacy', isDefault: true }) || 
                   await InvoiceTemplate.findOne({ organizationId: req.tenantId, layoutType: 'pharmacy' }) ||
                   await InvoiceTemplate.findOne({ organizationId: req.tenantId, isDefault: true }) ||
                   await InvoiceTemplate.findOne({ organizationId: req.tenantId });
      } else {
        template = await InvoiceTemplate.findOne({ organizationId: req.tenantId, layoutType: { $ne: 'pharmacy' }, isDefault: true }) || 
                   await InvoiceTemplate.findOne({ organizationId: req.tenantId, layoutType: { $ne: 'pharmacy' } }) ||
                   await InvoiceTemplate.findOne({ organizationId: req.tenantId, isDefault: true }) ||
                   await InvoiceTemplate.findOne({ organizationId: req.tenantId });
      }
    }
                     
    const pdfBuffer = await generateInvoicePDF(bill, org, template);
    
    // Upload to S3
    const s3Result = await uploadToS3({
      buffer: pdfBuffer,
      originalName: fileName,
      mimeType: 'application/pdf',
      folderType: 'invoices',
      organizationId: req.tenantId || bill.organizationId,
    });
    
    // Save to bill
    bill.storageProvider = s3Result.storageProvider;
    bill.invoiceS3Bucket = s3Result.s3Bucket;
    bill.invoiceS3Key = s3Result.s3Key;
    bill.invoiceUrl = s3Result.fileUrl;
    bill.invoiceFileName = s3Result.fileName;
    bill.invoiceMimeType = s3Result.mimeType;
    await bill.save();
    
    // Return signed url with correct disposition
    const signedUrl = await getSignedDownloadUrl({ 
      key: bill.invoiceS3Key, 
      expiresInSeconds: 3600,
      responseContentDisposition: contentDisposition
    });
    return res.json({ success: true, url: signedUrl });
  } catch (error) {
    console.error('Download Invoice PDF Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

export const generatePatientStatement = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { billIds } = req.body;
    
    const query = { organizationId: req.tenantId, patientId: patientId };
    if (billIds && Array.isArray(billIds) && billIds.length > 0) {
      query._id = { $in: billIds };
    }

    const [bills, patient, org] = await Promise.all([
      Billing.find(query).sort({ date: 1, createdAt: 1 }).lean(),
      Patient.findOne({ patientId, organizationId: req.tenantId }).lean(),
      Organization.findById(req.tenantId).lean()
    ]);

    if (!bills.length) return res.status(404).json({ message: 'No bills found for this patient.' });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const { generateBillingStatementPDF } = await import('../services/pdfService.js');
    const pdfBuffer = await generateBillingStatementPDF(bills, patient, org);

    const cleanPatientName = (patient.fullName || patient.patientId).replace(/\b(MR|MS|MRS|DR|SHRI|SMT)\.?\s+\1\.?\b/gi, '$1.').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Statement-${cleanPatientName}-${Date.now()}.pdf`;
    const s3Key = `organizations/${req.tenantId}/patients/${patientId}/billing-statements/${fileName}`;

    const s3Result = await uploadToS3({
      buffer: pdfBuffer,
      originalName: fileName,
      mimeType: 'application/pdf',
      organizationId: req.tenantId,
      customKey: s3Key
    });

    const signedUrl = await getSignedDownloadUrl({ key: s3Key, expiresInSeconds: 3600 });

    res.json({
      success: true,
      statement: {
        storageProvider: 'aws_s3',
        s3Key,
        signedUrl,
        fileName,
        invoiceCount: bills.length,
        totalBilled: bills.reduce((sum, b) => sum + calculateInvoiceTotals(b).grandTotal, 0),
        totalPaid: bills.reduce((sum, b) => sum + calculateInvoiceTotals(b).paidAmount, 0),
        totalDue: bills.reduce((sum, b) => sum + calculateInvoiceTotals(b).dueAmount, 0)
      }
    });
  } catch (error) {
    console.error('Statement Generation Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const sendWhatsAppStatement = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { billIds, phone } = req.body;

    // 1. Generate Statement first
    const query = { organizationId: req.tenantId, patientId: patientId };
    if (billIds && Array.isArray(billIds) && billIds.length > 0) {
      query._id = { $in: billIds };
    }

    const [bills, patient, org] = await Promise.all([
      Billing.find(query).sort({ date: 1, createdAt: 1 }).lean(),
      Patient.findOne({ patientId, organizationId: req.tenantId }).lean(),
      Organization.findById(req.tenantId).lean()
    ]);

    if (!bills.length || !patient) return res.status(404).json({ message: 'Missing data for statement.' });

    const { generateBillingStatementPDF } = await import('../services/pdfService.js');
    const pdfBuffer = await generateBillingStatementPDF(bills, patient, org);

    const fileName = `Statement-${patient.fullName || patient.patientId}.pdf`;
    const s3Key = `organizations/${req.tenantId}/patients/${patientId}/billing-statements/${fileName}-${Date.now()}.pdf`;

    const s3Result = await uploadToS3({
      buffer: pdfBuffer,
      originalName: fileName,
      mimeType: 'application/pdf',
      organizationId: req.tenantId,
      customKey: s3Key
    });

    const publicUrl = s3Result.signedUrl || s3Result.fileUrl;
    const sanitizedPhone = sanitizePhone(phone || patient.mobile);

    // Upload to WhatsApp Media
    const tempPdfPath = path.join(os.tmpdir(), `temp-stmt-${patientId}-${Date.now()}.pdf`);
    let mediaId = null;
    try {
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      mediaId = await uploadWhatsAppMediaFromFile(tempPdfPath, "application/pdf");
    } finally {
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    }

    const result = await sendWhatsAppMediaTemplate(
      sanitizedPhone,
      'patient_statement_notification', // You might need to create this template in WhatsApp
      publicUrl,
      'document',
      'en',
      [
        { type: 'text', text: patient.fullName || 'Patient' },
        { type: 'text', text: bills.length.toString() }
      ],
      fileName,
      {
        mediaId,
        organizationId: req.tenantId,
        chargeCredit: true,
        messageType: 'STATEMENT_SENT',
        relatedEntityType: 'Patient',
        relatedEntityId: patient._id,
        createdBy: req.user?._id,
        io: req.app.get('io')
      }
    );

    res.json({ success: true, message: `Statement sent to ${sanitizedPhone}`, data: result });
  } catch (error) {
    console.error('WhatsApp Statement Error:', error);
    res.status(500).json({ message: error.message });
  }
};


