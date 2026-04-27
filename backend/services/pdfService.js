import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a professional PDF invoice for a bill.
 * 
 * @param {object} bill - The bill object from MongoDB
 * @param {object} org - The organization object
 * @returns {Promise<string>} - Absolute path to the generated PDF
 */
export const generateInvoicePDF = async (bill, org) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const fileName = `Invoice-${bill.billId}.pdf`;
      const invoicesDir = path.join(__dirname, '../uploads/invoices');
      
      // Ensure directory exists
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filePath = path.join(invoicesDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // --- Header ---
      doc
        .fillColor('#444444')
        .fontSize(20)
        .text(org?.clinicName || org?.name || 'Our Clinic', 50, 45)
        .fontSize(10)
        .text(org?.address || '', 50, 70)
        .text(`${org?.city || ''}, ${org?.state || ''} ${org?.pincode || ''}`, 50, 85)
        .text(`Phone: ${org?.phone || 'N/A'}`, 50, 100)
        .moveDown();

      // --- Invoice Info ---
      doc
        .fillColor('#000000')
        .fontSize(20)
        .text('INVOICE', 400, 45, { align: 'right' })
        .fontSize(10)
        .text(`Invoice #: ${bill.billId}`, 400, 70, { align: 'right' })
        .text(`Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 400, 85, { align: 'right' })
        .text(`Status: ${bill.status}`, 400, 100, { align: 'right' })
        .moveDown();

      // Horizontal Line
      doc.moveTo(50, 125).lineTo(550, 125).stroke('#CCCCCC');

      // --- Patient & Doctor Info ---
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Patient Details:', 50, 140)
        .font('Helvetica')
        .text(bill.patientName, 50, 155)
        .text(`Phone: ${bill.patientPhone || 'N/A'}`, 50, 170)
        
        .font('Helvetica-Bold')
        .text('Consulting Doctor:', 350, 140)
        .font('Helvetica')
        .text(bill.doctorName, 350, 155)
        .text(`Date: ${bill.appointmentDate || 'N/A'}`, 350, 170)
        .moveDown();

      // --- Table Header ---
      const tableTop = 220;
      doc
        .font('Helvetica-Bold')
        .text('Description', 50, tableTop)
        .text('Qty', 280, tableTop, { width: 50, align: 'right' })
        .text('Unit Price', 350, tableTop, { width: 90, align: 'right' })
        .text('Total', 480, tableTop, { width: 70, align: 'right' });

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke('#EEEEEE');

      // --- Table Items ---
      let currentY = tableTop + 25;
      const items = bill.items || [];

      if (items.length > 0) {
        items.forEach((item) => {
          doc
            .font('Helvetica')
            .text(item.description || item.name || 'Service', 50, currentY)
            .text(item.qty?.toString() || '1', 280, currentY, { width: 50, align: 'right' })
            .text(`${item.unitPrice || item.price || bill.amount}`, 350, currentY, { width: 90, align: 'right' })
            .text(`${item.subtotal || (item.qty * item.price) || bill.amount}`, 480, currentY, { width: 70, align: 'right' });
          
          currentY += 20;
        });
      } else {
        // Fallback if no items (manual bill)
        doc
          .text('Consultation/Service Fee', 50, currentY)
          .text('1', 280, currentY, { width: 50, align: 'right' })
          .text(`${bill.amount}`, 350, currentY, { width: 90, align: 'right' })
          .text(`${bill.amount}`, 480, currentY, { width: 70, align: 'right' });
        currentY += 20;
      }

      // --- Totals ---
      const footerTop = currentY + 30;
      doc.moveTo(350, footerTop).lineTo(550, footerTop).stroke('#CCCCCC');

      doc
        .font('Helvetica-Bold')
        .text('Total Amount:', 350, footerTop + 10)
        .text(`Rs. ${bill.amount}`, 480, footerTop + 10, { width: 70, align: 'right' })
        
        .fontSize(9)
        .fillColor('#666666')
        .text('Paid Amount:', 350, footerTop + 30)
        .text(`Rs. ${bill.paidAmount || 0}`, 480, footerTop + 30, { width: 70, align: 'right' })
        
        .text('Due Amount:', 350, footerTop + 45)
        .text(`Rs. ${bill.dueAmount || 0}`, 480, footerTop + 45, { width: 70, align: 'right' });

      // --- Footer ---
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text('Thank you for choosing our services.', 50, 750, { align: 'center', width: 500 })
        .text('This is a computer-generated invoice.', 50, 765, { align: 'center', width: 500 });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};
