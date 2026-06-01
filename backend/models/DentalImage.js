import mongoose from 'mongoose';

const dentalImageSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  imageType: {
    type: String,
    enum: ['Before Image', 'After Image', 'X-Ray Image', 'Intraoral Image', 'Progress Image'],
    required: true,
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
  },
  publicId: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Indexes for speed and tenant isolation
dentalImageSchema.index({ organizationId: 1, patientId: 1 });

export default mongoose.model('DentalImage', dentalImageSchema);
