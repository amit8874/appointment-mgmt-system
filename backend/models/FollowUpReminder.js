import mongoose from 'mongoose';

const followUpReminderSchema = new mongoose.Schema({
  // Multi-tenancy: Organization/Tenant ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null,
    index: true
  },
  customPatientName: {
    type: String,
    default: null
  },
  customPatientMobile: {
    type: String,
    default: null
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedToRole: {
    type: String,
    enum: ['admin', 'doctor', 'receptionist'],
  },
  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  note: {
    type: String,
    trim: true,
  },
  reminderType: {
    type: String,
    enum: [
      'CALL_BACK',
      'FOLLOW_UP_VISIT',
      'REPORT_REVIEW',
      'MEDICINE_REVIEW',
      'PAYMENT_FOLLOW_UP',
      'PROCEDURE_DECISION',
      'GENERAL_REMINDER'
    ],
    required: true,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  },
  reminderAt: {
    type: Date,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'SNOOZED', 'RESCHEDULED', 'CANCELLED'],
    default: 'PENDING',
  },
  shownToUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  popupShownAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  snoozedUntil: {
    type: Date,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // Using explicit createdAt/updatedAt for consistency with other models
});

// Update the updatedAt field before saving
followUpReminderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for common queries
followUpReminderSchema.index({ organizationId: 1, status: 1 });
followUpReminderSchema.index({ organizationId: 1, reminderAt: 1 });
followUpReminderSchema.index({ organizationId: 1, assignedToRole: 1 });
followUpReminderSchema.index({ organizationId: 1, assignedToUserId: 1 });

export default mongoose.model('FollowUpReminder', followUpReminderSchema);
