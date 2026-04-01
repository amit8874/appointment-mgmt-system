import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema({
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrescriptionOrder',
    default: null,
  },
  patientId: {
    type: mongoose.Schema.Types.Mixed, // Support both ObjectId and guest string IDs
    default: null,
  },
  patientName: {
    type: String,
    default: 'N/A',
  },
  quantity: {
    type: Number,
    required: true, // Negative for dispensing, positive for restock
  },
  type: {
    type: String,
    enum: ['dispense', 'restock', 'correction', 'bulk_upload'],
    required: true,
  },
  previousStock: {
    type: Number,
    required: true,
  },
  newStock: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export default mongoose.model('InventoryLog', inventoryLogSchema);
