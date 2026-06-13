/**
 * Centralized billing calculation logic for the backend.
 * Replicates the frontend logic exactly to ensure data integrity.
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

  const r = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  // If the invoice is already saved in the database, respect and use the saved totals directly
  if (invoice._id || invoice.billId) {
    const gross = parseFloat(invoice.grossAmount !== undefined ? invoice.grossAmount : (invoice.subtotal !== undefined ? invoice.subtotal : (invoice.amount || 0)));
    const discountAmt = parseFloat(invoice.discountAmount !== undefined ? invoice.discountAmount : (invoice.discount || 0));
    const taxAmt = parseFloat(invoice.taxAmount || 0);
    const grand = parseFloat(invoice.amount || invoice.grandTotal || 0);
    let paidAmt = parseFloat(invoice.paidAmount !== undefined ? invoice.paidAmount : (invoice.paid || 0));
    
    if (invoice.installments && invoice.installments.length > 0) {
      paidAmt = invoice.installments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);
    } else if (invoice.status === 'Paid' && paidAmt === 0 && grand > 0) {
      paidAmt = grand;
    }
    const dueAmt = Math.max(0, grand - paidAmt);
    const taxable = Math.max(0, gross - discountAmt);

    return {
      grossAmount: r(gross),
      discountAmount: r(discountAmt),
      taxableAmount: r(taxable),
      taxAmount: r(taxAmt),
      grandTotal: r(grand),
      paidAmount: r(paidAmt),
      dueAmount: r(dueAmt),
      discountValue: invoice.discountValue || invoice.discount || 0,
      taxValue: invoice.taxValue || (taxAmt > 0 && taxable > 0 ? (taxAmt / taxable) * 100 : 0)
    };
  }

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
  let paidAmount = parseFloat(invoice.paidAmount || invoice.paid || 0);
  
  if (invoice.installments && invoice.installments.length > 0) {
    paidAmount = invoice.installments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);
  } else if (invoice.status === 'Paid' && paidAmount === 0 && grandTotal > 0) {
    paidAmount = grandTotal;
  }
  
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
