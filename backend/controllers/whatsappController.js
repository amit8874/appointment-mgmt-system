import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { sanitizePhone } from '../utils/phoneUtils.js';

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
