import mongoose from 'mongoose';

const prescriptionOrderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.Mixed, // Support both ObjectId and mock string IDs
    required: true,
  },
  prescriptionUrl: {
    type: String,
    required: true,
  },
  pinCode: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
  },
  notes: {
    type: String, // e.g., "urgent", "2 hours"
  },
  location: {
    lat: Number,
    lng: Number,
  },
  deliveryMethod: {
    type: String,
    enum: ['home', 'office', 'pickup'],
  },
  deliveryAddress: {
    type: String,
  },
  status: {
    type: String,
    enum: ['broadcast', 'accepted', 'quoted', 'paid', 'ready', 'shipped', 'completed', 'cancelled'],
    default: 'broadcast',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid',
  },
  expiryAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000), // Default 15 minutes window
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    default: null,
  },
  // New competitive quotes structure
  quotes: [{
    pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' },
    pharmacyName: String,
    pharmacyDistance: String,
    pharmacyRating: Number,
    price: Number,
    medicineCharge: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    deliveryTime: String,
    isFullAvailable: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'selected', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  quotedItems: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    price: { type: Number }
  }],
  quotedTotal: {
    type: Number,
    default: 0
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


prescriptionOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('PrescriptionOrder', prescriptionOrderSchema);
