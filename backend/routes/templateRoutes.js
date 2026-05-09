import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  setDefaultTemplate,
  deleteTemplate,
  seedTemplates
} from '../controllers/templateController.js';
import multer from 'multer';

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

const router = express.Router();

router.use(authenticateToken);
router.use(requireTenant);

// Template Management
router.get('/', getTemplates);
router.post('/', uploadFields, createTemplate);
router.put('/:id', uploadFields, updateTemplate);
router.put('/:id/default', setDefaultTemplate);
router.delete('/:id', deleteTemplate);

// Seed initial templates
router.post('/seed', seedTemplates);

export default router;
