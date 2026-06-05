import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
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
    type: String, // Mock patient ID
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
    type: String, // For now, using string since doctors are static
    required: false,
  },
  doctorName: {
    type: String,
    required: false,
  },
  specialty: {
    type: String,
    required: false,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: false,
  },
  appointmentDate: {
    type: String,
  },
  time: {
    type: String, // Format: HH:MM
    required: false,
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
  visitNotes: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'in-progress', 'missed'],
    default: 'pending',
  },
  visitType: {
    type: String,
    enum: ["APPOINTMENT", "WALK_IN"],
    default: "APPOINTMENT"
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
appointmentSchema.index({ organizationId: 1 });
appointmentSchema.index({ organizationId: 1, date: 1 });
appointmentSchema.index({ organizationId: 1, appointmentDate: 1 });
appointmentSchema.index({ organizationId: 1, patientId: 1 });
appointmentSchema.index({ organizationId: 1, doctorId: 1 });

// Update the updatedAt field before saving
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Appointment', appointmentSchema);
