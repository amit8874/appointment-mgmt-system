import mongoose from 'mongoose';

const progressNoteMasterSchema = new mongoose.Schema({
  note: {
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
    ref: 'Doctor',
    index: true
  },
  noteType: {
    type: String,
    enum: ['before', 'after', 'general', 'title', 'area'],
    default: 'general'
  },
  usageCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Uniqueness per organization and note content
progressNoteMasterSchema.index({ note: 1, organizationId: 1 }, { unique: true });

const ProgressNoteMaster = mongoose.model('ProgressNoteMaster', progressNoteMasterSchema);

export default ProgressNoteMaster;
