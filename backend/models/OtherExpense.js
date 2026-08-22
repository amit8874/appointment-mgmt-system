import mongoose from 'mongoose';

const otherExpenseSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  expenseName: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    default: 'Other',
  },
  vendor: {
    type: String,
    trim: true,
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  invoiceNumber: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
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
otherExpenseSchema.index({ organizationId: 1 });
otherExpenseSchema.index({ organizationId: 1, purchaseDate: -1 });

export default mongoose.model('OtherExpense', otherExpenseSchema);
