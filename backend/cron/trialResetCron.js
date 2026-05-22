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
import { applyPlanWhatsappCredits } from '../services/whatsappCreditService.js';

/**
 * Setup cron jobs for Free Trial data reset
 * Runs every hour
 */
export const setupTrialResetCron = () => {
  console.log('Free Trial reset cron is disabled. No automatic free-trial data deletion or trial reset will occur.');
};
