import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Translates clinical advice into a target language while preserving medical accuracy.
 */
export const translateAdvice = async (req, res) => {
  try {
    const { originalAdvice, targetLanguage, sourceLanguage, patientContext } = req.body;

    if (!originalAdvice || !targetLanguage) {
      return res.status(400).json({ message: 'Original advice and target language are required.' });
    }

    const contextStr = patientContext ? `
Patient Context:
- Age: ${patientContext.age}
- Gender: ${patientContext.gender}
- Diagnosis: ${patientContext.diagnosis}
- Complaints: ${patientContext.complaints?.join(', ')}
- Medicines: ${patientContext.medicines?.map(m => m.name).join(', ')}
` : '';

    const systemPrompt = `You are a professional medical translator for Oviaan EMR.
Your task is to translate clinical advice from a doctor into ${targetLanguage}.

CRITICAL RULES:
1. PRESERVE MEDICAL ACCURACY: Do not change any dosages, medicine names, timing, or clinical terms.
2. TRANSLATE PATIENT INSTRUCTIONS: Only translate the instructions meant for the patient into simple, friendly, and clear ${targetLanguage}.
3. KEEP NUMBERS UNCHANGED: Ensure numbers and frequencies remain exactly as provided.
4. TONE: Use a professional yet empathetic tone suitable for a healthcare setting.
5. NO HALLUCINATIONS: Do not add any advice that is not present in the original text.
6. IF UNCLEAR: If the advice is medically nonsensical or extremely unclear, respond with: "Advice unclear, please review."

Return the response as a JSON object:
{
  "translatedAdvice": "The translated text here",
  "language": "${targetLanguage}",
  "notes": "Any brief notes for the doctor (optional)"
}
`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${contextStr}\nOriginal Advice: "${originalAdvice}"\nTranslate to: ${targetLanguage}` }
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
      return res.status(500).json({ message: 'Failed to parse AI translation.' });
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error translating advice:', error);
    res.status(500).json({ message: 'Internal Server Error during AI Translation' });
  }
};

/**
 * Improves clinical advice by converting rough doctor notes into patient-friendly instructions.
 */
export const improveAdvice = async (req, res) => {
  try {
    const { originalAdvice, patientContext } = req.body;

    if (!originalAdvice) {
      return res.status(400).json({ message: 'Original advice is required.' });
    }

    const contextStr = patientContext ? `
Patient Context:
- Age: ${patientContext.age}
- Gender: ${patientContext.gender}
- Diagnosis: ${patientContext.diagnosis}
- Complaints: ${patientContext.complaints?.join(', ')}
` : '';

    const systemPrompt = `You are an expert Clinical Scribe for Oviaan EMR.
Your job is to take rough, potentially shorthand doctor notes and convert them into clear, professional, and patient-friendly instructions.

EXAMPLE:
Rough: "tablet khana ke baad pani jyada no oily"
Improved: "Take the prescribed medicines after food. Drink plenty of water throughout the day. Please avoid oily and spicy food."

CRITICAL RULES:
1. DO NOT ADD MEDICINES: Only work with what the doctor has written.
2. DO NOT CHANGE DOSAGE: Keep any existing dosages exactly as they are.
3. CLEAR & CONCISE: Use simple language that a patient can easily understand.
4. PRESERVE INTENT: Maintain the doctor's specific clinical instructions.
5. IF UNCLEAR: If the notes are too vague to improve safely, return the original text or "Advice unclear, please review."

Return the response as a JSON object:
{
  "improvedAdvice": "The refined text here"
}
`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${contextStr}\nRough Notes: "${originalAdvice}"` }
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
      return res.status(500).json({ message: 'Failed to parse AI improvement.' });
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error improving advice:', error);
    res.status(500).json({ message: 'Internal Server Error during AI Improvement' });
  }
};
