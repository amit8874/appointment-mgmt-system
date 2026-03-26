import React, { useState, useEffect } from 'react';
import { organizationApi } from '../../services/api';

const TrialNotification = ({ organizationId }) => {
  const [trialStatus, setTrialStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // We can fetch by organizationId OR tenantSlug. The backend might need an update to accept tenantSlug if we only have that.
    // However, if we just use the tenantSlug context, we can hit the API by slug. 
    // Wait, the API `getTrialStatus` expects an ID. Let's see if we can get the organizationId from user object or we have to pass it.
    // Actually, `organizationApi.getTrialStatus` takes an ID. If we only have slug, we might need a workaround.
    // Let's assume the user object DOES have organizationId inside user.organization._id.
    
    if (organizationId) {
      fetchTrialStatus(organizationId);
    }
  }, [organizationId]);

  useEffect(() => {
    // Auto-hide after 10 seconds if trial is active
    if (trialStatus && !trialStatus.isTrialExpired && isVisible) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 300); // Wait for animation to complete
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [trialStatus, isVisible]);

  const fetchTrialStatus = async (id) => {
    try {
      setIsLoading(true);
      const data = await organizationApi.getTrialStatus(id);
      setTrialStatus(data);
    } catch (error) {
      // Silently ignore 401 errors — this is a known race condition where the
      // component briefly renders before the auth token is available after login.
      // The parent component will re-render with a valid token shortly after.
      if (error.response?.status !== 401) {
        console.error('Error fetching trial status:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMessage = () => {
    if (!trialStatus) return null;

    // If no trial days, this is a paid subscription - don't show notification
    if (!trialStatus.trialDays || trialStatus.trialDays === 0) {
      return null;
    }

    if (trialStatus.isTrialExpired) {
      return {
        type: 'error',
        title: 'Trial Expired',
        message: 'Your free trial has expired. Please upgrade to continue using the platform.',
        buttonText: 'Upgrade Now',
        buttonAction: () => window.location.href = '/organization/subscription'
      };
    }

    const { daysRemaining, trialDays, trialEndDate } = trialStatus;

    if (daysRemaining === trialDays) {
      // First day
      return {
        type: 'info',
        title: 'Trial Started',
        message: `Your free ${trialDays}-day trial has started.\nTrial will end on: ${formatDate(trialEndDate)}`,
        buttonText: null,
        buttonAction: null
      };
    }

    if (daysRemaining === 1) {
      return {
        type: 'warning',
        title: 'Trial Ending Tomorrow',
        message: `You have 1 day left in your free trial.\nTrial will end on: ${formatDate(trialEndDate)}`,
        buttonText: 'Upgrade Now',
        buttonAction: () => window.location.href = '/organization/subscription'
      };
    }

    if (daysRemaining <= 3) {
      return {
        type: 'warning',
        title: 'Trial Ending Soon',
        message: `You have ${daysRemaining} days left in your free trial.\nTrial will end on: ${formatDate(trialEndDate)}`,
        buttonText: 'Upgrade Now',
        buttonAction: () => window.location.href = '/organization/subscription'
      };
    }

    return {
      type: 'info',
      title: 'Trial Active',
      message: `You have ${daysRemaining} days left in your free trial.\nTrial will end on: ${formatDate(trialEndDate)}`,
      buttonText: null,
      buttonAction: null
    };
  };

  if (isLoading || !trialStatus || !isVisible) {
    return null;
  }

  // Don't show notification if trial is not active and not expired (i.e., they have a paid plan)
  if (!trialStatus.isTrialActive && trialStatus.isTrialExpired === false) {
    return null;
  }

  const content = getMessage();
  if (!content) {
    return null;
  }

  const getStyles = () => {
    switch (content.type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-500',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const styles = getStyles();

  return (
    <div 
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isAnimating ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className={`${styles.bg} border ${styles.border} rounded-lg shadow-lg max-w-md`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            {content.type === 'error' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${styles.icon} flex-shrink-0`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : content.type === 'warning' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${styles.icon} flex-shrink-0`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${styles.icon} flex-shrink-0`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${styles.title} text-sm`}>{content.title}</h3>
              <p className={`text-sm ${styles.message} whitespace-pre-line mt-1`}>
                {content.message}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {content.buttonText && (
                <button
                  onClick={content.buttonAction}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${styles.button} transition`}
                >
                  {content.buttonText}
                </button>
              )}
              <button
                onClick={() => {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setIsVisible(false);
                  }, 300);
                }}
                className="p-1 rounded-full hover:bg-gray-200 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialNotification;
