import React from 'react';
import PublicHeader from '../components/Shared/PublicHeader';
import PublicFooter from '../components/Shared/PublicFooter';

const CancellationPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      
      {/* Simple Blue Header */}
      <div className="bg-[#283593] pt-32 pb-10 text-center">
        <h1 className="text-white text-3xl md:text-4xl font-bold">Cancellation Policy</h1>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 py-12 text-gray-800 font-sans leading-relaxed text-sm md:text-base">
        <div className="space-y-8">
          
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Can I cancel my subscription before the expiry of the subscription period?</h2>
            <p>
              Sure. You can call our customer support to cancel the subscription and get a refund as per the cancellation policy given below.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">Cancellation policy for subscription:</h2>
            
            <ul className="list-disc pl-8 space-y-4 text-gray-700">
              <li>
                If you cancel an order before it is shipped to you, or if you refuse delivery, a cancellation service charge will 
                be deducted and the balance amount will be refunded within 14 business days from the date of cancellation request.
              </li>
              
              <li>
                If you cancel an order due to a long waiting period or non-availability of stock, the entire payment would be 
                refunded back to the customer within 14 business days from the date of cancellation request, provided that 
                the shipment has not been dispatched.
              </li>
              
              <li>
                If any hardware (like a tablet or medical device) gets damaged during your usage, and you do not wish to 
                continue the subscription, we’ll refund the unused period of your subscription after deduction of cancellation 
                charges, within 14 business days from the date of cancellation request. However, you also have the option of 
                getting a replacement device.
              </li>
              
              <li>
                If you do not wish to continue the subscription, any hardware costs associated with the setup won’t be 
                refunded under any circumstances. The hardware will be unlocked and handed over to you to keep.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 uppercase tracking-wide">Refund Process:</h2>
            <p>
              To initiate a cancellation, please contact our support team at <span className="font-bold">amitmaurya3276@gmail.com</span> or call 
              us at <span className="font-bold">+91 8874614138</span>. Once the cancellation request is verified, 
              the refund will be processed to your original payment method within the stipulated 14 business days.
            </p>
          </section>

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

export default CancellationPolicy;
