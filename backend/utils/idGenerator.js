import mongoose from 'mongoose';
import Counter from '../models/Counter.js';

/**
 * Generates a unified patient ID in the format PTXXXX.
 * Uses a per-organization counter to ensure sequential IDs.
 * 
 * @param {string} organizationId - The ID of the organization.
 * @returns {Promise<string>} - The generated patient ID.
 */
export const generatePatientId = async (organizationId) => {
  if (!organizationId) {
    throw new Error('Organization ID is required to generate a patient ID');
  }

  const Patient = mongoose.models.Patient || mongoose.model('Patient');
  let isUnique = false;
  let patientId = '';
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    const counter = await Counter.findOneAndUpdate(
      { name: `patientId_${organizationId}` },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );

    patientId = String(counter.value).padStart(6, '0');

    // Secondary uniqueness check to prevent collisions (e.g. from manual/legacy inserts)
    const existingPatient = await Patient.findOne({ organizationId, patientId }).select('_id').lean();
    if (!existingPatient) {
      isUnique = true;
    } else {
      console.warn(`[ID Generator] Patient ID ${patientId} already exists in organization ${organizationId}. Incrementing counter again...`);
    }
  }

  if (!isUnique) {
    throw new Error('Failed to generate a unique patient ID after multiple attempts');
  }

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
