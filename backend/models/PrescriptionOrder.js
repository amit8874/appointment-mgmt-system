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
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    default: null,
  },
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
