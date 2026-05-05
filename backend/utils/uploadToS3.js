import { uploadBufferToS3, uploadLocalFileToS3, getPublicUrl, getSignedDownloadUrl } from '../services/s3Service.js';
import fs from 'fs';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

/**
 * Universal wrapper for uploading files to AWS S3.
 */
export const uploadToS3 = async ({
  file, // Multer file object
  buffer, // Raw buffer
  localPath, // Local file path
  originalName,
  mimeType,
  folderType = 'default',
  organizationId = 'global',
  metadata = {}
}) => {
  try {
    // 1. Resolve inputs
    let finalBuffer = buffer || (file && file.buffer);
    let finalLocalPath = localPath || (file && file.path);
    let finalOriginalName = originalName || (file && file.originalname) || 'unknown_file';
    let finalMimeType = mimeType || (file && file.mimetype);

    if (!finalBuffer && !finalLocalPath) {
      throw new Error('Either a buffer, localPath, or multer file object must be provided.');
    }

    // 2. Validate MIME Type
    if (!finalMimeType || !ALLOWED_MIME_TYPES.includes(finalMimeType)) {
      throw new Error(`Invalid file type: ${finalMimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // 3. Validate File Size
    const maxMb = parseFloat(process.env.FILE_UPLOAD_MAX_MB) || 10;
    const maxBytes = maxMb * 1024 * 1024;
    
    let fileSize = 0;
    if (finalBuffer) {
      fileSize = finalBuffer.length;
    } else if (finalLocalPath && fs.existsSync(finalLocalPath)) {
      const stats = fs.statSync(finalLocalPath);
      fileSize = stats.size;
    }

    if (fileSize > maxBytes) {
      throw new Error(`File size exceeds maximum allowed limit of ${maxMb}MB.`);
    }

    // 4. Generate S3 Key (Path)
    // Format: organizations/{organizationId}/{folderType}/{timestamp}_{originalName}
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const safeOriginalName = finalOriginalName.replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Remove special characters
    const s3Key = `organizations/${organizationId}/${folderType}/${timestamp}-${safeOriginalName}`;

    // 5. Upload
    let uploadResult;
    const s3Metadata = {
      organizationId: String(organizationId),
      folderType: String(folderType),
      ...metadata
    };

    if (finalBuffer) {
      uploadResult = await uploadBufferToS3({
        buffer: finalBuffer,
        key: s3Key,
        mimeType: finalMimeType,
        metadata: s3Metadata
      });
    } else {
      uploadResult = await uploadLocalFileToS3({
        filePath: finalLocalPath,
        key: s3Key,
        mimeType: finalMimeType,
        metadata: s3Metadata
      });
    }

    // 6. Generate URLs
    const publicUrl = getPublicUrl(s3Key);
    // Since bucket is private by default, generate a temporary signed URL for immediate use if needed.
    // In production, the client should request a signed URL when they need to view the file.
    let signedUrl = null;
    try {
      signedUrl = await getSignedDownloadUrl({ key: s3Key, expiresInSeconds: 3600 });
    } catch (err) {
      console.warn(`[UploadToS3] Could not generate immediate signed URL for ${s3Key}:`, err.message);
    }

    // 7. Return Normalized Object
    return {
      storageProvider: 'aws_s3',
      s3Bucket: uploadResult.bucket,
      s3Key: uploadResult.key,
      fileUrl: publicUrl, // Base URL, may be inaccessible if bucket is strictly private
      signedUrl: signedUrl, // 1-hour signed URL for immediate access
      fileName: safeOriginalName,
      mimeType: uploadResult.mimeType,
      fileSize: uploadResult.fileSize,
      folderType
    };
  } catch (error) {
    console.error(`[UploadToS3] Failed to upload ${originalName}:`, error.message);
    throw error;
  }
};
