import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getPatientByPatientId,
  getPatientByMobile,
  getAllPatients,
  getPatientCount,
  getTodayPatientStats,
  createPatient,
  getPatientById,
  updatePatient,
  deletePatient,
  getNewPatientId,
  getPatientAISummary,
  searchAvailablePatients
} from '../controllers/patientController.js';

const router = express.Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(requireTenant);

// New route to get patient by patientId (string) instead of _id (ObjectId)
router.get('/by-patient-id', getPatientByPatientId);

// Search for patients available to have a user account created
router.get('/search-available', searchAvailablePatients);

// Route to generate a new sequential Patient ID
router.get('/generate-id', getNewPatientId);

// Get patient by mobile number
router.get("/by-mobile/:mobile", getPatientByMobile);

// Get all patients
router.get('/', getAllPatients);

// Get patient count
router.get('/count', getPatientCount);

// Get today's registered patient count
router.get('/stats/today', getTodayPatientStats);

// Create new patient
router.post('/', createPatient);

// Get patient by ID
router.get('/:id', getPatientById);

// Get patient AI summary
router.get('/:id/ai-summary', getPatientAISummary);

// Update patient profile
router.put('/:id', updatePatient);

// Delete patient by ID
router.delete('/:id', deletePatient);

export default router;
