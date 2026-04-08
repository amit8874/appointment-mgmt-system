import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
  },
  deviceInfo: {
    type: String, // e.g., "Chrome on Windows"
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  isRevoked: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d', // Automatically remove sessions after 30 days
  },
});

sessionSchema.index({ userId: 1 });
sessionSchema.index({ token: 1 });

export default mongoose.model('Session', sessionSchema);
