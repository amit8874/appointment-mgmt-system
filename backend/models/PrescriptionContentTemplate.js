import mongoose from 'mongoose';

const prescriptionContentTemplateSchema = new mongoose.Schema({
  templateName: {
    type: String,
    required: true,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  medications: [
    {
      name: { type: String, required: true, trim: true },
      composition: { type: String, trim: true, default: '' },
      genericName: { type: String, trim: true, default: '' },
      form: { type: String, trim: true, default: '' },
      strength: { type: String, trim: true, default: '' },
      dose: { type: String, trim: true, default: '' },
      when: { type: String, trim: true, default: 'After Food' },
      frequency: { type: String, trim: true, default: 'Daily' },
      duration: { type: String, trim: true, default: '' },
      instructions: { type: String, trim: true, default: '' }
    }
  ],
  advice: {
    type: String,
    trim: true,
    default: ''
  },
  testsRequested: [
    {
      type: String,
      trim: true
    }
  ],
  complaints: [
    {
      name: { type: String, trim: true },
      frequency: { type: String, trim: true, default: 'daily' },
      severity: { type: String, trim: true, default: 'mild' },
      duration: { type: String, trim: true },
      durationUnit: { type: String, trim: true, default: 'days' }
    }
  ],
  diagnosis: [
    {
      name: { type: String, trim: true },
      duration: { type: String, trim: true },
      durationUnit: { type: String, trim: true, default: 'days' }
    }
  ]
}, { timestamps: true });

// Unique index: a doctor within an organization cannot have duplicate template names
prescriptionContentTemplateSchema.index(
  { templateName: 1, doctorId: 1, organizationId: 1 },
  { unique: true }
);

const PrescriptionContentTemplate = mongoose.model(
  'PrescriptionContentTemplate',
  prescriptionContentTemplateSchema
);

export default PrescriptionContentTemplate;
