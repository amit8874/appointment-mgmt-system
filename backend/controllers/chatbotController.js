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
    const doctors = await Doctor.find({ status: 'Active' });
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
    let query = { status: 'Active' };
    
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
        Doctor.find({ organizationId, status: 'Active' }).select('name specialization doctorId fee workingHours availability addressInfo serviceLocation photo experience languages')
      ]);
      if (org) contextInfo += `\nCURRENT CLINIC: ${org.name}`;
      doctorList = doctors;
    } else {
      // Landing page: Fetch all active doctors globally
      doctorList = await Doctor.find({ status: 'Active' }).select('name specialization doctorId fee workingHours availability addressInfo serviceLocation photo experience languages');
    }

    // 2. Intent Detection
    const isBookingIntent = /book|appointment|schedule|doctor|visit/i.test(message);
    
    // Improved City Detection: Check for "in [City]" or just a single word city name 
    // if the conversation history suggests we were waiting for a city.
    let cityInMessage = null;
    const cityMatch = message.match(/(?:in|at|for)\s+([a-zA-Z\s]+)/i);
    if (cityMatch) {
      cityInMessage = cityMatch[1].trim();
    } else {
      // Check if the user just typed a single word that matches one of our cities
      const lastBotMessage = history?.[history.length - 1]?.parts?.[0]?.text || "";
      const isWaitingForCity = /which city|city are you in/i.test(lastBotMessage);
      
      if (isWaitingForCity || isBookingIntent) {
        const potentialCity = message.trim();
        const availableCities = Array.from(new Set(doctorList.map(d => 
          d.addressInfo?.city || d.serviceLocation?.address?.city
        ).filter(Boolean)));
        
        const cityFound = availableCities.find(c => c.toLowerCase() === potentialCity.toLowerCase());
        if (cityFound) cityInMessage = cityFound;
      }
    }

    if (isBookingIntent || cityInMessage) {
      const uniqueCities = Array.from(new Set(doctorList.map(d => 
        d.addressInfo?.city || d.serviceLocation?.address?.city
      ).filter(Boolean)));

      // If user wants to book but NO city is detected yet, suggest cities
      if (!cityInMessage && message.length < 50) {
        if (uniqueCities.length > 0) {
          responseType = 'options';
          responseMetadata = {
            options: uniqueCities.map(city => ({ label: city, value: city })),
            title: "Which city would you like to book the appointment in?"
          };
          return res.json({ 
            text: "Great! I'll help you book a doctor appointment. Which city are you looking for?", 
            messageType: responseType,
            metadata: responseMetadata
          });
        }
      } else if (cityInMessage) {
        // If city is specified/detected, find ALL doctors in that city
        const matchingDoctors = doctorList.filter(d => {
          const docCity = (d.addressInfo?.city || d.serviceLocation?.address?.city || "").toLowerCase();
          const targetCity = cityInMessage.toLowerCase();
          return docCity.includes(targetCity) || targetCity.includes(docCity);
        });

        if (matchingDoctors.length > 0) {
          responseType = 'doctor_list';
          responseMetadata = {
            doctors: matchingDoctors.map(d => ({
              id: d._id,
              name: d.name,
              specialization: d.specialization,
              hospital: d.serviceLocation?.practiceName || "Slotify Clinic",
              city: d.addressInfo?.city || d.serviceLocation?.address?.city,
              photo: d.photo,
              experience: d.experience,
              languages: d.languages
            }))
          };
          return res.json({ 
            text: `I found ${matchingDoctors.length} doctors in ${cityInMessage}. Here are the best matches:`, 
            messageType: responseType,
            metadata: responseMetadata
          });
        }
      }
    }

    // Default AI Response
    let systemPrompt = `You are Maya, the expert AI Guide for Slotify.
${contextInfo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ APPOINTMENT FLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- If a user asks to "book an appointment", ALWAYS ask for their CITY if they haven't provided it.
- Once you know the city, I will display the doctors automatically.
- Guide them to select a doctor and then pick a slot.
`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...((history || []).map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.parts[0].text
      }))),
      { role: "user", content: message }
    ];

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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
