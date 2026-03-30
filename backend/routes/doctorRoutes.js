import express from 'express';
import { authenticateToken, requireAdmin, requireAdminOrReceptionist } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getGlobalPublicDoctors,
  getPublicDoctors,
  getDoctorSlots,
  getDoctor,
  getAllDoctors,
  getDoctorCount,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  verifyDoctor,
  rejectDoctor,
  getSearchSuggestions,
  getDoctorAvailabilitySummary,
  getPublicDoctorCheckoutDetails
} from '../controllers/doctorController.js';




const router = express.Router();

// GET /api/doctors/public/search - Search all doctors across organizations (Public)
router.get('/public/search', getGlobalPublicDoctors);

// GET /api/doctors/public/suggestions - Get search suggestions (Public)
router.get('/public/suggestions', getSearchSuggestions);

// GET /api/doctors/:id/availability-summary - Get availability summary for the next 7 days
router.get('/:id/availability-summary', getDoctorAvailabilitySummary);

// GET /api/doctors/public/checkout-details/:id - Get doctor & clinic info for checkout (Public)
router.get('/public/checkout-details/:id', getPublicDoctorCheckoutDetails);




// GET /api/doctors/public/:organizationId - Get all doctors for a specific org (Public)
router.get('/public/:organizationId', getPublicDoctors);

// GET /api/doctors/:id/slots?date=YYYY-MM-DD - Get available slots for a doctor on a specific date (Public)
router.get('/:id/slots', getDoctorSlots);

// Apply authentication and tenant middleware to all OTHER routes
router.use(authenticateToken);
router.use(requireTenant);

// GET /api/doctors - Get all doctors
router.get('/', getAllDoctors);

// GET /api/doctors/count - Get doctor count
router.get('/count', getDoctorCount);

// POST /api/doctors - Add a new doctor
router.post('/', requireAdminOrReceptionist, createDoctor);

// GET /api/doctors/:id - Get a single doctor by _id or doctorId
router.get("/:id", getDoctor);

// PUT /api/doctors/:id - Update a doctor
router.put('/:id', requireAdminOrReceptionist, updateDoctor);

// DELETE /api/doctors/:id - Delete a doctor
router.delete('/:id', requireAdmin, deleteDoctor);

// PATCH /api/doctors/:id/verify - Verify a doctor
router.patch('/:id/verify', requireAdmin, verifyDoctor);

// PATCH /api/doctors/:id/reject - Reject a doctor
router.patch('/:id/reject', requireAdmin, rejectDoctor);

export default router;
