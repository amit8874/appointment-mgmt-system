import FollowUpReminder from '../models/FollowUpReminder.js';
import mongoose from 'mongoose';

// Helper to get organizationId from req (tenant-aware)
const getOrgId = (req) => req.tenantId || req.user?.organizationId?._id || req.user?.organizationId || req.user?.organization;

/**
 * @desc    Create a new follow-up reminder
 * @route   POST /api/reminders
 * @access  Private
 */
export const createFollowUpReminder = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization not found in user session' });
    }

    const { 
      patientId, 
      customPatientName,
      customPatientMobile,
      doctorId, 
      title, 
      note, 
      reminderType, 
      priority, 
      reminderAt 
    } = req.body;

    // Validate that at least one form of patient info is provided
    if (!patientId && !customPatientName) {
      return res.status(400).json({ success: false, message: 'Patient selection or custom name is required' });
    }

    const reminder = new FollowUpReminder({
      organizationId,
      patientId: patientId || null,
      customPatientName: customPatientName || null,
      customPatientMobile: customPatientMobile || null,
      doctorId: doctorId || null,
      createdBy: req.user._id,
      title,
      note,
      reminderType,
      priority: priority || 'MEDIUM',
      reminderAt
    });

    await reminder.save();

    res.status(201).json({
      success: true,
      message: 'Follow-up reminder created successfully',
      reminder
    });
  } catch (error) {
    console.error('Create FollowUpReminder Error:', error);
    res.status(500).json({ success: false, message: 'Error creating follow-up reminder', error: error.message });
  }
};

/**
 * @desc    Get all follow-up reminders with role-based filtering
 * @route   GET /api/reminders
 * @access  Private
 */
export const getFollowUpReminders = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { role, _id: userId } = req.user;

    let query = { organizationId };

    // Additional filters from query params
    const { status, patientId, doctorId, reminderType, priority, startDate, endDate } = req.query;
    
    if (status) query.status = status;
    
    // Support both MongoDB ObjectId and Patient Display ID (e.g. 000144)
    if (patientId) {
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        query.patientId = patientId;
      } else {
        // Find patient by display ID
        const Patient = mongoose.model('Patient');
        const patient = await Patient.findOne({ patientId, organizationId });
        if (patient) {
          query.patientId = patient._id;
        } else {
          // If no patient found with that display ID, return empty results early
          return res.status(200).json({ success: true, count: 0, reminders: [] });
        }
      }
    }

    if (doctorId) query.doctorId = doctorId;
    if (reminderType) query.reminderType = reminderType;
    if (priority) query.priority = priority;

    if (startDate || endDate) {
      query.reminderAt = {};
      if (startDate) query.reminderAt.$gte = new Date(startDate);
      if (endDate) query.reminderAt.$lte = new Date(endDate);
    }

    const reminders = await FollowUpReminder.find(query)
      .populate('patientId', 'firstName lastName fullName patientId mobile')
      .populate('doctorId', 'name specialization')
      .populate('assignedToUserId', 'name role')
      .populate('createdBy', 'name')
      .sort({ reminderAt: 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      reminders
    });
  } catch (error) {
    console.error('Get FollowUpReminders Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching follow-up reminders', error: error.message });
  }
};

/**
 * @desc    Get today's follow-up reminders
 * @route   GET /api/reminders/today
 * @access  Private
 */
export const getTodayFollowUpReminders = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { role, _id: userId } = req.user;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let query = { 
      organizationId,
      reminderAt: { $gte: startOfDay, $lte: endOfDay }
    };

    const reminders = await FollowUpReminder.find(query)
      .populate('patientId', 'firstName lastName fullName patientId mobile')
      .populate('doctorId', 'name specialization')
      .sort({ reminderAt: 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      reminders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching today\'s reminders', error: error.message });
  }
};

/**
 * @desc    Get due/overdue follow-up reminders (not completed or cancelled)
 * @route   GET /api/reminders/due
 * @access  Private
 */
export const getDueFollowUpReminders = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { role, _id: userId } = req.user;

    const now = new Date();

    let query = { 
      organizationId,
      status: { $nin: ['COMPLETED', 'CANCELLED'] },
      shownToUsers: { $ne: userId },
      $or: [
        { status: { $ne: 'SNOOZED' }, reminderAt: { $lte: now } },
        { status: 'SNOOZED', snoozedUntil: { $lte: now } }
      ]
    };

    const reminders = await FollowUpReminder.find(query)
      .populate('patientId', 'firstName lastName fullName patientId mobile')
      .populate('doctorId', 'name specialization')
      .sort({ priority: -1, reminderAt: 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      reminders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching due reminders', error: error.message });
  }
};

/**
 * @desc    Mark reminder popup as shown
 * @route   PATCH /api/reminders/:id/popup-shown
 * @access  Private
 */
export const markReminderPopupShown = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;

    const reminder = await FollowUpReminder.findOneAndUpdate(
      { _id: id, organizationId },
      { 
        $addToSet: { shownToUsers: req.user._id },
        popupShownAt: Date.now() 
      },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Reminder marked as shown',
      reminder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating reminder', error: error.message });
  }
};

/**
 * @desc    Complete a follow-up reminder
 * @route   PATCH /api/reminders/:id/complete
 * @access  Private
 */
export const completeFollowUpReminder = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;

    const reminder = await FollowUpReminder.findOneAndUpdate(
      { _id: id, organizationId },
      { 
        status: 'COMPLETED', 
        completedAt: Date.now() 
      },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Reminder marked as completed',
      reminder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error completing reminder', error: error.message });
  }
};

/**
 * @desc    Snooze a follow-up reminder
 * @route   PATCH /api/reminders/:id/snooze
 * @access  Private
 */
export const snoozeFollowUpReminder = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    const { snoozedUntil } = req.body;

    if (!snoozedUntil) {
      return res.status(400).json({ success: false, message: 'snoozedUntil date is required' });
    }

    const reminder = await FollowUpReminder.findOneAndUpdate(
      { _id: id, organizationId },
      { 
        status: 'SNOOZED', 
        snoozedUntil: new Date(snoozedUntil),
        shownToUsers: [],
        popupShownAt: null
      },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Reminder snoozed successfully',
      reminder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error snoozing reminder', error: error.message });
  }
};

/**
 * @desc    Reschedule a follow-up reminder
 * @route   PATCH /api/reminders/:id/reschedule
 * @access  Private
 */
export const rescheduleFollowUpReminder = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    const { reminderAt } = req.body;

    if (!reminderAt) {
      return res.status(400).json({ success: false, message: 'reminderAt date is required' });
    }

    const reminder = await FollowUpReminder.findOneAndUpdate(
      { _id: id, organizationId },
      { 
        status: 'RESCHEDULED', 
        reminderAt: new Date(reminderAt),
        shownToUsers: [],
        popupShownAt: null
      },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Reminder rescheduled successfully',
      reminder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rescheduling reminder', error: error.message });
  }
};

/**
 * @desc    Update a follow-up reminder (generic update)
 * @route   PUT /api/reminders/:id
 * @access  Private
 */
export const updateFollowUpReminder = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    const updateData = req.body;

    // Remove sensitive or protected fields
    delete updateData.organizationId;
    delete updateData.createdBy;

    // If reminderAt is updated, reset visibility and status so it triggers again
    if (updateData.reminderAt) {
      updateData.shownToUsers = [];
      updateData.popupShownAt = null;
      // If it was completed or cancelled, bring it back to life
      updateData.status = 'RESCHEDULED';
    }

    const reminder = await FollowUpReminder.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Reminder updated successfully',
      reminder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating reminder', error: error.message });
  }
};

/**
 * @desc    Cancel a follow-up reminder
 * @route   PATCH /api/reminders/:id/cancel
 * @access  Private
 */
export const cancelFollowUpReminder = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    const { note } = req.body;

    const reminder = await FollowUpReminder.findOneAndUpdate(
      { _id: id, organizationId },
      { 
        status: 'CANCELLED', 
        cancelledAt: Date.now(),
        note: note ? note : undefined
      },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Reminder cancelled successfully',
      reminder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error cancelling reminder', error: error.message });
  }
};

/**
 * @desc    Delete a follow-up reminder
 * @route   DELETE /api/reminders/:id
 * @access  Private
 */
export const deleteFollowUpReminder = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;

    const reminder = await FollowUpReminder.findOneAndDelete({ _id: id, organizationId });

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting reminder', error: error.message });
  }
};
