import PrescriptionContentTemplate from '../models/PrescriptionContentTemplate.js';
import mongoose from 'mongoose';

// Create a new template or overwrite an existing one with the same name for that doctor
export const createTemplate = async (req, res) => {
  try {
    const { templateName, medications, advice, testsRequested, complaints, diagnosis } = req.body;
    
    // Resolve organizationId and doctorId from req.user/tenantId
    const organizationId = req.tenantId || req.user?.organizationId?._id || req.user?.organizationId;
    const doctorId = req.user?._id;

    if (!templateName || !organizationId || !doctorId) {
      return res.status(400).json({ 
        success: false, 
        message: 'templateName, organizationId, and doctorId are required.' 
      });
    }

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one medication is required to save a template.' 
      });
    }

    // Check if a template with this name already exists for this doctor in this organization
    const existing = await PrescriptionContentTemplate.findOne({
      templateName: templateName.trim(),
      doctorId,
      organizationId
    });

    if (existing) {
      // Overwrite the existing one
      existing.medications = medications;
      existing.advice = advice || '';
      existing.testsRequested = testsRequested || [];
      existing.complaints = complaints || [];
      existing.diagnosis = diagnosis || [];
      await existing.save();

      return res.status(200).json({
        success: true,
        message: 'Template updated successfully',
        template: existing
      });
    }

    // Create a new template
    const newTemplate = new PrescriptionContentTemplate({
      templateName: templateName.trim(),
      organizationId,
      doctorId,
      medications,
      advice: advice || '',
      testsRequested: testsRequested || [],
      complaints: complaints || [],
      diagnosis: diagnosis || []
    });

    await newTemplate.save();

    res.status(201).json({
      success: true,
      message: 'Template saved successfully',
      template: newTemplate
    });
  } catch (error) {
    console.error('Create Prescription Template Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saving prescription template', 
      error: error.message 
    });
  }
};

// List all templates for the authenticated doctor's organization
export const listTemplates = async (req, res) => {
  try {
    const organizationId = req.tenantId || req.user?.organizationId?._id || req.user?.organizationId;
    const doctorId = req.user?._id;

    if (!organizationId || !doctorId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Could not resolve organization or doctor identity.' 
      });
    }

    // Find templates created by this doctor in this organization
    const templates = await PrescriptionContentTemplate.find({
      organizationId,
      doctorId
    }).sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      templates 
    });
  } catch (error) {
    console.error('List Prescription Templates Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching prescription templates', 
      error: error.message 
    });
  }
};

// Delete a specific template by ID
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid template ID format.' 
      });
    }

    // Ensure they only delete their own template
    const template = await PrescriptionContentTemplate.findOne({
      _id: id,
      doctorId
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found or you are not authorized to delete it.' 
      });
    }

    await PrescriptionContentTemplate.findByIdAndDelete(id);

    res.status(200).json({ 
      success: true, 
      message: 'Template deleted successfully' 
    });
  } catch (error) {
    console.error('Delete Prescription Template Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting prescription template', 
      error: error.message 
    });
  }
};
