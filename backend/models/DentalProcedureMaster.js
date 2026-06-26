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
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, { timestamps: true });

// Ensure uniqueness of procedure name per organization and doctor
dentalProcedureMasterSchema.index({ name: 1, organizationId: 1, doctorId: 1 }, { unique: true });

const DentalProcedureMaster = mongoose.model('DentalProcedureMaster', dentalProcedureMasterSchema);

export default DentalProcedureMaster;
