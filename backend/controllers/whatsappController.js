import Groq from "groq-sdk";
import dotenv from "dotenv";
import { sendWhatsAppMessage, sendWhatsAppTemplate, sendWhatsAppMediaTemplate, uploadWhatsAppMediaFromFile } from '../services/whatsappService.js';
import { ensureOrganizationHasCredits } from '../services/whatsappCreditService.js';
import { sanitizePhone } from '../utils/phoneUtils.js';
import { generatePrescriptionPDF } from '../services/pdfService.js';
import { uploadToS3 } from '../utils/uploadToS3.js';
import Organization from '../models/Organization.js';
import PrescriptionTemplate from '../models/PrescriptionTemplate.js';
import Patient from '../models/PaitentEditProfile.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import mongoose from 'mongoose';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Sends a WhatsApp message from an API endpoint.
 * Validates the input and sanitizes the phone number.
 */
export const sendWhatsApp = async (req, res) => {
  try {
    const { phone, message } = req.body;

    // Validation
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required." });
    }

    // Sanitize phone number to E.164 format
    const sanitizedPhone = sanitizePhone(phone);

    console.log(`[WhatsApp Controller] Sending message to: ${sanitizedPhone}`);

    // Call service to send WhatsApp message
    const result = await sendWhatsAppMessage(sanitizedPhone, message, {
      organizationId: req.tenantId || req.user?.organizationId,
      chargeCredit: true,
      messageType: 'MANUAL_MESSAGE',
      relatedEntityType: 'ManualMessage',
      createdBy: req.user?._id,
      metadata: {
        source: 'whatsappController'
      }
    });

    return res.status(200).json({
      success: true,
      message: "WhatsApp message sent successfully.",
      data: result,
    });
  } catch (error) {
    console.error(`[WhatsApp Controller] Error sending WhatsApp:`, error.response?.data || error.message);
    
    // Return 402 if credits are insufficient
    if (error.code === "INSUFFICIENT_WHATSAPP_CREDITS") {
      return res.status(402).json({
        success: false,
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        message: "Your WhatsApp communication credits are finished. Please recharge to continue sending patient messages."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send WhatsApp message.",
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Uses AI to refine and improve a WhatsApp message draft.
 */
export const improveWhatsAppMessage = async (req, res) => {
  try {
    const { text, patientName } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: "Message text is required." });
    }

    const systemPrompt = `You are a professional medical administrative assistant for Oviaan. 
Your goal is to refine the user's rough notes into a professional, clear, and polite WhatsApp message for a patient.
Keep the tone helpful and concise. If a patient's name is provided, use it gracefully.

USER'S ROUGH NOTE: "${text}"
${patientName ? `PATIENT NAME: ${patientName}` : ""}

GUIDELINES:
- Correct grammar and spelling.
- Use a professional yet warm greeting.
- Ensure the core message of the rough note is preserved.
- Keep it under 250 characters if possible.
- Avoid using placeholders like [Name] if the name IS provided.

Response should ONLY contain the refined message text. No explanations or extra text.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const refinedText = response.choices[0].message.content.trim();

    return res.status(200).json({
      success: true,
      refinedText,
    });
  } catch (error) {
    console.error(`[WhatsApp AI Error]:`, error);
    return res.status(500).json({
      success: false,
      message: "AI was unable to refine the message.",
    });
  }
};



/**
 * Sends a prescription using the approved template.
 */
export const sendPrescriptionWhatsApp = async (req, res) => {
  try {
    const { phone, patientName, notes, clinicName } = req.body;

    if (!phone || !patientName || !notes) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone, patient name, and prescription notes are required." 
      });
    }

    const sanitizedPhone = sanitizePhone(phone);
    const templateName = 'prescription_share';
    const finalClinicName = clinicName || "Oviaan Clinic";

    console.log(`[WhatsApp Controller] Sending prescription template to: ${sanitizedPhone}`);

    // Parameters for template: Hi {{1}}, your prescription from {{2}} is ready. Details: {{3}}. Thank you...
    const bodyParameters = [patientName, finalClinicName, notes];

    const result = await sendWhatsAppTemplate(sanitizedPhone, templateName, 'en', bodyParameters, [], {
      organizationId: req.tenantId || req.user?.organizationId,
      chargeCredit: true,
      messageType: 'PRESCRIPTION_SENT',
      relatedEntityType: 'Prescription',
      createdBy: req.user?._id,
      metadata: {
        source: 'whatsappController',
        templateName
      }
    });

    return res.status(200).json({
      success: true,
      message: "Prescription sent successfully via WhatsApp template.",
      data: result,
    });
  } catch (error) {
    console.error(`[WhatsApp Controller] Error sending prescription:`, error.response?.data || error.message);
    
    // Return 402 if credits are insufficient
    if (error.code === "INSUFFICIENT_WHATSAPP_CREDITS") {
      return res.status(402).json({
        success: false,
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        message: "Your WhatsApp communication credits are finished. Please recharge to continue sending patient messages."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send prescription via WhatsApp template.",
      error: error.response?.data || error.message,
    });
  }
};


/**
 * Generates and sends a high-fidelity Prescription PDF via WhatsApp.
 */
export const sendPrescriptionPdfWhatsApp = async (req, res) => {
  try {
    const { 
      phone, 
      patientId, 
      prescriptionData, 
      templateId,
      organizationId,
      doctorName,
      doctorQualification,
      doctorSpecialization
    } = req.body;

    const orgId = organizationId || req.tenantId || req.user?.organizationId;

    if (!phone || !orgId) {
      return res.status(400).json({ success: false, message: "Phone and Organization ID are required." });
    }

    // 1. Fetch Organization and Patient Details
    const [org, patient] = await Promise.all([
      Organization.findById(orgId),
      Patient.findOne({ patientId, organizationId: orgId })
    ]);

    if (!org) return res.status(404).json({ success: false, message: "Organization not found." });

    // 2. Determine Template
    let template = null;
    if (templateId === 'global_a4') {
      template = { headerType: 'a4', layoutType: 'a4' };
    } else if (templateId && templateId !== 'default' && mongoose.Types.ObjectId.isValid(templateId)) {
      template = await PrescriptionTemplate.findById(templateId);
    } else {
      template = await PrescriptionTemplate.findOne({ organizationId: orgId, isDefault: true });
    }

    // 3. Return Response Early to avoid timeout
    res.status(200).json({
      success: true,
      message: "Prescription is being generated and will be sent via WhatsApp shortly."
    });

    // 4. Dispatch Heavy Tasks in Background
    (async () => {
      try {
        // Generate PDF Buffer
        console.log(`[WhatsApp Background Dispatch] Generating PDF for ${patient?.fullName || 'Patient'}...`);
        const pdfBuffer = await generatePrescriptionPDF(
          prescriptionData, 
          patient, 
          org, 
          template,
          { doctorName, doctorQualification, doctorSpecialization }
        );

        // Upload to S3 for storage
        const fileName = `Prescription-${patient?.fullName?.replace(/\s+/g, '_') || 'Patient'}-${Date.now()}.pdf`;
        const s3Result = await uploadToS3({
          buffer: pdfBuffer,
          originalName: fileName,
          mimeType: 'application/pdf',
          folderType: 'prescriptions',
          organizationId: orgId,
        });

        // Upload to WhatsApp Media API
        const tempPdfPath = path.join(os.tmpdir(), `temp-rx-${Date.now()}.pdf`);
        let mediaId = null;
        try {
          fs.writeFileSync(tempPdfPath, pdfBuffer);
          mediaId = await uploadWhatsAppMediaFromFile(tempPdfPath, "application/pdf");
        } finally {
          if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        }

        const sanitizedPhone = sanitizePhone(phone);
        const whatsappTemplateName = process.env.WHATSAPP_PRESCRIPTION_PDF_TEMPLATE || 'billing_invoice_pdf';
        
        const bodyParameters = [
          patient?.fullName || 'Valued Patient',
          org.clinicName || org.name || 'Our Clinic'
        ];

        console.log(`[WhatsApp Background Dispatch] Sending PDF to ${sanitizedPhone}...`);
        await sendWhatsAppMediaTemplate(
          sanitizedPhone,
          whatsappTemplateName,
          s3Result.signedUrl || s3Result.fileUrl,
          'document',
          'en',
          bodyParameters,
          fileName,
          {
            mediaId,
            organizationId: orgId,
            chargeCredit: true,
            messageType: 'PRESCRIPTION_SENT',
            relatedEntityType: 'Prescription',
            createdBy: req.user?._id,
            metadata: {
              source: 'whatsappController',
              templateName: whatsappTemplateName,
              publicUrl: s3Result.fileUrl,
              mediaId
            }
          }
        );
        console.log(`[WhatsApp Background Dispatch] Successfully sent prescription to ${sanitizedPhone}`);
      } catch (bgError) {
        console.error(`[WhatsApp Background Dispatch Error]:`, bgError.message || bgError);
      }
    })();

  } catch (error) {
    console.error(`[WhatsApp Prescription Error]:`, error);
    
    if (error.code === "INSUFFICIENT_WHATSAPP_CREDITS") {
      return res.status(402).json({
        success: false,
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        message: "Your WhatsApp communication credits are finished. Please recharge to continue."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send Prescription PDF via WhatsApp.",
      error: error.message
    });
  }
};

/**
 * Sends a broadcast update using the approved template: clinic_broadcast_notification
 */
export const sendBroadcastWhatsApp = async (req, res) => {
  try {
    const { phone, patientName, messageText, clinicName } = req.body;

    if (!phone || !patientName || !messageText) {
      return res.status(400).json({
        success: false,
        message: "Phone, patient name, and message text are required."
      });
    }

    const sanitizedPhone = sanitizePhone(phone);
    const templateName = 'clinic_broadcast_notification';
    const finalClinicName = clinicName || "Oviaan Clinic";

    console.log(`[WhatsApp Controller] Sending broadcast template to: ${sanitizedPhone}`);

    // Template: Hello {{1}}, here is an update from the doctor: {{2}} Thank you, {{3}} team.
    const bodyParameters = [patientName, messageText, finalClinicName];

    const result = await sendWhatsAppTemplate(sanitizedPhone, templateName, 'en', bodyParameters, [], {
      organizationId: req.tenantId || req.user?.organizationId,
      chargeCredit: true,
      messageType: 'BROADCAST_SENT',
      relatedEntityType: 'Broadcast',
      createdBy: req.user?._id,
      metadata: {
        source: 'whatsappController',
        templateName
      }
    });

    return res.status(200).json({
      success: true,
      message: "Broadcast message sent successfully via WhatsApp template.",
      data: result,
    });
  } catch (error) {
    console.error(`[WhatsApp Controller] Error sending broadcast:`, error.response?.data || error.message);
    
    if (error.code === "INSUFFICIENT_WHATSAPP_CREDITS") {
      return res.status(402).json({
        success: false,
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        message: "Your WhatsApp communication credits are finished. Please recharge to continue sending patient messages."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send broadcast WhatsApp message.",
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Starts a background bulk broadcast campaign for an organization.
 * Responds immediately to the client and executes sequential sends (1-minute gap) in the background.
 */
export const sendBroadcastCampaign = async (req, res) => {
  try {
    const { patients, messageText, clinicName } = req.body;

    if (!patients || !Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ success: false, message: "Patients array is required." });
    }
    if (!messageText) {
      return res.status(400).json({ success: false, message: "Message text is required." });
    }

    const orgId = req.tenantId || req.user?.organizationId;
    const io = req.app.get("io");

    // Respond early to the frontend
    res.status(200).json({
      success: true,
      message: "Broadcast campaign started in background."
    });

    // Execute heavy task in the background
    (async () => {
      console.log(`[Campaign Background] Starting campaign for org ${orgId} to ${patients.length} patients.`);
      
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        
        // Sanitize phone
        let sanitizedPhone;
        try {
          sanitizedPhone = sanitizePhone(p.mobile || p.phone);
        } catch (phoneErr) {
          console.error(`[Campaign Background] Invalid phone for ${p.name}:`, phoneErr.message);
          failedCount++;
          if (io && orgId) {
            io.to(orgId.toString()).emit('broadcast-progress', {
              status: 'progress',
              sentCount,
              failedCount,
              total: patients.length,
              currentPatientName: p.name
            });
          }
          continue;
        }

        try {
          // 1. Verify credits
          const check = await ensureOrganizationHasCredits(orgId, 1);
          if (!check.allowed) {
            console.warn(`[Campaign Background] Insufficient credits for org ${orgId}. Stopping campaign.`);
            if (io && orgId) {
              io.to(orgId.toString()).emit('broadcast-progress', {
                status: 'stopped_low_credits',
                sentCount,
                failedCount,
                message: "Broadcast campaign stopped: Insufficient WhatsApp credits. Please recharge."
              });
            }
            break;
          }

          // 2. Send WhatsApp Template
          const templateName = 'clinic_broadcast_notification';
          const finalClinicName = clinicName || "Smile Dental Care";
          const bodyParameters = [p.name, messageText, finalClinicName];

          await sendWhatsAppTemplate(
            sanitizedPhone,
            templateName,
            'en',
            bodyParameters,
            [],
            {
              organizationId: orgId,
              chargeCredit: true,
              messageType: 'BROADCAST_SENT',
              relatedEntityType: 'Broadcast',
              createdBy: req.user?._id,
              metadata: {
                source: 'campaignBackground',
                templateName
              }
            }
          );

          sentCount++;
          
          // Emit progress update
          if (io && orgId) {
            io.to(orgId.toString()).emit('broadcast-progress', {
              status: 'progress',
              sentCount,
              failedCount,
              total: patients.length,
              currentPatientName: p.name
            });
          }

        } catch (err) {
          console.error(`[Campaign Background] Error sending to ${p.name}:`, err.message);
          failedCount++;
          if (io && orgId) {
            io.to(orgId.toString()).emit('broadcast-progress', {
              status: 'progress',
              sentCount,
              failedCount,
              total: patients.length,
              currentPatientName: p.name
            });
          }
        }

        // Wait 60 seconds (1 minute) if not the last patient
        if (i < patients.length - 1) {
          await sleep(60000);
        }
      }

      // 3. Emit final completed update
      console.log(`[Campaign Background] Completed campaign for org ${orgId}. Sent: ${sentCount}, Failed: ${failedCount}`);
      if (io && orgId) {
        io.to(orgId.toString()).emit('broadcast-completed', {
          sentCount,
          failedCount,
          total: patients.length
        });
      }

    })();

  } catch (error) {
    console.error(`[Campaign Error]`, error);
  }
};
