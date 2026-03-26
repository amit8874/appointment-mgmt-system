import express from 'express';
import { authenticateToken, requireSuperAdmin, requireOrgAdmin } from '../middleware/auth.js';
import { detectTenant, requireTenant, loadTenant } from '../middleware/tenant.js';
import {
  registerOrganization,
  getPublicOrganizations,
  getOrganizations,
  getOrganization,
  updateOrganization,
  updateOrganizationStatus,
  getOrganizationStats,
  getTrialStatus,
  dismissResetNotification
} from '../controllers/organizationController.js';

const router = express.Router();

/**
 * @route   POST /api/organizations
 * @desc    Register a new organization (onboarding)
 * @access  Public (for registration)
 */
router.post('/', registerOrganization);

/**
 * @route   GET /api/organizations/public
 * @desc    Get all active organizations (Public)
 * @access  Public
 */
router.get('/public', getPublicOrganizations);

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations (Super Admin only)
 * @access  Super Admin
 */
router.get('/', authenticateToken, requireSuperAdmin, getOrganizations);

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization by ID
 * @access  Super Admin or Organization Admin
 */
router.get('/:id', authenticateToken, detectTenant, loadTenant, getOrganization);

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization
 * @access  Super Admin or Organization Admin
 */
router.put('/:id', authenticateToken, detectTenant, loadTenant, updateOrganization);

/**
 * @route   PATCH /api/organizations/:id/status
 * @desc    Update organization status (Super Admin only)
 * @access  Super Admin
 */
router.patch('/:id/status', authenticateToken, requireSuperAdmin, updateOrganizationStatus);

/**
 * @route   GET /api/organizations/:id/stats
 * @desc    Get organization statistics
 * @access  Super Admin or Organization Admin
 */
router.get('/:id/stats', authenticateToken, detectTenant, loadTenant, getOrganizationStats);

/**
 * @route   GET /api/organizations/:id/trial-status
 * @desc    Get organization trial status
 * @access  Organization Admin
 */
router.get('/:id/trial-status', authenticateToken, detectTenant, loadTenant, getTrialStatus);

/**
 * @route   PATCH /api/organizations/:id/dismiss-reset-notification
 * @desc    Dismiss data reset notification
 * @access  Organization Admin
 */
router.patch('/:id/dismiss-reset-notification', authenticateToken, detectTenant, loadTenant, dismissResetNotification);


export default router;
