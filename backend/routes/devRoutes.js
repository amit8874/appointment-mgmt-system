import express from 'express';
import multer from 'multer';
import { uploadToS3 } from '../utils/uploadToS3.js';
import Billing from '../models/Billing.js';
import Organization from '../models/Organization.js';
import InvoiceTemplate from '../models/InvoiceTemplate.js';
import { generateInvoicePDF } from '../services/pdfService.js';

const router = express.Router();

// Memory storage for Drive upload tests
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: (parseFloat(process.env.FILE_UPLOAD_MAX_MB) || 10) * 1024 * 1024 }
});


router.post('/test-s3-upload', upload.single('file'), async (req, res) => {
  // Protect this route for dev only or require admin auth
  // TODO: Add proper admin authentication middleware if deploying to production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Forbidden. This route is not accessible in production.' });
  }

  try {
    const { folderType, organizationId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file provided for S3 upload test.' });
    }

    const result = await uploadToS3({
      file,
      folderType: folderType || 'default',
      organizationId: organizationId || 'test_org',
      metadata: { source: 'dev_test_s3_upload' }
    });

    res.status(200).json({
      success: true,
      message: 'Upload to AWS S3 successful',
      data: result
    });
  } catch (error) {
    console.error('[Dev Test Route Error] Upload to S3 failed:', error);
    res.status(500).json({
      success: false,
      message: 'S3 upload test failed',
      error: error.message
    });
  }
});

router.post('/test-generate-invoice-s3/:billId', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  try {
    const { billId } = req.params;
    const bill = await Billing.findById(billId);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    
    const org = await Organization.findById(bill.organizationId);
    const template = await InvoiceTemplate.findOne({ organizationId: bill.organizationId, isDefault: true }) || 
                     await InvoiceTemplate.findOne({ organizationId: bill.organizationId });
                     
    console.log(`[Dev] Generating PDF for bill ${billId}...`);
    const pdfBuffer = await generateInvoicePDF(bill, org, template);
    
    console.log(`[Dev] Uploading PDF to AWS S3...`);
    const s3Result = await uploadToS3({
      buffer: pdfBuffer,
      originalName: `Invoice-${bill.billId}.pdf`,
      mimeType: 'application/pdf',
      folderType: 'invoices',
      organizationId: bill.organizationId,
    });
    
    bill.storageProvider = s3Result.storageProvider;
    bill.invoiceS3Bucket = s3Result.s3Bucket;
    bill.invoiceS3Key = s3Result.s3Key;
    bill.invoiceUrl = s3Result.fileUrl;
    bill.invoiceFileName = s3Result.fileName;
    bill.invoiceMimeType = s3Result.mimeType;
    await bill.save();
    
    res.status(200).json({
      success: true,
      message: 'Generated and uploaded to AWS S3 successfully',
      data: s3Result
    });
  } catch (error) {
    console.error('[Dev Test Route Error] Invoice generation/upload failed:', error);
    res.status(500).json({
      success: false,
      message: 'Invoice generation/upload failed',
      error: error.message
    });
  }
});

export default router;
