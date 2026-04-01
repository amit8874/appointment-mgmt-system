import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usageAnalyticsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const useUsageTracking = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const lastPathRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const getDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) return 'Mobile';
    if (width < 1024) return 'Tablet';
    return 'Desktop';
  };

  const sendHeartbeat = async (path) => {
    if (!isAuthenticated || !user) return;

    try {
      const organizationId = user.organizationId?._id || user.organizationId;
      await usageAnalyticsApi.trackHeartbeat({
        path,
        organizationId: organizationId || null,
        deviceType: getDeviceType(),
        lastSeen: new Date(),
      });
    } catch (err) {
      // Silently fail to not interrupt user experience
      console.warn("[UsageTracking] Heartbeat failed", err.message);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      return;
    }

    const currentPath = location.pathname;

    // 1. Send immediate heartbeat on route change
    sendHeartbeat(currentPath);
    lastPathRef.current = currentPath;

    // 2. Set up periodic heartbeat (every 30 seconds)
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      // Only send if the window is active/focused to avoid tracking idle time
      if (document.visibilityState === 'visible') {
        sendHeartbeat(currentPath);
      }
    }, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [location.pathname, isAuthenticated, user]);

  return null;
};

export default useUsageTracking;
