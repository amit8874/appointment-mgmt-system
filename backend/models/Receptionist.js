import mongoose from 'mongoose';

const receptionistSchema = new mongoose.Schema({
  // Multi-tenancy: Organization/Tenant ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  receptionistId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Female',
  },
  dob: {
    type: Date,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  joinDate: {
    type: Date,
    default: Date.now,
  },
  shift: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Night', 'Rotating'],
    default: 'Morning',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active',
  },
  profilePhoto: {
    type: String,
    trim: true,
  },
  emergencyContact: {
    type: String,
    trim: true,
  },
  emergencyPhone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    default: 'Receptionist',
    trim: true,
  },
  salary: {
    type: Number,
    default: 0,
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00',
    },
    end: {
      type: String,
      default: '17:00',
    },
  },
  availability: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false },
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

// Update the updatedAt field before saving
receptionistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better query performance
receptionistSchema.index({ organizationId: 1, receptionistId: 1 }, { unique: true });
receptionistSchema.index({ organizationId: 1 });
receptionistSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model('Receptionist', receptionistSchema);
