import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
      const ext = resolvedPath.split('?')[0].split('.').pop() || 'png';
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
    
    if (fs.existsSync(absolutePath)) {
      const fileBuffer = fs.readFileSync(absolutePath);
      const ext = path.extname(absolutePath).slice(1) || 'png';
      return `data:image/${ext};base64,${fileBuffer.toString('base64')}`;
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
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
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

function formatAddress(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.pincode, addr.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

async function getOviaanDefaultPharmacyHtml(bill, org, template) {
  const logoBase64 = (template?.headerType === 'custom' && template?.headerImage) 
    ? await getBase64Image(template.headerImage) 
    : (org?.branding?.logo ? await getBase64Image(org.branding.logo) : (org?.logo ? await getBase64Image(org.logo) : null));
    
  const signatureBase64 = (template?.footerType === 'custom' && template?.footerImage)
    ? await getBase64Image(template.footerImage)
    : (org?.doctorSignature ? await getBase64Image(org.doctorSignature) : null);
  
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
  const age = bill.age || bill.patient?.age || '';
  const gender = bill.gender || bill.patient?.gender || '';
  const doctorName = bill.doctorName || 'N/A';
  const patientAddress = bill.patientAddress || 'N/A';
  const billDate = new Date(bill.date || bill.createdAt).toLocaleDateString('en-GB'); 
  const billNo = bill.invoiceNumber || bill.billId || 'N/A';
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
        .signature-img { width: 90px; height: auto; }
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
            <div class="row"><span class="label">Age / Sex :</span><span class="value">${age} Years / ${gender}</span></div>
            <div class="row"><span class="label">Dr.Name :</span><span class="value">${doctorName}</span></div>
            <div class="row"><span class="label">Address :</span><span class="value">${patientAddress}</span></div>
          </div>
          <div class="details-right">
            <div class="row"><span class="label">Bill Date :</span><span class="value">${billDate}</span></div>
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
        ${signatureBase64 ? `<div class="signature-section"><img src="${signatureBase64}" class="signature-img" /></div>` : ''}
      </div>
    </body>
    </html>
  `;
}

async function getInvoiceHtml(bill, org, template) {
  // Use Oviaan Default Pharmacy Layout ONLY for Pharmacy bills
  if (bill.billType === 'Pharmacy') {
    return await getOviaanDefaultPharmacyHtml(bill, org, template);
  }

  const metadata = template?.metadata || {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b',
    fontFamily: 'Inter',
    showLogo: true,
    showGst: true,
    showPatientId: true,
    showDoctor: true
  };

  // Branding Images
  const headerBase64 = template?.headerType === 'custom' && template?.headerImage ? await getBase64Image(template.headerImage) : null;
  const footerBase64 = template?.footerType === 'custom' && template?.footerImage ? await getBase64Image(template.footerImage) : null;
  const bodyBase64 = template?.bodyType === 'custom' && template?.bodyImage ? await getBase64Image(template.bodyImage) : null;
  const logoBase64 = (org?.branding?.logo ? await getBase64Image(org.branding.logo) : (org?.logo ? await getBase64Image(org.logo) : null));

  const layoutHtml = template?.htmlLayout === 'CORE_LAYOUT_REFERENCE' 
    ? getBaseLayoutHtml(metadata.baseLayoutId || 'layout-standard')
    : (template?.htmlLayout || getBaseLayoutHtml('layout-standard'));

  const values = {
    '{{clinic_name}}': org.branding?.clinicName || org.clinicName || org.name || 'Our Clinic',
    '{{clinic_address}}': formatAddress(org.address || org.location),
    '{{clinic_phone}}': org.phone || '',
    '{{clinic_email}}': org.email || '',
    '{{clinic_logo}}': logoBase64 ? `<img src="${logoBase64}" style="max-height: 80px;" />` : '',

    '{{patient_name}}': bill.patientName || 'Walk-in Patient',
    '{{patient_id}}': bill.patientId || 'N/A',
    '{{doctor_name}}': bill.doctorName || 'General Consultant',
    '{{invoice_number}}': bill.invoiceNumber || bill.billId || 'DRAFT-001',
    '{{date}}': new Date(bill.date || bill.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),

    '{{subtotal}}': formatCurrency(bill.subtotal || bill.amount),
    '{{tax_amount}}': formatCurrency(bill.taxAmount || 0),
    '{{discount}}': formatCurrency(bill.discount || 0),
    '{{total_amount}}': formatCurrency((bill.amount || 0) - (bill.discount || 0)),
    '{{payment_method}}': bill.paymentMethod || 'Cash',
    '{{notes}}': bill.notes || 'Thank you for your visit.',

    '{{items_table}}': generateItemsTable(bill.items, 'standard', bill.discount),
    '{{items_table_modern}}': generateItemsTable(bill.items, 'standard', bill.discount),
    '{{items_table_minimal}}': generateItemsTable(bill.items, 'minimal', bill.discount),
    '{{items_table_thermal}}': generateItemsTable(bill.items, 'thermal', bill.discount)
  };

  // Process conditional logic
  let processedHtml = layoutHtml;

  // CUSTOM BRANDING OVERRIDE (If custom header/footer exists)
  if (headerBase64) {
    // Replace the default header section with the custom header image
    // This is a bit tricky as we need to identify the header section.
    // In our base layouts, the header is usually the first div or has clinic_name.
    // For now, let's wrap the whole thing if it's custom.
  }

  const ifRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g;
  processedHtml = processedHtml.replace(ifRegex, (match, key, content) => {
    return metadata[key] ? content : '';
  });

  // Process placeholders
  Object.keys(values).forEach(key => {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    processedHtml = processedHtml.replace(regex, values[key]);
  });

  // Body Watermark
  const bodyBgStyle = bodyBase64 ? `background-image: url('${bodyBase64}'); background-size: 60%; background-position: center; background-repeat: no-repeat; opacity: 0.1;` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        ${getInvoiceCSS(metadata)}
        .custom-header { width: 100%; margin-bottom: 20px; }
        .custom-header img { width: 100%; max-height: 150px; object-fit: contain; }
        .custom-footer { width: 100%; margin-top: 40px; }
        .custom-footer img { width: 100%; max-height: 80px; object-fit: contain; }
        .watermark-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; ${bodyBgStyle} z-index: -1; pointer-events: none; }
        .invoice-wrapper { position: relative; min-height: 100vh; display: flex; flex-direction: column; }
        .invoice-content { flex: 1; }
      </style>
    </head>
    <body>
      <div class="invoice-wrapper">
        ${headerBase64 ? `<div class="custom-header"><img src="${headerBase64}" /></div>` : ''}
        <div class="invoice-content">
          <div class="watermark-container"></div>
          ${processedHtml}
        </div>
        ${footerBase64 ? `<div class="custom-footer"><img src="${footerBase64}" /></div>` : ''}
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
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
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
  const logoBase64 = (template?.headerType === 'custom' && template?.headerImage) 
    ? await getBase64Image(template.headerImage) 
    : (org?.branding?.logo ? await getBase64Image(org.branding.logo) : (org?.logo ? await getBase64Image(org.logo) : null));
    
  const signatureBase64 = (template?.footerType === 'custom' && template?.footerImage)
    ? await getBase64Image(template.footerImage)
    : (org?.doctorSignature ? await getBase64Image(org.doctorSignature) : null);
  
  let parsedData = null;
  let rawContent = prescriptionData;

  // 1. Resolve rawContent if prescriptionData is an object
  if (typeof prescriptionData === 'object' && prescriptionData !== null) {
    rawContent = prescriptionData.notes || prescriptionData.description || prescriptionData.content || (prescriptionData.medications ? prescriptionData : null);
  }

  // 2. Parse rawContent into parsedData
  try {
    if (typeof rawContent === 'string') {
      const trimmed = rawContent.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        parsedData = JSON.parse(trimmed);
      }
    } else if (typeof rawContent === 'object' && rawContent !== null) {
      parsedData = rawContent;
    }
  } catch (e) {
    console.error('[PDF Service] Error parsing prescription content:', e.message);
  }

  // 3. Fallback for doctor name and credentials
  const doctorName = doctorDetails.doctorName || prescriptionData?.doctorName || parsedData?.doctorName || 'Doctor';
  const doctorQualification = doctorDetails.doctorQualification || prescriptionData?.doctorQualification || parsedData?.doctorQualification || 'MBBS, MD';
  const doctorSpecialization = doctorDetails.doctorSpecialization || prescriptionData?.doctorSpecialization || parsedData?.doctorSpecialization || 'Specialist';

  const isDefaultV2 = template?._id === 'default_v2';

  let headerHtml = '';
  if (isDefaultV2) {
    headerHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding-bottom: 10px; border-bottom: 2px solid #eee; width: 100%;">
        ${logoBase64 ? `<img src="${logoBase64}" style="height: 80px; width: 80px; object-fit: contain; margin-bottom: 10px;" />` : ''}
        <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 900; text-transform: uppercase;">${org?.name || org?.clinicName || 'Clinic Name'}</h1>
        <div style="margin: 5px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">
          ${formatAddress(org?.address || org?.location)}<br/>
          Contact: ${org?.phone || ''}
        </div>
      </div>
    `;
  } else if (template?.headerType === 'custom' && template?.headerImage && logoBase64) {
    headerHtml = `<img src="${logoBase64}" style="width: 100%; max-height: 150px; object-fit: contain;" />`;
  } else {
    headerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2px solid #eee;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 80px; width: 80px; object-fit: contain;" />` : ''}
          <div>
            <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 900; text-transform: uppercase;">${org?.name || org?.clinicName || 'Clinic Name'}</h1>
            <div style="margin: 5px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">
              ${formatAddress(org?.address || org?.location)}<br/>
              Contact: ${org?.phone || ''}
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; color: #4338ca; font-size: 22px; font-weight: 900; text-transform: uppercase;">Dr. ${doctorName}</h2>
          <p style="margin: 2px 0; font-size: 12px; font-weight: bold; color: #6366f1; text-transform: uppercase; border-bottom: 2px solid #eef2ff; padding-bottom: 2px; display: inline-block;">${doctorQualification}</p>
          <p style="margin: 2px 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${doctorSpecialization}</p>
        </div>
      </div>
    `;
  }

  let footerHtml = '';
  if (isDefaultV2) {
    footerHtml = `
      <div style="padding: 10px 40px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
        <div style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Dr. ${doctorName}</div>
        <div style="font-size: 10px; color: #999; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Powered by Oviaan</div>
        <div style="width: 80px;"></div>
      </div>
    `;
  } else if (template?.footerType === 'custom' && template?.footerImage && signatureBase64) {
    footerHtml = `<img src="${signatureBase64}" style="width: 100%; max-height: 80px; object-fit: contain;" />`;
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


  let contentHtml = '';
  if (parsedData) {
    contentHtml = `
      <div style="font-size: 14px;">
        ${(parsedData.vitals || parsedData.complaints || parsedData.diagnosis) ? `
          <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            ${parsedData.vitals ? `<p><strong>Vitals:</strong> ${Object.entries(parsedData.vitals).filter(([_,v])=>v).map(([k,v])=>`${k}: ${v}`).join(', ')}</p>` : ''}
            ${parsedData.complaints?.length > 0 ? `<p><strong>Complaints:</strong> ${parsedData.complaints.map(c=>c.name || c).join(', ')}</p>` : ''}
            ${parsedData.diagnosis?.length > 0 ? `<p><strong>Diagnosis:</strong> ${parsedData.diagnosis.map(d=>d.name || d).join(', ')}</p>` : ''}
          </div>
        ` : ''}
        
        <div style="font-size: 32px; font-style: italic; font-weight: bold; margin-bottom: 10px; color: #000;">Rx</div>
        
        ${parsedData.medications?.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Medicine</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Dose</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Timing</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Freq</th>
                <th style="padding: 10px; border-bottom: 2px solid #dee2e6; text-align: left;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${parsedData.medications.map(m => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${m.name}</strong><br/><small>${m.composition || ''}</small></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.dose}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.when}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.frequency}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.duration || '--'}</td>
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
                  <span style="font-weight: 600;">${t.name || t}</span>
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
    contentHtml = `<div style="font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${prescriptionData?.notes || prescriptionData?.description || ''}</div>`;
  }

  const customTemplate = org?.prescriptionTemplate;
  const isGlobalA4Enabled = customTemplate?.enabled && customTemplate?.templateUrl;

  const isA4Type = template?.headerType === 'a4' || template?.layoutType === 'a4';
  const hasOtherCustomTemplate = template && !isA4Type;

  // Use A4 if: explicitly selected via template manager, OR global A4 is enabled and no other template overrides it.
  const isCustomTemplateEnabled = customTemplate?.templateUrl && (isA4Type || (isGlobalA4Enabled && !hasOtherCustomTemplate));

  if (isCustomTemplateEnabled) {
    const templateBase64 = await getBase64Image(customTemplate.templateUrl);
    const { top = 55, left = 12, right = 12, bottom = 30 } = customTemplate.printableArea || {};
    const fontSize = customTemplate.fontSize || 12;

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
          body {
            margin: 0;
            padding: 0;
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #1e293b;
            font-size: ${fontSize}px;
          }
          .template-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -1;
          }
          .content-wrapper {
            position: relative;
            z-index: 1;
            padding-top: ${top}mm;
            padding-left: ${left}mm;
            padding-right: ${right}mm;
            padding-bottom: ${bottom}mm;
            box-sizing: border-box;
            min-height: 100vh;
          }
          .patient-info {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 8px;
            margin-bottom: 20px;
            font-weight: bold;
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { padding: 8px; text-align: left; border-bottom: 2px solid #ccc; }
          td { padding: 8px; border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        <img class="template-bg" src="${templateBase64}" alt="Template Background" />
        
        <div class="content-wrapper">
          <div class="patient-info">
            ${isDefaultV2 ? `
              <span>Name: ${patientData?.fullName || patientData?.name || 'Unknown'} (${patientData?.age || '--'} Years)</span>
              <span>Date: ${prescriptionData?.date ? new Date(prescriptionData.date).toLocaleDateString() : new Date().toLocaleDateString()}</span>
            ` : `
              <span>Patient: ${patientData?.fullName || patientData?.name || 'Unknown'} (${patientData?.age || '--'} / ${patientData?.gender || '--'})</span>
              <span>Date: ${prescriptionData?.date ? new Date(prescriptionData.date).toLocaleDateString() : new Date().toLocaleDateString()}</span>
            `}
          </div>
          
          ${contentHtml}
        </div>
      </body>
      </html>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 0; box-sizing: border-box; color: #1e293b; }
        .container { width: 100%; position: relative; display: flex; flex-direction: column; background: #fff; }
        .header-wrapper { padding: 30px 40px 10px 40px; }
        .patient-info { padding: 12px 40px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .content { padding: 30px 40px; flex: 1; position: relative; }
        .watermark { position: absolute; top: 0; left: 0; right: 0; bottom: 0; ${bodyBg} z-index: -1; }
        .footer { width: 100%; min-height: 60px; display: flex; align-items: center; justify-content: center; margin-top: auto; padding-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header-wrapper">${headerHtml}</div>
        <div class="patient-info">
          ${isDefaultV2 ? `
            <span>Name: ${patientData?.fullName || patientData?.name || 'Unknown'}</span>
            <span>Age: ${patientData?.age || '--'} Years</span>
            <span>Date: ${prescriptionData?.date ? new Date(prescriptionData.date).toLocaleDateString() : new Date().toLocaleDateString()}</span>
          ` : `
            <span>Name: ${patientData?.fullName || patientData?.name || 'Unknown'}</span>
            <span>Age/Sex: ${patientData?.age || '--'} / ${patientData?.gender || '--'}</span>
            <span>Date: ${prescriptionData?.date ? new Date(prescriptionData.date).toLocaleDateString() : new Date().toLocaleDateString()} ${prescriptionData?.time ? `| ${prescriptionData.time}` : ''}</span>
          `}
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
}
