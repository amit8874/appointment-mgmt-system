import api from '../services/api';

// Get all notifications
export const getNotifications = async (limit = 50) => {
  try {
    const response = await api.get(`/notifications?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Get unread notifications count
export const getUnreadCount = async () => {
  try {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

// Get notifications for a specific patient
export const getPatientNotifications = async (patientId, limit = 50) => {
  try {
    const response = await api.get(`/notifications/patient/${patientId}?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient notifications:', error);
    throw error;
  }
};

// Get unread count for a specific patient
export const getPatientUnreadCount = async (patientId) => {
  try {
    const response = await api.get(`/notifications/patient/${patientId}/unread-count`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient unread count:', error);
    throw error;
  }
};

// Mark notification as read
export const markAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read
export const markAllAsRead = async () => {
  try {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};
