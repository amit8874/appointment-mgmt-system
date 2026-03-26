import Subscription from '../models/Subscription.js';
import Organization from '../models/Organization.js';
import { createOrder, verifyPayment as rzpVerifyPayment } from '../utils/razorpay.js';

// Get all subscriptions (Super Admin only)
export const getSubscriptions = async (req, res) => {
  try {
    const { status, plan, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (plan) query.plan = plan;

    const subscriptions = await Subscription.find(query)
      .populate('organizationId', 'name email slug status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Subscription.countDocuments(query);

    res.json({
      subscriptions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get current organization's subscription
export const getMySubscription = async (req, res) => {
  try {
    if (req.user.role !== 'orgadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subscription = await Subscription.findOne({ organizationId: req.tenantId })
      .populate('organizationId', 'name email slug');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Upgrade subscription plan
export const upgradeSubscription = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;

    if (!['basic', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ message: 'Invalid billing cycle' });
    }

    const subscription = await Subscription.findOne({ organizationId: req.tenantId });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Plan pricing (in INR)
    const pricing = {
      basic: { monthly: 2999, yearly: 29999 },
      pro: { monthly: 7999, yearly: 79999 },
      enterprise: { monthly: 19999, yearly: 199999 },
    };

    const amount = pricing[plan][billingCycle];
    const planLimits = Subscription.getPlanLimits(plan);

    // Update subscription
    subscription.plan = plan;
    subscription.planName = plan.charAt(0).toUpperCase() + plan.slice(1);
    subscription.billingCycle = billingCycle;
    subscription.amount = amount;
    subscription.status = 'active';
    subscription.startDate = new Date();
    subscription.limits = planLimits;

    // Calculate end date
    const endDate = new Date();
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    subscription.endDate = endDate;
    subscription.nextBillingDate = endDate;

    await subscription.save();

    // Create Razorpay order
    let razorpayOrder = null;
    try {
      razorpayOrder = await createOrder(amount, 'INR', {
        organizationId: req.tenantId.toString(),
        subscriptionId: subscription._id.toString(),
        plan,
        billingCycle,
      });

      // Update subscription with order ID
      subscription.orderId = razorpayOrder.id;
      subscription.status = 'past_due'; // Will be active after payment
      await subscription.save();
    } catch (razorpayError) {
      console.error('Razorpay order creation error:', razorpayError);
      // Continue even if Razorpay fails (for development/testing)
    }

    res.json({
      message: 'Subscription upgrade initiated',
      subscription,
      paymentRequired: true,
      amount,
      currency: 'INR',
      razorpayOrder: razorpayOrder ? {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID, // Frontend needs this
      } : null,
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ organizationId: req.tenantId });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.autoRenew = false;

    await subscription.save();

    res.json({ message: 'Subscription cancelled successfully', subscription });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Verify Razorpay payment
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    // Verify payment signature
    const isValid = rzpVerifyPayment(orderId, paymentId, signature);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find subscription by orderId
    const subscription = await Subscription.findOne({ orderId, organizationId: req.tenantId });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update subscription
    subscription.status = 'active';
    subscription.paymentId = paymentId;

    // Add to payment history
    subscription.paymentHistory.push({
      amount: subscription.amount,
      currency: subscription.currency,
      date: new Date(),
      paymentId,
      orderId,
      status: 'success',
    });

    await subscription.save();

    // Update organization status
    const organization = await Organization.findById(req.tenantId);
    if (organization) {
      organization.status = 'active';
      await organization.save();
    }

    res.json({
      message: 'Payment verified and subscription activated',
      subscription,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Handle payment webhook from Razorpay
export const paymentWebhook = async (req, res) => {
  try {
    // Verify webhook signature (recommended in production)
    const crypto = await import('crypto');
    const razorpaySignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && razorpaySignature) {
      const text = JSON.stringify(req.body);
      const generatedSignature = crypto.default
        .createHmac('sha256', webhookSecret)
        .update(text)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
      }
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const { order_id, id: payment_id, amount } = payload.payment.entity;

      // Find subscription by orderId
      const subscription = await Subscription.findOne({ orderId: order_id });

      if (subscription) {
        // Update subscription
        subscription.status = 'active';
        subscription.paymentId = payment_id;

        // Add to payment history
        subscription.paymentHistory.push({
          amount: amount / 100, // Razorpay amounts are in paise
          currency: 'INR',
          date: new Date(),
          paymentId: payment_id,
          orderId: order_id,
          status: 'success',
        });

        await subscription.save();

        // Update organization status
        const organization = await Organization.findById(subscription.organizationId);
        if (organization) {
          organization.status = 'active';
          await organization.save();
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get available subscription plans
export const getPlans = (req, res) => {
  const plans = {
    free: {
      name: 'Free Trial',
      price: 0,
      billingCycle: 'trial',
      duration: '14 days',
      features: {
        doctors: 5,
        receptionists: 3,
        appointmentsPerMonth: 100,
        patients: 500,
        storageGB: 1,
        advancedAnalytics: false,
        customBranding: false,
        apiAccess: false,
      },
    },
    basic: {
      name: 'Basic',
      price: { monthly: 2999, yearly: 29999 },
      billingCycle: ['monthly', 'yearly'],
      features: {
        doctors: 10,
        receptionists: 5,
        appointmentsPerMonth: 500,
        patients: 2000,
        storageGB: 5,
        advancedAnalytics: false,
        customBranding: false,
        apiAccess: false,
      },
    },
    pro: {
      name: 'Pro',
      price: { monthly: 7999, yearly: 79999 },
      billingCycle: ['monthly', 'yearly'],
      features: {
        doctors: 50,
        receptionists: 20,
        appointmentsPerMonth: 5000,
        patients: 10000,
        storageGB: 50,
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: false,
      },
    },
    enterprise: {
      name: 'Enterprise',
      price: { monthly: 19999, yearly: 199999 },
      billingCycle: ['monthly', 'yearly'],
      features: {
        doctors: -1, // Unlimited
        receptionists: -1,
        appointmentsPerMonth: -1,
        patients: -1,
        storageGB: 500,
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: true,
      },
    },
  };

  res.json(plans);
};
