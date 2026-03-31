import React, { useState, useEffect, useCallback } from 'react';
import { organizationApi } from '../../services/api';
import { AlertCircle, Clock, X, ChevronRight, RotateCcw, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const TrialNotification = ({ organizationId }) => {
  const [trialStatus, setTrialStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const fetchTrialStatus = useCallback(async (targetId, skipLoading = false) => {
    try {
      if (!targetId) return;
      const id = typeof targetId === 'object' ? (targetId._id || targetId.id) : targetId;
      if (!id || id === '[object Object]') return;

      if (!skipLoading) setIsLoading(true);
      const data = await organizationApi.getTrialStatus(id);
      setTrialStatus(data);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error fetching trial status:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchTrialStatus(organizationId);
    }
  }, [organizationId, fetchTrialStatus]);

  // Handle countdown for Free Trial auto-reset
  useEffect(() => {
    if (trialStatus?.planType === 'FREE_TRIAL' && trialStatus?.trialStartDate) {
      let isRefreshing = false;
      
      const updateTimer = () => {
        const now = new Date();
        const start = new Date(trialStatus.trialStartDate);
        const resetTime = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const diff = resetTime - now;

        if (diff <= 0) {
          setTimeLeft('Resetting...');
          // Refresh status after reset might have happened, but only once
          if (!isRefreshing) {
            isRefreshing = true;
            setTimeout(() => fetchTrialStatus(organizationId, true), 5000);
          }
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      };

      const timer = setInterval(updateTimer, 1000);
      updateTimer();
      return () => clearInterval(timer);
    }
  }, [trialStatus?.planType, trialStatus?.trialStartDate, organizationId, fetchTrialStatus]);
  // Auto-hide after 10 seconds unless it's an important notification
  useEffect(() => {
    if (isVisible && !isLoading && trialStatus) {
      // Don't auto-hide for expired or reset notifications as they need attention
      if (trialStatus.isTrialExpired || trialStatus.needsResetNotification) {
        return;
      }

      const timer = setTimeout(() => {
        handleClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isLoading, trialStatus?.isTrialExpired, trialStatus?.needsResetNotification]);

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  const handleDismissReset = async () => {
    try {
      await organizationApi.dismissResetNotification(organizationId);
      setTrialStatus(prev => ({ ...prev, needsResetNotification: false }));
      handleClose();
    } catch (error) {
      console.error('Error dismissing notification:', error);
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

    // 1. DATA RESET NOTIFICATION (Highest Priority)
    if (trialStatus.needsResetNotification) {
      return {
        type: 'reset',
        title: 'Trial Data Reset',
        message: 'Your free trial operational data (appointments, patients, etc.) has been reset as per the 24-hour policy.',
        buttonText: 'Got it',
        buttonAction: handleDismissReset
      };
    }

    // 2. TRIAL EXPIRED
    if (trialStatus.isTrialExpired) {
      return {
        type: 'error',
        title: 'Trial Expired',
        message: 'Your 14-day free trial has expired. Please upgrade to continue using the platform.',
        buttonText: 'Upgrade Now',
        buttonAction: () => window.location.href = '/organization/subscription'
      };
    }

    // 3. EXTENDED OVERRIDE MESSAGE
    if (trialStatus.isManualOverride) {
      return {
        type: 'success',
        title: 'Trial Extended',
        message: `Your trial has been extended for ${trialStatus.daysRemaining} days and will expire on ${formatDate(trialStatus.trialEndDate)}.`,
        buttonText: null,
        buttonAction: null
      };
    }

    // 4. FREE TRIAL WITH RESET TIMER
    if (trialStatus.planType === 'FREE_TRIAL') {
      return {
        type: 'timer',
        title: 'Trial Auto-Reset Active',
        message: `Your clinical data resets every 24 hours to keep the system fast. Next reset in: ${timeLeft}`,
        buttonText: 'Upgrade to Save Data',
        buttonAction: () => window.location.href = '/organization/subscription'
      };
    }

    // 4. LEGACY 14-DAY TRIAL MESSAGES
    const { daysRemaining, trialDays, trialEndDate } = trialStatus;

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
      message: `You have ${daysRemaining} days left in your free trial.`,
      buttonText: null,
      buttonAction: null
    };
  };

  if (isLoading || !trialStatus || !isVisible) {
    return null;
  }

  // Hide if not trial and not expired (i.e., paid)
  if (trialStatus.planType === 'PAID' && !trialStatus.isTrialExpired) {
    return null;
  }

  const content = getMessage();
  if (!content) return null;

  const getStyles = () => {
    switch (content.type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
          title: 'text-emerald-800 dark:text-emerald-300',
          message: 'text-emerald-700 dark:text-emerald-400',
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
      case 'reset':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: <RotateCcw className="h-5 w-5 text-emerald-500" />,
          title: 'text-emerald-800 dark:text-emerald-300',
          message: 'text-emerald-700 dark:text-emerald-400',
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          title: 'text-red-800 dark:text-red-300',
          message: 'text-red-700 dark:text-red-400',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'timer':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          border: 'border-indigo-200 dark:border-indigo-800',
          icon: <Clock className="h-5 w-5 text-indigo-500" />, // Removed animate-pulse to prevent "blinking" perception
          title: 'text-indigo-800 dark:text-indigo-300',
          message: 'text-indigo-700 dark:text-indigo-400',
          button: 'bg-indigo-600 hover:bg-indigo-700 text-white'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
          title: 'text-amber-800 dark:text-amber-300',
          message: 'text-amber-700 dark:text-amber-400',
          button: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800/50',
          border: 'border-slate-200 dark:border-slate-700',
          icon: <Clock className="h-5 w-5 text-slate-500" />,
          title: 'text-slate-800 dark:text-slate-200',
          message: 'text-slate-700 dark:text-slate-400',
          button: 'bg-slate-600 hover:bg-slate-700 text-white'
        };
    }
  };

  const styles = getStyles();

  return (
    <div 
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-500 ease-out w-[90%] max-w-lg ${
        isAnimating ? 'opacity-0 -translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <div className={`${styles.bg} border ${styles.border} backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="mt-0.5">{styles.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold ${styles.title} text-sm tracking-tight`}>{content.title}</h3>
              <p className={`text-xs ${styles.message} leading-relaxed mt-1 opacity-90 whitespace-pre-line`}>
                {content.message}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            {content.buttonText && (
              <button
                onClick={content.buttonAction}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold ${styles.button} shadow-lg shadow-indigo-500/20 transition-all active:scale-95`}
              >
                {content.buttonText}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Progress Bar for countdown */}
        {content.type === 'timer' && (
          <div className="h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 24 * 60 * 60, ease: "linear" }}
              className="h-full bg-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialNotification;
