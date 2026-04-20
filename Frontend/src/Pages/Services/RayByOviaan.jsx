import React from 'react';
import { Layout, Zap, Database, BarChart3 } from 'lucide-react';
import FeatureLayout from '../Features/FeatureLayout';

const RayByOviaan = () => {
  const benefits = [
    { title: "End-to-End Management", desc: "From patient registration to clinical documentation and billing, Ray handles every aspect of your clinic's operations." },
    { title: "Digital Records (EMR)", desc: "Transition to a paperless practice with our secure, encrypted electronic medical records system designed for speed." },
    { title: "Revenue Analytics", desc: "Gain deep insights into your practice's financial health with automated reports and growth forecasting tools." }
  ];

  return (
    <FeatureLayout
      title="Ray by Oviaan"
      subtitle="Complete Practice Management"
      description="The most powerful software ever built for modern clinics. Streamline your workflow, increase efficiency, and focus on delivering world-class patient care."
      icon={Layout}
      color="blue"
      benefits={benefits}
      aiHighlight="Ray's integrated AI predictively schedules follow-up reminders based on treatment protocols, ensuring maximum patient retention and care continuity."
    />
  );
};

export default RayByOviaan;
