import React from 'react';
import { User } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const PatientPortal = () => {
  const benefits = [
    { title: "24/7 Access", desc: "Enable patients to view their medical records, test results, and visit summaries anytime, anywhere." },
    { title: "Self-Service Bookings", desc: "Empower patients to schedule, reschedule, or cancel appointments directly through their personal portal." },
    { title: "Secure Communication", desc: "A direct, HIPAA-compliant messaging channel between patients and their healthcare providers." }
  ];

  return (
    <FeatureLayout
      title="Patient Portal"
      subtitle="The Modern Gateway to Care"
      description="Empower your patients with a secure, user-friendly digital hub to manage their health journey and stay connected to your practice."
      icon={User}
      color="purple"
      benefits={benefits}
      aiHighlight="The portal dynamically adjusts to show relevant health tips and reminders based on the patient's upcoming visits and history."
    />
  );
};

export default PatientPortal;
