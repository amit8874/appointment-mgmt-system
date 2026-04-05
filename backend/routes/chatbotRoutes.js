import express from 'express';
import { chatWithMaya, getClinicCities, searchDoctorsForChat } from '../controllers/chatbotController.js';

const router = express.Router();

// Public endpoint for landing page chatbot
router.post('/chat', chatWithMaya);

// Helper endpoints for interactive booking
router.get('/stats/cities', getClinicCities);
router.get('/search/doctors', searchDoctorsForChat);

export default router;
