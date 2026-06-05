import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Patient from '../models/PaitentEditProfile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hospital';
console.log(`Connecting to database: ${dbURI}...`);

try {
  await mongoose.connect(dbURI);
  console.log('Connected successfully to MongoDB.');

  const collection = Patient.collection;
  const indexes = await collection.indexes();
  console.log('Current indexes on patients collection:', JSON.stringify(indexes, null, 2));

  // 1. Drop the old unique patientId_1 index if it exists
  const hasPatientIdIndex = indexes.some(idx => idx.name === 'patientId_1');
  if (hasPatientIdIndex) {
    console.log('Dropping old global unique index: patientId_1...');
    await collection.dropIndex('patientId_1');
    console.log('Successfully dropped patientId_1 unique index.');
  } else {
    console.log('Old index patientId_1 not found. Skipping drop.');
  }

  // 2. Create the new compound unique index on { organizationId: 1, patientId: 1 }
  console.log('Creating new compound unique index { organizationId: 1, patientId: 1 }...');
  await collection.createIndex({ organizationId: 1, patientId: 1 }, { unique: true });
  console.log('Successfully created compound unique index.');

  // Print updated list of indexes
  const updatedIndexes = await collection.indexes();
  console.log('Updated indexes on patients collection:', JSON.stringify(updatedIndexes, null, 2));

  console.log('Index migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}

process.exit(0);
