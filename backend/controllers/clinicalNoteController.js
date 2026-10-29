import mongoose from 'mongoose';
import PatientClinicalNote from '../models/PatientClinicalNote.js';

// Helper to resolve patient ID (supporting both MongoDB ObjectId and custom sequential display patientId)
const resolvePatientId = async (patientId, organizationId) => {
  if (!patientId) return null;
  if (mongoose.Types.ObjectId.isValid(patientId)) {
    return patientId;
  }
  const Patient = mongoose.model('Patient');
  const patient = await Patient.findOne({ patientId, organizationId });
  return patient ? patient._id : null;
};

/**
 * List all clinical and appointment notes for an organization / clinic
 * Supports filtering by timeframe ('today' vs 'all'), priority, noteType, search query
 */
export const getAllClinicNotes = async (req, res) => {
  try {
    const rawOrg = req.tenantId || req.user?.organizationId;
    const organizationId = (rawOrg && typeof rawOrg === 'object' && rawOrg._id) ? rawOrg._id : rawOrg;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization context missing' });
    }

    const { timeframe, priority, noteType, search, doctorId } = req.query;

    const baseQuery = {
      organizationId,
      isDeleted: false
    };

    // Visibility logic: Internal notes hidden from non-clinical staff
    const canSeeInternal = ['admin', 'doctor', 'superadmin', 'orgadmin'].includes(req.user?.role);
    if (!canSeeInternal) {
      baseQuery.visibility = { $ne: 'internal' };
    }

    if (priority && priority !== 'all') {
      baseQuery.priority = priority;
    }

    if (noteType && noteType !== 'all') {
      baseQuery.noteType = noteType;
    }

    if (doctorId && doctorId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(doctorId)) {
        baseQuery.doctorId = doctorId;
      }
    }

    // Timeframe: Today vs All
    // Calculate today's boundaries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayYMD = now.toISOString().split('T')[0];

    const todayFilter = {
      $or: [
        { createdAt: { $gte: startOfToday, $lte: endOfToday } },
        { appointmentDate: todayYMD }
      ]
    };

    let query = { ...baseQuery };
    if (timeframe === 'today') {
      query = {
        ...query,
        ...todayFilter
      };
    }

    // Search filter across note text, title, patientName, doctorName
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { note: regex },
          { title: regex },
          { patientName: regex },
          { doctorName: regex },
          { patientPhone: regex }
        ]
      });
    }

    // Fetch notes from PatientClinicalNote
    const notes = await PatientClinicalNote.find(query)
      .populate('patientId', 'firstName lastName fullName patientId mobile gender age ageType')
      .populate('doctorId', 'name specialization doctorId fee')
      .populate('createdBy', 'firstName lastName name role')
      .sort({ createdAt: -1 })
      .lean();

    // Deduplicate notes: ensure same note text for the same patient/appointment within a 10-minute window only appears once
    const uniqueNotes = [];
    const duplicateIdsToDelete = [];

    for (let i = 0; i < notes.length; i++) {
      const current = notes[i];
      const curText = (current.note || '').trim();
      const curApt = current.appointmentId ? String(current.appointmentId) : '';
      const curPat = current.patientId?._id ? String(current.patientId._id) : (current.patientName || '');

      const isDuplicate = uniqueNotes.some(prev => {
        const prevText = (prev.note || '').trim();
        if (prevText !== curText) return false;

        // Exactly the same appointment
        if (curApt && prev.appointmentId && String(prev.appointmentId) === curApt) {
          return true;
        }

        // Same patient and note text created within 10 minutes of each other
        const prevPat = prev.patientId?._id ? String(prev.patientId._id) : (prev.patientName || '');
        if (curPat && prevPat && curPat === prevPat) {
          const timeDiff = Math.abs(new Date(prev.createdAt) - new Date(current.createdAt));
          if (timeDiff < 10 * 60 * 1000) {
            return true;
          }
        }
        return false;
      });

      if (isDuplicate) {
        duplicateIdsToDelete.push(current._id);
      } else {
        uniqueNotes.push(current);
      }
    }

    // Clean up duplicate records in DB asynchronously
    if (duplicateIdsToDelete.length > 0) {
      PatientClinicalNote.deleteMany({ _id: { $in: duplicateIdsToDelete } }).catch(err => {
        console.error('Failed to purge duplicate notes:', err);
      });
    }

    // Calculate counts for stats
    const totalCount = uniqueNotes.length;
    const todayCount = uniqueNotes.filter(n => {
      const cDate = new Date(n.createdAt);
      return (cDate >= startOfToday && cDate <= endOfToday) || n.appointmentDate === todayYMD;
    }).length;

    res.status(200).json({
      success: true,
      notes: uniqueNotes,
      stats: {
        totalCount,
        todayCount
      }
    });
  } catch (error) {
    console.error('[ClinicalNoteController] getAllClinicNotes failed:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notes', error: error.message });
  }
};

/**
 * Create a standalone note or appointment note
 */
export const createStandaloneNote = async (req, res) => {
  try {
    const rawOrg = req.tenantId || req.user?.organizationId;
    const organizationId = (rawOrg && typeof rawOrg === 'object' && rawOrg._id) ? rawOrg._id : rawOrg;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization context missing' });
    }

    const {
      patientId,
      patientName,
      patientPhone,
      doctorId,
      doctorName,
      appointmentId,
      appointmentDate,
      appointmentTime,
      noteType = 'general',
      title = 'Note',
      note,
      privateNote,
      visibility = 'clinical',
      priority = 'medium',
      tags = []
    } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty' });
    }

    let resolvedPatientId = null;
    let resolvedPatientName = patientName || '';
    let resolvedPatientPhone = patientPhone || '';

    if (patientId) {
      resolvedPatientId = await resolvePatientId(patientId, organizationId);
      if (resolvedPatientId) {
        const Patient = mongoose.model('Patient');
        const pDoc = await Patient.findById(resolvedPatientId);
        if (pDoc) {
          resolvedPatientName = resolvedPatientName || pDoc.fullName || `${pDoc.firstName} ${pDoc.lastName}`.trim();
          resolvedPatientPhone = resolvedPatientPhone || pDoc.mobile || '';
        }
      }
    }

    let resolvedDoctorId = undefined;
    let resolvedDoctorName = doctorName || '';
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
      resolvedDoctorId = doctorId;
    } else if (req.user?.role === 'doctor') {
      resolvedDoctorId = req.user._id;
      resolvedDoctorName = resolvedDoctorName || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
    }

    const newNote = new PatientClinicalNote({
      organizationId,
      patientId: resolvedPatientId || undefined,
      patientName: resolvedPatientName,
      patientPhone: resolvedPatientPhone,
      doctorId: resolvedDoctorId,
      doctorName: resolvedDoctorName,
      appointmentId: appointmentId && mongoose.Types.ObjectId.isValid(appointmentId) ? appointmentId : undefined,
      appointmentDate: appointmentDate || new Date().toISOString().split('T')[0],
      appointmentTime: appointmentTime || '',
      noteType,
      title: title || 'Clinical Note',
      note: note.trim(),
      privateNote,
      visibility,
      priority,
      tags,
      createdBy: req.user?._id,
      createdByRole: req.user?.role || 'doctor'
    });

    await newNote.save();

    const populatedNote = await PatientClinicalNote.findById(newNote._id)
      .populate('patientId', 'firstName lastName fullName patientId mobile gender age ageType')
      .populate('doctorId', 'name specialization doctorId')
      .populate('createdBy', 'firstName lastName name role')
      .lean();

    res.status(201).json({ success: true, note: populatedNote || newNote });
  } catch (error) {
    console.error('[ClinicalNoteController] createStandaloneNote failed:', error);
    res.status(500).json({ success: false, message: 'Failed to create note', error: error.message });
  }
};

/**
 * Create a new clinical note for a specific patient
 */
export const createNote = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId || req.user?.organizationId;
    
    const resolvedPatientId = await resolvePatientId(patientId, organizationId);
    if (!resolvedPatientId) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const Patient = mongoose.model('Patient');
    const pDoc = await Patient.findById(resolvedPatientId);

    const { 
      noteType = 'general', title, note, privateNote, visibility = 'clinical', 
      followUpRequired, followUpDate, priority = 'medium', tags, appointmentId,
      appointmentDate, appointmentTime, doctorName, doctorId
    } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty' });
    }

    const newNote = new PatientClinicalNote({
      organizationId,
      patientId: resolvedPatientId,
      patientName: pDoc ? (pDoc.fullName || `${pDoc.firstName} ${pDoc.lastName}`.trim()) : '',
      patientPhone: pDoc ? pDoc.mobile : '',
      doctorId: doctorId || (req.user?.role === 'doctor' ? req.user._id : undefined),
      doctorName: doctorName || (req.user?.role === 'doctor' ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : ''),
      appointmentId,
      appointmentDate,
      appointmentTime,
      noteType,
      title: title || 'Clinical Note',
      note: note.trim(),
      privateNote,
      visibility,
      followUpRequired,
      followUpDate,
      priority,
      tags,
      createdBy: req.user?._id,
      createdByRole: req.user?.role || 'doctor'
    });

    await newNote.save();
    res.status(201).json({ success: true, note: newNote });
  } catch (error) {
    console.error('[ClinicalNoteController] Create failed:', error);
    res.status(500).json({ success: false, message: 'Failed to create clinical note', error: error.message });
  }
};

/**
 * List clinical notes for a patient
 */
export const listNotes = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId || req.user?.organizationId;
    
    const resolvedPatientId = await resolvePatientId(patientId, organizationId);
    if (!resolvedPatientId) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const { type, priority, followUp } = req.query;

    let query = { 
      organizationId, 
      patientId: resolvedPatientId, 
      isDeleted: false 
    };

    if (type) query.noteType = type;
    if (priority) query.priority = priority;
    if (followUp === 'true') query.followUpRequired = true;

    const canSeeInternal = ['admin', 'doctor', 'superadmin', 'orgadmin'].includes(req.user?.role);
    if (!canSeeInternal) {
      query.visibility = { $ne: 'internal' };
    }

    const notes = await PatientClinicalNote.find(query)
      .populate('createdBy', 'firstName lastName name role')
      .populate('doctorId', 'name specialization doctorId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, notes });
  } catch (error) {
    console.error('[ClinicalNoteController] List failed:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clinical notes', error: error.message });
  }
};

/**
 * Get single note details
 */
export const getNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const organizationId = req.tenantId || req.user?.organizationId;

    const note = await PatientClinicalNote.findOne({ _id: noteId, organizationId, isDeleted: false })
      .populate('createdBy', 'firstName lastName name role')
      .populate('patientId', 'firstName lastName fullName patientId mobile gender age')
      .populate('doctorId', 'name specialization doctorId');

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    if (note.visibility === 'internal' && !['admin', 'doctor', 'superadmin', 'orgadmin'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Access denied to internal notes' });
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch note details' });
  }
};

/**
 * Update clinical note
 */
export const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const organizationId = req.tenantId || req.user?.organizationId;

    const note = await PatientClinicalNote.findOne({ _id: noteId, organizationId, isDeleted: false });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    // Allow creator or admin/doctor to edit
    const isAuthorized = !note.createdBy ||
      note.createdBy.toString() === req.user?._id?.toString() ||
      ['admin', 'orgadmin', 'superadmin', 'doctor'].includes(req.user?.role);

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this note' });
    }

    const updatedNote = await PatientClinicalNote.findByIdAndUpdate(
      noteId,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    )
      .populate('patientId', 'firstName lastName fullName patientId mobile gender age')
      .populate('doctorId', 'name specialization doctorId')
      .populate('createdBy', 'firstName lastName name role');

    res.status(200).json({ success: true, note: updatedNote });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

/**
 * Soft delete clinical note
 */
export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const organizationId = req.tenantId || req.user?.organizationId;

    const note = await PatientClinicalNote.findOne({ _id: noteId, organizationId, isDeleted: false });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const isAuthorized = !note.createdBy ||
      note.createdBy.toString() === req.user?._id?.toString() ||
      ['admin', 'orgadmin', 'superadmin', 'doctor'].includes(req.user?.role);

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this note' });
    }

    note.isDeleted = true;
    await note.save();

    res.status(200).json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};
