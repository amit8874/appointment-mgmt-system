import axios from 'axios';

async function testPdf() {
  try {
    const payload = {
      organizationId: '69de1dddd543a884d15c4ff2', // Amit's test org
      templateId: 'TODO', // Need to get the ID of new_1
      prescriptionData: {
        date: new Date().toISOString(),
        doctorName: 'Amit',
        notes: 'Test notes'
      },
      patientData: {
        name: 'Test Patient',
        age: 30,
        gender: 'Male'
      }
    };
    
    // First, find the template
    const mongoose = (await import('mongoose')).default;
    const dotenv = (await import('dotenv')).default;
    dotenv.config();
    await mongoose.connect(process.env.MONGO_URI);
    
    const PrescriptionTemplate = mongoose.model('PrescriptionTemplate', new mongoose.Schema({ templateName: String }), 'prescriptiontemplates');
    const template = await PrescriptionTemplate.findOne({ templateName: 'new_1' });
    if (template) {
      payload.templateId = template._id.toString();
      console.log('Using Template ID:', payload.templateId);
    }
    
    await mongoose.disconnect();
    
    const response = await axios.post('http://localhost:5000/api/prescription-template/generate-pdf', payload);
    console.log("Success! URL:", response.data.url);
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
}

testPdf();
