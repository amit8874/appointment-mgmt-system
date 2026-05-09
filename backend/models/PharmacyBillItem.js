import mongoose from 'mongoose';

const pharmacyBillItemSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Billing',
    required: true,
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicineBatch',
    required: true,
  },
  medicineName: { type: String },
  batchNo: { type: String },
  expiryDate: { type: Date },
  mrp: { type: Number },
  sellingPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  gstPercentage: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model('PharmacyBillItem', pharmacyBillItemSchema);
