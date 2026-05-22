import express from 'express';
import multer from 'multer';
import { 
  getSettings, 
  updateSettings,
  uploadTemplate,
  deleteTemplate
} from '../controllers/clinicPrescriptionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage since we process with sharp before S3
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// All routes are protected
router.use(authenticateToken);

router.get('/', getSettings);
router.put('/settings', updateSettings);
router.post('/upload', upload.single('image'), uploadTemplate);
router.delete('/', deleteTemplate);

export default router;
