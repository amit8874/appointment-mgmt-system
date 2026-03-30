import Practice from '../models/Practice.js';

export const getPractices = async (req, res) => {
  try {
    const practices = await Practice.find().sort({ name: 1 });
    res.json(practices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching practices', error: error.message });
  }
};

export const createPractice = async (req, res) => {
  try {
    const { name, street, city, state, pincode, phone } = req.body;
    if (!name || !city) {
      return res.status(400).json({ message: 'Name and city are required' });
    }

    // Check for existing practice in this city (case-insensitive)
    const existing = await Practice.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      city: { $regex: new RegExp(`^${city}$`, 'i') }
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    const practice = new Practice({ name, street, city, state, pincode, phone });
    await practice.save();
    res.status(201).json(practice);
  } catch (error) {
    res.status(500).json({ message: 'Error creating practice', error: error.message });
  }
};
