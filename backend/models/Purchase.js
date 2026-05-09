import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  supplierName: { type: String }, // Denormalized for quick access
  purchaseInvoiceNo: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
  totalAmount: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
  notes: { type: String },
}, { timestamps: true });

purchaseSchema.index({ organizationId: 1, purchaseInvoiceNo: 1 }, { unique: true });

export default mongoose.model('Purchase', purchaseSchema);
