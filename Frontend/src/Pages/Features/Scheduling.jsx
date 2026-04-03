import React from 'react';
import { Calendar } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const Scheduling = () => {
  const benefits = [
    { title: "Smart Availability", desc: "Our AI engine automatically balances provider workloads with patient preferences for optimal slot utilization." },
    { title: "Automated Reminders", desc: "Reduce no-shows by up to 40% with multi-channel WhatsApp and SMS reminders sent at perfect intervals." },
    { title: "Conflict Resolution", desc: "Real-time sync across multiple locations and departments ensures zero double-bookings or scheduling overlap." }
  ];

  return (
    <FeatureLayout
      title="Scheduling"
      subtitle="Reimagined for Efficiency"
      description="Modernize your practice with a self-optimizing calendar that works as hard as you do. Reduce wait times and maximize clinical throughput."
      icon={Calendar}
      color="blue"
      benefits={benefits}
      aiHighlight="Slotify AI learns your practice patterns to predict peak hours and suggest optimal staffing levels before you even ask."
    />
  );
};

export default Scheduling;
