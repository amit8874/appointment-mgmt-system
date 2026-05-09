import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  uploadProgressImage,
  getPatientProgressImages,
  getProgressImageSignedUrl,
  updateProgressImage,
  deleteProgressImage
} from '../controllers/patientProgressImageController.js';

const router = express.Router();

// Multer configuration for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseFloat(process.env.FILE_UPLOAD_MAX_MB) || 10) * 1024 * 1024
  }
});

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(requireTenant);

/**
 * @route POST /api/patients/:patientId/progress-images
 * @desc Upload a progress image for a patient
 */
router.post('/:patientId/progress-images', upload.single('image'), uploadProgressImage);

/**
 * @route GET /api/patients/:patientId/progress-images
 * @desc List all progress images for a patient
 */
router.get('/:patientId/progress-images', getPatientProgressImages);

/**
 * @route GET /api/patients/:patientId/progress-images/:imageId/signed-url
 * @desc Get a temporary signed URL for an image
 */
router.get('/:patientId/progress-images/:imageId/signed-url', getProgressImageSignedUrl);

/**
 * @route PUT /api/patients/:patientId/progress-images/:imageId
 * @desc Update metadata for a progress image
 */
router.put('/:patientId/progress-images/:imageId', updateProgressImage);

/**
 * @route DELETE /api/patients/:patientId/progress-images/:imageId
 * @desc Soft delete a progress image
 */
router.delete('/:patientId/progress-images/:imageId', deleteProgressImage);

export default router;
