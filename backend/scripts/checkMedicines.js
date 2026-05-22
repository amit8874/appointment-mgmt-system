import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Medicine from '../models/Medicine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-management-saas');

const total = await Medicine.countDocuments({});
const active = await Medicine.countDocuments({ status: 'Active' });
const inactive = await Medicine.countDocuments({ status: 'Inactive' });
const isGlobal = await Medicine.countDocuments({ isGlobal: true });
const hasIsActive = await Medicine.countDocuments({ isActive: true });
const noStatus = await Medicine.countDocuments({ status: { $exists: false } });

console.log('=== Medicine DB Report ===');
console.log('Total medicines:       ', total);
console.log('status: Active:        ', active);
console.log('status: Inactive:      ', inactive);
console.log('No status field:       ', noStatus);
console.log('isGlobal: true:        ', isGlobal);
console.log('isActive: true:        ', hasIsActive);

const sample = await Medicine.find({}).limit(5).select('name status isGlobal isActive organizationId');
console.log('\nSample 5 records:');
sample.forEach(m => console.log(`  ${m.name} | status=${m.status} | isGlobal=${m.isGlobal} | isActive=${m.isActive} | org=${m.organizationId}`));

process.exit(0);
