import express from 'express';
import { translateAdvice, improveAdvice } from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();

// Translation endpoint
router.post('/translate-advice', authenticateToken, requireTenant, translateAdvice);

// Improvement endpoint
router.post('/improve-advice', authenticateToken, requireTenant, improveAdvice);

export default router;
