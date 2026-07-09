import mongoose from 'mongoose';

const dentalLabExpenseSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  labName: {
    type: String,
    required: true,
    trim: true,
  },
  labTechnician: {
    type: String,
    trim: true,
  },
  patientName: {
    type: String,
    trim: true,
  },
  patientId: {
    type: String,
    trim: true,
  },
  doctorName: {
    type: String,
    trim: true,
  },
  caseNumber: {
    type: String,
    trim: true,
  },
  workType: {
    type: String,
    trim: true,
  },
  treatmentType: {
    type: String,
    trim: true,
  },
  workDescription: {
    type: String,
    trim: true,
  },
  sentDate: {
    type: Date,
  },
  expectedDeliveryDate: {
    type: Date,
  },
  receivedDate: {
    type: Date,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  cost: {
    type: Number,
    required: true,
    default: 0,
  },
  labCharges: {
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
  paymentDate: {
    type: Date,
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
dentalLabExpenseSchema.index({ organizationId: 1 });
dentalLabExpenseSchema.index({ organizationId: 1, sentDate: -1 });

export default mongoose.model('DentalLabExpense', dentalLabExpenseSchema);
