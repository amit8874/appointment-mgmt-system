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
  LayoutDashboard
} from 'lucide-react';
import { subscriptionApi } from '../services/api';
import RegistrationSuccessModal from '../Component/RegistrationSuccessModal';

const ChoosePlan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const organization = location.state?.organization;
  
  const [plans, setPlans] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  useEffect(() => {
    fetchPlans();
    // Auto-select free trial plan
    setSelectedPlan('free');
    
    // Calculate trial days if organization has trialEndDate
    if (organization?.trialEndDate) {
      const endDate = new Date(organization.trialEndDate);
      const startDate = new Date(organization.trialStartDate || Date.now());
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      setTrialDays(days);
    }
  }, [organization]);

  const fetchPlans = async () => {
    try {
      const data = await subscriptionApi.getPlans();
      setPlans(data);
      // Default to free trial
      setSelectedPlan('free');
    } catch (err) {
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    if (selectedPlan === 'free') {
      // Free trial - show success modal
      setTrialDays(14); // Default trial days
      setShowSuccessModal(true);
      return;
    }

    // Paid plan - proceed to payment
    try {
      setLoading(true);
      const response = await subscriptionApi.upgrade({
        plan: selectedPlan,
        billingCycle,
      });

      // Store payment details
      localStorage.setItem('pendingPayment', JSON.stringify({
        orderId: response.razorpayOrder?.id,
        amount: response.amount,
        plan: selectedPlan,
        billingCycle,
      }));

      // Redirect to payment page
      navigate('/payment', { state: { paymentData: response } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
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
          <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.5 }}
             className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide uppercase">Select Your Plan</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
          >
            Choose Your Medical Journey
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Start with our 14-day free trial or upgrade to unlock unlimited potential for your clinic.
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
          transition={{ delay: 0.3 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-gray-800/60 p-1.5 rounded-xl border border-white/5 inline-flex relative shadow-2xl backdrop-blur-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative px-8 py-2.5 rounded-lg text-sm font-medium transition-colors z-10 ${
                billingCycle === 'monthly' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`relative px-8 py-2.5 rounded-lg text-sm font-medium transition-colors z-10 flex items-center gap-2 ${
                billingCycle === 'yearly' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Annual billing
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">
                Save 17%
              </span>
            </button>

            {/* Sliding Pill Background */}
            <div 
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-violet-600 rounded-lg shadow-md transition-all duration-300 ease-out z-0`}
              style={{ 
                left: billingCycle === 'monthly' ? '6px' : 'calc(50% + 14px)' // Adjusted spacing slightly for annual button size
              }}
            />
          </div>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans && Object.entries(plans).map(([key, plan], index) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (index * 0.1) }}
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

        {/* Selected Plan Details & Actions */}
        <AnimatePresence mode="wait">
          {selectedPlan && planData && (
            <motion.div 
              key={selectedPlan}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-gray-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[60px] pointer-events-none" />
                
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <LayoutDashboard className="w-6 h-6 text-violet-400" />
                  What's included in {planData.name}
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <DetailItem icon={Users} label="Doctors" value={planData.features.doctors} />
                  <DetailItem icon={Headset} label="Receptionists" value={planData.features.receptionists} />
                  <DetailItem icon={Calendar} label="Appointments/Mo" value={planData.features.appointmentsPerMonth} formatNumber />
                  <DetailItem icon={Users} label="Patients" value={planData.features.patients} formatNumber />
                  <DetailItem icon={Database} label="Storage" value={`${planData.features.storageGB} GB`} isString />
                  
                  <div className="flex flex-col">
                    <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-emerald-400" />
                       Advanced Features
                    </p>
                    <p className="text-lg font-semibold text-white flex gap-2">
                      {planData.features.advancedAnalytics ? (
                        <span className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded text-xs border border-violet-500/20">Analytics</span>
                      ) : null}
                      {planData.features.customBranding ? (
                        <span className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded text-xs border border-pink-500/20">Branding</span>
                      ) : null}
                      {(!planData.features.advancedAnalytics && !planData.features.customBranding) && (
                         <span className="text-gray-500 font-normal">Standard</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  onClick={() => navigate('/register-organization')}
                  className="px-8 py-4 border border-gray-600/50 rounded-xl hover:bg-white/5 text-gray-300 transition-colors w-full sm:w-auto font-medium"
                >
                  Back to Details
                </button>
                <button
                  onClick={handleContinue}
                  disabled={loading || !selectedPlan}
                  className="relative group px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] disabled:opacity-50 transition-all overflow-hidden flex items-center justify-center w-full sm:w-auto font-semibold"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center gap-2">
                    {loading ? 'Processing...' : selectedPlan === 'free' ? 'Start Free Trial Now' : 'Continue to Payment'}
                    {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Success Modal */}
      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        trialDays={trialDays}
        organizationName={organization?.name}
      />
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
      <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-500" />
        {label}
      </p>
      <p className="text-lg font-semibold text-white">
        {displayValue}
      </p>
    </div>
  )
}

const PlanCard = ({ planKey, plan, billingCycle, isSelected, onSelect }) => {
  const price = planKey === 'free' ? 0 : billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
  const isPremium = planKey === 'pro' || planKey === 'enterprise';

  return (
    <div
      onClick={onSelect}
      className={`relative bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 cursor-pointer transition-all duration-300 border ${
        isSelected 
          ? 'border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.3)] scale-[1.02] transform' 
          : 'border-white/5 hover:border-white/20 hover:bg-gray-800/60'
      }`}
    >
      {/* Popular Badge */}
      {planKey === 'pro' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          MOST POPULAR
        </div>
      )}

      {/* Selected Indicator Ring */}
      <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
        isSelected ? 'border-violet-500 bg-violet-500/20' : 'border-gray-600'
      }`}>
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {isPremium ? <Crown className="w-5 h-5 text-amber-400" /> : <Database className="w-5 h-5 text-emerald-400" />}
          <h3 className="text-xl font-bold text-white capitalize">{plan.name}</h3>
        </div>
        
        {planKey !== 'free' ? (
          <div className="mt-4 flex items-end">
            <span className="text-4xl font-extrabold text-white">₹{price.toLocaleString('en-IN')}</span>
            <span className="text-gray-400 mb-1 ml-1 text-sm">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
        ) : (
          <div className="mt-4">
            <span className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Free</span>
            <p className="text-sm text-gray-400 mt-1">{plan.duration}</p>
          </div>
        )}
      </div>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-6" />

      <ul className="space-y-4">
        <FeatureItem 
          text={`${plan.features.doctors === -1 ? 'Unlimited' : plan.features.doctors} Doctors`} 
        />
        <FeatureItem 
          text={`${plan.features.receptionists === -1 ? 'Unlimited' : plan.features.receptionists} Receptionists`} 
        />
        <FeatureItem 
          text={`${plan.features.appointmentsPerMonth === -1 ? 'Unlimited' : plan.features.appointmentsPerMonth.toLocaleString()} Appointments/Mo`} 
        />
        <FeatureItem 
          text={`${plan.features.patients === -1 ? 'Unlimited' : plan.features.patients.toLocaleString()} Patients`} 
        />
        <FeatureItem 
          text={`${plan.features.storageGB} GB Secure Storage`} 
        />
        
        {plan.features.advancedAnalytics ? (
          <FeatureItem text="Advanced Analytics Dashboard" />
        ) : (
          <FeatureItem text="Basic Analytics" disabled />
        )}
        
        {plan.features.customBranding ? (
          <FeatureItem text="Custom Clinic Branding" />
        ) : (
           <FeatureItem text="Custom Clinic Branding" disabled />
        )}
      </ul>
    </div>
  );
};

const FeatureItem = ({ text, disabled = false }) => (
  <li className={`flex items-start gap-3 ${disabled ? 'opacity-40 grayscale' : ''}`}>
    <div className="mt-0.5 min-w-5">
      <CheckCircle2 className={`w-5 h-5 ${disabled ? 'text-gray-500' : 'text-violet-400'}`} />
    </div>
    <span className={`text-sm ${disabled ? 'text-gray-500' : 'text-gray-300 leading-tight'}`}>
      {text}
    </span>
  </li>
);

export default ChoosePlan;
