import React from 'react';
import { FileText } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const Documentation = () => {
  const benefits = [
    { title: "Structured Record-Keeping", desc: "Easily maintain comprehensive and well-organized clinical notes tailored to your medical specialty." },
    { title: "Efficient Retrieval", desc: "Quickly access patient records and historical data through a powerful, intuitive search interface." },
    { title: "Seamless Collaboration", desc: "Share documentation securely across departments to ensure a unified approach to patient care." }
  ];

  return (
    <FeatureLayout
      title="Documentation"
      subtitle="Better Care Through Better Records"
      description="Streamline your clinical workflows with intelligent documentation tools that capture patient data accurately and securely."
      icon={FileText}
      color="amber"
      benefits={benefits}
      aiHighlight="Our AI automatically categorizes and structures raw input into professional clinical reports, saving hours of manual work."
    />
  );
};

export default Documentation;
