import Patient from '../models/PaitentEditProfile.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import { generatePatientId } from '../utils/idGenerator.js';

// New route to get patient by patientId (string) instead of _id (ObjectId)
export const getPatientByPatientId = async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }

    const patient = await Patient.findOne({ organizationId: req.tenantId, patientId: patientId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient by ID:', error);
    res.status(500).json({ message: 'Error fetching patient', error: error.message });
  }
};

// Get patient by mobile number
export const getPatientByMobile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ organizationId: req.tenantId, mobile: req.params.mobile });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// Get all patients
export const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find({ organizationId: req.tenantId }).sort({ createdAt: -1 }).lean();
    // Ensure status field is included for all patients (default to 'active' if not set)
    const patientsWithStatus = patients.map(p => ({
      ...p,
      status: p.status || 'active'
    }));
    res.json(patientsWithStatus);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get patient count
export const getPatientCount = async (req, res) => {
  try {
    const count = await Patient.countDocuments({ organizationId: req.tenantId });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching patient count:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get today's registered patient count
export const getTodayPatientStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await Patient.countDocuments({ organizationId: req.tenantId, createdAt: { $gte: today } });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching today\'s patient count:', error);
    res.status(500).json({ message: error.message });
  }
};


// Create new patient
export const createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      age,
      gender,
      bloodGroup,
      contactNumber,
      email,
      address,
      city,
      state,
      zip,
      emergencyContact,
      emergencyPhone,
      pastMedicalHistory,
      allergies,
      assignedDoctor,
      assignedDoctorId,
      reports = []
    } = req.body;



    // Validate required fields
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ message: 'First name is required' });
    }

    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ message: 'Last name is required' });
    }

    if (!contactNumber || !contactNumber.trim()) {
      return res.status(400).json({ message: 'Contact number is required' });
    }

    if (contactNumber.length !== 10) {
      return res.status(400).json({ message: 'Contact number must be exactly 10 digits' });
    }

    // Check if patient already exists with this contact number
    const existingPatient = await Patient.findOne({
      organizationId: req.tenantId,
      mobile: contactNumber.trim()
    });

    if (existingPatient) {
      return res.status(400).json({ message: 'Patient already exists with this contact number' });
    }

    // Generate unique Patient ID
    const patientId = await generatePatientId(req.tenantId);

    // Create new patient
    const newPatient = new Patient({
      organizationId: req.tenantId,
      patientId,
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: age ? parseInt(age) : undefined,
      gender: gender && gender.trim() ? gender.trim() : undefined,
      bloodGroup: bloodGroup && bloodGroup.trim() ? bloodGroup.trim() : undefined,
      mobile: contactNumber.trim(),
      email: email ? email.trim().toLowerCase() : '',
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      zip: zip ? zip.trim() : '',
      emergencyContact: emergencyContact ? emergencyContact.trim() : '',
      emergencyPhone: emergencyPhone ? emergencyPhone.trim() : '',
      pastMedicalHistory: pastMedicalHistory ? pastMedicalHistory.trim() : '',
      allergies: allergies ? allergies.trim() : '',
      assignedDoctor: assignedDoctor || '',
      assignedDoctorId: assignedDoctorId || '',
      reports: reports || []
    });

    await newPatient.save();



    res.status(201).json(newPatient);

  } catch (error) {
    console.error('Error creating patient:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation failed: ' + validationErrors.join(', ') });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }

    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Get patient by ID
export const getPatientById = async (req, res) => {
  try {
    let patient = await Patient.findOne({ organizationId: req.tenantId, _id: req.params.id });

    if (!patient) {
      // Try to find by patientId
      patient = await Patient.findOne({ organizationId: req.tenantId, patientId: req.params.id });
    }

    if (!patient) {
      // If patient doesn't exist, try to create from User data
      const user = await User.findOne({ organizationId: req.tenantId, _id: req.params.id });
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Check if a patient already exists with this mobile number
      patient = await Patient.findOne({ organizationId: req.tenantId, mobile: user.mobile });

      if (patient) {
        // If found by mobile, link the _id to the user's _id if not already done
        // (This might require an update if the IDs are different, but for now we just return it)
        return res.json(patient);
      }

      // Generate unique Patient ID
      const patientId = await generatePatientId(req.tenantId);

      // Split fullName into firstName and lastName
      const nameParts = (user.name || '').trim().split(' ');
      const firstName = nameParts[0] || 'Patient';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Create patient record from user data
      patient = new Patient({
        _id: user._id,
        patientId: patientId,
        fullName: user.name || '',
        firstName: firstName,
        lastName: lastName,
        mobile: user.mobile,
        email: user.email || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth,
        age: user.age,
        bloodGroup: user.bloodGroup || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        allergies: user.allergies || '',
        currentMedications: user.currentMedications || '',
        medicalHistory: user.medicalHistory || '',
        bloodPressure: user.bloodPressure || '',
        weight: user.weight,
        height: user.height,
        username: user.username || '',
        profilePicture: user.profilePicture || '',
        idProof: user.idProof || '',
        insuranceDocument: user.insuranceDocument || '',
      });

      await patient.save();
    }

    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update patient profile
export const updatePatient = async (req, res) => {
  try {
    const paramId = req.params.id;
    const updateData = req.body;

    // Filter out empty strings for enum fields to prevent validation errors
    const filteredUpdateData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && value !== null && value !== '') {
        filteredUpdateData[key] = value;
      }
    }

    // Special handling for naming: if fullName is present, split it for firstName/lastName
    if (filteredUpdateData.fullName) {
      const nameParts = filteredUpdateData.fullName.trim().split(' ');
      filteredUpdateData.firstName = nameParts[0] || 'Patient';
      filteredUpdateData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    }

    let patient = await Patient.findOne({ organizationId: req.tenantId, _id: paramId });

    if (!patient) {
      patient = await Patient.findOne({ organizationId: req.tenantId, patientId: paramId });
    }

    if (!patient) {
      // If patient doesn't exist, create from User data first
      const user = await User.findOne({ organizationId: req.tenantId, _id: paramId });
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Check if a patient already exists with this mobile number
      patient = await Patient.findOne({ organizationId: req.tenantId, mobile: user.mobile });

      if (patient) {
         // Found by mobile, proceed to update this patient record
      } else {
        // Generate unique Patient ID
        const patientId = await generatePatientId(req.tenantId);

      // Split fullName if it exists
      const nameParts = (user.name || '').trim().split(' ');
      const firstName = nameParts[0] || 'Patient';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Filter out empty values for enum fields when creating
      const patientData = {
        _id: user._id,
        patientId: patientId,
        fullName: user.name || '',
        firstName: firstName,
        lastName: lastName,
        mobile: user.mobile,
        email: user.email || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth,
        age: user.age,
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        allergies: user.allergies || '',
        currentMedications: user.currentMedications || '',
        medicalHistory: user.medicalHistory || '',
        bloodPressure: user.bloodPressure || '',
        weight: user.weight,
        height: user.height,
        username: user.username || '',
        profilePicture: user.profilePicture || '',
        idProof: user.idProof || '',
        insuranceDocument: user.insuranceDocument || '',
      };

      // Only add enum fields if they have valid values
      if (user.bloodGroup && user.bloodGroup.trim()) {
        patientData.bloodGroup = user.bloodGroup;
      }

      patient = new Patient(patientData);
      await patient.save();
    }
    }

    // Now update the patient with filtered data
    const updatedPatient = await Patient.findByIdAndUpdate(patient._id, filteredUpdateData, { new: true, runValidators: true });
    if (!updatedPatient) return res.status(404).json({ message: 'Patient not found' });

    res.json(updatedPatient);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete patient by ID
export const deletePatient = async (req, res) => {
  try {
    // First get the patient to find their patientId
    const patient = await Patient.findOne({ organizationId: req.tenantId, _id: req.params.id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const patientIdString = patient.patientId;
    
    // Delete from all appointment collections
    await Appointment.deleteMany({ patientId: patientIdString });
    await PendingAppointment.deleteMany({ patientId: patientIdString });
    await ConfirmedAppointment.deleteMany({ patientId: patientIdString });
    await CancelledAppointment.deleteMany({ patientId: patientIdString });
    
    // Delete billing records associated with this patient
    await Billing.deleteMany({ patientId: patientIdString });
    
    // Delete notifications associated with this patient
    await Notification.deleteMany({ patientId: patientIdString });
    
    // Delete the patient
    await Patient.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Patient and all associated records deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ message: error.message });
  }
};
