import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import OldAppointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import Patient from '../models/PaitentEditProfile.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import Billing from '../models/Billing.js';
import { incrementUsage } from '../middleware/subscription.js';
import { generatePatientId } from '../utils/idGenerator.js';

export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const query = { doctorId };
    
    const [pending, confirmed, cancelled, oldAppointments] = await Promise.all([
      PendingAppointment.find(query).sort({ createdAt: -1 }),
      ConfirmedAppointment.find(query).sort({ createdAt: -1 }),
      CancelledAppointment.find(query).sort({ createdAt: -1 }),
      OldAppointment.find(query).sort({ createdAt: -1 })
    ]);

    const all = [
      ...pending.map(app => ({ ...app.toObject(), status: 'pending' })),
      ...confirmed.map(app => ({ ...app.toObject(), status: 'confirmed' })),
      ...cancelled.map(app => ({ ...app.toObject(), status: 'cancelled' })),
      ...oldAppointments.map(app => ({ ...app.toObject() }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(all);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getPatientSummary = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    let patientFilter = {};
    
    if (/^[a-fA-F0-9]{24}$/.test(patientId)) {
      const patient = await Patient.findOne({
        $or: [
          { _id: patientId },
          { patientId: patientId }
        ]
      });
      
      if (patient) {
        patientFilter = {
          $or: [
            { patientId: patient.patientId },
            { patientPhone: patient.mobile }
          ]
        };
      } else {
        patientFilter = {
          $or: [
            { patientId: patientId },
            { _id: patientId }
          ]
        };
      }
    } else {
      patientFilter = { patientId: patientId };
    }

    const [pending, confirmed, cancelled, oldAppointments] = await Promise.all([
      PendingAppointment.find(patientFilter).populate('organizationId', 'name branding').sort({ createdAt: -1 }),
      ConfirmedAppointment.find(patientFilter).populate('organizationId', 'name branding').sort({ createdAt: -1 }),
      CancelledAppointment.find(patientFilter).populate('organizationId', 'name branding').sort({ createdAt: -1 }),
      OldAppointment.find(patientFilter).populate('organizationId', 'name branding').sort({ createdAt: -1 })
    ]);

    const formatAppt = (app, status) => {
      const obj = app.toObject();
      return {
        ...obj,
        status: status || obj.status,
        organizationName: obj.organizationId ? obj.organizationId.name : 'Unknown Clinic'
      };
    };

    const allAppointments = [
      ...pending.map(app => formatAppt(app, 'pending')),
      ...confirmed.map(app => formatAppt(app, 'confirmed')),
      ...cancelled.map(app => formatAppt(app, 'cancelled')),
      ...oldAppointments.map(app => formatAppt(app))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allAppointments);
  } catch (error) {
    console.error('Error fetching global appointments:', error);
    res.status(500).json({ message: error.message });
  }
};

export const bookPatientAppointment = async (req, res) => {
  try {
    const { organizationId, patientId, doctorId, doctorName, specialty, date, time, reason, symptoms, amount, paymentStatus, patientDetails } = req.body;

    if (!organizationId) return res.status(400).json({ message: 'Organization is required' });
    if (!doctorId) return res.status(400).json({ message: 'Doctor is required' });
    if (!date) return res.status(400).json({ message: 'Appointment date is required' });
    if (!time) return res.status(400).json({ message: 'Appointment time is required' });
    if (!patientDetails || !patientDetails.phone) return res.status(400).json({ message: 'Patient phone is required' });

    const tenantFilter = { organizationId, doctorId, date, time };
    const [pending, confirmed] = await Promise.all([
      PendingAppointment.findOne(tenantFilter),
      ConfirmedAppointment.findOne(tenantFilter)
    ]);

    if (pending || confirmed) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    let patientIdToUse = patientId;
    let existingPatient = await Patient.findOne({ mobile: patientDetails.phone });

    if (!existingPatient) {
      // Generate internal Patient ID
      const newPatientId = await generatePatientId(organizationId);

      existingPatient = new Patient({
        organizationId,
        patientId: newPatientId,
        firstName: patientDetails.firstName || '',
        lastName: patientDetails.lastName || '',
        fullName: `${patientDetails.firstName || ''} ${patientDetails.lastName || ''}`.trim() || 'Unknown Patient',
        mobile: patientDetails.phone,
        email: patientDetails.email,
        address: patientDetails.address,
        age: patientDetails.age,
        gender: patientDetails.gender ? (patientDetails.gender.charAt(0).toUpperCase() + patientDetails.gender.slice(1).toLowerCase()) : undefined,
      });

      await existingPatient.save();
    } else {
      if (!existingPatient.organizationId) {
        existingPatient.organizationId = organizationId;
        await existingPatient.save();
      }
    }
    
    patientIdToUse = existingPatient.patientId || existingPatient._id.toString();
    const patientName = patientDetails?.firstName ? `${patientDetails.firstName} ${patientDetails.lastName || ''}`.trim() : 'Unknown Patient';

    const appointment = new PendingAppointment({
      organizationId,
      patientId: patientIdToUse,
      doctorId,
      doctorName: doctorName || '',
      specialty: specialty || 'General',
      date,
      time,
      reason: reason || '',
      symptoms: symptoms || '',
      patientName,
      patientPhone: patientDetails.phone,
      patientEmail: patientDetails.email || '',
      amount: amount || 0,
      paymentStatus: paymentStatus || 'pending'
    });

    await appointment.save();

    try {
      const staffUsers = await User.find({ organizationId, role: { $in: ['superadmin', 'orgadmin', 'admin', 'receptionist'] } });
      const notifications = staffUsers.map(user => {
        let message = `New appointment booked by ${patientName} with Dr. ${doctorName} on ${date} at ${time} - Fee: ₹${amount || 0}`;
        if (user.role === 'doctor') {
          message = `New appointment: ${patientName} booked with Dr. ${doctorName} on ${date} at ${time} - Fee: ₹${amount || 0}`;
        }
        return {
          organizationId,
          message,
          type: 'info',
          userId: user._id,
          appointmentId: appointment._id,
          category: 'appointment_booking',
          createdAt: new Date()
        };
      });
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
    }

    // Create Billing Record
    try {
      const billCounter = await Counter.findOneAndUpdate(
        { name: `billId_${organizationId}` },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );
      const billId = `BIL${String(billCounter.value).padStart(6, '0')}`;
      
      const fee = Number(amount) || 500;

      const newBill = new Billing({
        billId,
        organizationId: organizationId,
        patientId: patientIdToUse,
        patientName,
        doctorId,
        doctorName: doctorName || '',
        amount: fee,
        paidAmount: 0,
        dueAmount: fee,
        appointmentId: appointment._id.toString(),
        appointmentDate: date,
        appointmentTime: time,
        items: [{ description: 'Consultation Fee', cost: fee }],
        status: paymentStatus === 'paid' ? 'Paid' : 'Pending',
        notes: `Patient Web Booking on ${date} at ${time}`,
        paymentMethod: 'N/A'
      });
      await newBill.save();
    } catch (billingError) {
      console.error('Error creating linked bill for patient booking:', billingError);
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    let patientFilter = { $or: [{ patientId }] };
    
    if (/^[a-fA-F0-9]{24}$/.test(patientId)) {
      patientFilter.$or.push({ _id: patientId });
    }
    
    const [pending, confirmed, cancelled, oldAppointments] = await Promise.all([
      PendingAppointment.find(patientFilter).sort({ createdAt: -1 }),
      ConfirmedAppointment.find(patientFilter).sort({ createdAt: -1 }),
      CancelledAppointment.find(patientFilter).sort({ createdAt: -1 }),
      OldAppointment.find(patientFilter).sort({ createdAt: -1 })
    ]);

    const allAppointments = [
      ...pending.map(app => ({
        ...app.toObject(),
        status: 'pending',
        organizationId: app.organizationId,
        appointmentId: app._id
      })),
      ...confirmed.map(app => ({
        ...app.toObject(),
        status: 'confirmed',
        organizationId: app.organizationId,
        appointmentId: app._id
      })),
      ...cancelled.map(app => ({
        ...app.toObject(),
        status: 'cancelled',
        organizationId: app.organizationId,
        appointmentId: app._id
      })),
      ...oldAppointments.map(app => ({
        ...app.toObject(),
        status: app.status || 'completed',
        organizationId: app.organizationId,
        appointmentId: app._id
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allAppointments);
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getPatientTenantAppointments = async (req, res) => {
  try {
    const tenantFilter = { organizationId: req.tenantId, patientId: req.params.patientId };
    const [pending, confirmed, cancelled, oldAppointments] = await Promise.all([
      PendingAppointment.find(tenantFilter).sort({ createdAt: -1 }),
      ConfirmedAppointment.find(tenantFilter).sort({ createdAt: -1 }),
      CancelledAppointment.find(tenantFilter).sort({ createdAt: -1 }),
      OldAppointment.find(tenantFilter).sort({ createdAt: -1 })
    ]);

    const allAppointments = [
      ...pending.map(app => ({ ...app.toObject(), status: 'pending' })),
      ...confirmed.map(app => ({ ...app.toObject(), status: 'confirmed' })),
      ...cancelled.map(app => ({ ...app.toObject(), status: 'cancelled' })),
      ...oldAppointments.map(app => ({ ...app.toObject() }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllAppointments = async (req, res) => {
  try {
    const { date } = req.query;
    let query = { organizationId: req.tenantId };
    if (date) {
      query.date = date;
    }

    const [pending, confirmed, cancelled, oldAppointments] = await Promise.all([
      PendingAppointment.find(query).sort({ createdAt: -1 }),
      ConfirmedAppointment.find(query).sort({ createdAt: -1 }),
      CancelledAppointment.find(query).sort({ createdAt: -1 }),
      OldAppointment.find(query).sort({ createdAt: -1 })
    ]);

    const allAppointments = [
      ...pending.map(app => ({ ...app.toObject(), status: 'pending' })),
      ...confirmed.map(app => ({ ...app.toObject(), status: 'confirmed' })),
      ...cancelled.map(app => ({ ...app.toObject(), status: 'cancelled' })),
      ...oldAppointments.map(app => ({ ...app.toObject() }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allAppointments);
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    res.status(500).json({ message: error.message });
  }
};

export const bookAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, doctorName, specialty, date, time, reason, symptoms, patientDetails } = req.body;

    if (!doctorId) return res.status(400).json({ message: 'Doctor is required' });
    if (!date) return res.status(400).json({ message: 'Appointment date is required' });
    if (!time) return res.status(400).json({ message: 'Appointment time is required' });
    if (!patientDetails || !patientDetails.phone) return res.status(400).json({ message: 'Patient phone is required' });

    const tenantFilter = { organizationId: req.tenantId, doctorId, date, time };
    const [pending, confirmed] = await Promise.all([
      PendingAppointment.findOne(tenantFilter),
      ConfirmedAppointment.findOne(tenantFilter)
    ]);

    if (pending || confirmed) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    let patientIdToUse = patientId;
    let existingPatient = await Patient.findOne({ 
      organizationId: req.tenantId, 
      mobile: patientDetails.phone
    });

    if (!existingPatient) {
      // Generate internal Patient ID
      const newPatientId = await generatePatientId(req.tenantId);

      existingPatient = new Patient({
        organizationId: req.tenantId,
        patientId: newPatientId,
        firstName: patientDetails.firstName || '',
        lastName: patientDetails.lastName || '',
        fullName: `${patientDetails.firstName || ''} ${patientDetails.lastName || ''}`.trim() || 'Unknown Patient',
        mobile: patientDetails.phone,
        email: patientDetails.email,
        address: patientDetails.address,
        age: patientDetails.age,
        gender: patientDetails.gender ? (patientDetails.gender.charAt(0).toUpperCase() + patientDetails.gender.slice(1).toLowerCase()) : undefined,
        dateOfBirth: patientDetails.dateOfBirth,
        bloodGroup: patientDetails.bloodGroup || undefined,
        status: 'active'
      });

      await existingPatient.save();
    } else {
      const updateData = {};
      if (patientDetails.firstName) updateData.firstName = patientDetails.firstName;
      if (patientDetails.lastName) updateData.lastName = patientDetails.lastName;
      if (patientDetails.firstName || patientDetails.lastName) {
        updateData.fullName = `${patientDetails.firstName || ''} ${patientDetails.lastName || ''}`.trim();
        updateData.firstName = patientDetails.firstName || existingPatient.firstName;
        updateData.lastName = patientDetails.lastName || existingPatient.lastName;
      }
      if (patientDetails.email) updateData.email = patientDetails.email;
      if (patientDetails.address) updateData.address = patientDetails.address;
      if (patientDetails.age) updateData.age = patientDetails.age;
      if (patientDetails.gender) {
        const genderMap = { male: 'Male', female: 'Female', other: 'Other' };
        updateData.gender = genderMap[patientDetails.gender.toLowerCase()] || patientDetails.gender;
      }
      if (patientDetails.dateOfBirth) updateData.dateOfBirth = patientDetails.dateOfBirth;
      if (patientDetails.bloodGroup && patientDetails.bloodGroup.trim()) {
        updateData.bloodGroup = patientDetails.bloodGroup;
      }
      
      if (Object.keys(updateData).length > 0) {
        await Patient.findByIdAndUpdate(existingPatient._id, updateData, { runValidators: true });
      }
    }

    patientIdToUse = existingPatient.patientId || existingPatient._id.toString();

    const patientName = patientDetails?.firstName 
      ? `${patientDetails.firstName} ${patientDetails.lastName || ''}`.trim()
      : 'Unknown Patient';
    const patientPhone = patientDetails?.phone || '';
    const patientEmail = patientDetails?.email || '';

    const appointment = new PendingAppointment({
      organizationId: req.tenantId,
      patientId: patientIdToUse,
      doctorId,
      doctorName: doctorName || '',
      specialty: specialty || 'General',
      date,
      time,
      reason: reason || '',
      symptoms: symptoms || '',
      patientName,
      patientPhone,
      patientEmail,
    });

    await appointment.save();

    await incrementUsage('appointmentsThisMonth')(req, res, () => {});

    try {
      const notificationCount = await Notification.countDocuments({ organizationId: req.tenantId });

      if (notificationCount >= 50) {
        const oldestNotification = await Notification.findOne({ organizationId: req.tenantId }).sort({ createdAt: 1 });
        if (oldestNotification) {
          await Notification.findByIdAndDelete(oldestNotification._id);
        }
      }

      const notification = new Notification({
        organizationId: req.tenantId,
        message: `New appointment booked: ${patientDetails.firstName} ${patientDetails.lastName} with ${doctorName} on ${date} at ${time}`,
        type: 'info',
        category: 'appointment_booking',
        appointmentId: appointment._id,
      });
      await notification.save();
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }
    
    // Create Billing Record
    try {
      const billCounter = await Counter.findOneAndUpdate(
        { name: `billId_${req.tenantId}` },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );
      const billId = `BIL${String(billCounter.value).padStart(6, '0')}`;
      
      // Look up doctor fee
      let docObj = await Doctor.findOne({ doctorId });
      if (!docObj) {
        docObj = await Doctor.findById(doctorId);
      }
      const fee = docObj?.fee || 500;

      const newBill = new Billing({
        billId,
        organizationId: req.tenantId,
        patientId: patientIdToUse,
        patientName,
        doctorId,
        doctorName: doctorName || '',
        amount: fee,
        paidAmount: 0,
        dueAmount: fee,
        appointmentId: appointment._id.toString(),
        appointmentDate: date,
        appointmentTime: time,
        items: [{ description: 'Consultation Fee', cost: fee }],
        status: 'Pending',
        notes: `Auto-generated for appointment on ${date} at ${time}`,
        paymentMethod: 'N/A'
      });
      await newBill.save();
    } catch (billingError) {
      console.error('Error creating linked bill:', billingError);
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointmentId = req.params.id;

    if (!status) return res.status(400).json({ message: 'Status is required' });

    let appointment = await PendingAppointment.findById(appointmentId);
    let currentModel = PendingAppointment;
    if (!appointment) {
      appointment = await ConfirmedAppointment.findById(appointmentId);
      currentModel = ConfirmedAppointment;
    }
    if (!appointment) {
      appointment = await CancelledAppointment.findById(appointmentId);
      currentModel = CancelledAppointment;
    }
    if (!appointment) {
      appointment = await OldAppointment.findById(appointmentId);
      currentModel = OldAppointment;
    }

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (status && status !== appointment.status) {
      let newModel;
      if (status === 'confirmed' || status === 'completed') newModel = ConfirmedAppointment;
      else if (status === 'cancelled') newModel = CancelledAppointment;
      else if (status === 'pending') newModel = PendingAppointment;

      const newAppointment = new newModel({
        ...appointment.toObject(),
        status: status
      });

      await newAppointment.save();
      await currentModel.findByIdAndDelete(appointmentId);

      return res.json(newAppointment);
    }

    return res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { date, time, reason, symptoms, status } = req.body;
    const appointmentId = req.params.id;

    let appointment = await PendingAppointment.findById(appointmentId);
    let currentModel = PendingAppointment;
    if (!appointment) {
      appointment = await ConfirmedAppointment.findById(appointmentId);
      currentModel = ConfirmedAppointment;
    }
    if (!appointment) {
      appointment = await CancelledAppointment.findById(appointmentId);
      currentModel = CancelledAppointment;
    }
    if (!appointment) {
      appointment = await OldAppointment.findById(appointmentId);
      currentModel = OldAppointment;
    }

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (date && time) {
      const [pending, confirmed] = await Promise.all([
        PendingAppointment.findOne({ _id: { $ne: appointmentId }, doctorId: appointment.doctorId, date, time }),
        ConfirmedAppointment.findOne({ _id: { $ne: appointmentId }, doctorId: appointment.doctorId, date, time })
      ]);

      if (pending || confirmed) {
        return res.status(400).json({ message: 'This time slot is already booked' });
      }
    }

    if (status && status !== appointment.status) {
      let newModel;
      if (status === 'confirmed' || status === 'completed') newModel = ConfirmedAppointment;
      else if (status === 'cancelled') newModel = CancelledAppointment;
      else if (status === 'pending') newModel = PendingAppointment;

      const newAppointment = new newModel({
        ...appointment.toObject(),
        date: date || appointment.date,
        time: time || appointment.time,
        reason: reason !== undefined ? reason : appointment.reason,
        symptoms: symptoms !== undefined ? symptoms : appointment.symptoms,
      });

      await newAppointment.save();
      await currentModel.findByIdAndDelete(appointmentId);

      try {
        if ((status === 'confirmed' || status === 'cancelled') && appointment.patientId) {
          const statusMessages = {
            confirmed: `✅ Your appointment with ${appointment.doctorName} on ${appointment.date} at ${appointment.time} has been confirmed.`,
            cancelled: `❌ Your appointment with ${appointment.doctorName} on ${appointment.date} at ${appointment.time} has been cancelled.`,
          };

          const patientNotification = new Notification({
            message: statusMessages[status],
            type: status === 'confirmed' ? 'success' : 'warning',
            category: 'appointment_update',
            userId: appointment.patientId,
            appointmentId: newAppointment._id,
          });
          await patientNotification.save();
        }
      } catch (notifError) {
        console.error('Error creating patient notification:', notifError);
      }

      res.json(newAppointment);
    } else {
      const updateData = {};
      if (date) updateData.date = date;
      if (time) updateData.time = time;
      if (reason !== undefined) updateData.reason = reason;
      if (symptoms !== undefined) updateData.symptoms = symptoms;

      const updatedAppointment = await currentModel.findByIdAndUpdate(
        appointmentId,
        updateData,
        { new: true, runValidators: true }
      );

      res.json(updatedAppointment);
    }
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    let appointment = await PendingAppointment.findByIdAndDelete(req.params.id);
    if (!appointment) appointment = await ConfirmedAppointment.findByIdAndDelete(req.params.id);
    if (!appointment) appointment = await CancelledAppointment.findByIdAndDelete(req.params.id);
    if (!appointment) appointment = await OldAppointment.findByIdAndDelete(req.params.id);

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    res.json({ message: 'Appointment deleted successfully', appointment });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    let doctor = await Doctor.findOne({ doctorId });
    if (!doctor) doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    if (doctor.status !== 'Active') {
      return res.json({ available: false, availableSlots: [], message: 'Doctor is not available' });
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const dayAvailability = doctor.availability?.[dayOfWeek];
    if (!dayAvailability) {
      return res.json({
        available: false,
        availableSlots: [],
        message: `Doctor is not available on ${dayOfWeek}`
      });
    }

    const startTime = doctor.workingHours?.start || '09:00';
    const endTime = doctor.workingHours?.end || '17:00';

    const allSlots = [];
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    while (start < end) {
      const time = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
      allSlots.push(time);
      start.setMinutes(start.getMinutes() + 30);
    }

    const [pending, confirmed, old] = await Promise.all([
      PendingAppointment.find({ doctorId: doctor.doctorId || doctor._id.toString(), date }),
      ConfirmedAppointment.find({ doctorId: doctor.doctorId || doctor._id.toString(), date }),
      OldAppointment.find({ doctorId: doctor.doctorId || doctor._id.toString(), date, status: { $ne: 'cancelled' } })
    ]);

    const bookedTimes = [...pending, ...confirmed, ...old].map(app => app.time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    res.json({ availableSlots });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getStatsToday = async (req, res) => {
  try {
    const today = new Date();
    const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    const [pending, confirmed, cancelled, old] = await Promise.all([
      PendingAppointment.countDocuments({ organizationId: req.tenantId, date: localDate }),
      ConfirmedAppointment.countDocuments({ organizationId: req.tenantId, date: localDate }),
      CancelledAppointment.countDocuments({ organizationId: req.tenantId, date: localDate }),
      OldAppointment.countDocuments({ organizationId: req.tenantId, date: localDate })
    ]);

    res.json({
      total: pending + confirmed + cancelled + old,
      pending,
      confirmed,
      cancelled,
      checkedIn: confirmed,
      waiting: pending
    });
  } catch (error) {
    console.error('Error fetching today\'s appointment stats:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Book a public appointment
 * Handles patient creation/retrieval via mobile and generates numeric shortId.
 */
export const bookPublicAppointment = async (req, res) => {
  try {
    const { 
      doctorId, 
      date, 
      time, 
      patientName, 
      patientPhone, 
      patientEmail,
      isForSelf 
    } = req.body;

    if (!doctorId || !date || !time || !patientPhone || !patientName) {
      return res.status(400).json({ message: 'Missing required booking details' });
    }

    // 1. Find doctor to get organizationId and Fee
    let doctor = await Doctor.findOne({ doctorId }).populate('organizationId');
    if (!doctor) {
      doctor = await Doctor.findById(doctorId).populate('organizationId');
    }

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const organizationId = doctor.organizationId?._id || doctor.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'Doctor is not associated with an organization' });
    }

    // NEW: Check if this slot is already booked
    const doctorIdValue = doctor.doctorId || doctor._id.toString();
    const [pending, confirmed] = await Promise.all([
      PendingAppointment.findOne({ doctorId: doctorIdValue, date, time }),
      ConfirmedAppointment.findOne({ doctorId: doctorIdValue, date, time })
    ]);

    if (pending || confirmed) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    // 2. Generate numeric shortId for appointment (e.g., 23449760)
    // We'll use a global counter or a random base for premium feel
    const counter = await Counter.findOneAndUpdate(
      { name: 'global_appointment_short_id' },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    
    // Starting from a high base for premium feel like in the screenshot
    const baseId = 23440000;
    const shortId = baseId + counter.value;

    // 3. Find or Create Patient based on mobile number and organization
    let patient = await Patient.findOne({ mobile: patientPhone, organizationId });


    if (!patient) {
      // Generate internal Patient ID
      const newPatientId = await generatePatientId(organizationId);

      // Split name for firstName requirement
      const nameParts = patientName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      patient = new Patient({
        organizationId,
        patientId: newPatientId,
        firstName,
        lastName,
        fullName: patientName,
        mobile: patientPhone,
        email: patientEmail,
        status: 'active'
      });
      await patient.save();
    }


    // 4. Create Pending Appointment
    const appointment = new PendingAppointment({
      shortId: shortId.toString(),
      organizationId,
      patientId: patient.patientId || patient._id.toString(),
      doctorId: doctor.doctorId || doctor._id.toString(),
      doctorName: doctor.name,
      specialty: doctor.specialization,
      date,
      time,
      patientName,
      patientPhone,
      patientEmail: patientEmail || '',
      amount: doctor.fee || 500,
      paymentStatus: 'pending', // Pay at clinic
      bookingSource: 'public_website',
      isForSelf: isForSelf === undefined ? true : isForSelf
    });

    await appointment.save();

    // 5. Create Notifications for all organization staff (admin, receptionist)
    try {
      const staffUsers = await User.find({ 
        organizationId, 
        role: { $in: ['superadmin', 'orgadmin', 'admin', 'receptionist'] } 
      });

      const notifications = staffUsers.map(user => ({
        organizationId,
        userId: user._id,
        message: `New Web Booking [ID: ${shortId}]: ${patientName} with ${doctor.name} on ${date} at ${time}`,
        type: 'info',
        category: 'appointment_booking',
        appointmentId: appointment._id,
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }

    // 6. Create Billing Record
    try {
      const billCounter = await Counter.findOneAndUpdate(
        { name: `billId_${organizationId}` },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );
      const billId = `BIL${String(billCounter.value).padStart(6, '0')}`;
      
      const fee = doctor.fee || 500;

      const newBill = new Billing({
        billId,
        organizationId,
        patientId: patient.patientId || patient._id.toString(),
        patientName,
        doctorId: doctor.doctorId || doctor._id.toString(),
        doctorName: doctor.name,
        amount: fee,
        paidAmount: 0,
        dueAmount: fee,
        appointmentId: appointment._id.toString(),
        appointmentDate: date,
        appointmentTime: time,
        items: [{ description: 'Consultation Fee', cost: fee }],
        status: 'Pending',
        notes: 'Auto-generated for website booking',
        paymentMethod: 'Cash' // Assume cash on arrival by default for web bookings
      });
      await newBill.save();
    } catch (billingError) {
      console.error('Error creating linked bill for public booking:', billingError);
    }

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        id: appointment._id,
        shortId: appointment.shortId,
        date: appointment.date,
        time: appointment.time,
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        patientPhone: appointment.patientPhone,
        doctorName: appointment.doctorName,
        amount: appointment.amount
      }
    });

  } catch (error) {
    console.error('Error booking public appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cancel a public appointment
 * Moves the appointment from Pending to Cancelled collection and deletes from Pending.
 */
export const cancelPublicAppointment = async (req, res) => {
  try {
    const { shortId } = req.params;

    if (!shortId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    // 1. Find the pending appointment
    const pendingApp = await PendingAppointment.findOne({ shortId });
    if (!pendingApp) {
      return res.status(404).json({ message: 'Appointment not found or already processed' });
    }

    // 2. Create a record in CancelledAppointment
    const cancelledApp = new CancelledAppointment({
      ...pendingApp.toObject(),
      _id: undefined, // Let mongoose generate a new ID
      status: 'cancelled',
      cancelledAt: new Date(),
      reason: 'Cancelled by user from web portal'
    });

    await cancelledApp.save();

    // 3. Delete from PendingAppointment
    await PendingAppointment.deleteOne({ shortId });

    // 4. Create notifications for all organization staff
    try {
      const staffUsers = await User.find({ 
        organizationId: pendingApp.organizationId, 
        role: { $in: ['admin', 'receptionist', 'doctor'] } 
      });

      const notifications = staffUsers.map(user => ({
        organizationId: pendingApp.organizationId,
        userId: user._id,
        message: `Appointment [ID: ${shortId}] was cancelled by the patient (${pendingApp.patientName}).`,
        type: 'warning',
        category: 'appointment_cancellation',
        appointmentId: pendingApp._id // Note: Record still exists in memory
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (err) {
      console.error('Notification error during cancellation:', err);
    }


    res.status(200).json({ message: 'Appointment cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling public appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

