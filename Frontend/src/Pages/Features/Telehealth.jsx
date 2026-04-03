import React from 'react';
import { Video } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const Telehealth = () => {
  const benefits = [
    { title: "HD Video & Audio", desc: "Experience crystal-clear, lag-free medical consultations over a secure, browser-based video connection." },
    { title: "In-call Scribing", desc: "Our AI listens to your telehealth session to generate structured clinical notes in real-time, removing charting fatigue." },
    { title: "Integrated Screen-share", desc: "Easily review X-rays, lab results, and educational materials with patients through our unified telehealth portal." }
  ];

  return (
    <FeatureLayout
      title="Telehealth"
      subtitle="Care Without Boundaries"
      description="Bring your practice to the patient with a robust, HIPAA-compliant telehealth suite that is integrated directly with your clinical records."
      icon={Video}
      color="cyan"
      benefits={benefits}
      aiHighlight="Slotify AI can automatically transcribe your telehealth visits and suggest ICD-10 and CPT codes for faster billing."
    />
  );
};

export default Telehealth;
