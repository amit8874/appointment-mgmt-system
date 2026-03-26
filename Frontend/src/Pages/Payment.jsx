import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { subscriptionApi } from '../services/api';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentData = location.state?.paymentData;

  useEffect(() => {
    if (!paymentData?.razorpayOrder) {
      navigate('/choose-plan');
      return;
    }

    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      initializePayment();
    };
    script.onerror = () => {
      alert('Failed to load Razorpay. Please refresh the page.');
    };
    document.body.appendChild(script);
  };

  const initializePayment = () => {
    if (!window.Razorpay) {
      setTimeout(initializePayment, 100);
      return;
    }

    const options = {
      key: paymentData.razorpayOrder.key,
      amount: paymentData.razorpayOrder.amount,
      currency: paymentData.razorpayOrder.currency,
      name: 'Clinic Management System',
      description: `Subscription: ${paymentData.subscription.planName}`,
      order_id: paymentData.razorpayOrder.id,
      handler: async function (response) {
        try {
          // Verify payment
          await subscriptionApi.verifyPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });

          // Clear pending payment
          localStorage.removeItem('pendingPayment');

          // Redirect to dashboard
          navigate('/organization-dashboard', {
            state: { paymentSuccess: true },
          });
        } catch (error) {
          alert('Payment verification failed: ' + error.message);
        }
      },
      prefill: {
        email: paymentData.organization?.email || '',
      },
      theme: {
        color: '#3B82F6',
      },
      modal: {
        ondismiss: function () {
          navigate('/choose-plan');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to payment gateway...</p>
      </div>
    </div>
  );
};

export default Payment;
