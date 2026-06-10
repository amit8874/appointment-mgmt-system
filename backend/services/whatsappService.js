import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import FormData from 'form-data';
import { ensureOrganizationHasCredits, deductCredits } from './whatsappCreditService.js';

dotenv.config();

/**
 * Sanitizes template parameters to comply with Meta WhatsApp API restrictions.
 * - Replaces newlines/tabs with spaces
 * - Limits consecutive spaces to 4
 */
const sanitizeTemplateParam = (val) => {
  if (val === undefined || val === null) return "N/A";
  const str = val.toString()
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s{5,}/g, '    ')
    .trim();
  return str === "" ? "N/A" : str;
};

/**
 * Sends a WhatsApp message using the Meta WhatsApp Cloud API.
 * 
 * @param {string} phone - Sanitized phone number (e.g., 919876543210)
 * @param {string} message - The text message to send
 * @param {object} options - Credit related options
 * @returns {Promise<object>} - Axios response data
 */
export const sendWhatsAppMessage = async (phone, message, options = {}) => {
  const { 
    organizationId, 
    chargeCredit = false, 
    messageType, 
    relatedEntityType, 
    relatedEntityId, 
    createdBy, 
    metadata = {},
    io 
  } = options;



  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_TOKEN or PHONE_NUMBER_ID is missing in environment variables.");
  }

  // Pre-send credit check
  if (chargeCredit) {
    if (!organizationId) throw new Error("organizationId is required when chargeCredit is true");
    const check = await ensureOrganizationHasCredits(organizationId, 1);
    if (!check.allowed) {
      const error = new Error(check.message);
      error.code = "INSUFFICIENT_WHATSAPP_CREDITS";
      error.responseData = {
        success: false,
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        message: check.message
      };
      throw error;
    }
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

    // Post-success credit deduction
    if (chargeCredit) {
      const whatsappMessageId = response.data?.messages?.[0]?.id;
      await deductCredits({
        orgId: organizationId,
        credits: 1,
        messageType,
        relatedEntityType,
        relatedEntityId,
        createdBy,
        description: `${messageType || 'Patient'} WhatsApp message sent`,
        metadata: {
          ...metadata,
          whatsappMessageId,
          phone,
          io
        }
      });
    }

    return response.data;
  } catch (error) {
    console.error(`[WhatsApp Service] Error sending message:`, error.response?.data || error.message);
    
    // If it's a pre-check credit error, rethrow it
    if (error.code === "INSUFFICIENT_WHATSAPP_CREDITS") {
      throw error;
    }
    
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
 * @param {object} options - Credit related options
 * @returns {Promise<object>} - Axios response data
 */
export const sendWhatsAppTemplate = async (phone, templateName, languageCode = 'en', bodyParameters = [], buttonParameters = [], options = {}) => {
  const { 
    organizationId, 
    chargeCredit = false, 
    messageType, 
    relatedEntityType, 
    relatedEntityId, 
    createdBy, 
    metadata = {},
    io 
  } = options;

  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_TOKEN or PHONE_NUMBER_ID is missing in environment variables.");
  }

  // Pre-send credit check
  if (chargeCredit) {
    if (!organizationId) throw new Error("organizationId is required when chargeCredit is true");
    const check = await ensureOrganizationHasCredits(organizationId, 1);
    if (!check.allowed) {
      const error = new Error(check.message);
      error.code = "INSUFFICIENT_WHATSAPP_CREDITS";
      error.responseData = {
        success: false,
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        message: check.message
      };
      throw error;
    }
  }

  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const parameters = bodyParameters.map(val => ({
    type: "text",
    text: sanitizeTemplateParam(val)
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
        text: sanitizeTemplateParam(val)
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

    // Post-success credit deduction
    if (chargeCredit) {
      const whatsappMessageId = response.data?.messages?.[0]?.id;
      await deductCredits({
        orgId: organizationId,
        credits: 1,
        messageType,
        relatedEntityType,
        relatedEntityId,
        createdBy,
        description: `${messageType || 'Template'} WhatsApp message sent`,
        metadata: {
          ...metadata,
          whatsappMessageId,
          templateName,
          phone,
          io
        }
      });
    }

    return response.data;
  } catch (error) {
    console.error(`[WhatsApp Service] Template Error:`, error.response?.data || error.message);

    // If it's a pre-check credit error, rethrow it
    if (error.code === "INSUFFICIENT_WHATSAPP_CREDITS") {
      throw error;
    }

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
 * @param {object} options - Credit related options
 * @returns {Promise<object>} - Axios response data
 */
export const sendWhatsAppMediaTemplate = async (phone, templateName, mediaUrl, mediaType = 'document', languageCode = 'en', bodyParameters = [], filename = 'Invoice.pdf', options = {}) => {
  const { 
    organizationId, 
    chargeCredit = false, 
    messageType, 
    relatedEntityType, 
    relatedEntityId, 
    createdBy, 
    metadata = {},
    io 
  } = options;

  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('WHATSAPP_TOKEN or PHONE_NUMBER_ID is missing.');
  }

  // Pre-send credit check
  if (chargeCredit) {
    if (!organizationId) throw new Error("organizationId is required when chargeCredit is true");
    const check = await ensureOrganizationHasCredits(organizationId, 1);
    if (!check.allowed) {
      const error = new Error(check.message);
      error.code = "INSUFFICIENT_WHATSAPP_CREDITS";
      error.responseData = {
        success: false,
        code: "INSUFFICIENT_WHATSAPP_CREDITS",
        message: check.message
      };
      throw error;
    }
  }

  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const bodyParams = bodyParameters.map(val => ({
    type: 'text',
    text: sanitizeTemplateParam(val)
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
                ...(options.mediaId ? { id: options.mediaId } : { link: mediaUrl }),
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
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    console.log(`[WhatsApp Service] Sending media template '${templateName}' (${mediaType}) to ${phone}...`);
    console.log(`[WhatsApp Service] Media URL: ${mediaUrl}`);
    console.log(`[WhatsApp Service] Media Request Body:`, JSON.stringify(data, null, 2));
    
    const response = await axios.post(url, data, config);
    console.log(`[WhatsApp Service] Media Success:`, response.data);

    // Post-success credit deduction
    if (chargeCredit) {
      const whatsappMessageId = response.data?.messages?.[0]?.id;
      await deductCredits({
        orgId: organizationId,
        credits: 1,
        messageType,
        relatedEntityType,
        relatedEntityId,
        createdBy,
        description: `${messageType || 'Media'} WhatsApp message sent`,
        metadata: {
          ...metadata,
          whatsappMessageId,
          templateName,
          phone,
          io
        }
      });
    }

    return response.data;
  } catch (error) {
    console.error('[WhatsApp Service] Media Error:', error.response?.data || error.message);

    // If it's a pre-check credit error, rethrow it
    if (error.code === "INSUFFICIENT_WHATSAPP_CREDITS") {
      throw error;
    }

    throw error;
  }
};

/**
 * Uploads a local file to the WhatsApp Cloud API media endpoint.
 * 
 * @param {string} filePath - Local absolute path to the file
 * @param {string} mimeType - The file's MIME type (e.g., 'application/pdf')
 * @returns {Promise<string>} - The returned mediaId from Meta
 */
export const uploadWhatsAppMediaFromFile = async (filePath, mimeType = "application/pdf") => {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_TOKEN or PHONE_NUMBER_ID is missing.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/media`;

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', fs.createReadStream(filePath));
  form.append('type', mimeType);

  try {
    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
    });

    const mediaId = response.data.id;
    console.log(`[WhatsApp Media Upload] Success mediaId: ${mediaId}`);
    return mediaId;
  } catch (error) {
    console.error(`[WhatsApp Media Upload] Error:`, error.response?.data || error.message);
    throw error;
  }
};

