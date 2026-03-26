import { useState, useCallback } from 'react';
import { notificationApi } from '../services/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const data = await notificationApi.getAll();
      setNotifications(data);
    } catch (error) {
      // Handle error silently or set error state if needed
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      // Handle error silently
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      // Handle error silently
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Handle navigation or other actions based on notification type
  }, [markAsRead]);

  return {
    notifications,
    notificationsLoading,
    showNotifications,
    setShowNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  };
};
