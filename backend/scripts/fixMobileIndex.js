/**
 * Fix Mobile Index Script
 * Removes old unique index on mobile field alone
 * The new compound index (mobile + organizationId) handles uniqueness per tenant
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital';

async function fixMobileIndex() {
  try {
    console.log('🔧 Fixing mobile index...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Try to drop the old mobile_1 index if it exists
    try {
      await usersCollection.dropIndex('mobile_1');
      console.log('✅ Dropped old mobile_1 index');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  mobile_1 index does not exist (already removed)');
      } else {
        throw error;
      }
    }

    // Ensure the compound index exists
    try {
      await usersCollection.createIndex(
        { mobile: 1, organizationId: 1 },
        { unique: true, sparse: true, name: 'mobile_1_organizationId_1' }
      );
      console.log('✅ Created compound index (mobile + organizationId)');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️  Compound index already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Index fix completed!');
    console.log('📝 Note: The compound index allows multiple null mobile values');
    console.log('   and ensures mobile uniqueness per organization.');

  } catch (error) {
    console.error('❌ Error fixing index:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixMobileIndex()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
