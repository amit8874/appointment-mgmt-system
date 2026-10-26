import mongoose from 'mongoose';
import Billing from '../models/Billing.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import DentalTreatment from '../models/DentalTreatment.js';
import DentalImage from '../models/DentalImage.js';
import MedicalRecord from '../models/MedicalRecord.js';
import PatientClinicalNote from '../models/PatientClinicalNote.js';
import PatientProgressImage from '../models/PatientProgressImage.js';
import PatientProgressComparison from '../models/PatientProgressComparison.js';
import FollowUpReminder from '../models/FollowUpReminder.js';
import DentalLabCase from '../models/DentalLabCase.js';

import { cleanPatientName } from './nameUtils.js';

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

    // Sync Custom Patient ID
    if (updateFields.patientId && String(updateFields.patientId).trim() !== String(patientIdStr).trim()) {
      const newCustomId = String(updateFields.patientId).trim();
      billingUpdate.patientId = newCustomId;
      appointmentUpdate.patientId = newCustomId;
    }

    // Sync Patient Name
    if (updateFields.fullName) {
      const cleanName = cleanPatientName(updateFields.fullName);
      billingUpdate.patientName = cleanName;
      appointmentUpdate.patientName = cleanName;
      
      const nameParts = cleanName.trim().split(' ');
      appointmentUpdate.firstName = nameParts[0] || 'Patient';
      appointmentUpdate.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    } else if (updateFields.firstName || updateFields.lastName) {
      const first = updateFields.firstName || '';
      const last = updateFields.lastName || '';
      const constructedName = cleanPatientName(`${first} ${last}`);
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

    // If patientId itself was changed, update other clinical record collections too
    if (updateFields.patientId && String(updateFields.patientId).trim() !== String(patientIdStr).trim()) {
      const newCustomId = String(updateFields.patientId).trim();
      const clinicalModels = [
        DentalTreatment,
        DentalImage,
        MedicalRecord,
        PatientClinicalNote,
        PatientProgressImage,
        PatientProgressComparison,
        FollowUpReminder,
        DentalLabCase
      ];
      for (const model of clinicalModels) {
        if (model) {
          promises.push(model.updateMany({ organizationId: tenantId, patientId: { $in: queryIds } }, { $set: { patientId: newCustomId } }));
        }
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[SYNC SUCCESS] Propagated patient profile updates (patientId: ${patientIdStr} -> ${updateFields.patientId || patientIdStr}, _id: ${patientDbId}) to dependent Billing, Appointments & Clinical records.`);
    }
  } catch (error) {
    console.error('[SYNC ERROR] Failed to sync patient data to dependents:', error);
  }
};
