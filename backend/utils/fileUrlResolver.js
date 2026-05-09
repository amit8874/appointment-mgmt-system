import { getSignedDownloadUrl } from '../services/s3Service.js';

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
