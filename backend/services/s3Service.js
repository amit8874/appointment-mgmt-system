import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

// Initialize the S3 Client lazily to ensure dotenv is loaded first
let s3Client = null;

const getS3Client = () => {
  if (!s3Client) {
    console.log(`[AWS S3 DEBUG] AWS_REGION loaded: ${!!process.env.AWS_REGION}`);
    console.log(`[AWS S3 DEBUG] AWS_S3_BUCKET_NAME loaded: ${!!process.env.AWS_S3_BUCKET_NAME}`);
    console.log(`[AWS S3 DEBUG] AWS_ACCESS_KEY_ID loaded: ${!!process.env.AWS_ACCESS_KEY_ID}`);
    console.log(`[AWS S3 DEBUG] AWS_SECRET_ACCESS_KEY loaded: ${!!process.env.AWS_SECRET_ACCESS_KEY}`);

    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }
  return s3Client;
};

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
    await getS3Client().send(command);
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
    await getS3Client().send(command);
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
    await getS3Client().send(command);
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
  expiresInSeconds = 600,
  responseContentDisposition
}) => {
  const bucketName = getBucketName();
  if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME is not configured');

  const commandArgs = {
    Bucket: bucketName,
    Key: key
  };
  
  if (responseContentDisposition) {
    commandArgs.ResponseContentDisposition = responseContentDisposition;
  }

  const command = new GetObjectCommand(commandArgs);

  try {
    const signedUrl = await getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
    return signedUrl;
  } catch (error) {
    console.error(`[AWS S3] Error generating signed URL for ${key}:`, error.message);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Resolves an S3 template URL to a fresh signed URL.
 * If the URL points to S3, we generate a new signed URL.
 */
export const resolveS3UrlIfNeeded = async (urlStr, expiresInSeconds = 86400) => {
  if (!urlStr || typeof urlStr !== 'string') return urlStr;

  try {
    if (urlStr.startsWith('http')) {
      const url = new URL(urlStr);
      let key = null;

      const baseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
      if (baseUrl && urlStr.startsWith(baseUrl)) {
        key = urlStr.replace(baseUrl, '').replace(/^\//, '');
      } else if (url.hostname.endsWith('.amazonaws.com')) {
        let pathname = url.pathname;
        if (pathname.startsWith('/')) {
          pathname = pathname.substring(1);
        }
        key = pathname;
      }

      if (key) {
        // Strip query params
        key = key.split('?')[0];

        // Generate a new signed URL
        const freshUrl = await getSignedDownloadUrl({
          key,
          expiresInSeconds
        });
        return freshUrl;
      }
    }
  } catch (err) {
    console.warn("[resolveS3UrlIfNeeded] Failed to parse/resolve S3 URL:", err.message);
  }
  return urlStr;
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
