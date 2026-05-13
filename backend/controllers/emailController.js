import { sendPrescriptionEmail } from '../services/emailService.js';
import PrescriptionTemplate from '../models/PrescriptionTemplate.js';
import Organization from '../models/Organization.js';
import Patient from '../models/PaitentEditProfile.js';
import { generatePrescriptionPDF } from '../services/pdfService.js';
import mongoose from 'mongoose';

/**
 * Endpoint to send a prescription to a patient's email.
 */
export const sendPrescriptionMail = async (req, res) => {
    try {
        const { 
            email, 
            patientName, 
            patientId,
            notes, 
            clinicName, 
            organizationId, 
            useTemplate, 
            templateId,
            doctorName,
            doctorQualification,
            doctorSpecialization
        } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Patient email is required." });
        }
        if (!notes) {
            return res.status(400).json({ success: false, message: "Prescription notes are required." });
        }

        const orgId = organizationId || req.tenantId || req.user?.organizationId;
        let pdfBuffer = null;

        // 1. Fetch Organization and Patient Details for context
        const [org, patient] = await Promise.all([
            Organization.findById(orgId),
            patientId ? Patient.findOne({ patientId, organizationId: orgId }) : null
        ]);

        // If useTemplate is requested and organizationId is provided, generate PDF
        if (useTemplate && orgId) {
            try {
                console.log(`[Email Controller] Generating PDF for organization: ${orgId}, template: ${templateId || 'default'}`);
                
                // 2. Determine Template
                let template = null;
                if (templateId && templateId !== 'default' && mongoose.Types.ObjectId.isValid(templateId)) {
                    template = await PrescriptionTemplate.findById(templateId);
                } else {
                    template = await PrescriptionTemplate.findOne({ organizationId: orgId, isDefault: true });
                }
                
                // 3. Generate PDF using unified service
                pdfBuffer = await generatePrescriptionPDF(
                    notes, 
                    patient, 
                    org, 
                    template,
                    { doctorName, doctorQualification, doctorSpecialization }
                );
            } catch (err) {
                console.error("[Email Controller] PDF Generation Failed:", err);
                // Continue sending email without PDF if generation fails
            }
        }

        console.log(`[Email Controller] Sending prescription to: ${email}`);

        const result = await sendPrescriptionEmail(email, patientName || 'Patient', notes, clinicName, pdfBuffer);

        if (result) {
            return res.status(200).json({
                success: true,
                message: "Prescription email sent successfully."
            });
        } else {
            throw new Error("Failed to send email.");
        }
    } catch (error) {
        console.error(`[Email Controller] Error:`, error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to send prescription email.",
            error: error.message
        });
    }
};
