import PrescriptionTemplate from '../models/PrescriptionTemplate.js';
import puppeteer from 'puppeteer';
import mongoose from 'mongoose';

const extractObjectId = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    return value._id || value.id || null;
  }

  if (typeof value === "string" && (value === "[object Object]" || value === "undefined" || value === "null")) {
    return null;
  }

  return value;
};

export const saveTemplate = async (req, res) => {
  try {
    const rawOrgId = req.body.organizationId;
    
    // Safely extract organizationId from multiple possible sources
    let organizationId = extractObjectId(rawOrgId) || 
                         extractObjectId(req.user?.organizationId) || 
                         extractObjectId(req.user?.organization) || 
                         extractObjectId(req.organization);

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
    
    // Construct URLs for uploaded images
    const getFileUrl = (fieldname) => {
      if (files[fieldname] && files[fieldname].length > 0) {
        return `/uploads/prescriptionTemplates/${files[fieldname][0].filename}`;
      }
      return null;
    };

    const headerImage = getFileUrl('headerImage');
    const bodyImage = getFileUrl('bodyImage');
    const footerImage = getFileUrl('footerImage');

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
    const organizationId = extractObjectId(req.params.organizationId);
    
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
    const organizationId = extractObjectId(req.params.organizationId);

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
    const organizationId = extractObjectId(req.body.organizationId);

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ success: false, message: "Valid organizationId is required" });
    }

    const { prescriptionData, patientData } = req.body;
    
    // Fetch default template
    const template = await PrescriptionTemplate.findOne({ organizationId, isDefault: true });
    
    // Get host URL to construct absolute image paths for Puppeteer
    const host = req.protocol + '://' + req.get('host');
    
    let headerHtml = template?.headerType === 'custom' && template?.headerImage
      ? `<img src="${host}${template.headerImage}" style="width: 100%; object-fit: contain;" />`
      : `<div style="padding: 20px; text-align: center; border-bottom: 2px solid #ccc;"><h1>Clinic Header</h1></div>`;
      
    let footerHtml = template?.footerType === 'custom' && template?.footerImage
      ? `<img src="${host}${template.footerImage}" style="width: 100%; object-fit: contain;" />`
      : `<div style="padding: 20px; text-align: center; border-top: 2px solid #ccc; font-weight: bold; font-size: 12px; color: #555;">Powered by Oviaan</div>`;
      
    let bodyBg = template?.bodyType === 'custom' && template?.bodyImage
      ? `background-image: url('${host}${template.bodyImage}'); background-size: 80%; background-position: center; background-repeat: no-repeat; opacity: 0.1;`
      : '';

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

          ${parsedData.advice ? `
            <div style="margin-top: 20px;">
              <p><strong>Clinical Advice:</strong></p>
              <p style="white-space: pre-wrap;">${parsedData.advice}</p>
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
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
          .container { width: 100%; min-height: 100vh; position: relative; display: flex; flex-direction: column; }
          .header { width: 100%; min-height: 120px; display: flex; align-items: center; justify-content: center; }
          .patient-info { padding: 15px 30px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; border-top: 1px solid #e9ecef; display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
          .content { padding: 40px 60px; flex: 1; position: relative; }
          .watermark { position: absolute; top: 0; left: 0; right: 0; bottom: 0; ${bodyBg} z-index: -1; }
          .footer { width: 100%; min-height: 80px; display: flex; align-items: center; justify-content: center; margin-top: auto; }
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
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=prescription.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ success: false, message: "Error generating PDF", error: error.message });
  }
};
