import express from 'express';
import { sendPrescriptionMail } from '../controllers/emailController.js';

const router = express.Router();

// POST /api/email/send-prescription
router.post('/send-prescription', sendPrescriptionMail);

export default router;
