import express from 'express';
import { authenticateToken, requireAdmin, requireOrgAdmin, requireAdminOrDoctor } from '../middleware/auth.js';
import { requireTenant, loadTenant } from '../middleware/tenant.js';
import { checkSubscription } from '../middleware/subscription.js';
import { getDashboard, getCharts, getAppointmentsStats, getDoctorStats, getPatientStats, getBillingAnalytics } from '../controllers/analyticsController.js';
import { generateBusinessReport } from '../controllers/aiAnalyticsController.js';

const router = express.Router();

// All routes require authentication and tenant
router.use(authenticateToken);
router.use(requireTenant);
router.use(loadTenant);

/**
 * @route   GET /api/analytics/billing
 * @desc    Get billing and revenue analytics
 * @access  Organization Admin
 */
router.get('/billing', requireOrgAdmin, checkSubscription, getBillingAnalytics);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get organization dashboard analytics
 * @access  Organization Admin or Doctor
 */
router.get('/dashboard', requireAdminOrDoctor, checkSubscription, getDashboard);

/**
 * @route   GET /api/analytics/charts
 * @desc    Get data for admin dashboard charts
 * @access  Organization Admin or Doctor
 */
router.get('/charts', requireAdminOrDoctor, checkSubscription, getCharts);

/**
 * @route   GET /api/analytics/appointments
 * @desc    Get appointment analytics with date range
 * @access  Organization Admin or Doctor
 */
router.get('/appointments', requireAdminOrDoctor, checkSubscription, getAppointmentsStats);

/**
 * @route   GET /api/analytics/doctors
 * @desc    Get doctor performance analytics
 * @access  Organization Admin
 */
router.get('/doctors', requireOrgAdmin, checkSubscription, getDoctorStats);

router.get('/patients', requireOrgAdmin, checkSubscription, getPatientStats);

/**
 * @route   POST /api/analytics/ai-report
 * @desc    Generate AI Business Report based on frontend dashboard metrics
 * @access  Organization Admin or Doctor
 */
router.post('/ai-report', requireAdminOrDoctor, checkSubscription, generateBusinessReport);

export default router;
