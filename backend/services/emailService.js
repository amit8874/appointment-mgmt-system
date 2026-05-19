import nodemailer from 'nodemailer';

/**
 * Send an email notification when a new organization (clinic) registers.
 * @param {Object} orgData - The organization data.
 * @param {Object} ownerData - The owner (user) data.
 */
export const sendClinicRegistrationNotification = async (orgData, ownerData) => {
    try {
        // Create a transporter
        // Note: For Gmail, you need to use an "App Password" if 2FA is enabled
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'amitmaurya3276@gmail.com', // Default to the target email if not specified
                pass: process.env.EMAIL_PASS // User must provide this in .env
            }
        });

        const mailOptions = {
            from: `"Oviaan Platform" <${process.env.EMAIL_USER || 'amitmaurya3276@gmail.com'}>`,
            to: 'amitmaurya3276@gmail.com',
            subject: `🚀 New Clinic Registration: ${orgData.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                    <div style="background: #1e293b; padding: 20px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">New Registration Alert</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p>A new clinic has just registered on <strong>Oviaan Professional</strong>.</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Clinic Details</h3>
                            <p style="margin: 5px 0;"><strong>Name:</strong> ${orgData.name}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${orgData.email}</p>
                            <p style="margin: 5px 0;"><strong>Phone:</strong> ${orgData.phone}</p>
                            <p style="margin: 5px 0;"><strong>Subdomain:</strong> ${orgData.subdomain}.oviaan.pro</p>
                            <p style="margin: 5px 0;"><strong>Address:</strong> ${orgData.address?.street || 'N/A'}, ${orgData.address?.city || ''}, ${orgData.address?.state || ''}</p>
                        </div>

                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                            <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Owner Details</h3>
                            <p style="margin: 5px 0;"><strong>Name:</strong> ${ownerData.name}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${ownerData.email}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> ${ownerData.plainPassword || '********'}</p>
                        </div>
                        
                        <p style="margin-top: 20px;">You can now contact them to help with onboarding or follow up on their trial.</p>
                    </div>
                    <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                        Sent automatically by Oviaan System Notification Service.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Email Notification] Clinic registration email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('[Email Notification] Error sending registration email:', error);
        return false;
    }
};

/**
 * Send an email notification when a new pharmacy registers.
 * @param {Object} pharmacyData - The pharmacy data.
 */
export const sendPharmacyRegistrationNotification = async (pharmacyData) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'amitmaurya3276@gmail.com',
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"Oviaan Platform" <${process.env.EMAIL_USER || 'amitmaurya3276@gmail.com'}>`,
            to: 'amitmaurya3276@gmail.com',
            subject: `💊 New Pharmacy Registration: ${pharmacyData.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                    <div style="background: #10b981; padding: 20px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">Pharmacy Registration Alert</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p>A new pharmacy has just requested registration on <strong>Oviaan Professional</strong>.</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Pharmacy Details</h3>
                            <p style="margin: 5px 0;"><strong>Name:</strong> ${pharmacyData.name}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${pharmacyData.email}</p>
                            <p style="margin: 5px 0;"><strong>Phone:</strong> ${pharmacyData.phone}</p>
                            <p style="margin: 5px 0;"><strong>Owner/Contact:</strong> ${pharmacyData.ownerName}</p>
                            <p style="margin: 5px 0;"><strong>Address:</strong> ${pharmacyData.address?.street || 'N/A'}, ${pharmacyData.address?.city || ''}, ${pharmacyData.address?.state || ''}</p>
                        </div>
                        
                        <p style="margin-top: 20px;">Review this request in the Super Admin panel to approve and create their account.</p>
                    </div>
                    <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                        Sent automatically by Oviaan System Notification Service.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Email Notification] Pharmacy registration email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('[Email Notification] Error sending pharmacy registration email:', error);
        return false;
    }
};

/**
 * Send a prescription to a patient via email.
 */
export const sendPrescriptionEmail = async (patientEmail, patientName, notes, clinicName, pdfBuffer = null) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'amitmaurya3276@gmail.com',
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"${clinicName || 'Oviaan Clinic'}" <${process.env.EMAIL_USER || 'amitmaurya3276@gmail.com'}>`,
            to: patientEmail,
            subject: `📄 Prescription from ${clinicName || 'Oviaan Clinic'}`,
            attachments: pdfBuffer ? [
                {
                    filename: 'Prescription.pdf',
                    content: pdfBuffer
                }
            ] : [],
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <div style="background: #4f46e5; padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Prescription Ready</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Electronic Medical Record</p>
                    </div>
                    <div style="padding: 30px; background: white;">
                        <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${patientName}</strong>,</p>
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 25px;">Your healthcare provider at <strong>${clinicName || 'Oviaan Clinic'}</strong> has issued a digital prescription for you. Please find the details below:</p>
                        
                        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 25px;">
                            <h3 style="margin-top: 0; color: #4f46e5; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">Prescription Notes</h3>
                            <div style="font-size: 14px; white-space: pre-wrap; color: #334155;">${notes}</div>
                        </div>

                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; text-align: center;">This is an automatically generated email. Please do not reply directly to this message.</p>
                    </div>
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
                        &copy; ${new Date().getFullYear()} ${clinicName || 'Oviaan Platform'}. All rights reserved.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Email Service] Prescription email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('[Email Service] Error sending prescription email:', error);
        throw error;
    }
};

/**
 * Send a billing invoice to a patient via email.
 */
export const sendInvoiceEmail = async (patientEmail, patientName, billId, amount, clinicName, pdfBuffer = null) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'amitmaurya3276@gmail.com',
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"${clinicName || 'Oviaan Clinic'}" <${process.env.EMAIL_USER || 'amitmaurya3276@gmail.com'}>`,
            to: patientEmail,
            subject: `🧾 Invoice #${billId} from ${clinicName || 'Oviaan Clinic'}`,
            attachments: pdfBuffer ? [
                {
                    filename: `Invoice-${billId}.pdf`,
                    content: pdfBuffer
                }
            ] : [],
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <div style="background: #10b981; padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Invoice Generated</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Billing & Payments</p>
                    </div>
                    <div style="padding: 30px; background: white;">
                        <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${patientName}</strong>,</p>
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 25px;">Your invoice from <strong>${clinicName || 'Oviaan Clinic'}</strong> has been generated. Please find the summary below:</p>
                        
                        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 25px;">
                            <h3 style="margin-top: 0; color: #10b981; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">Invoice Summary</h3>
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Invoice ID:</strong> #${billId}</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${amount}</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>

                        <p style="font-size: 14px; color: #64748b; margin-bottom: 25px;">The detailed invoice PDF is attached to this email for your records.</p>

                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; text-align: center;">This is an automatically generated email. Please do not reply directly to this message.</p>
                    </div>
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
                        &copy; ${new Date().getFullYear()} ${clinicName || 'Oviaan Platform'}. All rights reserved.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Email Service] Invoice email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('[Email Service] Error sending invoice email:', error);
        throw error;
    }
};

/**
 * Send daily appointment summary to organization admin via email.
 */
export const sendDailyAppointmentSummaryEmail = async (adminEmail, adminName, clinicName, dateStr, appointmentsCount, appointmentsList = []) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'amitmaurya3276@gmail.com',
                pass: process.env.EMAIL_PASS
            }
        });

        // Generate dynamic table rows of today's appointments
        let tableRows = '';
        if (appointmentsList.length > 0) {
            tableRows = appointmentsList.map((app, index) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 10px; font-size: 14px; color: #334155; font-weight: 600;">${index + 1}</td>
                    <td style="padding: 12px 10px; font-size: 14px; color: #334155; font-weight: 600;">${app.patientName || `${app.firstName || ''} ${app.lastName || ''}`.trim() || 'N/A'}</td>
                    <td style="padding: 12px 10px; font-size: 14px; color: #4f46e5; font-weight: 700;">${app.time}</td>
                    <td style="padding: 12px 10px; font-size: 14px; color: #64748b;">Dr. ${app.doctorName || 'N/A'}</td>
                    <td style="padding: 12px 10px; font-size: 14px; color: #64748b;">${app.patientPhone || 'N/A'}</td>
                </tr>
            `).join('');
        } else {
            tableRows = `
                <tr>
                    <td colspan="5" style="padding: 30px; text-align: center; font-size: 14px; color: #94a3b8; font-style: italic;">
                        No appointments scheduled for today.
                    </td>
                </tr>
            `;
        }

        const mailOptions = {
            from: `"Clicnic Platform" <${process.env.EMAIL_USER || 'amitmaurya3276@gmail.com'}>`,
            to: adminEmail,
            subject: `🗓️ Daily Appointment Summary: ${appointmentsCount} Appointments Scheduled`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 35px 20px; text-align: center; color: white;">
                        <span style="background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 15px;">Daily Briefing</span>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">${clinicName}</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; font-weight: 500;">Schedule for ${dateStr}</p>
                    </div>
                    <div style="padding: 30px; background: white;">
                        <p style="font-size: 16px; margin-bottom: 20px; color: #1e293b;">Hello <strong>${adminName}</strong>,</p>
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 25px;">Here is the daily overview of your scheduled appointments for today, <strong>${dateStr}</strong>:</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 25px; text-align: center;">
                            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Total Appointments</span>
                            <h2 style="font-size: 36px; font-weight: 900; margin: 5px 0 0 0; color: #4f46e5;">${appointmentsCount}</h2>
                        </div>

                        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 25px;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                <thead>
                                    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                        <th style="padding: 12px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; width: 30px;">#</th>
                                        <th style="padding: 12px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b;">Patient</th>
                                        <th style="padding: 12px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; width: 80px;">Time</th>
                                        <th style="padding: 12px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b;">Doctor</th>
                                        <th style="padding: 12px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b;">Phone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>

                        <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; text-align: center;">This is an automatically generated daily report. Please do not reply directly to this message.</p>
                    </div>
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
                        &copy; ${new Date().getFullYear()} ${clinicName}. Powered by Clicnic. All rights reserved.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Email Service] Daily Appointment Summary email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('[Email Service] Error sending daily summary email:', error);
        return false;
    }
};
