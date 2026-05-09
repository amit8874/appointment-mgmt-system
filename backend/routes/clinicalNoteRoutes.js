import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { 
  createNote, 
  listNotes, 
  getNote, 
  updateNote, 
  deleteNote 
} from '../controllers/clinicalNoteController.js';

const router = express.Router();

// All clinical notes require authentication and tenant context
router.use(authenticateToken);
router.use(requireTenant);

/**
 * @route   POST /api/patients/:patientId/clinical-notes
 * @desc    Create a clinical note for a patient
 */
router.post('/:patientId/clinical-notes', createNote);

/**
 * @route   GET /api/patients/:patientId/clinical-notes
 * @desc    List all clinical notes for a patient
 */
router.get('/:patientId/clinical-notes', listNotes);

/**
 * @route   GET /api/patients/:patientId/clinical-notes/:noteId
 * @desc    Get single note details
 */
router.get('/:patientId/clinical-notes/:noteId', getNote);

/**
 * @route   PUT /api/patients/:patientId/clinical-notes/:noteId
 * @desc    Update a clinical note
 */
router.put('/:patientId/clinical-notes/:noteId', updateNote);

/**
 * @route   DELETE /api/patients/:patientId/clinical-notes/:noteId
 * @desc    Soft delete a clinical note
 */
router.delete('/:patientId/clinical-notes/:noteId', deleteNote);

export default router;
