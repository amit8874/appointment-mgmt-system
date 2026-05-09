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
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  noteType: {
    type: String,
    enum: ['general', 'diagnosis', 'treatment', 'follow_up', 'observation', 'complaint', 'internal'],
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
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByRole: {
    type: String,
    required: true
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

const PatientClinicalNote = mongoose.model('PatientClinicalNote', patientClinicalNoteSchema);

export default PatientClinicalNote;
