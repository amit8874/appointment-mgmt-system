import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27014/hospital';

async function dropIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Explicitly drop the problematic index
    await mongoose.connection.collection('products').dropIndex('organizationId_1_barcode_1');
    console.log('Successfully dropped organizationId_1_barcode_1 index');
    
  } catch (error) {
    if (error.codeName === 'IndexNotFound') {
      console.log('Index was not found, nothing to drop.');
    } else {
      console.error('Error dropping index:', error.message);
    }
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

dropIndex();
