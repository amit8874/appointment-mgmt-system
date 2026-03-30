import Council from '../models/Council.js';

export const getCouncils = async (req, res) => {
  try {
    const councils = await Council.find().sort({ name: 1 });
    res.json(councils);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching councils', error: error.message });
  }
};

export const createCouncil = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Check if council already exists (case-insensitive)
    const existing = await Council.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    const council = new Council({ name });
    await council.save();
    res.status(201).json(council);
  } catch (error) {
    res.status(500).json({ message: 'Error creating council', error: error.message });
  }
};
