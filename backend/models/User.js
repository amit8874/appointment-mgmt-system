import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  mobile: {
    type: String,
    required: function () {
      return this.role === 'patient' || this.role === 'receptionist';
    },
    lowercase: true,
    trim: true,
    sparse: true, // Allow multiple null values for unique index
  },
  // Multi-tenancy: Organization/Tenant ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    // Not required for superadmin (platform owner), orgadmin (creating new org), or patient (independent registration)
    required: function () {
      return !['superadmin', 'orgadmin', 'patient', 'pharmacy'].includes(this.role);
    },
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    trim: true,
  },
  // Store plain password for super admin viewing (NOT hashed - for admin recovery only)
  plainPassword: {
    type: String,
    select: false, // Don't include in regular queries
    trim: true,
  },
  age: {
    type: Number,
    min: [0, 'Age must be positive'],
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  dateOfBirth: {
    type: Date,
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  allergies: {
    type: String,
    trim: true,
  },
  currentMedications: {
    type: String,
    trim: true,
  },
  medicalHistory: {
    type: String,
    trim: true,
  },
  bloodPressure: {
    type: String,
    trim: true,
  },
  weight: {
    type: Number,
  },
  height: {
    type: Number,
  },
  username: {
    type: String,
    trim: true,
  },
    role: {
      type: String,
      enum: ['superadmin', 'orgadmin', 'admin', 'receptionist', 'patient', 'doctor', 'pharmacy'],
      default: 'patient', 
    },
  profilePicture: {
    type: String, // URL or base64
  },
  idProof: {
    type: String, // URL or base64
  },
  insuranceDocument: {
    type: String, // URL or base64
  },
  passwordLastChanged: {
    type: Date,
  },
  previousPasswordHashes: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for mobile + organizationId uniqueness (mobile unique per tenant)
userSchema.index({ mobile: 1, organizationId: 1 }, { unique: true, sparse: true });
userSchema.index({ organizationId: 1 });
userSchema.index({ role: 1 });

userSchema.pre('save', async function (next) {
  // Normalize mobile: remove non-digits, and take last 10 digits
  if (this.mobile) {
    let normalized = this.mobile.replace(/\D/g, '');
    if (normalized.length > 10) {
      normalized = normalized.slice(-10);
    }
    this.mobile = normalized.trim();
  }

  // Normalize role: lowercase and trimmed
  if (this.role) {
    this.role = this.role.toLowerCase().trim();
  }

  // Validate email for admin roles
  if ((this.role === 'admin' || this.role === 'superadmin' || this.role === 'orgadmin') && (!this.email || !this.email.trim())) {
    return next(new Error('Email is required for admin roles'));
  }

  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// Sync basic info with Patient record if it exists
userSchema.post('save', async function (doc) {
  try {
    if (doc.role === 'patient') {
      const Patient = mongoose.model('Patient');
      await Patient.findOneAndUpdate(
        { mobile: doc.mobile, organizationId: doc.organizationId },
        { 
          fullName: doc.name,
          firstName: doc.name.split(' ')[0],
          lastName: doc.name.split(' ').slice(1).join(' '),
          age: doc.age,
          gender: doc.gender
        }
      );
    }
  } catch (err) {
    console.error('Sync error (User -> Patient):', err);
  }
});

export default mongoose.model('User', userSchema);
