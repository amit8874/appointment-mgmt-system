import mongoose from 'mongoose';

const pendingAppointmentSchema = new mongoose.Schema({
  // Multi-tenancy: Organization/Tenant ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  shortId: {
    type: String,
    unique: true,
    sparse: true
  },
  patientId: {
    type: String,
    required: true,
  },

  patientName: {
    type: String,
    required: true,
  },
  patientPhone: {
    type: String,
    required: true,
  },
  patientEmail: {
    type: String,
    required: false,
    default: ''
  },
  doctorId: {
    type: String,
    required: true,
  },
  doctorName: {
    type: String,
    required: true,
  },
  specialty: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    trim: true,
  },
  symptoms: {
    type: String,
    trim: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  },
  amount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for performance
pendingAppointmentSchema.index({ organizationId: 1 });
pendingAppointmentSchema.index({ organizationId: 1, date: 1 });

// Update the updatedAt field before saving
pendingAppointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('PendingAppointment', pendingAppointmentSchema);