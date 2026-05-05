import express from 'express';
import { getInvestigationMaster, searchInvestigations, addInvestigationMaster } from '../controllers/investigationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/master', authenticateToken, getInvestigationMaster);
router.get('/search', authenticateToken, searchInvestigations);
router.post('/master', authenticateToken, addInvestigationMaster);

export default router;
