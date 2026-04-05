import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Doctor from './models/Doctor.js';

dotenv.config();

const MONGO_URI = 'mongodb://localhost:27017/hospital';

async function checkCities() {
  await mongoose.connect(MONGO_URI);
  const doctors = await Doctor.find({});
  console.log(`--- TOTAL DOCTORS IN DB: ${doctors.length} ---`);
  doctors.forEach(d => {
    console.log(`Doctor: ${d.name}`);
    console.log(`  Status: ${d.status}`);
    console.log(`  City1: "${d.addressInfo?.city || ''}"`);
    console.log(`  City2: "${d.serviceLocation?.address?.city || ''}"`);
    console.log(`  Specialization: ${d.specialization}`);
    console.log('---');
  });
  process.exit();
}

checkCities();
