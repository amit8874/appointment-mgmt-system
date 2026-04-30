import express from 'express';
import { sendWhatsApp, improveWhatsAppMessage, sendPrescriptionWhatsApp } from '../controllers/whatsappController.js';

const router = express.Router();

/**
 * Endpoint to send WhatsApp message.
 * POST /api/whatsapp/send-whatsapp
 */
router.post('/send-whatsapp', sendWhatsApp);
router.post('/improve-message', improveWhatsAppMessage);
router.post('/send-prescription', sendPrescriptionWhatsApp);

export default router;
