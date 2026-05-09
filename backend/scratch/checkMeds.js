import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Medicine from '../models/Medicine.js';
import Organization from '../models/Organization.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const checkData = async () => {
  await connectDB();
  const org = await Organization.findOne({ name: /Amit/i });
  console.log('Org ID:', org?._id);
  
  const medicines = await Medicine.find({});
  console.log('Total Medicines in DB:', medicines.length);
  
  const amitMeds = medicines.filter(m => m.organizationId?.toString() === org?._id.toString());
  console.log('Medicines for Amit Clinic:', amitMeds.length);
  
  if (amitMeds.length > 0) {
    console.log('First Amit Med:', amitMeds[0].name);
  }

  const otherMeds = medicines.filter(m => m.organizationId?.toString() !== org?._id.toString());
  console.log('Medicines for OTHER Orgs:', otherMeds.length);
  if (otherMeds.length > 0) {
      console.log('Sample Other Med:', otherMeds[0].name, 'Org:', otherMeds[0].organizationId);
  }

  process.exit(0);
};

checkData();
