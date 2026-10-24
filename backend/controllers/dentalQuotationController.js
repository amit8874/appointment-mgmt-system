import mongoose from 'mongoose';
import path from 'path';
import os from 'os';
import fs from 'fs';
import DentalQuotation from '../models/DentalQuotation.js';
import DentalTreatment from '../models/DentalTreatment.js';
import Counter from '../models/Counter.js';
import Organization from '../models/Organization.js';
import { generateQuotationPDF } from '../services/pdfService.js';
import { sendWhatsAppMediaTemplate, uploadWhatsAppMediaFromFile, sendWhatsAppMessage } from '../services/whatsappService.js';
import { uploadToS3 } from '../utils/uploadToS3.js';

/**
 * 1. Create a new Dental Quotation
 */
export const createDentalQuotation = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      doctorName,
      items = [],
      discount = 0,
      taxAmount = 0,
      validUntil,
      notes,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one procedure is required for quotation' });
    }

    // Load Patient details
    let patient = null;
    try {
      const Patient = mongoose.model('Patient');
      patient = await Patient.findOne({
        _id: patientId,
        organizationId: req.tenantId || req.user?.organizationId,
      }).lean();
    } catch (e) {
      console.warn('Could not fetch patient in createDentalQuotation:', e.message);
    }

    // Auto-generate unique Quotation Number (EST-YYYY-XXXX)
    const year = new Date().getFullYear();
    const counterName = `quotation_${req.tenantId}_${year}`;
    const counter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const quotationNumber = `EST-${year}-${String(counter.value).padStart(4, '0')}`;

    // Calculate totals
    const processedItems = items.map((item) => {
      const teethArr = Array.isArray(item.teeth) ? item.teeth.map(String) : [];
      const toothDisplay = item.toothDisplay || (teethArr.length > 0 ? teethArr.join(', ') : 'General');
      const totalCost = Number(item.totalCost || item.cost || (Number(item.unitCost || 0) * (teethArr.length || 1)) || 0);
      const unitCost = Number(item.unitCost || (teethArr.length > 0 ? Math.round((totalCost / teethArr.length) * 100) / 100 : totalCost));
      return {
        procedure: item.procedure || item.name || 'Dental Procedure',
        teeth: teethArr,
        toothDisplay,
        unitCost,
        quantity: item.quantity || (teethArr.length > 0 ? teethArr.length : 1),
        totalCost,
        notes: item.notes || '',
      };
    });

    const subtotal = processedItems.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
    const numDiscount = Number(discount) || 0;
    const numTax = Number(taxAmount) || 0;
    const totalAmount = Math.max(0, subtotal - numDiscount + numTax);

    const quotation = new DentalQuotation({
      organizationId: req.tenantId || req.user?.organizationId,
      patientId,
      doctorId: doctorId || null,
      doctorName: doctorName || req.user?.name || 'Attending Doctor',
      quotationNumber,
      date: new Date(),
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      patientName: patient?.name || patient?.fullName || req.body.patientName || 'Walk-in Patient',
      patientPhone: patient?.mobile || patient?.phone || req.body.patientPhone || '',
      patientAge: patient?.age ? `${patient.age} Years` : (req.body.patientAge || ''),
      patientGender: patient?.gender || req.body.patientGender || '',
      patientAddress: patient?.address || req.body.patientAddress || '',
      items: processedItems,
      subtotal,
      discount: numDiscount,
      taxAmount: numTax,
      totalAmount,
      notes: notes || 'This quotation is an estimate of costs for the proposed dental treatments and is valid for 30 days.',
      status: 'Sent',
    });

    await quotation.save();

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      quotation,
    });
  } catch (error) {
    console.error('Error creating dental quotation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get all Quotations for a Patient
 */
export const getPatientQuotations = async (req, res) => {
  try {
    const { patientId } = req.params;
    const quotations = await DentalQuotation.find({
      organizationId: req.tenantId || req.user?.organizationId,
      patientId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      quotations: quotations || [],
    });
  } catch (error) {
    console.error('Error fetching patient quotations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Get Quotation by ID
 */
export const getQuotationById = async (req, res) => {
  try {
    const quotation = await DentalQuotation.findOne({
      _id: req.params.id,
      organizationId: req.tenantId || req.user?.organizationId,
    }).lean();

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    res.json({ success: true, quotation });
  } catch (error) {
    console.error('Error fetching quotation by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Quotation
 */
export const updateDentalQuotation = async (req, res) => {
  try {
    const quotation = await DentalQuotation.findOne({
      _id: req.params.id,
      organizationId: req.tenantId || req.user?.organizationId,
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const {
      items,
      discount,
      taxAmount,
      validUntil,
      notes,
      status,
      doctorName,
    } = req.body;

    if (items && Array.isArray(items)) {
      const processedItems = items.map((item) => {
        const teethArr = Array.isArray(item.teeth) ? item.teeth.map(String) : [];
        const toothDisplay = item.toothDisplay || (teethArr.length > 0 ? teethArr.join(', ') : 'General');
        const totalCost = Number(item.totalCost || item.cost || (Number(item.unitCost || 0) * (teethArr.length || 1)) || 0);
        const unitCost = Number(item.unitCost || (teethArr.length > 0 ? Math.round((totalCost / teethArr.length) * 100) / 100 : totalCost));
        return {
          procedure: item.procedure || item.name || 'Dental Procedure',
          teeth: teethArr,
          toothDisplay,
          unitCost,
          quantity: item.quantity || (teethArr.length > 0 ? teethArr.length : 1),
          totalCost,
          notes: item.notes || '',
        };
      });
      quotation.items = processedItems;
      quotation.subtotal = processedItems.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
    }

    if (discount !== undefined) quotation.discount = Number(discount) || 0;
    if (taxAmount !== undefined) quotation.taxAmount = Number(taxAmount) || 0;
    quotation.totalAmount = Math.max(0, quotation.subtotal - quotation.discount + quotation.taxAmount);

    if (validUntil) quotation.validUntil = new Date(validUntil);
    if (notes !== undefined) quotation.notes = notes;
    if (status) quotation.status = status;
    if (req.body.doctorId !== undefined) quotation.doctorId = req.body.doctorId;
    if (doctorName) quotation.doctorName = doctorName;

    await quotation.save();

    res.json({
      success: true,
      message: 'Quotation updated successfully',
      quotation,
    });
  } catch (error) {
    console.error('Error updating dental quotation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Delete Quotation
 */
export const deleteDentalQuotation = async (req, res) => {
  try {
    const quotation = await DentalQuotation.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.tenantId || req.user?.organizationId,
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error('Error deleting dental quotation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Convert Quotation to Active Plan Procedure(s)
 * Automatically creates DentalTreatment records for teeth & procedures with optional advance paidAmount!
 */
export const convertQuotationToPlan = async (req, res) => {
  try {
    const quotation = await DentalQuotation.findOne({
      _id: req.params.id,
      organizationId: req.tenantId || req.user?.organizationId,
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const { paidAmount = 0, priority = 'Medium', notes = '' } = req.body;
    const initialPaid = Number(paidAmount) || 0;
    const grandTotal = Number(quotation.totalAmount) || 0;

    const createdTreatments = [];

    // For each item in the quotation
    for (const item of quotation.items) {
      const teethList = (item.teeth && item.teeth.length > 0) ? item.teeth : ['General'];
      const totalItemCost = Number(item.totalCost) || 0;
      const perToothCost = Math.round((totalItemCost / teethList.length) * 100) / 100;

      for (const tooth of teethList) {
        // Proportionally allocate initial paid amount if entered
        let toothPaid = 0;
        if (grandTotal > 0 && initialPaid > 0) {
          const ratio = perToothCost / grandTotal;
          toothPaid = Math.min(perToothCost, Math.round(initialPaid * ratio * 100) / 100);
        }

        const treatment = new DentalTreatment({
          organizationId: quotation.organizationId,
          patientId: quotation.patientId,
          doctorId: quotation.doctorId || req.user?._id,
          toothNumber: String(tooth),
          procedure: item.procedure,
          notes: notes || quotation.notes || item.notes || '',
          estimatedCost: perToothCost,
          paidAmount: toothPaid,
          status: toothPaid >= perToothCost && perToothCost > 0 ? 'Completed' : 'Planned',
          priority: priority || 'Medium',
        });

        await treatment.save();
        createdTreatments.push(treatment);
      }
    }

    // Update quotation status
    quotation.status = 'Converted';
    quotation.convertedAt = new Date();
    quotation.convertedPaidAmount = initialPaid;
    quotation.convertedTreatmentIds = createdTreatments.map(t => t._id);
    await quotation.save();

    res.json({
      success: true,
      message: `Successfully converted quotation into ${createdTreatments.length} planned treatment procedure(s)!`,
      treatments: createdTreatments,
      quotation,
    });
  } catch (error) {
    console.error('Error converting quotation to plan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Download Quotation PDF
 */
export const downloadQuotationPDF = async (req, res) => {
  try {
    const quotation = await DentalQuotation.findOne({
      _id: req.params.id,
      organizationId: req.tenantId || req.user?.organizationId,
    }).lean();

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const org = await Organization.findById(quotation.organizationId).lean();
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    let doctorDetails = null;
    try {
      const Doctor = mongoose.model('Doctor');
      if (quotation.doctorId) {
        doctorDetails = await Doctor.findById(quotation.doctorId).lean();
        if (!doctorDetails) {
          doctorDetails = await Doctor.findOne({ doctorId: quotation.doctorId }).lean();
        }
      }
      if (!doctorDetails && quotation.doctorName) {
        const cleanTarget = quotation.doctorName.replace(/^(dr|dr\.)\s+/i, '').trim();
        doctorDetails = await Doctor.findOne({
          organizationId: quotation.organizationId,
          name: { $regex: cleanTarget, $options: 'i' }
        }).lean();
      }
    } catch (docErr) {
      console.warn('Could not load doctor for quotation PDF:', docErr.message);
    }

    const pdfBuffer = await generateQuotationPDF(quotation, org, doctorDetails);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Quotation-${quotation.quotationNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating quotation PDF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Send Quotation via WhatsApp
 */
export const sendQuotationWhatsApp = async (req, res) => {
  try {
    const quotation = await DentalQuotation.findOne({
      _id: req.params.id,
      organizationId: req.tenantId || req.user?.organizationId,
    }).lean();

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const targetPhone = req.body.phone || quotation.patientPhone;
    if (!targetPhone) {
      return res.status(400).json({ success: false, message: 'Patient phone number is required' });
    }

    const sanitizedPhone = targetPhone.replace(/\D/g, '').slice(-10);
    const org = await Organization.findById(quotation.organizationId).lean();

    let doctorDetails = null;
    try {
      const Doctor = mongoose.model('Doctor');
      if (quotation.doctorId) {
        doctorDetails = await Doctor.findById(quotation.doctorId).lean();
        if (!doctorDetails) {
          doctorDetails = await Doctor.findOne({ doctorId: quotation.doctorId }).lean();
        }
      }
      if (!doctorDetails && quotation.doctorName) {
        const cleanTarget = quotation.doctorName.replace(/^(dr|dr\.)\s+/i, '').trim();
        doctorDetails = await Doctor.findOne({
          organizationId: quotation.organizationId,
          name: { $regex: cleanTarget, $options: 'i' }
        }).lean();
      }
    } catch (e) {}

    // 1. Generate Quotation PDF Buffer
    const pdfBuffer = await generateQuotationPDF(quotation, org, doctorDetails);

    // 2. Upload to S3 for persistent link
    let pdfUrl = '';
    try {
      const s3Result = await uploadToS3({
        buffer: pdfBuffer,
        originalName: `Quotation-${quotation.quotationNumber}.pdf`,
        mimeType: 'application/pdf',
        folderType: 'invoices',
        organizationId: quotation.organizationId,
      });
      pdfUrl = s3Result.signedUrl || s3Result.fileUrl;
    } catch (s3Err) {
      console.warn('S3 upload skipped for quotation:', s3Err.message);
    }

    // 3. Upload to WhatsApp Media API using a temp file
    const tempPdfPath = path.join(os.tmpdir(), `temp-quotation-${quotation.quotationNumber}-${Date.now()}.pdf`);
    let mediaId = null;
    try {
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      mediaId = await uploadWhatsAppMediaFromFile(tempPdfPath, 'application/pdf');
    } catch (mediaErr) {
      console.warn('WhatsApp media upload failed, will fallback:', mediaErr.message);
    } finally {
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    }

    // 4. Send Document via WhatsApp
    const clinicName = org?.branding?.clinicName || org?.name || 'Dental Clinic';
    const bodyParameters = [
      quotation.patientName || 'Valued Patient',
      clinicName,
    ];

    let waResult = null;
    try {
      waResult = await sendWhatsAppMediaTemplate(
        sanitizedPhone,
        'invoice_generic',
        pdfUrl,
        'document',
        'en',
        bodyParameters,
        `Estimate-${quotation.quotationNumber}.pdf`,
        {
          mediaId,
          organizationId: quotation.organizationId,
          chargeCredit: true,
          messageType: 'QUOTATION_SENT',
        }
      );
    } catch (waErr) {
      console.warn('WhatsApp media template send failed, sending direct text message:', waErr.message);
      // Fallback to text message
      const textMsg = `Hello ${quotation.patientName},\n\nHere is your treatment cost estimate from ${clinicName}:\n\n` +
        `Estimate No: ${quotation.quotationNumber}\n` +
        `Total Estimated Cost: ₹${quotation.totalAmount}\n\n` +
        `Procedures:\n` +
        quotation.items.map(it => `• ${it.procedure} (${it.toothDisplay}): ₹${it.totalCost}`).join('\n') +
        `\n\nNotes: ${quotation.notes || 'Valid for 30 days.'}\n\nThank you!`;

      waResult = await sendWhatsAppMessage(sanitizedPhone, textMsg, {
        organizationId: quotation.organizationId,
        chargeCredit: true,
      });
    }

    // Update status to 'Sent'
    await DentalQuotation.findByIdAndUpdate(quotation._id, { status: 'Sent' });

    res.json({
      success: true,
      message: 'Quotation sent to patient via WhatsApp successfully',
      result: waResult,
      pdfUrl,
    });
  } catch (error) {
    console.error('Error sending quotation via WhatsApp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
