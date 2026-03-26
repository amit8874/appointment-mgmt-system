/**
 * Fix Superadmin Password Script
 * This script deletes the existing superadmin (if any) and creates a new one with correct password hashing.
 * 
 * Usage: node backend/scripts/fixSuperadmin.js
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hospital';

async function fixSuperadmin() {
  try {
    console.log('🔧 Starting Superadmin Password Fix...');
    console.log('='.repeat(50));
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Delete existing superadmin
    const deleted = await User.deleteOne({ role: 'superadmin' });
    if (deleted.deletedCount > 0) {
      console.log('🗑️  Deleted existing superadmin user');
    } else {
      console.log('ℹ️  No existing superadmin found');
    }

    // Create new superadmin with plain password (will be hashed by pre-save hook)
    const superAdmin = new User({
      name: 'Super Admin',
      email: 'superadmin@clinicms.com',
      password: 'SuperAdmin@123', // Plain password - will be hashed by pre-save hook
      role: 'superadmin',
    });

    await superAdmin.save();
    
    console.log('');
    console.log('✅ Superadmin created successfully!');
    console.log('📧 Email: superadmin@clinicms.com');
    console.log('🔑 Password: SuperAdmin@123');
    console.log('');
    console.log('⚠️  You can now log in with these credentials.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('Disconnected from MongoDB');
  }
}

fixSuperadmin();
