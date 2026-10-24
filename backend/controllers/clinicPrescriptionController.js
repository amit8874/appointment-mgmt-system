import Organization from '../models/Organization.js';
import mongoose from 'mongoose';
import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { uploadToS3 } from '../utils/uploadToS3.js';
import { resolveS3UrlIfNeeded } from '../services/s3Service.js';
import { createGroqChatCompletion } from '../utils/groqHelper.js';

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

    if (org.prescriptionTemplate && org.prescriptionTemplate.templateUrl) {
      const freshUrl = await resolveS3UrlIfNeeded(org.prescriptionTemplate.templateUrl);
      if (freshUrl && freshUrl !== org.prescriptionTemplate.templateUrl) {
        org.prescriptionTemplate.templateUrl = freshUrl;

        // For backwards compatibility: parse s3Key/pathname as templatePublicId if missing
        if (!org.prescriptionTemplate.templatePublicId) {
          try {
            const urlObj = new URL(freshUrl);
            let pathname = urlObj.pathname;
            if (pathname.startsWith('/')) {
              pathname = pathname.substring(1);
            }
            if (pathname) {
              org.prescriptionTemplate.templatePublicId = pathname.split('?')[0];
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }

        // Cache the fresh URL back to DB to minimize signing overhead next time
        await Organization.updateOne(
          { _id: organizationId },
          { $set: { prescriptionTemplate: org.prescriptionTemplate } }
        );
      }
    }

    const templateData = org.prescriptionTemplate ? (org.prescriptionTemplate.toObject ? org.prescriptionTemplate.toObject() : { ...org.prescriptionTemplate }) : {};

    // Defaults for headerArea & bodyArea if not yet populated
    if (!templateData.headerArea) {
      templateData.headerArea = {
        top: templateData.printableArea?.top ? Math.max(10, templateData.printableArea.top - 15) : 45,
        left: templateData.printableArea?.left !== undefined ? templateData.printableArea.left : 10,
        right: templateData.printableArea?.right !== undefined ? templateData.printableArea.right : 10,
        height: 25
      };
    }
    if (!templateData.bodyArea) {
      templateData.bodyArea = {
        top: templateData.printableArea?.top ? templateData.printableArea.top + 15 : 75,
        bottom: templateData.printableArea?.bottom !== undefined ? templateData.printableArea.bottom : 25,
        left: templateData.printableArea?.left !== undefined ? templateData.printableArea.left : 12,
        right: templateData.printableArea?.right !== undefined ? templateData.printableArea.right : 12
      };
    }

    if (!templateData.templateMode) {
      templateData.templateMode = 'manual';
    }

    res.status(200).json({
      success: true,
      data: templateData
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

    const { enabled, templateMode, printableArea, headerArea, bodyArea, aiHeaderArea, aiBodyArea, fontSize } = req.body;

    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    if (!org.prescriptionTemplate) {
      org.prescriptionTemplate = {};
    }

    if (enabled !== undefined) org.prescriptionTemplate.enabled = enabled;
    if (templateMode !== undefined) org.prescriptionTemplate.templateMode = templateMode;
    if (fontSize !== undefined) org.prescriptionTemplate.fontSize = fontSize;
    
    if (printableArea) {
      if (!org.prescriptionTemplate.printableArea) org.prescriptionTemplate.printableArea = {};
      if (printableArea.top !== undefined) org.prescriptionTemplate.printableArea.top = printableArea.top;
      if (printableArea.left !== undefined) org.prescriptionTemplate.printableArea.left = printableArea.left;
      if (printableArea.right !== undefined) org.prescriptionTemplate.printableArea.right = printableArea.right;
      if (printableArea.bottom !== undefined) org.prescriptionTemplate.printableArea.bottom = printableArea.bottom;
    }

    if (headerArea) {
      if (!org.prescriptionTemplate.headerArea) org.prescriptionTemplate.headerArea = {};
      if (headerArea.top !== undefined) org.prescriptionTemplate.headerArea.top = Number(headerArea.top);
      if (headerArea.left !== undefined) org.prescriptionTemplate.headerArea.left = Number(headerArea.left);
      if (headerArea.right !== undefined) org.prescriptionTemplate.headerArea.right = Number(headerArea.right);
      if (headerArea.height !== undefined) org.prescriptionTemplate.headerArea.height = Number(headerArea.height);
    }

    if (bodyArea) {
      if (!org.prescriptionTemplate.bodyArea) org.prescriptionTemplate.bodyArea = {};
      if (bodyArea.top !== undefined) org.prescriptionTemplate.bodyArea.top = Number(bodyArea.top);
      if (bodyArea.bottom !== undefined) org.prescriptionTemplate.bodyArea.bottom = Number(bodyArea.bottom);
      if (bodyArea.left !== undefined) org.prescriptionTemplate.bodyArea.left = Number(bodyArea.left);
      if (bodyArea.right !== undefined) org.prescriptionTemplate.bodyArea.right = Number(bodyArea.right);
    }

    if (aiHeaderArea) {
      if (!org.prescriptionTemplate.aiHeaderArea) org.prescriptionTemplate.aiHeaderArea = {};
      if (aiHeaderArea.top !== undefined) org.prescriptionTemplate.aiHeaderArea.top = Number(aiHeaderArea.top);
      if (aiHeaderArea.left !== undefined) org.prescriptionTemplate.aiHeaderArea.left = Number(aiHeaderArea.left);
      if (aiHeaderArea.right !== undefined) org.prescriptionTemplate.aiHeaderArea.right = Number(aiHeaderArea.right);
      if (aiHeaderArea.height !== undefined) org.prescriptionTemplate.aiHeaderArea.height = Number(aiHeaderArea.height);
    }

    if (aiBodyArea) {
      if (!org.prescriptionTemplate.aiBodyArea) org.prescriptionTemplate.aiBodyArea = {};
      if (aiBodyArea.top !== undefined) org.prescriptionTemplate.aiBodyArea.top = Number(aiBodyArea.top);
      if (aiBodyArea.bottom !== undefined) org.prescriptionTemplate.aiBodyArea.bottom = Number(aiBodyArea.bottom);
      if (aiBodyArea.left !== undefined) org.prescriptionTemplate.aiBodyArea.left = Number(aiBodyArea.left);
      if (aiBodyArea.right !== undefined) org.prescriptionTemplate.aiBodyArea.right = Number(aiBodyArea.right);
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

// POST /api/clinic/prescription-template/ai-analyze
export const analyzeTemplateWithAI = async (req, res) => {
  try {
    const organizationId = extractObjectId(req.user?.organizationId) || extractObjectId(req.tenantId);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    let imageBuffer = null;
    let newTemplateUrl = null;
    let newTemplatePublicId = null;
    const file = req.files?.image?.[0] || req.file;

    if (file) {
      const rawBuf = file.buffer || (file.path ? await fs.promises.readFile(file.path) : null);
      if (rawBuf) {
        imageBuffer = await sharp(rawBuf)
          .resize({
            width: 2480,
            height: 3508,
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .toFormat('webp', { quality: 85 })
          .toBuffer();

        try {
          const processedFile = {
            buffer: imageBuffer,
            originalname: `prescription_template_${organizationId}_${Date.now()}.webp`,
            mimetype: 'image/webp'
          };
          const s3Result = await uploadToS3({
            file: processedFile,
            folderType: 'prescriptions',
            organizationId
          });
          newTemplateUrl = s3Result.signedUrl || s3Result.fileUrl;
          newTemplatePublicId = s3Result.s3Key || '';
        } catch (uploadErr) {
          console.warn('[AI Vision Template] S3 Upload Warning:', uploadErr.message);
        }
      }
    } else if (org.prescriptionTemplate?.templateUrl) {
      const resolvedUrl = await resolveS3UrlIfNeeded(org.prescriptionTemplate.templateUrl);
      const response = await axios.get(resolvedUrl, { responseType: 'arraybuffer', timeout: 15000 });
      imageBuffer = Buffer.from(response.data);
    }

    if (!imageBuffer) {
      return res.status(400).json({ success: false, message: "No image file provided or saved on template to analyze." });
    }

    // 1. Get image dimensions
    const meta = await sharp(imageBuffer).metadata();
    const imgWidth = meta.width || 2480;
    const imgHeight = meta.height || 3508;

    // 2. Perform OCR with Tesseract
    let words = [];
    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(imageBuffer, {}, { blocks: true });
      await worker.terminate();

      if (ret.data?.blocks) {
        for (const b of ret.data.blocks) {
          for (const p of b.paragraphs || []) {
            for (const l of p.lines || []) {
              for (const w of l.words || []) {
                if (w.text && w.text.trim().length > 0) {
                  words.push({
                    text: w.text.trim(),
                    confidence: w.confidence,
                    x0_mm: Math.round((w.bbox.x0 / imgWidth) * 210),
                    x1_mm: Math.round((w.bbox.x1 / imgWidth) * 210),
                    y0_mm: Math.round((w.bbox.y0 / imgHeight) * 297),
                    y1_mm: Math.round((w.bbox.y1 / imgHeight) * 297)
                  });
                }
              }
            }
          }
        }
      }
    } catch (ocrErr) {
      console.warn("[AI Vision Template] OCR Warning:", ocrErr.message);
    }

    // 3. Algorithmic Pre-Scan of Pad Layout
    // Detect left sidebar (e.g. dental services / hospital info / clinic specialities on left side)
    const leftColumnWords = words.filter(w => w.y0_mm > 60 && w.y0_mm < 240 && w.x1_mm <= 85);
    const hasLeftSidebar = leftColumnWords.length >= 8;
    const sidebarMaxX = hasLeftSidebar ? Math.max(...leftColumnWords.map(w => w.x1_mm)) : 0;

    // Detect pre-printed Rx / O/E / Advice symbol
    const rxWord = words.find(w => /^(rx|rk|r|o\/e|advice|treatment)$/i.test(w.text) && w.y0_mm > 40 && w.y0_mm < 130);

    // Detect pre-printed footer (timings, address, disclaimer, medico-legal)
    const footerWords = words.filter(w => w.y0_mm > 240);
    const footerMinY = footerWords.length > 0 ? Math.min(...footerWords.map(w => w.y0_mm)) : 265;
    const recommendedBottomMargin = Math.max(25, Math.min(65, (297 - footerMinY) + 5));

    // 4. Prompt Groq LLM with Layout Context
    const systemPrompt = `You are an expert Medical Prescription Pad Layout Analyzer for clinic EMR printing.
We must calculate exact printing coordinates for an A4 paper (210mm width x 297mm height) with pre-printed letterhead.

Pre-analysis of uploaded pad:
- Has pre-printed left sidebar (services/specialties): ${hasLeftSidebar ? `YES (extends from left edge to x=${sidebarMaxX}mm)` : 'NO'}
- Pre-printed Rx / Advice position: ${rxWord ? `at x=${rxWord.x0_mm}mm, y=${rxWord.y0_mm}mm` : 'standard placement'}
- Pre-printed footer begins at: y=${footerMinY}mm (approx ${297 - footerMinY}mm from bottom edge)

OCR Words Sample:
${JSON.stringify(words.slice(0, 120))}

Your task:
1. "headerArea" (where patient Name, Age/Sex, Date print):
   - "top": in mm from top edge (usually 35 to 55mm, below clinic header)
   - "left": in mm from left edge (usually 10 to 20mm)
   - "right": in mm from right edge (RIGHT MARGIN: 10 to 25mm. NOT absolute x!)
   - "height": in mm (usually 20 to 25mm)
2. "bodyArea" (where medicines table and Rx print):
   - "top": in mm from top edge (must be below headerArea and below any printed Rx line, typically 65 to 75mm)
   - "bottom": in mm clearance from bottom edge (BOTTOM MARGIN: e.g. ${recommendedBottomMargin}mm to avoid footer. NOT absolute y!)
   - "left": in mm from left edge. ${hasLeftSidebar ? `IMPORTANT: Since there is a left sidebar ending at x=${sidebarMaxX}mm, body MUST start at left=${sidebarMaxX + 5}mm to avoid overlapping printed services!` : 'Standard left margin (10-15mm)'}
   - "right": in mm from right edge (RIGHT MARGIN: 10 to 15mm. NOT absolute x!)

IMPORTANT RULES:
- "right" is the RIGHT MARGIN (distance from right edge of paper, e.g. 10 to 15mm). Never return 180 or 200 for right!
- "bottom" is the BOTTOM MARGIN (distance from bottom edge of paper, e.g. 25 to 50mm). Never return 250 or 270 for bottom!

Respond STRICTLY in JSON format:
{
  "success": true,
  "confidence": "high" | "medium",
  "hasSidebar": ${hasLeftSidebar},
  "detectedFields": ["Doctor/Clinic Header", "Patient Info Header", ${hasLeftSidebar ? '"Left Services Sidebar", ' : ''}"Rx Prescription Area", "Footer Timings/Address"],
  "headerArea": { "top": number, "left": number, "right": number, "height": number },
  "bodyArea": { "top": number, "bottom": number, "left": number, "right": number },
  "summary": "Clear explanation of pad layout, sidebar detection, and calculated margins."
}`;

    let aiResult = {};
    try {
      const completion = await createGroqChatCompletion({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are a prescription pad layout analyzer. Output valid JSON only.' },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      aiResult = JSON.parse(completion.choices[0]?.message?.content);
    } catch (groqErr) {
      console.warn("[AI Vision Template] Groq Error/Fallback:", groqErr.message);
      aiResult = {
        success: true,
        confidence: "medium",
        detectedFields: ["Doctor Clinic Header", "Patient Info Header", hasLeftSidebar ? "Left Services Sidebar" : null, "Rx Area", "Footer"].filter(Boolean),
        headerArea: { top: 38, left: 12, right: 15, height: 22 },
        bodyArea: { 
          top: 70, 
          bottom: recommendedBottomMargin, 
          left: hasLeftSidebar ? (sidebarMaxX + 5) : 12, 
          right: 12 
        },
        summary: `Calibrated layout based on ${words.length} detected pad elements${hasLeftSidebar ? ' with left services column accommodated' : ''}.`
      };
    }

    // 5. Intelligent Normalization & Sanity Guards
    let finalHeaderArea = {
      top: Number(aiResult.headerArea?.top) || 38,
      left: Number(aiResult.headerArea?.left) || 12,
      right: Number(aiResult.headerArea?.right) || 15,
      height: Number(aiResult.headerArea?.height) || 22
    };

    let finalBodyArea = {
      top: Number(aiResult.bodyArea?.top) || 70,
      bottom: Number(aiResult.bodyArea?.bottom) || recommendedBottomMargin,
      left: Number(aiResult.bodyArea?.left) || (hasLeftSidebar ? sidebarMaxX + 5 : 12),
      right: Number(aiResult.bodyArea?.right) || 12
    };

    // Fix Right Margin if absolute X2 was returned (e.g. > 50mm)
    if (finalHeaderArea.right > 50) finalHeaderArea.right = Math.max(5, 210 - finalHeaderArea.right);
    if (finalBodyArea.right > 50) finalBodyArea.right = Math.max(5, 210 - finalBodyArea.right);

    // Fix Bottom Margin if absolute Y2 was returned (e.g. > 80mm)
    if (finalBodyArea.bottom > 80) finalBodyArea.bottom = Math.max(15, 297 - finalBodyArea.bottom);

    // Guarantee Left margin accommodates sidebar if detected
    if (hasLeftSidebar && finalBodyArea.left < sidebarMaxX) {
      finalBodyArea.left = sidebarMaxX + 5;
    }

    // Safeguard minimum printable widths and heights
    if (finalHeaderArea.left + finalHeaderArea.right > 170) {
      finalHeaderArea.right = Math.max(5, 210 - finalHeaderArea.left - 80);
    }
    if (finalBodyArea.left + finalBodyArea.right > 170) {
      finalBodyArea.right = Math.max(5, 210 - finalBodyArea.left - 80);
    }
    if (finalBodyArea.top + finalBodyArea.bottom > 260) {
      finalBodyArea.bottom = Math.max(20, 297 - finalBodyArea.top - 80);
    }
    finalHeaderArea.height = Math.max(18, Math.min(35, finalHeaderArea.height));

    if (!org.prescriptionTemplate) org.prescriptionTemplate = {};
    if (newTemplateUrl) {
      org.prescriptionTemplate.templateUrl = newTemplateUrl;
      org.prescriptionTemplate.templatePublicId = newTemplatePublicId;
      org.prescriptionTemplate.enabled = true;
    }
    org.prescriptionTemplate.templateMode = 'ai_vision';
    org.prescriptionTemplate.aiHeaderArea = finalHeaderArea;
    org.prescriptionTemplate.aiBodyArea = finalBodyArea;
    org.prescriptionTemplate.updatedAt = Date.now();

    await Organization.updateOne(
      { _id: organizationId },
      { $set: { prescriptionTemplate: org.prescriptionTemplate } }
    );

    res.status(200).json({
      success: true,
      message: "AI Vision Analysis Completed Successfully",
      confidence: aiResult.confidence || "high",
      detectedFields: aiResult.detectedFields || ["Name", "Age/Sex", "Date", "Chief Complain", "Rx"],
      headerArea: finalHeaderArea,
      bodyArea: finalBodyArea,
      summary: aiResult.summary || "AI successfully identified patient header and body clinical areas.",
      templateMode: 'ai_vision',
      templateUrl: newTemplateUrl || org.prescriptionTemplate.templateUrl
    });
  } catch (error) {
    console.error("AI Template Analysis Error:", error);
    res.status(500).json({ success: false, message: "Error running AI vision analysis", error: error.message });
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
    const templatePublicId = s3Result.s3Key || '';

    const org = await Organization.findById(organizationId);
    if (!org.prescriptionTemplate) org.prescriptionTemplate = {};
    
    org.prescriptionTemplate.templateUrl = templateUrl;
    org.prescriptionTemplate.templatePublicId = templatePublicId;
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
      org.prescriptionTemplate.templateMode = 'manual';
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
