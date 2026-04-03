import React from 'react';
import { ClipboardList } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const Billing = () => {
  const benefits = [
    { title: "Automated Invoicing", desc: "Instantly generate professional, accurate invoices for consultations and procedures, reducing errors." },
    { title: "Revenue Cycle Tracking", desc: "Gain full visibility into your cash flow with real-time tracking of pending payments and settlements." },
    { title: "Multiple Payment Modes", desc: "Allow patients to pay securely via card, digital wallets, or direct bank transfers for a smoother experience." }
  ];

  return (
    <FeatureLayout
      title="Billing"
      subtitle="Seamless Financial Management"
      description="Simplify your practice's revenue operations with a robust billing engine that automates invoicing and ensures you get paid faster."
      icon={ClipboardList}
      color="orange"
      benefits={benefits}
      aiHighlight="The Slotify Billing engine automatically identifies billing code inconsistencies before they reach the insurance payer or patient."
    />
  );
};

export default Billing;
