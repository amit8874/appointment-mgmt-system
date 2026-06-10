import { sendWhatsAppTemplate } from '../services/whatsappService.js';
import dotenv from 'dotenv';
dotenv.config();

// We can test sanitizeTemplateParam via a small wrapper or direct import if it was exported,
// but since it's a private function, let's mock/test it by calling sendWhatsAppTemplate and checking the output parameters.
// Wait! Let's mock axios and call sendWhatsAppTemplate to see the payload.

import axios from 'axios';

let lastPayload = null;
axios.post = async (url, data, config) => {
  lastPayload = data;
  return { data: { messages: [{ id: 'test-msg-id' }] } };
};

async function test() {
  console.log("Testing safety parameter fallbacks in sendWhatsAppTemplate...");
  
  // Test with undefined/null/empty strings
  await sendWhatsAppTemplate(
    '919876543210',
    'test_template',
    'en',
    [
      undefined,
      null,
      '',
      '   ',
      'Valid String'
    ]
  );

  const parameters = lastPayload.template.components[0].parameters;
  console.log("Parameters received by Meta API payload:");
  console.log(JSON.stringify(parameters, null, 2));

  const allPassed = 
    parameters[0].text === 'N/A' &&
    parameters[1].text === 'N/A' &&
    parameters[2].text === 'N/A' &&
    parameters[3].text === 'N/A' &&
    parameters[4].text === 'Valid String';

  if (allPassed) {
    console.log("SUCCESS: All empty/undefined template parameters fallback to 'N/A' properly!");
    process.exit(0);
  } else {
    console.error("FAIL: Fallback mapping is incorrect.");
    process.exit(1);
  }
}

test().catch(console.error);
