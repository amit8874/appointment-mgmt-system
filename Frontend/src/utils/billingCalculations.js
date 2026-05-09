/**
 * Centralized billing calculation logic for the entire application.
 * This ensures consistency between list views, modals, prints, and PDFs.
 */

export const calculateInvoiceTotals = (invoice) => {
  if (!invoice) return {
    grossAmount: 0,
    discountAmount: 0,
    taxableAmount: 0,
    taxAmount: 0,
    grandTotal: 0,
    paidAmount: 0,
    dueAmount: 0
  };

  // Helper to round to 2 decimals safely
  const r = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  const items = invoice.items || invoice.services || [];
  let grossAmount = 0;
  let itemWiseDiscountSum = 0;
  let itemWiseTaxSum = 0;

  if (items.length > 0) {
    items.forEach(item => {
      const price = parseFloat(item.unitPrice || item.sellingPrice || item.price || item.rate || 0);
      const qty = parseFloat(item.qty || item.quantity || 1);
      const itemGross = price * qty;
      grossAmount += itemGross;

      // Item-wise discount
      if (item.discountAmount) {
        itemWiseDiscountSum += parseFloat(item.discountAmount);
      } else if (item.discountPercentage) {
        itemWiseDiscountSum += (itemGross * parseFloat(item.discountPercentage)) / 100;
      }

      // Item-wise tax
      const itemAfterDisc = itemGross - ((item.discountAmount) || (itemGross * (item.discountPercentage || 0) / 100));
      if (item.taxAmount) {
        itemWiseTaxSum += parseFloat(item.taxAmount);
      } else if (item.gstPercentage || item.taxPercentage || item.taxRate) {
        const tr = parseFloat(item.gstPercentage || item.taxPercentage || item.taxRate || 0);
        itemWiseTaxSum += (itemAfterDisc * tr) / 100;
      }
    });
  } else {
    grossAmount = parseFloat(invoice.amount || invoice.subtotal || invoice.grossAmount || 0);
  }

  // Calculate Global Discount
  let discountAmount = 0;
  const discountType = invoice.discountType || 'percentage';
  const discountValue = parseFloat(invoice.discountValue || invoice.discount || 0);

  if (itemWiseDiscountSum > 0 && !invoice.discountValue && !invoice.discount) {
    discountAmount = itemWiseDiscountSum;
  } else if (discountType === 'percentage') {
    discountAmount = (grossAmount * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }

  const taxableAmount = Math.max(0, grossAmount - discountAmount);

  // Calculate Global Tax
  let taxAmount = 0;
  const taxType = invoice.taxType || 'percentage';
  const taxValue = parseFloat(invoice.taxValue || invoice.taxRate || invoice.tax || 0);

  if (itemWiseTaxSum > 0 && !invoice.taxValue && !invoice.taxRate && !invoice.tax) {
    taxAmount = itemWiseTaxSum;
  } else if (taxType === 'percentage') {
    taxAmount = (taxableAmount * taxValue) / 100;
  } else {
    taxAmount = taxValue;
  }

  const grandTotal = taxableAmount + taxAmount;
  const paidAmount = parseFloat(invoice.paidAmount || invoice.paid || 0);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  return {
    grossAmount: r(grossAmount),
    discountAmount: r(discountAmount),
    taxableAmount: r(taxableAmount),
    taxAmount: r(taxAmount),
    grandTotal: r(grandTotal),
    paidAmount: r(paidAmount),
    dueAmount: r(dueAmount),
    discountValue,
    taxValue: taxValue || (taxableAmount > 0 ? (taxAmount / taxableAmount) * 100 : 0)
  };
};
