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

  const counter = await Counter.findOneAndUpdate(
    { name: `patientId_${organizationId}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `PT${String(counter.value).padStart(4, '0')}`;
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
