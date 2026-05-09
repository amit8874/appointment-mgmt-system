import mongoose from 'mongoose';

const patientProgressImageSchema = new mongoose.Schema({
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
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  title: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['before', 'after', 'follow_up', 'report', 'other'],
    default: 'other'
  },
  treatmentArea: {
    type: String,
    trim: true
  },
  treatmentType: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  storageProvider: {
    type: String,
    default: 'aws_s3'
  },
  s3Bucket: String,
  s3Key: String,
  fileUrl: String,
  fileName: String,
  mimeType: String,
  fileSize: Number,
  consentTaken: {
    type: Boolean,
    default: false
  },
  consentNote: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedByRole: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Composite Indexes
patientProgressImageSchema.index({ organizationId: 1, patientId: 1, uploadedAt: -1 });
patientProgressImageSchema.index({ organizationId: 1, doctorId: 1 });

const PatientProgressImage = mongoose.model('PatientProgressImage', patientProgressImageSchema);

export default PatientProgressImage;
