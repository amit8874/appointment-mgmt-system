import mongoose from 'mongoose';

const prescriptionTemplateSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  templateName: {
    type: String,
    required: true,
    trim: true
  },
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
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Ensure only one template is default per organization
prescriptionTemplateSchema.pre('save', async function (next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { organizationId: this.organizationId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

const PrescriptionTemplate = mongoose.model('PrescriptionTemplate', prescriptionTemplateSchema);
export default PrescriptionTemplate;
