import Organization from '../models/Organization.js';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { uploadToS3 } from '../utils/uploadToS3.js';

const extractObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object") {
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
    if (value.toString && mongoose.Types.ObjectId.isValid(value.toString())) return value.toString();
    return null;
  }
  if (typeof value === "string") {
    if (value === "[object Object]" || value === "undefined" || value === "null") return null;
    if (mongoose.Types.ObjectId.isValid(value)) return value;
  }
  return null;
};

// GET /api/clinic/prescription-template
export const getSettings = async (req, res) => {
  try {
    const organizationId = extractObjectId(req.user?.organizationId) || extractObjectId(req.tenantId);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }

    const org = await Organization.findById(organizationId).select('prescriptionTemplate');
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    res.status(200).json({
      success: true,
      data: org.prescriptionTemplate || {}
    });
  } catch (error) {
    console.error("Get Template Settings Error:", error);
    res.status(500).json({ success: false, message: "Error fetching template settings", error: error.message });
  }
};

// PUT /api/clinic/prescription-template/settings
export const updateSettings = async (req, res) => {
  try {
    const organizationId = extractObjectId(req.user?.organizationId) || extractObjectId(req.tenantId);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }

    const { enabled, printableArea, fontSize } = req.body;

    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    if (!org.prescriptionTemplate) {
      org.prescriptionTemplate = {};
    }

    if (enabled !== undefined) org.prescriptionTemplate.enabled = enabled;
    if (fontSize !== undefined) org.prescriptionTemplate.fontSize = fontSize;
    
    if (printableArea) {
      if (!org.prescriptionTemplate.printableArea) org.prescriptionTemplate.printableArea = {};
      if (printableArea.top !== undefined) org.prescriptionTemplate.printableArea.top = printableArea.top;
      if (printableArea.left !== undefined) org.prescriptionTemplate.printableArea.left = printableArea.left;
      if (printableArea.right !== undefined) org.prescriptionTemplate.printableArea.right = printableArea.right;
      if (printableArea.bottom !== undefined) org.prescriptionTemplate.printableArea.bottom = printableArea.bottom;
    }

    org.prescriptionTemplate.updatedAt = Date.now();
    
    // We only update prescriptionTemplate, skip pre-save hooks to avoid slug issues
    await Organization.updateOne(
      { _id: organizationId }, 
      { $set: { prescriptionTemplate: org.prescriptionTemplate } }
    );

    res.status(200).json({
      success: true,
      message: "Template settings updated successfully",
      data: org.prescriptionTemplate
    });
  } catch (error) {
    console.error("Update Template Settings Error:", error);
    res.status(500).json({ success: false, message: "Error updating template settings", error: error.message });
  }
};

// POST /api/clinic/prescription-template/upload
export const uploadTemplate = async (req, res) => {
  try {
    const organizationId = extractObjectId(req.user?.organizationId) || extractObjectId(req.tenantId);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }

    // Check if file exists. Usually handled by multer
    const file = req.files?.image?.[0] || req.file;
    
    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    // Process with sharp (A4 resolution at 300 DPI is approx 2480x3508)
    const processedImageBuffer = await sharp(file.buffer || file.path)
      .resize({
        width: 2480,
        height: 3508,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFormat('webp', { quality: 85 })
      .toBuffer();

    // Create a mock file object for uploadToS3
    const processedFile = {
      buffer: processedImageBuffer,
      originalname: `prescription_template_${organizationId}_${Date.now()}.webp`,
      mimetype: 'image/webp'
    };

    const s3Result = await uploadToS3({
      file: processedFile,
      folderType: 'prescriptions',
      organizationId
    });

    const templateUrl = s3Result.signedUrl || s3Result.fileUrl;

    const org = await Organization.findById(organizationId);
    if (!org.prescriptionTemplate) org.prescriptionTemplate = {};
    
    org.prescriptionTemplate.templateUrl = templateUrl;
    org.prescriptionTemplate.updatedAt = Date.now();

    await Organization.updateOne(
      { _id: organizationId }, 
      { $set: { prescriptionTemplate: org.prescriptionTemplate } }
    );

    res.status(200).json({
      success: true,
      message: "Template uploaded successfully",
      templateUrl,
      data: org.prescriptionTemplate
    });
  } catch (error) {
    console.error("Upload Template Error:", error);
    res.status(500).json({ success: false, message: "Error uploading template", error: error.message });
  }
};

// DELETE /api/clinic/prescription-template
export const deleteTemplate = async (req, res) => {
  try {
    const organizationId = extractObjectId(req.user?.organizationId) || extractObjectId(req.tenantId);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    if (org.prescriptionTemplate) {
      org.prescriptionTemplate.templateUrl = "";
      org.prescriptionTemplate.enabled = false;
      org.prescriptionTemplate.updatedAt = Date.now();
      
      await Organization.updateOne(
        { _id: organizationId }, 
        { $set: { prescriptionTemplate: org.prescriptionTemplate } }
      );
    }

    res.status(200).json({
      success: true,
      message: "Template removed successfully",
      data: org.prescriptionTemplate
    });
  } catch (error) {
    console.error("Delete Template Error:", error);
    res.status(500).json({ success: false, message: "Error deleting template", error: error.message });
  }
};
