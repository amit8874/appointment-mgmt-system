import express from 'express';
import { sendWhatsApp, improveWhatsAppMessage, bulkSendWhatsApp } from '../controllers/whatsappController.js';

const router = express.Router();

/**
 * Endpoint to send WhatsApp message.
 * POST /api/whatsapp/send-whatsapp
 */
router.post('/send-whatsapp', sendWhatsApp);
router.post('/improve-message', improveWhatsAppMessage);

/**
 * Endpoint to send bulk WhatsApp messages.
 * POST /api/whatsapp/bulk-send
 */
router.post('/bulk-send', bulkSendWhatsApp);

export default router;
