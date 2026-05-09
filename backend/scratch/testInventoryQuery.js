import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Medicine from '../models/Medicine.js';
import MedicineBatch from '../models/MedicineBatch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const testQuery = async () => {
  await connectDB();
  const organizationId = "69de1dddd543a884d15c4ff2"; // Amit's ID from previous run
  
  const medicineIdsWithBatches = await MedicineBatch.distinct('medicineId', { organizationId });
  console.log('Medicine IDs with batches:', medicineIdsWithBatches.length);

  const query = {
    $or: [
      { organizationId: new mongoose.Types.ObjectId(organizationId) },
      { organizationId: null },
      { organizationId: { $exists: false } },
      { _id: { $in: medicineIdsWithBatches } }
    ]
  };

  const medicines = await Medicine.find(query).lean();
  console.log('Total medicines found with query:', medicines.length);
  if (medicines.length > 0) {
    console.log('First med name:', medicines[0].name);
    console.log('First med org:', medicines[0].organizationId);
  }

  process.exit();
};

testQuery();
