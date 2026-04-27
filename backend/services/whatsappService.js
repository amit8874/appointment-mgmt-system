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

/**
 * Sends a WhatsApp Template message (required for Business-Initiated conversations like OTPs).
 * 
 * @param {string} phone - Sanitized phone number (e.g., 919876543210)
 * @param {string} templateName - Name of the approved template (e.g., 'registration_otp')
 * @param {string} languageCode - Language code (e.g., 'hi' or 'en_US')
 * @param {Array} bodyParameters - Array of values for {{1}}, {{2}}, etc. in body
 * @param {Array} buttonParameters - Array of values for dynamic buttons (index 0)
 * @returns {Promise<object>} - Axios response data
 */
export const sendWhatsAppTemplate = async (phone, templateName, languageCode = 'en', bodyParameters = [], buttonParameters = []) => {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_TOKEN or PHONE_NUMBER_ID is missing in environment variables.");
  }

  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const parameters = bodyParameters.map(val => ({
    type: "text",
    text: val.toString()
  }));

  const components = [
    {
      type: "body",
      parameters: parameters
    }
  ];

  // Add button parameters if provided (common for URL or Copy-Code buttons)
  if (buttonParameters && buttonParameters.length > 0) {
    components.push({
      type: "button",
      sub_type: "url", // Most common for dynamic OTP links/buttons
      index: "0",
      parameters: buttonParameters.map(val => ({
        type: "text",
        text: val.toString()
      }))
    });
  }

  const data = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: components
    }
  };

  const config = {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
  };

  try {
    console.log(`[WhatsApp Service] Using template: '${templateName}' | Language: '${languageCode}'`);
    console.log(`[WhatsApp Service] Sending template '${templateName}' to ${phone}...`);
    const response = await axios.post(url, data, config);
    console.log(`[WhatsApp Service] Template Success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[WhatsApp Service] Template Error:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Sends a WhatsApp Media Template message (required for sending PDF/Images as business-initiated messages).
 * 
 * @param {string} phone - Sanitized phone number
 * @param {string} templateName - Name of the approved media template
 * @param {string} mediaUrl - Public URL of the PDF or Image
 * @param {string} mediaType - 'document' or 'image'
 * @param {string} languageCode - Language code (e.g., 'en')
 * @param {Array} bodyParameters - Array of values for body placeholders
 * @param {string} filename - Optional filename for documents
 * @returns {Promise<object>} - Axios response data
 */
export const sendWhatsAppMediaTemplate = async (phone, templateName, mediaUrl, mediaType = 'document', languageCode = 'en', bodyParameters = [], filename = 'Invoice.pdf') => {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('WHATSAPP_TOKEN or PHONE_NUMBER_ID is missing.');
  }

  const url = 'https://graph.facebook.com/v22.0/' + PHONE_NUMBER_ID + '/messages';

  const bodyParams = bodyParameters.map(val => ({
    type: 'text',
    text: val.toString()
  }));

  const data = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: mediaType,
              [mediaType]: {
                link: mediaUrl,
                ...(mediaType === 'document' ? { filename } : {})
              }
            }
          ]
        },
        {
          type: 'body',
          parameters: bodyParams
        }
      ]
    }
  };

  const config = {
    headers: {
      Authorization: 'Bearer ' + WHATSAPP_TOKEN,
      'Content-Type': 'application/json',
    },
  };

  try {
    console.log('[WhatsApp Service] Sending media template ' + templateName + ' (' + mediaType + ') to ' + phone + '...');
    const response = await axios.post(url, data, config);
    console.log('[WhatsApp Service] Media Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('[WhatsApp Service] Media Error:', error.response?.data || error.message);
    throw error;
  }
};
