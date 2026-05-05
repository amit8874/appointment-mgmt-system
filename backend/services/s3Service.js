import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

// Initialize the S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const getBucketName = () => process.env.AWS_S3_BUCKET_NAME;

/**
 * Uploads a Buffer to AWS S3.
 */
export const uploadBufferToS3 = async ({
  buffer,
  key,
  mimeType,
  metadata = {}
}) => {
  const bucketName = getBucketName();
  if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME is not configured');
  if (!buffer) throw new Error('Buffer is required for upload');

  console.log(`[AWS S3] Uploading buffer for key: ${key}`);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: metadata
  });

  try {
    await s3Client.send(command);
    console.log(`[AWS S3] Buffer uploaded successfully. Key: ${key}`);
    return {
      key,
      bucket: bucketName,
      mimeType,
      fileSize: buffer.length
    };
  } catch (error) {
    console.error(`[AWS S3] Error uploading buffer for ${key}:`, error.message);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Uploads a local file from disk to AWS S3.
 */
export const uploadLocalFileToS3 = async ({
  filePath,
  key,
  mimeType,
  metadata = {}
}) => {
  const bucketName = getBucketName();
  if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME is not configured');
  if (!fs.existsSync(filePath)) throw new Error(`File not found at path: ${filePath}`);

  console.log(`[AWS S3] Uploading local file to key: ${key}`);

  const fileStream = fs.createReadStream(filePath);
  const stats = fs.statSync(filePath);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: mimeType,
    Metadata: metadata
  });

  try {
    await s3Client.send(command);
    console.log(`[AWS S3] Local file uploaded successfully. Key: ${key}`);
    return {
      key,
      bucket: bucketName,
      mimeType,
      fileSize: stats.size
    };
  } catch (error) {
    console.error(`[AWS S3] Error uploading local file for ${key}:`, error.message);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Deletes a file from AWS S3.
 */
export const deleteFileFromS3 = async (key) => {
  const bucketName = getBucketName();
  if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME is not configured');

  console.log(`[AWS S3] Deleting file key: ${key}`);

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  try {
    await s3Client.send(command);
    console.log(`[AWS S3] File ${key} deleted successfully.`);
    return true;
  } catch (error) {
    console.error(`[AWS S3] Error deleting file ${key}:`, error.message);
    throw new Error(`S3 delete failed: ${error.message}`);
  }
};

/**
 * Generates a signed URL for a private file in S3.
 */
export const getSignedDownloadUrl = async ({
  key,
  expiresInSeconds = 600
}) => {
  const bucketName = getBucketName();
  if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME is not configured');

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    return signedUrl;
  } catch (error) {
    console.error(`[AWS S3] Error generating signed URL for ${key}:`, error.message);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Generates the public URL (if the bucket/object has public read access or a CDN is used).
 */
export const getPublicUrl = (key) => {
  const baseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (baseUrl) {
    return `${baseUrl}/${key}`;
  }
  const bucketName = getBucketName();
  const region = process.env.AWS_REGION || 'ap-south-1';
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};
