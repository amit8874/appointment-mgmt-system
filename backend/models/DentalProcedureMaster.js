import mongoose from 'mongoose';

const dentalProcedureMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  defaultCost: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, { timestamps: true });

// Ensure uniqueness of procedure name per organization
dentalProcedureMasterSchema.index({ name: 1, organizationId: 1 }, { unique: true });

const DentalProcedureMaster = mongoose.model('DentalProcedureMaster', dentalProcedureMasterSchema);

export default DentalProcedureMaster;
