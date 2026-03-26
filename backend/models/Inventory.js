import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
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
  },
  stockLevel: {
    type: Number,
    default: 0,
    min: 0,
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: 0,
  },
  locationInStore: {
    type: String,
    trim: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure a product is unique per pharmacy
inventorySchema.index({ pharmacyId: 1, productId: 1 }, { unique: true });

export default mongoose.model('Inventory', inventorySchema);
