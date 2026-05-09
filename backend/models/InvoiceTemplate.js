import mongoose from 'mongoose';

const invoiceTemplateSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  headerType: {
    type: String,
    enum: ['default', 'custom'],
    default: 'default'
  },
  headerImage: {
    type: String, // URL or path to uploaded header image
    default: null
  },
  bodyType: {
    type: String,
    enum: ['default', 'custom'],
    default: 'default'
  },
  bodyImage: {
    type: String, // URL or path to uploaded body watermark/background
    default: null
  },
  footerType: {
    type: String,
    enum: ['default', 'custom'],
    default: 'default'
  },
  footerImage: {
    type: String, // URL or path to uploaded footer image
    default: null
  },
  layoutType: {
    type: String,
    enum: ['standard', 'sidebar', 'modern', 'minimal', 'thermal', 'pharmacy'],
    default: 'standard',
  },
  category: {
    type: String,
    default: 'Professional',
  },
  htmlLayout: {
    type: String,
    required: true,
  },
  cssStyles: {
    type: String,
    default: '',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  metadata: {
    baseLayoutId: { type: String, default: 'layout-standard' },
    primaryColor: { type: String, default: '#3b82f6' },
    secondaryColor: { type: String, default: '#1e293b' },
    fontFamily: { type: String, default: 'Inter' },
    showLogo: { type: Boolean, default: true },
    showGst: { type: Boolean, default: true },
    showPatientId: { type: Boolean, default: true },
    showDoctor: { type: Boolean, default: true },
    isCompact: { type: Boolean, default: false },
    gstNumber: { type: String, default: '' },
  }
}, {
  timestamps: true,
});

// Ensure only one default template per organization
invoiceTemplateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { organizationId: this.organizationId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

invoiceTemplateSchema.index({ organizationId: 1 });

export default mongoose.model('InvoiceTemplate', invoiceTemplateSchema);
