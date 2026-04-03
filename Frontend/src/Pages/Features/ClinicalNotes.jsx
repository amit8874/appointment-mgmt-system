import React from 'react';
import { PenTool } from 'lucide-react';
import FeatureLayout from './FeatureLayout';

const ClinicalNotes = () => {
  const benefits = [
    { title: "Smart SOAP Templates", desc: "Specialty-specific templates that dynamically adapt to the patient's existing history for faster, smarter charting." },
    { title: "Ambient Recording", desc: "Automate your clinical documentation by allowing the Slotify AI to scribe your patient encounters in real-time." },
    { title: "Historical Comparisons", desc: "View a patient's historical visit summaries side-by-side to track longitudinal trends and care progress." }
  ];

  return (
    <FeatureLayout
      title="Clinical Notes"
      subtitle="Focus on the Patient"
      description="Stop spending your evening charting. Use our intelligent note-taking tools to document care accurately and efficiently during the visit."
      icon={PenTool}
      color="amber"
      benefits={benefits}
      aiHighlight="The Slotify AI can predict the most likely diagnosis based on your notes and provide relevant medical literature or treatment guidlines."
    />
  );
};

export default ClinicalNotes;
  
