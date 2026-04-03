import React from 'react';
import { Lock } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const Compliance = () => {
  const benefits = [
    { title: "HIPAA Compliant", desc: "Our platform meets or exceeds all industry-standard security requirements for clinical data management." },
    { title: "End-to-End Encryption", desc: "All sensitive patient information and communications are encrypted from the doctor's desk to the patient's device." },
    { title: "Regular Audits", desc: "Automated security scanning and regular manual audits ensure your clinical data is always safe and reachable." }
  ];

  return (
    <FeatureLayout
      title="Compliance"
      subtitle="Security You Can Trust"
      description="Protect your practice and your patients with a platform built to the highest security standards, ensuring complete HIPAA compliance."
      icon={Lock}
      color="slate"
      benefits={benefits}
      aiHighlight="Slotify AI constantly monitors access logs for unusual patterns, providing proactive defense against unauthorized data breaches."
    />
  );
};

export default Compliance;
