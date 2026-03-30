import InvoiceTemplate from '../models/InvoiceTemplate.js';

// Get all templates for an organization
export const getTemplates = async (req, res) => {
  try {
    console.log(`[TEMPLATES] Fetching templates for organization: ${req.tenantId}`);
    const templates = await InvoiceTemplate.find({ 
      organizationId: req.tenantId 
    }).sort({ createdAt: -1 });
    console.log(`[TEMPLATES] Found ${templates.length} templates`);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new template
export const createTemplate = async (req, res) => {
  try {
    const newTemplate = new InvoiceTemplate({
      ...req.body,
      organizationId: req.tenantId,
    });
    await newTemplate.save();
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a template
export const updateTemplate = async (req, res) => {
  try {
    const template = await InvoiceTemplate.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.tenantId },
      req.body,
      { new: true }
    );
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
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
