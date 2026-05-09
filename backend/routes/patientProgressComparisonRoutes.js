import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  createComparison,
  getPatientComparisons,
  getComparisonDetail,
  getComparisonSignedUrls,
  updateComparison,
  replaceComparisonImages,
  deleteComparison,
  generateComparisonPdf
} from '../controllers/patientProgressComparisonController.js';

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
 * @route POST /api/patients/:patientId/progress-comparisons
 * @desc Create a progress comparison case
 */
router.post('/:patientId/progress-comparisons', upload.fields([
  { name: 'beforeImage', maxCount: 1 },
  { name: 'afterImage', maxCount: 1 }
]), createComparison);

/**
 * @route GET /api/patients/:patientId/progress-comparisons
 * @desc List all comparison cases for a patient
 */
router.get('/:patientId/progress-comparisons', getPatientComparisons);

/**
 * @route GET /api/patients/:patientId/progress-comparisons/:comparisonId
 * @desc Get comparison detail with signed URLs
 */
router.get('/:patientId/progress-comparisons/:comparisonId', getComparisonDetail);

/**
 * @route GET /api/patients/:patientId/progress-comparisons/:comparisonId/signed-urls
 * @desc Get only signed URLs for a comparison
 */
router.get('/:patientId/progress-comparisons/:comparisonId/signed-urls', getComparisonSignedUrls);

/**
 * @route PUT /api/patients/:patientId/progress-comparisons/:comparisonId
 * @desc Update metadata for a comparison
 */
router.put('/:patientId/progress-comparisons/:comparisonId', updateComparison);

/**
 * @route PATCH /api/patients/:patientId/progress-comparisons/:comparisonId/images
 * @desc Replace before and/or after image
 */
router.patch('/:patientId/progress-comparisons/:comparisonId/images', upload.fields([
  { name: 'beforeImage', maxCount: 1 },
  { name: 'afterImage', maxCount: 1 }
]), replaceComparisonImages);

/**
 * @route GET /api/patients/:patientId/progress-comparisons/:comparisonId/generate-pdf
 * @desc Generate and download clinical report PDF
 */
router.get('/:patientId/progress-comparisons/:comparisonId/generate-pdf', generateComparisonPdf);

/**
 * @route DELETE /api/patients/:patientId/progress-comparisons/:comparisonId
 * @desc Soft delete a comparison
 */
router.delete('/:patientId/progress-comparisons/:comparisonId', deleteComparison);

export default router;
