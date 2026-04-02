import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends a WhatsApp message using the Meta WhatsApp Cloud API.
 * 
 * @param {string} phone - Sanitized phone number (e.g., 919876543210)
 * @param {string} message - The text message to send
 * @returns {Promise<object>} - Axios response data
 */
export const sendWhatsAppMessage = async (phone, message) => {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_TOKEN or PHONE_NUMBER_ID is missing in environment variables.");
  }

  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "text",
    text: {
      preview_url: false,
      body: message,
    },
  };

  const config = {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
  };

  try {
    console.log(`[WhatsApp Service] Sending message to ${phone}...`);
    const response = await axios.post(url, data, config);
    console.log(`[WhatsApp Service] Success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[WhatsApp Service] Error sending message:`, error.response?.data || error.message);
    throw error;
  }
};
