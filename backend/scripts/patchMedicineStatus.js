import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Medicine from '../models/Medicine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-management-saas');

// Patch all medicines that have no status field to 'Active'
const result = await Medicine.updateMany(
  { status: { $exists: false } },
  { $set: { status: 'Active' } }
);
console.log(`Patched ${result.modifiedCount} medicines without status -> status: Active`);

// Also patch medicines that have organizationId: null (they should be global)
const result2 = await Medicine.updateMany(
  { isGlobal: true, organizationId: { $exists: false } },
  { $set: { status: 'Active' } }
);
console.log(`Confirmed ${result2.modifiedCount} global medicines active`);

const total = await Medicine.countDocuments({});
const active = await Medicine.countDocuments({ status: 'Active' });
console.log(`\nFinal: ${active}/${total} medicines are now status=Active`);

process.exit(0);
