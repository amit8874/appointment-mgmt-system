import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Conversation from './models/Conversation.js';
import User from './models/User.js';
import Patient from './models/PaitentEditProfile.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cms';

async function debug() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const convos = await Conversation.find().limit(5);
    console.log(`Found ${convos.length} conversations`);

    for (const convo of convos) {
      console.log('--- Conversation ---');
      console.log('ID:', convo._id);
      console.log('PatientID in Convo:', convo.patientId);
      
      const user = await User.findById(convo.patientId);
      console.log('Is it a User ID?', user ? `YES (${user.role}) name: ${user.name} mobile: ${user.mobile}` : 'NO');
      
      const patient = await Patient.findById(convo.patientId);
      console.log('Is it a Patient ID?', patient ? `YES name: ${patient.firstName}` : 'NO');
      
      if (user && !patient) {
        console.log('Mismatch detected: Conversation uses User ID.');
        const actualPatient = await Patient.findOne({ mobile: user.mobile });
        console.log('Found matching Patient?', actualPatient ? `YES (${actualPatient._id}) name: ${actualPatient.firstName}` : 'NO');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
