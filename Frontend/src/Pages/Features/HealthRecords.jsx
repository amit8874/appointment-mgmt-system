import React from 'react';
import { ShieldPlus } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const HealthRecords = () => {
  const benefits = [
    { title: "Unified Vitals Tracking", desc: "A single, real-time dashboard for all patient vitals, from heart rate to glucose levels and more." },
    { title: "Longitudinal Trends", desc: "Visualize patient progress over time with intelligent charting and anomaly detection for better diagnosis." },
    { title: "Integrated Prescriptions", desc: "Digital medication lists that sync automatically with pharmacy orders for a complete health overview." }
  ];

  return (
    <FeatureLayout
      title="Health Records"
      subtitle="Data-Driven Patient Care"
      description="Securely track and manage vital health metrics with a longitudinal view of patient progress for informed clinical decisions."
      icon={ShieldPlus}
      color="emerald"
      benefits={benefits}
      aiHighlight="Slotify AI flags vital signs that deviate from historical norms, alerting your team to potential issues before they become emergencies."
    />
  );
};

export default HealthRecords;
