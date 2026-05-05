import { sendPrescriptionEmail } from '../services/emailService.js';
import PrescriptionTemplate from '../models/PrescriptionTemplate.js';
import puppeteer from 'puppeteer';

/**
 * Endpoint to send a prescription to a patient's email.
 */
export const sendPrescriptionMail = async (req, res) => {
    try {
        const { email, patientName, notes, clinicName, organizationId, useTemplate } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Patient email is required." });
        }
        if (!notes) {
            return res.status(400).json({ success: false, message: "Prescription notes are required." });
        }

        let pdfBuffer = null;

        // If useTemplate is requested and organizationId is provided, generate PDF
        if (useTemplate && organizationId) {
            try {
                console.log(`[Email Controller] Generating PDF for organization: ${organizationId}`);
                
                // --- PDF Generation Logic (similar to prescriptionTemplateController) ---
                const template = await PrescriptionTemplate.findOne({ organizationId, isDefault: true });
                const host = req.protocol + '://' + req.get('host');
                
                let headerHtml = template?.headerType === 'custom' && template?.headerImage
                    ? `<img src="${host}${template.headerImage}" style="width: 100%; object-fit: contain;" />`
                    : `<div style="padding: 20px; text-align: center; border-bottom: 2px solid #ccc;"><h1>${clinicName || 'Clinic'}</h1></div>`;
                    
                let footerHtml = template?.footerType === 'custom' && template?.footerImage
                    ? `<img src="${host}${template.footerImage}" style="width: 100%; object-fit: contain;" />`
                    : `<div style="padding: 20px; text-align: center; border-top: 2px solid #ccc; font-weight: bold; font-size: 12px; color: #555;">Powered by Oviaan</div>`;
                    
                let bodyBg = template?.bodyType === 'custom' && template?.bodyImage
                    ? `background-image: url('${host}${template.bodyImage}'); background-size: 80%; background-position: center; background-repeat: no-repeat; opacity: 0.1;`
                    : '';

                // Handle structured data if notes is JSON
                let contentHtml = '';
                let parsedData = null;
                try {
                  if (notes.trim().startsWith('{')) {
                    parsedData = JSON.parse(notes);
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
                    </div>`;
                } else {
                    contentHtml = `<div style="font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${notes}</div>`;
                }

                const htmlContent = `
                <html>
                <head><style>body{font-family:Arial;margin:0;padding:0;}.container{width:100%;min-height:100vh;display:flex;flex-direction:column;}.header{min-height:120px;display:flex;align-items:center;justify-content:center;}.patient-info{padding:15px 30px;background:#f8f9fa;border-bottom:1px solid #eee;display:flex;justify-content:space-between;font-size:12px;font-weight:bold;}.content{padding:40px 60px;flex:1;position:relative;}.watermark{position:absolute;top:0;left:0;right:0;bottom:0;${bodyBg}z-index:-1;}.footer{min-height:80px;display:flex;align-items:center;justify-content:center;margin-top:auto;}</style></head>
                <body>
                    <div class="container">
                        <div class="header">${headerHtml}</div>
                        <div class="patient-info">
                            <span>Name: ${patientName}</span>
                            <span>Date: ${new Date().toLocaleDateString()}</span>
                        </div>
                        <div class="content"><div class="watermark"></div>${contentHtml}</div>
                        <div class="footer">${footerHtml}</div>
                    </div>
                </body>
                </html>`;

                const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
                const page = await browser.newPage();
                await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
                pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
                await browser.close();
            } catch (err) {
                console.error("[Email Controller] PDF Generation Failed:", err);
                // Continue sending email without PDF if generation fails
            }
        }

        console.log(`[Email Controller] Sending prescription to: ${email}`);

        const result = await sendPrescriptionEmail(email, patientName || 'Patient', notes, clinicName, pdfBuffer);

        if (result) {
            return res.status(200).json({
                success: true,
                message: "Prescription email sent successfully."
            });
        } else {
            throw new Error("Failed to send email.");
        }
    } catch (error) {
        console.error(`[Email Controller] Error:`, error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to send prescription email.",
            error: error.message
        });
    }
};
