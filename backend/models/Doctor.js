import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  // Multi-tenancy: Organization/Tenant ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  doctorId: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: false,
    trim: true,
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  specialization: {
    type: String,
    required: true,
    trim: true,
  },
  designation: {
    type: String,
    trim: true,
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
  addressInfo: {
    address1: String,
    address2: String,
    country: String,
    city: String,
    state: String,
    pincode: String,
  },
  qualification: {
    type: String,
    trim: true,
  },
  education: [{
    degree: String,
    university: String,
    from: Date,
    to: Date,
  }],
  awards: [{
    name: String,
    from: Date,
  }],
  certifications: [{
    name: String,
    from: Date,
  }],
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
  dob: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Male',
  },
  bloodGroup: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  licenseNumber: {
    type: String,
    trim: true,
  },
  experience: {
    type: Number,
    default: 0,
  },
  fee: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active',
  },
  photo: {
    type: String,
    trim: true,
  },
  languages: [String],
  bio: {
    type: String,
    trim: true,
  },
  about: {
    type: String,
    trim: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  appointmentInfo: {
    type: String,
    advanceBooking: Boolean,
    duration: Number,
    maxBookings: Number,
    displayOnBooking: Boolean,
  },
  startDate: {
    type: Date,
  },
  lastReviewDate: {
    type: Date,
  },
  emergencyContact: {
    type: String,
    trim: true,
  },
  licenseExpiry: {
    type: Date,
  },
  boardCertified: {
    type: String,
    trim: true,
  },
  npiNumber: {
    type: String,
    trim: true,
  },
  patientsTreatedTotal: {
    type: Number,
    default: 0,
  },
  totalRevenueYTD: {
    type: String,
    trim: true,
  },
  npsScore: {
    type: String,
    trim: true,
  },
  avgConsultationTime: {
    type: String,
    trim: true,
  },
  noShowRate: {
    type: String,
    trim: true,
  },
  activePatientCount: {
    type: Number,
    default: 0,
  },
  appointmentsPerMonth: [{
    month: String,
    count: Number,
  }],
  upcomingAppointments: [{
    id: String,
    time: String,
    reason: String,
    patient: String,
    status: String,
  }],
  completedAppointments: [{
    id: String,
    time: String,
    reason: String,
    patient: String,
    status: String,
  }],
  schedule: [{
    day: String,
    hours: String,
    editable: Boolean,
  }],
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
doctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better query performance
doctorSchema.index({ organizationId: 1, doctorId: 1 }, { unique: true });
doctorSchema.index({ organizationId: 1 });
doctorSchema.index({ organizationId: 1, specialization: 1 });
doctorSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model('Doctor', doctorSchema);
