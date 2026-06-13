import React from 'react';
import { format } from 'date-fns';
import { INVOICE_LAYOUTS } from '../../constants/invoiceCustomization';

const InvoiceTemplateRenderer = ({ billData, clinicInfo, template }) => {
  if (!template || !billData) return <div className="p-8 text-center text-gray-500">Loading invoice preview...</div>;

  const formatDate = (date) => {
    try {
      return format(new Date(date), 'dd MMM yyyy');
    } catch (e) {
      return date;
    }
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(num || 0);
  };

  const metadata = template.metadata || {};

  // 1. Generate Items Table HTML (Multi-Format Support)
  const generateItemsTable = (type = 'standard') => {
    const items = billData.items || [];
    if (items.length === 0) return '<tr><td colspan="4">No items</td></tr>';

    if (type === 'thermal') {
      return items.map(item => `
        <div class="flex justify-between items-start mb-1">
          <div style="width: 50%;">${item.description} x${item.qty}</div>
          <div style="width: 50%; text-align: right;">${formatCurrency(item.subtotal)}</div>
        </div>
      `).join('');
    }

    if (type === 'minimal') {
      return items.map(item => `
        <tr class="group">
          <td class="py-6">
            <p class="font-bold text-lg">${item.description}</p>
            <p class="text-xs opacity-50">${item.qty} Unit x ${formatCurrency(item.unitPrice)}</p>
          </td>
          <td class="py-6 text-right font-black text-xl">${formatCurrency(item.subtotal)}</td>
        </tr>
      `).join('');
    }

    // Default table row
    return items.map(item => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 16px;">${item.description}</td>
        <td style="padding: 16px; text-align: center;">${item.qty}</td>
        <td style="padding: 16px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 16px; text-align: right; font-weight: bold;">${formatCurrency(item.subtotal)}</td>
      </tr>
    `).join('');
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
    return parts.join(', ');
  };

  // 2. Prepare Placeholder Values
  const values = {
    '{{clinic_name}}': clinicInfo.name || clinicInfo.clinicName || 'Clinic Name',
    '{{clinic_address}}': formatAddress(clinicInfo.address),
    '{{clinic_phone}}': clinicInfo.phone || '',
    '{{clinic_email}}': clinicInfo.email || '',
    '{{clinic_logo}}': clinicInfo.branding?.logo ? `<img src="${clinicInfo.branding.logo}" style="max-height: 80px;" />` : '',

    '{{patient_name}}': billData.patientName || 'Walk-in Patient',
    '{{patient_id}}': billData.patientId || 'N/A',
    '{{doctor_name}}': billData.doctorName || 'General Consultant',
    '{{invoice_number}}': billData.invoiceNumber || billData.billId || 'DRAFT-001',
    '{{date}}': formatDate(billData.date || billData.createdAt || new Date()),

    '{{subtotal}}': formatCurrency(billData.subtotal),
    '{{tax_amount}}': formatCurrency(billData.taxAmount),
    '{{discount}}': formatCurrency(billData.discount),
    '{{total_amount}}': formatCurrency(billData.amount),
    '{{payment_method}}': billData.paymentMethod || 'Cash',
    '{{notes}}': billData.notes || 'Thank you for your visit.',

    '{{items_table}}': generateItemsTable('standard'),
    '{{items_table_modern}}': generateItemsTable('standard'),
    '{{items_table_minimal}}': generateItemsTable('minimal'),
    '{{items_table_thermal}}': generateItemsTable('thermal')
  };

  // 3. Select Base Layout
  const baseLayout = INVOICE_LAYOUTS.find(l => l.id === metadata.baseLayoutId) || INVOICE_LAYOUTS[0];
  let processedHtml = baseLayout.html;

  // 4. Process Conditional Logic ({{#if key}}...{{/if}})
  const ifRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g;
  processedHtml = processedHtml.replace(ifRegex, (match, key, content) => {
    return metadata[key] ? content : '';
  });

  // 5. Process Placeholders
  Object.keys(values).forEach(key => {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    processedHtml = processedHtml.replace(regex, values[key]);
  });

  const installmentsHtml = (() => {
    if (!billData.installments || billData.installments.length === 0) return '';
    const rows = billData.installments.map(inst => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${formatDate(inst.date)}</td>
        <td style="padding: 8px; text-align: left;">${billData.patientName || 'Walk-in Patient'}</td>
        <td style="padding: 8px; text-align: left;">${inst.paymentMethod || 'N/A'}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(inst.amount)}</td>
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
          <span>Total Paid So Far: ${formatCurrency(billData.paidAmount || 0)}</span>
          ${billData.dueAmount > 0 
            ? `<span style="color: #dc2626;">Total Payment Due: ${formatCurrency(billData.dueAmount)}</span>` 
            : `<span style="color: #16a34a; text-transform: uppercase;">Status: PAID</span>`
          }
        </div>
      </div>
    `;
  })();

  if (processedHtml.includes('{{installments_section}}')) {
    processedHtml = processedHtml.replace('{{installments_section}}', installmentsHtml);
  } else {
    processedHtml = processedHtml.replace('</table>', '</table>' + installmentsHtml);
  }

  return (
    <div className="invoice-renderer-container bg-slate-50 p-4 rounded-3xl" style={{
      '--primary-color': metadata.primaryColor || '#3b82f6',
      '--secondary-color': metadata.secondaryColor || '#1e293b',
      '--font-family': metadata.fontFamily || 'Inter'
    }}>
      {/* Dynamic CSS Variables Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .invoice-rendered-content {
          font-family: var(--font-family), sans-serif !important;
        }
        @media print {
          body * { visibility: hidden; }
          .invoice-rendered-content, .invoice-rendered-content * { visibility: visible; }
          .invoice-rendered-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />

      {/* Render Final Content */}
      <div
        className={`invoice-rendered-content bg-white ${metadata.isCompact ? 'p-4' : 'p-0'} shadow-2xl mx-auto overflow-hidden relative flex flex-col`}
        style={{
          width: baseLayout.type === 'thermal' ? '80mm' : '210mm',
          minHeight: baseLayout.type === 'thermal' ? 'auto' : '297mm',
          fontSize: metadata.isCompact ? '12px' : '14px'
        }}
      >
        {/* Custom Header */}
        {template.headerType === 'custom' && template.headerImage && (
          <div className="w-full mb-4">
            <img 
              src={template.headerImage.startsWith('http') ? template.headerImage : `${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000'}${template.headerImage.startsWith('/') ? '' : '/'}${template.headerImage}`} 
              alt="Custom Header" 
              className="w-full h-auto object-contain"
            />
          </div>
        )}

        {/* Watermark / Body Image */}
        {template.bodyType === 'custom' && template.bodyImage && (
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
             <img 
              src={template.bodyImage.startsWith('http') ? template.bodyImage : `${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000'}${template.bodyImage.startsWith('/') ? '' : '/'}${template.bodyImage}`} 
              alt="Watermark" 
              className="w-2/3 h-auto object-contain"
            />
          </div>
        )}

        <div className="flex-1 relative z-10" dangerouslySetInnerHTML={{ __html: processedHtml }} />

        {/* Custom Footer */}
        {template.footerType === 'custom' && template.footerImage && (
          <div className="w-full mt-auto">
            <img 
              src={template.footerImage.startsWith('http') ? template.footerImage : `${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000'}${template.footerImage.startsWith('/') ? '' : '/'}${template.footerImage}`} 
              alt="Custom Footer" 
              className="w-full h-auto object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceTemplateRenderer;
