import mongoose from 'mongoose';

/**
 * Global Medicine Database
 * - NOT scoped to any organization/tenant
 * - Shared across ALL clinics using the platform
 * - Only stores medicine names for autocomplete/recommendation
 */
const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    // Normalized name for case-insensitive search
    nameLower: {
      type: String,
      index: true,
    },
    // How many times this medicine has been used (for ranking suggestions)
    usageCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-set nameLower before save
medicineSchema.pre('save', function (next) {
  this.nameLower = this.name.toLowerCase();
  next();
});

// Text index for fast search
medicineSchema.index({ name: 'text', nameLower: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;
