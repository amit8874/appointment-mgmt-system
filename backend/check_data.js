import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './models/Organization.js';
import './models/PaitentEditProfile.js';
import './models/User.js';
import './models/Conversation.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const Conversation = mongoose.model('Conversation');
  const Patient = mongoose.model('Patient');
  const User = mongoose.model('User');

  const convos = await Conversation.find();
  console.log(`Total Conversations: ${convos.length}`);

  for (const convo of convos) {
    console.log(`\nChecking Convo: ${convo._id}`);
    console.log(`organizationId: ${convo.organizationId}`);
    console.log(`patientId field: ${convo.patientId} (Type: ${typeof convo.patientId})`);

    const pById = await Patient.findById(convo.patientId);
    console.log(`Found in Patients by ID? ${!!pById} ${pById ? '(' + pById.firstName + ')' : ''}`);

    const uById = await User.findById(convo.patientId);
    console.log(`Found in Users by ID? ${!!uById} ${uById ? '(' + uById.name + ' - mobile: ' + uById.mobile + ')' : ''}`);

    if (uById) {
      const pByMobile = await Patient.findOne({ mobile: uById.mobile });
      console.log(`Patient found by User's mobile (${uById.mobile})? ${!!pByMobile} ${pByMobile ? '(' + pByMobile.firstName + ' - ID: ' + pByMobile._id + ')' : ''}`);
      if (pByMobile) {
        console.log(`Org Match? UserOrg: ${uById.organizationId} vs PatientOrg: ${pByMobile.organizationId}`);
      }
    }
  }
  process.exit(0);
}

check();
