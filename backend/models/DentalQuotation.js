import mongoose from 'mongoose';

const dentalQuotationItemSchema = new mongoose.Schema({
  procedure: {
    type: String,
    required: true,
    trim: true,
  },
  teeth: [{
    type: String,
    trim: true,
  }],
  toothDisplay: {
    type: String,
    trim: true,
  },
  unitCost: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  totalCost: {
    type: Number,
    required: true,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { _id: false });

const dentalQuotationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Patient',
    required: true,
    index: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false,
  },
  doctorName: {
    type: String,
    trim: true,
  },
  quotationNumber: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days validity
  },
  patientName: {
    type: String,
    trim: true,
  },
  patientPhone: {
    type: String,
    trim: true,
  },
  patientAge: {
    type: String,
    trim: true,
  },
  patientGender: {
    type: String,
    trim: true,
  },
  patientAddress: {
    type: String,
    trim: true,
  },
  items: [dentalQuotationItemSchema],
  subtotal: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
    default: 'This quotation is an estimate of costs for the proposed dental treatments and is subject to clinical examination.',
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Accepted', 'Converted', 'Expired', 'Cancelled'],
    default: 'Sent',
    index: true,
  },
  convertedTreatmentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DentalTreatment',
  }],
  convertedAt: {
    type: Date,
  },
  convertedPaidAmount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

dentalQuotationSchema.index({ organizationId: 1, patientId: 1 });
dentalQuotationSchema.index({ organizationId: 1, quotationNumber: 1 });

export default mongoose.model('DentalQuotation', dentalQuotationSchema);
