import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: false, // Optional for global medicines
    },
    name: { type: String, required: true, trim: true }, // medicineName
    genericName: { type: String, trim: true },        // genericName
    manufacturer: { type: String, trim: true },
    category: { type: String, trim: true },
    type: { 
      type: String, 
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Powder', 'Drops', 'Suspension', 'Spray', 'Gel', 'Lotion', 'Sachet', 'Liquid', 'Inhaler', 'Other'], 
      default: 'Tablet' 
    },
    dose: { type: String, trim: true },               // strength
    packSize: { type: String, trim: true },
    unit: { type: String, trim: true },
    hsnCode: { type: String, trim: true },
    gstPercentage: { type: Number, default: 0 },
    minimumStockAlert: { type: Number, default: 10 },
    medicineImage: { type: String },
    description: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    
    // Legacy support or extra fields
    salt: { type: String, trim: true },
    isCommon: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    isGlobal: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

medicineSchema.index({ name: 'text', genericName: 'text', manufacturer: 'text' });
medicineSchema.index({ organizationId: 1, name: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);
export default Medicine;
