import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { followUpReminderApi } from '../../services/api';
import DueReminderPopup from './DueReminderPopup';
import { AnimatePresence } from 'framer-motion';

/**
 * GlobalReminderWatcher
 * 
 * This component polls for due follow-up reminders every 30 seconds
 * and displays a popup notification for the user.
 */
const GlobalReminderWatcher = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeReminder, setActiveReminder] = useState(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    // Only run for authorized roles: Admin, Doctor, Receptionist
    const isAuthorized = user && ['admin', 'orgadmin', 'doctor', 'receptionist'].includes(user.role?.toLowerCase());
    
    if (!isAuthenticated || !isAuthorized) {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      return;
    }

    const checkReminders = async () => {
      // If a reminder is already being shown, don't fetch new ones to avoid stacking/overlapping
      if (activeReminder) return;

      try {
        const response = await followUpReminderApi.getDueFollowUpReminders();
        const reminders = response.reminders || [];
        
        if (reminders.length > 0) {
          // Sort by priority (URGENT -> HIGH -> MEDIUM -> LOW) and then by time
          const sortedReminders = [...reminders].sort((a, b) => {
            const priorityMap = { 'URGENT': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
            if (priorityMap[a.priority] !== priorityMap[b.priority]) {
              return priorityMap[a.priority] - priorityMap[b.priority];
            }
            return new Date(a.reminderAt) - new Date(b.reminderAt);
          });

          const nextReminder = sortedReminders[0];
          
          // Immediately mark as shown on backend to prevent other sessions/polls 
          // from picking up the same reminder
          await followUpReminderApi.markReminderPopupShown(nextReminder._id);
          
          // Show the popup
          setActiveReminder(nextReminder);
        }
      } catch (error) {
        // Silently fail for polling errors to avoid disrupting user experience
        console.warn('Reminder poll failed:', error);
      }
    };

    // Initial check on mount
    checkReminders();

    // Start polling every 30 seconds
    if (!pollInterval.current) {
      pollInterval.current = setInterval(checkReminders, 30000);
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [isAuthenticated, user, activeReminder]);

  return (
    <AnimatePresence>
      {activeReminder && (
        <DueReminderPopup
          key={activeReminder._id}
          reminder={activeReminder}
          onActionComplete={() => setActiveReminder(null)}
          onClose={() => setActiveReminder(null)}
        />
      )}
    </AnimatePresence>
  );
};

export default GlobalReminderWatcher;
