import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export const generateBusinessReport = async (req, res) => {
  try {
    const { category, dashboardData } = req.body;

    if (!dashboardData) {
      return res.status(400).json({ message: 'Dashboard data is required for analysis.' });
    }

    const systemPrompt = `You are Maya, an expert AI Chief Medical Business Analyst. You have a professional, highly encouraging, and deeply analytical tone.
Your job is to read the raw JSON clinic metrics provided by the user, and generate a strategic business report focused on the requested category: "${category}".

RULES:
1. Always format your output in clean, readable Markdown (using ## Headers, **Bold**, and bullet points).
2. Interpret the numbers: Don't just regurgitate the JSON. If revenue is low, state that it's low. If it's high, congratulate them!
3. Actionable Feedback: Provide 3-4 bullet points on how to improve the clinic's performance based on the data.
4. If the clinic seems to be underperforming (e.g., low appointments, high pending payments), offer constructive turnaround strategies.
5. If the clinic is booming (e.g., high appointments, huge revenue), enthusiastically CONGRATULATE the owner, and offer ideas for scaling.
6. CRITICAL CURRENCY RULE: ALWAYS use the Indian Rupee symbol (₹) for all currency and revenue values. NEVER use the Dollar ($) symbol.

Keep your response under 800 words. Focus directly on the "${category}" aspect.`;

    const userPrompt = `Here is our live dashboard data context:\n\n${JSON.stringify(dashboardData, null, 2)}\n\nPlease give me an insightful ${category} analysis!`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1500,
    });

    res.status(200).json({ report: completion.choices[0]?.message?.content || "No analysis generated." });

  } catch (error) {
    console.error('Error generating AI business report:', error);
    res.status(500).json({ message: 'Failed to connect to Maya AI Analyst.' });
  }
};
