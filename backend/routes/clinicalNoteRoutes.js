import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { 
  createNote, 
  listNotes, 
  getNote, 
  updateNote, 
  deleteNote,
  getAllClinicNotes,
  createStandaloneNote
} from '../controllers/clinicalNoteController.js';

const router = express.Router();

// All clinical notes require authentication and tenant context
router.use(authenticateToken);
router.use(requireTenant);

/**
 * @route   GET /api/clinical-notes OR /api/patients/all-notes
 * @desc    List all clinical & appointment notes across the organization (supports timeframe=today / all)
 */
router.get('/', getAllClinicNotes);
router.get('/all-notes', getAllClinicNotes);

/**
 * @route   POST /api/clinical-notes/create OR /api/patients/notes/create
 * @desc    Create a standalone or appointment note
 */
router.post('/create', createStandaloneNote);
router.post('/notes/create', createStandaloneNote);

/**
 * @route   GET /api/clinical-notes/notes/:noteId OR /api/clinical-notes/:noteId
 * @desc    Get note details
 */
router.get('/notes/:noteId', getNote);

/**
 * @route   PUT /api/clinical-notes/notes/:noteId
 * @desc    Update a clinical note
 */
router.put('/notes/:noteId', updateNote);

/**
 * @route   DELETE /api/clinical-notes/notes/:noteId
 * @desc    Delete a clinical note
 */
router.delete('/notes/:noteId', deleteNote);

/**
 * @route   POST /api/patients/:patientId/clinical-notes
 * @desc    Create a clinical note for a specific patient
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

// Fallback handlers for /:noteId directly when mounted at /api/clinical-notes
router.get('/:noteId', getNote);
router.put('/:noteId', updateNote);
router.delete('/:noteId', deleteNote);

export default router;
