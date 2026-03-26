import Notification from '../models/Notification.js';
import Organization from '../models/Organization.js';
import Subscription from '../models/Subscription.js';

/**
 * Create notification for organization
 */
export const createNotification = async (organizationId, message, type = 'info', category = 'system') => {
  try {
    const notification = new Notification({
      organizationId,
      message,
      type,
      category,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Check and notify about subscription expiry
 * Run this as a cron job (daily recommended)
 */
export const checkSubscriptionExpiry = async () => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find subscriptions expiring soon
    const subscriptionsExpiring = await Subscription.find({
      status: 'active',
      endDate: {
        $gte: now,
        $lte: sevenDaysFromNow,
      },
    }).populate('organizationId');

    for (const subscription of subscriptionsExpiring) {
      const daysUntilExpiry = Math.ceil(
        (subscription.endDate - now) / (1000 * 60 * 60 * 24)
      );

      // Notify at 7 days, 3 days, and 1 day before expiry
      if (daysUntilExpiry === 7 || daysUntilExpiry === 3 || daysUntilExpiry === 1) {
        await createNotification(
          subscription.organizationId._id,
          `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Please renew to avoid service interruption.`,
          'warning',
          'subscription'
        );
      }
    }

    // Find expired subscriptions
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      endDate: { $lt: now },
    }).populate('organizationId');

    for (const subscription of expiredSubscriptions) {
      // Update subscription status
      subscription.status = 'expired';
      await subscription.save();

      // Update organization status
      const org = subscription.organizationId;
      if (org && org.status === 'active') {
        org.status = 'inactive';
        await org.save();
      }

      // Create notification
      await createNotification(
        org._id,
        'Your subscription has expired. Please renew to continue using the service.',
        'error',
        'subscription'
      );
    }

    console.log(`Checked ${subscriptionsExpiring.length} expiring subscriptions and ${expiredSubscriptions.length} expired subscriptions`);
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
  }
};

/**
 * Check trial expiry
 */
export const checkTrialExpiry = async () => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find trials expiring soon
    const trialsExpiring = await Organization.find({
      status: 'trial',
      trialEndDate: {
        $gte: now,
        $lte: threeDaysFromNow,
      },
    });

    for (const org of trialsExpiring) {
      const daysUntilExpiry = Math.ceil(
        (org.trialEndDate - now) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry === 3 || daysUntilExpiry === 1) {
        await createNotification(
          org._id,
          `Your free trial expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Subscribe to continue using the service.`,
          'warning',
          'subscription'
        );
      }
    }

    // Find expired trials
    const expiredTrials = await Organization.find({
      status: 'trial',
      trialEndDate: { $lt: now },
    });

    for (const org of expiredTrials) {
      org.status = 'inactive';
      await org.save();

      await createNotification(
        org._id,
        'Your free trial has expired. Please subscribe to continue using the service.',
        'error',
        'subscription'
      );
    }

    console.log(`Checked ${trialsExpiring.length} expiring trials and ${expiredTrials.length} expired trials`);
  } catch (error) {
    console.error('Error checking trial expiry:', error);
  }
};

/**
 * Send usage limit warnings
 */
export const checkUsageLimits = async () => {
  try {
    const subscriptions = await Subscription.find({ status: 'active' })
      .populate('organizationId');

    for (const subscription of subscriptions) {
      const limits = subscription.limits;
      const usage = subscription.usage;

      // Check each limit
      const checks = [
        { feature: 'doctors', limit: limits.doctors, usage: usage.doctors },
        { feature: 'receptionists', limit: limits.receptionists, usage: usage.receptionists },
        { feature: 'appointmentsPerMonth', limit: limits.appointmentsPerMonth, usage: usage.appointmentsThisMonth },
        { feature: 'patients', limit: limits.patients, usage: usage.patients },
      ];

      for (const check of checks) {
        if (check.limit === -1) continue; // Unlimited

        const percentage = (check.usage / check.limit) * 100;

        // Warn at 80% and 95%
        if (percentage >= 95 && percentage < 100) {
          await createNotification(
            subscription.organizationId._id,
            `Warning: You've used ${percentage.toFixed(0)}% of your ${check.feature} limit. Please upgrade your plan to avoid service interruption.`,
            'warning',
            'subscription'
          );
        } else if (percentage >= 80 && percentage < 95) {
          await createNotification(
            subscription.organizationId._id,
            `You've used ${percentage.toFixed(0)}% of your ${check.feature} limit. Consider upgrading your plan.`,
            'info',
            'subscription'
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking usage limits:', error);
  }
};
