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
    sparse: true
  },
  billType: {
    type: String,
    enum: ['General', 'Pharmacy', 'Lab', 'Dental'],
    default: 'General'
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
  patientAddress: {
    type: String,
    default: ''
  },
  age: {
    type: String,
    default: ''
  },
  gender: {
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
  // Pharmacy/Detailed Billing Fields
  grossAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  taxableAmount: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  netAmount: {
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
    enum: ['Paid', 'Pending', 'Due', 'Partial', 'Cancelled', 'Dead'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Insurance', 'N/A'],
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
  appointmentDate: {
    type: String,
    default: null
  },
  appointmentTime: {
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
    subtotal: Number,
    batchNo: String,
    expiryDate: String,
    mrp: Number,
    discountPercentage: Number,
    gstPercentage: Number,
    // Dental procedure-specific fields
    procedureName: String,
    toothNumber: String,
    price: Number,
    discount: { type: Number, default: 0 },
    total: Number
  }],
  notes: String,
  storageProvider: { type: String, default: 'local' }, // 'local', 'cloudinary', 'aws_s3'
  invoiceS3Bucket: { type: String },
  invoiceS3Key: { type: String },
  invoiceUrl: { type: String },
  invoiceFileName: { type: String },
  invoiceMimeType: { type: String },
  installments: [{
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Insurance', 'N/A'], required: true },
    transactionId: { type: String, default: '' },
    notes: { type: String, default: '' }
  }]
}, {
  timestamps: true
});

// Auto recalculate paidAmount, dueAmount, and status on save when installments are present
billingSchema.pre('save', function (next) {
  if (this.installments && this.installments.length > 0) {
    this.paidAmount = this.installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    this.dueAmount = Math.max(0, (this.amount || this.grandTotal || 0) - this.paidAmount);
    
    if (this.dueAmount === 0) {
      this.status = 'Paid';
    } else if (this.paidAmount > 0) {
      this.status = 'Due';
    }
  }
  next();
});

// Indexes for performance
billingSchema.index({ organizationId: 1, billId: 1 }, { unique: true });
billingSchema.index({ organizationId: 1, invoiceNumber: 1 });
billingSchema.index({ organizationId: 1 });
billingSchema.index({ organizationId: 1, patientId: 1 });

export default mongoose.model('Billing', billingSchema);

