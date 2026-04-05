import mongoose from 'mongoose';
import User from './User.js';

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
  designation: {
    type: String,
    trim: true,
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
    required: false,
    trim: true
  },
  age: {
    type: Number,
    min: [0, 'Age must be positive']
  },
  ageType: {
    type: String,
    enum: ['Year', 'Month', 'Days'],
    default: 'Year'
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
    required: false,
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
  lastVisit: {
    type: String, // Stored as YYYY-MM-DD for easy filtering
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

// Add compound index for mobile + organizationId (Not unique to allow family shared numbers)
patientSchema.index({ mobile: 1, organizationId: 1 });

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

// Sync basic info with User record if it exists
patientSchema.post('save', async function (doc) {
  try {
    const User = mongoose.model('User');
    // Only sync if basic info changed
    await User.findOneAndUpdate(
      { mobile: doc.mobile, organizationId: doc.organizationId, role: 'patient' },
      { 
        name: doc.fullName || `${doc.firstName} ${doc.lastName || ''}`.trim(),
        age: doc.age,
        gender: doc.gender 
      }
    );
  } catch (err) {
    console.error('Sync error (Patient -> User):', err);
  }
});

export default mongoose.model('Patient', patientSchema);
