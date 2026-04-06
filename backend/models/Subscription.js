import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free',
  },
  planName: {
    type: String,
    default: 'Free Trial',
  },
  // Billing cycle
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  // Pricing
  amount: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  // Subscription status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'trial', 'past_due'],
    default: 'trial',
  },
  // Dates
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  trialEndDate: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  // Payment gateway details
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'manual'],
    default: 'razorpay',
  },
  paymentId: {
    type: String, // Razorpay payment ID
  },
  orderId: {
    type: String, // Razorpay order ID
  },
  // Feature limits based on plan
  limits: {
    doctors: {
      type: Number,
      default: 1, // Free plan: 1 doctor
    },
    receptionists: {
      type: Number,
      default: 3, // Free plan: 3 receptionists
    },
    appointmentsPerMonth: {
      type: Number,
      default: 100, // Free plan: 100 appointments/month
    },
    patients: {
      type: Number,
      default: 500, // Free plan: 500 patients
    },
    storageGB: {
      type: Number,
      default: 1, // Free plan: 1GB storage
    },
    messaging: {
      type: Boolean,
      default: true,
    },
  },
  // Usage tracking
  usage: {
    doctors: { type: Number, default: 0 },
    receptionists: { type: Number, default: 0 },
    appointmentsThisMonth: { type: Number, default: 0 },
    patients: { type: Number, default: 0 },
    storageUsedGB: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },
  },
  // Auto-renewal
  autoRenew: {
    type: Boolean,
    default: true,
  },
  // Next billing date
  nextBillingDate: {
    type: Date,
  },
  // Payment history
  paymentHistory: [{
    amount: Number,
    currency: String,
    date: Date,
    paymentId: String,
    orderId: String,
    status: String,
    invoiceUrl: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Override tracking
  isManualOverride: {
    type: Boolean,
    default: false,
  },
  overrideNote: {
    type: String,
  },
});

// Update updatedAt before saving
subscriptionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Calculate end date based on billing cycle
  if (this.isModified('startDate') || this.isModified('billingCycle')) {
    if (this.startDate && this.billingCycle) {
      const endDate = new Date(this.startDate);
      if (this.billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (this.billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      this.endDate = endDate;
      this.nextBillingDate = endDate;
    }
  }
  
  // Set trial end date (default 14 days)
  if (this.status === 'trial' && !this.trialEndDate) {
    const trialEnd = new Date(this.startDate);
    trialEnd.setDate(trialEnd.getDate() + 14);
    this.trialEndDate = trialEnd;
  }
  
  next();
});

// Indexes
subscriptionSchema.index({ organizationId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });

// Static method to get plan limits
subscriptionSchema.statics.getPlanLimits = function (plan) {
  const limits = {
    free: {
      doctors: 1,
      receptionists: 3,
      appointmentsPerMonth: 100,
      patients: 500,
      storageGB: 1,
      messaging: true,
    },
    basic: {
      doctors: 1,
      receptionists: 1,
      appointmentsPerMonth: 500,
      patients: 1000,
      storageGB: 5,
      messaging: false,
    },
    pro: {
      doctors: 3,
      receptionists: 3,
      appointmentsPerMonth: 2000,
      patients: 5000,
      storageGB: 20,
      messaging: true,
    },
    enterprise: {
      doctors: -1, // Unlimited
      receptionists: -1,
      appointmentsPerMonth: -1,
      patients: -1,
      storageGB: 100,
      messaging: true,
    },
  };
  return limits[plan] || limits.free;
};

export default mongoose.model('Subscription', subscriptionSchema);
