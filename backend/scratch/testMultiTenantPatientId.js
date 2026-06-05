import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Patient from '../models/PaitentEditProfile.js';
import Organization from '../models/Organization.js';
import Counter from '../models/Counter.js';
import { generatePatientId } from '../utils/idGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hospital';
console.log(`Connecting to database: ${dbURI}...`);

await mongoose.connect(dbURI);
console.log('Connected successfully.');

async function runTests() {
  const orgAId = new mongoose.Types.ObjectId();
  const orgBId = new mongoose.Types.ObjectId();

  console.log(`Using Org A ID: ${orgAId}`);
  console.log(`Using Org B ID: ${orgBId}`);

  // Clean up any potential counters for these dummy organizations
  await Counter.deleteMany({ name: { $in: [`patientId_${orgAId}`, `patientId_${orgBId}`] } });

  try {
    // Test 1: Generate Patient IDs for different organizations
    console.log('\n--- Test 1: Generating patient IDs for Org A and Org B ---');
    const idA1 = await generatePatientId(orgAId);
    const idB1 = await generatePatientId(orgBId);
    console.log(`Generated ID for Org A (first patient): ${idA1}`);
    console.log(`Generated ID for Org B (first patient): ${idB1}`);

    // Since they are separate orgs, they should both get "000001"
    if (idA1 === idB1) {
      console.log('Success: Sequential IDs are generated per-organization (both are 000001).');
    } else {
      console.warn(`Warning: Sequential IDs differ (A: ${idA1}, B: ${idB1}). This might be due to pre-existing counters, but they should ideally start at 000001.`);
    }

    // Test 2: Save patient 1 in Org A and patient 1 in Org B with the same patientId
    console.log('\n--- Test 2: Saving patients with the same patientId in DIFFERENT organizations ---');
    
    const patientA1 = new Patient({
      organizationId: orgAId,
      patientId: idA1,
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      mobile: '1234567890'
    });

    const patientB1 = new Patient({
      organizationId: orgBId,
      patientId: idA1, // intentionally using the same ID
      firstName: 'Jane',
      lastName: 'Smith',
      fullName: 'Jane Smith',
      mobile: '9876543210'
    });

    await patientA1.save();
    console.log('Successfully saved Patient A1 in Org A.');

    await patientB1.save();
    console.log('Successfully saved Patient B1 in Org B with the SAME patientId.');
    console.log('Success: Compound index allows duplicate patientIds across different organizations!');

    // Test 3: Attempt to save a duplicate patientId within the SAME organization
    console.log('\n--- Test 3: Attempting to save a duplicate patientId in the SAME organization ---');
    const patientA2 = new Patient({
      organizationId: orgAId,
      patientId: idA1, // duplicate patientId in Org A
      firstName: 'Duplicate',
      lastName: 'Patient',
      fullName: 'Duplicate Patient',
      mobile: '5555555555'
    });

    try {
      await patientA2.save();
      console.error('FAIL: Saved a duplicate patientId in the same organization without error!');
    } catch (saveError) {
      if (saveError.code === 11000) {
        console.log('Success: Correctly rejected duplicate patientId within the same organization with E11000!');
      } else {
        console.error('FAIL: Got an unexpected error type:', saveError);
      }
    }

    // Test 4: Concurrency test
    console.log('\n--- Test 4: Simulating concurrent patient creation ---');
    // We will simulate 5 concurrent requests to generate IDs and create patients for Org A
    const concurrencyPromises = Array.from({ length: 5 }).map(async (_, index) => {
      const pId = await generatePatientId(orgAId);
      const p = new Patient({
        organizationId: orgAId,
        patientId: pId,
        firstName: `Concurrent_${index}`,
        lastName: 'Test',
        fullName: `Concurrent_${index} Test`,
        mobile: `000000000${index}`
      });
      await p.save();
      return pId;
    });

    const results = await Promise.all(concurrencyPromises);
    console.log('Generated concurrent patient IDs:', results);
    const uniqueResults = new Set(results);
    if (uniqueResults.size === results.length) {
      console.log('Success: All concurrently generated patient IDs are unique!');
    } else {
      console.error('FAIL: Concurrently generated duplicate patient IDs:', results);
    }

    // Clean up
    console.log('\nCleaning up dummy test records...');
    await Patient.deleteMany({ organizationId: { $in: [orgAId, orgBId] } });
    await Counter.deleteMany({ name: { $in: [`patientId_${orgAId}`, `patientId_${orgBId}`] } });
    console.log('Cleanup finished.');

  } catch (err) {
    console.error('An error occurred during testing:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

runTests();
