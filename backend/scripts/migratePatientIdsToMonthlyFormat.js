import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { migrateAllOrganizationsToMonthlyFormat } from '../utils/idGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hospital';
console.log(`[Script] Connecting to database: ${dbURI}...`);

try {
  await mongoose.connect(dbURI);
  console.log('[Script] Connected successfully to MongoDB.');

  console.log('[Script] Running migration of legacy patient IDs to monthly format YYYYMMXX...');
  await migrateAllOrganizationsToMonthlyFormat();
  console.log('[Script] Migration completed successfully!');
} catch (error) {
  console.error('[Script] Migration failed:', error);
  process.exit(1);
}

process.exit(0);
