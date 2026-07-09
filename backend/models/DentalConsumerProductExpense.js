import mongoose from 'mongoose';

const dentalConsumerProductExpenseSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
  },
  vendor: {
    type: String,
    trim: true,
  },
  supplier: {
    type: String,
    trim: true,
  },
  batchNumber: {
    type: String,
    trim: true,
  },
  expiryDate: {
    type: Date,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  quantityPurchased: {
    type: Number,
    required: true,
    default: 1,
  },
  unit: {
    type: String,
    trim: true,
  },
  unitPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  gstAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque', 'Other'],
    default: 'Cash',
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partially Paid'],
    default: 'Paid',
  },
  notes: {
    type: String,
    trim: true,
  },
  invoiceUrl: {
    type: String,
    trim: true,
  },
  invoicePublicId: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true
});

// Indexing for performance
dentalConsumerProductExpenseSchema.index({ organizationId: 1 });
dentalConsumerProductExpenseSchema.index({ organizationId: 1, purchaseDate: -1 });

export default mongoose.model('DentalConsumerProductExpense', dentalConsumerProductExpenseSchema);
