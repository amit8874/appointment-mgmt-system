import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getConversations,
  getPatientConversation,
  getMessages,
  sendMessage,
  explainWithMaya
} from '../controllers/messageController.js';

const router = express.Router();

// Admin / Receptionist Fetch ALL active clinic chats
router.get('/conversations', authenticateToken, requireTenant, getConversations);

// Patient Fetch their own specific clinic chat
router.get('/patient/:patientId', authenticateToken, getPatientConversation);

// Fetch messages inside a conversation (requires conversationId)
router.get('/:conversationId', authenticateToken, getMessages);

// Send a message (from either Patient or Clinic)
router.post('/', authenticateToken, sendMessage);

// Trigger Maya AI to explain a medical message
router.post('/maya-explain', authenticateToken, explainWithMaya);

export default router;
