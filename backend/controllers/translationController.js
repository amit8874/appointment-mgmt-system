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
      6. If the target language is "Hinglish", provide a phonetic Hindi translation written in Roman script.
      
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
