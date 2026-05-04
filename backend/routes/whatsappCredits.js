import express from 'express';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { requireTenant, loadTenant } from '../middleware/tenant.js';
import { getOrganizationPlanName, addCredits, applyPlanWhatsappCredits } from '../services/whatsappCreditService.js';
import WhatsAppCreditTransaction from '../models/WhatsAppCreditTransaction.js';
import Organization from '../models/Organization.js';
import { createOrder, verifyPayment as rzpVerifyPayment } from '../utils/razorpay.js';

const router = express.Router();

const CREDIT_PACKS = [
  {
    id: "pack_99",
    name: "Starter Pack",
    price: 99,
    credits: 500
  },
  {
    id: "pack_199",
    name: "Growth Pack",
    price: 199,
    credits: 1200
  },
  {
    id: "pack_399",
    name: "Power Pack",
    price: 399,
    credits: 3000
  }
];

/**
 * @route   GET /api/whatsapp-credits/balance
 * @desc    Get current organization credit balance
 * @access  Private (Tenant Admin)
 */
router.get('/balance', authenticateToken, requireTenant, loadTenant, async (req, res) => {
  try {
    const organizationId = req.tenantId || req.organization?._id || req.user?.organization || req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization not detected"
      });
    }

    const org = req.organization;
    const planName = getOrganizationPlanName(org);
    const monthlyQuota = org.whatsappCredits?.monthlyIncluded || 0;

    // AUTO-REPAIR/INITIALIZE: 
    // If organization is on a paid plan but has 0 credits initialized (e.g. upgraded before this system),
    // automatically apply the credits now.
    if (monthlyQuota === 0 && (planName !== 'free' && planName !== 'trial')) {
      console.log(`[WhatsApp Credits] Auto-initializing credits for ${org.name} (${planName})`);
      try {
        const result = await applyPlanWhatsappCredits({
          orgId: org._id,
          planName: planName,
          resetCycle: true,
          description: `Auto-initialized monthly credits for ${planName} plan`
        });
        
        if (result.success) {
          // Re-fetch org to get updated values
          const updatedOrg = await Organization.findById(org._id);
          return res.json({
            success: true,
            data: {
              totalAvailable: updatedOrg.whatsappCredits?.totalAvailable || 0,
              monthlyIncluded: updatedOrg.whatsappCredits?.monthlyIncluded || 0,
              usedThisMonth: updatedOrg.whatsappCredits?.usedThisMonth || 0,
              purchasedCredits: updatedOrg.whatsappCredits?.purchasedCredits || 0,
              lastResetAt: updatedOrg.whatsappCredits?.lastResetAt,
              whatsappCreditsEnabled: updatedOrg.whatsappCreditsEnabled !== false,
              planName: planName,
              message: "Credits auto-allocated for your plan"
            }
          });
        }
      } catch (err) {
        console.error(`[WhatsApp Credits] Auto-initialize failed:`, err.message);
      }
    }

    res.json({
      success: true,
      data: {
        totalAvailable: org.whatsappCredits?.totalAvailable || 0,
        monthlyIncluded: monthlyQuota,
        usedThisMonth: org.whatsappCredits?.usedThisMonth || 0,
        purchasedCredits: org.whatsappCredits?.purchasedCredits || 0,
        lastResetAt: org.whatsappCredits?.lastResetAt,
        whatsappCreditsEnabled: org.whatsappCreditsEnabled !== false,
        planName: planName
      }
    });
  } catch (error) {
    console.error('[WhatsApp Credits Route] Error fetching balance:', error);
    res.status(500).json({ success: false, message: 'Error fetching credit balance' });
  }
});

/**
 * @route   GET /api/whatsapp-credits/transactions
 * @desc    Get organization credit transactions
 * @access  Private (Tenant Admin)
 */
router.get('/transactions', authenticateToken, requireTenant, loadTenant, async (req, res) => {
  try {
    const organizationId = req.tenantId || req.organization?._id || req.user?.organization || req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization not detected"
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const skip = (page - 1) * limit;

    const query = { organization: organizationId };
    if (type) query.type = type;

    const transactions = await WhatsAppCreditTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await WhatsAppCreditTransaction.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[WhatsApp Credits Route] Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Error fetching transactions' });
  }
});

/**
 * @route   GET /api/whatsapp-credits/packs
 * @desc    Get available credit packs
 * @access  Private
 */
router.get('/packs', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: CREDIT_PACKS
  });
});

/**
 * @route   POST /api/whatsapp-credits/recharge/create-order
 * @desc    Create Razorpay order for credit recharge
 * @access  Private (Tenant Admin)
 */
router.post('/recharge/create-order', authenticateToken, requireTenant, loadTenant, async (req, res) => {
  try {
    const { packId } = req.body;
    const pack = CREDIT_PACKS.find(p => p.id === packId);

    if (!pack) {
      return res.status(400).json({ success: false, message: 'Invalid credit pack selected' });
    }

    const order = await createOrder(pack.price, 'INR', {
      organizationId: req.tenantId.toString(),
      packId: pack.id,
      credits: pack.credits.toString(),
      type: 'whatsapp_recharge'
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      },
      pack
    });
  } catch (error) {
    console.error('[WhatsApp Credits] Create order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/whatsapp-credits/recharge/verify
 * @desc    Verify Razorpay payment and add credits
 * @access  Private (Tenant Admin)
 */
router.post('/recharge/verify', authenticateToken, requireTenant, loadTenant, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packId } = req.body;

    // 1. Verify signature
    const isValid = rzpVerifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // 2. Find the pack
    const pack = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) {
      return res.status(400).json({ success: false, message: 'Invalid pack ID' });
    }

    // 3. Add credits
    const newBalance = await addCredits({
      orgId: req.tenantId,
      credits: pack.credits,
      amount: pack.price,
      packName: pack.name,
      paymentId: razorpay_payment_id,
      createdBy: req.user._id,
      description: `Recharge: ${pack.name} (${pack.credits} credits)`,
      metadata: { 
        razorpay_order_id,
        razorpay_payment_id,
        source: 'razorpay_checkout'
      }
    });

    res.json({
      success: true,
      message: `${pack.credits} credits added successfully`,
      newBalance,
      packName: pack.name
    });
  } catch (error) {
    console.error('[WhatsApp Credits] Verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/whatsapp-credits/recharge/manual
 * @desc    Manual recharge (Super Admin only)
 * @access  Private (Super Admin)
 */
router.post('/recharge/manual', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId, packId, credits, reason } = req.body;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization ID is required' });
    }

    let creditsToAdd = 0;
    let description = reason || 'Manual testing recharge';
    let packName = 'Manual';
    let amount = 0;

    if (packId) {
      const pack = CREDIT_PACKS.find(p => p.id === packId);
      if (!pack) {
        return res.status(400).json({ success: false, message: 'Invalid pack ID' });
      }
      creditsToAdd = pack.credits;
      if (!creditsToAdd || creditsToAdd <= 0) {
        return res.status(400).json({ success: false, message: 'Pack must have positive credits' });
      }
      packName = pack.name;
      amount = pack.price;
      description = `SuperAdmin manual recharge: ${packName}`;
    } else if (credits) {
      creditsToAdd = parseInt(credits, 10);
      if (!creditsToAdd || creditsToAdd <= 0) {
        return res.status(400).json({
          success: false,
          message: "Credits must be a positive number"
        });
      }
      description = reason || 'SuperAdmin manual credit adjustment';
    } else {
      return res.status(400).json({ success: false, message: 'Pack ID or Credits required' });
    }

    const newBalance = await addCredits({
      orgId: organizationId,
      credits: creditsToAdd,
      amount,
      packName,
      paymentId: `MANUAL_${Date.now()}`,
      createdBy: req.user._id,
      description,
      metadata: { source: 'manual_recharge_api' }
    });

    res.json({
      success: true,
      message: `${creditsToAdd} credits added successfully`,
      newBalance
    });
  } catch (error) {
    console.error('[WhatsApp Credits Route] Error in manual recharge:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
