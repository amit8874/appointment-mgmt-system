import Receptionist from '../models/Receptionist.js';
import Counter from '../models/Counter.js';
import Subscription from '../models/Subscription.js';

// GET /api/receptionists - Get all receptionists
export const getAllReceptionists = async (req, res) => {
  try {
    const receptionists = await Receptionist.find({ organizationId: req.tenantId }).sort({ createdAt: -1 });
    const formattedReceptionists = receptionists.map(receptionist => ({
      id: receptionist.receptionistId,
      _id: receptionist._id,
      name: receptionist.name,
      gender: receptionist.gender,
      dob: receptionist.dob,
      email: receptionist.email,
      phone: receptionist.phone,
      address: receptionist.address,
      joinDate: receptionist.joinDate,
      shift: receptionist.shift,
      status: receptionist.status,
      profilePhoto: receptionist.profilePhoto,
      emergencyContact: receptionist.emergencyContact,
      emergencyPhone: receptionist.emergencyPhone,
      role: receptionist.role,
      salary: receptionist.salary,
      workingHours: receptionist.workingHours,
      availability: receptionist.availability,
    }));
    res.json(formattedReceptionists);
  } catch (error) {
    console.error('Error fetching receptionists:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/receptionists/count - Get receptionist count
export const getReceptionistCount = async (req, res) => {
  try {
    const count = await Receptionist.countDocuments({ organizationId: req.tenantId, status: 'Active' });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching receptionist count:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/receptionists - Add a new receptionist
export const addReceptionist = async (req, res) => {
  try {
    // Check subscription limits
    const subscription = await Subscription.findOne({ organizationId: req.tenantId });
    const currentCount = await Receptionist.countDocuments({ 
      organizationId: req.tenantId, 
      status: 'Active' 
    });

    const limit = subscription?.limits?.receptionists || 1;
    
    if (limit !== -1 && currentCount >= limit) {
      return res.status(403).json({ 
        message: `Receptionist limit reached for your ${subscription?.planName || 'Free'} plan. Please upgrade to add more.` 
      });
    }

    const {
      name,
      gender,
      dob,
      email,
      phone,
      address,
      joinDate,
      shift,
      status,
      profilePhoto,
      emergencyContact,
      emergencyPhone,
      role,
      salary,
      workingHours,
      availability
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Generate receptionist ID using counter
    const counter = await Counter.findOneAndUpdate(
      { name: 'receptionistId' },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const receptionistId = `REC${String(counter.value).padStart(3, '0')}`;

    // Handle profile photo upload
    let profilePhotoPath = profilePhoto;
    if (req.file) {
      profilePhotoPath = `/uploads/${req.file.filename}`;
    }

    // Parse JSON fields
    let parsedWorkingHours = { start: '09:00', end: '17:00' };
    let parsedAvailability = {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    };

    if (workingHours) {
      if (typeof workingHours === 'string') {
        try {
          parsedWorkingHours = JSON.parse(workingHours);
        } catch (error) {
          console.error('Error parsing workingHours:', error);
          return res.status(400).json({ message: 'Invalid workingHours format' });
        }
      } else if (typeof workingHours === 'object') {
        parsedWorkingHours = workingHours;
      }
    }

    if (availability) {
      if (typeof availability === 'string') {
        try {
          parsedAvailability = JSON.parse(availability);
        } catch (error) {
          console.error('Error parsing availability:', error);
          return res.status(400).json({ message: 'Invalid availability format' });
        }
      } else if (typeof availability === 'object') {
        parsedAvailability = availability;
      }
    }

    // Create new receptionist
    const newReceptionist = new Receptionist({
      receptionistId,
      name: name.trim(),
      gender: gender || 'Female',
      dob,
      email: email ? email.trim().toLowerCase() : undefined,
      phone: phone ? phone.trim() : undefined,
      address: address ? address.trim() : undefined,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      shift: shift || 'Morning',
      status: status || 'Active',
      profilePhoto: profilePhotoPath,
      emergencyContact: emergencyContact ? emergencyContact.trim() : undefined,
      emergencyPhone: emergencyPhone ? emergencyPhone.trim() : undefined,
      role: role || 'Receptionist',
      salary: salary ? parseFloat(salary) : 0,
      workingHours: parsedWorkingHours,
      availability: parsedAvailability,
    });

    const savedReceptionist = await newReceptionist.save();

    const formattedReceptionist = {
      id: savedReceptionist.receptionistId,
      _id: savedReceptionist._id,
      name: savedReceptionist.name,
      gender: savedReceptionist.gender,
      dob: savedReceptionist.dob,
      email: savedReceptionist.email,
      phone: savedReceptionist.phone,
      address: savedReceptionist.address,
      joinDate: savedReceptionist.joinDate,
      shift: savedReceptionist.shift,
      status: savedReceptionist.status,
      profilePhoto: savedReceptionist.profilePhoto,
      emergencyContact: savedReceptionist.emergencyContact,
      emergencyPhone: savedReceptionist.emergencyPhone,
      role: savedReceptionist.role,
      salary: savedReceptionist.salary,
      workingHours: savedReceptionist.workingHours,
      availability: savedReceptionist.availability,
    };

    res.status(201).json(formattedReceptionist);
  } catch (error) {
    console.error('Error adding receptionist:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Receptionist ID already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// PUT /api/receptionists/:id - Update a receptionist
export const updateReceptionist = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Handle profile photo upload for updates
    if (req.file) {
      updates.profilePhoto = `/uploads/${req.file.filename}`;
    }

    // Parse JSON fields if they exist
    if (updates.workingHours) {
      if (typeof updates.workingHours === 'string') {
        try {
          updates.workingHours = JSON.parse(updates.workingHours);
        } catch (error) {
          console.error('Error parsing workingHours:', error);
          return res.status(400).json({ message: 'Invalid workingHours format' });
        }
      }
      // If it's already an object, keep it as is
    }

    if (updates.availability) {
      if (typeof updates.availability === 'string') {
        try {
          updates.availability = JSON.parse(updates.availability);
        } catch (error) {
          console.error('Error parsing availability:', error);
          return res.status(400).json({ message: 'Invalid availability format' });
        }
      }
      // If it's already an object, keep it as is
    }

    const receptionist = await Receptionist.findOneAndUpdate(
      { receptionistId: id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!receptionist) {
      return res.status(404).json({ message: 'Receptionist not found' });
    }

    const formattedReceptionist = {
      id: receptionist.receptionistId,
      _id: receptionist._id,
      name: receptionist.name,
      gender: receptionist.gender,
      dob: receptionist.dob,
      email: receptionist.email,
      phone: receptionist.phone,
      address: receptionist.address,
      joinDate: receptionist.joinDate,
      shift: receptionist.shift,
      status: receptionist.status,
      profilePhoto: receptionist.profilePhoto,
      emergencyContact: receptionist.emergencyContact,
      emergencyPhone: receptionist.emergencyPhone,
      role: receptionist.role,
      salary: receptionist.salary,
      workingHours: receptionist.workingHours,
      availability: receptionist.availability,
    };

    res.json(formattedReceptionist);
  } catch (error) {
    console.error('Error updating receptionist:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/receptionists/:id - Delete a receptionist
export const deleteReceptionist = async (req, res) => {
  try {
    const { id } = req.params;
    const receptionist = await Receptionist.findOneAndDelete({ receptionistId: id });

    if (!receptionist) {
      return res.status(404).json({ message: 'Receptionist not found' });
    }

    res.json({ message: 'Receptionist deleted successfully' });
  } catch (error) {
    console.error('Error deleting receptionist:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
