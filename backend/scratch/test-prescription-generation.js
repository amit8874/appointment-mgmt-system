import { generatePrescriptionPDF } from '../services/pdfService.js';
import fs from 'fs';
import path from 'path';

async function testGeneration() {
  const prescriptionData = {
    date: new Date().toISOString(),
    doctorName: 'Rahul Gupta',
    doctorQualification: 'MBBS, MD (Medicine)',
    doctorSpecialization: 'Senior Consultant Physician',
    notes: JSON.stringify({
      vitals: { BP: '120/80', Pulse: '72', Temp: '98.6' },
      complaints: [{ name: 'Fever' }, { name: 'Cough' }],
      diagnosis: [{ name: 'Viral Fever' }],
      medications: [
        { name: 'Paracetamol', composition: '500mg', dose: '1-0-1', when: 'After Food', frequency: 'Daily' },
        { name: 'Amoxicillin', composition: '250mg', dose: '1-1-1', when: 'After Food', frequency: '3 Days' }
      ],
      advice: 'Take plenty of fluids and rest.',
      testsRequested: [{ name: 'CBC' }, { name: 'Widal' }]
    })
  };

  const patientData = {
    fullName: 'Rahul Maurya',
    age: '21',
    gender: 'Male'
  };

  const org = {
    name: 'Oviaan Clinic',
    address: { street: 'Sector 62', city: 'Noida', state: 'UP', zipCode: '201301' },
    phone: '8400928349',
    email: 'contact@oviaan.com'
  };

  try {
    console.log('Generating PDF...');
    const buffer = await generatePrescriptionPDF(prescriptionData, patientData, org);
    const outputPath = path.join(process.cwd(), 'test-prescription-output.pdf');
    fs.writeFileSync(outputPath, buffer);
    console.log('PDF saved to:', outputPath);
    console.log('Buffer size:', buffer.length, 'bytes');
  } catch (error) {
    console.error('Generation failed:', error);
  }
}

testGeneration();
