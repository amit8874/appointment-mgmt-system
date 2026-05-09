import mongoose from 'mongoose';

const medicineBatchSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  batchNo: { type: String, required: true, trim: true },
  expiryDate: { type: Date, required: true },
  mrp: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  stockQuantity: { type: Number, default: 0 },
  initialStock: { type: Number, default: 0 },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
}, { timestamps: true });

medicineBatchSchema.index({ organizationId: 1, medicineId: 1, batchNo: 1 }, { unique: true });

export default mongoose.model('MedicineBatch', medicineBatchSchema);
