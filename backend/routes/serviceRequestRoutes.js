import express from 'express';
import { getPatientRequests, createRequest, updateRequestStatus, deleteRequest } from '../controllers/serviceRequestController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get requests by patient ID
router.get('/patient/:patientId', authenticateToken, getPatientRequests);

// Create a new request
router.post('/', authenticateToken, createRequest);

// Update a request status
router.patch('/:id/status', authenticateToken, updateRequestStatus);

// Delete a request
router.delete('/:id', authenticateToken, deleteRequest);

export default router;
