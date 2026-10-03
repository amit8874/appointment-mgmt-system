import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "gsk_dummy",
});

const DEFAULT_FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

/**
 * Executes a Groq chat completion with automatic model fallback
 * to ensure AI functionality never fails due to model deprecation or tier restrictions.
 */
export const createGroqChatCompletion = async (params) => {
  const preferredModel = process.env.GROQ_MODEL || params.model;
  
  // Deduplicate model list
  const models = Array.from(new Set([preferredModel, ...DEFAULT_FALLBACK_MODELS])).filter(Boolean);

  let lastError;
  for (const model of models) {
    try {
      return await groq.chat.completions.create({
        ...params,
        model
      });
    } catch (err) {
      console.warn(`[Groq Helper] Model '${model}' failed: ${err.message}`);
      lastError = err;
      // If it's a 404 (model not found) or 400 invalid request error for model, fallback to next
      if (err.status && err.status !== 404 && err.status !== 400) {
        throw err;
      }
    }
  }
  throw lastError;
};
