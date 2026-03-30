import Specialization from '../models/Specialization.js';

export const getSpecializations = async (req, res) => {
  try {
    const specializations = await Specialization.find().sort({ name: 1 });
    res.json(specializations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching specializations', error: error.message });
  }
};

export const createSpecialization = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Check if specialization already exists (case-insensitive)
    const existing = await Specialization.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    const specialization = new Specialization({ name });
    await specialization.save();
    res.status(201).json(specialization);
  } catch (error) {
    res.status(500).json({ message: 'Error creating specialization', error: error.message });
  }
};
