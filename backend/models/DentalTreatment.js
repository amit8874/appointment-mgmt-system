import mongoose from 'mongoose';

const dentalTreatmentSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Doctor or Owner user who performs/assigns it
    required: false,
  },
  toothNumber: {
    type: String, // e.g. "18", "36" or "Multiple"
    required: true,
  },
  procedure: {
    type: String,
    required: [true, 'Procedure name is required'],
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  estimatedCost: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    default: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  dueAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Planned', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Planned',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  nextVisitDate: {
    type: Date,
  },
}, {
  timestamps: true
});

// Auto-calculate netAmount and dueAmount before saving
dentalTreatmentSchema.pre('save', function (next) {
  this.netAmount = Math.max(0, this.estimatedCost - this.discount);
  this.dueAmount = Math.max(0, this.netAmount - this.paidAmount);
  next();
});

// Indexes for query speed and tenant isolation
dentalTreatmentSchema.index({ organizationId: 1, patientId: 1 });
dentalTreatmentSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model('DentalTreatment', dentalTreatmentSchema);
