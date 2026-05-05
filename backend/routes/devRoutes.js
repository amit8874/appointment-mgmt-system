import express from 'express';
import multer from 'multer';
import { uploadToS3 } from '../utils/uploadToS3.js';

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

export default router;
