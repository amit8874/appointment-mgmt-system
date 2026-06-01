import DentalTreatment from '../models/DentalTreatment.js';
import DentalImage from '../models/DentalImage.js';
import Patient from '../models/PaitentEditProfile.js';
import Appointment from '../models/Appointment.js';
import Billing from '../models/Billing.js';
import DentalProcedureMaster from '../models/DentalProcedureMaster.js';
import mongoose from 'mongoose';

/**
 * Resolves a patient identifier (either a MongoDB ObjectId or a display
 * patientId like "000020") to the actual Patient document's _id.
 * Returns the ObjectId if already valid, otherwise looks up by display ID.
 */
const resolvePatientObjectId = async (patientId, organizationId) => {
  // If it already looks like a valid ObjectId, use it directly
  if (mongoose.Types.ObjectId.isValid(patientId) && String(new mongoose.Types.ObjectId(patientId)) === patientId) {
    return patientId;
  }
  // Otherwise treat it as a display patientId (e.g. "000020") and look up the real _id
  const patient = await Patient.findOne({ patientId, organizationId }).select('_id').lean();
  if (!patient) {
    // Also try without organizationId filter in case org is not set
    const patientFallback = await Patient.findOne({ patientId }).select('_id').lean();
    if (!patientFallback) return null;
    return patientFallback._id;
  }
  return patient._id;
};

// ==========================================
// DENTIST DASHBOARD ENDPOINTS
// ==========================================

export const getDentistDashboard = async (req, res) => {
  try {
    const organizationId = req.tenantId;

    // 1. KPI Counts
    const treatments = await DentalTreatment.find({ organizationId });
    
    let rcts = 0;
    let extractions = 0;
    let ortho = 0;
    let planned = 0;
    let inProgress = 0;
    let completed = 0;
    let totalEstimated = 0;
    let totalPaid = 0;
    let totalDue = 0;

    treatments.forEach(t => {
      const proc = t.procedure.toLowerCase();
      if (proc.includes('rct') || proc.includes('canal')) rcts++;
      if (proc.includes('extraction') || proc.includes('extract') || proc.includes('removal')) extractions++;
      if (proc.includes('ortho') || proc.includes('brace') || proc.includes('alignment')) ortho++;

      if (t.status === 'Planned') planned++;
      else if (t.status === 'In Progress') inProgress++;
      else if (t.status === 'Completed') completed++;

      totalEstimated += t.estimatedCost || 0;
      totalPaid += t.paidAmount || 0;
      totalDue += t.dueAmount || 0;
    });

    // 2. Today's Dental Appointments
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayAppointments = await Appointment.find({
      organizationId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('patientId', 'name mobile gender age');

    // Filter appointments for doctors who are dentists or organizations with dental-specific notes
    // For dashboard simplicity, list all dental appointments or first 10
    const dentalAppointments = todayAppointments.slice(0, 10);

    // 3. High-Priority Dental Cases
    const highPriorityCases = await DentalTreatment.find({
      organizationId,
      $or: [
        { priority: 'High', status: { $ne: 'Completed' } },
        { dueAmount: { $gt: 1000 } }
      ]
    })
      .populate('patientId', 'name patientId mobile')
      .sort({ dueAmount: -1, priority: 1 })
      .limit(10);

    // 4. Treatment progress trend (last 6 months)
    // Create an elegant chart payload
    const progressTrend = [
      { month: 'Jan', completed: 0, planned: 0 },
      { month: 'Feb', completed: 0, planned: 0 },
      { month: 'Mar', completed: 0, planned: 0 },
      { month: 'Apr', completed: 0, planned: 0 },
      { month: 'May', completed: 0, planned: 0 },
      { month: 'Jun', completed: 0, planned: 0 },
    ];

    res.json({
      kpis: {
        totalCases: treatments.length,
        rcts,
        extractions,
        ortho,
        planned,
        inProgress,
        completed,
        totalEstimated,
        totalPaid,
        totalDue
      },
      todayAppointments: dentalAppointments,
      highPriorityCases,
      progressTrend
    });
  } catch (error) {
    console.error('Error fetching dentist dashboard:', error);
    res.status(500).json({ message: 'Error fetching dentist dashboard statistics', error: error.message });
  }
};


// ==========================================
// DENTAL TREATMENTS CRUD API
// ==========================================

// List all treatments for a patient
export const getPatientTreatments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId;

    // Resolve display patientId (e.g. "000020") to actual MongoDB ObjectId
    const resolvedId = await resolvePatientObjectId(patientId, organizationId);
    if (!resolvedId) {
      return res.json([]); // Patient not found — return empty, not a crash
    }

    const treatments = await DentalTreatment.find({ 
      organizationId,
      patientId: resolvedId 
    }).sort({ createdAt: -1 });

    res.json(treatments);
  } catch (error) {
    console.error('Error fetching patient treatments:', error);
    res.status(500).json({ message: 'Error fetching patient dental treatments', error: error.message });
  }
};

// Create a new treatment
export const createTreatment = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId;
    const { toothNumber, procedure, notes, estimatedCost, discount, paidAmount, status, priority, nextVisitDate } = req.body;

    if (!toothNumber || !procedure) {
      return res.status(400).json({ message: 'Tooth number and procedure name are required' });
    }

    // Resolve display patientId to actual MongoDB ObjectId
    const resolvedId = await resolvePatientObjectId(patientId, organizationId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const newTreatment = new DentalTreatment({
      organizationId,
      patientId: resolvedId,
      toothNumber,
      procedure,
      notes,
      estimatedCost: estimatedCost || 0,
      discount: discount || 0,
      paidAmount: paidAmount || 0,
      status: status || 'Planned',
      priority: priority || 'Medium',
      nextVisitDate
    });

    await newTreatment.save();

    res.status(201).json(newTreatment);
  } catch (error) {
    console.error('Error creating dental treatment:', error);
    res.status(500).json({ message: 'Error saving new dental treatment plan', error: error.message });
  }
};

// Update an existing treatment
export const updateTreatment = async (req, res) => {
  try {
    const { treatmentId } = req.params;
    const organizationId = req.tenantId;
    const { toothNumber, procedure, notes, estimatedCost, discount, paidAmount, status, priority, nextVisitDate } = req.body;

    const treatment = await DentalTreatment.findOne({ _id: treatmentId, organizationId });
    if (!treatment) {
      return res.status(404).json({ message: 'Dental treatment record not found' });
    }

    if (toothNumber !== undefined) treatment.toothNumber = toothNumber;
    if (procedure !== undefined) treatment.procedure = procedure;
    if (notes !== undefined) treatment.notes = notes;
    if (estimatedCost !== undefined) treatment.estimatedCost = estimatedCost;
    if (discount !== undefined) treatment.discount = discount;
    if (paidAmount !== undefined) treatment.paidAmount = paidAmount;
    if (status !== undefined) treatment.status = status;
    if (priority !== undefined) treatment.priority = priority;
    if (nextVisitDate !== undefined) treatment.nextVisitDate = nextVisitDate;

    await treatment.save();

    res.json(treatment);
  } catch (error) {
    console.error('Error updating dental treatment:', error);
    res.status(500).json({ message: 'Error updating dental treatment record', error: error.message });
  }
};

// Delete a treatment
export const deleteTreatment = async (req, res) => {
  try {
    const { treatmentId } = req.params;
    const organizationId = req.tenantId;

    const treatment = await DentalTreatment.findOneAndDelete({ _id: treatmentId, organizationId });
    if (!treatment) {
      return res.status(404).json({ message: 'Dental treatment record not found' });
    }

    res.json({ message: 'Dental treatment plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting dental treatment:', error);
    res.status(500).json({ message: 'Error deleting dental treatment record', error: error.message });
  }
};


// ==========================================
// TOOTH CHART ENDPOINTS
// ==========================================

export const getToothChart = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId;

    // Resolve display patientId to actual MongoDB ObjectId
    const resolvedId = await resolvePatientObjectId(patientId, organizationId);
    if (!resolvedId) {
      return res.json({}); // No patient found — return empty chart
    }

    // Aggregate treatments to list active conditions per tooth
    const treatments = await DentalTreatment.find({ organizationId, patientId: resolvedId });
    
    // Group treatments by toothNumber
    const chartData = {};
    treatments.forEach(t => {
      const tooth = t.toothNumber;
      if (!chartData[tooth]) {
        chartData[tooth] = [];
      }
      chartData[tooth].push(t);
    });

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching tooth chart:', error);
    res.status(500).json({ message: 'Error retrieving tooth chart condition logs', error: error.message });
  }
};


// ==========================================
// DENTAL IMAGES ENDPOINTS
// ==========================================

// Get all dental images for a patient
export const getPatientImages = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId;

    // Resolve display patientId (e.g. "000020") to actual MongoDB ObjectId
    const resolvedId = await resolvePatientObjectId(patientId, organizationId);
    if (!resolvedId) {
      return res.json([]); // Patient not found — return empty, not a crash
    }

    const images = await DentalImage.find({ organizationId, patientId: resolvedId }).sort({ date: -1 });
    res.json(images);
  } catch (error) {
    console.error('Error fetching patient dental images:', error);
    res.status(500).json({ message: 'Error retrieving dental clinical images', error: error.message });
  }
};

// Upload a dental image
export const uploadDentalImage = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId;
    const { imageType, imageUrl, publicId, notes, date } = req.body;

    if (!imageType || !imageUrl) {
      return res.status(400).json({ message: 'Image type and Image URL are required' });
    }

    // Resolve display patientId to actual MongoDB ObjectId
    const resolvedId = await resolvePatientObjectId(patientId, organizationId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const newImage = new DentalImage({
      organizationId,
      patientId: resolvedId,
      imageType,
      imageUrl,
      publicId: publicId || '',
      notes: notes || '',
      date: date || new Date()
    });

    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    console.error('Error uploading dental image:', error);
    res.status(500).json({ message: 'Error saving patient dental image log', error: error.message });
  }
};

// Delete a dental image
export const deleteDentalImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const organizationId = req.tenantId;

    const image = await DentalImage.findOneAndDelete({ _id: imageId, organizationId });
    if (!image) {
      return res.status(404).json({ message: 'Dental image record not found' });
    }

    res.json({ message: 'Dental image deleted successfully' });
  } catch (error) {
    console.error('Error deleting dental image:', error);
    res.status(500).json({ message: 'Error deleting patient dental image log', error: error.message });
  }
};

// ==========================================
// CUSTOM PROCEDURES MASTER ENDPOINTS
// ==========================================

// Get custom procedures master list for organization
export const getCustomProcedures = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const procedures = await DentalProcedureMaster.find({ 
      organizationId,
      isActive: true 
    }).sort({ name: 1 });
    res.json(procedures);
  } catch (error) {
    console.error('Error fetching custom dental procedures:', error);
    res.status(500).json({ message: 'Error fetching custom dental procedures', error: error.message });
  }
};

// Create a new custom procedure master entry
export const createCustomProcedure = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { name, defaultCost } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Procedure name is required' });
    }

    const trimmedName = name.trim();

    // Check case-insensitive duplicate for the same tenant
    const existing = await DentalProcedureMaster.findOne({
      organizationId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ message: 'A procedure with this name already exists' });
    }

    const newProcedure = new DentalProcedureMaster({
      organizationId,
      name: trimmedName,
      defaultCost: Number(defaultCost) || 0
    });

    await newProcedure.save();
    res.status(201).json(newProcedure);
  } catch (error) {
    console.error('Error creating custom dental procedure:', error);
    res.status(500).json({ message: 'Error saving custom dental procedure', error: error.message });
  }
};
