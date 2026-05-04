import mongoose from 'mongoose';

const whatsappCreditTransactionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ["DEDUCT", "RECHARGE", "MONTHLY_RESET", "REFUND", "ADJUSTMENT"],
    required: true
  },
  messageType: {
    type: String
  },
  credits: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  relatedEntityType: {
    type: String
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  status: {
    type: String,
    enum: ["SUCCESS", "FAILED", "PENDING"],
    default: "SUCCESS"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Added useful indexes
whatsappCreditTransactionSchema.index({ organization: 1, createdAt: -1 });
whatsappCreditTransactionSchema.index({ organization: 1, type: 1 });
whatsappCreditTransactionSchema.index({ organization: 1, messageType: 1 });

export default mongoose.model('WhatsAppCreditTransaction', whatsappCreditTransactionSchema);
