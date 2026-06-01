import PatientProgressComparison from '../models/PatientProgressComparison.js';
import Organization from '../models/Organization.js';
import { uploadToS3 } from '../utils/uploadToS3.js';
import { getSignedDownloadUrl } from '../services/s3Service.js';
import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import axios from 'axios';

// Helper to resolve patient ID (supporting both MongoDB ObjectId and custom sequential display patientId)
const resolvePatientId = async (patientId, organizationId) => {
  if (mongoose.Types.ObjectId.isValid(patientId)) {
    return patientId;
  }
  const Patient = mongoose.model('Patient');
  const patient = await Patient.findOne({ patientId, organizationId });
  return patient ? patient._id : null;
};

/**
 * Create a new progress comparison case
 */
export const createComparison = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      title, 
      treatmentType, 
      treatmentArea, 
      beforeNote, 
      afterNote, 
      resultNote,
      doctorObservation,
      recommendation,
      consentTaken, 
      consentNote,
      appointmentId 
    } = req.body;

    const organizationId = req.user.organizationId?._id || req.user.organizationId;
    const uploadedBy = req.user.id;
    const uploadedByRole = req.user.role;

    const resolvedPatientId = await resolvePatientId(patientId, organizationId);
    if (!resolvedPatientId) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (!req.files || !req.files.beforeImage || !req.files.afterImage) {
      return res.status(400).json({ message: 'Both before and after images are required' });
    }

    const beforeFile = req.files.beforeImage[0];
    const afterFile = req.files.afterImage[0];

    // Upload Before Image to S3
    const beforeUploadResult = await uploadToS3({
      file: beforeFile,
      folderType: `patients/${resolvedPatientId}/progress-comparisons`,
      organizationId: organizationId,
      metadata: {
        patientId: String(resolvedPatientId),
        type: 'before',
        uploadedBy: String(uploadedBy)
      }
    });

    // Upload After Image to S3
    const afterUploadResult = await uploadToS3({
      file: afterFile,
      folderType: `patients/${resolvedPatientId}/progress-comparisons`,
      organizationId: organizationId,
      metadata: {
        patientId: String(resolvedPatientId),
        type: 'after',
        uploadedBy: String(uploadedBy)
      }
    });

    // Try to get doctorName from Appointment if possible
    let finalDoctorName = req.user.name || (req.user.role === 'doctor' || req.user.role === 'Doctor' ? `Dr. ${req.user.lastName || ''}` : null);
    
    if (appointmentId) {
      try {
        const Appointment = mongoose.model('Appointment');
        const appointment = await Appointment.findById(appointmentId);
        if (appointment && appointment.doctorName) {
          finalDoctorName = appointment.doctorName;
        }
      } catch (err) {
        console.warn('[PatientProgressComparison] Failed to fetch appointment for doctorName:', err.message);
      }
    }

    if (!finalDoctorName) {
      try {
        const Patient = mongoose.model('Patient');
        const patient = await Patient.findById(resolvedPatientId);
        if (patient && patient.assignedDoctor) {
          finalDoctorName = patient.assignedDoctor;
        }
      } catch (err) {
        console.warn('[PatientProgressComparison] Failed to fetch patient for doctorName:', err.message);
      }
    }

    if (!finalDoctorName) finalDoctorName = 'Attending Physician';

    // Create DB record
    const comparison = await PatientProgressComparison.create({
      organizationId,
      patientId: resolvedPatientId,
      doctorId: req.user.role === 'doctor' || req.user.role === 'Doctor' ? req.user.id : null,
      appointmentId: appointmentId || null,
      title,
      treatmentType,
      treatmentArea,
      // Before Image
      beforeImageStorageProvider: beforeUploadResult.storageProvider,
      beforeImageS3Bucket: beforeUploadResult.s3Bucket,
      beforeImageS3Key: beforeUploadResult.s3Key,
      beforeImageUrl: beforeUploadResult.fileUrl,
      beforeImageFileName: beforeUploadResult.fileName,
      beforeImageMimeType: beforeUploadResult.mimeType,
      beforeImageFileSize: beforeUploadResult.fileSize,
      beforeNote,
      // After Image
      afterImageStorageProvider: afterUploadResult.storageProvider,
      afterImageS3Bucket: afterUploadResult.s3Bucket,
      afterImageS3Key: afterUploadResult.s3Key,
      afterImageUrl: afterUploadResult.fileUrl,
      afterImageFileName: afterUploadResult.fileName,
      afterImageMimeType: afterUploadResult.mimeType,
      afterImageFileSize: afterUploadResult.fileSize,
      afterNote,
      // Common
      resultNote,
      doctorObservation,
      recommendation,
      consentTaken: consentTaken === 'true' || consentTaken === true,
      consentNote,
      doctorName: finalDoctorName,
      uploadedBy,
      uploadedByRole
    });

    res.status(201).json({
      message: 'Progress comparison created successfully',
      comparison
    });
  } catch (error) {
    console.error('[PatientProgressComparisonController] Create failed:', error);
    res.status(500).json({ message: 'Failed to create progress comparison', error: error.message });
  }
};

/**
 * List all progress comparisons for a patient
 */
export const getPatientComparisons = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.user.organizationId?._id || req.user.organizationId;

    const resolvedPatientId = await resolvePatientId(patientId, organizationId);
    if (!resolvedPatientId) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const comparisons = await PatientProgressComparison.find({
      organizationId,
      patientId: resolvedPatientId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    // Fetch patient details once to get assigned doctor fallback
    const Patient = mongoose.model('Patient');
    const patient = await Patient.findById(resolvedPatientId);
    const patientAssignedDoctor = patient?.assignedDoctor || 'Attending Physician';

    const comparisonsWithUrls = await Promise.all(comparisons.map(async (comp) => {
      try {
        const beforeSignedUrl = await getSignedDownloadUrl({
          key: comp.beforeImageS3Key,
          expiresInSeconds: 3600
        });
        const afterSignedUrl = await getSignedDownloadUrl({
          key: comp.afterImageS3Key,
          expiresInSeconds: 3600
        });
        
        return {
          ...comp.toObject(),
          beforeSignedUrl,
          afterSignedUrl,
          doctorName: comp.doctorName || patientAssignedDoctor
        };
      } catch (err) {
        console.warn(`Could not generate signed URLs for comparison ${comp._id}:`, err.message);
        return {
          ...comp.toObject(),
          doctorName: comp.doctorName || patientAssignedDoctor
        };
      }
    }));

    res.status(200).json(comparisonsWithUrls);
  } catch (error) {
    console.error('[PatientProgressComparisonController] List failed:', error);
    res.status(500).json({ message: 'Failed to fetch progress comparisons', error: error.message });
  }
};

/**
 * Get details for one comparison with signed URLs
 */
export const getComparisonDetail = async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const organizationId = req.user.organizationId?._id || req.user.organizationId;

    const comp = await PatientProgressComparison.findOne({
      _id: comparisonId,
      organizationId,
      isDeleted: false
    });

    if (!comp) {
      return res.status(404).json({ message: 'Comparison case not found' });
    }

    const beforeSignedUrl = await getSignedDownloadUrl({
      key: comp.beforeImageS3Key,
      expiresInSeconds: 3600
    });
    const afterSignedUrl = await getSignedDownloadUrl({
      key: comp.afterImageS3Key,
      expiresInSeconds: 3600
    });

    // Get patient for doctor name fallback
    const Patient = mongoose.model('Patient');
    const patient = await Patient.findById(comp.patientId);
    const patientAssignedDoctor = patient?.assignedDoctor || 'Attending Physician';

    res.status(200).json({
      ...comp.toObject(),
      beforeSignedUrl,
      afterSignedUrl,
      doctorName: comp.doctorName || patientAssignedDoctor
    });
  } catch (error) {
    console.error('[PatientProgressComparisonController] Detail failed:', error);
    res.status(500).json({ message: 'Failed to fetch comparison detail', error: error.message });
  }
};

/**
 * Get only signed URLs for a comparison
 */
export const getComparisonSignedUrls = async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const organizationId = req.user.organizationId?._id || req.user.organizationId;

    const comp = await PatientProgressComparison.findOne({
      _id: comparisonId,
      organizationId,
      isDeleted: false
    });

    if (!comp) {
      return res.status(404).json({ message: 'Comparison case not found' });
    }

    const beforeSignedUrl = await getSignedDownloadUrl({
      key: comp.beforeImageS3Key,
      expiresInSeconds: 3600
    });
    const afterSignedUrl = await getSignedDownloadUrl({
      key: comp.afterImageS3Key,
      expiresInSeconds: 3600
    });

    res.status(200).json({
      beforeSignedUrl,
      afterSignedUrl
    });
  } catch (error) {
    console.error('[PatientProgressComparisonController] Signed URLs failed:', error);
    res.status(500).json({ message: 'Failed to generate signed URLs', error: error.message });
  }
};

/**
 * Update comparison metadata
 */
export const updateComparison = async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const organizationId = req.user.organizationId?._id || req.user.organizationId;
    const updateData = req.body;

    const allowedFields = [
      'title',
      'treatmentType',
      'treatmentArea',
      'beforeNote',
      'afterNote',
      'resultNote',
      'doctorObservation',
      'recommendation',
      'consentTaken',
      'consentNote'
    ];

    const filteredUpdate = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdate[field] = updateData[field];
      }
    });

    const comp = await PatientProgressComparison.findOneAndUpdate(
      { _id: comparisonId, organizationId, isDeleted: false },
      { $set: filteredUpdate },
      { new: true }
    );

    if (!comp) {
      return res.status(404).json({ message: 'Comparison case not found' });
    }

    res.status(200).json({
      message: 'Comparison updated successfully',
      comparison: comp
    });
  } catch (error) {
    console.error('[PatientProgressComparisonController] Update failed:', error);
    res.status(500).json({ message: 'Failed to update comparison', error: error.message });
  }
};

/**
 * Replace images in a comparison
 */
export const replaceComparisonImages = async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const organizationId = req.user.organizationId?._id || req.user.organizationId;
    const { patientId } = req.body; // Needed for S3 path

    if (!req.files || (!req.files.beforeImage && !req.files.afterImage)) {
      return res.status(400).json({ message: 'No images provided for replacement' });
    }

    const comp = await PatientProgressComparison.findOne({
      _id: comparisonId,
      organizationId,
      isDeleted: false
    });

    if (!comp) {
      return res.status(404).json({ message: 'Comparison case not found' });
    }

    const updateFields = {};

    if (req.files.beforeImage) {
      const beforeFile = req.files.beforeImage[0];
      const beforeUploadResult = await uploadToS3({
        file: beforeFile,
        folderType: `patients/${comp.patientId}/progress-comparisons`,
        organizationId: organizationId,
        metadata: { patientId: String(comp.patientId), type: 'before' }
      });
      
      updateFields.beforeImageS3Bucket = beforeUploadResult.s3Bucket;
      updateFields.beforeImageS3Key = beforeUploadResult.s3Key;
      updateFields.beforeImageUrl = beforeUploadResult.fileUrl;
      updateFields.beforeImageFileName = beforeUploadResult.fileName;
      updateFields.beforeImageMimeType = beforeUploadResult.mimeType;
      updateFields.beforeImageFileSize = beforeUploadResult.fileSize;
    }

    if (req.files.afterImage) {
      const afterFile = req.files.afterImage[0];
      const afterUploadResult = await uploadToS3({
        file: afterFile,
        folderType: `patients/${comp.patientId}/progress-comparisons`,
        organizationId: organizationId,
        metadata: { patientId: String(comp.patientId), type: 'after' }
      });
      
      updateFields.afterImageS3Bucket = afterUploadResult.s3Bucket;
      updateFields.afterImageS3Key = afterUploadResult.s3Key;
      updateFields.afterImageUrl = afterUploadResult.fileUrl;
      updateFields.afterImageFileName = afterUploadResult.fileName;
      updateFields.afterImageMimeType = afterUploadResult.mimeType;
      updateFields.afterImageFileSize = afterUploadResult.fileSize;
    }

    const updatedComp = await PatientProgressComparison.findByIdAndUpdate(
      comparisonId,
      { $set: updateFields },
      { new: true }
    );

    res.status(200).json({
      message: 'Images updated successfully',
      comparison: updatedComp
    });
  } catch (error) {
    console.error('[PatientProgressComparisonController] Image replacement failed:', error);
    res.status(500).json({ message: 'Failed to replace comparison images', error: error.message });
  }
};

/**
 * Soft delete a comparison
 */
export const deleteComparison = async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const organizationId = req.user.organizationId?._id || req.user.organizationId;

    const comp = await PatientProgressComparison.findOneAndUpdate(
      { _id: comparisonId, organizationId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!comp) {
      return res.status(404).json({ message: 'Comparison case not found' });
    }

    res.status(200).json({ message: 'Comparison deleted successfully' });
  } catch (error) {
    console.error('[PatientProgressComparisonController] Delete failed:', error);
    res.status(500).json({ message: 'Failed to delete comparison', error: error.message });
  }
};

/**
 * Generate a PDF report for a clinical comparison case
 */
export const generateComparisonPdf = async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const organizationId = req.user.organizationId?._id || req.user.organizationId;

    const comp = await PatientProgressComparison.findById(comparisonId);
    if (!comp) return res.status(404).json({ message: 'Comparison not found' });

    // Fetch patient and organization info
    const Patient = mongoose.model('Patient');
    const [patient, org] = await Promise.all([
      Patient.findById(comp.patientId),
      Organization.findById(organizationId)
    ]);

    // Get signed URLs for images
    const [beforeUrl, afterUrl] = await Promise.all([
      getSignedDownloadUrl({ key: comp.beforeImageS3Key, expiresInSeconds: 600 }),
      getSignedDownloadUrl({ key: comp.afterImageS3Key, expiresInSeconds: 600 })
    ]);

    // Helper to get image as base64
    const getBase64Image = async (url) => {
      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.error('Base64 error:', err.message);
        return null;
      }
    };

    const [beforeBase64, afterBase64, logoBase64] = await Promise.all([
      getBase64Image(beforeUrl),
      getBase64Image(afterUrl),
      org?.branding?.logo ? getBase64Image(org.branding.logo) : Promise.resolve(null)
    ]);

    // Helper to prevent "MR. MR." duplication
    const formatPatientName = (name) => {
      if (!name) return 'Unknown Patient';
      // If it starts with MR. MR. or similar, remove the extra one
      return name.replace(/^(MR\.|MRS\.|MS\.|DR\.)\s*(MR\.|MRS\.|MS\.|DR\.)/i, '$1');
    };

    const clinicAddress = [
      org?.address?.street,
      org?.address?.city,
      org?.address?.state,
      org?.address?.zipCode || org?.address?.zip
    ].filter(Boolean).join(', ') || 'Address Not Provided';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; color: #1e293b; line-height: 1.4; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 25px; }
          .clinic-info { text-align: right; max-width: 60%; }
          .clinic-name { font-size: 22px; font-weight: 900; color: #4338ca; margin: 0; text-transform: uppercase; }
          .clinic-detail { font-size: 9px; color: #64748b; margin: 2px 0; font-weight: 600; text-transform: uppercase; }
          .report-title { font-size: 26px; font-weight: 900; margin-bottom: 30px; text-align: center; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
          .metadata-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; }
          .meta-item { display: flex; flex-direction: column; }
          .label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .value { font-size: 15px; font-weight: 700; color: #1e293b; }
          .comparison-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .image-container { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          .image-tag { padding: 6px 12px; font-size: 10px; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: 1px; }
          .before-tag { background: #f59e0b; }
          .after-tag { background: #10b981; }
          img.case-image { width: 100%; height: 280px; object-fit: cover; display: block; }
          .image-note { padding: 12px; font-size: 11px; font-style: italic; color: #64748b; background: #fafafa; border-top: 1px solid #f1f5f9; }
          .outcome-box { background: #eef2ff; padding: 25px; border-radius: 12px; border: 1px solid #e0e7ff; position: relative; }
          .outcome-box::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #4338ca; border-radius: 12px 0 0 12px; }
          .outcome-title { font-size: 10px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: block; }
          .outcome-text { font-size: 14px; color: #312e81; line-height: 1.6; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-box">
            ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; object-fit: contain;" />` : ''}
          </div>
          <div class="clinic-info">
            <p class="clinic-name">${org?.name || 'Clinic Name'}</p>
            <p class="clinic-detail">${clinicAddress}</p>
            <p class="clinic-detail">Email: ${org?.email || ''} | Tel: ${org?.phone || ''}</p>
          </div>
        </div>

        <h1 class="report-title">Clinical Treatment Report</h1>

        <div class="metadata-grid">
          <div class="meta-item">
            <p class="label">Patient Name</p>
            <p class="value">${formatPatientName(patient?.fullName || `${patient?.firstName} ${patient?.lastName || ''}`.trim())}</p>
          </div>
          <div class="meta-item">
            <p class="label">Treatment Case</p>
            <p class="value">${comp.title}</p>
          </div>
          <div class="meta-item">
            <p class="label">Attending Clinician</p>
            <p class="value">${comp.doctorName || patient?.assignedDoctor || 'Staff Physician'}</p>
          </div>
          <div class="meta-item">
            <p class="label">Documentation Date</p>
            <p class="value">${new Date(comp.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div class="comparison-grid">
          <div class="image-container">
            <div class="image-tag before-tag">Baseline / Before</div>
            <img class="case-image" src="${beforeBase64}" />
            <div class="image-note">"${comp.beforeNote || 'Initial documentation'}"</div>
          </div>
          <div class="image-container">
            <div class="image-tag after-tag">Progress / After</div>
            <img class="case-image" src="${afterBase64}" />
            <div class="image-note">"${comp.afterNote || 'Post-treatment result'}"</div>
          </div>
        </div>

        <div class="outcome-box">
          <span class="outcome-title">Clinical Observations & Outcome</span>
          <p class="outcome-text">${comp.resultNote || 'Patient is showing positive response to treatment. Continued monitoring advised.'}</p>
        </div>

        <div class="footer">
          Digitally Signed Clinical Record • Generated via Oviaan Systems • ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await page.setContent(htmlContent, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      scale: 0.95,
      preferCSSPageSize: true
    });
    await browser.close();

    const fileName = `clinical_report_${comp._id}.pdf`;
    const s3Result = await uploadToS3({
      buffer: pdfBuffer,
      originalName: fileName,
      mimeType: 'application/pdf',
      folderType: 'reports',
      organizationId
    });

    res.status(200).json({ 
      success: true, 
      url: s3Result.signedUrl || s3Result.fileUrl 
    });

  } catch (error) {
    console.error('[PatientProgressComparisonController] PDF Generation failed:', error);
    res.status(500).json({ message: 'Failed to generate clinical PDF', error: error.message });
  }
};
