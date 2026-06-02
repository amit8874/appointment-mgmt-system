import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Translate clinical text between languages while preserving medical context
 */
export const translateText = async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required for translation' });
    }

    const prompt = `
      You are a medical translation assistant. 
      Source Language: ${sourceLanguage}
      Target Language: ${targetLanguage}
      
      INSTRUCTIONS:
      1. Translate the clinical text accurately into the target language. 
      2. Preserve all medical meaning, symptoms, dosage, medicine names, timing, duration, doctor advice, and patient details. 
      3. Do NOT summarize. 
      4. Do NOT add new information or diagnosis. 
      5. Keep medicine names exactly as they are unless they are common descriptive terms.
      6. If the target language is "Hindi", use the Devanagari script (e.g., नमस्ते).
      7. If the target language is "Hinglish", provide a phonetic Hindi translation written in Roman script (e.g., Namaste).
      8. Use natural, patient-friendly terms where possible rather than overly formal or literary terms (e.g., translate "Daily" as "रोज़" / "Roj" instead of "दैनिक" / "Dainik").
      
      Return ONLY the translated text without any explanations or headers.

      TEXT TO TRANSLATE:
      ${text}
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-8b-instant', // Current high-speed model
      temperature: 0.1,
    });

    const translatedText = chatCompletion.choices[0]?.message?.content?.trim();

    res.status(200).json({
      success: true,
      translatedText,
      targetLanguage
    });
  } catch (error) {
    console.error('[TranslationController] Translation failed:', error);
    res.status(500).json({ message: 'Translation service failed', error: error.message });
  }
};

/**
 * Structured translation for Prescription Clinical Fields
 * Translates specific fields while preserving medicine names and structure
 */
export const translatePrescription = async (req, res) => {
  try {
    const { medications, complaints, targetLanguage } = req.body;

    if (targetLanguage === 'English') {
      // Still proceed to ensure clinical terms are reverted to English if they were previously translated
    }

    const prompt = `
      Act as a clinical translation expert. You will receive two arrays: Medications and Complaints.
      Target Language: ${targetLanguage}

      TASK:
      1. For Medications: Translate ONLY 'dose', 'when', 'frequency', 'duration', 'composition', and 'genericName'. KEEP 'name' in English.
      2. For Complaints: Translate ONLY 'frequency', 'severity', and 'duration'. KEEP 'name' in English.
      3. Maintain the EXACT JSON structure. 
      4. If target is "Hindi", use the Devanagari script for the translation.
      5. If target is "Hinglish", use Roman script for phonetic Hindi words.
      6. For Hindi/Hinglish Dose patterns, use these specific translations:
         - 0-0-1 -> रात में 1 बार (Hindi) / Raat mein 1 baar (Hinglish)
         - 1-0-1 -> सुबह और रात (Hindi) / Subah aur Raat (Hinglish)
         - 0-1-1 -> दोपहर और रात (Hindi) / Dopahar aur Raat (Hinglish)
         - 1-1-1 -> सुबह, दोपहर, रात (Hindi) / Subah, Dopahar, Raat (Hinglish)
         - 1-0-0 -> सुबह 1 बार (Hindi) / Subah 1 baar (Hinglish)
         - 0-1-0 -> दोपहर 1 बार (Hindi) / Dopahar 1 baar (Hinglish)
         - 1-1-0 -> सुबह और दोपहर (Hindi) / Subah aur Dopahar (Hinglish)
         - 1-1-1-1 -> दिन में 4 बार (Hindi) / Din mein 4 baar (Hinglish)
         - SOS -> ज़रूरत पड़ने पर (Hindi) / Zaroorat padne par (Hinglish)
         - HS -> सोने से पहले (Hindi) / Sone se pehle (Hinglish)
      
      7. For Timing (when) in Hindi/Hinglish:
         - Before Food -> खाने से पहले (Hindi) / Khaane se pehle (Hinglish)
         - After Food -> खाने के बाद (Hindi) / Khaane ke baad (Hinglish)
         - Empty Stomach -> खाली पेट (Hindi) / Khaali pet (Hinglish)
      
      8. For Frequency and general translations in Hindi/Hinglish:
         - Daily / Once Daily -> रोज़ (Hindi) / Roj (Hinglish)
         - Twice Daily (BD) -> दिन में दो बार (Hindi) / Din mein do baar (Hinglish)
         - Thrice Daily (TDS) -> दिन में तीन बार (Hindi) / Din mein teen baar (Hinglish)
         - Use simple, colloquial, patient-friendly terms instead of formal or literary words like "दैनिक" (dainik).

      INPUT DATA:
      Medications: ${JSON.stringify(medications)}
      Complaints: ${JSON.stringify(complaints)}

      Return ONLY a valid JSON object with keys "medications" and "complaints". No markdown, no explanations.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const translatedData = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');

    res.status(200).json({
      success: true,
      ...translatedData
    });

  } catch (error) {
    console.error('[TranslationController] Prescription translation failed:', error);
    res.status(500).json({ success: false, message: 'Translation failed' });
  }
};
