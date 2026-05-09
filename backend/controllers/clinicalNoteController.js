import PatientClinicalNote from '../models/PatientClinicalNote.js';

/**
 * Create a new clinical note
 */
export const createNote = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId;
    const { 
      noteType, title, note, privateNote, visibility, 
      followUpRequired, followUpDate, priority, tags, appointmentId 
    } = req.body;

    const newNote = new PatientClinicalNote({
      organizationId,
      patientId,
      doctorId: req.user.role === 'doctor' ? req.user._id : undefined,
      appointmentId,
      noteType,
      title,
      note,
      privateNote,
      visibility,
      followUpRequired,
      followUpDate,
      priority,
      tags,
      createdBy: req.user._id,
      createdByRole: req.user.role
    });

    await newNote.save();
    res.status(201).json({ success: true, note: newNote });
  } catch (error) {
    console.error('[ClinicalNoteController] Create failed:', error);
    res.status(500).json({ message: 'Failed to create clinical note', error: error.message });
  }
};

/**
 * List clinical notes for a patient
 */
export const listNotes = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.tenantId;
    const { type, priority, followUp } = req.query;

    let query = { 
      organizationId, 
      patientId, 
      isDeleted: false 
    };

    // Filters
    if (type) query.noteType = type;
    if (priority) query.priority = priority;
    if (followUp === 'true') query.followUpRequired = true;

    // Visibility logic: Internal notes hidden from non-clinical staff (simplified for now)
    const canSeeInternal = ['admin', 'doctor', 'superadmin'].includes(req.user.role);
    if (!canSeeInternal) {
      query.visibility = { $ne: 'internal' };
    }

    const notes = await PatientClinicalNote.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, notes });
  } catch (error) {
    console.error('[ClinicalNoteController] List failed:', error);
    res.status(500).json({ message: 'Failed to fetch clinical notes', error: error.message });
  }
};

/**
 * Get single note details
 */
export const getNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const organizationId = req.tenantId;

    const note = await PatientClinicalNote.findOne({ _id: noteId, organizationId, isDeleted: false })
      .populate('createdBy', 'firstName lastName');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Access check for internal notes
    if (note.visibility === 'internal' && !['admin', 'doctor', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied to internal notes' });
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch note details' });
  }
};

/**
 * Update clinical note
 */
export const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const organizationId = req.tenantId;

    const note = await PatientClinicalNote.findOne({ _id: noteId, organizationId, isDeleted: false });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Only creator or admin can edit
    if (note.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to edit this note' });
    }

    const updatedNote = await PatientClinicalNote.findByIdAndUpdate(
      noteId,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    res.status(200).json({ success: true, note: updatedNote });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update note' });
  }
};

/**
 * Soft delete clinical note
 */
export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const organizationId = req.tenantId;

    const note = await PatientClinicalNote.findOne({ _id: noteId, organizationId, isDeleted: false });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Only creator or admin can delete
    if (note.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to delete this note' });
    }

    note.isDeleted = true;
    await note.save();

    res.status(200).json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete note' });
  }
};
