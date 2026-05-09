import InvoiceTemplate from '../models/InvoiceTemplate.js';
import { uploadToS3 } from '../utils/uploadToS3.js';
import { getSignedDownloadUrl } from '../services/s3Service.js';

// Helper to freshen S3 URLs
const freshenS3Urls = async (template) => {
  const fields = ['headerImage', 'bodyImage', 'footerImage'];
  for (const field of fields) {
    const url = template[field];
    if (url && (url.includes('s3.amazonaws.com') || url.includes('.s3.'))) {
      try {
        // Extract key: everything after the bucket name part
        // Pattern: https://bucket-name.s3.region.amazonaws.com/key
        const urlParts = url.split('.com/');
        if (urlParts.length > 1) {
          const key = urlParts[1].split('?')[0]; // Remove existing query params
          const freshUrl = await getSignedDownloadUrl({ key, expiresInSeconds: 3600 });
          template[field] = freshUrl;
        }
      } catch (err) {
        console.warn(`[TEMPLATES] Failed to freshen ${field} for template ${template._id}:`, err.message);
      }
    }
  }
  return template;
};

// Get all templates for an organization
export const getTemplates = async (req, res) => {
  try {
    console.log(`[TEMPLATES] Fetching templates for organization: ${req.tenantId}`);
    const templates = await InvoiceTemplate.find({ 
      organizationId: req.tenantId 
    }).sort({ createdAt: -1 }).lean(); // Use lean for easy modification

    const freshenedTemplates = await Promise.all(templates.map(t => freshenS3Urls(t)));
    
    console.log(`[TEMPLATES] Found ${freshenedTemplates.length} templates`);
    res.json(freshenedTemplates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new template
export const createTemplate = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const files = req.files || {};
    
    const uploadFileToS3 = async (fieldname) => {
      if (files[fieldname] && files[fieldname].length > 0) {
        try {
          const s3Result = await uploadToS3({
            file: files[fieldname][0],
            folderType: 'invoices',
            organizationId
          });
          return s3Result.signedUrl || s3Result.fileUrl;
        } catch (err) {
          console.error(`Failed to upload ${fieldname} to S3:`, err);
        }
      }
      return null;
    };

    const headerImage = await uploadFileToS3('headerImage');
    const bodyImage = await uploadFileToS3('bodyImage');
    const footerImage = await uploadFileToS3('footerImage');

    // Handle stringified objects if multipart form data is used
    let data = { ...req.body };
    if (typeof data.metadata === 'string') {
      try {
        data.metadata = JSON.parse(data.metadata);
      } catch (e) {
        console.warn('Failed to parse metadata string');
      }
    }

    if (!data.htmlLayout) {
      data.htmlLayout = 'CORE_LAYOUT_REFERENCE';
    }

    if (typeof data.isDefault === 'string') {
      data.isDefault = data.isDefault === 'true';
    }

    const newTemplate = new InvoiceTemplate({
      ...data,
      organizationId,
      headerImage,
      bodyImage,
      footerImage
    });

    await newTemplate.save();
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Create Template Error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update a template
export const updateTemplate = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const files = req.files || {};
    
    const uploadFileToS3 = async (fieldname) => {
      if (files[fieldname] && files[fieldname].length > 0) {
        try {
          const s3Result = await uploadToS3({
            file: files[fieldname][0],
            folderType: 'invoices',
            organizationId
          });
          return s3Result.signedUrl || s3Result.fileUrl;
        } catch (err) {
          console.error(`Failed to upload ${fieldname} to S3:`, err);
        }
      }
      return null;
    };

    const headerImage = await uploadFileToS3('headerImage');
    const bodyImage = await uploadFileToS3('bodyImage');
    const footerImage = await uploadFileToS3('footerImage');

    let updateData = { ...req.body };
    if (typeof updateData.metadata === 'string') {
      try {
        updateData.metadata = JSON.parse(updateData.metadata);
      } catch (e) {
        console.warn('Failed to parse metadata string');
      }
    }

    if (headerImage) updateData.headerImage = headerImage;
    if (bodyImage) updateData.bodyImage = bodyImage;
    if (footerImage) updateData.footerImage = footerImage;

    if (typeof updateData.isDefault === 'string') {
      updateData.isDefault = updateData.isDefault === 'true';
    }

    const template = await InvoiceTemplate.findOneAndUpdate(
      { _id: req.params.id, organizationId },
      updateData,
      { new: true }
    );

    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    console.error('Update Template Error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Set default template
export const setDefaultTemplate = async (req, res) => {
  try {
    const template = await InvoiceTemplate.findOne({ 
      _id: req.params.id, 
      organizationId: req.tenantId 
    });
    
    if (!template) return res.status(404).json({ message: 'Template not found' });
    
    template.isDefault = true;
    await template.save(); // Pre-save hook handles old defaults
    
    res.json({ message: 'Default template updated', template });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a template
export const deleteTemplate = async (req, res) => {
  try {
    const template = await InvoiceTemplate.findOneAndDelete({ 
      _id: req.params.id, 
      organizationId: req.tenantId 
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const seedTemplates = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    
    // Clear existing for a clean seed if force is used
    if (req.query.force) {
      await InvoiceTemplate.deleteMany({ organizationId });
    } else {
      const existingCount = await InvoiceTemplate.countDocuments({ organizationId });
      if (existingCount > 0) {
        return res.status(400).json({ message: 'Templates already exist. Use ?force=true to re-seed.' });
      }
    }

    const baseLayouts = [
      { id: 'layout-standard', name: 'Elite Standard', type: 'standard', category: 'Professional' },
      { id: 'layout-modern', name: 'Modern Gradient', type: 'modern', category: 'Modern' },
      { id: 'layout-minimal', name: 'Minimal Clean', type: 'minimal', category: 'Minimal' },
      { id: 'layout-thermal', name: 'Quick Thermal', type: 'thermal', category: 'Thermal' },
      { id: 'layout-sidebar', name: 'Pro Sidebar', type: 'standard', category: 'Professional' }
    ];

    const newTemplates = baseLayouts.map((layout, index) => ({
      organizationId,
      name: layout.name,
      description: `A beautiful ${layout.category.toLowerCase()} layout for your clinical invoices.`,
      category: layout.category,
      layoutType: layout.type,
      htmlLayout: 'CORE_LAYOUT_REFERENCE', // Renderer now uses constants based on baseLayoutId
      isDefault: index === 0,
      metadata: {
        baseLayoutId: layout.id,
        primaryColor: index === 1 ? '#10b981' : '#3b82f6',
        secondaryColor: '#1e293b',
        fontFamily: 'Inter',
        showLogo: true,
        showGst: true,
        showPatientId: true,
        showDoctor: true,
        isCompact: false
      }
    }));

    console.log(`[TEMPLATES] Seeding ${newTemplates.length} templates for organization: ${organizationId}`);
    const created = await InvoiceTemplate.insertMany(newTemplates);
    console.log(`[TEMPLATES] Successfully created ${created.length} templates`);
    res.json({ message: `Successfully seeded ${created.length} dynamic base layouts.`, count: created.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
