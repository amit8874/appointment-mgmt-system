import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false,
  },
  requestType: {
    type: String,
    enum: ['Lab Test', 'Medicine'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Approved', 'Shipped', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  // Dynamic JSON structure to support multiple types of requests
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  address: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

serviceRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('ServiceRequest', serviceRequestSchema);
