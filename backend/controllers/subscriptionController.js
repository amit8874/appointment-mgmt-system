import Subscription from '../models/Subscription.js';
import Organization from '../models/Organization.js';
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

    // Calculate dynamic usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

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
    // 1. Files & Media
    const medicalRecordStorage = recordCountWithAttachment * 5; // 5MB avg for labs/scans
    const profilePhotoStorage = (doctorsWithFiles + receptionistsWithPhoto + totalUsersWithPhoto) * 0.5; // 0.5MB avg
    const patientReportsStorage = patientsWithReports * 2; // 2MB avg package
    
    // 2. Database Records (Baseline)
    const totalDbRecords = doctorCount + receptionistCount + patientCount + totalAppointments + 50; // +50 for org/logs
    const dbMetadataStorage = totalDbRecords * 0.01; // 10KB per record baseline
    
    // Total in GB
    const totalStorageMB = medicalRecordStorage + profilePhotoStorage + patientReportsStorage + dbMetadataStorage + 0.5; // +0.5MB global baseline
    const totalStorageGB = parseFloat((totalStorageMB / 1024).toFixed(3)); // 3 decimal places for precision

    // Update usage object in the response (without necessarily saving to DB for performance)
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
      basic: { monthly: 299, yearly: 2999 },
      pro: { monthly: 499, yearly: 4999 },
      enterprise: { monthly: 699, yearly: 6999 },
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
        messaging: true,
        advancedAnalytics: false,
        customBranding: false,
        apiAccess: false,
      },
    },
    basic: {
      name: 'Basic Plan',
      price: { monthly: 299, yearly: 2999 },
      billingCycle: ['monthly', 'yearly'],
      features: {
        doctors: 1,
        receptionists: 1,
        appointmentsPerMonth: 500,
        patients: 1000,
        storageGB: 5,
        messaging: false,
        aiFeatures: 'Basic AI Module (Limited Tokens)',
        advancedAnalytics: false,
        customBranding: false,
        apiAccess: false,
      },
    },
    pro: {
      name: 'Standard Plan',
      price: { monthly: 499, yearly: 4999 },
      billingCycle: ['monthly', 'yearly'],
      features: {
        doctors: 3,
        receptionists: 3,
        appointmentsPerMonth: 2000,
        patients: 5000,
        storageGB: 20,
        messaging: true,
        aiFeatures: 'Advanced AI Assistant (Limited Tokens)',
        advancedAnalytics: true,
        customBranding: false,
        apiAccess: false,
      },
    },
    enterprise: {
      name: 'Premium Plan',
      price: { monthly: 699, yearly: 6999 },
      billingCycle: ['monthly', 'yearly'],
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
        smsReminders: true,
        reports: true,
        multiClinic: true,
      },
    },
  };

  res.json(plans);
};
