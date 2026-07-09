import mongoose from 'mongoose';

const expenseRecordSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  expenseType: {
    type: String,
    enum: ['Dental Equipment', 'Dental Consumer Products', 'Dental Lab Expenses'],
    required: true,
  },
  recordName: {
    type: String,
    required: true,
    trim: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileKey: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true
});

expenseRecordSchema.index({ organizationId: 1, expenseType: 1 });
expenseRecordSchema.index({ organizationId: 1, recordName: 'text' });

export default mongoose.model('ExpenseRecord', expenseRecordSchema);
