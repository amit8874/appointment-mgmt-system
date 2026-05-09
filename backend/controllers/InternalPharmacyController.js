import mongoose from 'mongoose';
import Medicine from '../models/Medicine.js';
import MedicineBatch from '../models/MedicineBatch.js';
import Supplier from '../models/Supplier.js';
import Manufacturer from '../models/Manufacturer.js';
import Purchase from '../models/Purchase.js';
import PurchaseItem from '../models/PurchaseItem.js';
import StockTransaction from '../models/StockTransaction.js';
import StockAdjustment from '../models/StockAdjustment.js';
import Billing from '../models/Billing.js';
import PharmacyBillItem from '../models/PharmacyBillItem.js';
import Counter from '../models/Counter.js';
import * as XLSX from 'xlsx';
import { calculatePharmacyInvoice } from '../utils/pharmacyInvoiceCalculator.js';

// --- Dashboard ---
export const getPharmacyDashboard = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique medicine IDs that have active batches in this organization
    const medicineIdsWithBatches = await MedicineBatch.distinct('medicineId', { organizationId, status: 'Active' });

    const [
      totalMedicinesCount,
      batches,
      lowStockMeds,
      todaySales,
      recentPurchases,
      recentBills
    ] = await Promise.all([
      Medicine.countDocuments({ 
        $or: [
          { organizationId },
          { organizationId: null },
          { organizationId: { $exists: false } },
          { _id: { $in: medicineIdsWithBatches } }
        ]
      }),
      MedicineBatch.find({ organizationId, status: 'Active' }),
      Medicine.find({ 
        $or: [
          { organizationId },
          { organizationId: null },
          { organizationId: { $exists: false } },
          { _id: { $in: medicineIdsWithBatches } }
        ]
      }).lean(),
      Billing.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), billType: 'Pharmacy', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Purchase.find({ organizationId }).sort({ createdAt: -1 }).limit(5),
      Billing.find({ organizationId, billType: 'Pharmacy' }).sort({ createdAt: -1 }).limit(5)
    ]);

    // Process batch data
    let totalStockQty = 0;
    let totalStockValue = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const batchStockMap = {}; // medicineId -> totalStock
    batches.forEach(batch => {
      const isExpired = batch.expiryDate < new Date();
      const isExpiringSoon = !isExpired && batch.expiryDate < ninetyDaysFromNow;
      
      if (isExpired) {
        expiredCount++;
      } else if (isExpiringSoon) {
        expiringSoonCount++;
      }

      // User requirement: Inventory total stock from non-expired active batches
      if (!isExpired && batch.status === 'Active') {
        totalStockQty += batch.stockQuantity;
        totalStockValue += (batch.stockQuantity * batch.purchasePrice);
        
        const medId = batch.medicineId.toString();
        batchStockMap[medId] = (batchStockMap[medId] || 0) + batch.stockQuantity;
      }
    });

    const lowStockItems = lowStockMeds.filter(med => {
      const stock = batchStockMap[med._id.toString()] || 0;
      return stock <= (med.minimumStockAlert || 10);
    });

    const outOfStockItems = lowStockMeds.filter(med => (batchStockMap[med._id.toString()] || 0) === 0);

    res.json({
      summary: {
        totalMedicines: totalMedicinesCount,
        totalStockQuantity: totalStockQty,
        totalStockValue,
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        expiringSoon: expiringSoonCount,
        expiredMedicines: expiredCount,
        todayPharmacySales: todaySales[0]?.total || 0
      },
      lowStockMedicines: lowStockItems,
      outOfStockMedicines: outOfStockItems,
      expiredMedicines: batches.filter(b => b.expiryDate < new Date()),
      expiringSoonMedicines: batches.filter(b => b.expiryDate > new Date() && b.expiryDate < ninetyDaysFromNow),
      recentPurchases,
      recentPharmacyBills: recentBills
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllMedicines = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const medicines = await Medicine.find({
      $or: [
        { organizationId },
        { organizationId: null },
        { organizationId: { $exists: false } }
      ]
    }).sort({ name: 1 }).lean();

    // Fetch the latest batch for each medicine to provide auto-fill defaults
    const medicinesWithLastBatch = await Promise.all(medicines.map(async (med) => {
      const lastBatch = await MedicineBatch.findOne({ organizationId, medicineId: med._id })
        .sort({ createdAt: -1 })
        .lean();
      
      return {
        ...med,
        lastBatchNo: lastBatch?.batchNo || '',
        lastMrp: lastBatch?.mrp || 0,
        lastPurchasePrice: lastBatch?.purchasePrice || 0,
        lastSellingPrice: lastBatch?.sellingPrice || 0,
        lastExpiryDate: lastBatch?.expiryDate ? new Date(lastBatch.expiryDate).toISOString().split('T')[0] : ''
      };
    }));

    res.json(medicinesWithLastBatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Inventory ---
export const getFullInventory = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { search, manufacturer, type, category, stockStatus, expiryStatus } = req.query;

    // Defensive tenantId handling with validation
    let tenantIdObj = null;
    if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
      tenantIdObj = new mongoose.Types.ObjectId(organizationId);
    }

    const orgFilter = tenantIdObj || organizationId;

    // Get unique medicine IDs that have batches in this organization
    let medicineIdsWithBatches = [];
    try {
      medicineIdsWithBatches = await MedicineBatch.distinct('medicineId', { organizationId: orgFilter });
    } catch (e) {
      console.error('Error fetching batches:', e);
    }

    // BROAD visibility filter to catch ALL medicines the user should see
    const visibilityFilter = {
      $or: [
        { organizationId: orgFilter },
        { organizationId: null },
        { organizationId: { $exists: false } },
        { _id: { $in: medicineIdsWithBatches } }
      ]
    };

    let query = visibilityFilter;
    console.log('Pharmacy Inventory Query:', JSON.stringify(query));

    if (search) {
      query = {
        $and: [
          visibilityFilter,
          {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { genericName: { $regex: search, $options: 'i' } },
              { manufacturer: { $regex: search, $options: 'i' } },
              { category: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }
    
    // Explicitly add organizationId to query if we are filtering by it
    // but the visibility filter already covers it.

    if (manufacturer) query.manufacturer = manufacturer;
    if (type) query.type = type;
    if (category) query.category = category;

    const medicines = await Medicine.find(query).lean();
    console.log(`Found ${medicines.length} medicines for query`);
    const medIds = medicines.map(m => m._id);

    const batches = await MedicineBatch.find({ organizationId: orgFilter, medicineId: { $in: medIds } }).lean();
    console.log(`Found ${batches.length} batches for those medicines`);

    const result = medicines.map(med => {
      const medBatches = batches.filter(b => b.medicineId.toString() === med._id.toString());
      // User requirement: Inventory total stock from non-expired active batches
      const sellableBatches = medBatches.filter(b => b.status === 'Active' && b.expiryDate > new Date());
      const totalStock = sellableBatches.reduce((acc, b) => acc + b.stockQuantity, 0);
      
      let status = 'In Stock';
      if (totalStock === 0) status = 'Out of Stock';
      else if (totalStock <= med.minimumStockAlert) status = 'Low Stock';

      let expiryStatusText = 'Valid';
      if (medBatches.some(b => b.expiryDate < new Date())) expiryStatusText = 'Expired';
      else if (medBatches.some(b => {
        const soon = new Date();
        soon.setDate(soon.getDate() + 90);
        return b.expiryDate < soon;
      })) expiryStatusText = 'Expiring Soon';

      return {
        ...med,
        totalStock,
        batchCount: medBatches.length,
        mrp: medBatches[0]?.mrp || 0,
        purchasePrice: medBatches[0]?.purchasePrice || 0,
        sellingPrice: medBatches[0]?.sellingPrice || 0,
        stockStatus: status,
        expiryStatus: expiryStatusText
      };
    });

    // Apply post-fetch filters for stockStatus and expiryStatus if needed
    let filteredResult = result;
    if (stockStatus) filteredResult = filteredResult.filter(r => r.stockStatus === stockStatus);
    if (expiryStatus) filteredResult = filteredResult.filter(r => r.expiryStatus === expiryStatus);

    res.json(filteredResult);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Medicine CRUD ---
export const addMedicine = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { name } = req.body;

    const existing = await Medicine.findOne({ organizationId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Medicine with this name already exists in your pharmacy.' });
    }

    const medicine = new Medicine({ ...req.body, organizationId });
    await medicine.save();
    res.status(201).json(medicine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findOneAndUpdate(
      { _id: id, organizationId: req.tenantId },
      req.body,
      { new: true }
    );
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Bulk Upload ---
export const bulkUploadMedicines = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { preview } = req.query;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const results = { added: 0, updated: 0, errors: [], previewRows: [] };

    for (const row of data) {
      try {
        const name = row['Medicine Name'] || row['name'];
        if (!name) {
          results.errors.push({ name: 'Unknown', error: 'Missing Medicine Name' });
          continue;
        }

        // Search within the organization since the global unique index is now removed
        const existing = await Medicine.findOne({ organizationId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
        
        if (preview === 'true') {
          results.previewRows.push({
            ...row,
            name,
            isDuplicate: !!existing,
            isValid: true,
            status: existing ? 'Update' : 'New'
          });
          continue;
        }

        let med;
        const medicineUpdateData = {
          name: name,
          genericName: row['Generic Name'] || row['genericName'],
          manufacturer: row['Manufacturer'] || row['manufacturer'],
          category: row['Category'] || row['category'],
          type: row['Type'] || row['type'],
          dose: row['Dose'] || row['dose'],
          packSize: row['Pack Size'] || row['packSize'],
          unit: row['Unit'] || row['unit'],
          hsnCode: row['HSN Code'] || row['hsnCode'],
          gstPercentage: row['GST %'] || row['gstPercentage'] || 0,
          minimumStockAlert: row['Minimum Stock Alert'] || row['minimumStockAlert'] || 10
        };

        if (existing) {
          med = await Medicine.findByIdAndUpdate(existing._id, medicineUpdateData, { new: true });
          results.updated++;
        } else {
          med = new Medicine({ ...medicineUpdateData, organizationId });
          await med.save();
          results.added++;
        }

        // Handle Opening Stock if provided
        const batchNo = row['Batch No'] || row['batchNo'];
        const openingStock = row['Opening Stock'] || row['stockQuantity'];
        if (openingStock && batchNo) {
          // Check if this batch already exists for this medicine in this organization
          let batch = await MedicineBatch.findOne({
            organizationId,
            medicineId: med._id,
            batchNo: String(batchNo)
          });

          if (batch) {
            // Update existing batch stock
            batch.stockQuantity += Number(openingStock);
            batch.initialStock += Number(openingStock);
            await batch.save();
            
            await StockTransaction.create({
              organizationId,
              medicineId: med._id,
              batchId: batch._id,
              transactionType: 'Opening Stock Added',
              quantity: Number(openingStock),
              date: new Date()
            });
          } else {
            // Create new batch
            batch = new MedicineBatch({
              organizationId,
              medicineId: med._id,
              batchNo: String(batchNo),
              expiryDate: row['Expiry Date'] ? new Date(row['Expiry Date']) : new Date(),
              mrp: row['MRP'] || 0,
              purchasePrice: row['Purchase Price'] || 0,
              sellingPrice: row['Selling Price'] || 0,
              stockQuantity: Number(openingStock),
              initialStock: Number(openingStock),
              status: 'Active'
            });
            await batch.save();

            await StockTransaction.create({
              organizationId,
              medicineId: med._id,
              batchId: batch._id,
              transactionType: 'Opening Stock Added',
              quantity: Number(openingStock),
              date: new Date()
            });
          }
        }
      } catch (e) {
        results.errors.push({ name: row['Medicine Name'], error: e.message });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Opening Stock ---
export const addOpeningStock = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { medicineId, batches } = req.body;

    for (const b of batches) {
      const newBatch = new MedicineBatch({
        ...b,
        organizationId,
        medicineId,
        initialStock: b.stockQuantity,
        status: 'Active'
      });
      await newBatch.save();

      await StockTransaction.create({
        organizationId,
        medicineId,
        batchId: newBatch._id,
        transactionType: 'Opening Stock Added',
        quantity: b.stockQuantity,
        date: new Date()
      });
    }

    res.json({ message: 'Opening stock added successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Purchase ---
export const createPurchase = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { supplierId, items, ...purchaseData } = req.body;

    const purchase = new Purchase({
      ...purchaseData,
      organizationId,
      supplierId
    });
    await purchase.save();

    for (const item of items) {
      const pItem = new PurchaseItem({
        ...item,
        organizationId,
        purchaseId: purchase._id
      });
      await pItem.save();

      // Update or create batch
      let batch = await MedicineBatch.findOne({ 
        organizationId, 
        medicineId: item.medicineId, 
        batchNo: item.batchNo 
      });

      if (batch) {
        batch.stockQuantity += (item.quantity + (item.freeQuantity || 0));
        await batch.save();
      } else {
        batch = new MedicineBatch({
          organizationId,
          medicineId: item.medicineId,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
          mrp: item.mrp,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          stockQuantity: item.quantity + (item.freeQuantity || 0),
          initialStock: item.quantity + (item.freeQuantity || 0),
          supplierId
        });
        await batch.save();
      }

      await StockTransaction.create({
        organizationId,
        medicineId: item.medicineId,
        batchId: batch._id,
        transactionType: 'Purchase Stock Added',
        quantity: item.quantity + (item.freeQuantity || 0),
        referenceId: purchase._id,
        referenceType: 'Purchase',
        date: new Date()
      });
    }

    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Billing (Internal) ---
export const createPharmacyBill = async (req, res) => {
  try {
    const { items, ...billData } = req.body;
    const organizationId = req.tenantId;

    // Generate billId
    const counter = await Counter.findOneAndUpdate(
      { name: `billId_${organizationId}` },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const billId = `BIL${String(counter.value).padStart(6, '0')}`;

    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalTaxAmount = 0;

    const bill = new Billing({
      ...billData,
      billId,
      organizationId,
      billType: 'Pharmacy',
      items: [] 
    });

    for (const item of items) {
      const itemPrice = Number(item.sellingPrice || 0);
      const itemQty = Number(item.quantity || 1);
      const itemDiscPercent = Number(item.discountPercentage || 0);
      const itemGstPercent = Number(item.gstPercentage || 0);

      const itemGross = itemPrice * itemQty;
      const itemDisc = itemGross * (itemDiscPercent / 100);
      const itemTaxable = itemGross - itemDisc;
      const itemTax = itemTaxable * (itemGstPercent / 100);

      totalSubtotal += itemGross;
      totalDiscount += itemDisc;
      totalTaxAmount += itemTax;

      let remainingQty = item.quantity;
      
      const availableBatches = await MedicineBatch.find({
        organizationId,
        medicineId: item.medicineId,
        status: 'Active',
        expiryDate: { $gt: new Date() },
        stockQuantity: { $gt: 0 }
      }).sort({ expiryDate: 1 });

      const totalAvailable = availableBatches.reduce((acc, b) => acc + b.stockQuantity, 0);
      if (totalAvailable < item.quantity) {
        throw new Error(`Insufficient stock for ${item.medicineName || item.name || 'Medicine'}. Available: ${totalAvailable}, Requested: ${item.quantity}`);
      }

      for (const batch of availableBatches) {
        if (remainingQty <= 0) break;

        const takeFromBatch = Math.min(batch.stockQuantity, remainingQty);
        batch.stockQuantity -= takeFromBatch;
        await batch.save();

        const batchRatio = takeFromBatch / (item.quantity || 1);
        const batchGross = itemGross * batchRatio;
        const batchDisc = itemDisc * batchRatio;
        const batchTax = itemTax * batchRatio;
        const batchNet = batchGross - batchDisc + batchTax;

        const description = (item.medicineName && item.medicineName !== '-') ? String(item.medicineName) : (item.name && item.name !== '-') ? String(item.name) : 'Medicine';
        
        // Add to standard Billing items for Invoice Printing
        const billingItem = {
          description: description,
          medicineName: description, // Fallback for Pharmacy templates
          qty: Number(takeFromBatch) || 0,
          quantity: Number(takeFromBatch) || 0, // Fallback for Pharmacy templates
          unitPrice: Number(item.sellingPrice || 0),
          sellingPrice: Number(item.sellingPrice || 0), // Fallback for Pharmacy templates
          subtotal: Number(batchNet.toFixed(2)),
          totalAmount: Number(batchNet.toFixed(2)), // Fallback for Pharmacy templates
          tax: Number(itemGstPercent) || 0,
          batchNo: String(batch.batchNo || 'N/A'),
          expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-GB') : 'N/A',
          mrp: Number(batch.mrp) || 0,
          discountPercentage: Number(itemDiscPercent) || 0,
          gstPercentage: Number(itemGstPercent) || 0
        };
        
        bill.items.push(billingItem);

        const pItem = new PharmacyBillItem({
          ...item,
          medicineName: item.medicineName || item.name,
          organizationId,
          billId: bill._id,
          batchId: batch._id,
          batchNo: batch.batchNo,
          expiryDate: batch.expiryDate, // Use raw Date from DB
          quantity: takeFromBatch,
          totalAmount: Number(batchNet.toFixed(2))
        });
        await pItem.save();

        await StockTransaction.create({
          organizationId,
          medicineId: item.medicineId,
          batchId: batch._id,
          transactionType: 'Sale Stock Reduced',
          quantity: -takeFromBatch,
          referenceId: bill._id,
          referenceType: 'Bill',
          date: new Date()
        });

        remainingQty -= takeFromBatch;
      }
    }

    // Final Bill Totals using Centralized Pharmacy Utility
    const totals = calculatePharmacyInvoice(items, {
      method: billData.paymentMethod || 'Cash',
      isManualPaid: true,
      manualPaidAmount: Number(billData.paidAmount || 0)
    });

    bill.grossAmount = totals.grossAmount;
    bill.discountAmount = totals.discountAmount;
    bill.taxableAmount = totals.taxableAmount;
    bill.taxAmount = totals.taxAmount;
    bill.grandTotal = totals.grandTotal;
    
    // Explicit fields for the Oviaan Template to prevent mapping errors
    bill.totalAmount = totals.grossAmount; // In Oviaan template context, this is the Gross
    bill.netAmount = totals.grandTotal;    // In Oviaan template context, this is the Final
    bill.amount = totals.grandTotal;       // Standard fallback
    
    bill.paidAmount = totals.paidAmount;
    bill.dueAmount = totals.dueAmount;
    bill.status = totals.dueAmount > 0 ? (totals.paidAmount > 0 ? 'Partial' : 'Pending') : 'Paid';

    await bill.save();
    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Suppliers ---
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ organizationId: req.tenantId });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addSupplier = async (req, res) => {
  try {
    const supplier = new Supplier({ ...req.body, organizationId: req.tenantId });
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Reports ---
export const getPharmacyReports = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { type, startDate, endDate } = req.query;
    
    console.log(`BACKEND DEBUG: Generating ${type} | Start: ${startDate} | End: ${endDate} | Org: ${organizationId}`);

    const start = new Date(startDate || new Date(0));
    const end = new Date(endDate || new Date());
    end.setHours(23, 59, 59, 999);

    let data = [];
    if (type === 'Stock Report') {
      data = await MedicineBatch.find({ organizationId })
        .populate('medicineId', 'name genericName manufacturer')
        .sort({ createdAt: -1 });
    } else if (type === 'Sales Report') {
      data = await Billing.find({ 
        organizationId, 
        billType: 'Pharmacy', 
        date: { $gte: start, $lte: end } 
      }).populate('patientId', 'name phone').sort({ date: -1 });
    } else if (type === 'Purchase Report') {
      data = await Purchase.find({ 
        organizationId, 
        purchaseDate: { $gte: start, $lte: end } 
      }).populate('supplierId', 'name phone').sort({ purchaseDate: -1 });
    } else if (type === 'Expiry Report') {
      data = await MedicineBatch.find({ 
        organizationId, 
        expiryDate: { $lte: end } 
      }).populate('medicineId', 'name manufacturer').sort({ expiryDate: 1 });
    } else if (type === 'Low Stock Report') {
      const medicines = await Medicine.find({ organizationId }).lean();
      const medIds = medicines.map(m => m._id);
      const batches = await MedicineBatch.find({ organizationId, medicineId: { $in: medIds }, status: 'Active' }).lean();
      
      data = medicines.map(med => {
        const totalStock = batches.filter(b => b.medicineId.toString() === med._id.toString())
                                  .reduce((acc, b) => acc + b.stockQuantity, 0);
        return { ...med, totalStock };
      }).filter(med => med.totalStock <= (med.minimumStockAlert || 10));
    } else if (type === 'GST Report') {
      data = await PharmacyBillItem.find({
        organizationId,
        createdAt: { $gte: start, $lte: end }
      }).populate({
        path: 'billId',
        populate: { path: 'patientId', select: 'name' }
      }).populate('medicineId', 'name');
    } else if (type === 'Profit Report') {
      data = await StockTransaction.aggregate([
        { $match: { 
          organizationId: new mongoose.Types.ObjectId(organizationId), 
          transactionType: 'Sale Stock Reduced',
          date: { $gte: start, $lte: end }
        }},
        { $lookup: {
          from: 'medicinebatches',
          localField: 'batchId',
          foreignField: '_id',
          as: 'batch'
        }},
        { $unwind: '$batch' },
        { $lookup: {
          from: 'medicines',
          localField: 'medicineId',
          foreignField: '_id',
          as: 'medicine'
        }},
        { $unwind: '$medicine' },
        { $project: {
          medicineName: '$medicine.name',
          quantity: { $abs: '$quantity' },
          purchasePrice: '$batch.purchasePrice',
          sellingPrice: '$batch.sellingPrice',
          profit: { $multiply: [{ $abs: '$quantity' }, { $subtract: ['$batch.sellingPrice', '$batch.purchasePrice'] }] }
        }},
        { $group: {
          _id: '$medicineName',
          totalQuantity: { $sum: '$quantity' },
          totalProfit: { $sum: '$profit' },
          avgMargin: { $avg: { $subtract: ['$sellingPrice', '$purchasePrice'] } }
        }}
      ]);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const updatedSupplier = await Supplier.findOneAndUpdate(
      { _id: id, organizationId },
      req.body,
      { new: true }
    );
    if (!updatedSupplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(updatedSupplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    
    // Check if supplier has any purchases before deleting
    const hasPurchases = await Purchase.findOne({ organizationId, supplierId: id });
    if (hasPurchases) {
      return res.status(400).json({ message: 'Cannot delete supplier with existing purchase records' });
    }

    const deletedSupplier = await Supplier.findOneAndDelete({ _id: id, organizationId });
    if (!deletedSupplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
