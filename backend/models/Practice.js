import mongoose from 'mongoose';

const practiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  street: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  pincode: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  }
}, { timestamps: true });

// Unique index on name and city to prevent duplicates
practiceSchema.index({ name: 1, city: 1 }, { unique: true });

export default mongoose.model('Practice', practiceSchema);
