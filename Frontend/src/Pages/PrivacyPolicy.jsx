import React from 'react';
import PublicHeader from '../components/Shared/PublicHeader';
import PublicFooter from '../components/Shared/PublicFooter';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      
      {/* Simple Blue Header - Matching Screenshot */}
      <div className="bg-[#283593] pt-32 pb-10 text-center">
        <h1 className="text-white text-3xl md:text-4xl font-bold">Privacy Policy</h1>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 py-12 text-gray-800 font-sans leading-relaxed text-sm md:text-base">
        <div className="space-y-6">
          <p>
            <strong>Oviaan Technologies Private Limited</strong> (“us”, “we”, or “Oviaan”, which also includes its affiliates) is the author and publisher of the internet resource 
            www.oviaan.com (“Website”) as well as the software, services and applications provided by Oviaan, including but not limited to the ‘Oviaan CMS’ 
            application (together with the Website, referred to as the “Services”).
          </p>

          <p>
            This privacy policy ("Privacy Policy") explains how we collect, use, share, disclose and protect Personal information about the Users of the Services, 
            including the Practitioners, the End-Users, and the visitors of Website. We created this Privacy Policy to demonstrate our commitment to the 
            protection of your privacy and your personal information. Your use of and access to the Services is subject to this Privacy Policy and our Terms of Use.
          </p>

          <div className="bg-gray-50 p-4 border border-gray-200 uppercase text-xs font-bold">
            BY USING THE SERVICES OR BY OTHERWISE GIVING US YOUR INFORMATION, YOU WILL BE DEEMED TO HAVE READ, UNDERSTOOD AND AGREED TO THE PRACTICES AND POLICIES OUTLINED IN THIS PRIVACY POLICY.
          </div>

          <h2 className="text-xl font-bold border-b border-gray-300 pb-2">1. WHY THIS PRIVACY POLICY?</h2>
          <p>This Privacy Policy is published in compliance with, inter alia:</p>
          <ul className="list-decimal pl-8 space-y-2">
            <li>Section 43A of the Information Technology Act, 2000;</li>
            <li>Regulation 4 of the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Information) Rules, 2011 (the “SPI Rules”);</li>
            <li>Regulation 3(1) of the Information Technology (Intermediaries Guidelines) Rules, 2011.</li>
          </ul>

          <h2 className="text-xl font-bold border-b border-gray-300 pb-2">2. COLLECTION OF PERSONAL INFORMATION</h2>
          <p>
            When you access the Services, we may ask you to voluntarily provide us with certain information that personally identifies you. 
            Information collected by us may include:
          </p>
          <ul className="list-disc pl-8 space-y-1">
            <li>Contact data (such as your email address and phone number);</li>
            <li>Demographic data (such as your gender, date of birth and pin code);</li>
            <li>Medical records and history shared by Practitioners or yourself;</li>
            <li>Data regarding your usage of the services and history of appointments;</li>
            <li>Insurance data (such as your insurance carrier and plan).</li>
          </ul>

          <h2 className="text-xl font-bold border-b border-gray-300 pb-2">3. PRIVACY STATEMENTS</h2>
          
          <h3 className="font-bold text-lg">3.1 ALL USERS NOTE:</h3>
          <p>
            All information provided to Oviaan by a User, including Personal Information or Sensitive Personal Data, is voluntary. 
            Oviaan may use this information for (a) providing Services, (b) business intelligence and research purposes in non-personally identifiable form, 
            (c) communication purposes like appointment reminders and feedback.
          </p>

          <h3 className="font-bold text-lg">3.2 PRACTITIONERS NOTE:</h3>
          <p>
            As part of the registration process, certain information is collected from Practitioners. This information is used to help 
            End-Users find and book appointments. Oviaan automatically enables the listing of Practitioners’ information on its Website 
            for every doctor or clinic added to a Practice using our software.
          </p>

          <h3 className="font-bold text-lg">3.3 END-USERS NOTE:</h3>
          <p>
            End-Users’ personally identifiable information is used to identify them for healthcare purposes. Oviaan may keep records of 
            electronic communications and telephone calls for administration of Services, customer support, and research.
          </p>

          <h2 className="text-xl font-bold border-b border-gray-300 pb-2">4. CONFIDENTIALITY AND SECURITY</h2>
          <p>
            Your Personal Information is maintained by Oviaan in electronic form. Oviaan takes all necessary precautions to protect 
            your personal information both online and off-line, and implements reasonable security practices and measures including 
            managerial, technical, and physical security control measures.
          </p>

          <h2 className="text-xl font-bold border-b border-gray-300 pb-2">5. CHANGE TO PRIVACY POLICY</h2>
          <p>
            Oviaan may update this Privacy Policy at any time, with or without advance notice. Significant changes will be 
            notified via notice on the Website or email.
          </p>

          <h2 className="text-xl font-bold border-b border-gray-300 pb-2">6. CONTACT INFORMATION</h2>
          <div className="bg-blue-50 p-6 border border-blue-100">
            <p className="font-bold">Data Protection Team</p>
            <p>Oviaan Technologies Pvt Ltd</p>
            <p>Email: amitmaurya3276@gmail.com</p>
            <p>Support: +91 8874614138</p>
            <p>Address: 633/3 New Panchwati Colony, Kamta, Lucknow - 226028</p>
          </div>

          <div className="text-center pt-10 border-t border-gray-200">
            <p className="text-gray-400 text-sm italic">
              Last Updated: May 10, 2026 • © {new Date().getFullYear()} Oviaan Technologies Private Limited
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default PrivacyPolicy;
