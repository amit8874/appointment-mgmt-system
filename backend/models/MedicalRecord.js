import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false, // Optional, since patients might upload their own records
  },
  doctorName: {
    type: String,
    trim: true,
    default: 'Self Upload'
  },
  type: {
    type: String,
    enum: ['Lab', 'Prescription', 'Visit', 'Discharge', 'Upload'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Normal', 'Borderline', 'Verified', 'Pending', 'Completed', '-', 'Abnormal'],
    default: 'Pending',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  attachmentUrl: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

medicalRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('MedicalRecord', medicalRecordSchema);
