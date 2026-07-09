import Billing from '../models/Billing.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';

/**
 * Synchronizes updated patient data to billing records and all appointment records.
 * @param {string} tenantId - The organization/tenant ID
 * @param {string} patientIdStr - The custom sequential patient ID (e.g. "000311")
 * @param {string} patientDbId - The MongoDB ObjectId of the patient
 * @param {object} updateFields - The fields that were updated
 */
export const syncPatientDataToDependents = async (tenantId, patientIdStr, patientDbId, updateFields) => {
  try {
    const billingUpdate = {};
    const appointmentUpdate = {};

    // Sync Patient Name
    if (updateFields.fullName) {
      billingUpdate.patientName = updateFields.fullName;
      appointmentUpdate.patientName = updateFields.fullName;
      
      const nameParts = updateFields.fullName.trim().split(' ');
      appointmentUpdate.firstName = nameParts[0] || 'Patient';
      appointmentUpdate.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    } else if (updateFields.firstName || updateFields.lastName) {
      const first = updateFields.firstName || '';
      const last = updateFields.lastName || '';
      const constructedName = `${first} ${last}`.trim();
      billingUpdate.patientName = constructedName;
      appointmentUpdate.patientName = constructedName;
      appointmentUpdate.firstName = first;
      appointmentUpdate.lastName = last;
    }

    // Sync Patient Phone
    if (updateFields.mobile) {
      billingUpdate.patientPhone = updateFields.mobile;
      appointmentUpdate.patientPhone = updateFields.mobile;
    }

    // Sync Patient Age
    if (updateFields.age !== undefined && updateFields.age !== null) {
      billingUpdate.age = String(updateFields.age);
      appointmentUpdate.patientAge = Number(updateFields.age);
    }

    // Sync Patient Gender
    if (updateFields.gender) {
      billingUpdate.gender = updateFields.gender;
      const genderMap = { male: 'Male', female: 'Female', other: 'Other' };
      appointmentUpdate.gender = genderMap[updateFields.gender.toLowerCase()] || updateFields.gender;
    }

    // Sync Patient Email
    if (updateFields.email) {
      appointmentUpdate.patientEmail = updateFields.email;
    }

    const queryIds = [patientIdStr, patientDbId?.toString()].filter(Boolean);
    if (queryIds.length === 0) return;

    const billingQuery = { organizationId: tenantId, patientId: { $in: queryIds } };
    const appointmentQuery = { organizationId: tenantId, patientId: { $in: queryIds } };

    const promises = [];

    if (Object.keys(billingUpdate).length > 0) {
      promises.push(Billing.updateMany(billingQuery, { $set: billingUpdate }));
    }

    if (Object.keys(appointmentUpdate).length > 0) {
      promises.push(Appointment.updateMany(appointmentQuery, { $set: appointmentUpdate }));
      promises.push(PendingAppointment.updateMany(appointmentQuery, { $set: appointmentUpdate }));
      promises.push(ConfirmedAppointment.updateMany(appointmentQuery, { $set: appointmentUpdate }));
      promises.push(CancelledAppointment.updateMany(appointmentQuery, { $set: appointmentUpdate }));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[SYNC SUCCESS] Propagated patient profile updates (patientId: ${patientIdStr}, _id: ${patientDbId}) to dependent Billing & Appointments.`);
    }
  } catch (error) {
    console.error('[SYNC ERROR] Failed to sync patient data to dependents:', error);
  }
};
