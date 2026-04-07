import Subscription from '../models/Subscription.js';
import Organization from '../models/Organization.js';
import Payment from '../models/Payment.js';
import Doctor from '../models/Doctor.js';
import Receptionist from '../models/Receptionist.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import Patient from '../models/PaitentEditProfile.js';
import MedicalRecord from '../models/MedicalRecord.js';
import { createOrder, verifyPayment as rzpVerifyPayment } from '../utils/razorpay.js';

// Plan Configuration & Pricing (Single source of truth)
const PLAN_CONFIG = {
  free: {
    name: 'Free Trial',
    price: { monthly: 0, yearly: 0 },
    features: {
      doctors: 1,
      receptionists: 1,
      appointmentsPerMonth: 100,
      patients: 500,
      storageGB: 1,
      messaging: true,
      aiFeatures: 'Basic AI Module (Trial)',
    }
  },
  basic: {
    name: 'Basic Plan',
    price: { monthly: 299, yearly: 2999 },
    features: {
      doctors: 1,
      receptionists: 1,
      appointmentsPerMonth: 500,
      patients: 1000,
      storageGB: 5,
      messaging: false,
      aiFeatures: 'Basic AI Module (Limited Tokens)',
    }
  },
  pro: {
    name: 'Standard Plan',
    price: { monthly: 499, yearly: 4999 },
    features: {
      doctors: 3,
      receptionists: 3,
      appointmentsPerMonth: 2000,
      patients: 5000,
      storageGB: 20,
      messaging: true,
      aiFeatures: 'Advanced AI Assistant (Limited Tokens)',
      advancedAnalytics: true,
    }
  },
  enterprise: {
    name: 'Premium Plan',
    price: { monthly: 699, yearly: 6999 },
    features: {
      doctors: -1, // Unlimited
      receptionists: -1,
      appointmentsPerMonth: -1,
      patients: -1,
      storageGB: 100,
      messaging: true,
      aiFeatures: 'Full AI Suite (Unlimited Tokens)',
      advancedAnalytics: true,
      customBranding: true,
      apiAccess: true,
    }
  }
};

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
      .populate('organizationId', 'name email slug trialStartDate trialEndDate');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Calculate dynamic usage
    const [
      doctorCount,
      receptionistCount,
      patientCount,
      pendingCount,
      confirmedCount,
      cancelledCount,
      oldCount,
      recordCountWithAttachment,
      doctorsWithFiles,
      receptionistsWithPhoto,
      patientsWithReports,
      totalUsersWithPhoto
    ] = await Promise.all([
      Doctor.countDocuments({ organizationId: req.tenantId }),
      Receptionist.countDocuments({ organizationId: req.tenantId }),
      Patient.countDocuments({ organizationId: req.tenantId }),
      PendingAppointment.countDocuments({ organizationId: req.tenantId }),
      ConfirmedAppointment.countDocuments({ organizationId: req.tenantId }),
      CancelledAppointment.countDocuments({ organizationId: req.tenantId }),
      Appointment.countDocuments({ organizationId: req.tenantId }),
      MedicalRecord.countDocuments({ 
        organizationId: req.tenantId, 
        attachmentUrl: { $exists: true, $ne: '' } 
      }),
      Doctor.countDocuments({ 
        organizationId: req.tenantId, 
        $or: [
          { photo: { $exists: true, $ne: '' } },
          { certificateUrl: { $exists: true, $ne: '' } },
          { idDocumentUrl: { $exists: true, $ne: '' } }
        ] 
      }),
      Receptionist.countDocuments({ 
        organizationId: req.tenantId, 
        profilePhoto: { $exists: true, $ne: '' } 
      }),
      Patient.countDocuments({ 
        organizationId: req.tenantId, 
        'reports.0': { $exists: true } 
      }),
      User.countDocuments({ 
        organizationId: req.tenantId, 
        profilePicture: { $exists: true, $ne: '' } 
      })
    ]);

    const totalAppointments = pendingCount + confirmedCount + cancelledCount + oldCount;
    
    // Comprehensive Storage Estimation in MB
    const medicalRecordStorage = recordCountWithAttachment * 5; 
    const profilePhotoStorage = (doctorsWithFiles + receptionistsWithPhoto + totalUsersWithPhoto) * 0.5; 
    const patientReportsStorage = patientsWithReports * 2; 
    const totalDbRecords = doctorCount + receptionistCount + patientCount + totalAppointments + 50; 
    const dbMetadataStorage = totalDbRecords * 0.01; 
    
    const totalStorageMB = medicalRecordStorage + profilePhotoStorage + patientReportsStorage + dbMetadataStorage + 0.5; 
    const totalStorageGB = parseFloat((totalStorageMB / 1024).toFixed(3)); 

    subscription.usage = {
      ...subscription.usage,
      doctors: doctorCount,
      receptionists: receptionistCount,
      patients: patientCount,
      appointmentsThisMonth: totalAppointments,
      storageUsedGB: totalStorageGB,
      lastResetDate: subscription.usage?.lastResetDate || new Date()
    };

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

    if (!PLAN_CONFIG[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ message: 'Invalid billing cycle' });
    }

    const subscription = await Subscription.findOne({ organizationId: req.tenantId });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription record not found' });
    }

    // Resolve amount from server-side config (NEVER trust frontend amount)
    const amount = PLAN_CONFIG[plan].price[billingCycle];
    
    // Create Razorpay order
    const razorpayOrder = await createOrder(amount, 'INR', {
      organizationId: req.tenantId.toString(),
      subscriptionId: subscription._id.toString(),
      plan,
      billingCycle,
    });

    // Log the payment creation
    await Payment.create({
      organizationId: req.tenantId,
      subscriptionId: subscription._id,
      planName: PLAN_CONFIG[plan].name,
      amount,
      razorpayOrderId: razorpayOrder.id,
      status: 'created',
      notes: { billingCycle }
    });

    // Update subscription with pending order ID
    subscription.orderId = razorpayOrder.id;
    await subscription.save();

    res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
      planMeta: {
        name: PLAN_CONFIG[plan].name,
        plan,
        billingCycle,
        amount
      }
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
    const { orderId, paymentId, signature, plan, billingCycle } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment signature details' });
    }

    // 1. Securely verify signature
    const isValid = rzpVerifyPayment(orderId, paymentId, signature);

    if (!isValid) {
      // Log failed attempt
      await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { status: 'failed', notes: { error: 'Invalid signature', paymentId } }
      );
      return res.status(400).json({ message: 'Payment verification failed: Invalid signature' });
    }

    // 2. Find and update subscription
    const subscription = await Subscription.findOne({ organizationId: req.tenantId });
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found during verification' });
    }

    const planData = PLAN_CONFIG[plan];
    if (!planData) {
      return res.status(400).json({ message: 'Invalid plan during verification' });
    }

    // 3. Update subscription details
    subscription.plan = plan;
    subscription.planName = planData.name;
    subscription.billingCycle = billingCycle;
    subscription.amount = planData.price[billingCycle];
    subscription.status = 'active';
    subscription.startDate = new Date();
    subscription.paymentId = paymentId;
    subscription.orderId = orderId;
    
    // Set expiry (30 days for monthly, 365 for yearly)
    const expiry = new Date();
    if (billingCycle === 'monthly') {
      expiry.setDate(expiry.getDate() + 30);
    } else {
      expiry.setDate(expiry.getDate() + 365);
    }
    subscription.endDate = expiry;
    subscription.nextBillingDate = expiry;

    // Apply plan limits
    subscription.limits = Subscription.getPlanLimits(plan);

    // Add to internal history
    subscription.paymentHistory.push({
      amount: subscription.amount,
      currency: 'INR',
      date: new Date(),
      paymentId,
      orderId,
      status: 'success',
    });

    await subscription.save();

    // 4. Update core Payment log
    await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      { 
        status: 'paid', 
        razorpayPaymentId: paymentId, 
        razorpaySignature: signature,
        updatedAt: new Date()
      }
    );

    // 5. Update organization status
    await Organization.findByIdAndUpdate(req.tenantId, { 
      status: 'active',
      planType: 'PAID'
    });

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Handle payment webhook from Razorpay (for robustness)
export const paymentWebhook = async (req, res) => {
  try {
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
      const { order_id, id: payment_id, amount, notes } = payload.payment.entity;

      // Webhook fallback logic if frontend verification fails
      const payment = await Payment.findOne({ razorpayOrderId: order_id });
      if (payment && payment.status !== 'paid') {
        const subscription = await Subscription.findById(payment.subscriptionId);
        if (subscription) {
          subscription.status = 'active';
          subscription.paymentId = payment_id;
          subscription.paymentHistory.push({
            amount: amount / 100,
            currency: 'INR',
            date: new Date(),
            paymentId: payment_id,
            orderId: order_id,
            status: 'success',
          });
          await subscription.save();
          
          payment.status = 'paid';
          payment.razorpayPaymentId = payment_id;
          await payment.save();

          await Organization.findByIdAndUpdate(subscription.organizationId, { 
            status: 'active',
            planType: 'PAID'
          });
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
  // Map internal PLAN_CONFIG to UI-friendly structure
  const plans = {
    free: {
      ...PLAN_CONFIG.free,
      description: 'Experience Slotify Professional'
    },
    basic: {
      ...PLAN_CONFIG.basic,
      description: 'Ideal for small clinics'
    },
    pro: {
      ...PLAN_CONFIG.pro,
      name: 'Standard Plan', // UI display name
      description: 'Best for growing practices'
    },
    enterprise: {
      ...PLAN_CONFIG.enterprise,
      name: 'Premium Plan', // UI display name
      description: 'Full power for large hospitals'
    }
  };

  res.json(plans);
};
