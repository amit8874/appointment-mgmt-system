import MedicalRecord from '../models/MedicalRecord.js';

// Get medical records for a specific patient
export const getPatientRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const records = await MedicalRecord.find({ patientId }).sort({ date: -1 });
    res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ message: 'Error fetching medical records', error: error.message });
  }
};

// Create a new medical record (e.g. from patient upload)
export const createRecord = async (req, res) => {
  try {
    const { patientId, organizationId, type, title, description, status, date, attachmentUrl, doctorName } = req.body;

    if (!patientId || !type || !title) {
      return res.status(400).json({ message: 'patientId, type, and title are required' });
    }

    const newRecord = new MedicalRecord({
      patientId,
      organizationId,
      type,
      title,
      description,
      status: status || 'Pending',
      date: date || Date.now(),
      attachmentUrl,
      doctorName: doctorName || 'Self Upload'
    });

    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    console.error('Error creating medical record:', error);
    res.status(500).json({ message: 'Error creating medical record', error: error.message });
  }
};

// Update a medical record
export const updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedRecord = await MedicalRecord.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedRecord) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({ message: 'Error updating medical record', error: error.message });
  }
};

// Delete a medical record
export const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await MedicalRecord.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.status(200).json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({ message: 'Error deleting medical record', error: error.message });
  }
};
