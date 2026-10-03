import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Check for SUPERADMIN_PASSWORD in environment variables
    if (!process.env.SUPERADMIN_PASSWORD) {
      console.error('Error: SUPERADMIN_PASSWORD is not set in the .env file.');
      console.log('Please add SUPERADMIN_PASSWORD to your .env file to create a super admin.');
      return;
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hospital');
    console.log('Connected to MongoDB');

    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'admin@oviaan.com';
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

    // Check if super admin already exists
    let existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      existingSuperAdmin.email = superAdminEmail;
      existingSuperAdmin.password = superAdminPassword;
      await existingSuperAdmin.save();
      console.log('Super admin credentials updated successfully from .env!');
      console.log(`Email: ${superAdminEmail}`);
      return;
    }

    // Create super admin
    const superAdmin = new User({
      name: 'Super Admin',
      email: superAdminEmail,
      password: superAdminPassword, // This will be hashed by the pre-save hook
      role: 'superadmin'
    });

    await superAdmin.save();
    console.log('Super admin created successfully!');
    console.log(`Email: ${superAdminEmail}`);
    console.log('Password: (from your .env file)');
    console.log('Please change the password after first login if you used a temporary one.');

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
createSuperAdmin();