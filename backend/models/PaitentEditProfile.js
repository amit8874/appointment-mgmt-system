// models/Patient.js
import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  // Multi-tenancy: Organization/Tenant ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false, // Optional — patients can register independently without an org
    index: true
  },
  patientId: {
    type: String,
    unique: true,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    min: [0, 'Age must be positive']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: undefined,
    set: v => v === '' ? undefined : v
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    default: undefined,
    set: v => v === '' ? undefined : v
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  zip: {
    type: String,
    trim: true
  },
  emergencyContact: {
    type: String,
    trim: true
  },
  emergencyPhone: {
    type: String,
    trim: true
  },
  pastMedicalHistory: {
    type: String,
    trim: true
  },
  allergies: {
    type: String,
    trim: true
  },
  assignedDoctor: {
    type: String,
    trim: true,
    default: ''
  },
  assignedDoctorId: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'dead'],
    default: 'active'
  },
  vitals: {
    bloodPressure: { type: String, default: '120/80', trim: true },
    heartRate: { type: String, default: '72', trim: true },
    temperature: { type: String, default: '98.6', trim: true },
    weight: { type: String, default: '-', trim: true },
    height: { type: String, default: '-', trim: true }
  },
  deathDate: {
    type: Date,
    default: null
  },
  reports: [{
    filename: String,
    url: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound index for mobile + organizationId uniqueness
patientSchema.index({ mobile: 1, organizationId: 1 }, { unique: true });

// Update the updatedAt field on save
patientSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure mobile is normalized: remove non-digits, and take last 10 digits
patientSchema.pre('save', function (next) {
  if (this.isModified('mobile') && this.mobile) {
    let normalized = this.mobile.replace(/\D/g, '');
    if (normalized.length > 10) {
      normalized = normalized.slice(-10);
    }
    this.mobile = normalized.trim();
  }
  if (this.isModified('email') && this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

export default mongoose.model('Patient', patientSchema);
