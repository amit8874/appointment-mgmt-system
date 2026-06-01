import PatientProgressImage from '../models/PatientProgressImage.js';
import { uploadToS3 } from '../utils/uploadToS3.js';
import { getSignedDownloadUrl } from '../services/s3Service.js';
import mongoose from 'mongoose';

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
 * Upload a progress image for a patient
 */
export const uploadProgressImage = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      title, 
      category, 
      treatmentArea, 
      treatmentType, 
      notes, 
      consentTaken, 
      consentNote,
      appointmentId 
    } = req.body;

    const organizationId = req.user.organizationId;
    const uploadedBy = req.user.id;
    const uploadedByRole = req.user.role;

    const resolvedPatientId = await resolvePatientId(patientId, organizationId);
    if (!resolvedPatientId) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Upload to S3
    // S3 path: organizations/{organizationId}/patients/{patientId}/progress/{timestamp-fileName}
    const uploadResult = await uploadToS3({
      file: req.file,
      folderType: `patients/${resolvedPatientId}/progress`,
      organizationId: organizationId,
      metadata: {
        patientId: String(resolvedPatientId),
        category: String(category || 'other'),
        uploadedBy: String(uploadedBy)
      }
    });

    // Create DB record
    const progressImage = await PatientProgressImage.create({
      organizationId,
      patientId: resolvedPatientId,
      doctorId: req.user.role === 'Doctor' ? req.user.id : null,
      appointmentId: appointmentId || null,
      title,
      category: category || 'other',
      treatmentArea,
      treatmentType,
      notes,
      storageProvider: uploadResult.storageProvider,
      s3Bucket: uploadResult.s3Bucket,
      s3Key: uploadResult.s3Key,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      mimeType: uploadResult.mimeType,
      fileSize: uploadResult.fileSize,
      consentTaken: consentTaken === 'true' || consentTaken === true,
      consentNote,
      uploadedBy,
      uploadedByRole
    });

    res.status(201).json({
      message: 'Progress image uploaded successfully',
      image: {
        ...progressImage.toObject(),
        signedUrl: uploadResult.signedUrl
      }
    });
  } catch (error) {
    console.error('[PatientProgressImageController] Upload failed:', error);
    res.status(500).json({ message: 'Failed to upload progress image', error: error.message });
  }
};

/**
 * List progress images for a patient
 */
export const getPatientProgressImages = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.user.organizationId;

    const resolvedPatientId = await resolvePatientId(patientId, organizationId);
    if (!resolvedPatientId) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const images = await PatientProgressImage.find({
      organizationId,
      patientId: resolvedPatientId,
      isDeleted: false
    }).sort({ uploadedAt: -1 });

    // For each image, we might want a signed URL. 
    // However, generating many signed URLs in a loop can be slow.
    // Usually, we generate them on the fly or only for the visible ones.
    // But for a gallery, we'll need them.
    
    const imagesWithUrls = await Promise.all(images.map(async (img) => {
      try {
        const signedUrl = await getSignedDownloadUrl({
          key: img.s3Key,
          expiresInSeconds: 3600 // 1 hour
        });
        return {
          ...img.toObject(),
          signedUrl
        };
      } catch (err) {
        console.warn(`Could not generate signed URL for ${img.s3Key}:`, err.message);
        return {
          ...img.toObject(),
          signedUrl: null
        };
      }
    }));

    res.status(200).json(imagesWithUrls);
  } catch (error) {
    console.error('[PatientProgressImageController] List failed:', error);
    res.status(500).json({ message: 'Failed to fetch progress images', error: error.message });
  }
};

/**
 * Get a single signed URL for an image
 */
export const getProgressImageSignedUrl = async (req, res) => {
  try {
    const { imageId } = req.params;
    const organizationId = req.user.organizationId;

    const image = await PatientProgressImage.findOne({
      _id: imageId,
      organizationId,
      isDeleted: false
    });

    if (!image) {
      return res.status(404).json({ message: 'Progress image not found' });
    }

    const signedUrl = await getSignedDownloadUrl({
      key: image.s3Key,
      expiresInSeconds: 3600
    });

    res.status(200).json({ signedUrl });
  } catch (error) {
    console.error('[PatientProgressImageController] Signed URL generation failed:', error);
    res.status(500).json({ message: 'Failed to generate signed URL', error: error.message });
  }
};

/**
 * Update image metadata
 */
export const updateProgressImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const organizationId = req.user.organizationId;
    const updateData = req.body;

    // Filter allowed fields
    const allowedFields = [
      'title', 
      'category', 
      'treatmentArea', 
      'treatmentType', 
      'notes', 
      'consentTaken', 
      'consentNote'
    ];
    
    const filteredUpdate = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdate[field] = updateData[field];
      }
    });

    const image = await PatientProgressImage.findOneAndUpdate(
      { _id: imageId, organizationId, isDeleted: false },
      { $set: filteredUpdate },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({ message: 'Progress image not found' });
    }

    res.status(200).json({
      message: 'Progress image updated successfully',
      image
    });
  } catch (error) {
    console.error('[PatientProgressImageController] Update failed:', error);
    res.status(500).json({ message: 'Failed to update progress image', error: error.message });
  }
};

/**
 * Soft delete an image
 */
export const deleteProgressImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const organizationId = req.user.organizationId;

    const image = await PatientProgressImage.findOneAndUpdate(
      { _id: imageId, organizationId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({ message: 'Progress image not found' });
    }

    res.status(200).json({ message: 'Progress image deleted successfully' });
  } catch (error) {
    console.error('[PatientProgressImageController] Delete failed:', error);
    res.status(500).json({ message: 'Failed to delete progress image', error: error.message });
  }
};
