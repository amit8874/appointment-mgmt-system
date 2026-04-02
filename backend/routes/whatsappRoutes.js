import express from 'express';
import { sendWhatsApp } from '../controllers/whatsappController.js';

const router = express.Router();

/**
 * Endpoint to send WhatsApp message.
 * POST /api/whatsapp/send-whatsapp
 */
router.post('/send-whatsapp', sendWhatsApp);

export default router;
