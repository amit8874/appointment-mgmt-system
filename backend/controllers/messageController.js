import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// For Clinic Admins / Receptionists: Get all active chats
export const getConversations = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const Patient = mongoose.model('Patient');
    const User = mongoose.model('User');
    
    // 1. Find all conversations for this tenant
    const convos = await Conversation.find({ organizationId }).sort({ lastMessageAt: -1 });
      
    // 2. Perform Just-In-Time (JIT) repair and manually populate
    const repairedConvos = await Promise.all(convos.map(async (convoDoc) => {
      let convo = convoDoc.toObject();
      let potentialId = convo.patientId;
      
      // Attempt to populate normally
      let actualPatient = await Patient.findById(potentialId).select('firstName lastName mobile patientId age gender bloodGroup');
      
      // If direct population failed, start the repair logic
      if (!actualPatient && potentialId) {
        if (mongoose.Types.ObjectId.isValid(potentialId.toString())) {
          // Check if it's a User ID
          const userRecord = await User.findById(potentialId);
          if (userRecord && (userRecord.role === 'patient' || userRecord.role === 'user')) {
            actualPatient = await Patient.findOne({ mobile: userRecord.mobile, organizationId }) || 
                            await Patient.findOne({ mobile: userRecord.mobile });
          }
        } 
        
        // CASE: String ID (e.g. PAT001)
        if (!actualPatient && typeof potentialId === 'string' && potentialId.length > 0) {
          actualPatient = await Patient.findOne({ patientId: potentialId }) || 
                          await Patient.findOne({ mobile: potentialId });
        }
      }

      if (actualPatient) {
        // MERGER LOGIC: Check for existing duplicate convo with this patient
        const duplicateConvo = await Conversation.findOne({ 
          organizationId, 
          patientId: actualPatient._id,
          _id: { $ne: convo._id }
        });

        if (duplicateConvo) {
          console.log(`[Deep Merger] Merging ${convo._id} into ${duplicateConvo._id}`);
          await Message.updateMany({ conversationId: convo._id }, { conversationId: duplicateConvo._id });
          await Conversation.findByIdAndDelete(convo._id);
          return null;
        } else {
          // Fix simple ID mismatch
          if (convo.patientId?.toString() !== actualPatient._id.toString()) {
            await Conversation.findByIdAndUpdate(convo._id, { patientId: actualPatient._id });
          }
          convo.patientId = actualPatient;
          return convo;
        }
      }
      
      convo.patientId = actualPatient; 
      return convo;
    }));

    res.json(repairedConvos.filter(c => c !== null));
  } catch (err) {
    console.error('getConversations Error:', err);
    res.status(500).json({ message: 'Error fetching conversations', error: err.message });
  }
};

// For Patient: Get their specific conversation mapped to their org
export const getPatientConversation = async (req, res) => {
  try {
    let { patientId } = req.params;
    const orgId = req.query.organizationId;
    const Patient = mongoose.model('Patient');
    const User = mongoose.model('User');

    if (!orgId) return res.status(400).json({ message: 'Organization ID query param required' });

    // RESOLVE: If patientId is a User ID, resolve it to Patient ID
    if (mongoose.Types.ObjectId.isValid(patientId)) {
       const userRecord = await User.findById(patientId);
       if (userRecord && (userRecord.role === 'patient' || userRecord.role === 'user')) {
          const actualPatient = await Patient.findOne({ mobile: userRecord.mobile, organizationId: orgId }) || 
                            await Patient.findOne({ mobile: userRecord.mobile });
          if (actualPatient) patientId = actualPatient._id;
       }
    }

    const convo = await Conversation.findOne({ patientId, organizationId: orgId });
    res.json(convo || null);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching conversation', error: err.message });
  }
};

// Fetch all messages inside a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { role } = req.query; 
    
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    
    if (role === 'clinic') {
       await Conversation.findByIdAndUpdate(conversationId, { unreadCountClinic: 0 });
    } else if (role === 'patient') {
       await Conversation.findByIdAndUpdate(conversationId, { unreadCountPatient: 0 });
    }
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages', error: err.message });
  }
};

// Send a chat message
export const sendMessage = async (req, res) => {
  try {
    let { conversationId, patientId, organizationId, text, sender, senderName, lastDoctorId, lastDoctorName } = req.body;
    
    // RESOLVE: Resolve User ID to Patient ID
    if (patientId && organizationId) {
       const Patient = mongoose.model('Patient');
       const User = mongoose.model('User');
       const isUser = await User.findById(patientId);
       if (isUser && isUser.role === 'patient') {
          const actualPatient = await Patient.findOne({ mobile: isUser.mobile, organizationId });
          if (actualPatient) patientId = actualPatient._id;
       }
    }

    // FIND OR CREATE Conversation
    if (!conversationId && patientId && organizationId) {
       const existingConvo = await Conversation.findOne({ organizationId, patientId });
       if (existingConvo) {
          conversationId = existingConvo._id;
       } else {
          const newConvo = new Conversation({
             organizationId,
             patientId,
             lastDoctorId: lastDoctorId || null,
             lastDoctorName: lastDoctorName || null,
          });
          const savedConvo = await newConvo.save();
          conversationId = savedConvo._id;
       }
    }
    
    if (!conversationId) return res.status(400).json({ message: 'Missing conversationId.' });
    
    const msg = new Message({ conversationId, sender, senderName, text });
    await msg.save();
    
    const incObj = sender === 'clinic' ? { unreadCountPatient: 1 } : { unreadCountClinic: 1 };
    const updatedConvo = await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      lastMessageAt: new Date(),
      $inc: incObj
    }, { new: true }).populate('patientId', 'firstName lastName mobile patientId age gender');
    
    // Realtime Broadcasting
    try {
      const io = req.app.get("io");
      if (io && updatedConvo) {
         const orgIdStr = (updatedConvo.organizationId?._id || updatedConvo.organizationId).toString();
         const patIdStr = (updatedConvo.patientId?._id || updatedConvo.patientId).toString();
         io.to(orgIdStr).emit("new-chat-message", { conversation: updatedConvo, message: msg });
         io.to(`patient_${patIdStr}`).emit("new-chat-message", { conversation: updatedConvo, message: msg });
      }
    } catch (sErr) { console.error('Socket error:', sErr); }

    res.json({ message: msg, conversation: updatedConvo });
  } catch (err) {
    res.status(500).json({ message: 'Error sending message', error: err.message });
  }
};

// AI Explainer logic
export const explainWithMaya = async (req, res) => {
  try {
    const { conversationId, messageText, patientName } = req.body;
    if (!conversationId || !messageText) return res.status(400).json({ message: 'Missing parameters' });

    const systemPrompt = `You are Maya, an AI medical interpreter. Explain: "${messageText}" simply to ${patientName}. No medical advice. Reassuring tone. Max 4 sentences.`;
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Explain simply." }],
      max_tokens: 250,
      temperature: 0.3,
    });

    const aiText = response.choices[0].message.content;
    const msg = new Message({ conversationId, sender: 'maya_ai', senderName: '✨ Maya AI', text: aiText, isAiExplanation: true });
    await msg.save();
    
    const updatedConvo = await Conversation.findByIdAndUpdate(conversationId, { $inc: { unreadCountPatient: 1 } }, { new: true });
    
    try {
      const io = req.app.get("io");
      if (io && updatedConvo) {
         const patIdStr = (updatedConvo.patientId?._id || updatedConvo.patientId).toString();
         io.to(`patient_${patIdStr}`).emit("new-chat-message", { conversation: updatedConvo, message: msg });
      }
    } catch (sErr) {}

    res.json({ message: msg });
  } catch (err) {
    res.status(500).json({ message: 'Error running Maya explainer', error: err.message });
  }
};
