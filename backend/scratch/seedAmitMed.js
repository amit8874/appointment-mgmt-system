import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Medicine from '../models/Medicine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedOne = async () => {
  await connectDB();
  const orgId = "69de1dddd543a884d15c4ff2"; // Amit Clinic
  await Medicine.create({
    name: 'Amit Test Med 101',
    organizationId: orgId,
    category: 'Tablet',
    type: 'Tablet',
    manufacturer: 'Amit Pharma'
  });
  console.log('Seeded Amit Test Med 101');
  process.exit();
};

seedOne();
