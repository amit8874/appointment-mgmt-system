import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { resolveS3UrlIfNeeded } from './s3Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a high-fidelity PDF invoice using Puppeteer.
 * 
 * @param {object} bill - The bill object from MongoDB
 * @param {object} org - The organization object
 * @param {object} template - The InvoiceTemplate object (optional)
 * @returns {Promise<string>} - Absolute path to the generated PDF
 */

// Helper to get image as base64 for Puppeteer
const getBase64Image = async (filePath) => {
  if (!filePath) return null;
  try {
    if (filePath.startsWith('http')) {
      const resolvedPath = await resolveS3UrlIfNeeded(filePath);
      const axios = (await import('axios')).default;
      const response = await axios.get(resolvedPath, { 
        responseType: 'arraybuffer',
        timeout: 5000 // 5 second timeout for image fetching
      });
      const buffer = Buffer.from(response.data, 'binary');
      
      let mimeType = response.headers['content-type'] || response.headers['Content-Type'];
      if (!mimeType || !mimeType.startsWith('image/')) {
        const cleanUrl = resolvedPath.split('?')[0].toLowerCase();
        if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (cleanUrl.endsWith('.png')) mimeType = 'image/png';
        else if (cleanUrl.endsWith('.webp')) mimeType = 'image/webp';
        else if (cleanUrl.endsWith('.svg')) mimeType = 'image/svg+xml';
        else mimeType = 'image/png';
      }
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

      return `data:${mimeType};base64,${buffer.toString('base64')}`;
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
    
    if (fs.existsSync(absolutePath)) {
      const fileBuffer = fs.readFileSync(absolutePath);
      let ext = path.extname(absolutePath).slice(1).toLowerCase() || 'png';
      if (ext === 'jpg') ext = 'jpeg';
      let mimeType = `image/${ext}`;
      if (ext === 'svg') mimeType = 'image/svg+xml';
      return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.error("Base64 conversion error in pdfService:", err.message);
  }
  return null;
};

const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const g = ['', 'Thousand', 'Lakh', 'Crore'];

  const makeGroup = ([h, t, o]) => {
    return [
      h === '0' ? '' : a[Number(h)] + ' Hundred',
      Number(t + o) < 20 ? a[Number(t + o)] : b[Number(t)] + (o === '0' ? '' : ' ' + a[Number(o)])
    ].filter(Boolean).join(' ');
  };

  const formatIndian = (n) => {
    let s = n.toString().padStart(9, '0');
    let groups = [
      s.slice(0, 2), // Crore
      s.slice(2, 4), // Lakh
      s.slice(4, 6), // Thousand
      '0' + s.slice(6, 7), // Hundred (padded to match makeGroup logic)
      '0' + s.slice(7, 9)  // Tens/Ones (padded)
    ];
    
    // Correctly grouping for Indian system
    const cr = Number(s.slice(0, 2));
    const lak = Number(s.slice(2, 4));
    const th = Number(s.slice(4, 6));
    const hun = Number(s.slice(6, 7));
    const ten = Number(s.slice(7, 9));

    let res = [];
    if (cr) res.push(makeGroup('0' + s.slice(0, 2)) + ' Crore');
    if (lak) res.push(makeGroup('0' + s.slice(2, 4)) + ' Lakh');
    if (th) res.push(makeGroup('0' + s.slice(4, 6)) + ' Thousand');
    if (hun) res.push(a[hun] + ' Hundred');
    if (ten) res.push(makeGroup('0' + s.slice(7, 9)));

    return res.filter(Boolean).join(' ');
  };

  let [main, paise] = num.toString().split('.');
  let word = formatIndian(Number(main)) + ' Rupees';
  if (paise && Number(paise) > 0) {
    word += ' and ' + makeGroup('0' + paise.padEnd(2, '0')) + ' Paise';
  }
  return word;
};

let cachedBrowser = null;

const getBrowser = async () => {
  if (cachedBrowser && cachedBrowser.connected) {
    return cachedBrowser;
  }
  cachedBrowser = await puppeteer.launch({
    headless: 'new',
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
  return cachedBrowser;
};

export const generateInvoicePDF = async (bill, org, template = null) => {
  let browser = null;
  let page = null;
  try {
    const fileName = `Invoice-${bill.billId}.pdf`;

    // 1. Generate HTML Content
    const html = await getInvoiceHtml(bill, org, template);

    // 2. Get Browser and Page
    console.log(`[PDF] Getting browser instance for ${bill.billId}...`);
    browser = await getBrowser();
    page = await browser.newPage();
    
    // Set viewport to A4 dimensions at 96 DPI
    await page.setViewport({ width: 794, height: 1123 });

    // 3. Set HTML content
    // Since images are base64, we don't need to wait for network
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    
    // Minimal wait for styles/fonts
    await new Promise(r => setTimeout(r, 500));

    // 4. Generate PDF Buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });

    // 5. Validate Buffer Size
    if (pdfBuffer.length < 1024) { // 1KB
      throw new Error(`Generated PDF is too small (${pdfBuffer.length} bytes). Rendering might have failed.`);
    }

    console.log(`[PDF] Successfully generated PDF buffer: (${pdfBuffer.length} bytes)`);

    return pdfBuffer;
  } catch (err) {
    console.error(`[PDF GENERATION ERROR]:`, err);
    throw err;
  } finally {
    if (page) await page.close();
  }
};

export const generateQuotationPDF = async (quotation, org, doctorDetails = null) => {
  let browser = null;
  let page = null;
  try {
    const html = await getQuotationHtml(quotation, org, doctorDetails);
    browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 400));
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });
    if (pdfBuffer.length < 1024) {
      throw new Error(`Generated Quotation PDF is too small (${pdfBuffer.length} bytes)`);
    }
    return pdfBuffer;
  } catch (err) {
    console.error(`[QUOTATION PDF GENERATION ERROR]:`, err);
    throw err;
  } finally {
    if (page) await page.close();
  }
};

async function getQuotationHtml(quotation, org, doctorDetails = null) {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return 'N/A';
      return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    } catch (e) {
      return 'N/A';
    }
  };

  let logoBase64 = org?.branding?.logo ? await getBase64Image(org.branding.logo) : (org?.logo ? await getBase64Image(org.logo) : null);
  const rawClinicName = org?.branding?.clinicName || org?.clinicName || org?.name || 'Dental Care Clinic';
  const parsedClinic = (() => {
    const match = rawClinicName.match(/\(([^)]+)\)/);
    if (match) {
      const subtitle = match[1].trim();
      const name = rawClinicName.replace(/\([^)]+\)/, '').trim();
      return { name, subtitle };
    }
    return { name: rawClinicName.trim(), subtitle: org?.branding?.clinicSubtitle || '' };
  })();

  const clinicName = parsedClinic.name;
  const clinicSubtitle = parsedClinic.subtitle;
  const cleanClinicName = String(clinicName).toLowerCase().replace(/[^a-z0-9]/g, '');
  const clinicWebsite = org?.website || org?.branding?.website || '';
  const clinicPhone = org?.phone || org?.branding?.phone || org?.mobile || org?.contactNumber || '';
  const clinicAddress = formatAddress(org?.address || org?.location || org?.clinicAddress || org?.branding?.address);

  const attendingDoctorName = doctorDetails?.name || quotation.doctorName || 'Attending Dental Surgeon';
  const rawDoctorSpec = doctorDetails?.specialization || doctorDetails?.specialty || doctorDetails?.department || '';
  let formattedSpec = rawDoctorSpec.trim();
  if (formattedSpec.toLowerCase() === 'dental' || formattedSpec.toLowerCase() === 'dentist') {
    formattedSpec = 'Dental Surgeon';
  }
  const attendingDoctorSpecialization = formattedSpec ? `( ${formattedSpec} )` : '';
  const attendingDoctorQualification = doctorDetails?.qualification || '';
  const attendingDoctorQualLines = String(attendingDoctorQualification || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const attendingDoctorRegNo = doctorDetails?.registrationNumber 
    ? `Reg. No. ${doctorDetails.registrationNumber}` 
    : (doctorDetails?.licenseNumber ? `Reg. No. ${doctorDetails.licenseNumber}` : '');

  let stampBase64 = null;
  let signatureBase64 = null;
  if (doctorDetails?.doctorStamp) stampBase64 = await getBase64Image(doctorDetails.doctorStamp);
  if (doctorDetails?.doctorSignature) signatureBase64 = await getBase64Image(doctorDetails.doctorSignature);

  const patientName = quotation.patientName || 'Valued Patient';
  const patientAge = quotation.patientAge || 'N/A';
  const patientGender = quotation.patientGender || 'N/A';
  const patientMobile = quotation.patientPhone || 'N/A';
  const patientLocation = quotation.patientAddress || '';

  const quotationDate = formatDate(quotation.date || quotation.createdAt);
  const validUntilDate = formatDate(quotation.validUntil);
  const quotationNumber = quotation.quotationNumber || 'EST-001';

  const items = quotation.items || [];
  let itemsRowsHtml = '';
  if (items.length > 0) {
    itemsRowsHtml = items.map((item, index) => {
      const teethList = (item.teeth && item.teeth.length > 0) ? item.teeth.join(', ') : item.toothDisplay;
      return `
        <tr>
          <td style="text-align: center; border-bottom: 1px dotted #cbd5e0; padding: 12px 8px; vertical-align: top;">${index + 1}.</td>
          <td style="border-bottom: 1px dotted #cbd5e0; padding: 12px 10px; text-align: left; vertical-align: top;">
            <div style="font-weight: 700; font-size: 13px; color: #1e293b;">${item.procedure}</div>
            ${teethList ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 600;">Teeth Reference: ${teethList}</div>` : ''}
            ${item.notes ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 2px; font-style: italic;">${item.notes}</div>` : ''}
          </td>
          <td style="text-align: right; border-bottom: 1px dotted #cbd5e0; padding: 12px 10px; font-weight: 800; font-size: 13px; color: #0f172a; vertical-align: top;">
            ${formatCurrency(item.totalCost)} INR
          </td>
        </tr>
      `;
    }).join('');
  } else {
    itemsRowsHtml = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">
          No procedures specified.
        </td>
      </tr>
    `;
  }

  const subtotal = quotation.subtotal || quotation.totalAmount || 0;
  const discount = quotation.discount || 0;
  const taxAmount = quotation.taxAmount || 0;
  const totalAmount = quotation.totalAmount || subtotal;
  const generatedOnDate = formatDate(new Date());

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          margin: 0;
          padding: 0;
          color: #000;
          background-color: #fff;
          font-size: 12px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
        }
        .container {
          width: 100%;
          min-height: 267mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }
        .content-wrap {
          flex-grow: 1;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .header-table td {
          vertical-align: top;
          padding: 0;
        }
        .clinic-logo {
          width: 65px;
          height: 65px;
          object-fit: contain;
          margin-right: 15px;
        }
        .clinic-title {
          font-size: 20px;
          font-weight: bold;
          color: #000000;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .clinic-subtitle {
          font-size: 11px;
          color: #000000;
          margin: 4px 0;
          font-weight: bold;
        }
        .clinic-detail {
          font-size: 11px;
          color: #000000;
          margin: 2px 0;
        }
        .doctor-title {
          font-size: 13px;
          font-weight: bold;
          margin: 0;
        }
        .doctor-specialization {
          font-size: 11px;
          color: #000000;
          margin: 4px 0;
        }
        .doctor-qualification {
          font-size: 11px;
          color: #000000;
          margin: 2px 0;
        }
        .doctor-reg {
          font-size: 11px;
          color: #000000;
          margin: 2px 0;
        }
        .separator-line {
          border: 0;
          border-top: 1.5px solid #000000;
          margin: 15px 0;
        }
        .patient-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .patient-table td {
          padding: 2px 0;
          vertical-align: top;
        }
        .patient-name {
          font-size: 14px;
          font-weight: bold;
          color: #000000;
        }
        .patient-label {
          font-size: 12px;
          color: #000000;
        }
        .patient-value {
          font-size: 12px;
          color: #000000;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 15px;
          margin-bottom: 20px;
        }
        .meta-doctor-by {
          font-size: 12px;
          font-weight: bold;
          color: #000000;
        }
        .meta-title {
          font-size: 22px;
          font-weight: 900;
          color: #d97706;
          margin: 6px 0 0 0;
          letter-spacing: 0.5px;
        }
        .meta-details {
          text-align: right;
          font-size: 12px;
          color: #000000;
        }
        .meta-details div {
          margin-bottom: 4px;
        }
        .meta-bold {
          font-weight: bold;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
        }
        .items-table th {
          background-color: #f1f5f9;
          color: #000000;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          padding: 10px 10px;
          text-align: left;
          border-top: 1.5px solid #000000;
          border-bottom: 1.5px solid #000000;
        }
        .financials-section {
          width: 100%;
          margin-top: 20px;
        }
        .financials-left {
          width: 52%;
          float: left;
        }
        .financials-right {
          width: 44%;
          float: right;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
        }
        .summary-table td {
          padding: 7px 8px;
          font-size: 12px;
          border-bottom: 1px solid #cbd5e0;
        }
        .summary-label {
          text-align: left;
          color: #4a5568;
        }
        .summary-value {
          text-align: right;
          font-weight: bold;
        }
        .notes-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 11px;
          color: #475569;
        }
        .notes-title {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .footer {
          width: 100%;
          margin-top: auto;
          border-top: 1.5px solid #000000;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #000000;
        }
        .footer-left { width: 30%; text-align: left; }
        .footer-center { width: 40%; text-align: center; }
        .footer-right { width: 30%; text-align: right; }
        .clearfix::after {
          content: "";
          clear: both;
          display: table;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content-wrap">
          <table class="header-table">
            <tr>
              <td style="width: 58%; text-align: left;">
                <div style="display: flex; align-items: center;">
                  ${logoBase64 ? `<img src="${logoBase64}" class="clinic-logo" />` : ''}
                  <div>
                    <h1 class="clinic-title">${clinicName}</h1>
                    ${clinicSubtitle ? `<p class="clinic-subtitle">${clinicSubtitle}</p>` : ''}
                    ${clinicAddress ? `<p class="clinic-detail">${clinicAddress}</p>` : ''}
                    ${clinicWebsite ? `<p class="clinic-detail">Website: ${clinicWebsite}</p>` : ''}
                    ${clinicPhone ? `<p class="clinic-detail">Phone: ${clinicPhone}</p>` : ''}
                  </div>
                </div>
              </td>
              <td style="width: 42%; text-align: right;">
                <h2 class="doctor-title">Dr. ${attendingDoctorName}</h2>
                ${attendingDoctorSpecialization ? `<p class="doctor-specialization">${attendingDoctorSpecialization}</p>` : ''}
                ${attendingDoctorQualLines.length > 0 ? attendingDoctorQualLines.map(l => `<p class="doctor-qualification">${l}</p>`).join('') : ''}
                ${attendingDoctorRegNo ? `<p class="doctor-reg">${attendingDoctorRegNo}</p>` : ''}
              </td>
            </tr>
          </table>

          <hr class="separator-line" />

          <table class="patient-table">
            <tr>
              <td style="width: 55%; text-align: left;">
                <div class="patient-name" style="margin-bottom: 3px;">
                  <span class="patient-label">Patient Name : </span>
                  <b>${patientName}</b>
                </div>
                <div class="patient-label" style="margin-bottom: 3px;">
                  Age / Gender : <span class="patient-value font-bold">${patientAge} / ${patientGender}</span>
                </div>
                <div class="patient-label">
                  Mobile No : <span class="patient-value font-bold">${patientMobile}</span>
                </div>
              </td>
              <td style="width: 45%; text-align: right;">
                <div class="patient-value" style="margin-bottom: 3px;">
                  Estimate Date : <span class="meta-bold">${quotationDate}</span>
                </div>
                <div class="patient-value" style="margin-bottom: 3px;">
                  Valid Until : <span class="meta-bold" style="color: #b45309;">${validUntilDate}</span>
                </div>
                ${patientLocation ? `<div class="patient-value" style="font-size: 11px;">Address : ${patientLocation}</div>` : ''}
              </td>
            </tr>
          </table>

          <hr class="separator-line" />

          <div class="meta-row">
            <div>
              <div class="meta-doctor-by">Attending Consultant: Dr. ${attendingDoctorName.toUpperCase()}</div>
              <h2 class="meta-title">TREATMENT ESTIMATE / QUOTATION</h2>
            </div>
            <div class="meta-details">
              <div>Estimate Number: <span class="meta-bold">${quotationNumber}</span></div>
              <div>Issue Date: <span class="meta-bold">${quotationDate}</span></div>
              <div>Validity: <span class="meta-bold">30 Days</span></div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">#</th>
                <th style="width: 62%;">Proposed Treatments & Procedures</th>
                <th style="width: 30%; text-align: right;">Estimated Cost INR</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <div class="financials-section clearfix">
            <div class="financials-left">
              <div class="notes-box">
                <div class="notes-title">Clinical Notes & Validity:</div>
                <div>${quotation.notes || 'This estimate is provided based on the initial clinical examination and is valid for 30 days. Final procedure steps may adjust depending on diagnostic radiographs or surgical findings during execution.'}</div>
                <div style="margin-top: 8px; font-weight: bold; font-size: 10px; color: #64748b;">
                  * Note: This is an estimated cost quotation and not a final tax invoice or payment receipt.
                </div>
              </div>
            </div>

            <div class="financials-right">
              <table class="summary-table">
                <tr>
                  <td class="summary-label">Estimated Total:</td>
                  <td class="summary-value">${formatCurrency(subtotal)} INR</td>
                </tr>
                ${discount > 0 ? `
                <tr style="color: #e53e3e;">
                  <td class="summary-label" style="color: #e53e3e;">Discount:</td>
                  <td class="summary-value">-${formatCurrency(discount)} INR</td>
                </tr>
                ` : ''}
                ${taxAmount > 0 ? `
                <tr>
                  <td class="summary-label">Taxes / GST:</td>
                  <td class="summary-value">+${formatCurrency(taxAmount)} INR</td>
                </tr>
                ` : ''}
                <tr style="background-color: #fffbeb; font-weight: bold;">
                  <td class="summary-label" style="font-size: 13px; color: #92400e; font-weight: 900;">Total Estimate:</td>
                  <td class="summary-value" style="font-size: 14px; color: #92400e; font-weight: 900;">${formatCurrency(totalAmount)} INR</td>
                </tr>
              </table>

              ${(stampBase64 || signatureBase64) ? `
              <div style="margin-top: 20px; display: flex; align-items: flex-end; justify-content: flex-end; gap: 15px;">
                ${stampBase64 ? `<img src="${stampBase64}" style="max-height: 80px; max-width: 130px; object-fit: contain;" alt="Doctor Stamp" />` : ''}
                ${signatureBase64 ? `<img src="${signatureBase64}" style="max-height: 70px; max-width: 140px; object-fit: contain;" alt="Doctor Signature" />` : ''}
              </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">Generated On: ${generatedOnDate}</div>
          <div class="footer-center">Computer Generated Treatment Estimate Page 1 of 1</div>
          <div class="footer-right">Powered by Oviaan</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatAddress(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.pincode, addr.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

const generateInstallmentsSection = (bill) => {
  if (!bill.installments || bill.installments.length === 0) return '';
  
  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-GB');
    } catch (e) {
      return 'N/A';
    }
  };
  const formatVal = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(val || 0);
  
  const rows = bill.installments.map(inst => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; text-align: left;">${formatDate(inst.date)}</td>
      <td style="padding: 8px; text-align: left;">${bill.patientName || 'Walk-in Patient'}</td>
      <td style="padding: 8px; text-align: left;">${inst.paymentMethod || 'N/A'}</td>
      <td style="padding: 8px; text-align: right; font-weight: bold;">${formatVal(inst.amount)}</td>
    </tr>
  `).join('');

  return `
    <div style="margin-top: 25px; border: 2.5px solid #000; padding: 15px; border-radius: 8px; background-color: #fff; page-break-inside: avoid; clear: both; box-sizing: border-box; width: 100%;">
      <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 6px; letter-spacing: 0.5px; color: #000;">Payment Installments / History</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; table-layout: fixed; color: #000;">
        <thead>
          <tr style="border-bottom: 2.5px solid #000;">
            <th style="padding: 6px 8px; text-align: left; font-weight: bold; width: 25%;">Date</th>
            <th style="padding: 6px 8px; text-align: left; font-weight: bold; width: 35%;">Patient Name</th>
            <th style="padding: 6px 8px; text-align: left; font-weight: bold; width: 20%;">Mode</th>
            <th style="padding: 6px 8px; text-align: right; font-weight: bold; width: 20%;">Paid Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; border-top: 1.5px dashed #000; padding-top: 8px; margin-top: 5px; color: #000;">
        <span>Total Paid So Far: ${formatVal(bill.paidAmount || 0)}</span>
        ${bill.dueAmount > 0 
          ? `<span style="color: #dc2626;">Total Payment Due: ${formatVal(bill.dueAmount)}</span>` 
          : `<span style="color: #16a34a; text-transform: uppercase;">Status: PAID</span>`
        }
      </div>
    </div>
  `;
};

async function getOviaanDefaultPharmacyHtml(bill, org, template) {
  const logoBase64 = (template?.headerType === 'custom' && template?.headerImage) 
    ? await getBase64Image(template.headerImage) 
    : (org?.branding?.logo ? await getBase64Image(org.branding.logo) : (org?.logo ? await getBase64Image(org.logo) : null));
    
  let stampBase64 = null;
  let signatureBase64 = (template?.footerType === 'custom' && template?.footerImage)
    ? await getBase64Image(template.footerImage)
    : null;

  let stampPath = bill.doctorStamp;
  let signaturePath = bill.doctorSignature;

  if (!stampPath || (!signaturePath && template?.footerType !== 'custom')) {
    try {
      const Doctor = mongoose.model('Doctor');
      const docWithAssets = await Doctor.findOne({
        organizationId: bill.organizationId || org._id,
        $or: [
          { doctorStamp: { $ne: null, $exists: true, $ne: '' } },
          { doctorSignature: { $ne: null, $exists: true, $ne: '' } }
        ]
      }).lean();
      if (docWithAssets) {
        if (!stampPath) stampPath = docWithAssets.doctorStamp;
        if (!signaturePath && template?.footerType !== 'custom') signaturePath = docWithAssets.doctorSignature;
      }
    } catch (e) {
      console.warn("Could not load fallback doctor assets in pharmacy pdfService:", e.message);
    }
  }

  if (!signaturePath && !signatureBase64) {
    signaturePath = org.doctorSignature;
  }
  if (!stampPath) {
    stampPath = org.stamp;
  }

  if (stampPath) stampBase64 = await getBase64Image(stampPath);
  if (signaturePath && !signatureBase64) signatureBase64 = await getBase64Image(signaturePath);
  
  // Safety parse metadata if it comes as a string
  let metadata = template?.metadata || {};
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch (e) {
      metadata = {};
    }
  }

  const gstNumber = metadata.gstNumber || org.gstNumber ;
  const showGst = metadata.showGst !== undefined ? metadata.showGst : true;

  const clinicName = org.branding?.clinicName || org.clinicName || org.name || 'Clinic Name';
  const clinicAddress = formatAddress(org.address || org.location) || 'Clinic Full address with pincode';
  const clinicEmail = org.email || 'Clinic email';
  const clinicPhone = org.phone || 'phone number';
  const pharmacyTerms = org.branding?.pharmacyTerms || '1. Medicine can be returned only within 7 days with valid bill.\n2. Storage items (Fridge) and Loose Tablets cannot be returned.';
  const showPharmacyTerms = org.branding?.showPharmacyTerms !== false;

  const patientName = bill.patientName || bill.patient?.name || 'Walk-in Patient';
  const patientId = bill.patientId || bill.patient?.patientId || 'N/A';
  const age = bill.age || bill.patient?.age || '';
  const gender = bill.gender || bill.patient?.gender || 'N/A';
  const finalMobile = bill.patientPhone || bill.patientMobile || bill.patient?.mobile || bill.patient?.phone || 'N/A';
  const doctorName = bill.doctorName || 'N/A';
  const patientAddress = bill.patientAddress || 'N/A';
  const billDate = new Date(bill.date || bill.createdAt).toLocaleDateString('en-GB'); 
  const billNo = bill.invoiceNumber || bill.billId || 'N/A';
  const receiptNumber = bill.receiptNumber || bill.transactionId || (bill.installments && bill.installments.length > 0 ? bill.installments[bill.installments.length - 1].receiptNumber : null) || `RCPT-${(String(billNo || '').replace(/\D/g, '') || '001')}`;
  const paymentMode = (bill.paymentMethod || 'cash').toLowerCase();
  const cardNo = bill.transactionId || ''; 

  // Precise financial mapping matching the corrected frontend/calculator
  const finalTotal = Number(bill.grandTotal || bill.netAmount || bill.amount || 0);
  const initialGross = Number(bill.grossAmount || bill.subtotal || bill.totalAmount || 0);
  const discountTotal = Number(bill.discountAmount || bill.discount || 0);
  const taxTotal = Number(bill.taxAmount || 0);
  const taxableAmount = Number(bill.taxableAmount || (initialGross - discountTotal));
  
  const amountInWords = bill.amountInWords || numberToWords(Math.round(finalTotal));

  const medicines = bill.items || [];

  const formatCurrency = (amount) => Number(amount || 0).toFixed(2);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; }
        .oviaan-default-invoice {
          width: 100%;
          min-height: 260mm;
          border: 4px solid #000;
          padding: 20px;
          position: relative;
          margin: 0 auto;
          box-sizing: border-box;
          background: #fff;
        }
        .oviaan-custom-header {
          width: calc(100% + 40px);
          margin-left: -20px;
          margin-right: -20px;
          margin-top: -20px;
          margin-bottom: 20px;
          border-bottom: 1px solid #000;
          overflow: hidden;
          line-height: 0;
        }
        .oviaan-header-img-full { width: 100%; height: auto; display: block; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .logo-container { width: 100px; height: 100px; border: 1px solid #000; border-radius: 50%; display: flex; justify-content: center; align-items: center; overflow: hidden; flex-shrink: 0; }
        .logo-img { width: 100%; height: 100%; object-fit: contain; }
        .clinic-details { flex: 1; text-align: center; }
        .clinic-name { font-size: 22px; font-weight: bold; margin: 0; }
        .clinic-info { font-size: 13px; margin: 3px 0; }
        .gst-section { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
        .title-container { text-align: center; margin: 5px 0 10px 0; }
        .invoice-title { display: inline-block; background-color: #e0e0e0; border: 1px solid #000; padding: 4px 20px; font-size: 14px; font-weight: bold; text-decoration: underline; text-transform: uppercase; }
        .details { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 15px; }
        .details-left { width: 60%; }
        .details-right { width: 35%; }
        .row { display: flex; margin-bottom: 2px; line-height: 1.2; }
        .label { width: 110px; font-weight: bold; flex-shrink: 0; }
        .value { flex: 1; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; margin-bottom: 0; }
        thead tr { border-top: 2px solid #000; border-bottom: 2px solid #000; }
        th { padding: 8px 4px; font-weight: bold; text-align: left; overflow: hidden; }
        td { padding: 6px 4px; overflow: hidden; word-break: break-all; }
        .payment-row { display: flex; justify-content: space-between; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; font-size: 11px; font-weight: bold; margin-top: 0; }
        .bottom-section { display: flex; justify-content: space-between; margin-top: 10px; font-size: 11px; }
        .bottom-left { width: 60%; line-height: 1.4; }
        .bottom-right { width: 35%; }
        .amount-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .amount-label { font-weight: bold; }
        .amount-value { font-weight: bold; width: 80px; text-align: right; }
        .balance-row { border-top: 1px solid #000; margin-top: 2px; padding-top: 2px; }
        .signature-section { position: absolute; bottom: 40px; right: 30px; text-align: right; }
        .signature-img { width: 90px; height: auto; background-color: transparent; }
      </style>
    </head>
    <body>
      <div class="oviaan-default-invoice">
        ${template?.headerType === 'custom' && logoBase64 ? `
          <div class="oviaan-custom-header">
            <img src="${logoBase64}" class="oviaan-header-img-full" />
          </div>
        ` : `
          <div class="header">
            <div class="logo-container">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" />` : '<span style="font-weight:bold;">Logo</span>'}
            </div>
            <div class="clinic-details">
              <div class="clinic-name">${clinicName}</div>
              <div class="clinic-info">${clinicAddress}</div>
              <div class="clinic-info">${clinicEmail} and</div>
              <div class="clinic-info">${clinicPhone}</div>
            </div>
            <div style="width:100px;"></div>
          </div>
        `}
        ${showGst ? `<div class="gst-section">GST NO : ${gstNumber}</div>` : ''}
        <div class="title-container"><div class="invoice-title">INVOICE / RECEIPT</div></div>
        <div class="details">
          <div class="details-left">
            <div class="row"><span class="label">Patient Name :</span><span class="value">${patientName}</span></div>
            <div class="row"><span class="label">Patient ID :</span><span class="value">${patientId}</span></div>
            <div class="row"><span class="label">Mobile No :</span><span class="value">${finalMobile}</span></div>
            <div class="row"><span class="label">Patient Age :</span><span class="value">${age ? `${age} Years` : 'N/A'}</span></div>
            <div class="row"><span class="label">Gender :</span><span class="value">${gender}</span></div>
            <div class="row"><span class="label">Dr.Name :</span><span class="value">${doctorName}</span></div>
            ${patientAddress && patientAddress !== 'N/A' ? `<div class="row"><span class="label">Address :</span><span class="value">${patientAddress}</span></div>` : ''}
          </div>
          <div class="details-right">
            <div class="row"><span class="label">Bill Date :</span><span class="value">${billDate}</span></div>
            <div class="row"><span class="label">Receipt No :</span><span class="value">${receiptNumber}</span></div>
            <div class="row"><span class="label">Bill No :</span><span class="value">${billNo}</span></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align:center; width:25px;">Sr.</th>
              <th style="text-align:left; width:140px;">Medicine Name</th>
              <th style="text-align:center; width:65px;">Batch</th>
              <th style="text-align:center; width:55px;">Expiry</th>
              <th style="text-align:right; width:50px;">MRP</th>
              <th style="text-align:right; width:50px;">Rate</th>
              <th style="text-align:center; width:30px;">Qty</th>
              ${showGst ? '<th style="text-align:center; width:40px;">GST%</th>' : ''}
              <th style="text-align:center; width:40px;">Disc%</th>
              <th style="text-align:right; width:70px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${medicines.length > 0 ? medicines.map((item, index) => {
              const name = item.medicineName || item.description || item.name || 'Medicine';
              const batch = item.batchNo || item.batchNumber || 'N/A';
              const expiry = item.expiryDate || item.expiry || 'N/A';
              const mrp = formatCurrency(item.mrp || 0);
              const rate = formatCurrency(item.sellingPrice || item.unitPrice || item.price || 0);
              const qty = Number(item.qty || item.quantity || 0);
              const gst = Number(item.gstPercentage || 0).toFixed(1);
              const disc = Number(item.discountPercentage || 0).toFixed(1);
              const total = formatCurrency(item.totalAmount || item.subtotal || 0);
              
              return `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td style="text-align: left;">
                    <div style="font-weight:bold;">${name}</div>
                  </td>
                  <td style="text-align: center;">${batch}</td>
                  <td style="text-align: center;">${expiry}</td>
                  <td style="text-align: right;">${mrp}</td>
                  <td style="text-align: right;">${rate}</td>
                  <td style="text-align: center;">${qty}</td>
                  ${showGst ? `<td style="text-align: center;">${gst}</td>` : ''}
                  <td style="text-align: center;">${disc}</td>
                  <td style="text-align: right;">${total}</td>
                </tr>
              `;
            }).join('') : '<tr><td colspan="' + (showGst ? '10' : '9') + '" style="text-align:center; padding:10px;">No items</td></tr>'}
          </tbody>
        </table>
        ${generateInstallmentsSection(bill)}
        <div class="payment-row">
          <span>Pay Mode : ${paymentMode.toUpperCase()}</span>
          <span>GST SUMMARY: Included in Total</span>
          <span style="width:200px; text-align:right;">GRAND TOTAL : ₹${formatCurrency(finalTotal)}</span>
        </div>
        <div class="bottom-section">
          <div class="bottom-left">
            <p style="font-weight:bold; margin:0;">Amount in Words:</p>
            <p style="margin:2px 0; text-transform:capitalize;">${amountInWords} Only</p>
          </div>
          <div class="bottom-right">
          <div class="amount-row"><span class="amount-label">Gross Total :</span><span class="amount-value">${formatCurrency(initialGross)}</span></div>
            <div class="amount-row"><span class="amount-label">Total Discount :</span><span class="amount-value">${formatCurrency(discountTotal)}</span></div>
            <div class="amount-row"><span class="amount-label">Taxable Amount :</span><span class="amount-value">${formatCurrency(taxableAmount)}</span></div>
            ${showGst ? `<div class="amount-row"><span class="amount-label">Total Tax (GST) :</span><span class="amount-value">${formatCurrency(taxTotal)}</span></div>` : ''}
            <div class="amount-row balance-row"><span class="amount-label">NET PAYABLE :</span><span class="amount-value">₹${formatCurrency(finalTotal)}</span></div>
          </div>
        </div>
        ${(stampBase64 || signatureBase64) ? `
          <div class="signature-section" style="display: flex; align-items: flex-end; justify-content: flex-end; gap: 10px;">
            ${stampBase64 ? `<img src="${stampBase64}" class="signature-img" style="max-height: 80px; max-width: 120px;" />` : ''}
            ${signatureBase64 ? `<img src="${signatureBase64}" class="signature-img" style="max-height: 70px; max-width: 140px;" />` : ''}
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

async function getInvoiceHtml(bill, org, template) {
  // Query Doctor details dynamically
  let doctorDetails = null;
  if (bill.doctorId) {
    try {
      const Doctor = mongoose.model('Doctor');
      doctorDetails = await Doctor.findOne({
        $or: [
          { doctorId: bill.doctorId },
          { _id: mongoose.Types.ObjectId.isValid(bill.doctorId) ? new mongoose.Types.ObjectId(bill.doctorId) : null }
        ].filter(Boolean),
        organizationId: bill.organizationId || org._id
      }).lean();
    } catch (err) {
      console.error("Error loading doctor in pdfService:", err.message);
    }
  }
  
  if (!doctorDetails && bill.doctorName) {
    try {
      const Doctor = mongoose.model('Doctor');
      doctorDetails = await Doctor.findOne({
        name: new RegExp(bill.doctorName, 'i'),
        organizationId: bill.organizationId || org._id
      }).lean();
    } catch (err) {
      console.error("Error loading doctor by name in pdfService:", err.message);
    }
  }

  // Format Helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  };

  // Clinic Details
  let logoBase64 = org.branding?.logo ? await getBase64Image(org.branding.logo) : (org.logo ? await getBase64Image(org.logo) : null);
  const rawClinicName = org.branding?.clinicName || org.clinicName || org.name || 'Manomay Dental Care';
  const parsedClinic = (() => {
    const match = rawClinicName.match(/\(([^)]+)\)/);
    if (match) {
      const subtitle = match[1].trim();
      const name = rawClinicName.replace(/\([^)]+\)/, '').trim();
      return { name, subtitle };
    }
    return { name: rawClinicName.trim(), subtitle: org.branding?.clinicSubtitle || '' };
  })();
  
  const clinicName = parsedClinic.name;
  const clinicSubtitle = parsedClinic.subtitle;
  const cleanClinicName = String(clinicName).toLowerCase().replace(/[^a-z0-9]/g, '');
  const clinicWebsite = org.website || org.branding?.website || `www.${cleanClinicName}.in`;
  const clinicPhone = org.phone || org.branding?.phone || '+919354303128';
  const clinicAddress = formatAddress(org.address || org.location || org.clinicAddress || org.branding?.address);

  // Doctor Details
  const isManomay = String(clinicName).toLowerCase().includes('manomay');
  const attendingDoctorName = doctorDetails?.name || bill.doctorName || (isManomay ? 'Parimal Anand' : 'Attending Doctor');
  const rawDoctorSpec = doctorDetails?.specialization || doctorDetails?.specialty || doctorDetails?.department || bill.doctorSpecialization || bill.specialty || '';
  let formattedSpec = rawDoctorSpec.trim();
  if (formattedSpec.toLowerCase() === 'dental' || formattedSpec.toLowerCase() === 'dentist') {
    formattedSpec = 'Dental Surgeon';
  }
  const attendingDoctorSpecialization = formattedSpec 
    ? `( ${formattedSpec} )` 
    : (isManomay ? '( Periodontist, Oral Implantologist & Laser Specialist )' : '');
  const attendingDoctorQualification = doctorDetails?.qualification 
    ? doctorDetails.qualification 
    : (isManomay ? 'B.D.S(Manipal), M.D.S(M.A.M.C. New Delhi)' : '');
  const attendingDoctorQualLines = String(attendingDoctorQualification || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const attendingDoctorRegNo = doctorDetails?.registrationNumber 
    ? `Reg. No.${doctorDetails.registrationNumber}` 
    : (doctorDetails?.licenseNumber 
        ? `Reg. No.${doctorDetails.licenseNumber}` 
        : (isManomay ? 'Reg. No.A-14880' : ''));

  // Doctor Stamp & Signature resolution
  let stampBase64 = null;
  let signatureBase64 = null;
  let stampPath = bill.doctorStamp || doctorDetails?.doctorStamp;
  let signaturePath = bill.doctorSignature || doctorDetails?.doctorSignature;
  
  if (!stampPath || !signaturePath) {
    try {
      const Doctor = mongoose.model('Doctor');
      const docWithAssets = await Doctor.findOne({
        organizationId: bill.organizationId || org._id,
        $or: [
          { doctorStamp: { $ne: null, $exists: true, $ne: '' } },
          { doctorSignature: { $ne: null, $exists: true, $ne: '' } }
        ]
      }).lean();
      if (docWithAssets) {
        if (!stampPath) stampPath = docWithAssets.doctorStamp;
        if (!signaturePath) signaturePath = docWithAssets.doctorSignature;
      }
    } catch (e) {
      console.warn("Could not load fallback doctor stamp in pdfService:", e.message);
    }
  }

  if (!signaturePath && org.doctorSignature) {
    signaturePath = org.doctorSignature;
  }
  if (!stampPath && org.stamp) {
    stampPath = org.stamp;
  }

  if (stampPath) {
    try {
      stampBase64 = await getBase64Image(stampPath);
    } catch (e) {
      console.warn("Could not load doctor stamp:", e.message);
    }
  }

  if (signaturePath) {
    try {
      signatureBase64 = await getBase64Image(signaturePath);
    } catch (e) {
      console.warn("Could not load doctor signature:", e.message);
    }
  }

  // Query Patient details dynamically
  let patientDetails = null;
  if (bill.patientId) {
    try {
      const Patient = mongoose.model('Patient');
      patientDetails = await Patient.findOne({
        patientId: bill.patientId,
        organizationId: bill.organizationId || org._id
      }).lean();
    } catch (err) {
      console.error("Error loading patient in pdfService:", err.message);
    }
  }
  if (!patientDetails && bill.patientPhone) {
    try {
      const Patient = mongoose.model('Patient');
      patientDetails = await Patient.findOne({
        mobile: bill.patientPhone.replace(/\D/g, '').slice(-10),
        organizationId: bill.organizationId || org._id
      }).lean();
    } catch (err) {
      console.error("Error loading patient by phone in pdfService:", err.message);
    }
  }

  // Patient Details
  const patientName = bill.patientName || patientDetails?.fullName || patientDetails?.name || 'Walk-in Patient';
  const patientId = bill.patientId || patientDetails?.patientId || 'N/A';
  const finalGender = patientDetails?.gender || bill.gender || 'N/A';
  const rawAge = patientDetails?.age || bill.age || '';
  const finalAge = rawAge ? `${rawAge} Years` : 'N/A';
  const finalMobile = patientDetails?.mobile || patientDetails?.phone || patientDetails?.contactNumber || bill.patientPhone || bill.contactNumber || 'N/A';
  const patientLocation = bill.patientAddress || patientDetails?.address || '';

  // Metadata
  const invoiceDate = formatDate(bill.date || bill.createdAt);
  const invoiceNumber = bill.invoiceNumber || bill.billId || 'INV118';
  const receiptNumber = bill.receiptNumber || bill.transactionId || (bill.installments && bill.installments.length > 0 ? bill.installments[bill.installments.length - 1].receiptNumber : null) || `RCPT-${(String(invoiceNumber || '').replace(/\D/g, '') || '118')}`;

  // Itemized Table Rows
  const items = bill.items || [];
  let itemsRowsHtml = '';
  if (items.length > 0) {
    itemsRowsHtml = items.map((item, index) => {
      let desc = item.description || item.procedureName || item.medicineName || 'Treatment';
      if (item.toothNumber) {
        desc += ` (Tooth: ${item.toothNumber})`;
      }
      const unitCost = item.unitPrice || item.price || item.cost || 0;
      const qty = item.qty || item.quantity || 1;
      const totalCost = item.subtotal || item.total || item.totalAmount || (unitCost * qty);

      return `
        <tr>
          <td style="text-align: center; border-bottom: 1px dotted #cbd5e0; padding: 10px 5px;">${index + 1}.</td>
          <td style="border-bottom: 1px dotted #cbd5e0; padding: 10px 5px;">
            <div style="font-weight: bold; color: #2d3748;">${desc}</div>
            <div class="item-date">Date &nbsp; &nbsp; ${formatDate(item.date || bill.date || bill.createdAt)}</div>
          </td>
          <td style="text-align: right; border-bottom: 1px dotted #cbd5e0; padding: 10px 5px;">${formatCurrency(unitCost)}</td>
          <td style="text-align: center; border-bottom: 1px dotted #cbd5e0; padding: 10px 5px;">${qty}</td>
          <td style="text-align: right; border-bottom: 1px dotted #cbd5e0; padding: 10px 5px;">${formatCurrency(totalCost)}</td>
        </tr>
      `;
    }).join('');
  } else {
    itemsRowsHtml = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 15px; border-bottom: 1px dotted #cbd5e0; color: #718096;">
          No treatments or products listed.
        </td>
      </tr>
    `;
  }

  // Payment Installments
  const installments = bill.installments || [];
  let paymentRowsHtml = '';
  
  const getReceiptNumber = (index, inst) => {
    if (inst.transactionId) return inst.transactionId;
    const invNum = (bill.invoiceNumber || bill.billId || '').replace(/\D/g, '');
    const baseNum = parseInt(invNum) || 118;
    return `RCPT${baseNum - (installments.length - 1 - index)}`;
  };

  if (installments.length > 0) {
    paymentRowsHtml = installments.map((inst, index) => {
      const receiptNo = getReceiptNumber(index, inst);
      return `
        <tr>
          <td>${formatDate(inst.date)}</td>
          <td>${receiptNo}</td>
          <td>${inst.paymentMethod || 'Card'}</td>
          <td style="text-align: right; font-weight: bold;">${formatCurrency(inst.amount)}</td>
        </tr>
      `;
    }).join('');
  } else {
    const invNum = (bill.invoiceNumber || bill.billId || '').replace(/\D/g, '');
    const baseNum = parseInt(invNum) || 118;
    const receiptNo = bill.transactionId || `RCPT${baseNum - 1}`;
    paymentRowsHtml = `
      <tr>
        <td>${formatDate(bill.date || bill.createdAt)}</td>
        <td>${receiptNo}</td>
        <td>${bill.paymentMethod || 'Card'}</td>
        <td style="text-align: right; font-weight: bold;">${formatCurrency(bill.paidAmount || bill.amount)}</td>
      </tr>
    `;
  }

  // Totals
  const subtotal = bill.subtotal || bill.grossAmount || bill.amount || 0;
  const grandTotal = bill.amount || bill.grandTotal || 0;
  const amountReceived = bill.paidAmount || 0;
  const balanceAmount = bill.dueAmount !== undefined ? bill.dueAmount : Math.max(0, grandTotal - amountReceived);
  const generatedOnDate = formatDate(new Date());
  const discount = bill.discountAmount || bill.discount || 0;
  const taxAmount = bill.taxAmount || 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          margin: 0;
          padding: 0;
          color: #000;
          background-color: #fff;
          font-size: 12px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
        }
        .invoice-container {
          width: 100%;
          min-height: 267mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }
        .invoice-content-wrap {
          flex-grow: 1;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000000;
          margin-bottom: 12px;
          box-sizing: border-box;
        }
        .header-table td.clinic-col {
          width: 58%;
          vertical-align: top;
          padding: 10px 14px;
          border-right: 1.5px solid #000000;
        }
        .header-table td.doctor-col {
          width: 42%;
          vertical-align: top;
          padding: 10px 14px;
          text-align: right;
        }
        .clinic-logo {
          width: 65px;
          height: 65px;
          object-fit: contain;
          margin-right: 15px;
        }
        .clinic-title {
          font-size: 19px;
          font-weight: bold;
          color: #000000;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .clinic-subtitle {
          font-size: 11px;
          color: #000000;
          margin: 3px 0;
          font-weight: bold;
        }
        .clinic-detail {
          font-size: 11px;
          color: #000000;
          margin: 2px 0;
        }
        .doctor-title {
          font-size: 13px;
          font-weight: bold;
          margin: 0;
        }
        .doctor-specialization {
          font-size: 11px;
          color: #000000;
          margin: 3px 0;
        }
        .doctor-qualification {
          font-size: 11px;
          color: #000000;
          margin: 2px 0;
        }
        .doctor-reg {
          font-size: 11px;
          color: #000000;
          margin: 2px 0;
        }
        .patient-box {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000000;
          margin-bottom: 12px;
          background-color: #fafbfc;
          box-sizing: border-box;
        }
        .patient-box td.patient-col-left {
          width: 50%;
          vertical-align: top;
          padding: 8px 14px;
          border-right: 1.5px solid #000000;
        }
        .patient-box td.patient-col-right {
          width: 50%;
          vertical-align: top;
          padding: 8px 14px;
        }
        .patient-row-item {
          display: flex;
          justify-content: space-between;
          padding: 2.5px 0;
          border-bottom: 1px dashed #cbd5e0;
        }
        .patient-row-item:last-child {
          border-bottom: none;
        }
        .patient-name {
          font-size: 13px;
          font-weight: bold;
          color: #000000;
        }
        .patient-label {
          font-size: 11px;
          color: #4a5568;
          font-weight: bold;
        }
        .patient-value {
          font-size: 12px;
          color: #000000;
          font-weight: bold;
        }
        .meta-box {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000000;
          margin-bottom: 16px;
          background-color: #f8fafc;
          box-sizing: border-box;
        }
        .meta-box td.meta-box-left {
          width: 55%;
          padding: 8px 14px;
          vertical-align: middle;
          border-right: 1.5px solid #000000;
        }
        .meta-box td.meta-box-right {
          width: 45%;
          padding: 8px 14px;
          vertical-align: middle;
          text-align: right;
        }
        .meta-doctor-by {
          font-size: 11px;
          font-weight: bold;
          color: #4a5568;
          text-transform: uppercase;
        }
        .meta-title {
          font-size: 20px;
          font-weight: 900;
          color: #2f855a;
          margin: 2px 0 0 0;
        }
        .meta-details {
          text-align: right;
          font-size: 11px;
          color: #4a5568;
        }
        .meta-details div {
          margin-bottom: 3px;
        }
        .meta-bold {
          font-weight: 900;
          color: #000000;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000000;
          margin-bottom: 20px;
          box-sizing: border-box;
        }
        .items-table th {
          background-color: #e2e8f0;
          color: #000000;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          padding: 8px 8px;
          text-align: left;
          border: 1px solid #000000;
        }
        .items-table td {
          padding: 9px 8px;
          font-size: 12px;
          vertical-align: top;
          border: 1px solid #cbd5e0;
        }
        .items-table tr:nth-child(even) td {
          background-color: #fafbfc;
        }
        .item-date {
          font-size: 10px;
          color: #4a5568;
          margin-top: 3px;
        }
        .financials-container {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000000;
          margin-top: 15px;
          box-sizing: border-box;
        }
        .financials-container td.fin-left {
          width: 53%;
          vertical-align: top;
          padding: 10px 12px;
          border-right: 1.5px solid #000000;
        }
        .financials-container td.fin-right {
          width: 47%;
          vertical-align: top;
          padding: 10px 12px;
        }
        .payment-details-title {
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 6px;
          text-transform: uppercase;
          color: #1a202c;
        }
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #000000;
          font-size: 11px;
        }
        .payment-table th {
          background-color: #e2e8f0;
          font-weight: bold;
          padding: 5px 7px;
          text-align: left;
          border: 1px solid #000000;
        }
        .payment-table td {
          padding: 6px 7px;
          border: 1px solid #cbd5e0;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #000000;
        }
        .summary-table td {
          padding: 6px 8px;
          font-size: 12px;
          border-bottom: 1px solid #cbd5e0;
        }
        .summary-table td.summary-label {
          text-align: left;
          font-weight: 600;
          color: #2d3748;
          border-right: 1px solid #cbd5e0;
          width: 55%;
        }
        .summary-table td.summary-value {
          text-align: right;
          font-weight: bold;
          width: 45%;
        }
        .summary-table tr.grand-total-row td {
          background-color: #f7fafc;
          border-top: 1.5px solid #000000;
          border-bottom: 1.5px solid #000000;
          font-size: 13px;
          font-weight: 900;
        }
        .summary-table tr.balance-row td {
          background-color: #fff5f5;
          border-top: 1.5px solid #000000;
          font-weight: 900;
        }
        .footer {
          width: 100%;
          margin-top: auto;
          border-top: 1.5px solid #000000;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #000000;
        }
        .footer-left {
          width: 30%;
          text-align: left;
        }
        .footer-center {
          width: 40%;
          text-align: center;
        }
        .footer-right {
          width: 30%;
          text-align: right;
        }
        .clearfix::after {
          content: "";
          clear: both;
          display: table;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-content-wrap">
          <table class="header-table">
            <tr>
              <td class="clinic-col">
                <div style="display: flex; align-items: center;">
                  ${logoBase64 ? `<img src="${logoBase64}" class="clinic-logo" />` : ''}
                  <div>
                    <h1 class="clinic-title">${clinicName}</h1>
                    ${clinicSubtitle ? `<p class="clinic-subtitle">${clinicSubtitle}</p>` : ''}
                    ${clinicAddress ? `<p class="clinic-detail">${clinicAddress}</p>` : ''}
                    ${clinicWebsite ? `<p class="clinic-detail">Website: ${clinicWebsite}</p>` : ''}
                    ${clinicPhone ? `<p class="clinic-detail">Phone: ${clinicPhone}</p>` : ''}
                  </div>
                </div>
              </td>
              <td class="doctor-col">
                <h2 class="doctor-title">Dr. ${attendingDoctorName}</h2>
                ${attendingDoctorSpecialization ? `<p class="doctor-specialization">${attendingDoctorSpecialization}</p>` : ''}
                ${attendingDoctorQualLines.length > 0 ? attendingDoctorQualLines.map(l => `<p class="doctor-qualification">${l}</p>`).join('') : ''}
                ${attendingDoctorRegNo ? `<p class="doctor-reg">${attendingDoctorRegNo}</p>` : ''}
              </td>
            </tr>
          </table>

          <table class="patient-box">
            <tr>
              <td class="patient-col-left">
                <div class="patient-row-item">
                  <span class="patient-label">Patient Name:</span>
                  <span class="patient-value">${patientName}</span>
                </div>
                <div class="patient-row-item">
                  <span class="patient-label">Patient ID:</span>
                  <span class="patient-value">${patientId}</span>
                </div>
                <div class="patient-row-item">
                  <span class="patient-label">Mobile No:</span>
                  <span class="patient-value">${finalMobile}</span>
                </div>
              </td>
              <td class="patient-col-right">
                <div class="patient-row-item">
                  <span class="patient-label">Age / Gender:</span>
                  <span class="patient-value">${finalAge} / ${finalGender}</span>
                </div>
                <div class="patient-row-item">
                  <span class="patient-label">Date:</span>
                  <span class="patient-value">${invoiceDate}</span>
                </div>
                ${patientLocation ? `
                <div class="patient-row-item">
                  <span class="patient-label">Address:</span>
                  <span class="patient-value" style="font-size: 11px;">${patientLocation}</span>
                </div>` : ''}
              </td>
            </tr>
          </table>

          <table class="meta-box">
            <tr>
              <td class="meta-box-left">
                <div class="meta-doctor-by">Attending Doctor</div>
                <div style="font-size: 13px; font-weight: 900; color: #000;">Dr. ${attendingDoctorName.toUpperCase()}</div>
                <div class="meta-title">INVOICE / RECEIPT</div>
              </td>
              <td class="meta-box-right">
                <div class="meta-details">
                  <div>Invoice Number: <span class="meta-bold">${invoiceNumber}</span></div>
                  <div>Receipt Number: <span class="meta-bold">${receiptNumber}</span></div>
                  <div>Billing Date: <span class="meta-bold">${invoiceDate}</span></div>
                </div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 50%;">Treatments & Products</th>
                <th style="width: 15%; text-align: right;">Unit Cost INR</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 20%; text-align: right;">Total Cost INR</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <table class="financials-container">
            <tr>
              <td class="fin-left">
                <div class="payment-details-title">Payment Details</div>
                <table class="payment-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Receipt Number</th>
                      <th>Mode</th>
                      <th style="text-align: right;">Amount Paid INR</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${paymentRowsHtml}
                  </tbody>
                </table>
              </td>
              
              <td class="fin-right">
                <table class="summary-table">
                  <tr>
                    <td class="summary-label">Total Cost:</td>
                    <td class="summary-value">${formatCurrency(subtotal)} INR</td>
                  </tr>
                  ${discount > 0 ? `
                  <tr style="color: #e53e3e;">
                    <td class="summary-label" style="color: #e53e3e;">Discount:</td>
                    <td class="summary-value">-${formatCurrency(discount)} INR</td>
                  </tr>
                  ` : ''}
                  ${taxAmount > 0 ? `
                  <tr>
                    <td class="summary-label">GST / Tax:</td>
                    <td class="summary-value">+${formatCurrency(taxAmount)} INR</td>
                  </tr>
                  ` : ''}
                  <tr class="grand-total-row">
                    <td class="summary-label" style="font-size: 13px; font-weight: 900; color: #000;">Grand Total:</td>
                    <td class="summary-value" style="font-size: 13px; font-weight: 900; color: #000;">${formatCurrency(grandTotal)} INR</td>
                  </tr>
                  <tr>
                    <td class="summary-label">Amount Received:</td>
                    <td class="summary-value" style="color: #16a34a;">${formatCurrency(amountReceived)} INR</td>
                  </tr>
                  <tr class="balance-row">
                    <td class="summary-label" style="font-weight: 900;">Balance Amount:</td>
                    <td class="summary-value" style="font-weight: 900; color: ${balanceAmount > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(balanceAmount)} INR</td>
                  </tr>
                </table>
                ${(stampBase64 || signatureBase64) ? `
                <div style="margin-top: 14px; margin-bottom: -4px; display: flex; align-items: flex-end; justify-content: flex-end; gap: 12px;">
                  ${stampBase64 ? `<img src="${stampBase64}" style="max-height: 80px; max-width: 130px; object-fit: contain; background-color: transparent;" alt="Doctor Stamp" />` : ''}
                  ${signatureBase64 ? `<img src="${signatureBase64}" style="max-height: 70px; max-width: 140px; object-fit: contain; background-color: transparent;" alt="Doctor Signature" />` : ''}
                </div>
                ` : ''}
              </td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <div class="footer-left">Generated On: ${generatedOnDate}</div>
          <div class="footer-center">Computer Generated, No Signature Required Page 1 of 1</div>
          <div class="footer-right">Powered by Oviaan</div>
        </div>
      </div>
    </body>
    </html>
  `;
}


function getInvoiceCSS(metadata) {
  const primary = metadata.primaryColor || '#3b82f6';
  const secondary = metadata.secondaryColor || '#1e293b';
  const font = metadata.fontFamily || 'sans-serif';

  return `
    :root {
      --primary-color: ${primary};
      --secondary-color: ${secondary};
      --font-family: ${font};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: var(--font-family), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--secondary-color);
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
    }
    .invoice-wrapper { width: 100%; }
    
    /* Utility Classes mimicking Tailwind */
    .p-12 { padding: 3rem; }
    .mb-12 { margin-bottom: 3rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mb-4 { margin-bottom: 1rem; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .text-6xl { font-size: 3.75rem; line-height: 1; }
    .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .font-black { font-weight: 900; }
    .font-bold { font-weight: 700; }
    .font-medium { font-weight: 500; }
    .uppercase { text-transform: uppercase; }
    .tracking-tighter { letter-spacing: -0.05em; }
    .tracking-widest { letter-spacing: 0.1em; }
    .opacity-70 { opacity: 0.7; }
    .opacity-60 { opacity: 0.6; }
    .opacity-40 { opacity: 0.4; }
    .opacity-10 { opacity: 0.1; }
    .border-b-4 { border-bottom-width: 4px; }
    .pb-8 { padding-bottom: 2rem; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .gap-12 { gap: 3rem; }
    .bg-gray-50 { background-color: #f9fafb; }
    .rounded-xl { border-radius: 0.75rem; }
    .border { border: 1px solid #e5e7eb; }
    .w-full { width: 100%; }
    .pt-8 { padding-top: 2rem; }
    .border-t-2 { border-top-width: 2px; }
    .border-dashed { border-style: dashed; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    
    table { width: 100%; border-collapse: collapse; }
    th { padding: 1rem; text-align: left; }
    td { padding: 1rem; }
    .rounded-l-lg { border-top-left-radius: 0.5rem; border-bottom-left-radius: 0.5rem; }
    .rounded-r-lg { border-top-right-radius: 0.5rem; border-bottom-right-radius: 0.5rem; }

    /* Thermal Receipt Styles */
    .font-mono { font-family: monospace; }
    .text-[11px] { font-size: 11px; }
    .border-black { border-color: black; }
  `;
}

function getBaseLayoutHtml(layoutId) {
  // Simple version of the Elite Standard layout as fallback
  return `
    <div class="p-12" style="color: var(--secondary-color);">
      <div class="flex justify-between items-start mb-12 border-b-4 pb-8" style="border-color: var(--primary-color);">
        <div>
          {{#if showLogo}}<div class="mb-4">{{clinic_logo}}</div>{{/if}}
          <h1 class="text-4xl font-black uppercase tracking-tighter" style="color: var(--primary-color);">{{clinic_name}}</h1>
          <p class="text-sm opacity-70">{{clinic_address}}</p>
          <p class="text-sm opacity-70">Ph: {{clinic_phone}} | {{clinic_email}}</p>
        </div>
        <div class="text-right">
          <h2 class="text-6xl font-black opacity-10 mb-2">INVOICE</h2>
          <p class="font-bold">#{{invoice_number}}</p>
          <p class="text-sm opacity-60">{{date}}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-12 mb-12 bg-gray-50 p-6 rounded-xl border border-gray-100">
        {{#if showPatientId}}
        <div>
          <p class="text-xs uppercase font-black opacity-40 mb-1 tracking-widest">Billed To</p>
          <p class="text-xl font-bold">{{patient_name}}</p>
          <p class="text-sm opacity-60">ID: {{patient_id}}</p>
        </div>
        {{/if}}
        {{#if showDoctor}}
        <div class="text-right">
          <p class="text-xs uppercase font-black opacity-40 mb-1 tracking-widest">Consultant</p>
          <p class="text-xl font-bold">Dr. {{doctor_name}}</p>
        </div>
        {{/if}}
      </div>

      <table class="w-full mb-12">
        <thead style="background: var(--primary-color); color: white;">
          <tr>
            <th class="p-4 text-left rounded-l-lg">Description</th>
            <th class="p-4 text-center">Qty</th>
            <th class="p-4 text-right">Unit Price</th>
            <th class="p-4 text-right rounded-r-lg">Total</th>
          </tr>
        </thead>
        <tbody>
          {{items_table}}
        </tbody>
      </table>

      <div class="flex justify-end pt-8 border-t-2 border-dashed">
        <div class="w-64 space-y-3">
          <div class="flex justify-between opacity-60"><span>Subtotal</span><span>{{subtotal}}</span></div>
          {{#if showGst}}<div class="flex justify-between opacity-60"><span>Tax</span><span>{{tax_amount}}</span></div>{{/if}}
          <div class="flex justify-between opacity-60"><span>Discount</span><span>-{{discount}}</span></div>
          <div class="flex justify-between items-center pt-4 border-t border-gray-200">
            <span class="font-black uppercase text-sm">Total Amount</span>
            <span class="text-3xl font-black" style="color: var(--primary-color);">{{total_amount}}</span>
          </div>
        </div>
      </div>

      <div class="mt-24 text-xs opacity-40 uppercase tracking-widest text-center">
          This is a computer generated invoice. No signature required.
      </div>
    </div>
  `;
}

function generateItemsTable(items = [], type = 'standard', discount = 0) {
  if (!items || items.length === 0) return '<tr><td colspan="4" style="padding: 16px; text-align: center;">No items recorded</td></tr>';

  let html = items.map(item => {
    const description = item.description || item.name || 'Service';
    const qty = item.qty || item.quantity || 1;
    const price = item.unitPrice || item.price || item.cost || 0;
    const subtotal = item.subtotal || (qty * price);

    const padding = type === 'minimal' || type === 'thermal' ? '8px' : '16px';

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: ${padding};">${description}</td>
        <td style="padding: ${padding}; text-align: center;">${qty}</td>
        <td style="padding: ${padding}; text-align: right;">${formatCurrency(price)}</td>
        <td style="padding: ${padding}; text-align: right; font-weight: bold;">${formatCurrency(subtotal)}</td>
      </tr>
    `;
  }).join('');

  if (discount > 0) {
    const label = type === 'thermal' ? 'LESS DISC' : 'Administrative Discount';
    const padding = type === 'minimal' || type === 'thermal' ? '8px' : '16px';
    const bgColor = type === 'minimal' ? 'background: #fff1f2;' : '';
    
    html += `
      <tr style="color: #e11d48; font-weight: 500; font-style: italic; ${bgColor}">
        <td style="padding: ${padding};" colspan="3">${label}</td>
        <td style="padding: ${padding}; text-align: right;">-${formatCurrency(discount)}</td>
      </tr>
    `;
  }

  return html;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
}

/**
 * Generates a merged billing statement for a patient.
 * 
 * @param {Array} bills - Array of bill objects
 * @param {object} patient - Patient object
 * @param {object} org - Organization object
 * @returns {Promise<Buffer>} - PDF Buffer
 */
export const generateBillingStatementPDF = async (bills, patient, org) => {
  let browser = null;
  let page = null;
  try {
    const html = getStatementHtml(bills, patient, org);

    browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    return pdfBuffer;
  } catch (err) {
    console.error(`[STATEMENT PDF ERROR]:`, err);
    throw err;
  } finally {
    if (page) await page.close();
  }
};

function getStatementHtml(bills, patient, org) {
  const totalBilled = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const totalDue = bills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

  const billSections = bills.map(bill => `
    <div class="bill-section mb-8 pb-4 border-b border-gray-100">
      <div class="flex justify-between items-center mb-4">
        <div>
          <p class="text-sm font-bold text-slate-800">Invoice #${bill.invoiceNumber || bill.billId}</p>
          <p class="text-xs text-slate-500">${new Date(bill.date || bill.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="text-right">
          <span class="text-xs px-2 py-1 rounded-full font-bold uppercase ${bill.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
            ${bill.status}
          </span>
        </div>
      </div>
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-slate-50">
            <th class="p-2 text-left">Item Description</th>
            <th class="p-2 text-center">Qty</th>
            <th class="p-2 text-right">Price</th>
            <th class="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${generateItemsTable(bill.items, 'minimal', bill.discount)}
        </tbody>
      </table>
      <div class="flex justify-end mt-2">
        <div class="w-48 text-right space-y-1">
          <div class="flex justify-between opacity-70"><span>Gross Total:</span><span>${formatCurrency(bill.amount)}</span></div>
          ${bill.discount > 0 ? `<div class="flex justify-between text-rose-600 font-medium"><span>Discount:</span><span>-${formatCurrency(bill.discount)}</span></div>` : ''}
          <div class="flex justify-between font-bold text-slate-900 border-t border-slate-200 mt-1 pt-1">
            <span>Net Total:</span>
            <span>${formatCurrency((bill.amount || 0) - (bill.discount || 0))}</span>
          </div>
          <div class="flex justify-between text-green-600 font-medium"><span>Paid:</span><span>${formatCurrency(bill.paidAmount)}</span></div>
          <div class="flex justify-between text-red-600 font-bold"><span>Due:</span><span>${formatCurrency(bill.dueAmount)}</span></div>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        ${getInvoiceCSS({ primaryColor: '#3b82f6', secondaryColor: '#1e293b', fontFamily: 'Inter' })}
        .bill-section { page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <div class="invoice-wrapper p-12">
        <div class="flex justify-between items-start mb-12 border-b-4 pb-8" style="border-color: #3b82f6;">
          <div>
            <h1 class="text-4xl font-black uppercase tracking-tighter" style="color: #3b82f6;">${org.clinicName || org.name || 'Clinic Name'}</h1>
            <p class="text-sm opacity-70">${formatAddress(org.address || org.location)}</p>
            <p class="text-sm opacity-70">Ph: ${org.phone || ''} | ${org.email || ''}</p>
          </div>
          <div class="text-right">
            <h2 class="text-4xl font-black opacity-10 mb-2">STATEMENT</h2>
            <p class="text-sm font-bold">Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="mb-12 bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p class="text-xs uppercase font-black opacity-40 mb-1 tracking-widest">Patient Details</p>
          <p class="text-xl font-bold">${patient.fullName || `${patient.firstName} ${patient.lastName}`}</p>
          <p class="text-sm opacity-60">Patient ID: ${patient.patientId}</p>
        </div>

        <div class="statement-summary mb-12 grid grid-cols-5 gap-4">
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p class="text-[10px] uppercase font-bold text-blue-600 mb-1">Total Billed</p>
            <p class="text-lg font-black text-blue-800">${formatCurrency(totalBilled)}</p>
          </div>
          <div class="bg-rose-50 p-4 rounded-lg border border-rose-100">
            <p class="text-[10px] uppercase font-bold text-rose-600 mb-1">Total Discount</p>
            <p class="text-lg font-black text-rose-800">${formatCurrency(bills.reduce((sum, b) => sum + (b.discount || 0), 0))}</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg border border-green-100">
            <p class="text-[10px] uppercase font-bold text-green-600 mb-1">Total Paid</p>
            <p class="text-lg font-black text-green-800">${formatCurrency(totalPaid)}</p>
          </div>
          <div class="bg-red-50 p-4 rounded-lg border border-red-100">
            <p class="text-[10px] uppercase font-bold text-red-600 mb-1">Total Due</p>
            <p class="text-lg font-black text-red-800">${formatCurrency(totalDue)}</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p class="text-[10px] uppercase font-bold text-gray-600 mb-1">Invoice Count</p>
            <p class="text-lg font-black text-gray-800">${bills.length}</p>
          </div>
        </div>

        <h3 class="text-lg font-bold mb-6 border-b pb-2">Billing Breakdown</h3>
        ${billSections}

        <div class="mt-12 text-center text-[10px] text-slate-400 uppercase tracking-widest">
          This is a computer generated billing statement.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates a high-fidelity PDF prescription.
 */
export const generatePrescriptionPDF = async (prescriptionData, patientData, org, template = null, doctorDetails = {}) => {
  let browser = null;
  let page = null;
  try {
    const html = await getPrescriptionHtml(prescriptionData, patientData, org, template, doctorDetails);
    
    browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    return pdfBuffer;
  } catch (err) {
    console.error(`[PRESCRIPTION PDF ERROR]:`, err);
    throw err;
  } finally {
    // DO NOT close browser, just close page to keep browser cached
    if (page) await page.close();
  }
};

async function getPrescriptionHtml(prescriptionData, patientData, org, template, doctorDetails = {}) {
  let parsedData = null;
  let parsedNotes = null;
  let rawContent = prescriptionData;

  if (typeof prescriptionData === 'object' && prescriptionData !== null) {
    rawContent = prescriptionData.notes || prescriptionData.description || prescriptionData.content || (prescriptionData.medications ? prescriptionData : null);
  }

  try {
    if (typeof rawContent === 'string') {
      const trimmed = rawContent.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        parsedData = JSON.parse(trimmed);
      }
    } else if (typeof rawContent === 'object' && rawContent !== null) {
      parsedData = rawContent;
    }
    parsedNotes = parsedData;
  } catch (e) {
    console.error('[PDF Service] Error parsing prescription content:', e.message);
  }

  // Doctor Details Lookup (Real DB lookup)
  let docObj = null;
  const docIdToSearch = doctorDetails?._id || doctorDetails?.doctorId || prescriptionData?.doctorId;
  if (docIdToSearch) {
    try {
      const Doctor = mongoose.models.Doctor || (await import('../models/Doctor.js')).default;
      docObj = await Doctor.findOne({
        $or: [
          { doctorId: docIdToSearch },
          { _id: mongoose.Types.ObjectId.isValid(docIdToSearch) ? docIdToSearch : null }
        ]
      }).lean();
    } catch (e) {
      console.error('[PDF Service] Error fetching doctor:', e.message);
    }
  }

  // Doctor credentials resolution - REAL DATA ONLY, NO MOCK FALLBACKS
  const rawDocName = docObj?.name || doctorDetails.doctorName || prescriptionData?.doctorName || parsedData?.doctorName || '';
  const doctorFormattedName = rawDocName ? (rawDocName.toLowerCase().startsWith('dr') ? rawDocName : `Dr. ${rawDocName}`) : '';
  const doctorLastName = rawDocName ? rawDocName.replace(/^dr\.?\s+/i, '').split(' ').pop() : '';
  const doctorQual = docObj?.qualification || doctorDetails.doctorQualification || prescriptionData?.doctorQualification || parsedData?.doctorQualification || '';
  
  // Format Doctor Qualifications: split by commas or newlines so each degree/designation (e.g. BDS, MDS, MBBS) appears on a new line
  const doctorQualLines = (() => {
    if (!doctorQual) return [];
    if (Array.isArray(doctorQual)) {
      return doctorQual.flatMap(q => String(q).split(/[,;\n]+/)).map(s => s.trim()).filter(Boolean);
    }
    return String(doctorQual).split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  })();

  let rawPrescSpec = docObj?.specialization || doctorDetails.doctorSpecialization || doctorDetails.specialty || prescriptionData?.doctorSpecialization || prescriptionData?.specialty || parsedData?.doctorSpecialization || '';
  const specLower = rawPrescSpec.trim().toLowerCase();
  if (specLower === 'dental' || specLower === 'dentist' || specLower === 'dental surgeon') {
    rawPrescSpec = '';
  }
  const doctorSpecialization = rawPrescSpec;
  const doctorDesignation = docObj?.designation || doctorDetails?.designation || prescriptionData?.designation || '';

  // Doctor Designation / Specialization lines: split by commas or newlines
  const doctorSpecLines = (() => {
    const rawList = [];
    if (doctorSpecialization) {
      rawList.push(...String(doctorSpecialization).split(/[,;\n]+/));
    }
    if (doctorDesignation) {
      rawList.push(...String(doctorDesignation).split(/[,;\n]+/));
    }
    const qualLowerSet = new Set(doctorQualLines.map(q => q.toLowerCase()));
    const seen = new Set();
    const result = [];
    rawList.map(s => s.trim()).filter(Boolean).forEach(item => {
      const lower = item.toLowerCase();
      if (!qualLowerSet.has(lower) && !seen.has(lower)) {
        seen.add(lower);
        result.push(item);
      }
    });
    return result;
  })();
  const doctorRegNo = docObj?.registrationNumber || docObj?.regNo || '';
  
  const doctorSubCreds = Array.isArray(docObj?.education) && docObj.education.length > 0 
    ? docObj.education.map(ed => typeof ed === 'string' ? ed : `${ed.degree || ''} ${ed.institution ? `- ${ed.institution}` : ''}`.trim()).filter(Boolean)
    : [];

  const doctorRegionalTitle = docObj?.regionalSpecialization || '';
  const visitingConsultantText = docObj?.visitingConsultant || '';
  const isDental = Boolean(
    parsedData?.isDental || 
    prescriptionData?.isDental || 
    (prescriptionData?.title && prescriptionData.title.toLowerCase().includes('dental')) ||
    org?.clinicType === 'Dental' || 
    org?.specialist === 'Dentist' || 
    (Array.isArray(parsedData?.selectedTeeth) && parsedData.selectedTeeth.length > 0)
  );
  const bannerText = isDental ? 'DENTAL EXAMINATION & PRESCRIPTION' : 'PRESCRIPTION';

  // Organization & Clinic Details - REAL DATA ONLY
  const clinicName = org?.branding?.clinicName || org?.clinicName || org?.name || '';
  const clinicAddress = formatAddress(org?.address || org?.location);
  const clinicContact = org?.phone || org?.branding?.phone || '';
  const clinicEmail = org?.email || org?.branding?.email || doctorDetails.doctorEmail || prescriptionData?.doctorEmail || '';
  const clinicWebsite = org?.website || org?.branding?.website || '';

  const isDefaultV2 = template?._id === 'default_v2';

  // Template background image resolution (A4)
  const orgTemplateUrl = org?.prescriptionTemplate?.templateUrl || org?.prescriptionTemplateUrl || template?.orgTemplateUrl || template?.templateUrl;
  const templateBase64 = orgTemplateUrl ? await getBase64Image(orgTemplateUrl) : null;
  const isA4 = (template?._id === 'global_a4' || template?.headerType === 'a4' || template?.layoutType === 'a4') && Boolean(templateBase64) && (org?.prescriptionTemplate?.enabled !== false);

  const printableArea = template?.printableArea || org?.prescriptionTemplate?.printableArea;
  const margins = printableArea || { top: 55, left: 15, right: 15, bottom: 25 };

  // Assets
  const logoPath = (template?.headerType === 'custom' && template?.headerImage) 
    ? template.headerImage 
    : (org?.branding?.logo || org?.logo || null);
  const logoBase64 = logoPath ? await getBase64Image(logoPath) : null;

  const docSigPath = docObj?.doctorSignature || doctorDetails?.doctorSignature || prescriptionData?.doctorSignature || null;
  const signatureBase64 = docSigPath ? await getBase64Image(docSigPath) : null;

  const docStampPath = docObj?.doctorStamp || doctorDetails?.doctorStamp || prescriptionData?.doctorStamp || null;
  const stampBase64 = docStampPath ? await getBase64Image(docStampPath) : null;

  const footerBarcodePath = org?.prescriptionTemplate?.footerBarcode || org?.branding?.footerBarcode || org?.footerBarcode;
  const footerBarcodeBase64 = footerBarcodePath ? await getBase64Image(footerBarcodePath) : null;
  const footerText = prescriptionData?.footerText || parsedData?.footerText || org?.prescriptionTemplate?.footerText || org?.branding?.footerText || org?.footerText || '';
  let footerSubText = prescriptionData?.footerSubText || prescriptionData?.additionalFooterNote || parsedData?.footerSubText || parsedData?.additionalFooterNote || org?.prescriptionTemplate?.footerSubText || org?.branding?.footerSubText || org?.footerSubText || '';
  if (!footerSubText && (prescriptionData?.customFooterText || parsedData?.customFooterText)) {
    const custom = prescriptionData?.customFooterText || parsedData?.customFooterText;
    if (custom !== footerText) {
      footerSubText = custom;
    }
  }
  if (footerSubText === footerText) {
    footerSubText = '';
  }

  // Fee / Treatment Charges Details (Dental Prescription Billing Summary)
  const feeDetails = parsedData?.feeDetails || prescriptionData?.feeDetails || null;

  const hasConsultation = Boolean(feeDetails?.consultationFees && String(feeDetails.consultationFees).trim() !== '');
  const hasXray = Boolean(feeDetails?.xrayFees && String(feeDetails.xrayFees).trim() !== '');
  const hasProcedure = Boolean(
    (feeDetails?.procedureFees && String(feeDetails.procedureFees).trim() !== '') || 
    (feeDetails?.procedureName && String(feeDetails.procedureName).trim() !== '')
  );
  const discountType = feeDetails?.discountType || 'fixed';
  const discountVal = parseFloat(feeDetails?.discount) || 0;
  const hasDiscount = Boolean(discountVal > 0);
  const discountAmount = feeDetails?.discountAmount !== undefined && feeDetails?.discountAmount !== null && feeDetails?.discountAmount !== ''
    ? parseFloat(feeDetails.discountAmount)
    : (discountType === 'percentage'
        ? (((parseFloat(feeDetails?.consultationFees) || 0) + (parseFloat(feeDetails?.xrayFees) || 0) + (parseFloat(feeDetails?.procedureFees) || 0)) * discountVal) / 100
        : discountVal);

  const discountLabel = discountType === 'percentage' 
    ? `Discount (${discountVal}%)` 
    : 'Discount';

  const hasTotal = Boolean(feeDetails?.totalAmount && String(feeDetails.totalAmount).trim() !== '');
  const hasPaid = Boolean(feeDetails?.amountPaid && String(feeDetails.amountPaid).trim() !== '');
  const hasDue = Boolean(feeDetails?.amountDue && String(feeDetails.amountDue).trim() !== '');
  const isBlank = Boolean(feeDetails?.isBlank);

  // If doctor does not write in any part (and is not blank mode), NO table will print!
  const hasAnyEntered = hasConsultation || hasXray || hasProcedure || hasTotal || hasPaid || hasDue;
  const showFeeTable = isDental && feeDetails?.includeFeeTable !== false && (hasAnyEntered || isBlank);

  const xrayLabel = feeDetails?.xrayRequiredType === 'required' 
    ? 'Digital X-ray (Required)' 
    : 'Digital X-ray (If required)';

  const formatFeeValuePdf = (val, isBlank) => {
    if (isBlank) return '&nbsp;';
    if (val === '' || val === null || val === undefined) return '&nbsp;';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Custom Watermark / Body Background
  let bodyBgStyle = '';
  if (template?.bodyType === 'custom' && template?.bodyImage) {
    const bodyBase64 = await getBase64Image(template.bodyImage);
    if (bodyBase64) {
      bodyBgStyle = `background-image: url('${bodyBase64}'); background-size: 60%; background-position: center; background-repeat: no-repeat; opacity: 0.05;`;
    }
  }

  // Patient Info Formatting
  const patientDisplayFullName = (() => {
    let raw = patientData?.fullName || patientData?.name || `${patientData?.firstName || ''} ${patientData?.lastName || ''}`.trim() || parsedData?.patientName || 'Patient';
    const prefixRegex = /^(MR|MRS|MS|MISS|DR|PROF|SHRI|SMT|BABY|MASTER)\.?$/i;
    let parts = raw.split(/\s+/).filter(Boolean);
    
    let embeddedPrefix = '';
    while (parts.length > 0 && prefixRegex.test(parts[0])) {
      if (!embeddedPrefix) {
        embeddedPrefix = parts[0].replace(/\./g, '').toUpperCase();
      }
      parts.shift();
    }
    
    const cleanName = parts.length > 0 ? parts.join(' ') : raw;
    let des = (patientData?.designation || '').trim().replace(/\./g, '').toUpperCase();
    const gender = (patientData?.gender || '').toLowerCase();
    
    if (!des) {
      des = embeddedPrefix;
    } else if (gender === 'female' && (des === 'MR' || des === 'SHRI')) {
      if (['MISS', 'MRS', 'MS', 'SMT'].includes(embeddedPrefix)) {
        des = embeddedPrefix;
      } else {
        des = 'MS';
      }
    }
    
    const titleMap = {
      'MR': 'Mr.',
      'MRS': 'Mrs.',
      'MS': 'Ms.',
      'MISS': 'Miss',
      'DR': 'Dr.',
      'PROF': 'Prof.',
      'SHRI': 'Shri',
      'SMT': 'Smt.',
      'BABY': 'Baby',
      'MASTER': 'Master'
    };
    
    const formattedPrefix = des ? (titleMap[des] || des) : '';
    return formattedPrefix ? `${formattedPrefix} ${cleanName}` : cleanName;
  })();

  // Real Patient ID without artificial OPD prefix or mock fallbacks
  const displayPatientId = patientData?.customPatientId || patientData?.patientId || prescriptionData?.patientId || parsedData?.patientId || '';
  const patientDisplayAgeGender = `${patientData?.age ? `${patientData.age}Y` : '--'} / ${patientData?.gender || '--'}`;
  const patientMobile = patientData?.mobile || patientData?.phone || patientData?.contactNumber || patientData?.patientPhone || prescriptionData?.patientPhone || '';
  
  const consultationDateStr = (() => {
    const rawDate = prescriptionData?.date || parsedData?.examinationDate || prescriptionData?.consultationDate || prescriptionData?.createdAt || new Date();
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-GB');
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      return new Date().toLocaleDateString('en-GB');
    }
  })();

  // 1. Context / Title
  const contextTitle = prescriptionData?.title || (parsedData?.isDental ? 'Dental Examination & Prescription' : '');

  // 2. Medical & Dental History
  const finalMedicalHistoryText = parsedData?.medicalHistory || '';
  const finalDentalHistoryText = parsedData?.dentalHistory || parsedData?.medicalDentalHistory || '';
  const medicalHistoryText = finalMedicalHistoryText;
  const kcoMedicationText = parsedData?.kcoMedication || parsedData?.kco || '';

  // 3. Oral Examination Findings
  const activeOralExamItems = (() => {
    if (!parsedData?.oralExamination) return [];
    if (typeof parsedData.oralExamination === 'string') {
      return [parsedData.oralExamination];
    }
    const labelMap = {
      stains: 'Stains',
      calculus: 'Calculus',
      decayedTeeth: 'Decayed Teeth',
      grosslyDecayedTeeth: 'Grossly Decayed Teeth',
      mobileTeeth: 'Mobile Teeth',
      top: 'Tenderness on Percussion (TOP)',
      otherFindings: 'Other Findings'
    };
    const items = [];
    Object.entries(parsedData.oralExamination).forEach(([key, val]) => {
      if (val && (val.active || (typeof val === 'string' && val.trim() !== ''))) {
        const label = labelMap[key] || key;
        const severity = val.severity ? ` (${val.severity})` : '';
        const notes = val.notes ? `: ${val.notes}` : '';
        items.push(`${label}${severity}${notes}`);
      }
    });
    return items;
  })();

  // 4. Affected Teeth / Odontogram Findings & Procedures (Grouped cleanly)
  const teethChartItems = (() => {
    if (Array.isArray(parsedData?.selectedTeeth) && parsedData.selectedTeeth.length > 0) {
      const groups = new Map();
      parsedData.selectedTeeth.forEach(t => {
        const proc = t.procedure || t.condition || 'Procedure';
        const notes = t.notes ? ` (${t.notes})` : '';
        const key = `${proc}:::${notes}`;
        if (!groups.has(key)) groups.set(key, { proc, notes, teeth: [] });
        groups.get(key).teeth.push(String(t.toothId || t.toothNumber));
      });

      return Array.from(groups.values()).map(({ proc, notes, teeth }) => {
        if (teeth.length >= 28) {
          return `Full Mouth (All Teeth): ${proc}${notes}`;
        }
        if (teeth.length > 1) {
          return `Teeth #${teeth.join(', #')}: ${proc}${notes}`;
        }
        return `Tooth #${teeth[0]}: ${proc}${notes}`;
      });
    }
    return [];
  })();

  // 5. Done Today / Treatment Performed Today
  const treatmentPerformedToday = parsedData?.treatmentPerformedToday || parsedData?.procedureDone || '';

  // 6. Treatment Planned / Treatment
  const treatmentPlannedText = (() => {
    if (parsedData?.treatmentPlanned) return parsedData.treatmentPlanned;
    if (Array.isArray(parsedData?.treatmentPlans) && parsedData.treatmentPlans.length > 0) {
      return parsedData.treatmentPlans.map(t => typeof t === 'string' ? t : (t.procedure || t.name || t.treatmentName)).filter(Boolean).join(', ');
    }
    if (Array.isArray(parsedData?.dentalTreatments) && parsedData.dentalTreatments.length > 0) {
      return parsedData.dentalTreatments.map(t => typeof t === 'string' ? t : (t.procedure || t.name || t.treatmentName)).filter(Boolean).join(', ');
    }
    return '';
  })();

  // 7. Diagnosis Text
  const diagnosisList = (() => {
    if (Array.isArray(parsedData?.diagnosis) && parsedData.diagnosis.length > 0) {
      return parsedData.diagnosis.map(d => typeof d === 'string' ? d : (d.name || '')).filter(Boolean);
    }
    if (typeof parsedData?.diagnosis === 'string' && parsedData.diagnosis.trim()) {
      return [parsedData.diagnosis.trim()];
    }
    if (prescriptionData?.diagnosis) {
      return Array.isArray(prescriptionData.diagnosis) ? prescriptionData.diagnosis : [prescriptionData.diagnosis];
    }
    return [];
  })();

  // 8. Complaints List
  const complaintsList = (() => {
    if (Array.isArray(parsedData?.complaints) && parsedData.complaints.length > 0) {
      return parsedData.complaints.map(c => {
        if (typeof c === 'string') return c;
        const dur = c.duration ? ` (${c.duration})` : (parsedData?.complaintDuration ? ` (${parsedData.complaintDuration})` : '');
        return `${c.name || ''}${dur}`.trim();
      }).filter(Boolean);
    }
    if (typeof parsedData?.complaints === 'string' && parsedData.complaints.trim()) {
      const dur = parsedData?.complaintDuration ? ` (${parsedData.complaintDuration})` : '';
      return [`${parsedData.complaints.trim()}${dur}`];
    }
    if (prescriptionData?.complaints?.length) {
      return prescriptionData.complaints.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean);
    }
    if (parsedData?.chiefComplaint) {
      const dur = parsedData?.complaintDuration ? ` (${parsedData.complaintDuration})` : '';
      return [`${parsedData.chiefComplaint}${dur}`];
    }
    if (prescriptionData?.chiefComplaint) return [prescriptionData.chiefComplaint];
    if (prescriptionData?.symptoms) return [prescriptionData.symptoms];
    return [];
  })();

  // 9. Examination List (General / Physical / Vitals)
  const examinationList = (() => {
    if (Array.isArray(parsedData?.examination) && parsedData.examination.length > 0) {
      return parsedData.examination.map(e => typeof e === 'string' ? e : (e.name || '')).filter(Boolean);
    }
    if (typeof parsedData?.examination === 'string' && parsedData.examination.trim()) {
      return [parsedData.examination.trim()];
    }
    if (parsedData?.physicalExamination) {
      return [parsedData.physicalExamination];
    }
    if (parsedData?.vitals && Object.values(parsedData.vitals).some(v => v)) {
      const vStr = Object.entries(parsedData.vitals).filter(([_,v]) => v).map(([k,v]) => `${k.replace('_', ' ')}: ${v}`).join(', ');
      return [`Vitals: ${vStr}`];
    }
    return [];
  })();

  // 10. Advice
  const adviceText = parsedData?.advice || prescriptionData?.advice || '';

  // 11. Next Visit / Follow Up
  const nextVisitText = (() => {
    const nv = parsedData?.nextAppointmentDate || parsedData?.followUpDate || prescriptionData?.followUpDate;
    if (!nv) return '';
    try {
      const d = new Date(nv);
      if (isNaN(d.getTime())) return String(nv);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      return String(nv);
    }
  })();

  const nextVisitNotesText = parsedData?.nextAppointmentNotes || 
    parsedData?.doctorNotes || 
    parsedData?.visitNotes || 
    prescriptionData?.doctorNotes || 
    (typeof prescriptionData?.notes === 'string' && !prescriptionData.notes.startsWith('{') ? prescriptionData.notes : '') || '';

  // 12. Investigation List
  const investigationList = (() => {
    if (Array.isArray(parsedData?.testsRequested) && parsedData.testsRequested.length > 0) {
      return parsedData.testsRequested.map(t => typeof t === 'string' ? t : (t.name || t));
    }
    if (Array.isArray(parsedData?.investigation) && parsedData.investigation.length > 0) {
      return parsedData.investigation.map(i => typeof i === 'string' ? i : (i.name || i));
    }
    if (typeof parsedData?.investigation === 'string' && parsedData.investigation.trim()) {
      return [parsedData.investigation.trim()];
    }
    return [];
  })();

  // 13. Medications List
  const medicationsList = parsedData?.medications || prescriptionData?.medications || [];

  const formatFrequencyDashes = (freq) => {
    if (!freq) return '-';
    const clean = String(freq).trim();
    if (clean === '1-0-1') return '1 - 0 - 1';
    if (clean === '1-0-0') return '1 - 0 - 0';
    if (clean === '0-0-1') return '0 - 0 - 1';
    if (clean === '0-1-0') return '0 - 1 - 0';
    if (clean === '1-1-1') return '1 - 1 - 1';
    if (clean === '1-1-1-1') return '1 - 1 - 1 - 1';
    return clean;
  };

  const formatDuration = (dur) => {
    if (!dur) return '-';
    const clean = String(dur).trim();
    if (/^\d+$/.test(clean)) return `${clean} Day(S)`;
    if (/^\d+\s*d(ays?)?$/i.test(clean)) {
      const num = clean.match(/\d+/)[0];
      return `${num} Day(S)`;
    }
    return clean;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        *, ::before, ::after {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          width: 210mm;
          height: 297mm;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #ffffff;
          color: #000000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page-container {
          width: 210mm;
          height: 297mm;
          max-width: 210mm;
          max-height: 297mm;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
        }
        .template-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 210mm;
          height: 297mm;
          object-fit: contain;
          pointer-events: none;
          z-index: 0;
        }
        .content-wrapper {
          position: relative;
          z-index: 10;
          box-sizing: border-box;
          width: 210mm;
          height: 297mm;
          max-height: 297mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          ${isA4 ? `
            padding-top: ${margins.top || 55}mm;
            padding-bottom: ${margins.bottom || 25}mm;
            padding-left: ${margins.left || 15}mm;
            padding-right: ${margins.right || 15}mm;
          ` : `
            padding: 24px 32px;
          `}
        }
        .watermark {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          ${bodyBgStyle}
          z-index: -1;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        ${isA4 && templateBase64 ? `
          <img class="template-bg" src="${templateBase64}" alt="A4 Background" />
        ` : ''}

        <div class="content-wrapper">
          <div class="watermark"></div>

          ${isA4 ? `
            <!-- A4 Overlaid Content -->
            <div style="font-size: 12px; color: #1e293b; padding-bottom: 8px; border-bottom: 1px solid #cbd5e1; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><b>Name:</b> ${patientDisplayFullName}</span>
                <span><b>Patient ID:</b> ${displayPatientId}</span>
                <span><b>Mobile:</b> ${patientMobile}</span>
                <span><b>Age/Sex:</b> ${patientDisplayAgeGender}</span>
                <span><b>Date:</b> ${consultationDateStr}</span>
              </div>
            </div>

            <div style="flex: 1;">
              ${complaintsList.length > 0 ? `
                <div style="margin-bottom: 8px; font-size: 12px;">
                  <b>Chief Complaints:</b> ${complaintsList.join(', ')}
                </div>
              ` : ''}

              ${medicationsList.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #334155; font-size: 12px; margin-bottom: 12px;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #334155;">
                      <th style="padding: 6px; border-right: 1px solid #334155; text-align: center; width: 5%;">#</th>
                      <th style="padding: 6px 10px; border-right: 1px solid #334155; text-align: left; width: 35%;">Medicine</th>
                      <th style="padding: 6px 8px; border-right: 1px solid #334155; text-align: center; width: 12%;">Dose</th>
                      <th style="padding: 6px 8px; border-right: 1px solid #334155; text-align: left; width: 16%;">Timing</th>
                      <th style="padding: 6px 8px; border-right: 1px solid #334155; text-align: center; width: 16%;">Frequency</th>
                      <th style="padding: 6px 8px; text-align: center; width: 16%;">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${medicationsList.map((m, idx) => `
                      <tr style="border-bottom: 1px solid #334155;">
                        <td style="padding: 6px; border-right: 1px solid #334155; text-align: center; font-weight: bold;">${idx + 1}</td>
                        <td style="padding: 6px 10px; border-right: 1px solid #334155;">
                          <div style="font-weight: bold; color: #0f172a;">${m.name}</div>
                          ${(m.composition || m.genericName) ? `<div style="font-size: 10px; color: #64748b; font-style: italic;">${m.composition || m.genericName}</div>` : ''}
                          ${m.instructions ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${m.instructions}</div>` : ''}
                        </td>
                        <td style="padding: 6px 8px; border-right: 1px solid #334155; text-align: center;">${m.dose || m.form || '-'}</td>
                        <td style="padding: 6px 8px; border-right: 1px solid #334155;">${m.when || '-'}</td>
                        <td style="padding: 6px 8px; border-right: 1px solid #334155; text-align: center; font-weight: bold;">${m.frequency ? formatFrequencyDashes(m.frequency) : '-'}</td>
                        <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${m.duration ? formatDuration(m.duration) : '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}

              ${adviceText ? `
                <div style="font-size: 12px; margin-bottom: 8px;">
                  <b>Advice:</b> ${adviceText}
                </div>
              ` : ''}
            </div>
          ` : `
            <!-- OVIAAN DEFAULT TEMPLATE (REAL DATA ONLY) -->
            <div>
              <!-- 1. TOP HEADER (Clinic on Left, Doctor on Right) -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                <!-- Left Column: Clinic Details -->
                <div style="display: flex; align-items: flex-start; gap: 14px; flex: 1; max-width: 55%;">
                  ${logoBase64 ? `
                    <img src="${logoBase64}" alt="Clinic Logo" style="width: 96px; height: 96px; max-width: 100px; max-height: 100px; object-fit: contain; border-radius: 50%; border: 1px solid #e2e8f0; padding: 2px; background-color: #ffffff; flex-shrink: 0;" />
                  ` : `
                    <div style="width: 96px; height: 96px; border-radius: 50%; border: 4px solid rgba(99, 102, 241, 0.4); display: flex; align-items: center; justify-content: center; background: #eef2ff; flex-shrink: 0;">
                      <span style="font-weight: 900; color: #312e81; font-size: 28px;">${clinicName ? clinicName.charAt(0) : 'C'}</span>
                    </div>
                  `}
                  <div style="display: flex; flex-direction: column; text-align: left;">
                    <h2 style="font-size: 18px; font-weight: 900; color: #1e1b4b; margin: 0; line-height: 1.2;">${clinicName || 'Clinic'}</h2>
                    <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4; font-weight: 500;">
                      ${clinicAddress ? `<div>${clinicAddress}</div>` : ''}
                      ${clinicWebsite ? `<div>Website: <span style="font-weight: bold; color: #1e293b;">${clinicWebsite}</span></div>` : ''}
                      ${clinicEmail ? `<div>${clinicEmail}</div>` : ''}
                      ${clinicContact ? `<div style="font-weight: bold; color: #dc2626;">Contact NO.: ${clinicContact}</div>` : ''}
                    </div>
                  </div>
                </div>

                <!-- Right Column: Doctor Details -->
                <div style="display: flex; flex-direction: column; text-align: right; align-items: flex-end; flex: 1; max-width: 45%;">
                  ${doctorFormattedName ? `
                    <h1 style="font-size: 18px; font-weight: 900; color: #1e1b4b; margin: 0; line-height: 1.2;">${doctorFormattedName}</h1>
                  ` : ''}
                    ${doctorQualLines.length > 0 ? `
                      <div style="font-size: 12px; font-weight: bold; color: #dc2626; margin-top: 2px; line-height: 1.25;">
                        ${doctorQualLines.map(line => `<div>${line}</div>`).join('')}
                      </div>
                    ` : ''}
                    ${doctorSpecLines.length > 0 ? `
                      <div style="font-size: 11px; font-weight: 600; color: #334155; margin-top: 2px; line-height: 1.25;">
                        ${doctorSpecLines.map(spec => `<div>${spec}</div>`).join('')}
                      </div>
                    ` : ''}
                  ${doctorSubCreds.length > 0 ? `
                    <div style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.3; font-weight: 500;">
                      ${doctorSubCreds.map(c => `<div>${c}</div>`).join('')}
                    </div>
                  ` : ''}
                  ${doctorRegionalTitle ? `
                    <div style="font-weight: bold; color: #dc2626; font-size: 11px; margin-top: 2px;">${doctorRegionalTitle}</div>
                  ` : ''}
                </div>
              </div>

              <!-- Visiting Consultant Line (ONLY if present) -->
              ${visitingConsultantText ? `
                <div style="padding: 4px 0; text-align: center; font-size: 10px; font-weight: 700; color: #475569;">
                  ${visitingConsultantText}
                </div>
              ` : ''}

              <!-- Specialty Banner Bar (ONLY if present) -->
              ${bannerText ? `
                <div style="background-color: #a83244; color: #ffffff; padding: 4px 16px; border-radius: 6px; text-align: center; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
                  ${bannerText}
                </div>
              ` : ''}

              <!-- Patient Information Box -->
              <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 12px; color: #1e293b; background-color: #ffffff;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 3px 0; width: 33%;"><span style="font-weight: 700; color: #334155;">Patient ID: </span><span style="font-weight: 600; color: #0f172a;">${displayPatientId || '--'}</span></td>
                    <td style="padding: 3px 0; width: 33%;"><span style="font-weight: 700; color: #334155;">Name: </span><span style="font-weight: 600; color: #0f172a;">${patientDisplayFullName}</span></td>
                    <td style="padding: 3px 0; width: 34%;"><span style="font-weight: 700; color: #334155;">Age/Gender: </span><span style="font-weight: 600; color: #0f172a;">${patientDisplayAgeGender}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0 2px 0;"><span style="font-weight: 700; color: #334155;">Mobile No.: </span><span style="font-weight: 600; color: #0f172a;">${patientMobile || '--'}</span></td>
                    <td style="padding: 4px 0 2px 0;"><span style="font-weight: 700; color: #334155;">Consultation Dt: </span><span style="font-weight: 600; color: #0f172a;">${consultationDateStr}</span></td>
                    <td style="padding: 4px 0 2px 0;"></td>
                  </tr>
                </table>
              </div>

              <!-- Context / Title (if present and NOT dental since dental is in the red banner) -->
              ${contextTitle && !isDental ? `
                <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 8px;">
                  Context: <span style="color: #0f172a;">${contextTitle}</span>
                </div>
              ` : ''}

              <!-- Clinical Findings & Order (Strictly 1 to 9 as requested) -->
              <div style="margin-bottom: 10px; font-size: 12px; line-height: 1.4; color: #1e293b;">
                <!-- 1. Chief Complaints -->
                ${complaintsList.length > 0 ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Chief Complaints:</span>
                    <span style="font-weight: 500; color: #1e293b; margin-left: 4px;">${complaintsList.join(', ')}</span>
                  </div>
                ` : ''}

                <!-- 2. Medical History -->
                ${finalMedicalHistoryText ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Medical History:</span>
                    <span style="font-weight: 500; color: #1e293b; margin-left: 4px;">${finalMedicalHistoryText}</span>
                  </div>
                ` : ''}
                ${kcoMedicationText ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">K/C/O - Medication:</span>
                    <span style="font-weight: 600; color: #1e293b; margin-left: 4px;">${kcoMedicationText}</span>
                  </div>
                ` : ''}

                <!-- 3. Dental History -->
                ${finalDentalHistoryText ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Dental History:</span>
                    <span style="font-weight: 500; color: #1e293b; margin-left: 4px;">${finalDentalHistoryText}</span>
                  </div>
                ` : ''}

                <!-- 4. Oral Examination -->
                ${activeOralExamItems.length > 0 ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Oral Examination:</span>
                    <span style="font-weight: 500; color: #1e293b; margin-left: 4px;">${activeOralExamItems.join(', ')}</span>
                  </div>
                ` : ''}
                ${examinationList.length > 0 ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">General Examination:</span>
                    <span style="font-weight: 500; color: #1e293b; margin-left: 4px;">${examinationList.join(', ')}</span>
                  </div>
                ` : ''}

                <!-- 5. Diagnosis -->
                ${diagnosisList.length > 0 ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Diagnosis:</span>
                    <span style="font-weight: 600; color: #1e293b; margin-left: 4px;">${diagnosisList.join(', ')}</span>
                  </div>
                ` : ''}

                <!-- 6. Teeth Chart -->
                ${teethChartItems.length > 0 ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Teeth Chart:</span>
                    <span style="font-weight: bold; color: #0f172a; margin-left: 4px;">${teethChartItems.join(', ')}</span>
                  </div>
                ` : ''}

                <!-- 7. Treatment Plan -->
                ${treatmentPlannedText ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Treatment Plan:</span>
                    <span style="font-weight: 600; color: #1e293b; margin-left: 4px;">${treatmentPlannedText}</span>
                  </div>
                ` : ''}

                <!-- 8. Treatment Done Today -->
                ${treatmentPerformedToday ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Treatment Done Today:</span>
                    <span style="font-weight: 600; color: #065f46; margin-left: 4px;">${treatmentPerformedToday}</span>
                  </div>
                ` : ''}
              </div>

              <!-- 9. Prescribed Medicine -->
              <div style="margin-bottom: 6px; display: flex; align-items: baseline; gap: 8px;">
                <span style="font-weight: bold; font-size: 16px; color: #0f172a;">Rx:</span>
                <span style="font-weight: bold; font-size: 11px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Prescribed Medicine</span>
              </div>

              <!-- Medications Table -->
              ${medicationsList.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #334155; font-size: 12px; margin-bottom: 12px;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #334155; color: #0f172a; font-weight: bold; font-size: 11px;">
                      <th style="padding: 6px 8px; border-right: 1px solid #334155; text-align: center; width: 5%;">#</th>
                      <th style="padding: 6px 10px; border-right: 1px solid #334155; text-align: left; width: 35%;">Medicine</th>
                      <th style="padding: 6px 8px; border-right: 1px solid #334155; text-align: center; width: 12%;">Dose</th>
                      <th style="padding: 6px 8px; border-right: 1px solid #334155; text-align: left; width: 16%;">Timing</th>
                      <th style="padding: 6px 8px; border-right: 1px solid #334155; text-align: center; width: 16%;">Frequency</th>
                      <th style="padding: 6px 8px; text-align: center; width: 16%;">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${medicationsList.map((m, idx) => `
                      <tr style="border-bottom: 1px solid #334155;">
                        <td style="padding: 8px 6px; border-right: 1px solid #334155; text-align: center; font-weight: bold; color: #334155; vertical-align: top;">${idx + 1}</td>
                        <td style="padding: 8px 10px; border-right: 1px solid #334155; vertical-align: top;">
                          <div style="font-weight: bold; color: #0f172a; font-size: 12px;">${m.name}</div>
                          ${(m.composition || m.genericName) ? `<div style="font-size: 10px; color: #475569; font-style: italic; margin-top: 2px;">${m.composition || m.genericName}</div>` : ''}
                          ${m.instructions ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${m.instructions}</div>` : ''}
                        </td>
                        <td style="padding: 8px 8px; border-right: 1px solid #334155; text-align: center; font-weight: 600; vertical-align: top;">${m.dose || m.form || '-'}</td>
                        <td style="padding: 8px 8px; border-right: 1px solid #334155; vertical-align: top;">${m.when || '-'}</td>
                        <td style="padding: 8px 8px; border-right: 1px solid #334155; text-align: center; font-weight: bold; color: #0f172a; white-space: nowrap; vertical-align: top;">${m.frequency ? formatFrequencyDashes(m.frequency) : '-'}</td>
                        <td style="padding: 8px 8px; text-align: center; font-weight: bold; color: #0f172a; white-space: nowrap; vertical-align: top;">${m.duration ? formatDuration(m.duration) : '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 12px;">
                  ${prescriptionData?.notes || 'No medications listed.'}
                </div>
              `}

              <!-- Advice, Next Visit & Investigation -->
              <div style="margin-bottom: 10px; font-size: 12px; line-height: 1.4; color: #1e293b;">
                ${adviceText ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Advice:</span>
                    <span style="font-medium: 500; color: #1e293b; font-style: italic; margin-left: 4px;">"${adviceText}"</span>
                  </div>
                ` : ''}

                ${nextVisitText ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Next Visit:</span>
                    <span style="font-weight: bold; color: #1e1b4b; margin-left: 4px;">${nextVisitText}</span>
                  </div>
                ` : ''}

                ${nextVisitNotesText ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Notes:</span>
                    <span style="font-weight: 500; color: #334155; margin-left: 4px;">${nextVisitNotesText}</span>
                  </div>
                ` : ''}

                ${investigationList.length > 0 ? `
                  <div style="margin-bottom: 3px;">
                    <span style="font-weight: bold; color: #0f172a; text-decoration: underline;">Investigation:</span>
                    <span style="font-medium: 500; color: #1e293b; margin-left: 4px;">${investigationList.join(', ')}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <div>
              <!-- Treatment Fee Table on Left (if dental) & Doctor Signature on Right -->
              <div style="display: flex; align-items: flex-end; justify-content: ${showFeeTable ? 'space-between' : 'flex-end'}; gap: 16px; margin-top: 14px; margin-bottom: 8px;">
                ${showFeeTable ? `
                  <div style="width: 295px; max-width: 55%; box-sizing: border-box;">
                    <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e293b; font-size: 11px; line-height: 1.25; background-color: #ffffff;">
                      <tbody>
                        ${(hasConsultation || isBlank) ? `
                          <tr style="border-bottom: 1px solid #1e293b;">
                            <td style="padding: 3.5px 8px; border-right: 1px solid #1e293b; font-weight: 600; color: #0f172a; width: 64%;">Consultation Fees</td>
                            <td style="padding: 3.5px 8px; font-weight: bold; color: #0f172a; text-align: right; width: 36%; min-width: 70px;">${formatFeeValuePdf(feeDetails?.consultationFees, isBlank)}</td>
                          </tr>
                        ` : ''}

                        ${(hasXray || isBlank) ? `
                          <tr style="border-bottom: 1px solid #1e293b;">
                            <td style="padding: 3.5px 8px; border-right: 1px solid #1e293b; font-weight: 600; color: #0f172a;">${xrayLabel}</td>
                            <td style="padding: 3.5px 8px; font-weight: bold; color: #0f172a; text-align: right;">${formatFeeValuePdf(feeDetails?.xrayFees, isBlank)}</td>
                          </tr>
                        ` : ''}

                        ${(hasProcedure || isBlank) ? `
                          <tr style="border-bottom: 1px solid #1e293b;">
                            <td style="padding: 3.5px 8px; border-right: 1px solid #1e293b; font-weight: 600; color: #0f172a;">
                              <div>Procedures Fees</div>
                              ${feeDetails?.procedureName ? `<div style="font-size: 9px; font-weight: 500; color: #475569; margin-top: 1px;">(${feeDetails.procedureName})</div>` : ''}
                            </td>
                            <td style="padding: 3.5px 8px; font-weight: bold; color: #0f172a; text-align: right;">${formatFeeValuePdf(feeDetails?.procedureFees, isBlank)}</td>
                          </tr>
                        ` : ''}

                        ${(hasDiscount && !isBlank) ? `
                          <tr style="border-bottom: 1px solid #1e293b; background-color: #f0fdf4;">
                            <td style="padding: 3.5px 8px; border-right: 1px solid #1e293b; font-weight: 600; color: #166534;">${discountLabel}</td>
                            <td style="padding: 3.5px 8px; font-weight: bold; color: #166534; text-align: right;">- ${formatFeeValuePdf(discountAmount, false)}</td>
                          </tr>
                        ` : ''}

                        ${(hasTotal || hasConsultation || hasXray || hasProcedure || isBlank) ? `
                          <tr style="border-bottom: 1px solid #1e293b; background-color: #f8fafc;">
                            <td style="padding: 3.5px 8px; border-right: 1px solid #1e293b; font-weight: bold; color: #0f172a;">Total Amount</td>
                            <td style="padding: 3.5px 8px; font-weight: 800; color: #0f172a; text-align: right;">${formatFeeValuePdf(feeDetails?.totalAmount, isBlank)}</td>
                          </tr>
                        ` : ''}

                        ${(hasPaid || isBlank) ? `
                          <tr style="border-bottom: 1px solid #1e293b;">
                            <td style="padding: 3.5px 8px; border-right: 1px solid #1e293b; font-weight: 600; color: #0f172a;">Amount Paid</td>
                            <td style="padding: 3.5px 8px; font-weight: bold; color: #0f172a; text-align: right;">${formatFeeValuePdf(feeDetails?.amountPaid, isBlank)}</td>
                          </tr>
                        ` : ''}

                        ${(hasDue || hasTotal || hasPaid || isBlank) ? `
                          <tr>
                            <td style="padding: 3.5px 8px; border-right: 1px solid #1e293b; font-weight: bold; color: #0f172a;">Amount Due</td>
                            <td style="padding: 3.5px 8px; font-weight: 800; color: #0f172a; text-align: right;">${formatFeeValuePdf(feeDetails?.amountDue, isBlank)}</td>
                          </tr>
                        ` : ''}
                      </tbody>
                    </table>
                  </div>
                ` : ''}

                <!-- Doctor Signature & Stamp Area (Bottom Right) -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 180px; max-width: 45%;">
                  ${signatureBase64 ? `
                    <img src="${signatureBase64}" alt="Signature" style="height: 48px; object-fit: contain; margin-bottom: 4px;" />
                  ` : ''}
                  
                  ${doctorFormattedName ? `
                    <div style="font-size: 12px; font-weight: bold; color: #0f172a;">
                      ${doctorFormattedName}
                    </div>
                  ` : ''}
                  ${doctorRegNo ? `
                    <div style="font-size: 10px; color: #475569; font-weight: 500;">
                      ${isDental ? 'Dental' : 'Medical'} Registration Number : ${doctorRegNo}
                    </div>
                  ` : ''}

                  ${stampBase64 ? `
                    <img src="${stampBase64}" alt="Doctor Stamp" style="height: 60px; object-fit: contain; margin-top: 4px;" />
                  ` : ''}
                </div>
              </div>

              <!-- Footer Bar (Barcode on Left ONLY if uploaded + Custom Footer Text) -->
              <div style="padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box;">
                <!-- Barcode on Left: ONLY if uploaded by admin -->
                <div style="width: 110px; height: 110px; display: flex; align-items: center; justify-content: flex-start; flex-shrink: 0;">
                  ${footerBarcodeBase64 ? `
                    <img src="${footerBarcodeBase64}" alt="Prescription Barcode" style="width: 105px; height: 105px; object-fit: contain; border: 1px solid #e2e8f0; padding: 4px; border-radius: 4px; background-color: #ffffff;" />
                  ` : ''}
                </div>

                <!-- Custom Footer Text (Red strip) + Footer Sub-Text (Plain black text directly below) -->
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 16px;">
                  ${footerText ? `
                    <div style="display: inline-block; border: 1px solid #fecaca; background-color: #fef2f2; border-radius: 4px; padding: 4px 12px; max-width: 440px;">
                      <div style="font-size: 10px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.35; white-space: pre-line;">${footerText}</div>
                    </div>
                  ` : ''}
                  ${footerSubText ? `
                    <div style="font-size: 10px; font-weight: 500; color: #000000; line-height: 1.35; white-space: pre-line; margin-top: 4px; max-width: 440px;">${footerSubText}</div>
                  ` : ''}
                </div>

                <!-- Right Spacer for balance -->
                <div style="width: 110px; flex-shrink: 0;"></div>
              </div>
            </div>
          `}
        </div>
      </div>
    </body>
    </html>
  `;
}

export const generateDailyCaseRegisterPDF = async (bills, options, org) => {
  let browser = null;
  let page = null;
  try {
    const html = getDailyCaseRegisterHtml(bills, options, org);
    browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 }); // A4 dimensions
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });

    return pdfBuffer;
  } catch (err) {
    console.error(`[DAILY CASE REGISTER PDF ERROR]:`, err);
    throw err;
  } finally {
    if (page) await page.close();
  }
};

function getDailyCaseRegisterHtml(bills, options, org) {
  const clinicName = org?.branding?.clinicName || org?.clinicName || org?.name || 'Clinic';
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch (e) {
      return '';
    }
  };

  const rows = bills.map((bill, index) => {
    const dateFormatted = formatDate(bill.date);
    const slNo = index + 1;
    const name = bill.patientName || 'Walk-in Patient';
    
    // Nature of services
    const services = bill.items && bill.items.length > 0
      ? bill.items.map(item => item.description || item.procedureName).filter(Boolean).join(', ')
      : bill.billType || 'Consultation';
      
    const fees = Number(bill.amount !== undefined && bill.amount !== null ? bill.amount : (bill.paidAmount || 0)).toFixed(2);
    const dateOfReceipt = formatDate(bill.date);

    return `
      <tr>
        <td style="border: 1px solid #000; padding: 6px; font-size: 11px;">${dateFormatted}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 11px;">${slNo}</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 11px;">${name}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 11px;">${services}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold; font-size: 11px;">₹${fees}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 11px;">${dateOfReceipt}</td>
      </tr>
    `;
  }).join('');

  const reportDateStr = options.startDate === options.endDate
    ? `Date: ${formatDate(options.startDate)}`
    : `Period: ${formatDate(options.startDate)} to ${formatDate(options.endDate)}`;

  const doctorStr = options.doctorName ? `Doctor: Dr. ${options.doctorName}` : 'All Doctors';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; }
        .register-container { width: 100%; box-sizing: border-box; }
        .header-section { text-align: center; margin-bottom: 25px; }
        .form-title { font-size: 15px; font-weight: bold; text-transform: uppercase; margin: 0; }
        .rule-title { font-size: 12px; font-style: italic; font-weight: bold; margin: 2px 0 6px 0; }
        .main-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 2px; }
        .subtitle { font-size: 10px; font-weight: 500; max-width: 650px; margin: 0 auto; line-height: 1.4; }
        
        .clinic-info-bar { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
        th { font-style: italic; font-weight: bold; font-size: 10px; }
        
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .register-container { page-break-after: always; }
        }
      </style>
    </head>
    <body>
      <div class="register-container">
        <div class="header-section">
          <h1 class="form-title">FORM NO. 25</h1>
          <p class="rule-title">[See rule 46(6)(i)]</p>
          <h2 class="main-title">Form of daily case register</h2>
          <p class="subtitle">[To be maintained by practitioners of any system of medicine, i.e., physicians, surgeons, dentists, pathologists, radiologists, vaids, hakims, etc.]</p>
        </div>
        
        <div class="clinic-info-bar">
          <div>Clinic: ${clinicName}</div>
          <div>${doctorStr}</div>
          <div>${reportDateStr}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Date</th>
              <th style="width: 8%; text-align: center;">Sl. No</th>
              <th style="width: 22%;">Patient's name</th>
              <th style="width: 38%;">Nature of professional services rendered, e.g., general consultation, surgery, injection, visit, etc.</th>
              <th style="width: 10%; text-align: right;">Fees received</th>
              <th style="width: 10%;">Date of receipt</th>
            </tr>
            <tr style="text-align: center; font-weight: normal; font-size: 9px;">
              <td>(1)</td>
              <td>(2)</td>
              <td>(3)</td>
              <td>(4)</td>
              <td>(5)</td>
              <td>(6)</td>
            </tr>
          </thead>
          <tbody>
            ${rows.length > 0 ? rows : '<tr><td colspan="6" style="text-align: center; padding: 20px; font-style: italic;">No records found for the selected period</td></tr>'}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
}

export const generateExpenseReportPDF = async (expenses, typeLabel, org) => {
  let browser = null;
  let page = null;
  try {
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
    
    // Logo loading
    const logoBase64 = org.branding?.logo ? await getBase64Image(org.branding.logo) : null;
    const clinicName = org.branding?.clinicName || org.clinicName || org.name || 'Clinic';
    const clinicAddress = formatAddress(org.address || org.location);

    let rowsHtml = expenses.map((exp, idx) => {
      const name = exp.expenseName || exp.equipmentName || exp.productName || exp.labName || 'Expense';
      const detail = exp.brand ? `${exp.brand} ${exp.modelNumber || ''}`.trim() : (exp.category || exp.workType || '-');
      const vendorName = exp.vendor || exp.labName || '-';
      const date = exp.purchaseDate || exp.sentDate;
      const unitCost = exp.unitPrice || exp.cost || 0;
      const qty = exp.quantity || 1;
      const gst = exp.gstAmount || 0;
      const total = exp.totalAmount;

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 8px; font-weight: bold; color: #1f2937;">${name}</td>
          <td style="padding: 10px 8px; color: #4b5563;">${detail}</td>
          <td style="padding: 10px 8px; color: #4b5563;">${vendorName}</td>
          <td style="padding: 10px 8px; text-align: center; color: #4b5563;">${formatDate(date)}</td>
          <td style="padding: 10px 8px; text-align: right; color: #4b5563;">${formatCurrency(unitCost)}</td>
          <td style="padding: 10px 8px; text-align: center; color: #4b5563;">${qty}</td>
          <td style="padding: 10px 8px; text-align: right; color: #4b5563;">${formatCurrency(gst)}</td>
          <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #111827;">${formatCurrency(total)}</td>
          <td style="padding: 10px 8px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; background-color: ${exp.paymentStatus === 'Paid' ? '#d1fae5' : exp.paymentStatus === 'Partially Paid' ? '#fef3c7' : '#fee2e2'}; color: ${exp.paymentStatus === 'Paid' ? '#065f46' : exp.paymentStatus === 'Partially Paid' ? '#d97706' : '#991b1b'}; text-transform: uppercase;">
              ${exp.paymentStatus}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    if (expenses.length === 0) {
      rowsHtml = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #9ca3af; font-style: italic;">No expenses found.</td></tr>`;
    }

    const totalQty = expenses.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    const totalGst = expenses.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
    const totalExp = expenses.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #374151; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; }
          .clinic-logo { height: 60px; max-width: 150px; object-fit: contain; }
          .clinic-info { text-align: right; }
          .clinic-name { font-size: 18px; font-weight: bold; color: #111827; margin: 0; text-transform: uppercase; }
          .clinic-address { font-size: 11px; color: #6b7280; margin: 4px 0 0 0; max-width: 250px; line-height: 1.3; }
          .report-title { font-size: 18px; font-weight: bold; color: #111827; text-transform: uppercase; margin-bottom: 5px; }
          .report-meta { font-size: 11px; color: #6b7280; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { background-color: #f9fafb; color: #374151; padding: 10px 8px; border-bottom: 2px solid #e5e7eb; font-weight: bold; text-align: left; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
          td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; }
          .summary-card { float: right; width: 250px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background-color: #f9fafb; margin-top: 10px; font-size: 12px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .summary-row:last-child { margin-bottom: 0; padding-top: 6px; border-top: 1px dashed #d1d5db; font-weight: bold; color: #111827; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${logoBase64 ? `<img src="${logoBase64}" class="clinic-logo" />` : `<h2 style="margin:0; color:#3b82f6;">${clinicName}</h2>`}
          </div>
          <div class="clinic-info">
            <div class="clinic-name">${clinicName}</div>
            <div class="clinic-address">${clinicAddress}</div>
          </div>
        </div>
        <div class="report-title">${typeLabel} Report</div>
        <div class="report-meta">Generated on: ${formatDate(new Date())}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">Sr.No</th>
              <th style="width: 20%;">Item Name</th>
              <th style="width: 15%;">Details</th>
              <th style="width: 15%;">Vendor/Lab</th>
              <th style="width: 10%; text-align: center;">Date</th>
              <th style="width: 10%; text-align: right;">Unit Price</th>
              <th style="width: 5%; text-align: center;">Qty</th>
              <th style="width: 10%; text-align: right;">GST</th>
              <th style="width: 10%; text-align: right;">Total</th>
              <th style="width: 10%; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div style="width: 100%; display: flow-root;">
          <div class="summary-card">
            <div class="summary-row">
              <span>Total Quantity:</span>
              <span>${totalQty}</span>
            </div>
            <div class="summary-row">
              <span>Total GST:</span>
              <span>${formatCurrency(totalGst)}</span>
            </div>
            <div class="summary-row">
              <span>Grand Total:</span>
              <span>${formatCurrency(totalExp)}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    return pdfBuffer;
  } catch (err) {
    console.error("PDF generation failed in generateExpenseReportPDF:", err);
    throw err;
  } finally {
    if (page) await page.close();
  }
};

