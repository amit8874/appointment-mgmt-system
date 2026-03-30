import mongoose from 'mongoose';

const billingSchema = new mongoose.Schema({
  // Multi-tenancy: Organization/Tenant ID
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  billId: {
    type: String,
    required: true
  },
  patientId: {
    type: String,
    required: false // Optional for fast retail sales
  },
  patientName: {
    type: String,
    default: 'Walk-in Patient'
  },
  patientPhone: {
    type: String,
    default: ''
  },
  doctorId: {
    type: String,
    default: ''
  },
  doctorName: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Due', 'Cancelled', 'Dead'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Insurance', 'N/A'],
    default: 'N/A'
  },
  transactionId: {
    type: String,
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  },
  appointmentId: {
    type: String,
    default: null
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceTemplate',
    default: null
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    qty: { type: Number, default: 1 },
    unitPrice: Number,
    cost: Number,
    tax: { type: Number, default: 0 },
    subtotal: Number
  }],
  notes: String
}, {
  timestamps: true
});

// Indexes for performance
billingSchema.index({ organizationId: 1, billId: 1 }, { unique: true });
billingSchema.index({ organizationId: 1 });
billingSchema.index({ organizationId: 1, patientId: 1 });

export default mongoose.model('Billing', billingSchema);
