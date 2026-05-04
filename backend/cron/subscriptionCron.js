import cron from 'node-cron';
import { checkSubscriptionExpiry, checkTrialExpiry, checkUsageLimits } from '../utils/notifications.js';
import Organization from '../models/Organization.js';
import { applyPlanWhatsappCredits } from '../services/whatsappCreditService.js';

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
  
  // Check for monthly WhatsApp credit resets daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Running monthly WhatsApp credit reset check...');
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Find organizations on PAID plans whose WhatsApp credits haven't been reset in 30 days
      // Note: Free trial is handled by trialResetCron (24h)
      const orgsToReset = await Organization.find({
        planType: 'PAID',
        status: 'active',
        $or: [
          { "whatsappCredits.lastResetAt": { $lt: thirtyDaysAgo } },
          { "whatsappCredits.lastResetAt": { $exists: false } }
        ]
      }).populate('subscriptionId');
      
      console.log(`Found ${orgsToReset.length} organizations needing WhatsApp credit reset.`);
      
      for (const org of orgsToReset) {
        const planName = org.subscriptionId?.planName || 'Active Plan';
        await applyPlanWhatsappCredits({
          orgId: org._id,
          planName: planName,
          resetCycle: true,
          description: `Monthly automatic WhatsApp credit reset for ${planName}`
        }).catch(err => console.error(`[WhatsApp Credit Service] Auto-reset failed for ${org._id}:`, err.message));
      }
    } catch (error) {
      console.error('WhatsApp credit reset cron error:', error);
    }
  });

  console.log('Subscription cron jobs scheduled');
};
