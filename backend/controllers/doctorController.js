import Doctor from '../models/Doctor.js';
import Counter from '../models/Counter.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import Review from '../models/Review.js';
import Subscription from '../models/Subscription.js';

// Helper function to generate time slots with range format
const generateTimeSlots = (workingHours, intervalMinutes = 30) => {
  const slots = [];
  
  // If workingHours is not an array, convert to array for backward compatibility
  const hoursArray = Array.isArray(workingHours) ? workingHours : [workingHours];

  hoursArray.forEach(hours => {
    if (!hours || !hours.start || !hours.end) return;
    
    const start = new Date(`1970-01-01T${hours.start}:00`);
    const end = new Date(`1970-01-01T${hours.end}:00`);
    const current = new Date(start);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + intervalMinutes * 60000);
      
      if (slotEnd > end) break;

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
      
      // Create range format like "10:00 AM - 10:30 AM" or "11:30 AM - 12:00 PM"
      const displayTime = `${startStr} ${startAmpm} - ${endStr} ${endAmpm}`;
      slots.push(displayTime);
      
      current.setMinutes(current.getMinutes() + intervalMinutes);
    }
  });
  
  return slots;
};

// Get all public doctors across all organizations with optional filtering
export const getGlobalPublicDoctors = async (req, res) => {
  try {
    const { speciality, city, query } = req.query;
    const dbQuery = { status: { $in: ['Active', 'Verified'] } };
    
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

    const formattedDoctors = uniqueDoctors.map(doctor => {
      let displayAddress = doctor.address;
      let displayClinic = doctor.serviceLocation?.type === 'other' ? "External Clinic" : "Own Clinic";

      // If a specific service location address is provided (Own or Other), use it
      if (doctor.serviceLocation?.address?.city) {
        const addr = doctor.serviceLocation.address;
        displayAddress = `${addr.street ? addr.street + ', ' : ''}${addr.city}${addr.state ? ', ' + addr.state : ''}`.trim();
        if (doctor.serviceLocation.practiceName) {
          displayClinic = doctor.serviceLocation.practiceName;
        }
      }

      return {
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
        address: displayAddress,
        clinicName: displayClinic,
        phone: doctor.phone,
        status: doctor.status,
        organizationId: doctor.organizationId,
        likesPercentage: doctor.likesPercentage || 0,
        totalStories: doctor.totalStories || 0
      };
    });
    
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
    const results = await Doctor.find({ status: { $in: ['Active', 'Verified'] } })
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
      status: { $in: ['Active', 'Verified'] } 
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
    if (!['Active', 'Verified'].includes(doctor.status)) {
      return res.json({ available: false, slots: [], message: 'Doctor is not available' });
    }

    // Check for availability overrides for this specific date
    const override = doctor.availabilityOverrides?.find(o => o.date === date);
    
    let isAvailable = false;
    let workingHours = [];

    if (override) {
      isAvailable = override.isAvailable;
      workingHours = override.workingHours;
    } else {
      // Parse date and get day of week in UTC to avoid timezone shifts
      const appointmentDate = new Date(date);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[appointmentDate.getUTCDay()];
      
      isAvailable = doctor.availability?.[dayOfWeek] || false;
      workingHours = doctor.workingHours && doctor.workingHours.length > 0 
        ? doctor.workingHours 
        : [{ start: '09:00', end: '17:00' }];
    }

    // Check availability
    if (!isAvailable) {
      return res.json({ 
        available: false, 
        slots: [], 
        message: override ? 'Doctor is marked as unavailable for this date' : 'Doctor is not available on this day of the week',
        isOverride: !!override
      });
    }

    // Generate possible time slots
    const possibleSlotsStr = generateTimeSlots(workingHours);
    
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
    const appointmentDate = new Date(date);
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
      workingHours: workingHours
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
    if (!doctor || !['Active', 'Verified'].includes(doctor.status)) {
      return res.status(404).json({ message: 'Doctor not found or inactive' });
    }

    const summary = [];
    const today = new Date();
    
    for (let i = 0; i < 31; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      const override = doctor.availabilityOverrides?.find(o => o.date === dateStr);
      
      let isAvailable = false;
      let workingHours = [];

      if (override) {
        isAvailable = override.isAvailable;
        workingHours = override.workingHours;
      } else {
        isAvailable = doctor.availability?.[dayOfWeek] || false;
        workingHours = doctor.workingHours && doctor.workingHours.length > 0 
          ? doctor.workingHours 
          : [{ start: '09:00', end: '17:00' }];
      }

      let slotCount = 0;

      if (isAvailable) {
        const possibleSlots = generateTimeSlots(workingHours);
        
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

// Get all doctors with pagination
export const getAllDoctors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const totalDoctors = await Doctor.countDocuments({ organizationId: req.tenantId });
    const totalPages = Math.ceil(totalDoctors / limit);

    const doctors = await Doctor.find({ organizationId: req.tenantId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Remove duplicates based on doctorId to ensure unique doctors (if still necessary in pagination context)
    // Note: If doctorId is always unique within an org, this Map is redundant but kept for safety.
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
      registrationNumber: doctor.registrationNumber,
      registrationCouncil: doctor.registrationCouncil,
      registrationYear: doctor.registrationYear,
      idType: doctor.idType,
      idNumber: doctor.idNumber,
      idDocumentUrl: doctor.idDocumentUrl,
    }));

    res.json({
      doctors: formattedDoctors,
      totalDoctors,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get doctor count
export const getDoctorCount = async (req, res) => {
  try {
    const count = await Doctor.countDocuments({ organizationId: req.tenantId });
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

    // Check subscription limits
    const subscription = await Subscription.findOne({ organizationId: req.tenantId });
    if (subscription && subscription.limits && subscription.limits.doctors !== -1) {
      const currentDoctorCount = await Doctor.countDocuments({ organizationId: req.tenantId });
      if (currentDoctorCount >= subscription.limits.doctors) {
        return res.status(403).json({ 
          message: 'Want more doctors to add? Upgrade your plan!',
          limitReached: true,
          limit: subscription.limits.doctors
        });
      }
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
      status: doctorData.status || 'Pending', // Default to pending for verification
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

// Verify a doctor
export const verifyDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findOneAndUpdate(
      { organizationId: req.tenantId, doctorId: id },
      { $set: { status: 'Verified' } },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor verified successfully', doctor });
  } catch (error) {
    console.error('Error verifying doctor:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject a doctor
export const rejectDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findOneAndUpdate(
      { organizationId: req.tenantId, doctorId: id },
      { $set: { status: 'Rejected' } },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor rejected successfully', doctor });
  } catch (error) {
    console.error('Error rejecting doctor:', error);
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

    if (!doctor || !['Active', 'Verified'].includes(doctor.status)) {
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

// Update doctor availability override
export const updateAvailabilityOverride = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, isAvailable, workingHours } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const doctor = await Doctor.findOne({ organizationId: req.tenantId, doctorId: id });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Find if override already exists for this date
    const overrideIndex = doctor.availabilityOverrides.findIndex(o => o.date === date);

    if (overrideIndex > -1) {
      // Update existing override
      doctor.availabilityOverrides[overrideIndex] = { date, isAvailable, workingHours };
    } else {
      // Add new override
      doctor.availabilityOverrides.push({ date, isAvailable, workingHours });
    }

    // Clean up old overrides (optional, e.g., keep only last 3 months and future)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
    
    doctor.availabilityOverrides = doctor.availabilityOverrides.filter(o => o.date >= threeMonthsAgoStr);

    await doctor.save();
    res.json({ message: 'Availability override updated successfully', availabilityOverrides: doctor.availabilityOverrides });
  } catch (error) {
    console.error('Error updating availability override:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove availability override
export const removeAvailabilityOverride = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const doctor = await Doctor.findOne({ organizationId: req.tenantId, doctorId: id });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.availabilityOverrides = doctor.availabilityOverrides.filter(o => o.date !== date);
    await doctor.save();

    res.json({ message: 'Availability override removed successfully', availabilityOverrides: doctor.availabilityOverrides });
  } catch (error) {
    console.error('Error removing availability override:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Get all reviews for a specific doctor
export const getDoctorReviews = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find reviews for this doctorId
    const reviews = await Review.find({ doctorId: id }).sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching doctor reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a review for a doctor
export const addDoctorReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    // req.user has been populated by the authenticateToken middleware
    const patientName = req.user.name;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    const newReview = new Review({
      doctorId: id,
      organizationId: req.user.organizationId || null,
      patientName,
      rating,
      comment,
      isLike: rating >= 4 // 4 or 5 stars count as a "Like"
    });

    await newReview.save();

    // Recalculate and update Doctor stats
    const allReviews = await Review.find({ doctorId: id });
    const totalStories = allReviews.length;
    const likes = allReviews.filter(r => r.isLike).length;
    const likesPercentage = totalStories > 0 ? Math.round((likes / totalStories) * 100) : 0;

    await Doctor.findOneAndUpdate(
      { doctorId: id },
      { totalStories, likesPercentage }
    );

    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error adding doctor review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
