import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Medicine from '../models/Medicine.js';
import MedicineBatch from '../models/MedicineBatch.js';
import Organization from '../models/Organization.js';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const medicines = [
  {
    name: 'Paracetamol 500mg',
    genericName: 'Paracetamol',
    manufacturer: 'GSK',
    category: 'Antipyretics',
    type: 'Tablet',
    dose: '500mg',
    packSize: '10x10',
    unit: 'Tablet',
    gstPercentage: 12,
    minimumStockAlert: 100,
    description: 'Relief from pain and fever',
  },
  {
    name: 'Amoxicillin 250mg',
    genericName: 'Amoxicillin',
    manufacturer: 'Cipla',
    category: 'Antibiotics',
    type: 'Capsule',
    dose: '250mg',
    packSize: '10x10',
    unit: 'Capsule',
    gstPercentage: 12,
    minimumStockAlert: 50,
    description: 'Antibiotic for bacterial infections',
  },
  {
    name: 'Cetirizine 10mg',
    genericName: 'Cetirizine',
    manufacturer: 'Dr. Reddy',
    category: 'Antihistamines',
    type: 'Tablet',
    dose: '10mg',
    packSize: '10x10',
    unit: 'Tablet',
    gstPercentage: 12,
    minimumStockAlert: 30,
    description: 'Relief from allergy symptoms',
  },
  {
    name: 'Omeprazole 20mg',
    genericName: 'Omeprazole',
    manufacturer: 'Sun Pharma',
    category: 'Antacids',
    type: 'Capsule',
    dose: '20mg',
    packSize: '10x10',
    unit: 'Capsule',
    gstPercentage: 12,
    minimumStockAlert: 40,
    description: 'Treatment for acid reflux',
  },
  {
    name: 'Metformin 500mg',
    genericName: 'Metformin',
    manufacturer: 'Abbott',
    category: 'Antidiabetics',
    type: 'Tablet',
    dose: '500mg',
    packSize: '10x15',
    unit: 'Tablet',
    gstPercentage: 12,
    minimumStockAlert: 100,
    description: 'Management of type 2 diabetes',
  },
  {
    name: 'Amlodipine 5mg',
    genericName: 'Amlodipine',
    manufacturer: 'Pfizer',
    category: 'Antihypertensives',
    type: 'Tablet',
    dose: '5mg',
    packSize: '10x10',
    unit: 'Tablet',
    gstPercentage: 12,
    minimumStockAlert: 50,
    description: 'Treatment for high blood pressure',
  },
  {
    name: 'Atorvastatin 10mg',
    genericName: 'Atorvastatin',
    manufacturer: 'Zydus',
    category: 'Statins',
    type: 'Tablet',
    dose: '10mg',
    packSize: '10x10',
    unit: 'Tablet',
    gstPercentage: 12,
    minimumStockAlert: 40,
    description: 'Cholesterol lowering medication',
  },
  {
    name: 'Ibuprofen 400mg',
    genericName: 'Ibuprofen',
    manufacturer: 'Abbott',
    category: 'NSAIDs',
    type: 'Tablet',
    dose: '400mg',
    packSize: '10x10',
    unit: 'Tablet',
    gstPercentage: 12,
    minimumStockAlert: 60,
    description: 'Anti-inflammatory and pain relief',
  },
  {
    name: 'Cough Syrup (Benadryl)',
    genericName: 'Diphenhydramine',
    manufacturer: 'J&J',
    category: 'Cough & Cold',
    type: 'Syrup',
    dose: '100ml',
    packSize: '1 Bottle',
    unit: 'Bottle',
    gstPercentage: 18,
    minimumStockAlert: 20,
    description: 'Relief from cough and allergy',
  },
  {
    name: 'Azithromycin 500mg',
    genericName: 'Azithromycin',
    manufacturer: 'Mankind',
    category: 'Antibiotics',
    type: 'Tablet',
    dose: '500mg',
    packSize: '3 Tablets',
    unit: 'Tablet',
    gstPercentage: 12,
    minimumStockAlert: 20,
    description: 'Broad-spectrum antibiotic',
  }
];

const seedData = async () => {
  try {
    await connectDB();

    // Find the first organization to assign medicines to
    const org = await Organization.findOne();
    if (!org) {
      console.error('No organization found. Please create an organization first.');
      process.exit(1);
    }

    console.log(`Seeding medicines for organization: ${org.name} (${org._id})`);

    // Optional: Clear existing medicines for this org for a clean seed
    // await Medicine.deleteMany({ organizationId: org._id });
    // await MedicineBatch.deleteMany({ organizationId: org._id });

    for (const medData of medicines) {
      // Check if medicine already exists (checking globally due to unique index)
      let medicine = await Medicine.findOne({ 
        name: medData.name 
      });

      if (!medicine) {
        try {
          medicine = await Medicine.create({
            ...medData,
            organizationId: org._id
          });
          console.log(`Created Medicine: ${medicine.name}`);
        } catch (err) {
          if (err.code === 11000) {
            console.log(`Medicine already exists (duplicate key during creation): ${medData.name}`);
            medicine = await Medicine.findOne({ name: medData.name });
          } else {
            throw err;
          }
        }
      } else {
        console.log(`Medicine already exists: ${medicine.name}`);
      }

      if (medicine) {
        // Add 1-2 batches for each medicine
        const batchCount = Math.floor(Math.random() * 2) + 1;
        for (let i = 1; i <= batchCount; i++) {
          const batchNo = `BATCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          // Check if batch already exists
          const existingBatch = await MedicineBatch.findOne({
            organizationId: org._id,
            medicineId: medicine._id,
            batchNo: batchNo
          });

          if (!existingBatch) {
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + Math.floor(Math.random() * 3) + 1);

            const mrp = Math.floor(Math.random() * 100) + 50;
            const purchasePrice = mrp * 0.7;
            const sellingPrice = mrp * 0.9;
            const stockQuantity = Math.floor(Math.random() * 200) + 50;

            await MedicineBatch.create({
              organizationId: org._id,
              medicineId: medicine._id,
              batchNo: batchNo,
              expiryDate: expiryDate,
              mrp: mrp,
              purchasePrice: purchasePrice,
              sellingPrice: sellingPrice,
              stockQuantity: stockQuantity,
              initialStock: stockQuantity,
              status: 'Active'
            });
            console.log(`  Added Batch: ${batchNo} for ${medicine.name}`);
          }
        }
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
