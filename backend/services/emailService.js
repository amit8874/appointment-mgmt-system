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
