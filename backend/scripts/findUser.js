import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function findUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hospital');
    console.log('Connected to MongoDB\n');

    // Search for user with the mobile number
    const users = await User.find({ mobile: '8874614138' });
    
    console.log(`Found ${users.length} user(s) with mobile 8874614138:\n`);
    
    users.forEach((u, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  _id: ${u._id}`);
      console.log(`  name: ${u.name}`);
      console.log(`  mobile: ${u.mobile}`);
      console.log(`  role: ${u.role}`);
      console.log(`  email: ${u.email || 'N/A'}`);
      console.log(`  organizationId: ${u.organizationId || 'N/A'}`);
      console.log(`  createdAt: ${u.createdAt}`);
      console.log('');
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

findUser();
