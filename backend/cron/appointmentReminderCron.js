import cron from 'node-cron'; // Corrected casing for import path refresh
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import Organization from '../models/Organization.js';
import { sendWhatsAppTemplate } from '../services/whatsappService.js';

/**
 * Setup cron jobs for Appointment Reminders
 * Default: Runs at 9:00 AM every day in Asia/Kolkata
 */
export const setupAppointmentReminderCron = () => {
    const schedule = process.env.WHATSAPP_REMINDER_SCHEDULE || '0 9 * * *';
    
    cron.schedule(schedule, async () => {
        console.log(`[Cron] Running Appointment Reminders check at ${new Date().toISOString()}...`);
        
        try {
            // Calculate tomorrow's date string
            // We need to match the format used in the database (YYYY-MM-DD or similar)
            // Most JS Date objects convert to ISO strings which start with YYYY-MM-DD
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0]; // "YYYY-MM-DD"
            
            console.log(`[Cron] Searching for appointments on: ${tomorrowStr}`);

            // Find confirmed appointments for tomorrow that haven't been sent the reminder yet
            // We also handle potential variants like DD-MM-YYYY if they exist
            const appointments = await ConfirmedAppointment.find({
                status: 'confirmed',
                whatsappReminderSent: false,
                $or: [
                    { date: tomorrowStr },
                    { appointmentDate: tomorrowStr }
                ]
            });

            if (appointments.length === 0) {
                console.log('[Cron] No appointments found for tomorrow needing reminders.');
                return;
            }

            console.log(`[Cron] Found ${appointments.length} appointments for reminder.`);

            let successCount = 0;
            let failureCount = 0;
            let skipCount = 0;

            for (const app of appointments) {
                if (!app.patientPhone) {
                    console.log(`[Cron] Skipping appointment ${app._id} - No patient phone.`);
                    skipCount++;
                    continue;
                }

                try {
                    // Fetch organization name
                    const org = await Organization.findById(app.organizationId);
                    const clinicName = org?.name || 'our clinic';
                    const patientName = app.patientName || `${app.firstName} ${app.lastName}`.trim() || 'Patient';

                    let whatsappMobile = app.patientPhone;
                    if (whatsappMobile.length === 10) {
                        whatsappMobile = `91${whatsappMobile}`;
                    }

                    // Send WhatsApp Reminder
                    const reminderTemplate = process.env.WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE || 'appointment_reminder';
                    const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'en';

                    const response = await sendWhatsAppTemplate(
                        whatsappMobile,
                        reminderTemplate,
                        templateLang,
                        [
                            patientName,           // {{1}}
                            app.doctorName,        // {{2}}
                            clinicName,            // {{3}}
                            app.date,              // {{4}}
                            app.time               // {{5}}
                        ],
                        [],
                        {
                            organizationId: app.organizationId,
                            chargeCredit: true,
                            messageType: 'APPOINTMENT_REMINDER',
                            relatedEntityType: 'Appointment',
                            relatedEntityId: app._id,
                            metadata: {
                                source: 'appointmentReminderCron',
                                templateName: 'appointment_reminder'
                            }
                        }
                    );

                    if (response && response.messages) {
                        app.whatsappReminderSent = true;
                        await app.save();
                        successCount++;
                        console.log(`[Cron] Reminder sent successfully to ${whatsappMobile} for appointment ${app._id}`);
                    } else {
                        throw new Error('Invalid response from WhatsApp API');
                    }
                } catch (waError) {
                    failureCount++;
                    console.error(`[Cron] Failed to send reminder for appointment ${app._id}:`, waError.message);
                }
            }

            console.log(`[Cron] Reminder Cycle Complete: Total: ${appointments.length}, Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skipCount}`);

        } catch (error) {
            console.error('[Cron] Error in Appointment Reminder cron:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log(`[Cron] Appointment Reminder cron job scheduled (${schedule} Asia/Kolkata)`);
};
