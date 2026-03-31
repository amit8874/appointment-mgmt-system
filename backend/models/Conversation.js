import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient', // Refers to the internal PaitentEditProfile model
    required: true,
  },
  // We can loosely keep track of which doctor was primarily involved
  lastDoctorId: {
    type: String, 
    required: false
  },
  lastDoctorName: {
    type: String,
    required: false
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCountClinic: {
    type: Number,
    default: 0
  },
  unreadCountPatient: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Create a unique index so there's only one conversation per (patient + organization)
conversationSchema.index({ organizationId: 1, patientId: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
