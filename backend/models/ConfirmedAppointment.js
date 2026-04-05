import mongoose from 'mongoose';

const confirmedAppointmentSchema = new mongoose.Schema({
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

  designation: {
    type: String,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  patientName: {
    type: String,
    required: true,
  },
  patientPhone: {
    type: String,
    required: false,
  },
  patientEmail: {
    type: String,
    required: false,
    default: ''
  },
  patientAge: {
    type: Number,
  },
  ageType: {
    type: String,
    enum: ['Year', 'Month', 'Days'],
    default: 'Year'
  },
  rateListType: {
    type: String,
    default: 'Main'
  },
  dispatchMethods: {
    type: [String],
    default: []
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
  appointmentDate: {
    type: String,
  },
  time: {
    type: String,
    required: true,
  },
  appointmentTime: {
    type: String,
  },
  reason: {
    type: String,
    trim: true,
  },
  cancellationReason: {
    type: String,
    trim: true,
  },
  symptoms: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'missed'],
    default: 'confirmed',
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
  isRescheduled: {
    type: Boolean,
    default: false,
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
confirmedAppointmentSchema.index({ organizationId: 1 });
confirmedAppointmentSchema.index({ organizationId: 1, date: 1 });
confirmedAppointmentSchema.index({ organizationId: 1, appointmentDate: 1 });

// Update the updatedAt field before saving
confirmedAppointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('ConfirmedAppointment', confirmedAppointmentSchema);