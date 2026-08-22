import DentalEquipmentExpense from '../models/DentalEquipmentExpense.js';
import DentalConsumerProductExpense from '../models/DentalConsumerProductExpense.js';
import DentalLabExpense from '../models/DentalLabExpense.js';
import ExpenseRecord from '../models/ExpenseRecord.js';
import Organization from '../models/Organization.js';
import OtherExpense from '../models/OtherExpense.js';
import Billing from '../models/Billing.js';
import { generateExpenseReportPDF } from '../services/pdfService.js';
import { resolveS3UrlIfNeeded, deleteFileFromS3 } from '../services/s3Service.js';
import mongoose from 'mongoose';

// Helper to construct date filters
const getDateFilter = (filterType, startDate, endDate, dateField) => {
  const query = {};
  if (!filterType || filterType === 'all') return query;

  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (filterType) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      query[dateField] = { $gte: start, $lte: end };
      break;
    case 'yesterday':
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const yStart = new Date(yesterday);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yesterday);
      yEnd.setHours(23, 59, 59, 999);
      query[dateField] = { $gte: yStart, $lte: yEnd };
      break;
    case 'week':
      const day = now.getDay();
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      query[dateField] = { $gte: start, $lte: end };
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query[dateField] = { $gte: start, $lte: end };
      break;
    case 'lastMonth':
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      query[dateField] = { $gte: lmStart, $lte: lmEnd };
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      query[dateField] = { $gte: start, $lte: end };
      break;
    case 'custom':
      if (startDate && endDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query[dateField] = { $gte: s, $lte: e };
      }
      break;
  }
  return query;
};

// ==========================================
// 1. DENTAL EQUIPMENT EXPENSES
// ==========================================

export const createEquipmentExpense = async (req, res) => {
  try {
    const {
      equipmentName,
      brand,
      modelNumber,
      vendor,
      purchaseDate,
      invoiceNumber,
      warrantyExpiryDate,
      quantity,
      unitPrice,
      gstAmount,
      paymentMethod,
      paymentStatus,
      notes,
      invoiceUrl,
      invoicePublicId
    } = req.body;

    if (!equipmentName || !purchaseDate || !quantity || unitPrice === undefined) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const calculatedTotal = (Number(quantity) * Number(unitPrice)) + Number(gstAmount || 0);

    const expense = new DentalEquipmentExpense({
      organizationId: req.tenantId,
      equipmentName,
      brand,
      modelNumber,
      vendor,
      purchaseDate,
      invoiceNumber,
      warrantyExpiryDate,
      quantity,
      unitPrice,
      gstAmount,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentStatus,
      notes,
      invoiceUrl,
      invoicePublicId,
      createdBy: req.user.id
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEquipmentExpenses = async (req, res) => {
  try {
    const { search, filterType, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = { organizationId: req.tenantId };

    if (search) {
      query.equipmentName = { $regex: search, $options: 'i' };
    }

    const dateFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    Object.assign(query, dateFilter);

    const expenses = await DentalEquipmentExpense.find(query)
      .sort({ purchaseDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await DentalEquipmentExpense.countDocuments(query);

    res.json({
      expenses,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEquipmentExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.quantity !== undefined && updateData.unitPrice !== undefined) {
      updateData.totalAmount = (Number(updateData.quantity) * Number(updateData.unitPrice)) + Number(updateData.gstAmount || 0);
    }

    const expense = await DentalEquipmentExpense.findOneAndUpdate(
      { _id: id, organizationId: req.tenantId },
      updateData,
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEquipmentExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await DentalEquipmentExpense.findOneAndDelete({ _id: id, organizationId: req.tenantId });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportEquipmentExpensesPDF = async (req, res) => {
  try {
    const { search, filterType, startDate, endDate } = req.query;
    const query = { organizationId: req.tenantId };

    if (search) {
      query.equipmentName = { $regex: search, $options: 'i' };
    }

    const dateFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    Object.assign(query, dateFilter);

    const expenses = await DentalEquipmentExpense.find(query).sort({ purchaseDate: -1 });
    const org = await Organization.findById(req.tenantId);

    const pdfBuffer = await generateExpenseReportPDF(expenses, 'Dental Equipment Expenses', org);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Dental_Equipment_Expenses_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 2. DENTAL CONSUMABLE PRODUCTS
// ==========================================

export const createConsumerProductExpense = async (req, res) => {
  try {
    const {
      productName,
      category,
      brand,
      vendor,
      supplier,
      expiryDate,
      batchNumber,
      quantity,
      quantityPurchased,
      unit,
      unitPrice,
      gstAmount,
      purchaseDate,
      paymentMethod,
      paymentStatus,
      notes,
      invoiceUrl,
      invoicePublicId
    } = req.body;

    const actualQty = Number(quantityPurchased !== undefined ? quantityPurchased : (quantity !== undefined ? quantity : 1));
    const actualSupplier = supplier || vendor || '';

    if (!productName || !purchaseDate || actualQty === undefined || unitPrice === undefined) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const calculatedTotal = (actualQty * Number(unitPrice)) + Number(gstAmount || 0);

    const expense = new DentalConsumerProductExpense({
      organizationId: req.tenantId,
      productName,
      category,
      brand,
      vendor: actualSupplier,
      supplier: actualSupplier,
      batchNumber,
      expiryDate,
      quantity: actualQty,
      quantityPurchased: actualQty,
      unit,
      unitPrice,
      gstAmount,
      totalAmount: calculatedTotal,
      purchaseDate,
      paymentMethod,
      paymentStatus,
      notes,
      invoiceUrl,
      invoicePublicId,
      createdBy: req.user.id
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getConsumerProductExpenses = async (req, res) => {
  try {
    const { search, filterType, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = { organizationId: req.tenantId };

    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }

    const dateFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    Object.assign(query, dateFilter);

    const expenses = await DentalConsumerProductExpense.find(query)
      .sort({ purchaseDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await DentalConsumerProductExpense.countDocuments(query);

    res.json({
      expenses,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConsumerProductExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const qtyVal = updateData.quantityPurchased !== undefined ? updateData.quantityPurchased : updateData.quantity;
    if (qtyVal !== undefined) {
      updateData.quantity = Number(qtyVal);
      updateData.quantityPurchased = Number(qtyVal);
    }
    if (updateData.supplier) {
      updateData.vendor = updateData.supplier;
    } else if (updateData.vendor) {
      updateData.supplier = updateData.vendor;
    }

    if (updateData.quantity !== undefined && updateData.unitPrice !== undefined) {
      updateData.totalAmount = (Number(updateData.quantity) * Number(updateData.unitPrice)) + Number(updateData.gstAmount || 0);
    }

    const expense = await DentalConsumerProductExpense.findOneAndUpdate(
      { _id: id, organizationId: req.tenantId },
      updateData,
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteConsumerProductExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await DentalConsumerProductExpense.findOneAndDelete({ _id: id, organizationId: req.tenantId });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportConsumerProductExpensesPDF = async (req, res) => {
  try {
    const { search, filterType, startDate, endDate } = req.query;
    const query = { organizationId: req.tenantId };

    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }

    const dateFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    Object.assign(query, dateFilter);

    const expenses = await DentalConsumerProductExpense.find(query).sort({ purchaseDate: -1 });
    const org = await Organization.findById(req.tenantId);

    const pdfBuffer = await generateExpenseReportPDF(expenses, 'Dental Consumer Product Expenses', org);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Dental_Consumer_Product_Expenses_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 3. DENTAL LAB EXPENSES
// ==========================================

export const createLabExpense = async (req, res) => {
  try {
    const {
      labName,
      labTechnician,
      patientName,
      patientId,
      doctorName,
      caseNumber,
      workType,
      treatmentType,
      workDescription,
      sentDate,
      expectedDeliveryDate,
      receivedDate,
      quantity,
      cost,
      labCharges,
      gstAmount,
      paymentMethod,
      paymentStatus,
      paymentDate,
      notes,
      invoiceUrl,
      invoicePublicId
    } = req.body;

    const actualCharges = Number(labCharges !== undefined ? labCharges : (cost !== undefined ? cost : 0));
    const actualQty = Number(quantity !== undefined ? quantity : 1);

    if (!labName || actualCharges === undefined) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const calculatedTotal = (actualQty * actualCharges) + Number(gstAmount || 0);

    const expense = new DentalLabExpense({
      organizationId: req.tenantId,
      labName,
      labTechnician,
      patientName,
      patientId,
      doctorName,
      caseNumber,
      workType: workType || treatmentType || '',
      treatmentType,
      workDescription,
      sentDate,
      expectedDeliveryDate,
      receivedDate,
      quantity: actualQty,
      cost: actualCharges,
      labCharges: actualCharges,
      gstAmount,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentStatus,
      paymentDate,
      notes,
      invoiceUrl,
      invoicePublicId,
      createdBy: req.user.id
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLabExpenses = async (req, res) => {
  try {
    const { search, filterType, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = { organizationId: req.tenantId };

    if (search) {
      query.$or = [
        { labName: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } }
      ];
    }

    const dateFilter = getDateFilter(filterType, startDate, endDate, 'sentDate');
    Object.assign(query, dateFilter);

    const expenses = await DentalLabExpense.find(query)
      .sort({ sentDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await DentalLabExpense.countDocuments(query);

    res.json({
      expenses,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLabExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const chargesVal = updateData.labCharges !== undefined ? updateData.labCharges : updateData.cost;
    if (chargesVal !== undefined) {
      updateData.cost = Number(chargesVal);
      updateData.labCharges = Number(chargesVal);
    }
    const qtyVal = updateData.quantity !== undefined ? updateData.quantity : 1;

    if (chargesVal !== undefined) {
      updateData.totalAmount = (Number(qtyVal) * Number(chargesVal)) + Number(updateData.gstAmount || 0);
    }

    if (updateData.treatmentType && !updateData.workType) {
      updateData.workType = updateData.treatmentType;
    }

    const expense = await DentalLabExpense.findOneAndUpdate(
      { _id: id, organizationId: req.tenantId },
      updateData,
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLabExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await DentalLabExpense.findOneAndDelete({ _id: id, organizationId: req.tenantId });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportLabExpensesPDF = async (req, res) => {
  try {
    const { search, filterType, startDate, endDate } = req.query;
    const query = { organizationId: req.tenantId };

    if (search) {
      query.$or = [
        { labName: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } }
      ];
    }

    const dateFilter = getDateFilter(filterType, startDate, endDate, 'sentDate');
    Object.assign(query, dateFilter);

    const expenses = await DentalLabExpense.find(query).sort({ sentDate: -1 });
    const org = await Organization.findById(req.tenantId);

    const pdfBuffer = await generateExpenseReportPDF(expenses, 'Dental Lab Expenses', org);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Dental_Lab_Expenses_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 3.1 OTHER CLINIC EXPENSES
// ==========================================

export const createOtherExpense = async (req, res) => {
  try {
    const {
      expenseName,
      category,
      vendor,
      purchaseDate,
      invoiceNumber,
      quantity,
      unitPrice,
      gstAmount,
      paymentMethod,
      paymentStatus,
      notes,
      invoiceUrl,
      invoicePublicId
    } = req.body;

    if (!expenseName || !purchaseDate || !quantity || unitPrice === undefined) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const calculatedTotal = (Number(quantity) * Number(unitPrice)) + Number(gstAmount || 0);

    const expense = new OtherExpense({
      organizationId: req.tenantId,
      expenseName,
      category: category || 'Other',
      vendor,
      purchaseDate,
      invoiceNumber,
      quantity,
      unitPrice,
      gstAmount,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentStatus,
      notes,
      invoiceUrl,
      invoicePublicId,
      createdBy: req.user.id
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOtherExpenses = async (req, res) => {
  try {
    const { search, filterType, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = { organizationId: req.tenantId };

    if (search) {
      query.$or = [
        { expenseName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const dateFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    Object.assign(query, dateFilter);

    const expenses = await OtherExpense.find(query)
      .sort({ purchaseDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await OtherExpense.countDocuments(query);

    res.json({
      expenses,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOtherExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.quantity !== undefined && updateData.unitPrice !== undefined) {
      updateData.totalAmount = (Number(updateData.quantity) * Number(updateData.unitPrice)) + Number(updateData.gstAmount || 0);
    }

    const expense = await OtherExpense.findOneAndUpdate(
      { _id: id, organizationId: req.tenantId },
      updateData,
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteOtherExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await OtherExpense.findOneAndDelete({ _id: id, organizationId: req.tenantId });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportOtherExpensesPDF = async (req, res) => {
  try {
    const { search, filterType, startDate, endDate } = req.query;
    const query = { organizationId: req.tenantId };

    if (search) {
      query.$or = [
        { expenseName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const dateFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    Object.assign(query, dateFilter);

    const expenses = await OtherExpense.find(query).sort({ purchaseDate: -1 });
    const org = await Organization.findById(req.tenantId);

    const pdfBuffer = await generateExpenseReportPDF(expenses, 'More Expenses', org);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=More_Expenses_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 4. GENERAL EXPENSE FILE / IMAGE RECORDS
// ==========================================

export const uploadExpenseRecord = async (req, res) => {
  try {
    const { recordName, expenseType, fileUrl, fileKey } = req.body;
    if (!recordName || !expenseType || !fileUrl || !fileKey) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const record = new ExpenseRecord({
      organizationId: req.tenantId,
      expenseType,
      recordName,
      fileUrl,
      fileKey,
      uploadedBy: req.user.id
    });

    await record.save();

    // Resolve S3 signed URL right away
    const freshUrl = await resolveS3UrlIfNeeded(record.fileUrl);
    const responseRecord = record.toObject();
    responseRecord.fileUrl = freshUrl;

    res.status(201).json(responseRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpenseRecords = async (req, res) => {
  try {
    const { expenseType, search } = req.query;
    if (!expenseType) {
      return res.status(400).json({ message: 'Expense type is required.' });
    }

    const query = {
      organizationId: req.tenantId,
      expenseType
    };

    if (search) {
      query.recordName = { $regex: search, $options: 'i' };
    }

    const records = await ExpenseRecord.find(query).sort({ createdAt: -1 });

    // Renew S3 signed URLs
    const resolvedRecords = await Promise.all(records.map(async (rec) => {
      const freshUrl = await resolveS3UrlIfNeeded(rec.fileUrl);
      const recObj = rec.toObject();
      recObj.fileUrl = freshUrl;
      return recObj;
    }));

    res.json(resolvedRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExpenseRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await ExpenseRecord.findOne({ _id: id, organizationId: req.tenantId });
    if (!record) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    if (record.fileKey) {
      try {
        await deleteFileFromS3(record.fileKey);
      } catch (s3Err) {
        console.warn(`S3 delete failed for key ${record.fileKey}:`, s3Err.message);
      }
    }

    await ExpenseRecord.deleteOne({ _id: id });
    res.json({ message: 'Record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpenseDashboardStats = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.tenantId);

    // 1. Total Revenue (sum of paidAmount in Bills)
    const revenueResult = await Billing.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // 2. Dental Equipment Expenses
    const equipmentResult = await DentalEquipmentExpense.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const equipmentExpenses = equipmentResult[0]?.total || 0;

    // 3. Dental Consumer Product Expenses
    const consumerResult = await DentalConsumerProductExpense.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const consumerExpenses = consumerResult[0]?.total || 0;

    // 4. Dental Lab Expenses
    const labResult = await DentalLabExpense.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const labExpenses = labResult[0]?.total || 0;

    // 4.1 Other / More Expenses
    const otherResult = await OtherExpense.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const otherExpenses = otherResult[0]?.total || 0;

    // 5. Total Expenses & Net Profit
    const totalExpenses = equipmentExpenses + consumerExpenses + labExpenses + otherExpenses;
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      totalRevenue,
      equipmentExpenses,
      consumerExpenses,
      labExpenses,
      otherExpenses,
      totalExpenses,
      netProfit
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnifiedExpenses = async (req, res) => {
  try {
    const { filterType, startDate, endDate } = req.query;
    const query = { organizationId: req.tenantId };

    const eqFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    const consFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    const labFilter = getDateFilter(filterType, startDate, endDate, 'sentDate');

    const otherFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');

    const [eqRes, consRes, labRes, otherRes] = await Promise.all([
      DentalEquipmentExpense.find({ ...query, ...eqFilter }).lean(),
      DentalConsumerProductExpense.find({ ...query, ...consFilter }).lean(),
      DentalLabExpense.find({ ...query, ...labFilter }).lean(),
      OtherExpense.find({ ...query, ...otherFilter }).lean()
    ]);

    const equipment = eqRes.map(e => ({ ...e, expenseType: 'Equipment' }));
    const consumer = consRes.map(e => ({ ...e, expenseType: 'Consumer Products' }));
    const lab = labRes.map(e => ({ ...e, expenseType: 'Lab Expenses' }));
    const other = otherRes.map(e => ({ ...e, expenseType: 'More Expenses' }));

    const allExpenses = [...equipment, ...consumer, ...lab, ...other];
    // Sort descending by date
    allExpenses.sort((a, b) => {
      const dateA = new Date(a.purchaseDate || a.sentDate || a.createdAt);
      const dateB = new Date(b.purchaseDate || b.sentDate || b.createdAt);
      return dateB - dateA;
    });

    const summary = {
      equipmentTotal: equipment.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
      consumerTotal: consumer.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
      labTotal: lab.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
      otherTotal: other.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
      grandTotal: allExpenses.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
    };

    res.json({
      expenses: allExpenses,
      summary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportUnifiedExpensesPDF = async (req, res) => {
  try {
    const { filterType, startDate, endDate } = req.query;
    const query = { organizationId: req.tenantId };

    const eqFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    const consFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    const labFilter = getDateFilter(filterType, startDate, endDate, 'sentDate');

    const otherFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');

    const [eqRes, consRes, labRes, otherRes] = await Promise.all([
      DentalEquipmentExpense.find({ ...query, ...eqFilter }).lean(),
      DentalConsumerProductExpense.find({ ...query, ...consFilter }).lean(),
      DentalLabExpense.find({ ...query, ...labFilter }).lean(),
      OtherExpense.find({ ...query, ...otherFilter }).lean()
    ]);

    const equipment = eqRes.map(e => ({ ...e, expenseType: 'Equipment' }));
    const consumer = consRes.map(e => ({ ...e, expenseType: 'Consumer Products' }));
    const lab = labRes.map(e => ({ ...e, expenseType: 'Lab Expenses' }));
    const other = otherRes.map(e => ({ ...e, expenseType: 'More Expenses' }));

    const allExpenses = [...equipment, ...consumer, ...lab, ...other];
    // Sort descending by date
    allExpenses.sort((a, b) => {
      const dateA = new Date(a.purchaseDate || a.sentDate || a.createdAt);
      const dateB = new Date(b.purchaseDate || b.sentDate || b.createdAt);
      return dateB - dateA;
    });

    const org = await Organization.findById(req.tenantId);

    const pdfBuffer = await generateExpenseReportPDF(allExpenses, 'Unified Expense Reports', org);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Unified_Expense_Reports_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpenseAnalytics = async (req, res) => {
  try {
    const { filterType, startDate, endDate } = req.query;
    const orgId = new mongoose.Types.ObjectId(req.tenantId);

    // Determine interval: 'day' or 'month'
    let interval = 'month';
    if (filterType === 'today' || filterType === 'yesterday' || filterType === 'week') {
      interval = 'day';
    } else if (filterType === 'custom' && startDate && endDate) {
      const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 31) {
        interval = 'day';
      }
    }

    // Get matching date filters
    const eqFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    const consFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');
    const labFilter = getDateFilter(filterType, startDate, endDate, 'sentDate');
    const billFilter = getDateFilter(filterType, startDate, endDate, 'date');
    const otherFilter = getDateFilter(filterType, startDate, endDate, 'purchaseDate');

    const groupOid = interval === 'day' 
      ? {
          year: { $year: { $ifNull: ['$date', '$createdAt'] } },
          month: { $month: { $ifNull: ['$date', '$createdAt'] } },
          day: { $dayOfMonth: { $ifNull: ['$date', '$createdAt'] } }
        }
      : {
          year: { $year: { $ifNull: ['$date', '$createdAt'] } },
          month: { $month: { $ifNull: ['$date', '$createdAt'] } }
        };

    const eqGroupOid = interval === 'day'
      ? {
          year: { $year: { $ifNull: ['$purchaseDate', '$createdAt'] } },
          month: { $month: { $ifNull: ['$purchaseDate', '$createdAt'] } },
          day: { $dayOfMonth: { $ifNull: ['$purchaseDate', '$createdAt'] } }
        }
      : {
          year: { $year: { $ifNull: ['$purchaseDate', '$createdAt'] } },
          month: { $month: { $ifNull: ['$purchaseDate', '$createdAt'] } }
        };

    const labGroupOid = interval === 'day'
      ? {
          year: { $year: { $ifNull: ['$sentDate', '$createdAt'] } },
          month: { $month: { $ifNull: ['$sentDate', '$createdAt'] } },
          day: { $dayOfMonth: { $ifNull: ['$sentDate', '$createdAt'] } }
        }
      : {
          year: { $year: { $ifNull: ['$sentDate', '$createdAt'] } },
          month: { $month: { $ifNull: ['$sentDate', '$createdAt'] } }
        };

    // Revenue
    const revenueData = await Billing.aggregate([
      { $match: { organizationId: orgId, ...billFilter } },
      { $group: { _id: groupOid, total: { $sum: '$paidAmount' } } }
    ]);

    // Equipment
    const equipmentData = await DentalEquipmentExpense.aggregate([
      { $match: { organizationId: orgId, ...eqFilter } },
      { $group: { _id: eqGroupOid, total: { $sum: '$totalAmount' } } }
    ]);

    // Consumer Products
    const consumerData = await DentalConsumerProductExpense.aggregate([
      { $match: { organizationId: orgId, ...consFilter } },
      { $group: { _id: eqGroupOid, total: { $sum: '$totalAmount' } } }
    ]);

    // Lab Expenses
    const labData = await DentalLabExpense.aggregate([
      { $match: { organizationId: orgId, ...labFilter } },
      { $group: { _id: labGroupOid, total: { $sum: '$totalAmount' } } }
    ]);

    // Other Expenses
    const otherData = await OtherExpense.aggregate([
      { $match: { organizationId: orgId, ...otherFilter } },
      { $group: { _id: eqGroupOid, total: { $sum: '$totalAmount' } } }
    ]);

    const timelineMap = {};

    const addToMap = (year, month, day, field, amount) => {
      if (!year || !month) return;
      const key = interval === 'day'
        ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        : `${year}-${String(month).padStart(2, '0')}`;

      if (!timelineMap[key]) {
        const dateObj = interval === 'day' ? new Date(year, month - 1, day) : new Date(year, month - 1);
        const name = interval === 'day'
          ? dateObj.toLocaleString('default', { day: '2-digit', month: 'short' })
          : dateObj.toLocaleString('default', { month: 'short' }) + ' ' + year;

        timelineMap[key] = {
          key,
          name,
          revenue: 0,
          equipment: 0,
          consumer: 0,
          lab: 0,
          other: 0,
          totalExpenses: 0,
          netProfit: 0
        };
      }
      timelineMap[key][field] = amount;
    };

    revenueData.forEach(item => addToMap(item._id.year, item._id.month, item._id.day, 'revenue', item.total));
    equipmentData.forEach(item => addToMap(item._id.year, item._id.month, item._id.day, 'equipment', item.total));
    consumerData.forEach(item => addToMap(item._id.year, item._id.month, item._id.day, 'consumer', item.total));
    labData.forEach(item => addToMap(item._id.year, item._id.month, item._id.day, 'lab', item.total));
    otherData.forEach(item => addToMap(item._id.year, item._id.month, item._id.day, 'other', item.total));

    const result = Object.values(timelineMap).map(item => {
      item.totalExpenses = item.equipment + item.consumer + item.lab + item.other;
      item.netProfit = item.revenue - item.totalExpenses;
      return item;
    });

    result.sort((a, b) => a.key.localeCompare(b.key));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
