import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

dotenv.config();

async function checkAndCreatePatient() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/clinic');
    console.log('Connected to MongoDB');

    const mobile = '8874614138';
    
    // Search for user with the mobile number
    let user = await User.findOne({ mobile: mobile.toLowerCase() });
    
    if (user) {
      console.log('User found:', { 
        name: user.name, 
        mobile: user.mobile, 
        role: user.role,
        organizationId: user.organizationId 
      });
    } else {
      console.log('No user found with mobile:', mobile);
      
      // List sample patients
      const patients = await User.find({ role: 'patient' }).limit(5);
      console.log('\nSample patients in database:');
      if (patients.length > 0) {
        patients.forEach(p => console.log(' -', p.name, p.mobile, p.role));
      } else {
        console.log('No patients found');
        
        // Create a test patient
        console.log('\nCreating test patient...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Test@123', salt);
        
        const newPatient = new User({
          name: 'Test Patient',
          mobile: mobile.toLowerCase(),
          password: hashedPassword,
          role: 'patient',
          age: 30
        });
        
        await newPatient.save();
        console.log('Test patient created successfully!');
        console.log('Mobile:', mobile);
        console.log('Password: Test@123');
      }
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkAndCreatePatient();
