import React from 'react';
import { UserCheck, Shield, Sparkles, TrendingUp } from 'lucide-react';
import FeatureLayout from '../Features/FeatureLayout';

const DoctorProfile = () => {
  const benefits = [
    { title: "Digital Identity", desc: "Build a professional online presence that showcases your expertise, qualifications, and patient testimonials." },
    { title: "Smart Scheduling", desc: "Reduce no-shows with automated reminders and an intuitive booking system integrated with your calendar." },
    { title: "Verified Patient Stories", desc: "Collect and display verified feedback from your patients to build trust and attract new consultations." }
  ];

  return (
    <FeatureLayout
      title="Professional Profile"
      subtitle="Elevate Your Medical Practice"
      description="Stand out in the digital healthcare landscape with a premium professional profile that connects you with thousands of patients looking for your expertise."
      icon={UserCheck}
      color="indigo"
      benefits={benefits}
      aiHighlight="The Oviaan AI engine analyzes patient search patterns to optimize your profile's visibility for the most relevant medical queries in your area."
    />
  );
};

export default DoctorProfile;
