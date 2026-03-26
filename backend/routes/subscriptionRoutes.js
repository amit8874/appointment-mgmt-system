import express from 'express';
import { authenticateToken, requireSuperAdmin, requireOrgAdmin } from '../middleware/auth.js';
import { detectTenant, requireTenant, loadTenant } from '../middleware/tenant.js';
import {
  getSubscriptions,
  getMySubscription,
  upgradeSubscription,
  cancelSubscription,
  verifyPayment,
  paymentWebhook,
  getPlans
} from '../controllers/subscriptionController.js';

const router = express.Router();

/**
 * @route   GET /api/subscriptions
 * @desc    Get all subscriptions (Super Admin only)
 * @access  Super Admin
 */
router.get('/', authenticateToken, requireSuperAdmin, getSubscriptions);

/**
 * @route   GET /api/subscriptions/my-subscription
 * @desc    Get current organization's subscription
 * @access  Organization Admin
 */
router.get('/my-subscription', authenticateToken, detectTenant, requireTenant, loadTenant, getMySubscription);

/**
 * @route   POST /api/subscriptions/upgrade
 * @desc    Upgrade subscription plan
 * @access  Organization Admin
 */
router.post('/upgrade', authenticateToken, detectTenant, requireTenant, loadTenant, requireOrgAdmin, upgradeSubscription);

/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Organization Admin
 */
router.post('/cancel', authenticateToken, detectTenant, requireTenant, loadTenant, requireOrgAdmin, cancelSubscription);

/**
 * @route   POST /api/subscriptions/verify-payment
 * @desc    Verify Razorpay payment
 * @access  Organization Admin
 */
router.post('/verify-payment', authenticateToken, detectTenant, requireTenant, requireOrgAdmin, verifyPayment);

/**
 * @route   POST /api/subscriptions/payment-webhook
 * @desc    Handle payment webhook from Razorpay
 * @access  Public (Razorpay)
 */
router.post('/payment-webhook', paymentWebhook);

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get available subscription plans
 * @access  Public
 */
router.get('/plans', getPlans);

export default router;
