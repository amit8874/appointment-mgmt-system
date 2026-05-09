import mongoose from 'mongoose';

const patientProgressComparisonSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    index: true
  },
  doctorName: {
    type: String,
    trim: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  treatmentType: {
    type: String,
    trim: true
  },
  treatmentArea: {
    type: String,
    trim: true
  },
  // Before Image Fields
  beforeImageStorageProvider: {
    type: String,
    default: "aws_s3"
  },
  beforeImageS3Bucket: String,
  beforeImageS3Key: String,
  beforeImageUrl: String,
  beforeImageFileName: String,
  beforeImageMimeType: String,
  beforeImageFileSize: Number,
  beforeNote: {
    type: String,
    trim: true
  },
  // After Image Fields
  afterImageStorageProvider: {
    type: String,
    default: "aws_s3"
  },
  afterImageS3Bucket: String,
  afterImageS3Key: String,
  afterImageUrl: String,
  afterImageFileName: String,
  afterImageMimeType: String,
  afterImageFileSize: Number,
  afterNote: {
    type: String,
    trim: true
  },
  // Common Result Fields
  resultNote: {
    type: String,
    trim: true
  },
  doctorObservation: {
    type: String,
    trim: true
  },
  recommendation: {
    type: String,
    trim: true
  },
  consentTaken: {
    type: Boolean,
    default: false
  },
  consentNote: {
    type: String,
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedByRole: String,
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Composite Indexes for optimized queries
patientProgressComparisonSchema.index({ organizationId: 1, patientId: 1 });
patientProgressComparisonSchema.index({ organizationId: 1, patientId: 1, createdAt: -1 });
patientProgressComparisonSchema.index({ organizationId: 1, doctorId: 1 });

const PatientProgressComparison = mongoose.model('PatientProgressComparison', patientProgressComparisonSchema);

export default PatientProgressComparison;
