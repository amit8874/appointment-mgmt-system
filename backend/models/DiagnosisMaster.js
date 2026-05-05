import mongoose from 'mongoose';

const DiagnosisMasterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  category: { type: String },
  icdCode: { type: String },
  
  // Intelligence Fields
  keywords: [String], // Simple search keywords (e.g. ['high bp', 'sugar'])
  aiSynonyms: [String], // Natural language variations for AI matching (e.g. ['blood pressure high', 'hypertensive'])
  commonComplaints: [String], // Complaint names that frequently lead to this diagnosis (e.g. ['Headache', 'Palpitation'])
  
  durationType: { type: String, enum: ['Acute', 'Chronic', 'Specialty'], default: 'Acute' },
  isCommon: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  isGlobal: { type: Boolean, default: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

DiagnosisMasterSchema.index({ name: 'text', keywords: 'text', aiSynonyms: 'text' });

const DiagnosisMaster = mongoose.model('DiagnosisMaster', DiagnosisMasterSchema);
export default DiagnosisMaster;
