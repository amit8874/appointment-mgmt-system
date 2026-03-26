import cron from 'node-cron';
import { checkSubscriptionExpiry, checkTrialExpiry, checkUsageLimits } from '../utils/notifications.js';

/**
 * Setup cron jobs for subscription management
 * Run daily at midnight
 */
export const setupSubscriptionCron = () => {
  // Check subscription and trial expiry daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running subscription expiry check...');
    await checkSubscriptionExpiry();
    await checkTrialExpiry();
  });

  // Check usage limits daily at 6 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('Running usage limits check...');
    await checkUsageLimits();
  });

  console.log('Subscription cron jobs scheduled');
};
