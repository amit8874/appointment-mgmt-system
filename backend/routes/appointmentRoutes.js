import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { checkSubscription, checkFeatureLimits, incrementUsage } from '../middleware/subscription.js';
import {
  getDoctorAppointments,
  getPatientSummary,
  bookPatientAppointment,
  getPatientAppointments,
  getPatientTenantAppointments,
  getAllAppointments,
  bookAppointment,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
  getAvailableSlots,
  getStatsToday,
  bookPublicAppointment,
  cancelPublicAppointment
} from '../controllers/appointmentController.js';



const router = express.Router();

// Get all appointments for a specific doctor
router.get('/doctor-appointments/:doctorId', authenticateToken, getDoctorAppointments);

// Get all appointments for a patient across ALL organizations (used by patient panel)
router.get('/patient/:patientId/summary', authenticateToken, getPatientSummary);

// Book new appointment dynamically (without tenant middleware reading subdomain)
router.post('/patient-book', authenticateToken, bookPatientAppointment);

// Book appointment for public users (no auth required for initial booking)
router.post('/public/book', bookPublicAppointment);

// Cancel appointment for public users
router.post('/public/cancel/:shortId', cancelPublicAppointment);



// Get all appointments for a patient (dynamic - without tenant requirement)
router.get('/patient-appointments/:patientId', authenticateToken, getPatientAppointments);

// Get all appointments for a patient
router.get('/patient/:patientId', authenticateToken, requireTenant, getPatientTenantAppointments);

// Get all appointments (admin view)
router.get('/', authenticateToken, requireTenant, getAllAppointments);

// Book new appointment
router.post('/', authenticateToken, requireTenant, bookAppointment);

// Update appointment status
router.put('/:id/status', authenticateToken, requireTenant, updateAppointmentStatus);

// Update appointment (reschedule or update details) - legacy route
router.put('/:id', authenticateToken, requireTenant, updateAppointment);

// Delete appointment (hard delete)
router.delete('/:id', deleteAppointment);

// Get available time slots for a doctor on a specific date
router.get('/available-slots/:doctorId/:date', getAvailableSlots);

// Get today's appointment stats (count by status)
router.get('/stats/today', authenticateToken, requireTenant, getStatsToday);

export default router;