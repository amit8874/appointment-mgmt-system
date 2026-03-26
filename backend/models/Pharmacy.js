import mongoose from 'mongoose';

const pharmacySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Pharmacy name is required'],
    trim: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Not required for pending self-registrations
  },
  ownerName: {
    type: String,
    // Store contact person name for pending requests
  },
  email: {
    type: String,
    required: [true, 'Pharmacy email is required'],
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Pharmacy phone is required'],
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'suspended'],
    default: 'pending',
  },
  commissionRate: {
    type: Number,
    default: 10, // Default 10% commission
    min: 0,
    max: 100,
  },
  balance: {
    type: Number,
    default: 0, // Pending payouts
  },
  logo: {
    type: String, // URL
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexing for faster searches
pharmacySchema.index({ name: 'text', email: 1, status: 1 });

export default mongoose.model('Pharmacy', pharmacySchema);
