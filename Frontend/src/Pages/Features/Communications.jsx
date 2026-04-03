import React from 'react';
import { MessageSquare } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const Communications = () => {
  const benefits = [
    { title: "Direct Messaging", desc: "Facilitate direct, secure communication between patients, physicians, and clinical staff for unified care." },
    { title: "Real-time Notifications", desc: "Instant alerts for new test results, upcoming appointment changes, and critical updates for your team." },
    { title: "Multi-channel Outreach", desc: "Easily reach your patient population through secure in-app messaging, WhatsApp, and SMS integrations." }
  ];

  return (
    <FeatureLayout
      title="Communications"
      subtitle="Connected Care Teams"
      description="Enhance the patient experience with a unified communications hub that keeps everyone on the same page with real-time, secure messaging."
      icon={MessageSquare}
      color="indigo"
      benefits={benefits}
      aiHighlight="Slotify AI can summarize long conversation threads for physicians, ensuring they get the key points before they enter the room."
    />
  );
};

export default Communications;
