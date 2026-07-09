import { getSignedDownloadUrl, resolveS3UrlIfNeeded } from '../services/s3Service.js';

/**
 * Resolves the correct, accessible URL for a file record.
 * Handles backward compatibility with Cloudinary and local uploads,
 * while generating secure signed URLs for AWS S3.
 *
 * @param {object|string} fileRecord - The file document containing S3 metadata, or a string URL.
 * @returns {Promise<string|null>} - The resolved accessible URL.
 */
export const resolveFileUrl = async (fileRecord) => {
  if (!fileRecord) return null;

  // If it's just a string, we can't generate an S3 URL without the key,
  // but we can return it as-is (e.g., existing cloudinary/local URL).
  if (typeof fileRecord === 'string') {
    return fileRecord;
  }

  const provider = fileRecord.storageProvider;
  // Support both general files and specific invoice fields
  const key = fileRecord.s3Key || fileRecord.invoiceS3Key;
  const url = fileRecord.url || fileRecord.invoiceUrl || fileRecord.fileUrl;

  // 1. AWS S3: Generate temporary signed URL
  if (provider === 'aws_s3' && key) {
    try {
      const signedUrl = await getSignedDownloadUrl({ key, expiresInSeconds: 3600 });
      return signedUrl;
    } catch (error) {
      console.warn(`[FileUrlResolver] Failed to generate S3 signed URL for ${key}:`, error.message);
      // Fallback to public URL if signed URL generation fails
      return url || null;
    }
  }

  // 2. Cloudinary or Local Uploads (Backward Compatibility)
  if (url && (url.includes('cloudinary.com') || url.startsWith('/uploads') || url.startsWith('http'))) {
    return url;
  }

  // 3. Fallback
  return url || null;
};

/**
 * Resolves both the clinic logo and prescription template URLs of an organization.
 * Ensures signed URLs are fresh and do not expire.
 * 
 * @param {object} org - The organization object or document.
 * @returns {Promise<object>} - The organization object with resolved URLs.
 */
export const resolveOrganizationUrls = async (org) => {
  if (!org) return org;
  
  // Convert Mongoose document to plain object to allow modifying fields safely
  const orgObj = typeof org.toObject === 'function' ? org.toObject() : org;
  
  if (orgObj.branding && orgObj.branding.logo) {
    try {
      orgObj.branding.logo = await resolveS3UrlIfNeeded(orgObj.branding.logo);
    } catch (err) {
      console.warn('[resolveOrganizationUrls] Failed to resolve branding logo:', err.message);
    }
  }
  
  if (orgObj.prescriptionTemplate && orgObj.prescriptionTemplate.templateUrl) {
    try {
      orgObj.prescriptionTemplate.templateUrl = await resolveS3UrlIfNeeded(orgObj.prescriptionTemplate.templateUrl);
    } catch (err) {
      console.warn('[resolveOrganizationUrls] Failed to resolve template URL:', err.message);
    }
  }
  
  if (orgObj.clinicImages && Array.isArray(orgObj.clinicImages)) {
    try {
      orgObj.clinicImages = await Promise.all(
        orgObj.clinicImages.map(img => resolveS3UrlIfNeeded(img))
      );
    } catch (err) {
      console.warn('[resolveOrganizationUrls] Failed to resolve clinic images:', err.message);
    }
  }
  
  return orgObj;
};
