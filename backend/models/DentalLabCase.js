import mongoose from 'mongoose';

const dentalLabCaseSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true,
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
  },
  dentistName: {
    type: String,
    required: true,
    trim: true,
  },
  toothNumbers: [{
    type: String,
    trim: true,
  }],
  toothType: {
    type: String,
    required: true,
    trim: true,
  },
  toothTypeCustom: {
    type: String,
    trim: true,
  },
  laboratoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DentalLaboratory',
    required: true,
  },
  laboratoryName: {
    type: String,
    required: true,
    trim: true,
  },
  caseId: {
    type: String,
    required: true,
    trim: true,
  },
  sendingDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  expectedReturnDate: {
    type: Date,
  },
  receivedDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent to Lab', 'In Progress', 'Received', 'Delivered', 'Cancelled'],
    default: 'Draft',
    index: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  instructions: {
    shade: { type: String, trim: true },
    material: { type: String, trim: true },
    design: { type: String, trim: true },
    occlusion: { type: String, trim: true },
  },
  attachments: [{
    filename: String,
    url: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound indexing for optimization
dentalLabCaseSchema.index({ organizationId: 1, sendingDate: -1 });

export default mongoose.model('DentalLabCase', dentalLabCaseSchema);
