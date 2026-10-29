import mongoose from 'mongoose';

const patientClinicalNoteSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false,
    index: true
  },
  patientName: {
    type: String,
    trim: true
  },
  patientPhone: {
    type: String,
    trim: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  doctorName: {
    type: String,
    trim: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  appointmentDate: {
    type: String,
    trim: true
  },
  appointmentTime: {
    type: String,
    trim: true
  },
  noteType: {
    type: String,
    enum: ['general', 'diagnosis', 'treatment', 'follow_up', 'observation', 'complaint', 'internal', 'appointment'],
    default: 'general',
    required: true
  },
  title: {
    type: String,
    trim: true
  },
  note: {
    type: String,
    required: true
  },
  privateNote: {
    type: String,
    trim: true
  },
  visibility: {
    type: String,
    enum: ['clinical', 'internal', 'both'],
    default: 'clinical'
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdByRole: {
    type: String,
    required: false,
    default: 'doctor'
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
patientClinicalNoteSchema.index({ organizationId: 1, patientId: 1 });
patientClinicalNoteSchema.index({ organizationId: 1, patientId: 1, createdAt: -1 });
patientClinicalNoteSchema.index({ organizationId: 1, doctorId: 1 });
patientClinicalNoteSchema.index({ organizationId: 1, createdAt: -1 });

const PatientClinicalNote = mongoose.model('PatientClinicalNote', patientClinicalNoteSchema);

export default PatientClinicalNote;
