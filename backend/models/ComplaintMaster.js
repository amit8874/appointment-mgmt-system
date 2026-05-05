import mongoose from 'mongoose';

const complaintMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'General'
  },
  keywords: [{
    type: String,
    lowercase: true
  }],
  severityOptions: { 
    type: [String], 
    default: ['mild', 'moderate', 'severe'] 
  },
  frequencyOptions: { 
    type: [String], 
    default: ['daily', 'intermittent', 'continuous'] 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null // null means global
  }
}, { timestamps: true });

// Ensure uniqueness per organization (and global)
complaintMasterSchema.index({ name: 1, organizationId: 1 }, { unique: true });

const ComplaintMaster = mongoose.model('ComplaintMaster', complaintMasterSchema);

export default ComplaintMaster;
