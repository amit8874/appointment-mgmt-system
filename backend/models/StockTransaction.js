import mongoose from 'mongoose';

const stockTransactionSchema = new mongoose.Schema({
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
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicineBatch',
  },
  transactionType: {
    type: String,
    enum: [
      'Opening Stock Added',
      'Purchase Stock Added',
      'Sale Stock Reduced',
      'Stock Adjusted',
      'Expired Stock Removed',
      'Purchase Return',
      'Sales Return'
    ],
    required: true,
  },
  quantity: { type: Number, required: true }, // Positive for addition, Negative for reduction
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // PurchaseId, BillId, AdjustmentId
  referenceType: { type: String }, // 'Purchase', 'Bill', 'Adjustment'
  notes: { type: String },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('StockTransaction', stockTransactionSchema);
