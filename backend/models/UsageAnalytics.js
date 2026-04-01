import mongoose from 'mongoose';

const usageAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },
  role: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  lastPulse: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number,
    default: 0, // in seconds
  },
  device: {
    type: String,
    enum: ['Mobile', 'Desktop', 'Tablet'],
    default: 'Desktop',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexings for faster Lookups and Aggregation
usageAnalyticsSchema.index({ userId: 1, organizationId: 1, path: 1, lastPulse: -1 });
usageAnalyticsSchema.index({ organizationId: 1, lastPulse: -1 });
usageAnalyticsSchema.index({ path: 1 });

export default mongoose.model('UsageAnalytics', usageAnalyticsSchema);
