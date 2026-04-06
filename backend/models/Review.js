import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  doctorId: {
    type: String, // Consistent with doctorId in Doctor model
    required: true,
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    default: 5,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
  },
  isLike: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for performance
reviewSchema.index({ doctorId: 1 });
reviewSchema.index({ organizationId: 1 });

export default mongoose.model('Review', reviewSchema);
