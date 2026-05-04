import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
export const generateInvoicePDF = async (bill, org, template = null) => {
  let browser = null;
  try {
    const fileName = `Invoice-${bill.billId}.pdf`;
    const invoicesDir = path.join(__dirname, '../uploads/invoices');

    // Ensure directory exists
    if (!fs.existsSync(invoicesDir)) {
      console.log(`[PDF] Creating directory: ${invoicesDir}`);
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const filePath = path.join(invoicesDir, fileName);

    // 1. Generate HTML Content
    const html = getInvoiceHtml(bill, org, template);

    // 2. Launch Puppeteer
    console.log(`[PDF] Launching Puppeteer for ${bill.billId}...`);
    browser = await puppeteer.launch({
      headless: 'new',
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    
    // Set viewport to A4 dimensions at 96 DPI
    await page.setViewport({ width: 794, height: 1123 });

    // Set HTML content with a more robust wait strategy
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    
    // Additional wait for any dynamic content/styles to settle (crucial for fonts/colors)
    await new Promise(r => setTimeout(r, 1000));

    // 3. Generate PDF Buffer
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

    // 4. Validate Buffer Size
    if (pdfBuffer.length < 5120) { // 5KB
      console.error(`[PDF ERROR] Generated PDF for ${bill.billId} is suspiciously small: ${pdfBuffer.length} bytes`);
      console.log(`[PDF DEBUG] Source HTML:\n${html}`);
      throw new Error(`Generated PDF is too small (${pdfBuffer.length} bytes). Rendering might have failed.`);
    }

    // 5. Save to Disk
    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`[PDF] Successfully generated and saved: ${filePath} (${pdfBuffer.length} bytes)`);

    return filePath;
  } catch (err) {
    console.error(`[PDF GENERATION ERROR]:`, err);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
};

/**
 * Helper to construct the full HTML string with inline CSS.
 */
function getInvoiceHtml(bill, org, template) {
  const metadata = template?.metadata || {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b',
    fontFamily: 'Inter',
    showLogo: true,
    showGst: true,
    showPatientId: true,
    showDoctor: true
  };

  const layoutHtml = template?.htmlLayout === 'CORE_LAYOUT_REFERENCE' 
    ? getBaseLayoutHtml(metadata.baseLayoutId || 'layout-standard')
    : (template?.htmlLayout || getBaseLayoutHtml('layout-standard'));

  const values = {
    '{{clinic_name}}': org.clinicName || org.name || 'Our Clinic',
    '{{clinic_address}}': formatAddress(org.address || org.location),
    '{{clinic_phone}}': org.phone || '',
    '{{clinic_email}}': org.email || '',
    '{{clinic_logo}}': '', // Temporarily disabled to reduce PDF size for troubleshooting
    //'{{clinic_logo}}': org.branding?.logo ? `<img src="${org.branding.logo}" style="max-height: 80px;" />` : '',

    '{{patient_name}}': bill.patientName || 'Walk-in Patient',
    '{{patient_id}}': bill.patientId || 'N/A',
    '{{doctor_name}}': bill.doctorName || 'General Consultant',
    '{{invoice_number}}': bill.invoiceNumber || bill.billId || 'DRAFT-001',
    '{{date}}': new Date(bill.date || bill.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),

    '{{subtotal}}': formatCurrency(bill.subtotal || bill.amount),
    '{{tax_amount}}': formatCurrency(bill.taxAmount || 0),
    '{{discount}}': formatCurrency(bill.discount || 0),
    '{{total_amount}}': formatCurrency(bill.amount),
    '{{payment_method}}': bill.paymentMethod || 'Cash',
    '{{notes}}': bill.notes || 'Thank you for your visit.',

    '{{items_table}}': generateItemsTable(bill.items, 'standard'),
    '{{items_table_modern}}': generateItemsTable(bill.items, 'standard'),
    '{{items_table_minimal}}': generateItemsTable(bill.items, 'minimal'),
    '{{items_table_thermal}}': generateItemsTable(bill.items, 'thermal')
  };

  // Process conditional logic
  let processedHtml = layoutHtml;
  const ifRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g;
  processedHtml = processedHtml.replace(ifRegex, (match, key, content) => {
    return metadata[key] ? content : '';
  });

  // Process placeholders
  Object.keys(values).forEach(key => {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    processedHtml = processedHtml.replace(regex, values[key]);
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        ${getInvoiceCSS(metadata)}
      </style>
    </head>
    <body>
      <div class="invoice-wrapper">
        ${processedHtml}
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

function generateItemsTable(items = [], type = 'standard') {
  if (!items || items.length === 0) return '<tr><td colspan="4" style="padding: 16px; text-align: center;">No items recorded</td></tr>';

  return items.map(item => {
    const description = item.description || item.name || 'Service';
    const qty = item.qty || item.quantity || 1;
    const price = item.unitPrice || item.price || item.cost || 0;
    const subtotal = item.subtotal || (qty * price);

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 16px;">${description}</td>
        <td style="padding: 16px; text-align: center;">${qty}</td>
        <td style="padding: 16px; text-align: right;">${formatCurrency(price)}</td>
        <td style="padding: 16px; text-align: right; font-weight: bold;">${formatCurrency(subtotal)}</td>
      </tr>
    `;
  }).join('');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
}

function formatAddress(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.pincode, addr.country].filter(Boolean);
  return parts.join(', ');
}
