import Doctor from '../models/Doctor.js';
import Counter from '../models/Counter.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';

// Helper function to generate time slots with range format
const generateTimeSlots = (startTime, endTime, intervalMinutes = 30) => {
  const slots = [];
  const start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);

  while (start < end) {
    const slotStart = new Date(start);
    const slotEnd = new Date(start.getTime() + intervalMinutes * 60000);
    
    // Format start time
    const startHours = slotStart.getHours();
    const startMinutes = slotStart.getMinutes();
    const startAmpm = startHours >= 12 ? 'PM' : 'AM';
    const startDisplayHours = startHours % 12 || 12;
    const startStr = `${startDisplayHours}:${startMinutes.toString().padStart(2, '0')}`;
    
    // Format end time
    const endHours = slotEnd.getHours();
    const endMinutes = slotEnd.getMinutes();
    const endAmpm = endHours >= 12 ? 'PM' : 'AM';
    const endDisplayHours = endHours % 12 || 12;
    const endStr = `${endDisplayHours}:${endMinutes.toString().padStart(2, '0')}`;
    
    // Create range format like "10:00-10:30 AM" or "10:00-11:00 AM"
    const displayTime = `${startStr}-${endStr} ${startAmpm}`;
    slots.push(displayTime);
    
    start.setMinutes(start.getMinutes() + intervalMinutes);
  }
  return slots;
};

// Get all public doctors across all organizations with optional filtering
export const getGlobalPublicDoctors = async (req, res) => {
  try {
    const { speciality, city, query } = req.query;
    const dbQuery = { status: 'Active' };
    
    // If 'query' is provided, search in both name and specialization
    if (query && query.trim() !== '') {
      const regex = { $regex: query.trim(), $options: 'i' };
      dbQuery.$or = [
        { name: regex },
        { specialization: regex }
      ];
    } else if (speciality && speciality !== 'Any' && speciality.trim() !== '') {
      // Backward compatibility for 'speciality' param
      dbQuery.specialization = { $regex: speciality.trim(), $options: 'i' };
    }
    
    if (city && city !== 'Any' && city !== 'Select Location' && city.trim() !== '') {
      const cityRegex = { $regex: city.trim(), $options: 'i' };
      // Use $and if $or already exists for name/specialization
      if (dbQuery.$or) {
        dbQuery.$and = [
          { $or: dbQuery.$or },
          { $or: [
            { 'addressInfo.city': cityRegex },
            { 'address': cityRegex }
          ]}
        ];
        delete dbQuery.$or;
      } else {
        dbQuery.$or = [
          { 'addressInfo.city': cityRegex },
          { 'address': cityRegex }
        ];
      }
    }

    const doctors = await Doctor.find(dbQuery).sort({ name: 1 });

    // Remove duplicates based on doctorId to ensure unique doctors
    const uniqueDoctorsMap = new Map();
    doctors.forEach(doc => {
      if (!uniqueDoctorsMap.has(doc.doctorId)) {
        uniqueDoctorsMap.set(doc.doctorId, doc);
      }
    });
    const uniqueDoctors = Array.from(uniqueDoctorsMap.values());

    const formattedDoctors = uniqueDoctors.map(doctor => ({
      id: doctor.doctorId,
      _id: doctor._id,
      name: doctor.name,
      specialization: doctor.specialization,
      experience: doctor.experience,
      fee: doctor.fee,
      qualification: doctor.qualification,
      workingHours: doctor.workingHours,
      availability: doctor.availability,
      photo: doctor.photo,
      address: doctor.address,
      phone: doctor.phone,
      status: doctor.status,
      organizationId: doctor.organizationId
    }));
    
    res.json(formattedDoctors);
  } catch (error) {
    console.error('Error fetching global public doctors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get search suggestions for specialities and doctors
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const regex = { $regex: q.trim(), $options: 'i' };

    // Find specializations and doctor names matching the query
    const results = await Doctor.find({ status: 'Active' })
      .or([{ name: regex }, { specialization: regex }])
      .select('name specialization')
      .limit(10);

    // Extract unique specializations and names
    const suggestionsSet = new Set();
    results.forEach(doc => {
      if (doc.specialization.toLowerCase().includes(q.toLowerCase())) {
        suggestionsSet.add(doc.specialization);
      }
      if (doc.name.toLowerCase().includes(q.toLowerCase())) {
        suggestionsSet.add(doc.name);
      }
    });

    // Convert Set to sorted array and limit
    const suggestions = Array.from(suggestionsSet)
      .sort()
      .slice(0, 10);

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get all doctors for a specific org (Public)
export const getPublicDoctors = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const doctors = await Doctor.find({ 
      organizationId,
      status: 'Active' 
    }).sort({ name: 1 });

    const formattedDoctors = doctors.map(doctor => ({
      id: doctor.doctorId,
      _id: doctor._id,
      name: doctor.name,
      specialization: doctor.specialization,
      experience: doctor.experience,
      gender: doctor.gender,
      languages: doctor.languages,
      fee: doctor.fee,
      qualification: doctor.qualification,
      workingHours: doctor.workingHours,
      availability: doctor.availability,
      photo: doctor.photo,
      address: doctor.address,
      phone: doctor.phone,
      status: doctor.status,
    }));
    
    res.json(formattedDoctors);
  } catch (error) {
    console.error('Error fetching public doctors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available slots for a doctor on a specific date (Public)
export const getDoctorSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    // Find the doctor - try both doctorId and _id
    let doctor = await Doctor.findOne({ doctorId: id });
    if (!doctor) {
      doctor = await Doctor.findById(id);
    }
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if doctor is active
    if (doctor.status !== 'Active') {
      return res.json({ available: false, slots: [], message: 'Doctor is not available' });
    }

    // Parse date and get day of week
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check availability for the day
    const dayAvailability = doctor.availability?.[dayOfWeek];
    if (!dayAvailability) {
      return res.json({ 
        available: false, 
        slots: [], 
        message: `Doctor is not available on ${dayOfWeek}`,
        dayOfWeek,
        availability: doctor.availability 
      });
    }

    // Get working hours - use defaults if not set
    const startTime = doctor.workingHours?.start || '09:00';
    const endTime = doctor.workingHours?.end || '17:00';

    // Generate possible time slots
    const possibleSlotsStr = generateTimeSlots(startTime, endTime);
    
    if (possibleSlotsStr.length === 0) {
      return res.json({ 
        available: false, 
        slots: [], 
        message: 'Doctor has no working hours configured',
        workingHours: { start: startTime, end: endTime }
      });
    }

    // Get booked appointments for this doctor and date from all collections
    // Use both doctorId and _id to ensure we catch all bookings
    const doctorIdSearch = [];
    if (doctor.doctorId) doctorIdSearch.push(doctor.doctorId);
    doctorIdSearch.push(doctor._id.toString());

    const bookedQuery = { 
      doctorId: { $in: doctorIdSearch }, 
      date: date 
    };

    const [bookedPending, bookedConfirmed, bookedOld] = await Promise.all([
      PendingAppointment.find(bookedQuery).select('time'),
      ConfirmedAppointment.find(bookedQuery).select('time'),
      Appointment.find({ ...bookedQuery, status: { $ne: 'cancelled' } }).select('time')
    ]);

    // Combine all booked times
    const bookedTimes = [
      ...bookedPending.map(app => app.time),
      ...bookedConfirmed.map(app => app.time),
      ...bookedOld.map(app => app.time)
    ];

    // Convert booked times to standard 12-hour format "H:MM AM/PM" for comparison
    const bookedSlots12h = bookedTimes.map(time => {
      if (!time) return null;
      try {
        let raw = time.trim();
        let ampm = '';

        // Extract AM/PM if present anywhere in the string
        if (raw.toLowerCase().includes('am')) ampm = 'AM';
        else if (raw.toLowerCase().includes('pm')) ampm = 'PM';

        // Get the start time part (before hyphen if range)
        let startTimePart = raw.split('-')[0].trim();
        // Remove any existing AM/PM from the time part itself
        startTimePart = startTimePart.replace(/am|pm/i, '').trim();

        const parts = startTimePart.split(':');
        let h = parseInt(parts[0]);
        const m = parts[1] || '00';

        // If no AM/PM was found in string, assume 24h format
        if (!ampm) {
          ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
        } else {
          // If we have AM/PM, ensure we use it correctly (12 AM is 12)
          h = h % 12 || 12;
        }

        const displayMinutes = m.toString().padStart(2, '0').substring(0, 2);
        return `${h}:${displayMinutes} ${ampm}`;
      } catch (e) {
        console.error("Error parsing booked time:", time, e);
        return null;
      }
    }).filter(Boolean);

    // Map possible slots to object format with isBooked and isPast flags
    const today = new Date();
    const isToday = appointmentDate.toDateString() === today.toDateString();
    const currentHours = today.getHours();
    const currentMinutes = today.getMinutes();

    const allSlots = possibleSlotsStr.map(slot => {
      const [range, ampm] = slot.split(' ');
      const startTimeStr = range.split('-')[0];
      
      // Parse slot start time for comparison
      const [sHours, sMinutes] = startTimeStr.split(':').map(Number);
      let slot24hHours = sHours;
      if (ampm === 'PM' && sHours !== 12) slot24hHours += 12;
      if (ampm === 'AM' && sHours === 12) slot24hHours = 0;

      const isBooked = bookedSlots12h.includes(`${startTimeStr} ${ampm}`);
      const isPast = isToday && (slot24hHours < currentHours || (slot24hHours === currentHours && sMinutes < currentMinutes));
      
      return {
        time: slot, // "10:00-10:30 AM"
        isBooked: isBooked || isPast, // Disable if booked OR past
        isPast: isPast
      };
    });

    // Categorize slots
    const categorizedSlots = {
      morning: [],
      afternoon: [],
      evening: []
    };

    allSlots.forEach(slotObj => {
      const [time, ampm] = slotObj.time.split(' ');
      const [hours] = time.split(':');
      const h = parseInt(hours) + (ampm === 'PM' && hours !== '12' ? 12 : (ampm === 'AM' && hours === '12' ? -12 : 0));
      
      if (h < 12) {
        categorizedSlots.morning.push(slotObj);
      } else if (h < 17) {
        categorizedSlots.afternoon.push(slotObj);
      } else {
        categorizedSlots.evening.push(slotObj);
      }
    });

    res.json({
      available: true,
      slots: allSlots, // Now an array of objects
      categorizedSlots,
      totalSlots: allSlots.length,
      bookedSlotsCount: allSlots.filter(s => s.isBooked).length,
      workingHours: { start: startTime, end: endTime }
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get availability summary for the next 7 days
export const getDoctorAvailabilitySummary = async (req, res) => {
  try {
    const { id } = req.params;
    
    let doctor = await Doctor.findOne({ doctorId: id });
    if (!doctor) {
      doctor = await Doctor.findById(id);
    }
    if (!doctor || doctor.status !== 'Active') {
      return res.status(404).json({ message: 'Doctor not found or inactive' });
    }

    const summary = [];
    const today = new Date();
    
    for (let i = 0; i < 31; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      const isAvailable = doctor.availability?.[dayOfWeek] || false;
      let slotCount = 0;

      if (isAvailable) {
        const startTime = doctor.workingHours?.start || '09:00';
        const endTime = doctor.workingHours?.end || '17:00';
        const possibleSlots = generateTimeSlots(startTime, endTime);
        
        const doctorIdSearch = [];
        if (doctor.doctorId) doctorIdSearch.push(doctor.doctorId);
        doctorIdSearch.push(doctor._id.toString());

        const bookedQuery = { 
          doctorId: { $in: doctorIdSearch }, 
          date: dateStr 
        };

        const [bookedPending, bookedConfirmed, bookedOld] = await Promise.all([
          PendingAppointment.countDocuments(bookedQuery),
          ConfirmedAppointment.countDocuments(bookedQuery),
          Appointment.countDocuments({ ...bookedQuery, status: { $ne: 'cancelled' } })
        ]);

        const totalBooked = bookedPending + bookedConfirmed + bookedOld;
        slotCount = Math.max(0, possibleSlots.length - totalBooked);
      }

      summary.push({
        date: dateStr,
        day: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })),
        available: isAvailable && slotCount > 0,
        slotsAvailable: slotCount
      });
    }

    res.json(summary);
  } catch (error) {
    console.error('Error fetching availability summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get a single doctor by _id or doctorId
export const getDoctor = async (req, res) => {
  const param = req.params.id;

  let doctor;

  // If param looks like ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(param)) {
    doctor = await Doctor.findOne({ organizationId: req.tenantId, _id: param });
  } else {
    doctor = await Doctor.findOne({ organizationId: req.tenantId, doctorId: param });
  }

  if (!doctor) return res.status(404).json({ message: "Doctor not found" });

  res.json(doctor);
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ organizationId: req.tenantId }).sort({ createdAt: -1 });

    // Remove duplicates based on doctorId to ensure unique doctors
    const uniqueDoctorsMap = new Map();
    doctors.forEach(doc => {
      if (!uniqueDoctorsMap.has(doc.doctorId)) {
        uniqueDoctorsMap.set(doc.doctorId, doc);
      }
    });
    const uniqueDoctors = Array.from(uniqueDoctorsMap.values());

    const formattedDoctors = uniqueDoctors.map(doctor => ({
      id: doctor.doctorId,
      _id: doctor._id,
      name: doctor.name,
      specialization: doctor.specialization,
      experience: doctor.experience,
      consultationFee: doctor.fee,
      fee: doctor.fee,
      status: doctor.status,
      email: doctor.email,
      phone: doctor.phone,
      address: doctor.address,
      qualification: doctor.qualification,
      workingHours: doctor.workingHours,
      availability: doctor.availability,
      dob: doctor.dob,
      gender: doctor.gender,
      department: doctor.department,
      licenseNumber: doctor.licenseNumber,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      photo: doctor.photo,
      startDate: doctor.startDate,
      lastReviewDate: doctor.lastReviewDate,
      emergencyContact: doctor.emergencyContact,
      licenseExpiry: doctor.licenseExpiry,
      boardCertified: doctor.boardCertified,
      npiNumber: doctor.npiNumber,
      patientsTreatedTotal: doctor.patientsTreatedTotal,
      totalRevenueYTD: doctor.totalRevenueYTD,
      npsScore: doctor.npsScore,
      avgConsultationTime: doctor.avgConsultationTime,
      noShowRate: doctor.noShowRate,
      activePatientCount: doctor.activePatientCount,
      appointmentsPerMonth: doctor.appointmentsPerMonth,
      upcomingAppointments: doctor.upcomingAppointments,
      completedAppointments: doctor.completedAppointments,
      schedule: doctor.schedule,
    }));
    res.json(formattedDoctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get doctor count
export const getDoctorCount = async (req, res) => {
  try {
    const count = await Doctor.countDocuments({ organizationId: req.tenantId, status: 'Active' });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching doctor count:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a new doctor
export const createDoctor = async (req, res) => {
  try {
    const doctorData = req.body;

    // Validate required fields
    if (!doctorData.name || !doctorData.specialization) {
      return res.status(400).json({ message: 'Name and specialization are required' });
    }

    // Generate doctor ID using counter if not provided
    if (!doctorData.doctorId) {
      const counter = await Counter.findOneAndUpdate(
        { name: 'doctorId' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );
      doctorData.doctorId = `DOC${String(counter.value).padStart(3, '0')}`;
    }

    // Create and save new doctor
    const newDoctor = new Doctor({
      ...doctorData,
      organizationId: req.tenantId
    });
    const savedDoctor = await newDoctor.save();

    res.status(201).json(savedDoctor);
  } catch (error) {
    console.error('Error adding doctor:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Doctor ID or Username already exists' });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

// Update a doctor
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (updateData.experience !== undefined) updateData.experience = parseInt(updateData.experience) || 0;
    if (updateData.fee !== undefined) updateData.fee = parseFloat(updateData.fee) || 0;
    updateData.updatedAt = new Date();

    const doctor = await Doctor.findOneAndUpdate(
      { organizationId: req.tenantId, doctorId: id },
      { $set: updateData },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a doctor
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findOneAndDelete({ organizationId: req.tenantId, doctorId: id });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get Checkout details for a doctor (Public)
 * Fetches doctor info and populates organization (clinic) details for the checkout summary.
 */
export const getPublicDoctorCheckoutDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find doctor and populate organization details
    // Check both doctorId (custom string) and _id (mongo object id)
    let doctor = await Doctor.findOne({ doctorId: id }).populate('organizationId', 'name address');
    if (!doctor) {
      doctor = await Doctor.findById(id).populate('organizationId', 'name address');
    }

    if (!doctor || doctor.status !== 'Active') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const clinicAddress = doctor.organizationId?.address;
    let formattedAddress = "";
    if (typeof clinicAddress === 'object' && clinicAddress !== null) {
      formattedAddress = [
        clinicAddress.street,
        clinicAddress.city,
        clinicAddress.state,
        clinicAddress.zipCode
      ].filter(Boolean).join(', ');
    } else {
      formattedAddress = clinicAddress || doctor.address || "Lucknow, India";
    }

    const checkoutDetails = {
      doctor: {
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        specialization: doctor.specialization,
        photo: doctor.photo,
        qualification: doctor.qualification,
        experience: doctor.experience,
        fee: doctor.fee
      },
      clinic: {
        name: doctor.organizationId?.name || doctor.clinicName || "Clicnic Center",
        address: formattedAddress
      }
    };


    res.json(checkoutDetails);
  } catch (error) {
    console.error('Error fetching checkout details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
