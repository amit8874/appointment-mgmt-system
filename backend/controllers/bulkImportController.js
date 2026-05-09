import Patient from '../models/PaitentEditProfile.js';
import { generatePatientId } from '../utils/idGenerator.js';
import * as xlsx from 'xlsx';

export const bulkImportPatients = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const organizationId = req.tenantId;
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is missing' });
    }

    // Read the uploaded file from buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'The file is empty' });
    }

    const results = {
      success: 0,
      skipped: 0,
      errors: [],
    };

    // Get all existing mobile numbers for this organization to check for duplicates
    const existingPatients = await Patient.find({ organizationId }).select('mobile');
    const existingMobiles = new Set(existingPatients.map(p => p.mobile).filter(Boolean));
    
    // Set to track mobiles within the current file to handle duplicates inside the Excel itself
    const seenMobilesInFile = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +1 for 0-index, +1 for header row

      // Standardize field names (case insensitive matching)
      const firstName = (row.firstName || row['First Name'] || row.name || row['Name'] || '').toString().trim();
      const lastName = (row.lastName || row['Last Name'] || '').toString().trim();
      const mobile = (row.mobile || row.phone || row['Mobile Number'] || row['Phone Number'] || '').toString().trim();
      const gender = (row.gender || row.Gender || '').toString().trim();
      const age = row.age || row.Age;
      const email = (row.email || row.Email || '').toString().trim().toLowerCase();
      const address = (row.address || row.Address || '').toString().trim();
      const bloodGroup = (row.bloodGroup || row['Blood Group'] || '').toString().trim();

      // 1. Basic Validation: First Name is required
      if (!firstName) {
        results.errors.push(`Row ${rowNumber}: First Name is missing`);
        results.skipped++;
        continue;
      }

      // 2. Duplicate Check: Only check if mobile is provided
      if (mobile) {
        if (existingMobiles.has(mobile) || seenMobilesInFile.has(mobile)) {
          results.skipped++;
          continue;
        }
        // Add to seen list to prevent duplicates later in the same file
        seenMobilesInFile.add(mobile);
      }

      try {
        // 3. Generate 6-digit Patient ID
        const patientId = await generatePatientId(organizationId);

        // 4. Create Patient
        const newPatient = new Patient({
          organizationId,
          patientId,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          mobile,
          email,
          gender: gender || undefined,
          age: age ? parseInt(age) : undefined,
          address,
          bloodGroup: bloodGroup || undefined,
          status: 'active',
          paymentStatus: 'paid'
        });

        await newPatient.save();
        results.success++;
      } catch (err) {
        console.error(`Error saving patient at row ${rowNumber}:`, err);
        results.errors.push(`Row ${rowNumber}: ${err.message}`);
        results.skipped++;
      }
    }

    res.status(200).json({
      message: 'Import process completed',
      results
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ message: 'Internal server error during import', error: error.message });
  }
};
