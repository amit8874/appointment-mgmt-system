import express from 'express';
import { authenticateToken, requireAdmin, requireOrgAdmin } from '../middleware/auth.js';
import { requireTenant, loadTenant } from '../middleware/tenant.js';
import { checkSubscription } from '../middleware/subscription.js';
import { getDashboard, getCharts, getAppointmentsStats, getDoctorStats, getPatientStats } from '../controllers/analyticsController.js';

const router = express.Router();

// All routes require authentication and tenant
router.use(authenticateToken);
router.use(requireTenant);
router.use(loadTenant);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get organization dashboard analytics
 * @access  Organization Admin or Doctor
 */
router.get('/dashboard', requireAdmin, checkSubscription, getDashboard);

/**
 * @route   GET /api/analytics/charts
 * @desc    Get data for admin dashboard charts
 * @access  Organization Admin or Doctor
 */
router.get('/charts', requireAdmin, checkSubscription, getCharts);

/**
 * @route   GET /api/analytics/appointments
 * @desc    Get appointment analytics with date range
 * @access  Organization Admin or Doctor
 */
router.get('/appointments', requireAdmin, checkSubscription, getAppointmentsStats);

/**
 * @route   GET /api/analytics/doctors
 * @desc    Get doctor performance analytics
 * @access  Organization Admin
 */
router.get('/doctors', requireOrgAdmin, checkSubscription, getDoctorStats);

/**
 * @route   GET /api/analytics/patients
 * @desc    Get patient growth analytics
 * @access  Organization Admin
 */
router.get('/patients', requireOrgAdmin, checkSubscription, getPatientStats);

export default router;
