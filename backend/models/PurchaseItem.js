import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true,
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: { type: String },
  batchNo: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  mrp: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  freeQuantity: { type: Number, default: 0 },
  gstPercentage: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model('PurchaseItem', purchaseItemSchema);
