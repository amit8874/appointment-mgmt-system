import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import WhatsAppCreditTransaction from '../models/WhatsAppCreditTransaction.js';
import { getOrganizationPlanName, getPlanMonthlyCredits } from '../services/whatsappCreditService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-management-saas';

async function initWhatsappCredits() {
  let initializedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    console.log('Starting WhatsApp Credits Initialization...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Fetch all organizations
    const organizations = await Organization.find({});
    console.log(`Found ${organizations.length} organizations`);

    for (const org of organizations) {
      try {
        const wallet = org.whatsappCredits;
        
        // Comprehensive check: Skip only if wallet is fully initialized with valid credits
        const hasValidWhatsappCredits = 
          wallet &&
          wallet.totalAvailable !== undefined &&
          wallet.monthlyIncluded !== undefined &&
          wallet.monthlyIncluded > 0 &&
          wallet.usedThisMonth !== undefined &&
          wallet.purchasedCredits !== undefined &&
          wallet.lastResetAt !== undefined &&
          org.whatsappCreditsEnabled !== undefined &&
          (wallet.totalAvailable > 0 || wallet.purchasedCredits > 0 || wallet.usedThisMonth > 0);
        
        if (hasValidWhatsappCredits) {
          console.log(`Skipping Org: ${org.name} (Already initialized with credits)`);
          skippedCount++;
          continue;
        }

        const planName = getOrganizationPlanName(org);
        const planMonthlyIncluded = getPlanMonthlyCredits(planName);
        
        const existingPurchasedCredits = wallet?.purchasedCredits || 0;
        const existingUsedThisMonth = wallet?.usedThisMonth || 0;
        const oldTotal = wallet?.totalAvailable || 0;

        // If monthlyIncluded is missing or 0, we calculate based on plan
        const newMonthlyIncluded = planMonthlyIncluded;
        const newTotal = (oldTotal > 0) ? oldTotal : (newMonthlyIncluded + existingPurchasedCredits);

        // Update organization
        org.whatsappCredits = {
          totalAvailable: newTotal,
          monthlyIncluded: newMonthlyIncluded,
          usedThisMonth: existingUsedThisMonth,
          purchasedCredits: existingPurchasedCredits,
          lastResetAt: wallet?.lastResetAt || new Date()
        };
        
        if (org.whatsappCreditsEnabled === undefined) {
          org.whatsappCreditsEnabled = true;
        }

        await org.save();

        // Create transaction log
        await WhatsAppCreditTransaction.create({
          organization: org._id,
          type: "ADJUSTMENT",
          credits: newMonthlyIncluded,
          balanceBefore: oldTotal,
          balanceAfter: newTotal,
          description: "Initial WhatsApp communication credits setup",
          status: "SUCCESS",
          metadata: {
            source: "init_script",
            planName
          }
        });

        console.log(`Initialized Org: ${org.name} | Plan: ${planName} | Credits: ${newMonthlyIncluded}`);
        initializedCount++;
      } catch (orgError) {
        console.error(`Error initializing Org: ${org.name}`, orgError.message);
        errorCount++;
      }
    }

    console.log('\nInitialization Summary:');
    console.log(`   - Total Organizations: ${organizations.length}`);
    console.log(`   - Initialized: ${initializedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log(`   - Errors: ${errorCount}`);

  } catch (error) {
    console.error('Initialization failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run script
initWhatsappCredits()
  .then(() => {
    console.log('\nWhatsApp Credits init script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
