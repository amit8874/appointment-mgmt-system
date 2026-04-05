import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Share2, Clipboard, UserCheck, MessageSquare, PhoneCall } from 'lucide-react';
import PublicHeader from '../components/Shared/PublicHeader';
import PublicFooter from '../components/Shared/PublicFooter';

const PrivacyPolicy = () => {
  const sections = [
    {
      icon: <Eye className="text-blue-500" />,
      title: "1. Information We Collect",
      content: (
        <div className="space-y-3 text-slate-600">
          <p>We process several types of information to provide our services effectively:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Personal identification:</strong> Name, mobile number, email address, date of birth, and gender.</li>
            <li><strong>Medical Records:</strong> Past history, allergies, vitals (BP, Heart Rate, etc.), prescriptions, and uploaded lab reports.</li>
            <li><strong>Billing Data:</strong> Consultation fees, payment status, and transaction history.</li>
            <li><strong>Technical Data:</strong> IP addresses and browser types for security monitoring.</li>
          </ul>
        </div>
      )
    },
    {
      icon: <Clipboard className="text-emerald-500" />,
      title: "2. How We Use Your Information",
      content: (
        <div className="space-y-3 text-slate-600">
          <p>Your data is used strictly for healthcare delivery and clinic management:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>To manage appointments and send reminders via WhatsApp/SMS.</li>
            <li>To enable doctors to maintain accurate Electronic Health Records (EHR).</li>
            <li>To process payments and generate invoices.</li>
            <li>To verify identity through OTPs and secure login systems.</li>
          </ul>
        </div>
      )
    },
    {
      icon: <Share2 className="text-purple-500" />,
      title: "3. Data Sharing and Disclosure",
      content: (
        <div className="space-y-3 text-slate-600">
          <p>We do not sell your personal data. We only share information with:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Authorized Staff:</strong> Doctors and receptionists within your specific clinic.</li>
            <li><strong>Service Providers:</strong> Secure partners like WhatsApp API for messaging and Payment Gateways for transactions.</li>
            <li><strong>Legal Authorities:</strong> Only when required by law or to protect safety.</li>
          </ul>
        </div>
      )
    },
    {
      icon: <Lock className="text-orange-500" />,
      title: "4. Data Security",
      content: (
        <div className="space-y-3 text-slate-600">
          <p>We employ enterprise-grade security measures:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Multi-Tenancy Isolation:</strong> Patient data from one clinic is strictly separated from others.</li>
            <li><strong>Encryption:</strong> All data is encrypted during transit (SSL/TLS) and at rest.</li>
            <li><strong>Access Control:</strong> Role-based permissions ensure only authorized personnel see medical history.</li>
          </ul>
        </div>
      )
    },
    {
      icon: <UserCheck className="text-teal-500" />,
      title: "5. Your Rights",
      content: (
        <p className="text-slate-600 leading-relaxed">
          Patients have the right to access their medical records, request corrections to inaccurate data, and 
          receive a digital copy of their reports. For data deletion requests, please contact your clinic directly, 
          bearing in mind that certain medical records must be retained by law for specific periods.
        </p>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full mb-6"
          >
            <Shield size={16} />
            <span className="text-sm font-bold uppercase tracking-wider">Privacy & Security</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Privacy Policy</h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            At Slotify Professional, we prioritize the privacy and security of patient data. 
            This policy outlines how we handle healthcare information with the highest clinical standards.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 p-3 bg-slate-50 rounded-2xl">
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-slate-900 mb-4">{section.title}</h2>
                  {section.content}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl shadow-blue-500/20 text-center"
          >
            <h2 className="text-2xl font-black mb-4">Questions about your privacy?</h2>
            <p className="text-blue-100 mb-8 font-medium">
              If you have any questions regarding this policy or how your data is managed, 
              please reach out to our Data Protection team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:privacy@slotify.pro" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                <MessageSquare size={18} />
                Email Support
              </a>
              <a href="tel:+918874614130" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-colors border border-blue-500/30">
                <PhoneCall size={18} />
                Call DPO
              </a>
            </div>
          </motion.div>
          
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm font-medium">
              Last Updated: April 5, 2026 • © {new Date().getFullYear()} Slotify Professional
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default PrivacyPolicy;
