import cron from 'node-cron';
import Organization from '../models/Organization.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import Billing from '../models/Billing.js';
import Doctor from '../models/Doctor.js';
import Receptionist from '../models/Receptionist.js';
import User from '../models/User.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import PrescriptionOrder from '../models/PrescriptionOrder.js';
import Order from '../models/Order.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Notification from '../models/Notification.js';

/**
 * Setup cron jobs for Free Trial data reset
 * Runs every hour
 */
export const setupTrialResetCron = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running Free Trial data reset check...');
    try {
      const now = new Date();
      const resetThreshold = 24 * 60 * 60 * 1000; // 24 hours in ms

      // Find organizations on FREE_TRIAL where trialStartDate was more than 24h ago
      const expiredOrgs = await Organization.find({
        planType: 'FREE_TRIAL',
        trialStartDate: { $lt: new Date(now.getTime() - resetThreshold) }
      });

      if (expiredOrgs.length === 0) {
        console.log('No expired trials found for reset');
        return;
      }

      console.log(`Found ${expiredOrgs.length} expired trials. Resetting data...`);

      for (const org of expiredOrgs) {
        const orgId = org._id;

        // Perform cascading delete for all operational data linked to this organization
        // We use Promise.all to run these in parallel for performance
        await Promise.all([
          // Users with operational roles (but NOT orgadmin/superadmin)
          User.deleteMany({ 
            organizationId: orgId, 
            role: { $in: ['patient', 'doctor', 'receptionist'] } 
          }),
          
          // Specific entity models
          Doctor.deleteMany({ organizationId: orgId }),
          Receptionist.deleteMany({ organizationId: orgId }),
          Appointment.deleteMany({ organizationId: orgId }),
          PendingAppointment.deleteMany({ organizationId: orgId }),
          ConfirmedAppointment.deleteMany({ organizationId: orgId }),
          CancelledAppointment.deleteMany({ organizationId: orgId }),
          Billing.deleteMany({ organizationId: orgId }),
          MedicalRecord.deleteMany({ organizationId: orgId }),
          Inventory.deleteMany({ organizationId: orgId }),
          Product.deleteMany({ organizationId: orgId }),
          PrescriptionOrder.deleteMany({ organizationId: orgId }),
          Order.deleteMany({ organizationId: orgId }),
          ServiceRequest.deleteMany({ organizationId: orgId }),
          Notification.deleteMany({ organizationId: orgId }), // Also clear notifications
        ]);

        // Update organization to start next 24h cycle
        org.trialStartDate = now;
        org.lastDataResetAt = now;
        org.needsResetNotification = true;
        await org.save();

        console.log(`Successfully reset data for organization: ${org.name} (${orgId})`);
      }

    } catch (error) {
      console.error('Error in Free Trial reset cron:', error);
    }
  });

  console.log('Free Trial reset cron job scheduled (every hour)');
};
