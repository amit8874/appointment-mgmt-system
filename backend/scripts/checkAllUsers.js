import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

dotenv.config();

async function checkAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hospital');
    console.log('Connected to MongoDB\n');
    
    // Get all users with their roles
    const users = await User.find({}).select('name mobile role email');
    
    console.log(`Total users in database: ${users.length}\n`);
    
    if (users.length > 0) {
      console.log('All users:');
      users.forEach(u => {
        console.log(`- Name: ${u.name}, Mobile: ${u.mobile}, Role: ${u.role}, Email: ${u.email || 'N/A'}`);
      });
    } else {
      console.log('No users found in database at all!');
    }

    // Also check the Organization collection
    const orgs = await Organization.find({}).select('name slug status');
    console.log(`\nTotal organizations: ${orgs.length}`);
    orgs.forEach(o => {
      console.log(`- Name: ${o.name}, Slug: ${o.slug}, Status: ${o.status}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkAllUsers();
