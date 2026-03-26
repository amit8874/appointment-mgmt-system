import express from 'express';
import { chatWithMaya } from '../controllers/chatbotController.js';

const router = express.Router();

// Public endpoint for landing page chatbot
router.post('/chat', chatWithMaya);

export default router;
