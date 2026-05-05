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

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'prescriptionTemplates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `template-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
  }
});

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
