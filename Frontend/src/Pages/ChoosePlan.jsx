import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Crown, 
  ArrowRight,
  Database,
  Users,
  Headset,
  Calendar,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { subscriptionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getPaymentPrefillDetails, validatePaymentDetails } from '../utils/paymentUtils';
import toast from 'react-hot-toast';

const ChoosePlan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const organizationData = location.state?.organization;
  
  const [plans, setPlans] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [trialInfo, setTrialInfo] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchTrialStatus();
  }, [organizationData]);

  const fetchTrialStatus = async () => {
    try {
      const mySub = await subscriptionApi.getMySubscription();
      if (mySub && mySub.organizationId) {
        const endDate = new Date(mySub.organizationId.trialEndDate || mySub.endDate);
        const now = new Date();
        const diffTime = endDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setTrialInfo({
          daysRemaining: diffDays > 0 ? diffDays : 0,
          isTrial: mySub.status === 'trial',
          planName: mySub.planName
        });
      }
    } catch (err) {
      console.error('Failed to fetch trial status:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await subscriptionApi.getPlans();
      // Remove 'free' from plans list for display
      const { free, ...paidPlans } = data;
      setPlans(paidPlans);
      // Auto-select first paid plan (Basic)
      setSelectedPlan('basic');
    } catch (err) {
      setError('Failed to load plans');
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // 1. Resolve and Validate Prefill Details
      const prefillDetails = getPaymentPrefillDetails(user, organizationData);
      const validationError = validatePaymentDetails(prefillDetails);
      
      if (validationError) {
        toast.error(validationError, { duration: 5000 });
        setProcessing(false);
        return;
      }

      // 2. Create Razorpay order via backend
      const response = await subscriptionApi.upgrade({
        plan: selectedPlan,
        billingCycle,
      });

      if (!response.success || !response.order) {
        throw new Error(response.message || 'Failed to initialize payment');
      }

      // 3. Load Razorpay Script
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        setProcessing(false);
        return;
      }

      // 4. Open Razorpay Checkout
      const options = {
        key: response.order.key,
        amount: response.order.amount,
        currency: response.order.currency,
        name: 'Slotify',
        description: `${response.planMeta.name} - ${billingCycle} Subscription`,
        image: '/logo.png', // Logo for Razorpay popup
        order_id: response.order.id,
        handler: async function (rzpResponse) {
          try {
            toast.loading('Verifying payment...', { id: 'payment-verify' });
            
            // 5. Verify Payment with Backend
            const verifyRes = await subscriptionApi.verifyPayment({
              orderId: response.order.id,
              paymentId: rzpResponse.razorpay_payment_id,
              signature: rzpResponse.razorpay_signature,
              plan: selectedPlan,
              billingCycle
            });

            if (verifyRes.success) {
              toast.success('Subscription activated successfully!', { id: 'payment-verify' });
              // Redirect to dashboard or success page
              setTimeout(() => navigate('/organization-dashboard', { state: { paymentSuccess: true } }), 2000);
            } else {
              toast.error(verifyRes.message || 'Payment verification failed', { id: 'payment-verify' });
            }
          } catch (err) {
            console.error('Verification error:', err);
            toast.error('An error occurred during verification', { id: 'payment-verify' });
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: prefillDetails.name,
          email: prefillDetails.email,
          contact: prefillDetails.contact,
        },
        notes: {
          clinicId: user?.organizationId?._id || user?.organizationId || organizationData?._id || 'unknown',
          userId: user?._id || 'unknown',
          planName: response.planMeta.name,
          clinicName: organizationData?.name || user?.organization?.name || 'Slotify Customer'
        },
        theme: {
          color: '#7C3AED', // Violet 600
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error('Payment initialization error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to initiate payment');
      toast.error('Failed to initiate payment');
      setProcessing(false);
    }
  };

  if (loading && !plans) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-violet-400 font-medium">Loading premium plans...</p>
        </div>
      </div>
    );
  }

  const planData = plans ? plans[selectedPlan] : null;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          {trialInfo && trialInfo.isTrial && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-8 backdrop-blur-sm"
            >
              <Clock className="w-5 h-5" />
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Current Status</p>
                <p className="text-sm font-semibold">Free Trial: {trialInfo.daysRemaining} days remaining</p>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col items-center gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold tracking-wide uppercase">Upgrade Your Clinic</span>
            </motion.div>
          </div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
          >
            Choose Your Premium Journey
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Unlock advanced AI features, unlimited doctors, and custom branding to take your clinic to the next level.
          </motion.p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Billing Cycle Toggle */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-gray-800/60 p-1.5 rounded-xl border border-white/5 inline-flex relative shadow-2xl backdrop-blur-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative px-8 py-2.5 rounded-lg text-sm font-medium transition-colors z-10 ${
                billingCycle === 'monthly' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`relative px-8 py-2.5 rounded-lg text-sm font-medium transition-colors z-10 flex items-center gap-2 ${
                billingCycle === 'yearly' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Annual
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">
                -17%
              </span>
            </button>

            <div 
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-violet-600 rounded-lg shadow-md transition-all duration-300 ease-out z-0"
              style={{ 
                left: billingCycle === 'monthly' ? '6px' : 'calc(50%)' 
              }}
            />
          </div>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans && Object.entries(plans).map(([key, plan], index) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={key}
            >
              <PlanCard
                planKey={key}
                plan={plan}
                billingCycle={billingCycle}
                isSelected={selectedPlan === key}
                onSelect={() => setSelectedPlan(key)}
              />
            </motion.div>
          ))}
        </div>

        {/* Selected Plan Summary & CTA */}
        <AnimatePresence mode="wait">
          {selectedPlan && planData && (
            <motion.div 
              key={selectedPlan}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-gray-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[60px] pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
                       {planData.name} Summary
                    </h2>
                    <p className="text-gray-400">Complete payment to activate your premium features immediately.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                    <p className="text-3xl font-extrabold text-white">₹{billingCycle === 'monthly' ? planData.price.monthly : planData.price.yearly}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <DetailItem icon={Users} label="Doctors" value={planData.features.doctors} />
                  <DetailItem icon={Headset} label="Staff" value={planData.features.receptionists} />
                  <DetailItem icon={Calendar} label="Appointments" value={planData.features.appointmentsPerMonth} formatNumber />
                  <DetailItem icon={ShieldCheck} label="Security" value="Enterprise" isString />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="px-8 py-4 border border-gray-600/50 rounded-xl hover:bg-white/5 text-gray-300 transition-colors w-full sm:w-auto font-medium"
                >
                  Change Details
                </button>
                <button
                  onClick={handlePayment}
                  disabled={processing || !selectedPlan}
                  className="relative group px-12 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] disabled:opacity-50 transition-all overflow-hidden flex items-center justify-center w-full sm:w-auto font-bold text-lg"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center gap-2">
                    {processing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Pay ₹{billingCycle === 'monthly' ? planData.price.monthly : planData.price.yearly}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

const DetailItem = ({ icon: Icon, label, value, formatNumber, isString }) => {
  const displayValue = value === -1 
    ? 'Unlimited' 
    : isString 
      ? value 
      : formatNumber 
        ? value.toLocaleString() 
        : value;

  return (
    <div className="flex flex-col">
      <p className="text-xs text-gray-500 mb-1 flex items-center gap-2 font-bold uppercase tracking-wider">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className="text-lg font-semibold text-white">
        {displayValue}
      </p>
    </div>
  )
}

const PlanCard = ({ planKey, plan, billingCycle, isSelected, onSelect }) => {
  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
  const isPremium = planKey === 'enterprise';

  return (
    <div
      onClick={onSelect}
      className={`relative bg-gray-900/40 backdrop-blur-xl rounded-2xl p-8 cursor-pointer transition-all duration-500 border ${
        isSelected 
          ? 'border-violet-500 shadow-[0_0_40px_rgba(139,92,246,0.2)] scale-[1.05] transform' 
          : 'border-white/5 hover:border-white/20 hover:bg-gray-800/60'
      }`}
    >
      {planKey === 'pro' && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full shadow-xl border border-violet-400/30">
          RECOMMENDED
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-violet-500/20 text-violet-400' : 'bg-gray-800 text-gray-500'}`}>
            {isPremium ? <Crown className="w-6 h-6" /> : <Database className="w-6 h-6" />}
          </div>
          <h3 className="text-2xl font-black text-white">{plan.name}</h3>
        </div>
        
        <div className="flex items-end gap-1">
          <span className="text-5xl font-black text-white tracking-tighter">₹{price.toLocaleString('en-IN')}</span>
          <span className="text-gray-500 mb-1.5 font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
        </div>
        <p className="text-gray-400 mt-2 text-sm ml-1">{plan.description}</p>
      </div>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-8" />

      <ul className="space-y-4 mb-8">
        <FeatureItem text={`${plan.features.doctors === -1 ? 'Unlimited' : plan.features.doctors} Doctors`} />
        <FeatureItem text={`${plan.features.receptionists === -1 ? 'Unlimited' : plan.features.receptionists} Staff Members`} />
        <FeatureItem text={`${plan.features.appointmentsPerMonth === -1 ? 'Unlimited' : plan.features.appointmentsPerMonth.toLocaleString()} Appointments/mo`} />
        <FeatureItem text={`${plan.features.patients === -1 ? 'Unlimited' : plan.features.patients.toLocaleString()} Patients`} />
        <FeatureItem text={plan.aiFeatures} highlighted />
        {plan.features.advancedAnalytics && <FeatureItem text="Advanced Clinical Analytics" />}
        {plan.features.customBranding && <FeatureItem text="Custom White-Label Branding" />}
      </ul>

      <div className={`w-full py-4 rounded-xl text-center font-bold transition-all ${
        isSelected 
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
          : 'bg-white/5 text-gray-400 group-hover:bg-white/10'
      }`}>
        {isSelected ? 'Plan Selected' : 'Select Plan'}
      </div>
    </div>
  );
};

const FeatureItem = ({ text, highlighted = false }) => (
  <li className="flex items-start gap-3">
    <div className={`mt-1 flex-shrink-0 ${highlighted ? 'text-emerald-400' : 'text-violet-500'}`}>
      <CheckCircle2 className="w-4 h-4" />
    </div>
    <span className={`text-sm leading-snug ${highlighted ? 'text-emerald-300 font-semibold' : 'text-gray-300'}`}>
      {text}
    </span>
  </li>
);

export default ChoosePlan;
;
