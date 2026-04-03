import React from 'react';
import { CreditCard } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const Payments = () => {
  const benefits = [
    { title: "One-Click Checkout", desc: "Enable patients to pay for services instantly with a pre-saved secure payment method, reducing churn." },
    { title: "Subscriptions & Packages", desc: "Create and manage recurring revenue streams with clinical subscription plans and prepaid packages." },
    { title: "Detailed Settlements", desc: "Gain a clear, consolidated view of all clinic revenue and payout statuses from a single financial dashboard." }
  ];

  return (
    <FeatureLayout
      title="Payments"
      subtitle="Frictionless Revenue Capture"
      description="Modernize your clinic's bottom line with integrated payment processing that is both secure for patients and effortless for your team."
      icon={CreditCard}
      color="purple"
      benefits={benefits}
      aiHighlight="The Slotify smart settlement AI identifies and resolves discrepancies in your payout logs automatically, ensuring every cent is accounted for."
    />
  );
};

export default Payments;
