import express from 'express';
import { sendWhatsApp, improveWhatsAppMessage, sendPrescriptionWhatsApp, sendPrescriptionPdfWhatsApp } from '../controllers/whatsappController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();

/**
 * Endpoint to send WhatsApp message.
 * POST /api/whatsapp/send-whatsapp
 */
router.post('/send-whatsapp', authenticateToken, requireTenant, sendWhatsApp);
router.post('/improve-message', authenticateToken, improveWhatsAppMessage);
router.post('/send-prescription', authenticateToken, requireTenant, sendPrescriptionWhatsApp);
router.post('/send-prescription-pdf', authenticateToken, requireTenant, sendPrescriptionPdfWhatsApp);

export default router;
