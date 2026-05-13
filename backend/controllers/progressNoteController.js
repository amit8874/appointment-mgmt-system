import ProgressNoteMaster from '../models/ProgressNoteMaster.js';
import mongoose from 'mongoose';

export const saveNote = async (req, res) => {
  try {
    const { note, noteType, organizationId, doctorId } = req.body;

    if (!note || !organizationId) {
      return res.status(400).json({ success: false, message: 'Note and organizationId are required' });
    }

    // Check if note already exists
    const existing = await ProgressNoteMaster.findOne({ 
      note: note.trim(), 
      organizationId 
    });

    if (existing) {
      return res.status(200).json({ 
        success: true, 
        message: 'Note already exists', 
        note: existing 
      });
    }

    const newNote = new ProgressNoteMaster({
      note: note.trim(),
      noteType,
      organizationId,
      doctorId
    });

    await newNote.save();

    res.status(201).json({ 
      success: true, 
      message: 'Note saved successfully', 
      note: newNote 
    });
  } catch (error) {
    console.error('Save Progress Note Error:', error);
    res.status(500).json({ success: false, message: 'Error saving note', error: error.message });
  }
};

export const listNotes = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { noteType } = req.query;

    const query = { organizationId, isActive: true };
    if (noteType) query.noteType = noteType;

    const notes = await ProgressNoteMaster.find(query).sort({ usageCount: -1, createdAt: -1 });

    res.status(200).json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notes', error: error.message });
  }
};

export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, noteType } = req.body;

    const updatedNote = await ProgressNoteMaster.findByIdAndUpdate(
      id,
      { note: note.trim(), noteType },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.status(200).json({ success: true, message: 'Note updated', note: updatedNote });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating note', error: error.message });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    await ProgressNoteMaster.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting note', error: error.message });
  }
};

export const incrementUsage = async (req, res) => {
  try {
    const { id } = req.params;
    await ProgressNoteMaster.findByIdAndUpdate(id, { $inc: { usageCount: 1 } });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
