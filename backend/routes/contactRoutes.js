import express from 'express';
import { submitContactForm, getContactMessages, updateMessageStatus, deleteMessage } from '../controllers/contactController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public route to submit contact form
router.post('/', submitContactForm);

// Protected routes for SuperAdmin
router.get('/', authenticateToken, requireSuperAdmin, getContactMessages);
router.patch('/:id/status', authenticateToken, requireSuperAdmin, updateMessageStatus);
router.delete('/:id', authenticateToken, requireSuperAdmin, deleteMessage);

export default router;
