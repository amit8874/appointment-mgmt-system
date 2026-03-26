import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Multi-tenancy: Organization/Tenant ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    // Not required for superadmin/system notifications
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Optional fields for specific notifications
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  category: {
    type: String,
    enum: ['user_registration', 'appointment_booking', 'appointment_update', 'system', 'subscription'],
    required: true,
  },
});

// Indexes for performance
notificationSchema.index({ organizationId: 1 });
notificationSchema.index({ organizationId: 1, userId: 1 });
notificationSchema.index({ organizationId: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);