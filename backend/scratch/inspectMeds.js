import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Medicine from '../models/Medicine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const checkMeds = async () => {
  await connectDB();
  const meds = await Medicine.find().limit(5).lean();
  console.log('Sample Medicines:');
  console.log(JSON.stringify(meds, null, 2));
  process.exit();
};

checkMeds();
