import mongoose from 'mongoose';
import Counter from '../models/Counter.js';

/**
 * Gets the current year and 2-digit month prefix in format YYYYMM (e.g. "202610").
 * @param {Date|string|number} [date]
 * @returns {string} - e.g. "202610"
 */
export const getMonthlyPrefix = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
};

/**
 * Automatically migrates an organization's existing legacy patients (e.g. "000001", "PT001")
 * to the new monthly sequential format (e.g. "20261001", "20261002").
 * Also updates dependent collections (Billing, Appointments, Clinical Records) to keep them in sync.
 * 
 * @param {string|mongoose.Types.ObjectId} organizationId - The organization ID.
 * @param {string} [currentPrefix] - Optional prefix, defaults to current YYYYMM.
 */
export const autoMigrateOrganizationLegacyPatients = async (organizationId, currentPrefix = getMonthlyPrefix()) => {
  try {
    if (!organizationId) return;
    const Patient = mongoose.models.Patient || mongoose.model('Patient');
    const orgId = typeof organizationId === 'object' && organizationId._id ? organizationId._id : organizationId;

    // Find all patients in this organization with a legacy / non-monthly ID
    // (i.e. patientId does not match the 8+ digit YYYYMMXX pattern)
    const legacyPatients = await Patient.find({
      organizationId: orgId,
      patientId: { $not: /^\d{6}\d{2,}$/ }
    }).sort({ createdAt: 1, _id: 1 });

    if (!legacyPatients || legacyPatients.length === 0) {
      return;
    }

    console.log(`[ID Migration] Found ${legacyPatients.length} legacy patient(s) for organization ${orgId}. Migrating to ${currentPrefix}...`);

    // Find any existing patients in this organization that already have the current monthly prefix
    const existingMonthly = await Patient.find({
      organizationId: orgId,
      patientId: { $regex: `^${currentPrefix}\\d+$` }
    }).select('patientId').lean();

    let seq = 0;
    for (const p of existingMonthly) {
      if (p.patientId && typeof p.patientId === 'string' && p.patientId.startsWith(currentPrefix)) {
        const suffix = p.patientId.slice(currentPrefix.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > seq) seq = num;
      }
    }

    // Lazy load the patientSync utility to prevent circular dependencies
    const { syncPatientDataToDependents } = await import('./patientSync.js');

    for (const patient of legacyPatients) {
      seq++;
      const oldId = patient.patientId;
      const newId = `${currentPrefix}${String(seq).padStart(2, '0')}`;

      // Update patient document
      await Patient.updateOne({ _id: patient._id }, { $set: { patientId: newId } });

      // Synchronize across Billing, Appointments and Clinical models
      try {
        await syncPatientDataToDependents(orgId, oldId, patient._id, { patientId: newId });
      } catch (syncErr) {
        console.error(`[ID Migration] Sync error for patient ${oldId} -> ${newId}:`, syncErr.message);
      }
    }

    console.log(`[ID Migration] Successfully migrated ${legacyPatients.length} legacy patients for org ${orgId}. Last assigned ID was: ${currentPrefix}${String(seq).padStart(2, '0')}`);
  } catch (err) {
    console.error(`[ID Migration] Error during legacy patient migration for org ${organizationId}:`, err);
  }
};

/**
 * Migrates all organizations with legacy patients to the monthly format.
 * Can be called safely at application startup.
 */
export const migrateAllOrganizationsToMonthlyFormat = async () => {
  try {
    const Patient = mongoose.models.Patient || mongoose.model('Patient');
    // Find all distinct organizationIds in patients collection
    const orgIds = await Patient.distinct('organizationId');
    for (const orgId of orgIds) {
      if (orgId) {
        await autoMigrateOrganizationLegacyPatients(orgId);
      }
    }
  } catch (err) {
    console.error('[ID Migration] Error running global legacy patient migration:', err.message);
  }
};

/**
 * Calculates the next sequential patient ID in the format YYYYMMXX (e.g. 20261001).
 * 
 * Key guarantees:
 * 1. Resets to "01" at the start of each month (e.g. 20261001 for Oct, 20261101 for Nov, 20270101 for Jan).
 * 2. Scoped per organization: each organization starts with 01.
 * 3. Does NOT increment in the DB when simply peeking/opening the appointment form.
 *    Only increments (+1) when a patient is ACTUALLY added to the database.
 * 4. If an organization has existing patients (e.g. 50 patients), it seamlessly continues from 20261051.
 * 
 * @param {string|mongoose.Types.ObjectId} organizationId - The ID of the organization.
 * @param {Date} [targetDate] - Optional date (defaults to current date).
 * @returns {Promise<string>} - The generated patient ID (e.g. "20261001", "20261051").
 */
export const generatePatientId = async (organizationId, targetDate = new Date()) => {
  if (!organizationId) {
    throw new Error('Organization ID is required to generate a patient ID');
  }

  const Patient = mongoose.models.Patient || mongoose.model('Patient');
  const orgId = typeof organizationId === 'object' && organizationId._id ? organizationId._id : organizationId;
  const prefix = getMonthlyPrefix(targetDate);

  // If there are any unmigrated legacy patients for this organization, migrate them first
  await autoMigrateOrganizationLegacyPatients(orgId, prefix);

  // Find all existing patients in this organization whose patientId starts with the current prefix
  const existingPatients = await Patient.find({
    organizationId: orgId,
    patientId: { $regex: `^${prefix}\\d+$` }
  }).select('patientId').lean();

  let maxSeq = 0;
  for (const p of existingPatients) {
    if (p.patientId && typeof p.patientId === 'string' && p.patientId.startsWith(prefix)) {
      const suffix = p.patientId.slice(prefix.length);
      const seqNum = parseInt(suffix, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(2, '0');
  const patientId = `${prefix}${seqStr}`;

  return patientId;
};

/**
 * Generates an order ID in the format ORD-XXXX.
 * 
 * @returns {Promise<string>} - The generated order ID.
 */
export const generateOrderId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: 'orderId' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `ORD-${String(counter.value).padStart(4, '0')}`;
};
