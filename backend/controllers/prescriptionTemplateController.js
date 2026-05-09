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
    
    // Helper to get image as base64 for Puppeteer
    const getBase64Image = async (filePath) => {
      if (!filePath) return null;
      try {
        if (filePath.startsWith('http')) {
          const axios = (await import('axios')).default;
          const response = await axios.get(filePath, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data, 'binary');
          const ext = filePath.split('?')[0].split('.').pop() || 'png';
          return `data:image/${ext};base64,${buffer.toString('base64')}`;
        }

        // Fix for Windows: ensure we don't treat '/uploads/...' as root of the E: drive
        let absolutePath;
        if (path.isAbsolute(filePath) && /^[a-zA-Z]:/.test(filePath)) {
          // It's a full Windows absolute path (e.g., E:\...)
          absolutePath = filePath;
        } else {
          // It's a relative path or absolute from project root (e.g., /uploads/...)
          const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
          absolutePath = path.join(process.cwd(), cleanPath);
        }
        
        console.log("Attempting to load image from:", absolutePath);
        
        if (fs.existsSync(absolutePath)) {
          const fileBuffer = fs.readFileSync(absolutePath);
          const ext = path.extname(absolutePath).slice(1) || 'png';
          return `data:image/${ext};base64,${fileBuffer.toString('base64')}`;
        } else {
          console.warn("Image file does not exist at:", absolutePath);
        }
      } catch (err) {
        console.error("Base64 conversion error:", err.message);
      }
      return null;
    };

    // Construct Logo
    const logoBase64 = organization?.branding?.logo ? await getBase64Image(organization.branding.logo) : null;

    let headerHtml = '';
    if (template?.headerType === 'custom' && template?.headerImage) {
      const headerBase64 = await getBase64Image(template.headerImage);
      headerHtml = headerBase64 ? `<img src="${headerBase64}" style="width: 100%; max-height: 150px; object-fit: contain;" />` : '';
    } else {
      headerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2px solid #eee;">
          <div style="display: flex; align-items: center; gap: 15px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="height: 80px; width: 80px; object-fit: contain;" />` : ''}
            <div>
              <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 900; text-transform: uppercase;">${organization?.name || 'Clinic Name'}</h1>
              <div style="margin: 5px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">
                ${[
                  organization?.address?.street,
                  organization?.address?.city,
                  organization?.address?.state,
                  organization?.address?.zipCode || organization?.address?.zip
                ].filter(Boolean).join(', ')}<br/>
                Contact: ${organization?.phone || ''}
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #4338ca; font-size: 22px; font-weight: 900; text-transform: uppercase;">${prescriptionData.doctorName?.toLowerCase().startsWith('dr') ? '' : 'Dr. '}${prescriptionData.doctorName || 'Doctor'}</h2>
            <p style="margin: 2px 0; font-size: 12px; font-weight: bold; color: #6366f1; text-transform: uppercase; border-bottom: 2px solid #eef2ff; padding-bottom: 2px; display: inline-block;">${prescriptionData.doctorQualification || prescriptionData.qualification || 'MBBS, MD'}</p>
            <p style="margin: 2px 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${prescriptionData.doctorSpecialization || prescriptionData.specialty || 'Specialist'}</p>
          </div>
        </div>
      `;
    }
      
    let footerHtml = '';
    if (template?.footerType === 'custom' && template?.footerImage) {
      const footerBase64 = await getBase64Image(template.footerImage);
      footerHtml = footerBase64 ? `<img src="${footerBase64}" style="width: 100%; max-height: 80px; object-fit: contain;" />` : '';
    } else {
      footerHtml = `<div style="padding: 10px; text-align: center; border-top: 1px solid #eee; font-size: 10px; color: #999; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Powered by Oviaan</div>`;
    }
      
    let bodyBg = '';
    if (template?.bodyType === 'custom' && template?.bodyImage) {
      const bodyBase64 = await getBase64Image(template.bodyImage);
      if (bodyBase64) {
        bodyBg = `background-image: url('${bodyBase64}'); background-size: 60%; background-position: center; background-repeat: no-repeat; opacity: 0.05;`;
      }
    }

    // Logic to handle structured JSON or raw text
    let contentHtml = '';
    let parsedData = null;
    try {
      if (typeof prescriptionData?.notes === 'string' && prescriptionData.notes.trim().startsWith('{')) {
        parsedData = JSON.parse(prescriptionData.notes);
      }
    } catch (e) {}

    if (parsedData) {
      contentHtml = `
        <div style="font-size: 14px;">
          ${(parsedData.vitals || parsedData.complaints || parsedData.diagnosis) ? `
            <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
              ${parsedData.vitals ? `<p><strong>Vitals:</strong> ${Object.entries(parsedData.vitals).filter(([_,v])=>v).map(([k,v])=>`${k}: ${v}`).join(', ')}</p>` : ''}
              ${parsedData.complaints?.length > 0 ? `<p><strong>Complaints:</strong> ${parsedData.complaints.map(c=>c.name).join(', ')}</p>` : ''}
              ${parsedData.diagnosis?.length > 0 ? `<p><strong>Diagnosis:</strong> ${parsedData.diagnosis.map(d=>d.name).join(', ')}</p>` : ''}
            </div>
          ` : ''}
          
          <div style="font-size: 32px; font-style: italic; font-weight: bold; margin-bottom: 10px;">Rx</div>
          
          ${parsedData.medications?.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Medicine</th>
                  <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Dose</th>
                  <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Timing</th>
                  <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Freq</th>
                </tr>
              </thead>
              <tbody>
                ${parsedData.medications.map(m => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${m.name}</strong><br/><small>${m.composition || ''}</small></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.dose}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.when}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.frequency}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${parsedData.testsRequested?.length > 0 ? `
            <div style="margin-top: 20px;">
              <p style="font-weight: bold; color: #1e293b; margin-bottom: 8px;">Tests Required:</p>
              <div style="font-size: 13px;">
                ${parsedData.testsRequested.map((t, i) => `
                  <div style="margin-bottom: 5px; display: flex; align-items: center;">
                    <span style="background: #eef2ff; color: #4f46e5; border: 1px solid #e0e7ff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 10px;">${String(i + 1).padStart(2, '0')}</span>
                    <span style="font-weight: 600;">${t}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${parsedData.advice ? `
            <div style="margin-top: 20px;">
              <p style="font-weight: bold; color: #1e293b; margin-bottom: 5px;">Clinical Advice:</p>
              <p style="white-space: pre-wrap; font-size: 13px; color: #334155; line-height: 1.5;">${parsedData.advice}</p>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      contentHtml = `<div style="font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${prescriptionData?.notes || ''}</div>`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 0; box-sizing: border-box; color: #1e293b; }
          .container { width: 100%; min-height: 100vh; position: relative; display: flex; flex-direction: column; }
          .header { padding: 30px 40px 10px 40px; }
          .patient-info { padding: 12px 40px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 30px 40px; flex: 1; position: relative; }
          .watermark { position: absolute; top: 0; left: 0; right: 0; bottom: 0; ${bodyBg} z-index: -1; }
          .footer { width: 100%; min-height: 60px; display: flex; align-items: center; justify-content: center; margin-top: auto; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f8fafc; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .rx-symbol { font-size: 28px; font-weight: bold; font-family: serif; font-style: italic; color: #0f172a; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">${headerHtml}</div>
          <div class="patient-info">
            <span>Name: ${patientData?.name || 'Unknown'}</span>
            <span>Age/Sex: ${patientData?.age || '--'} / ${patientData?.gender || '--'}</span>
            <span>Date: ${prescriptionData?.date ? new Date(prescriptionData.date).toLocaleDateString() : new Date().toLocaleDateString()}</span>
          </div>
          <div class="content">
            <div class="watermark"></div>
            ${contentHtml}
          </div>
          <div class="footer">${footerHtml}</div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    console.log("PDF generated successfully. Size:", pdfBuffer.length, "bytes");

    // Upload PDF buffer to S3 directly
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
