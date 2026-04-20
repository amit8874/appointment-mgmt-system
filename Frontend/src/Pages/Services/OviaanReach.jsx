import React from 'react';
import { Share2, Users, Target, Rocket } from 'lucide-react';
import FeatureLayout from '../Features/FeatureLayout';

const OviaanReach = () => {
  const benefits = [
    { title: "Targeted Marketing", desc: "Reach potential patients in your area searching for specific treatments or specializations with surgical precision." },
    { title: "Brand Awareness", desc: "Build a authoritative digital brand for your clinic through curated promotional campaigns and content strategies." },
    { title: "Conversion Tracking", desc: "Measure the ROI of your marketing spend with detailed analytics on leads, bookings, and patient acquisitions." }
  ];

  return (
    <FeatureLayout
      title="Oviaan Reach"
      subtitle="Grow Your Healthcare Brand"
      description="The definitive marketing engine for healthcare providers. Connect with more patients, build authority, and scale your practice organically."
      icon={Share2}
      color="rose"
      benefits={benefits}
      aiHighlight="Oviaan Reach uses deep learning to optimize ad placements across platforms, ensuring your clinic reaches the right patient at the moment of highest intent."
    />
  );
};

export default OviaanReach;
