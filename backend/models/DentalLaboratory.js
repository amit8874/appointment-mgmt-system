import mongoose from 'mongoose';

const dentalLaboratorySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  contactPerson: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  }
}, {
  timestamps: true
});

export default mongoose.model('DentalLaboratory', dentalLaboratorySchema);
