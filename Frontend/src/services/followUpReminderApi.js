import { api } from './api';

export const followUpReminderApi = {
  /**
   * Create a new follow-up reminder
   * @param {Object} payload - Reminder data
   */
  createFollowUpReminder: async (payload) => {
    const { data } = await api.post('/follow-up-reminders', payload);
    return data;
  },

  /**
   * Get all follow-up reminders with optional filtering
   * @param {Object} params - Query parameters (status, patientId, doctorId, etc.)
   */
  getFollowUpReminders: async (params = {}) => {
    const { data } = await api.get('/follow-up-reminders', { params });
    return data;
  },

  /**
   * Get today's follow-up reminders
   */
  getTodayFollowUpReminders: async () => {
    const { data } = await api.get('/follow-up-reminders/today');
    return data;
  },

  /**
   * Get due/overdue follow-up reminders
   */
  getDueFollowUpReminders: async () => {
    const { data } = await api.get('/follow-up-reminders/due');
    return data;
  },

  /**
   * Mark reminder popup as shown
   * @param {string} id - Reminder ID
   */
  markReminderPopupShown: async (id) => {
    const { data } = await api.patch(`/follow-up-reminders/${id}/popup-shown`);
    return data;
  },

  /**
   * Update a follow-up reminder (generic update)
   * @param {string} id - Reminder ID
   * @param {Object} payload - Update data
   */
  updateFollowUpReminder: async (id, payload) => {
    const { data } = await api.put(`/follow-up-reminders/${id}`, payload);
    return data;
  },

  /**
   * Mark a follow-up reminder as completed
   * @param {string} id - Reminder ID
   */
  completeFollowUpReminder: async (id) => {
    const { data } = await api.patch(`/follow-up-reminders/${id}/complete`);
    return data;
  },

  /**
   * Snooze a follow-up reminder
   * @param {string} id - Reminder ID
   * @param {string|Date} snoozedUntil - New reminder date/time
   */
  snoozeFollowUpReminder: async (id, snoozedUntil) => {
    const { data } = await api.patch(`/follow-up-reminders/${id}/snooze`, { snoozedUntil });
    return data;
  },

  /**
   * Reschedule a follow-up reminder
   * @param {string} id - Reminder ID
   * @param {string|Date} reminderAt - New reminder date/time
   */
  rescheduleFollowUpReminder: async (id, reminderAt) => {
    const { data } = await api.patch(`/follow-up-reminders/${id}/reschedule`, { reminderAt });
    return data;
  },

  /**
   * Cancel a follow-up reminder
   * @param {string} id - Reminder ID
   */
  cancelFollowUpReminder: async (id) => {
    const { data } = await api.patch(`/follow-up-reminders/${id}/cancel`);
    return data;
  },

  /**
   * Delete a follow-up reminder
   * @param {string} id - Reminder ID
   */
  deleteFollowUpReminder: async (id) => {
    const { data } = await api.delete(`/follow-up-reminders/${id}`);
    return data;
  }
};

export default followUpReminderApi;
