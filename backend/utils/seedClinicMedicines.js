import Product from '../models/Product.js';
import Medicine from '../models/Medicine.js';
import MedicineBatch from '../models/MedicineBatch.js';
import Organization from '../models/Organization.js';

export const CLINIC_MEDICINES = [
  { name: 'Rapicort', packSize: '5g', price: 89, category: 'Medicine', type: 'Ointment' },
  { name: 'Densoform', packSize: '15 ml', price: 89, category: 'Medicine', type: 'Drops' },
  { name: 'Nemflam Plus', packSize: '60 ml', price: 55, category: 'Medicine', type: 'Suspension' },
  { name: 'Braceness Toothpaste', packSize: '100g', price: 299, category: 'Dental', type: 'Other' },
  { name: 'Golzee Kids Toothpaste', packSize: '80g', price: 129, category: 'Dental', type: 'Other' },
  { name: 'Denseal - S', packSize: '50 gm', price: 70.25, category: 'Dental', type: 'Other' },
  { name: 'Warren Orthodontic Toothbrush', packSize: '1 unit', price: 65, category: 'Dental', type: 'Other' },
  { name: 'Warren Sensitive Toothbrush', packSize: '1 unit', price: 45, category: 'Dental', type: 'Other' },
  { name: 'Xenpar - Plus', packSize: '10 tablets', price: 29, category: 'Medicine', type: 'Tablet' },
  { name: 'Caremox - AG - Plus', packSize: '10 tablets', price: 227, category: 'Medicine', type: 'Tablet' },
  { name: 'Retol', packSize: '10 tablets', price: 9.55, category: 'Medicine', type: 'Tablet' },
  { name: 'Odlin - Plus', packSize: '10 tablets', price: 102, category: 'Medicine', type: 'Tablet' },
  { name: 'Pandoyen - DSR', packSize: '10 capsules', price: 130, category: 'Medicine', type: 'Capsule' },
  { name: 'Yentenac - SP', packSize: '10 tablets', price: 130, category: 'Medicine', type: 'Tablet' },
  { name: 'Lycoyen', packSize: '10 capsules', price: 120, category: 'Medicine', type: 'Capsule' },
  { name: 'Ventenac - P', packSize: '10 tablets', price: 65, category: 'Medicine', type: 'Tablet' },
  { name: 'Dencef - 200 LB', packSize: '10 tablets', price: 150, category: 'Medicine', type: 'Tablet' },
  { name: 'Real - LSP', packSize: '10 tablets', price: 178, category: 'Medicine', type: 'Tablet' },
  { name: 'Frutta - 9G', packSize: '10 capsules', price: 190, category: 'Medicine', type: 'Capsule' },
  { name: 'Omoxin - 500', packSize: '10 capsules', price: 77, category: 'Medicine', type: 'Capsule' },
  { name: 'Nemoxy - CV 375', packSize: '6 tablets', price: 112, category: 'Medicine', type: 'Tablet' },
  { name: 'Maxirich', packSize: '10 capsules', price: 129, category: 'Medicine', type: 'Capsule' },
  { name: 'Roben DSR', packSize: '10 capsules', price: 104, category: 'Medicine', type: 'Capsule' },
  { name: 'Sinucal', packSize: '15 tablets', price: 135, category: 'Medicine', type: 'Tablet' },
  { name: 'Limcee', packSize: '15 chewable tablets', price: 24.84, category: 'Medicine', type: 'Tablet' },
  { name: 'Olsept - MW (Mouthwash)', packSize: '150 ml', price: 120, category: 'Dental', type: 'Liquid' },
  { name: 'Oldine - MW (Mouthwash)', packSize: '100 ml', price: 40, category: 'Dental', type: 'Liquid' },
  { name: 'Denseal - PF', packSize: '50 gm', price: 76.75, category: 'Dental', type: 'Other' },
  { name: 'Probiotic', packSize: '15 gm', price: 0, category: 'Medicine', type: 'Powder' },
  { name: 'Remin', packSize: '18 gm', price: 0, category: 'Dental', type: 'Gel' },
];

/**
 * Automatically seeds the 30 medicines, products, and inventory batches
 * for all organizations on the server. Safe to run multiple times (idempotent),
 * and handles legacy unique name indexes gracefully.
 */
export const seedClinicMedicinesAndProducts = async () => {
  try {
    // 1. Drop legacy unique index on name_1 if it exists to allow multi-tenant compatibility
    try {
      const indexes = await Medicine.collection.indexes();
      const legacyUniqueName = indexes.find(idx => idx.name === 'name_1' && idx.unique);
      if (legacyUniqueName) {
        await Medicine.collection.dropIndex('name_1');
        console.log('[AUTO-SEED] Dropped legacy unique index on medicines.name_1');
      }
    } catch {
      // Index drop error ignored (e.g. if doesn't exist or insufficient permissions)
    }

    const orgs = await Organization.find({}).lean();
    if (!orgs || orgs.length === 0) return;

    for (const org of orgs) {
      for (const item of CLINIC_MEDICINES) {
        try {
          // 1. Ensure Product catalog item exists with exact price for this organization
          let existingProd = await Product.findOne({
            organizationId: org._id,
            name: item.name
          });

          if (!existingProd) {
            existingProd = await Product.findOne({
              organizationId: org._id.toString(),
              name: item.name
            });
          }

          if (!existingProd) {
            try {
              await Product.create({
                organizationId: org._id,
                name: item.name,
                price: item.price,
                stock: 100,
                description: `Pack: ${item.packSize}`,
                category: item.category,
                tax: 0
              });
            } catch (pErr) {
              // If duplicate or collision, update existing
              await Product.updateOne(
                { organizationId: org._id, name: item.name },
                { $set: { price: item.price, description: `Pack: ${item.packSize}`, category: item.category } }
              ).catch(() => {});
            }
          } else if (existingProd.price !== item.price) {
            await Product.updateOne(
              { _id: existingProd._id },
              { $set: { price: item.price, description: `Pack: ${item.packSize}`, category: item.category } }
            );
          }

          // 2. Ensure Medicine catalog item exists (check globally by name first to avoid E11000 duplicate key error)
          let med = await Medicine.findOne({
            $or: [
              { name: item.name },
              { name: new RegExp(`^${item.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
            ]
          });

          if (!med) {
            try {
              med = await Medicine.create({
                organizationId: org._id,
                name: item.name,
                category: item.category,
                type: item.type,
                packSize: item.packSize,
                description: `Price: ₹${item.price} | Pack: ${item.packSize}`,
                status: 'Active',
                gstPercentage: 0,
                minimumStockAlert: 10,
                usageCount: 1,
                isCommon: true,
                isGlobal: true
              });
            } catch (mErr) {
              // If caught by duplicate key, fetch the existing record
              med = await Medicine.findOne({ name: item.name });
            }
          } else {
            // Update metadata if needed
            await Medicine.updateOne(
              { _id: med._id },
              {
                $set: {
                  category: item.category,
                  type: item.type,
                  packSize: item.packSize,
                  description: `Price: ₹${item.price} | Pack: ${item.packSize}`,
                  status: 'Active'
                }
              }
            ).catch(() => {});
          }

          if (!med) continue;

          // 3. Ensure MedicineBatch exists for this org with exact selling price and active stock
          let existingBatch = await MedicineBatch.findOne({
            organizationId: org._id,
            medicineId: med._id
          });

          if (!existingBatch) {
            existingBatch = await MedicineBatch.findOne({
              organizationId: org._id.toString(),
              medicineId: med._id
            });
          }

          if (!existingBatch) {
            try {
              await MedicineBatch.create({
                organizationId: org._id,
                medicineId: med._id,
                batchNo: 'BATCH-001',
                expiryDate: new Date('2028-12-31T23:59:59.000Z'),
                mrp: item.price,
                purchasePrice: parseFloat((item.price * 0.7).toFixed(2)),
                sellingPrice: item.price,
                stockQuantity: 100,
                initialStock: 100,
                status: 'Active'
              });
            } catch (bErr) {
              await MedicineBatch.updateOne(
                { organizationId: org._id, medicineId: med._id },
                {
                  $set: {
                    mrp: item.price,
                    sellingPrice: item.price,
                    purchasePrice: parseFloat((item.price * 0.7).toFixed(2)),
                    status: 'Active',
                    expiryDate: new Date('2028-12-31T23:59:59.000Z')
                  }
                }
              ).catch(() => {});
            }
          } else if (existingBatch.sellingPrice !== item.price || existingBatch.status !== 'Active') {
            await MedicineBatch.updateOne(
              { _id: existingBatch._id },
              {
                $set: {
                  mrp: item.price,
                  sellingPrice: item.price,
                  purchasePrice: parseFloat((item.price * 0.7).toFixed(2)),
                  status: 'Active',
                  expiryDate: new Date('2028-12-31T23:59:59.000Z')
                }
              }
            );
          }
        } catch (itemErr) {
          console.warn(`[AUTO-SEED] Note on item ${item.name} for org ${org.name}:`, itemErr.message);
        }
      }
    }
    console.log('[AUTO-SEED] Clinic medicines & products verified and synced for all organizations.');
  } catch (error) {
    console.error('[AUTO-SEED] Error seeding clinic medicines:', error.message);
  }
};
