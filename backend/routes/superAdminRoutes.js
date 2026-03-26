import express from 'express';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import {
  getDashboard,
  getOrganizations,
  getOrganizationsWithCredentials,
  getSubscriptions,
  getRevenue,
  updateOrganizationStatus,
  overrideSubscription,
  getSystemHealth,
  getAuditLogs,
  impersonateUser,
  getPharmacies,
  createPharmacy,
  updatePharmacyStatus
} from '../controllers/superAdminController.js';

const router = express.Router();

import {
  registerPharmacy,
  approvePharmacy
} from '../controllers/superAdminController.js';

/**
 * @route   POST /api/superadmin/pharmacies/public-register
 * @desc    Public pharmacy self-registration
 * @access  Public
 */
router.post('/pharmacies/public-register', registerPharmacy);

// Protected routes require superadmin authentication
router.use(authenticateToken);
router.use(requireSuperAdmin);

/**
 * @route   GET /api/superadmin/dashboard
 * @desc    Get super admin dashboard statistics
 * @access  Super Admin
 */
router.get('/dashboard', getDashboard);

/**
 * @route   GET /api/superadmin/organizations
 * @desc    Get all organizations with filters
 * @access  Super Admin
 */
router.get('/organizations', getOrganizations);

/**
 * @route   GET /api/superadmin/organizations/all-with-credentials
 * @desc    Get all organizations with owner credentials (including plain password)
 * @access  Super Admin
 */
router.get('/organizations/all-with-credentials', getOrganizationsWithCredentials);

/**
 * @route   GET /api/superadmin/subscriptions
 * @desc    Get all subscriptions
 * @access  Super Admin
 */
router.get('/subscriptions', getSubscriptions);

/**
 * @route   GET /api/superadmin/revenue
 * @desc    Get revenue analytics
 * @access  Super Admin
 */
router.get('/revenue', getRevenue);

/**
 * @route   PATCH /api/superadmin/organizations/:id/status
 * @desc    Update organization status
 * @access  Super Admin
 */
router.patch('/organizations/:id/status', updateOrganizationStatus);

/**
 * @route   PUT /api/superadmin/organizations/:orgId/subscription/override
 * @desc    Manual subscription override
 * @access  Super Admin
 */
router.put('/organizations/:orgId/subscription/override', overrideSubscription);

/**
 * @route   GET /api/superadmin/health
 * @desc    Get system health metrics
 * @access  Super Admin
 */
router.get('/health', getSystemHealth);

/**
 * @route   GET /api/superadmin/audit-logs
 * @desc    Get administrative audit logs
 * @access  Super Admin
 */
router.get('/audit-logs', getAuditLogs);

/**
 * @route   POST /api/superadmin/impersonate/:userId
 * @desc    Start shadow mode (user impersonation)
 * @access  Super Admin
 */
router.post('/impersonate/:userId', impersonateUser);

/**
 * @route   GET /api/superadmin/pharmacies
 * @desc    Get all pharmacies
 * @access  Super Admin
 */
router.get('/pharmacies', getPharmacies);

/**
 * @route   POST /api/superadmin/pharmacies
 * @desc    Onboard a new pharmacy
 * @access  Super Admin
 */
router.post('/pharmacies', createPharmacy);

/**
 * @route   PATCH /api/superadmin/pharmacies/:id/status
 * @desc    Update pharmacy status
 * @access  Super Admin
 */
router.patch('/pharmacies/:id/status', updatePharmacyStatus);

/**
 * @route   POST /api/superadmin/pharmacies/:id/approve
 * @desc    Approve pharmacy and create owner account
 * @access  Super Admin
 */
router.post('/pharmacies/:id/approve', approvePharmacy);

export default router;
