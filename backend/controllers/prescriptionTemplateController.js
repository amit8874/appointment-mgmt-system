import PrescriptionTemplate from '../models/PrescriptionTemplate.js';
import Organization from '../models/Organization.js';
import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { uploadToS3 } from '../utils/uploadToS3.js';

const extractObjectId = (value) => {
  if (!value) return null;

  // Handle Mongoose ObjectId instances
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === "object") {
    // If it's a populated document object
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
    // If it's somehow an object without _id but has toString that returns hex
    if (value.toString && mongoose.Types.ObjectId.isValid(value.toString())) {
      return value.toString();
    }
    return null;
  }

  if (typeof value === "string") {
    if (value === "[object Object]" || value === "undefined" || value === "null") {
      return null;
    }
    if (mongoose.Types.ObjectId.isValid(value)) {
      return value;
    }
  }

  return null;
};

export const saveTemplate = async (req, res) => {
  try {
    const rawOrgId = req.body.organizationId;
    
    // Safely extract organizationId from multiple possible sources
    let organizationId = extractObjectId(rawOrgId) || 
                         extractObjectId(req.user?.organizationId) || 
                         extractObjectId(req.user?.organization) || 
                         extractObjectId(req.organization) ||
                         req.tenantId;

    console.log("Raw Org Value:", rawOrgId);
    console.log("Final OrgId:", organizationId);

    // Validate organizationId
    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid organizationId is required. Organization not detected." 
      });
    }

    const { 
      templateName, 
      headerType, 
      bodyType, 
      footerType, 
      isDefault 
    } = req.body;

    const files = req.files || {};
    
    const uploadFileToS3 = async (fieldname) => {
      if (files[fieldname] && files[fieldname].length > 0) {
        try {
          const s3Result = await uploadToS3({
            file: files[fieldname][0],
            folderType: 'prescriptions',
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

    // Extract createdBy safely
    const createdBy = req.user?._id || req.user?.id;

    const isDefaultBool = isDefault === 'true' || isDefault === true;

    // If this is set as default, unset other defaults for this organization
    if (isDefaultBool) {
      await PrescriptionTemplate.updateMany(
        { organizationId },
        { isDefault: false }
      );
    }

    const templateData = {
      organizationId,
      templateName,
      headerType,
      bodyType,
      footerType,
      isDefault: isDefaultBool,
      createdBy: createdBy
    };

    if (headerImage) templateData.headerImage = headerImage;
    if (bodyImage) templateData.bodyImage = bodyImage;
    if (footerImage) templateData.footerImage = footerImage;

    const template = new PrescriptionTemplate(templateData);
    await template.save();

    res.status(201).json({
      success: true,
      message: "Template saved successfully",
      template
    });
  } catch (error) {
    console.error("Save Template Error:", error);
    res.status(500).json({ success: false, message: "Error saving template", error: error.message });
  }
};

export const listTemplates = async (req, res) => {
  try {
    const organizationId = extractObjectId(req.params.organizationId) || 
                           extractObjectId(req.tenantId) || 
                           extractObjectId(req.user?.organizationId);
    
    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ success: false, message: "Valid organizationId is required" });
    }

    const templates = await PrescriptionTemplate.find({ organizationId }).sort('-createdAt');
    
    res.status(200).json({
      success: true,
      templates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching templates", error: error.message });
  }
};

export const getDefaultTemplate = async (req, res) => {
  try {
    const organizationId = extractObjectId(req.params.organizationId) || 
                           extractObjectId(req.tenantId) || 
                           extractObjectId(req.user?.organizationId);

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ success: false, message: "Valid organizationId is required" });
    }

    const template = await PrescriptionTemplate.findOne({ organizationId, isDefault: true });
    
    res.status(200).json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching default template", error: error.message });
  }
};

export const generatePdf = async (req, res) => {
  try {
    const organizationId = extractObjectId(req.body.organizationId) || 
                           extractObjectId(req.tenantId) || 
                           extractObjectId(req.user?.organizationId);

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ success: false, message: "Valid organizationId is required" });
    }

    const { prescriptionData, patientData, templateId } = req.body;
    
    console.log("[generatePdf] Received templateId:", templateId);
    
    // Fetch template (specified or default)
    let template = null;
    if (templateId === 'system_default') {
      console.log("[generatePdf] Explicitly requested system default. Skipping custom templates.");
      // template remains null, so it falls back to system layout
    } else if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
      template = await PrescriptionTemplate.findById(templateId);
      console.log("[generatePdf] Found template by ID:", template ? template._id : "Not Found");
    } else {
      // Fallback to organization's custom default if no specific template is requested
      template = await PrescriptionTemplate.findOne({ organizationId, isDefault: true });
      console.log("[generatePdf] Using default template:", template ? template._id : "None");
    }
    
    // Fetch organization for logo and name
    const organization = await Organization.findById(organizationId);

    // 2. Generate PDF using central Service
    const { generatePrescriptionPDF } = await import('../services/pdfService.js');
    const pdfBuffer = await generatePrescriptionPDF(prescriptionData, patientData, organization, template);

    console.log("PDF generated successfully using pdfService. Size:", pdfBuffer.length, "bytes");

    // 3. Upload PDF buffer to S3 directly
    try {
      const fileName = `prescription_${Date.now()}_${Math.round(Math.random() * 1E9)}.pdf`;
      
      const s3Result = await uploadToS3({
        buffer: pdfBuffer,
        originalName: fileName,
        mimeType: 'application/pdf',
        folderType: 'prescriptions',
        organizationId
      });
      
      console.log("Uploaded PDF to S3 successfully:", s3Result.fileUrl);

      return res.status(200).json({ 
        success: true, 
        url: s3Result.signedUrl || s3Result.fileUrl,
        s3Metadata: {
          storageProvider: s3Result.storageProvider,
          s3Bucket: s3Result.s3Bucket,
          s3Key: s3Result.s3Key
        }
      });
      
    } catch (e) {
      console.error("Failed to upload PDF to S3:", e);
      return res.status(500).json({ success: false, message: "Failed to upload generated PDF to S3" });
    }
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ success: false, message: "Error generating PDF", error: error.message });
  }
};
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Valid template ID is required" });
    }

    const template = await PrescriptionTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    // Don't allow deleting the default template unless there are others
    if (template.isDefault) {
      const count = await PrescriptionTemplate.countDocuments({ organizationId: template.organizationId });
      if (count > 1) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot delete the default template. Please set another template as default first." 
        });
      }
    }

    await PrescriptionTemplate.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error) {
    console.error("Delete Template Error:", error);
    res.status(500).json({ success: false, message: "Error deleting template", error: error.message });
  }
};
