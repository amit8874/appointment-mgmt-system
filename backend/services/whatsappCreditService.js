import Organization from '../models/Organization.js';
import WhatsAppCreditTransaction from '../models/WhatsAppCreditTransaction.js';

/**
 * Safely extracts the plan name from an organization object by checking various possible fields.
 * @param {object} org - Organization object
 * @returns {string} - Normalized plan name
 */
export const getOrganizationPlanName = (org) => {
  if (!org) return "free";

  const plan = 
    org.subscriptionId?.plan || 
    org.subscriptionId?.planName || 
    org.subscription?.plan || 
    org.subscription?.planName || 
    org.planType || 
    org.plan || 
    org.subscriptionPlan || 
    org.currentPlan || 
    org.packageName;

  return String(plan || "free").toLowerCase().trim();
};

/**
 * Maps plan names to monthly included WhatsApp credits.
 * @param {string} planName - The name of the plan
 * @returns {number} - Number of monthly included credits
 */
export const getPlanMonthlyCredits = (planName) => {
  const normalized = String(planName || "").toLowerCase().trim();

  if (normalized.includes('basic')) return 500;
  if (normalized.includes('standard') || normalized.includes('pro') || normalized.includes('advanced')) return 1200;
  if (normalized.includes('premium') || normalized.includes('enterprise')) return 2500;
  
  return 100; // Default for trial/free/missing
};

/**
 * Checks if an organization has enough credits to send a message.
 * @param {string} orgId - Organization ID
 * @param {number} requiredCredits - Number of credits needed (default 1)
 * @returns {Promise<object>} - Result with allowed status and message
 */
export const ensureOrganizationHasCredits = async (orgId, requiredCredits = 1) => {
  try {
    const org = await Organization.findById(orgId);
    
    if (!org) {
      return { allowed: false, availableCredits: 0, message: "Organization not found" };
    }

    if (org.whatsappCreditsEnabled === false) {
      return { allowed: true, availableCredits: Infinity, bypassed: true };
    }

    const balance = org.whatsappCredits?.totalAvailable || 0;

    if (balance >= requiredCredits) {
      return { allowed: true, availableCredits: balance };
    }

    return {
      allowed: false,
      availableCredits: balance,
      message: "Insufficient WhatsApp communication credits. Please recharge to continue sending patient messages."
    };
  } catch (error) {
    console.error(`[WhatsApp Credit Service] Error in ensureOrganizationHasCredits:`, error);
    return { allowed: false, availableCredits: 0, message: "Error checking credits" };
  }
};

/**
 * Deducts credits from an organization and logs the transaction.
 * @param {object} params - Deduction details
 * @returns {Promise<number>} - Updated balance
 */
export const deductCredits = async ({ 
  orgId, 
  credits = 1, 
  messageType, 
  relatedEntityType, 
  relatedEntityId, 
  createdBy, 
  description, 
  metadata = {} 
}) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error("Organization not found");

  const balanceBefore = org.whatsappCredits?.totalAvailable || 0;

  // Atomic update to prevent negative balance
  const updatedOrg = await Organization.findOneAndUpdate(
    {
      _id: orgId,
      "whatsappCredits.totalAvailable": { $gte: credits }
    },
    {
      $inc: {
        "whatsappCredits.totalAvailable": -credits,
        "whatsappCredits.usedThisMonth": credits
      }
    },
    { new: true }
  );

  if (!updatedOrg) {
    // If deduction failed, check why. If it's zero balance, we can emit a socket event
    const io = metadata?.io;
    if (io && orgId) {
      io.to(orgId.toString()).emit('insufficient-whatsapp-credits', {
        message: "Insufficient WhatsApp communication credits. Please recharge to continue sending patient messages.",
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        totalAvailable: 0
      });
    }

    const error = new Error("Insufficient WhatsApp communication credits.");
    error.code = "INSUFFICIENT_WHATSAPP_CREDITS";
    throw error;
  }

  const balanceAfter = updatedOrg.whatsappCredits.totalAvailable;

  // Check for "Low Credit" warning (at 50 credits)
  if (balanceAfter <= 50) {
    const io = metadata?.io;
    if (io && orgId) {
      io.to(orgId.toString()).emit('insufficient-whatsapp-credits', {
        message: `Your WhatsApp credits are low (${balanceAfter} left). Please recharge soon to avoid interruption.`,
        code: balanceAfter <= 0 ? "INSUFFICIENT_WHATSAPP_CREDITS" : "LOW_WHATSAPP_CREDITS",
        totalAvailable: balanceAfter
      });
    }
  }

  // Create transaction log
  const dbMetadata = { ...metadata };
  if (dbMetadata.io) delete dbMetadata.io;

  await WhatsAppCreditTransaction.create({
    organization: orgId,
    type: "DEDUCT",
    messageType,
    credits,
    balanceBefore,
    balanceAfter,
    description,
    relatedEntityType,
    relatedEntityId,
    createdBy,
    metadata: dbMetadata,
    status: "SUCCESS"
  });

  return balanceAfter;
};

/**
 * Adds purchased credits to an organization and logs the transaction.
 * @param {object} params - Recharge details
 * @returns {Promise<number>} - Updated balance
 */
export const addCredits = async ({ 
  orgId, 
  credits, 
  amount, 
  packName, 
  paymentId, 
  createdBy, 
  description, 
  metadata = {} 
}) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error("Organization not found");

  const balanceBefore = org.whatsappCredits?.totalAvailable || 0;

  const updatedOrg = await Organization.findByIdAndUpdate(
    orgId,
    {
      $inc: {
        "whatsappCredits.totalAvailable": credits,
        "whatsappCredits.purchasedCredits": credits
      }
    },
    { new: true }
  );

  const balanceAfter = updatedOrg.whatsappCredits.totalAvailable;

  // Create transaction log
  const dbMetadata = { ...metadata };
  if (dbMetadata.io) delete dbMetadata.io;

  await WhatsAppCreditTransaction.create({
    organization: orgId,
    type: "RECHARGE",
    credits,
    balanceBefore,
    balanceAfter,
    description: description || `Recharge: ${packName}`,
    createdBy,
    metadata: {
      ...dbMetadata,
      amount,
      packName,
      paymentId
    },
    status: "SUCCESS"
  });

  return balanceAfter;
};

/**
 * Resets monthly included credits for an organization.
 * @param {string} orgId - Organization ID
 * @returns {Promise<number>} - Updated balance
 */
export const resetMonthlyIncludedCredits = async (orgId) => {
  const org = await Organization.findById(orgId).populate('subscriptionId');
  if (!org) throw new Error("Organization not found");

  const planName = getOrganizationPlanName(org);
  const monthlyIncluded = getPlanMonthlyCredits(planName);
  const balanceBefore = org.whatsappCredits?.totalAvailable || 0;
  
  // purchasedCredits should carry forward
  const purchasedCredits = org.whatsappCredits?.purchasedCredits || 0;
  const totalAvailable = purchasedCredits + monthlyIncluded;

  const updatedOrg = await Organization.findByIdAndUpdate(
    orgId,
    {
      $set: {
        "whatsappCredits.totalAvailable": totalAvailable,
        "whatsappCredits.monthlyIncluded": monthlyIncluded,
        "whatsappCredits.usedThisMonth": 0,
        "whatsappCredits.lastResetAt": new Date()
      }
    },
    { new: true }
  );

  const balanceAfter = updatedOrg.whatsappCredits.totalAvailable;

  // Create transaction log
  await WhatsAppCreditTransaction.create({
    organization: orgId,
    type: "MONTHLY_RESET",
    credits: monthlyIncluded,
    balanceBefore,
    balanceAfter,
    description: "Monthly WhatsApp communication credits reset",
    status: "SUCCESS"
  });

  return balanceAfter;
};

/**
 * Applies WhatsApp monthly included credits based on a new plan.
 * Used during subscription upgrades or plan changes.
 * @param {object} params - Application details
 * @returns {Promise<object>} - Updated credits info
 */
export const applyPlanWhatsappCredits = async ({ 
  orgId, 
  planName, 
  resetCycle = true, 
  createdBy, 
  description 
}) => {
  try {
    const org = await Organization.findById(orgId);
    if (!org) throw new Error("Organization not found");

    const monthlyIncluded = getPlanMonthlyCredits(planName);
    const balanceBefore = org.whatsappCredits?.totalAvailable || 0;
    
    // Purchased credits MUST carry forward
    const purchasedCredits = org.whatsappCredits?.purchasedCredits || 0;
    
    // New total = carried forward purchased + new monthly included
    // Note: Free trial remaining credits are NOT carried forward, only purchased ones.
    const totalAvailable = purchasedCredits + monthlyIncluded;

    const updateData = {
      "whatsappCredits.monthlyIncluded": monthlyIncluded,
      "whatsappCredits.totalAvailable": totalAvailable,
      "whatsappCredits.lastResetAt": new Date()
    };

    if (resetCycle) {
      updateData["whatsappCredits.usedThisMonth"] = 0;
    }

    const updatedOrg = await Organization.findByIdAndUpdate(
      orgId,
      { $set: updateData },
      { new: true }
    );

    const balanceAfter = updatedOrg.whatsappCredits.totalAvailable;

    // Create transaction log
    await WhatsAppCreditTransaction.create({
      organization: orgId,
      type: "ADJUSTMENT",
      credits: monthlyIncluded,
      balanceBefore,
      balanceAfter,
      description: description || `WhatsApp credits applied for ${planName} plan`,
      status: "SUCCESS",
      createdBy,
      metadata: {
        source: "subscription_upgrade",
        planName,
        resetCycle
      }
    });

    console.log(`[WhatsApp Credit Service] Applied ${monthlyIncluded} credits to org ${orgId} for plan ${planName}. New balance: ${balanceAfter}`);
    
    return {
      success: true,
      monthlyIncluded,
      totalAvailable: balanceAfter
    };
  } catch (error) {
    console.error(`[WhatsApp Credit Service] Error in applyPlanWhatsappCredits:`, error);
    throw error;
  }
};
