import Notification from '../models/Notification.js';

// Get all notifications (for admin only - returns everything for this tenant)
export const getNotifications = async (req, res) => {
  try {
    const { limit = 50, isRead } = req.query;
    let query = { organizationId: req.tenantId };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get notifications for a specific patient (only their own)
export const getPatientNotifications = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { patientId } = req.params;

    const notifications = await Notification.find({ userId: patientId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching patient notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get notifications for a specific doctor (only their own - appointment notifications)
export const getDoctorNotifications = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { doctorId } = req.params;

    const notifications = await Notification.find({
      $or: [
        { userId: doctorId },
        { message: { $regex: `Dr\\.\\s+\\w+|doctorId.*${doctorId}`, $options: 'i' } }
      ],
      category: 'appointment_booking'
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching doctor notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get unread count for a specific patient
export const getPatientUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.params.patientId,
      isRead: false,
    });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching patient unread count:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get unread notifications count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ organizationId: req.tenantId, isRead: false });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark notification as read
export const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.tenantId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read
export const markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { organizationId: req.tenantId, isRead: false },
      { isRead: true }
    );

    res.json({ message: `${result.modifiedCount} notifications marked as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read for a specific patient
export const markPatientAllRead = async (req, res) => {
  try {
    // Build query - if no tenant, only match by userId
    const query = req.tenantId 
      ? { organizationId: req.tenantId, userId: req.params.patientId, isRead: false }
      : { userId: req.params.patientId, isRead: false };
    
    const result = await Notification.updateMany(query, { isRead: true });
    res.json({ message: `${result.modifiedCount} notifications marked as read` });
  } catch (error) {
    console.error('Error marking patient notifications as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create a new notification (internal use)
export const createNotification = async (req, res) => {
  try {
    const { message, type = 'info', category, userId, appointmentId } = req.body;

    // Check current notification count (per tenant)
    const notificationCount = await Notification.countDocuments({ organizationId: req.tenantId });

    // If at limit (50), delete the oldest notification for this tenant
    if (notificationCount >= 50) {
      const oldestNotification = await Notification.findOne({ organizationId: req.tenantId }).sort({ createdAt: 1 });
      if (oldestNotification) {
        await Notification.findByIdAndDelete(oldestNotification._id);
        console.log('Deleted oldest notification to maintain limit');
      }
    }

    const notification = new Notification({
      organizationId: req.tenantId,
      message,
      type,
      category,
      userId,
      appointmentId,
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, organizationId: req.tenantId });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: error.message });
  }
};
