import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  gstNumber: { type: String, trim: true },
  address: { type: String, trim: true },
  openingBalance: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

supplierSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export default mongoose.model('Supplier', supplierSchema);
