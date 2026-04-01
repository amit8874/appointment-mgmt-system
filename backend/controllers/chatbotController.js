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
      // Calculate token overlap
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
    .filter(res => res.score > 0.3) // Threshold for "similar"
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(res => res.doc.name);
};

export const chatWithMaya = async (req, res) => {
  const { message, history, organizationId, userContext, role } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    let contextInfo = "";
    let doctorList = [];
    if (organizationId) {
      const [org, doctors] = await Promise.all([
        Organization.findById(organizationId).select('name address'),
        Doctor.find({ organizationId, status: 'Active' }).select('name specialization doctorId fee department workingHours availability')
      ]);

      if (org) {
        contextInfo += `\nCURRENT CLINIC: ${org.name}`;
        if (org.address) contextInfo += `\nCLINIC ADDRESS: ${org.address}`;
      }
      
      doctorList = doctors;
      if (doctors && doctors.length > 0) {
        contextInfo += `\nAVAILABLE DOCTORS & THEIR SCHEDULES:`;
        doctors.forEach(d => {
          const avail = Object.entries(d.availability || {})
            .filter(([day, isOpen]) => isOpen)
            .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
            .join(', ') || 'Mon-Fri';
          
          contextInfo += `\n- Dr. ${d.name} [${d.specialization || 'Consultant'}] Timing: ${d.workingHours?.start || '09:00'}-${d.workingHours?.end || '17:00'} (Days: ${avail}) Fee: Rs. ${d.fee || 500} [ID: ${d.doctorId || d._id}]`;
        });
      }
    }

    // Smart Recovery: Detect doctor mentions and find suggestions
    let recoveryHint = "";
    const drMentionMatch = message.match(/(?:dr\.?\s+|doctor\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (drMentionMatch) {
      const mentionedName = drMentionMatch[1];
      const exactMatch = doctorList.find(d => d.name.toLowerCase().includes(mentionedName.toLowerCase()));
      
      if (!exactMatch) {
        const suggestions = findSimilarDoctors(mentionedName, doctorList);
        if (suggestions.length > 0) {
          recoveryHint = `\n[RECOVERY_HINT: User mentioned "Dr. ${mentionedName}" but they are NOT in our database. SUGGEST these similar doctors instead: ${suggestions.join(', ')}. Ask "Did you mean...?" and inform them that they can book via the web portal branch.]`;
        } else {
          recoveryHint = `\n[RECOVERY_HINT: User mentioned "Dr. ${mentionedName}" but no similar doctors were found. Inform them and show the FULL doctor list available for the clinic.]`;
        }
      }
    }

    let systemPrompt = "";

    if (role === 'pharmacy') {
        systemPrompt = `You are Maya, the Expert Pharmacy Guide for Slotify.
Your purpose is to assist Pharmacy Staff in managing their dashboard, inventory, and orders with high efficiency.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 INVENTORY MANAGEMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Where:** "Inventory" tab in sidebar.
- **Add Product:** Use the "+ Add Product" button. You can add a single product or perform a **Bulk Upload** using an Excel/CSV file.
- **Stock Sync:** Real-time stock tracking with low-stock alerts (highlighted in orange/red).
- **Quick Dispense:** Use the "Arrow Down" icon on any product to quickly register a sale and deduct stock.
- **History:** Use the "History" icon to view an audit trail of all stock movements for that item.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 ORDER MANAGEMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Where:** "Orders" tab in sidebar.
- **Types:** Standard Orders (Direct purchases) and Prescription Orders (Uploaded by patients).
- **Processing:** Once a prescription is uploaded, you prepare a quote/broadcast. Once "Completed", it is automatically marked as **PAID**.
- **Compact View:** We use a professional table layout to maximize data density.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 BROADCAST (Bidding System):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Where:** "Broadcast" tab in sidebar.
- **What:** Patients upload prescriptions which are "broadcasted" to nearby pharmacies.
- **How to Use:** View active broadcasts, enter your pricing/quotes, and "Win" the order to process it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 ANALYSIS (Dashboard):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Where:** "Analysis" tab in sidebar.
- **Insights:** Provides 30-day revenue trends, order status distribution, top-selling medications, and inventory health summary.
- **Importance:** Use this to plan restocking and identify high-performing products.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 PROFILE & SETTINGS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Where:** "Settings" tab in sidebar.
- **Update:** You can change pharmacy name, contact details, address, and profile pictures here.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ GUIDELINES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Be concise, professional, and authoritative.
- IF you have any doubt about an answer or can't find specific info, SAY: "For more details or advanced technical help, please contact Slotify Support at **+91 9999999999**."
- NEVER mention medical advice or doctor bookings unless explicitly asked in the context of pharmacy integration.
`;
    } else {
        systemPrompt = `You are Maya, the expert AI Guide and Software Assistant for Slotify.
Your goal is to guide users through the Slotify platform, explain its features, registration process, and plans.
${contextInfo}
${recoveryHint}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 ABOUT SLOTIFY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Slotify is a premium AI-powered Clinic Management System that automates scheduling, patient management, analytics, and more.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ CORE FEATURES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Intelligent Scheduling: Automated appointment slots (booked manually via site).
2. Doctor & Staff Management: Handle multiple doctors and receptionists with ease.
3. Patient Records: Digital history and management.
4. Pharmacy Management: Advanced inventory and prescription tracking.
5. Analytics: Deep insights into clinic performance.
6. Custom Branding: Professional look tailored to each clinic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 REGISTRATION & PLANS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **How to Register:** Go to our landing page and select "Register Organization".
- **Free Trial:** 14-day free trial on the "Free" plan.
- **Plans:** 
  - Standard/Free: Basic features for small clinics.
  - Pro: Includes advanced analytics and higher limits.
  - Enterprise: Unlimited doctors, patients, and custom branding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ APPOINTMENT GUIDANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **BOOKING:** You CANNOT book appointments yourself. Instead, guide the user to the "Book Appointment" button or page on the clinic's portal.
- **DOCTOR INFO:** Use the "AVAILABLE DOCTORS" list to help users choose the right doctor by telling them timings, fees, and specialties.
- **RESCHEDULE/CANCEL:** Direct users to their dashboard or contact the clinic's receptionist.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 GUIDELINES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Be professional, helpful, and concise.
- NEVER ask for Name, Age, Mobile, or Gender for booking purposes.
- IF someone wants to book, summarize the doctor's details and say: "Please use the 'Book Appointment' button on our page to continue with your booking. I'll be here if you have more questions!"
`;
    }

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
    res.json({ text });
  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).json({ message: "Maya is momentarily unavailable." });
  }
};
