import DentalLaboratory from '../models/DentalLaboratory.js';
import DentalLabCase from '../models/DentalLabCase.js';

// ==========================================
// DENTAL LABORATORIES CRUD
// ==========================================

// Create new laboratory
export const createLaboratory = async (req, res) => {
  try {
    const { name, contactPerson, phone, address, notes } = req.body;
    const organizationId = req.tenantId;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Laboratory name is required.' });
    }

    const laboratory = new DentalLaboratory({
      organizationId,
      name,
      contactPerson,
      phone,
      address,
      notes
    });

    await laboratory.save();
    res.status(201).json({ success: true, laboratory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all laboratories for organization
export const getLaboratories = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const laboratories = await DentalLaboratory.find({ organizationId }).sort({ name: 1 });
    res.status(200).json({ success: true, laboratories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update laboratory details
export const updateLaboratory = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.tenantId;
    const { name, contactPerson, phone, address, notes } = req.body;

    const laboratory = await DentalLaboratory.findOneAndUpdate(
      { _id: id, organizationId },
      { name, contactPerson, phone, address, notes },
      { new: true }
    );

    if (!laboratory) {
      return res.status(404).json({ success: false, message: 'Laboratory not found.' });
    }

    res.status(200).json({ success: true, laboratory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete laboratory
export const deleteLaboratory = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.tenantId;

    const laboratory = await DentalLaboratory.findOneAndDelete({ _id: id, organizationId });

    if (!laboratory) {
      return res.status(404).json({ success: false, message: 'Laboratory not found.' });
    }

    res.status(200).json({ success: true, message: 'Laboratory deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ==========================================
// DENTAL LAB CASES CRUD & WORKFLOW
// ==========================================

// Create a new lab case
export const createLabCase = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const {
      patientId,
      patientName,
      dentistName,
      toothNumbers,
      toothType,
      toothTypeCustom,
      laboratoryId,
      laboratoryName,
      caseId,
      sendingDate,
      expectedReturnDate,
      status,
      notes,
      instructions,
      attachments
    } = req.body;

    if (!patientId || !patientName || !laboratoryId || !laboratoryName || !caseId || !toothType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient, lab, case ID, and tooth/prosthesis type are required.'
      });
    }

    const labCase = new DentalLabCase({
      organizationId,
      patientId,
      patientName,
      dentistName: dentistName || req.user?.name || 'Unknown Doctor',
      toothNumbers: Array.isArray(toothNumbers) ? toothNumbers : [toothNumbers],
      toothType,
      toothTypeCustom,
      laboratoryId,
      laboratoryName,
      caseId,
      sendingDate: sendingDate || new Date(),
      expectedReturnDate,
      status: status || 'Draft',
      notes,
      instructions,
      attachments: attachments || []
    });

    await labCase.save();
    res.status(201).json({ success: true, labCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all lab cases (with filtering, search and pagination)
export const getLabCases = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { filter, search, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { organizationId };

    // Quick category filters
    if (filter) {
      const now = new Date();
      switch (filter) {
        case 'With Lab':
          query.status = 'Sent to Lab';
          break;
        case 'In Progress':
          query.status = 'In Progress';
          break;
        case 'Received':
          query.status = 'Received';
          break;
        case 'Delivered':
          query.status = 'Delivered';
          break;
        case 'Overdue':
          // Exclude received/delivered/cancelled cases and check if expectedReturnDate has passed
          query.status = { $nin: ['Received', 'Delivered', 'Cancelled'] };
          query.expectedReturnDate = { $lt: now };
          break;
        default:
          if (filter !== 'All') {
            query.status = filter;
          }
          break;
      }
    }

    // Text Search (patientName, caseId, laboratoryName)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { patientName: searchRegex },
        { caseId: searchRegex },
        { laboratoryName: searchRegex }
      ];
    }

    // Date range filtering on sendingDate
    if (startDate || endDate) {
      query.sendingDate = {};
      if (startDate) {
        query.sendingDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.sendingDate.$lte = new Date(endDate);
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await DentalLabCase.countDocuments(query);
    const cases = await DentalLabCase.find(query)
      .sort({ sendingDate: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      cases,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get lab cases for a specific patient
export const getPatientLabCases = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { patientId } = req.params;

    const cases = await DentalLabCase.find({ organizationId, patientId })
      .sort({ sendingDate: -1 });

    res.status(200).json({ success: true, cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single lab case details
export const getLabCaseById = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { id } = req.params;

    const labCase = await DentalLabCase.findOne({ _id: id, organizationId });

    if (!labCase) {
      return res.status(404).json({ success: false, message: 'Lab case not found.' });
    }

    res.status(200).json({ success: true, labCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update lab case details
export const updateLabCase = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { id } = req.params;
    const updates = req.body;

    // Remove immutable fields
    delete updates.organizationId;
    delete updates._id;

    if (updates.status === 'Received' && !updates.receivedDate) {
      updates.receivedDate = new Date();
    }

    const labCase = await DentalLabCase.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updates },
      { new: true }
    );

    if (!labCase) {
      return res.status(404).json({ success: false, message: 'Lab case not found.' });
    }

    res.status(200).json({ success: true, labCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update lab case status (one-click actions)
export const patchLabCaseStatus = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { id } = req.params;
    const { status, receivedDate } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const updates = { status };
    if (status === 'Received') {
      updates.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
    }

    const labCase = await DentalLabCase.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updates },
      { new: true }
    );

    if (!labCase) {
      return res.status(404).json({ success: false, message: 'Lab case not found.' });
    }

    res.status(200).json({ success: true, labCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete lab case
export const deleteLabCase = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { id } = req.params;

    const labCase = await DentalLabCase.findOneAndDelete({ _id: id, organizationId });

    if (!labCase) {
      return res.status(404).json({ success: false, message: 'Lab case not found.' });
    }

    res.status(200).json({ success: true, message: 'Lab case deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
