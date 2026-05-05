import Groq from "groq-sdk";
import dotenv from "dotenv";
import Doctor from "../models/Doctor.js";
import Organization from "../models/Organization.js";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Utility for fuzzy matching doctor names
const findSimilarDoctors = (inputName, doctors) => {
  if (!inputName || !doctors.length) return [];
  const cleanInput = inputName.toLowerCase().replace(/dr\.?\s+/g, '').trim();
  
  return doctors
    .map(doc => {
      const docName = doc.name.toLowerCase().replace(/dr\.?\s+/g, '').trim();
      const inputWords = cleanInput.split(/\s+/);
      const docWords = docName.split(/\s+/);
      let matchCount = 0;
      inputWords.forEach(word => {
        if (docName.includes(word) || word.length > 3 && docWords.some(dw => dw.includes(word))) {
          matchCount++;
        }
      });
      const score = matchCount / Math.max(inputWords.length, 1);
      return { doc, score };
    })
    .filter(res => res.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(res => res.doc.name);
};

// GET all unique cities where doctors are located
export const getClinicCities = async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: { $in: ['Active', 'Verified'] } });
    const cities = new Set();
    
    doctors.forEach(doc => {
      if (doc.addressInfo?.city) cities.add(doc.addressInfo.city);
      if (doc.serviceLocation?.address?.city) cities.add(doc.serviceLocation.address.city);
    });
    
    res.json({ cities: Array.from(cities).sort() });
  } catch (err) {
    res.status(500).json({ message: "Error fetching cities" });
  }
};

// Search doctors by city/specialty
export const searchDoctorsForChat = async (req, res) => {
  const { city, specialty, name } = req.query;
  try {
    let query = { status: { $in: ['Active', 'Verified'] } };
    
    if (city) {
      query.$or = [
        { "addressInfo.city": new RegExp(city, 'i') },
        { "serviceLocation.address.city": new RegExp(city, 'i') }
      ];
    }
    
    if (specialty) query.specialization = new RegExp(specialty, 'i');
    if (name) query.name = new RegExp(name, 'i');

    const doctors = await Doctor.find(query).limit(5);
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ message: "Error searching doctors" });
  }
};

export const chatWithMaya = async (req, res) => {
  const { message, history, organizationId, userContext, role } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    let contextInfo = "";
    let doctorList = [];
    let responseMetadata = null;
    let responseType = 'text';

    // 1. Process Context
    if (organizationId) {
      const [org, doctors] = await Promise.all([
        Organization.findById(organizationId).select('name address'),
        Doctor.find({ organizationId, status: { $in: ['Active', 'Verified'] } }).select('name specialization doctorId fee workingHours availability addressInfo serviceLocation photo experience languages')
      ]);
      if (org) contextInfo += `\nCURRENT CLINIC: ${org.name}`;
      doctorList = doctors;
    } else {
      // Landing page: Fetch all active doctors globally
      doctorList = await Doctor.find({ status: { $in: ['Active', 'Verified'] } }).select('name specialization doctorId fee workingHours availability addressInfo serviceLocation photo experience languages');
    }

    // 2. Intent Detection
    const isBookingIntent = /book|appointment|schedule|doctor|visit/i.test(message);
    const isGeneralQuery = /price|pricing|plan|cost|feature|capabilities|what is|how to|register|signup|about|benefit|portal|stakeholder|business/i.test(message);
    
    let cityInMessage = null;
    const cityMatch = message.match(/(?:in|at|for|from|near|to)\s+([a-zA-Z\s]+)/i);
    if (cityMatch) {
      const potentialCity = cityMatch[1].trim();
      const availableCities = Array.from(new Set(doctorList.map(d => (d.addressInfo?.city || d.serviceLocation?.address?.city || "").toLowerCase()).filter(Boolean)));
      const foundCity = availableCities.find(c => potentialCity.toLowerCase().includes(c) || c.includes(potentialCity.toLowerCase()));
      if (foundCity) {
        cityInMessage = Array.from(new Set(doctorList.map(d => d.addressInfo?.city || d.serviceLocation?.address?.city).filter(Boolean))).find(c => c.toLowerCase() === foundCity);
      }
    }

    const uniqueCities = Array.from(new Set(doctorList.map(d => d.addressInfo?.city || d.serviceLocation?.address?.city).filter(Boolean)));

    if ((isBookingIntent || cityInMessage) && !isGeneralQuery) {
      if (!cityInMessage && message.length < 50 && uniqueCities.length > 0) {
        return res.json({ 
          text: "I'll help you book an appointment. Which city are you in?", 
          messageType: 'options',
          metadata: { options: uniqueCities.slice(0, 10).map(c => ({ label: c, value: c })), title: "Select City" }
        });
      } else if (cityInMessage) {
        const matchingDoctors = doctorList.filter(d => (d.addressInfo?.city || d.serviceLocation?.address?.city || "").toLowerCase().includes(cityInMessage.toLowerCase())).slice(0, 5);
        if (matchingDoctors.length > 0) {
          return res.json({ 
            text: `Doctors in ${cityInMessage}:`, 
            messageType: 'doctor_list',
            metadata: { doctors: matchingDoctors.map(d => ({ id: d._id, name: d.name, specialization: d.specialization, photo: d.photo })) }
          });
        }
      }
    }

    const systemPrompt = `You are Maya, AI Ambassador for Oviaan EMR. 
1. WHAT IS OVIAAN? AI-powered PMS for clinics/doctors. 
2. KEY FEATURES: Digital Rx, Billing, Analytics, Pharmacy sync. 
3. PRICING: Basic ₹499/mo, Standard ₹699/mo, Premium ₹999/mo. 14-day free trial.
4. GUIDELINES: Professional, empathetic. NEVER invent doctors/contact info. 
5. CITIES: ${uniqueCities.slice(0, 15).join(', ')}.
[CONTEXT] ${contextInfo.slice(0, 500)}`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...((history || []).slice(-5).map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.parts[0]?.text || ""
      }))),
      { role: "user", content: message }
    ];

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: apiMessages,
      max_tokens: 1000,
      temperature: 0.3,
    });

    const text = response.choices[0].message.content;
    res.json({ text, messageType: 'text' });

  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).json({ message: "Maya is momentarily unavailable." });
  }
};
