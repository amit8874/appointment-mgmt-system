import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  organization: { type: String },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' }
}, { timestamps: true });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;
