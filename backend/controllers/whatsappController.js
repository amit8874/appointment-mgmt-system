import Groq from "groq-sdk";
import dotenv from "dotenv";
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { sanitizePhone } from '../utils/phoneUtils.js';

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
    const result = await sendWhatsAppMessage(sanitizedPhone, message);

    return res.status(200).json({
      success: true,
      message: "WhatsApp message sent successfully.",
      data: result,
    });
  } catch (error) {
    console.error(`[WhatsApp Controller] Error sending WhatsApp:`, error.response?.data || error.message);
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

    const systemPrompt = `You are a professional medical administrative assistant for Slotify. 
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
 * Sends bulk WhatsApp messages to multiple recipients.
 */
export const bulkSendWhatsApp = async (req, res) => {
  try {
    const { recipients, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: "A list of recipients is required." });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required." });
    }

    console.log(`[WhatsApp Controller] Starting bulk send for ${recipients.length} recipients.`);

    const results = [];
    for (const recipient of recipients) {
      try {
        const sanitizedPhone = sanitizePhone(recipient.phone);
        const result = await sendWhatsAppMessage(sanitizedPhone, message);
        results.push({ phone: recipient.phone, success: true, data: result });
      } catch (err) {
        console.error(`[WhatsApp Controller] Error sending to ${recipient.phone}:`, err.message);
        results.push({ phone: recipient.phone, success: false, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk send completed: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed.`,
      results,
    });
  } catch (error) {
    console.error(`[WhatsApp Controller] Bulk send error:`, error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during bulk sending.",
      error: error.message,
    });
  }
};
