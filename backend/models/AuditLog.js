import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String, // e.g., 'OVERRIDE_SUBSCRIPTION', 'UPDATE_ORG_STATUS', 'LOGIN'
    required: true,
  },
  targetType: {
    type: String, // e.g., 'Organization', 'User'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // JSON metadata about the change
  },
  ipAddress: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
