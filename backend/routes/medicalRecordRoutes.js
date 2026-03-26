import express from 'express';
import { getPatientRecords, createRecord, updateRecord, deleteRecord } from '../controllers/medicalRecordController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get records by patient ID
router.get('/patient/:patientId', authenticateToken, getPatientRecords);

// Create a new record
router.post('/', authenticateToken, createRecord);

// Update a record
router.put('/:id', authenticateToken, updateRecord);

// Delete a record
router.delete('/:id', authenticateToken, deleteRecord);

export default router;
