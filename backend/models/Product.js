import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    index: true,
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
  },
  manufacturer: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    default: 0,
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for performance
productSchema.index(
  { organizationId: 1, barcode: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { barcode: { $type: "string" } } 
  }
);
productSchema.index({ organizationId: 1, name: 1 });

export default mongoose.model('Product', productSchema);
