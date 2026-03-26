import Subscription from '../models/Subscription.js';
import Organization from '../models/Organization.js';

/**
 * Check Subscription Status Middleware
 * Ensures organization has active subscription
 */
export const checkSubscription = async (req, res, next) => {
  try {
    // Superadmin bypasses subscription checks
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }

    if (!req.tenantId && !req.organization) {
      return res.status(400).json({ message: 'Organization not found' });
    }

    const orgId = req.organization?._id || req.tenantId;
    const organization = req.organization || await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if organization is in trial
    if (organization.status === 'trial') {
      const trialEndDate = organization.trialEndDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      if (new Date() > trialEndDate) {
        return res.status(403).json({ 
          message: 'Trial period has expired. Please subscribe to continue.',
          code: 'TRIAL_EXPIRED'
        });
      }
      return next();
    }

    // Check subscription
    const subscription = await Subscription.findOne({ organizationId: orgId });

    if (!subscription) {
      return res.status(403).json({ 
        message: 'No active subscription found',
        code: 'NO_SUBSCRIPTION'
      });
    }

    // Check if subscription is active
    if (subscription.status !== 'active') {
      if (subscription.status === 'expired') {
        return res.status(403).json({ 
          message: 'Subscription has expired. Please renew to continue.',
          code: 'SUBSCRIPTION_EXPIRED'
        });
      }
      if (subscription.status === 'cancelled') {
        return res.status(403).json({ 
          message: 'Subscription has been cancelled.',
          code: 'SUBSCRIPTION_CANCELLED'
        });
      }
      return res.status(403).json({ 
        message: 'Subscription is not active',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    // Check if subscription has expired
    if (subscription.endDate && new Date() > subscription.endDate) {
      // Update subscription status
      subscription.status = 'expired';
      await subscription.save();
      
      organization.status = 'inactive';
      await organization.save();

      return res.status(403).json({ 
        message: 'Subscription has expired. Please renew to continue.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    // Attach subscription to request
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ message: 'Error checking subscription', error: error.message });
  }
};

/**
 * Check Feature Limits Middleware
 * Validates if organization has reached plan limits
 */
export const checkFeatureLimits = (feature) => {
  return async (req, res, next) => {
    try {
      // Superadmin bypasses limits
      if (req.user && req.user.role === 'superadmin') {
        return next();
      }

      if (!req.subscription) {
        return res.status(400).json({ message: 'Subscription not found' });
      }

      const subscription = req.subscription;
      const limit = subscription.limits[feature];
      const usage = subscription.usage[feature] || 0;

      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      if (usage >= limit) {
        return res.status(403).json({ 
          message: `You have reached the limit for ${feature}. Please upgrade your plan.`,
          code: 'LIMIT_REACHED',
          feature,
          limit,
          usage
        });
      }

      next();
    } catch (error) {
      console.error('Feature limit check error:', error);
      res.status(500).json({ message: 'Error checking feature limits', error: error.message });
    }
  };
};

/**
 * Increment Usage Middleware
 * Increments usage counter for a feature
 */
export const incrementUsage = (feature) => {
  return async (req, res, next) => {
    try {
      if (!req.subscription) {
        return next();
      }

      // Reset monthly counters if needed
      const now = new Date();
      const lastReset = req.subscription.usage.lastResetDate || new Date();
      const daysDiff = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 30) {
        req.subscription.usage.appointmentsThisMonth = 0;
        req.subscription.usage.lastResetDate = now;
      }

      // Increment usage
      if (req.subscription.usage[feature] !== undefined) {
        req.subscription.usage[feature] = (req.subscription.usage[feature] || 0) + 1;
        await req.subscription.save();
      }

      next();
    } catch (error) {
      console.error('Increment usage error:', error);
      // Don't block request if usage increment fails
      next();
    }
  };
};
