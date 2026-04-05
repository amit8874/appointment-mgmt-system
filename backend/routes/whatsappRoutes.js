import express from 'express';
import { sendWhatsApp, improveWhatsAppMessage } from '../controllers/whatsappController.js';

const router = express.Router();

/**
 * Endpoint to send WhatsApp message.
 * POST /api/whatsapp/send-whatsapp
 */
router.post('/send-whatsapp', sendWhatsApp);

/**
 * Endpoint to refine WhatsApp message with AI.
 * POST /api/whatsapp/improve-message
 */
router.post('/improve-message', improveWhatsAppMessage);

export default router;
