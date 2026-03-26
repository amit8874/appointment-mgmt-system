import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: false, // Will be auto-generated if not provided
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    // Used for subdomain: slug.myapp.com
  },
  subdomain: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  // Brand customization (white label)
  branding: {
    logo: String, // URL to logo
    primaryColor: {
      type: String,
      default: '#3B82F6', // Default blue
    },
    secondaryColor: {
      type: String,
      default: '#1E40AF',
    },
    clinicName: String, // Display name
    footerText: String,
  },
  // Clinic settings
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
    },
    services: [String], // Available services
  },
  // Organization owner/admin
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'trial'],
    default: 'trial',
  },
  // Subscription reference
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  // Trial information
  trialStartDate: {
    type: Date,
    default: Date.now,
  },
  trialEndDate: {
    type: Date,
  },
  trialDays: {
    type: Number,
    default: 14,
  },
  isTrialActive: {
    type: Boolean,
    default: true,
  },
  // New fields for 24h Auto-Reset
  planType: {
    type: String,
    enum: ['FREE_TRIAL', 'PAID'],
    default: 'FREE_TRIAL',
  },
  lastDataResetAt: {
    type: Date,
  },
  needsResetNotification: {
    type: Boolean,
    default: false,
  },
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Feature flags
  features: {
    advancedAnalytics: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    smsNotifications: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
  },
});

// Generate slug from name
organizationSchema.pre('save', async function (next) {
  // Always generate slug if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Ensure uniqueness
    const OrganizationModel = mongoose.model('Organization');
    const existing = await OrganizationModel.findOne({ slug: this.slug });
    if (existing && existing._id.toString() !== this._id?.toString()) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
  
  // Set subdomain from slug if not provided
  if (!this.subdomain && this.slug) {
    this.subdomain = this.slug;
  }
  
  // Ensure slug is set (required for validation)
  if (!this.slug) {
    return next(new Error('Slug is required. It will be generated from name if not provided.'));
  }
  
  this.updatedAt = Date.now();
  next();
});

// Indexes for performance
organizationSchema.index({ slug: 1 });
organizationSchema.index({ subdomain: 1 });
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ status: 1 });

export default mongoose.model('Organization', organizationSchema);
