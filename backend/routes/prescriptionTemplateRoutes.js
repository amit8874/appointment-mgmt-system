import express from 'express';
import { saveTemplate, listTemplates, getDefaultTemplate, generatePdf, deleteTemplate } from '../controllers/prescriptionTemplateController.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure Multer for memory storage (S3 upload handled in controller)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

const uploadFields = upload.fields([
  { name: 'headerImage', maxCount: 1 },
  { name: 'bodyImage', maxCount: 1 },
  { name: 'footerImage', maxCount: 1 }
]);

router.post('/save', authenticateToken, uploadFields, saveTemplate);
router.get('/list/:organizationId', authenticateToken, listTemplates);
router.get('/default/:organizationId', authenticateToken, getDefaultTemplate);
router.post('/generate-pdf', authenticateToken, generatePdf);
router.delete('/:id', authenticateToken, deleteTemplate);

export default router;
