import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    // We denote who sent it: "patient", "clinic", or "maya_ai" (if maya responds on their behalf)
    type: String,
    enum: ['patient', 'clinic', 'maya_ai'],
    required: true,
  },
  senderName: {
    // E.g. "Maya AI", "Dr. Mahesh", or just "Clinic / Provider" based on preference. Or "Patient Name"
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  messageType: {
    type: String,
    enum: ['text', 'options', 'doctor_list', 'slot_picker'],
    default: 'text'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isAiExplanation: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Optimize query pulling by conversation
messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
