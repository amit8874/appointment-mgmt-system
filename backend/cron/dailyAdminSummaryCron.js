import cron from 'node-cron';
import Organization from '../models/Organization.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import User from '../models/User.js';
import { sendWhatsAppTemplate } from '../services/whatsappService.js';
import { sendDailyAppointmentSummaryEmail } from '../services/emailService.js';

/**
 * Execute the Daily Admin Summary Job manually or via Cron
 */
export const runDailyAdminSummaryJob = async () => {
    console.log(`[Cron] Executing Daily Admin Summary Job at ${new Date().toISOString()}...`);
    
    try {
        // Get today's date in YYYY-MM-DD in Asia/Kolkata timezone
        const d = new Date();
        // Adjust to Asia/Kolkata offset (+5:30 = 330 minutes)
        const kolkataTime = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
        const todayStr = kolkataTime.toISOString().split('T')[0]; // "YYYY-MM-DD"
        
        // Format nice human readable date (e.g. 19 May 2026)
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        const humanDateStr = kolkataTime.toLocaleDateString('en-IN', options);

        console.log(`[Cron] Fetching appointments for today: ${todayStr} (${humanDateStr})`);

        // Fetch all active/trial organizations
        const organizations = await Organization.find({
            status: { $in: ['active', 'trial'] }
        });

        if (organizations.length === 0) {
            console.log('[Cron] No active/trial organizations found.');
            return;
        }

        console.log(`[Cron] Found ${organizations.length} organizations to process.`);

        for (const org of organizations) {
            try {
                const orgId = org._id;

                // Fetch today's confirmed appointments for this organization
                const appointments = await ConfirmedAppointment.find({
                    organizationId: orgId,
                    status: 'confirmed',
                    $or: [
                        { date: todayStr },
                        { appointmentDate: todayStr }
                    ]
                }).sort({ time: 1 }); // Sort by time

                const appointmentsCount = appointments.length;

                // Fetch the owner/admin user details
                const owner = await User.findById(org.ownerId);
                const adminName = owner?.name || 'Admin';
                const adminEmail = org.email || owner?.email;
                const adminPhone = org.phone || owner?.mobile;

                if (!adminEmail && !adminPhone) {
                    console.log(`[Cron] Skipping organization ${org.name} (${orgId}) - No email or phone contacts.`);
                    continue;
                }

                console.log(`[Cron] Organization: ${org.name} | Total Appointments Today: ${appointmentsCount}`);

                // 1. Send Email Notification if email is available
                if (adminEmail) {
                    console.log(`[Cron] Sending Daily Summary Email to ${adminEmail}...`);
                    await sendDailyAppointmentSummaryEmail(
                        adminEmail,
                        adminName,
                        org.name,
                        humanDateStr,
                        appointmentsCount,
                        appointments
                    );
                }

                // 2. Send WhatsApp Notification if phone is available
                if (adminPhone) {
                    let whatsappMobile = adminPhone.replace(/\D/g, ''); // Remove non-digits
                    if (whatsappMobile.length === 10) {
                        whatsappMobile = `91${whatsappMobile}`; // Default to Indian country code
                    }

                    console.log(`[Cron] Sending Daily Summary WhatsApp to ${whatsappMobile}...`);
                    
                    // Body parameters matching Meta WhatsApp Template:
                    // {{1}}: Recipient Name (e.g. adminName)
                    // {{2}}: Today's Date (e.g. humanDateStr)
                    // {{3}}: Clinic / Organization Name (e.g. org.name)
                    // {{4}}: Number of appointments today (e.g. appointmentsCount) with patient name - slot details
                    let appointmentDetailsStr = '';
                    if (appointments.length > 0) {
                        const details = appointments.map(appt => {
                            const patientName = appt.patientName || 'Unknown Patient';
                            const timeSlot = appt.time || appt.appointmentTime || 'N/A';
                            return `${patientName} - ${timeSlot}`;
                        }).join(', ');
                        appointmentDetailsStr = ` (${details})`;
                    }

                    const templateParams = [
                        adminName,
                        humanDateStr,
                        org.name,
                        `${appointmentsCount}${appointmentDetailsStr}`
                    ];

                    const response = await sendWhatsAppTemplate(
                        whatsappMobile,
                        'daily_appointment_summary',
                        'en',
                        templateParams,
                        [],
                        {
                            organizationId: orgId,
                            chargeCredit: true,
                            messageType: 'DAILY_ADMIN_SUMMARY',
                            relatedEntityType: 'Organization',
                            relatedEntityId: orgId,
                            metadata: {
                                source: 'dailyAdminSummaryCron',
                                templateName: 'daily_appointment_summary'
                            }
                        }
                    ).catch(err => {
                        console.error(`[Cron] WhatsApp send failed for ${org.name}:`, err.message);
                    });

                    if (response && response.messages) {
                        console.log(`[Cron] Daily Summary WhatsApp sent successfully to ${whatsappMobile}`);
                    }
                }

            } catch (orgError) {
                console.error(`[Cron] Error processing daily summary for organization ${org.name}:`, orgError);
            }
        }

        console.log('[Cron] Daily Admin Summary cycle complete.');

    } catch (error) {
        console.error('[Cron] Error in Daily Admin Summary job execution:', error);
        throw error;
    }
};

/**
 * Setup cron jobs for Daily Admin Appointment Summary
 * Default: Runs at 8:00 AM every day in Asia/Kolkata
 */
export const setupDailyAdminSummaryCron = () => {
    const schedule = process.env.DAILY_SUMMARY_SCHEDULE || '0 8 * * *';
    
    cron.schedule(schedule, async () => {
        await runDailyAdminSummaryJob();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log(`[Cron] Daily Admin Summary cron job scheduled (${schedule} Asia/Kolkata)`);
};
