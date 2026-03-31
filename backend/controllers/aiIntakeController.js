import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const parseIntakeTranscript = async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ message: 'Transcript is required' });
    }

    const systemPrompt = `You are an expert AI receptionist assistant for Slotify.
Your explicit job is to extract patient intake details from a potentially messy voice transcript.
You MUST securely extract the data and return it as a JSON object. Return NOTHING ELSE except the raw JSON. Do not wrap it in markdown block quotes.

The expected JSON output schema must correspond exactly to these fields:
{
  "firstName": "Extracted first name. Capitalize first letter. (If unknown, leave as empty string '')",
  "lastName": "Extracted last name. Capitalize first letter. (If unknown, leave as empty string '')",
  "age": "Numeric value of the age (e.g., '32'). Keep it as a string.",
  "ageType": "Must be exactly 'Year', 'Month', or 'Days'. Default to 'Year' if not specified.",
  "gender": "Must be exactly 'Male', 'Female', or 'Other'.",
  "phone": "Extracted 10-digit mobile number. Strip out any spaces or dashes.",
  "doctor": "Extracted doctor's name WITHOUT the 'Dr.' prefix. E.g., if the user says 'Dr. Smith', extract 'Smith'.",
  "symptoms": "Briefly summarize the symptoms or reason for the visit. Make it professional."
}

If any field is completely absent from the dictation, leave it as an empty string ("").
`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Specifically use the agile text processing model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract the details into JSON from this raw receptionist dictation transcript:\n\n"${transcript}"` }
      ],
      temperature: 0.1, // Low temp for highly reproducible data extraction
      response_format: { type: "json_object" }
    });

    const aiResponse = completion.choices[0]?.message?.content;
    let parsedData = {};

    try {
      parsedData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('JSON parsing failed. Raw response:', aiResponse);
      return res.status(500).json({ message: 'Failed to accurately parse AI structure.' });
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error parsing intake transcript:', error);
    res.status(500).json({ message: 'Internal Server Error during AI Parsing' });
  }
};

export const processInteractiveIntake = async (req, res) => {
  try {
    const { transcript, currentState, lastAgentMessage } = req.body;

    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ message: 'Transcript is required' });
    }

    const stateStr = JSON.stringify(currentState || {});
    const agentContext = lastAgentMessage ? `THE AGENT JUST ASKED THIS QUESTION: "${lastAgentMessage}"\nThe user's transcript is likely a direct answer to this specific question.` : '';

    const systemPrompt = `You are a Conversational Medical Receptionist AI.
Your job is to dynamically extract patient details from what the user just said (the transcript) and merge it with the existing recorded state.

${agentContext}

Then, you must check if there are any REQUIRED missing fields. 
The REQUIRED fields to explicitly ask for are EXACTLY: firstName, age, gender, phone, doctor, symptoms.
The OPTIONAL fields are: lastName, ageType.
If the user says they don't know the doctor or have no symptoms, just fill the field with "None" or "Unknown" and move on.

If there are still REQUIRED missing fields (that contain empty strings ""), you must ask a short, natural, conversational question to get ONE of the missing fields (e.g. "Got it. What is their mobile number?").
If all REQUIRED fields are gathered, set "isComplete" to true and return a closing reply (e.g. "Thank you. I have collected all the details. Automatically filling the form now.").

You MUST return a JSON object with this exact schema:
{
  "updatedState": {
    "firstName": "Extracted or existing first name",
    "lastName": "Extracted or existing last name",
    "age": "Numeric age string",
    "ageType": "'Year', 'Month', or 'Days' (Default to 'Year')",
    "gender": "'Male', 'Female', or 'Other'",
    "phone": "Extracted 10-digit mobile number stripped of spaces (must be string)",
    "doctor": "Extracted doctor name without 'Dr.' prefix",
    "symptoms": "Briefly summarized symptoms"
  },
  "reply": "Your next conversational question or closing statement.",
  "isComplete": boolean (true if all required fields are filled, else false)
}

CURRENT EXISTING STATE:
${stateStr}

CRITICAL RULES FOR UPDATING STATE:
1. PRESERVE ALL EXISTING STATE VALUES: If a field in CURRENT EXISTING STATE is already populated (e.g. "firstName": "Neelam"), DO NOT OVERWRITE IT unless the user explicitly uses correction words (like "No, change the first name to...").
2. CONTEXTUAL AWARENESS: Consider the question the Agent just asked! If the Agent asked for the "doctor's name", and the user says "Prashant Singh", you MUST map "Prashant Singh" to the "doctor" field! NEVER map it to "firstName" and "lastName" and destroy the existing patient name.
3. If the user answers the question, securely merge it into updatedState.
4. If the user's transcript gives multiple pieces of data at once (e.g. "Rahul Sharma 45 years male 9876543210"), extract all of them securely so you can skip asking for them!
`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `The receptionist just said: "${transcript}"\nGenerate the updated state and the next reply.` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const aiResponse = completion.choices[0]?.message?.content;
    let parsedData = {};

    try {
      parsedData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('JSON parsing failed. Raw response:', aiResponse);
      return res.status(500).json({ message: 'Failed to accurately parse AI conversational structure.' });
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error processing interactive intake:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
