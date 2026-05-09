export const round2 = (num = 0) => {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
};

export const calculatePharmacyInvoice = (items = [], payment = {}) => {
  let grossAmount = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let taxAmount = 0;

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity || item.qty || 1);
    const rate = Number(item.unitPrice || item.sellingPrice || item.rate || item.price || item.mrp || 0);
    const discountPercent = Number(item.discountPercentage ?? item.discountPercent ?? item.discount ?? item.discPercent ?? 0);
    const gstPercent = Number(item.gstPercentage ?? item.gstPercent ?? item.gst ?? item.taxPercent ?? 0);

    const itemGross = round2(rate * quantity);
    const itemDiscountAmount = round2((itemGross * discountPercent) / 100);
    const itemTaxableAmount = round2(itemGross - itemDiscountAmount);
    const itemGstAmount = round2((itemTaxableAmount * gstPercent) / 100);
    const itemTotalAmount = round2(itemTaxableAmount + itemGstAmount);

    grossAmount += itemGross;
    discountAmount += itemDiscountAmount;
    taxableAmount += itemTaxableAmount;
    taxAmount += itemGstAmount;

    return {
      ...item,
      quantity,
      rate,
      discountPercent,
      gstPercent,
      grossAmount: itemGross,
      discountAmount: itemDiscountAmount,
      taxableAmount: itemTaxableAmount,
      gstAmount: itemGstAmount,
      taxAmount: itemGstAmount,
      totalAmount: itemTotalAmount,
      finalAmount: itemTotalAmount,
    };
  });

  grossAmount = round2(grossAmount);
  discountAmount = round2(discountAmount);
  taxableAmount = round2(taxableAmount);
  taxAmount = round2(taxAmount);

  const grandTotal = round2(taxableAmount + taxAmount);

  const paymentMode = payment.paymentMode || payment.mode || "Cash";

  let paidAmount;

  if (["cash", "upi", "card"].includes(String(paymentMode).toLowerCase())) {
    paidAmount = grandTotal;
  } else {
    paidAmount = round2(payment.paidAmount || 0);
  }

  const dueAmount = round2(Math.max(grandTotal - paidAmount, 0));

  return {
    items: calculatedItems,

    grossAmount,
    subtotal: grossAmount,
    billedAmount: grossAmount,

    discountAmount,

    taxableAmount,

    taxAmount,
    gstAmount: taxAmount,

    grandTotal,
    netAmount: grandTotal,
    totalAmount: grandTotal,
    finalAmount: grandTotal,
    payableAmount: grandTotal,

    paidAmount,
    dueAmount,
    paymentMode,
  };
};
