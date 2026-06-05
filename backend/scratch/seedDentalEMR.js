import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
  try {
    console.log('Connecting to database...');
    const connectDB = (await import('../config/db.js')).default;
    await connectDB();
    
    console.log('Seeding complaints...');
    const { seedGlobalComplaints } = await import('../controllers/complaintController.js');
    await seedGlobalComplaints();
    
    console.log('Seeding diagnosis master...');
    const { seedDiagnosisMaster } = await import('../controllers/diagnosisController.js');
    await seedDiagnosisMaster();
    
    console.log('Seeding medicine master...');
    const { seedMedicineMaster } = await import('../controllers/medicineController.js');
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
