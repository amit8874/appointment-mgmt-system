import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useAuth } from '../../context/AuthContext';

const OnboardingTour = ({ role }) => {
  const { user } = useAuth();
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Check if user has already seen the tour
    const tourKey = `clicnic_tour_seen_${role}_${user?._id || user?.id || 'guest'}`;
    const hasSeenTour = localStorage.getItem(tourKey);

    if (!hasSeenTour) {
      // Small delay to ensure the UI is fully rendered
      const timer = setTimeout(() => {
        setRun(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [role, user]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      const tourKey = `clicnic_tour_seen_${role}_${user?._id || user?.id || 'guest'}`;
      localStorage.setItem(tourKey, 'true');
    }
  };

  const commonStyles = {
    options: {
      arrowColor: '#fff',
      backgroundColor: '#fff',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      primaryColor: '#2563eb', // blue-600
      textColor: '#1e293b', // slate-800
      zIndex: 10000,
    },
    tooltipContainer: {
      textAlign: 'left',
      borderRadius: '16px',
      padding: '10px',
    },
    buttonNext: {
      backgroundColor: '#2563eb',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      padding: '10px 20px',
    },
    buttonBack: {
      marginRight: '10px',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#64748b',
    },
    buttonSkip: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#94a3b8',
    },
  };

  const stepsByRole = {
    admin: [
      {
        target: 'body',
        placement: 'center',
        title: '👋 Welcome back, Admin!',
        content: 'Let\'s take a quick tour of your new dashboard. We\'ve added some powerful tools to help you manage your clinic efficiently.',
        disableBeacon: true,
      },
      {
        target: '#tour-admin-dashboard',
        title: '📊 Dashboard Overview',
        content: 'Get a bird\'s eye view of your clinic\'s performance, including total patients, doctors, and real-time revenue analytics.',
      },
      {
        target: '#tour-admin-patients',
        title: '👥 Patient Management',
        content: 'Manage all patient records, medical history, and registration from one central place.',
      },
      {
        target: '#tour-admin-appointments',
        title: '📅 Appointment Management',
        content: 'Schedule, reschedule, or cancel appointments with ease. Keep track of your daily schedule effortlessly.',
      },
      {
        target: '#tour-admin-doctors',
        title: '👨‍⚕️ Staff & Doctors',
        content: 'Add new doctors, manage their specialties, and view their individual performance metrics.',
      },
      {
        target: '#tour-admin-billing',
        title: '💰 Billing & Payments',
        content: 'Track all financial transactions, generate invoices, and monitor pending payments.',
      },
      {
        target: '#tour-admin-users',
        title: '🔐 User Management',
        content: 'Control system access by managing roles for receptionists and other administrative staff.',
      },
    ],
    receptionist: [
      {
        target: 'body',
        placement: 'center',
        title: '👋 Hello! Welcome to the Clinic.',
        content: 'Welcome to your receptionist portal. We\'ll show you the key features to streamline your daily workflow.',
        disableBeacon: true,
      },
      {
        target: '#tour-recep-dashboard',
        title: '🏠 Your Workspace',
        content: 'Start your day here. See today\'s summary and quick actions at a glance.',
      },
      {
        target: '#tour-recep-appointments',
        title: '📅 Appointment Calendar',
        content: 'The heart of your work. View all scheduled visits and book new appointments for patients.',
      },
      {
        target: '#tour-recep-patients',
        title: '✍️ Patient Registry',
        content: 'Register new patients and look up existing records quickly when they arrive.',
      },
      {
        target: '#tour-recep-billing',
        title: '📄 Easy Billing',
        content: 'Generate bills and collect payments from patients seamlessly after their consultation.',
      },
      {
        target: '#tour-recep-doctors',
        title: '🩺 Doctor Schedules',
        content: 'Check doctor availability and manage their time slots to avoid overbooking.',
      },
    ],
    patient: [
      {
        target: 'body',
        placement: 'center',
        title: '👋 Welcome to Clicnic!',
        content: 'Your health, managed. Let\'s show you how to use your personal health portal.',
        disableBeacon: true,
      },
      {
        target: '#tour-patient-dashboard',
        title: '📑 My Health Summary',
        content: 'View your upcoming appointments, recent reports, and health vitals right here.',
      },
      {
        target: '#tour-patient-appointments',
        title: '🗓️ Book an Appointment',
        content: 'Find your preferred doctor and book a visit in just a few clicks. No more waiting on phone calls!',
      },
      {
        target: '#tour-patient-labs',
        title: '🔬 Lab Bookings',
        content: 'Need a blood test? Book your lab tests online and receive digital reports directly.',
      },
      {
        target: '#tour-patient-profile',
        title: '👤 Personal Profile',
        content: 'Keep your contact information and medical history up to date for better care.',
      },
    ],
  };

  const steps = stepsByRole[role] || [];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      scrollToFirstStep={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={commonStyles}
      locale={{
        last: 'Finish',
        skip: 'Skip Tour',
      }}
    />
  );
};

export default OnboardingTour;
