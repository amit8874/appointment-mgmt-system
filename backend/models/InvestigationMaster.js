import mongoose from 'mongoose';

const InvestigationMasterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String }, // e.g., 'Blood Test', 'Radiology', 'Pathology'
  abbreviation: { type: String },
  keywords: [String],
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }, // Optional: link to a specific org if it's a custom test
  isCommon: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('InvestigationMaster', InvestigationMasterSchema);
