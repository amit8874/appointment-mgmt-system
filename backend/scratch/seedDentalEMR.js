import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';

import { seedGlobalComplaints } from '../controllers/complaintController.js';
import { seedDiagnosisMaster } from '../controllers/diagnosisController.js';
import { seedMedicineMaster } from '../controllers/medicineController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    console.log('Seeding complaints...');
    await seedGlobalComplaints();
    
    console.log('Seeding diagnosis master...');
    await seedDiagnosisMaster();
    
    console.log('Seeding medicine master...');
    await seedMedicineMaster();
    
    console.log('All dental EMR seeding complete!');
  } catch (error) {
    console.error('Seeding script failed:', error);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
};

run();
