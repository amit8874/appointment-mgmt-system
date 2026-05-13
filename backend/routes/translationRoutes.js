import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { translateText, translatePrescription } from '../controllers/translationController.js';

const router = express.Router();

// Translation is a utility service requiring auth
router.use(authenticateToken);

/**
 * @route POST /api/translate
 * @desc Translate clinical text
 */
router.post('/', translateText);

/**
 * @route POST /api/translate/prescription-structured
 * @desc Translate specific prescription fields
 */
router.post('/prescription-structured', translatePrescription);

export default router;
