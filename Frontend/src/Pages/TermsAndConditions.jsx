import React from 'react';
import PublicHeader from '../components/Shared/PublicHeader';
import PublicFooter from '../components/Shared/PublicFooter';

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      
      {/* Simple Blue Header */}
      <div className="bg-[#283593] pt-32 pb-10 text-center">
        <h1 className="text-white text-3xl md:text-4xl font-bold">Terms and Conditions</h1>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 py-12 text-gray-800 font-sans leading-relaxed text-sm md:text-base">
        <div className="space-y-8">
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">1. NATURE AND APPLICABILITY OF TERMS</h2>
            <p>
              Please carefully go through these terms and conditions (“Terms”) and the privacy policy available at https://www.oviaan.com/privacy-policy (“Privacy Policy”) 
              before you decide to access the Website or avail the services made available on the Website by Oviaan Professional. 
              These Terms and the Privacy Policy together constitute a legal agreement (“Agreement”) between you and Oviaan Professional in connection 
              with your visit to the Website and your use of the Services.
            </p>
            <p>
              The Agreement applies to you whether you are -
              <br />i. A medical practitioner or health care provider (whether an individual professional or an organization) or similar institution wishing to be listed, or already listed, on the Website, including designated, authorized associates of such practitioners or institutions (“Practitioner(s)”, “you” or “User”); or
              <br />ii. A patient, his/her representatives or affiliates, searching for Practitioners through the Website (“End-User”, “you” or “User”); or
              <br />iii. Otherwise a user of the Website (“you” or “User”).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">2. CONDITIONS OF USE</h2>
            <p>
              You must be 18 years of age or older to register, use the Services, or visit or use the Website in any manner. 
              By registering, visiting and using the Website or accepting this Agreement, you represent and warrant to Oviaan Professional 
              that you are 18 years of age or older, and that you have the right, authority and capacity to use the Website and the Services 
              available through the Website, and agree to and abide by this Agreement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">3. TERMS OF USE APPLICABLE TO ALL USERS</h2>
            <p className="font-bold">3.1 Account and Data Privacy</p>
            <p>
              The User is responsible for maintaining the confidentiality of the User’s account access information and password. 
              The User shall be responsible for all usage of the User’s account and password, whether or not authorized by the User.
              Oviaan Professional shall not be liable for any loss that you may incur as a result of someone else using your password or account.
            </p>
            <p className="font-bold">3.2 Communication Policy</p>
            <p>
              By providing your contact number, you explicitly consent to receive communications (through call, SMS, email or WhatsApp) 
              from Oviaan Professional and/or its authorized representatives, even if your contact number is registered under the DND / NCPR list.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">4. APPOINTMENT BOOKING AND INTERACTION</h2>
            <p>
              Oviaan Professional acts as an intermediary, facilitating interaction between Patients and Practitioners. 
              Oviaan Professional is not responsible for any interaction between the User and the Practitioner. 
              Oviaan Professional does not provide any medical advice or diagnosis.
            </p>
            <p className="p-4 bg-red-50 border-l-4 border-red-500 font-bold text-red-700">
              NOT FOR EMERGENCIES: The Services are not intended to be used for emergency healthcare situations. 
              In case of a medical emergency, please contact your nearest hospital or emergency services immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">5. MAYA AI / EXPERIMENTAL FEATURES</h2>
            <p>
              Maya AI is an experimental artificial intelligence feature. All information generated by Maya AI must be 
              verified with a qualified healthcare professional. Oviaan Professional is not responsible for any actions 
              taken based on AI-generated responses. AI can make mistakes and does not provide clinical recommendations.
              Users are advised to use AI features at their own risk.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">6. TERMS FOR PRACTITIONERS</h2>
            <p>
              Practitioners using the Services must be qualified and registered with relevant medical councils. 
              Oviaan Professional reserves the right to verify credentials. Practitioners are responsible for the 
              accuracy of their profiles and the quality of care provided to patients.
              Practitioners agree not to engage in any "poaching" of patients or other unfair practices against fellow practitioners.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">7. LIMITATION OF LIABILITY</h2>
            <p>
              In no event, including but not limited to negligence, shall Oviaan Professional, or any of its directors, 
              officers, employees, agents or content or service providers be liable for any direct, indirect, special, 
              incidental, consequential, exemplary or punitive damages arising from, or directly or indirectly related to, 
              the use of, or the inability to use, the Website or the content, materials and functions related thereto.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">8. TERMINATION</h2>
            <p>
              Oviaan Professional reserves the right to suspend or terminate a User’s access to the Website and the Services 
              with or without notice and to exercise any other remedy available under law, in the event of any breach 
              by the User of these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">9. CONTACT INFORMATION</h2>
            <p>
              If a User has any questions concerning Oviaan Professional, the Website, this Agreement, the Services, 
              or anything related to any of the foregoing, Oviaan Professional customer support can be reached at:
            </p>
            <div className="bg-gray-100 p-6 rounded-lg">
              <p className="font-bold text-blue-800">Oviaan Professional Support</p>
              <p>Email: amitmaurya3276@gmail.com</p>
              <p>Phone: +91 8874614138</p>
              <p>Address: 633/3 New Panchwati Colony, Kamta, Lucknow - 226028</p>
            </div>
          </section>

          <div className="text-center pt-10 border-t border-gray-200">
            <p className="text-gray-400 text-sm italic">
              Last Updated: May 10, 2026 • © {new Date().getFullYear()} Oviaan Professional
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default TermsAndConditions;
