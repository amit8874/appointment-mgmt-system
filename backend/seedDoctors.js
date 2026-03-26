import mongoose from 'mongoose';
import Doctor from './models/Doctor.js';
import Counter from './models/Counter.js';
import dotenv from 'dotenv';

dotenv.config();

const seedDoctors = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hospital-db');
    console.log('Connected to MongoDB');

    // Check if doctors already exist
    const existingDoctors = await Doctor.countDocuments();
    if (existingDoctors > 0) {
      console.log(`Found ${existingDoctors} existing doctors. Skipping seed.`);
      return;
    }

    // Initialize counter for doctor IDs
    await Counter.findOneAndUpdate(
      { name: 'doctorId' },
      { $setOnInsert: { value: 0 } },
      { upsert: true, new: true }
    );

    // Sample doctors data
    const doctorsData = [
      {
        firstName: 'Raj',
        lastName: 'Mehta',
        name: 'Dr. Raj Mehta',
        specialization: 'Cardiology',
        email: 'raj.mehta@hospital.com',
        phone: '+91-9876543210',
        address: '123 Medical Center, Mumbai, India',
        qualification: 'MD Cardiology',
        workingHours: { start: '09:00', end: '17:00' },
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        dob: new Date('1980-05-15'),
        gender: 'Male',
        department: 'Cardiology',
        licenseNumber: 'LIC123456',
        experience: 15,
        fee: 1500,
        status: 'Active'
      },
      {
        firstName: 'Sneha',
        lastName: 'Verma',
        name: 'Dr. Sneha Verma',
        specialization: 'Neurology',
        email: 'sneha.verma@hospital.com',
        phone: '+91-8765432109',
        address: '456 Health Plaza, Delhi, India',
        qualification: 'MD Neurology',
        workingHours: { start: '10:00', end: '18:00' },
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false
        },
        dob: new Date('1985-08-22'),
        gender: 'Female',
        department: 'Neurology',
        licenseNumber: 'LIC234567',
        experience: 12,
        fee: 1200,
        status: 'Active'
      },
      {
        firstName: 'Amit',
        lastName: 'Sharma',
        name: 'Dr. Amit Sharma',
        specialization: 'Orthopedics',
        email: 'amit.sharma@hospital.com',
        phone: '+91-7654321098',
        address: '789 Wellness Center, Bangalore, India',
        qualification: 'MS Orthopedics',
        workingHours: { start: '08:00', end: '16:00' },
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        dob: new Date('1978-03-10'),
        gender: 'Male',
        department: 'Orthopedics',
        licenseNumber: 'LIC345678',
        experience: 18,
        fee: 1800,
        status: 'Active'
      },
      {
        firstName: 'Priya',
        lastName: 'Singh',
        name: 'Dr. Priya Singh',
        specialization: 'Pediatrics',
        email: 'priya.singh@hospital.com',
        phone: '+91-6543210987',
        address: '321 Children\'s Hospital, Chennai, India',
        qualification: 'MD Pediatrics',
        workingHours: { start: '09:00', end: '15:00' },
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false
        },
        dob: new Date('1982-11-30'),
        gender: 'Female',
        department: 'Pediatrics',
        licenseNumber: 'LIC456789',
        experience: 14,
        fee: 1000,
        status: 'Active'
      },
      {
        firstName: 'Vikram',
        lastName: 'Patel',
        name: 'Dr. Vikram Patel',
        specialization: 'Dermatology',
        email: 'vikram.patel@hospital.com',
        phone: '+91-5432109876',
        address: '654 Skin Care Clinic, Ahmedabad, India',
        qualification: 'MD Dermatology',
        workingHours: { start: '10:00', end: '17:00' },
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false
        },
        dob: new Date('1983-07-05'),
        gender: 'Male',
        department: 'Dermatology',
        licenseNumber: 'LIC567890',
        experience: 13,
        fee: 1300,
        status: 'Active'
      }
    ];

    // Create doctors
    const createdDoctors = [];
    for (const doctorData of doctorsData) {
      // Generate doctor ID
      const counter = await Counter.findOneAndUpdate(
        { name: 'doctorId' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );
      const doctorId = `DOC${String(counter.value).padStart(3, '0')}`;

      const doctor = new Doctor({
        ...doctorData,
        doctorId
      });

      const savedDoctor = await doctor.save();
      createdDoctors.push(savedDoctor);
    }

    console.log(`Successfully created ${createdDoctors.length} doctors:`);
    createdDoctors.forEach(doctor => {
      console.log(`- ${doctor.name} (${doctor.doctorId}) - ${doctor.specialization}`);
    });

  } catch (error) {
    console.error('Error seeding doctors:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
seedDoctors();
