import express from 'express';
import { saveNote, listNotes, updateNote, deleteNote, incrementUsage } from '../controllers/progressNoteController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/save', saveNote);
router.get('/list/:organizationId', listNotes);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.post('/:id/usage', incrementUsage);

export default router;
