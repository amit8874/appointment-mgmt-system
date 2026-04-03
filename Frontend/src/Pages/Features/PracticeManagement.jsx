import React from 'react';
import { Layout } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const PracticeManagement = () => {
  const benefits = [
    { title: "Multi-Location Control", desc: "Manage any number of clinic locations, departments, and providers from a single, unified admin dashboard." },
    { title: "Inventory & Pharmacy", desc: "Automated stock tracking and prescription quote management integrated directly with your clinical workflows." },
    { title: "Staff Roles & Access", desc: "Fine-grained permissions for receptionists, nurses, and doctors to ensure complete security and data privacy." }
  ];

  return (
    <FeatureLayout
      title="Practice Management"
      subtitle="The Command Center for Care"
      description="Every tool your practice needs to operate efficiently at any scale. From inventory to billing and beyond, Slotify has you covered."
      icon={Layout}
      color="slate"
      benefits={benefits}
      aiHighlight="Slotify AI highlights your most profitable services and maps out patient demographics to help you grow your business intentionally."
    />
  );
};

export default PracticeManagement;
