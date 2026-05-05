import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Brand Name
    genericName: { type: String, trim: true },        // Salt/Generic
    salt: { type: String, trim: true },               // Detailed salt
    form: { type: String, enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Gel', 'Lotion', 'Soap', 'Spray', 'Syringe', 'Other'], default: 'Tablet' },
    strength: { type: String, trim: true },           // e.g. 500mg, 5ml
    category: { type: String, trim: true },           // e.g. Antibiotic, Analgesic
    keywords: [String],
    
    // Auto-fill defaults
    defaultDose: { type: String },
    defaultWhen: { type: String },
    defaultFrequency: { type: String },
    defaultDuration: { type: String },
    
    isCommon: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    
    isGlobal: { type: Boolean, default: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
  }
);

medicineSchema.index({ name: 'text', genericName: 'text', salt: 'text', keywords: 'text' });
medicineSchema.index({ name: 1, genericName: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);
export default Medicine;
