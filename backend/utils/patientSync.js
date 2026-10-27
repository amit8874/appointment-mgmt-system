import mongoose from 'mongoose';
import Billing from '../models/Billing.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import DentalLabCase from '../models/DentalLabCase.js';
import DentalLabExpense from '../models/DentalLabExpense.js';
import FollowUpReminder from '../models/FollowUpReminder.js';

import { cleanPatientName } from './nameUtils.js';

/**
 * Synchronizes updated patient data to billing records and all appointment records.
 * @param {string} tenantId - The organization/tenant ID
 * @param {string} patientIdStr - The custom sequential patient ID (e.g. "000311")
 * @param {string|mongoose.Types.ObjectId} patientDbId - The MongoDB ObjectId of the patient
 * @param {object} updateFields - The fields that were updated
 */
export const syncPatientDataToDependents = async (tenantId, patientIdStr, patientDbId, updateFields) => {
  try {
    const promises = [];
    const billingUpdate = {};
    const appointmentUpdate = {};

    const queryIds = [patientIdStr, patientDbId?.toString()].filter(Boolean);
    if (queryIds.length === 0) return;

    const billingQuery = { organizationId: tenantId, patientId: { $in: queryIds } };
    const appointmentQuery = { organizationId: tenantId, patientId: { $in: queryIds } };

    // Sync Custom Patient ID across models that store string patientId
    const isPatientIdChanged = updateFields.patientId && String(updateFields.patientId).trim() !== String(patientIdStr).trim();
    if (isPatientIdChanged) {
      const newCustomId = String(updateFields.patientId).trim();
      billingUpdate.patientId = newCustomId;
      appointmentUpdate.patientId = newCustomId;

      // DentalLabExpense also stores patientId as a string
      if (DentalLabExpense) {
        promises.push(
          DentalLabExpense.updateMany(
            { organizationId: tenantId, patientId: { $in: queryIds } },
            { $set: { patientId: newCustomId } }
          )
        );
      }
    }

    // Sync Patient Name
    let cleanName = null;
    if (updateFields.fullName) {
      cleanName = cleanPatientName(updateFields.fullName);
      billingUpdate.patientName = cleanName;
      appointmentUpdate.patientName = cleanName;
      
      const nameParts = cleanName.trim().split(' ');
      appointmentUpdate.firstName = nameParts[0] || 'Patient';
      appointmentUpdate.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    } else if (updateFields.firstName || updateFields.lastName) {
      const first = updateFields.firstName || '';
      const last = updateFields.lastName || '';
      cleanName = cleanPatientName(`${first} ${last}`);
      billingUpdate.patientName = cleanName;
      appointmentUpdate.patientName = cleanName;
      appointmentUpdate.firstName = first;
      appointmentUpdate.lastName = last;
    }

    if (cleanName) {
      // Sync patient name to DentalLabExpense (stores string patientId)
      if (DentalLabExpense) {
        promises.push(
          DentalLabExpense.updateMany(
            { organizationId: tenantId, patientId: { $in: queryIds } },
            { $set: { patientName: cleanName } }
          )
        );
      }

      // Sync patient name to DentalLabCase & FollowUpReminder using valid ObjectId
      if (patientDbId && mongoose.Types.ObjectId.isValid(patientDbId)) {
        if (DentalLabCase) {
          promises.push(
            DentalLabCase.updateMany(
              { organizationId: tenantId, patientId: patientDbId },
              { $set: { patientName: cleanName } }
            )
          );
        }
        if (FollowUpReminder) {
          promises.push(
            FollowUpReminder.updateMany(
              { organizationId: tenantId, patientId: patientDbId },
              { $set: { customPatientName: cleanName } }
            )
          );
        }
      }
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

    // Queue Billing updates
    if (Object.keys(billingUpdate).length > 0) {
      promises.push(Billing.updateMany(billingQuery, { $set: billingUpdate }));
    }

    // Queue Appointment updates
    if (Object.keys(appointmentUpdate).length > 0) {
      promises.push(Appointment.updateMany(appointmentQuery, { $set: appointmentUpdate }));
      promises.push(PendingAppointment.updateMany(appointmentQuery, { $set: appointmentUpdate }));
      promises.push(ConfirmedAppointment.updateMany(appointmentQuery, { $set: appointmentUpdate }));
      promises.push(CancelledAppointment.updateMany(appointmentQuery, { $set: appointmentUpdate }));
    }

    // Sync Appointment Date & Time if updated
    if (updateFields.appointmentDate || updateFields.lastVisit) {
      const targetDate = updateFields.appointmentDate || updateFields.lastVisit;
      const targetTime = updateFields.appointmentTime;
      const specificApptId = updateFields.appointmentId;

      const apptSet = { date: targetDate, appointmentDate: targetDate, status: 'confirmed' };
      if (targetTime) apptSet.time = targetTime;

      const syncAppointments = async () => {
        try {
          if (specificApptId && mongoose.Types.ObjectId.isValid(specificApptId)) {
            await Promise.all([
              Appointment.updateOne({ _id: specificApptId }, { $set: apptSet }),
              PendingAppointment.updateOne({ _id: specificApptId }, { $set: apptSet }),
              ConfirmedAppointment.updateOne({ _id: specificApptId }, { $set: apptSet })
            ]);
          } else {
            const [pendingAppts, confirmedAppts, otherAppts] = await Promise.all([
              PendingAppointment.find(appointmentQuery).sort({ createdAt: -1 }).limit(1),
              ConfirmedAppointment.find(appointmentQuery).sort({ createdAt: -1 }).limit(1),
              Appointment.find(appointmentQuery).sort({ createdAt: -1 }).limit(1)
            ]);

            const allAppts = [...pendingAppts, ...confirmedAppts, ...otherAppts];
            if (allAppts.length > 0) {
              allAppts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
              const targetAppt = allAppts[0];
              await Promise.all([
                Appointment.updateOne({ _id: targetAppt._id }, { $set: apptSet }),
                PendingAppointment.updateOne({ _id: targetAppt._id }, { $set: apptSet }),
                ConfirmedAppointment.updateOne({ _id: targetAppt._id }, { $set: apptSet })
              ]);
            }
          }

          const latestBill = await Billing.findOne(billingQuery).sort({ createdAt: -1 });
          if (latestBill) {
            const billSet = { appointmentDate: targetDate };
            if (targetTime) billSet.appointmentTime = targetTime;
            await Billing.updateOne({ _id: latestBill._id }, { $set: billSet });
          }
        } catch (apptSyncErr) {
          console.error('[SYNC ERROR] Error syncing appointment date to dependents:', apptSyncErr);
        }
      };

      promises.push(syncAppointments());
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[SYNC SUCCESS] Propagated patient profile updates (patientId: ${patientIdStr} -> ${updateFields.patientId || patientIdStr}, _id: ${patientDbId}) to dependent Billing, Appointments & records.`);
    }
  } catch (error) {
    console.error('[SYNC ERROR] Failed to sync patient data to dependents:', error);
  }
};
