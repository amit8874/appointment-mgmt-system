import React, { useState, useEffect } from 'react';
import { subscriptionApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Stethoscope, 
  Database,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  History,
  Zap,
  Sparkles,
  MessageSquare,
  User
} from 'lucide-react';

const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeBillingCycle, setActiveBillingCycle] = useState('monthly');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subData, plansData] = await Promise.all([
        subscriptionApi.getMySubscription(),
        subscriptionApi.getPlans(),
      ]);
      setSubscription(subData);
      setPlans(plansData);
      if (subData?.billingCycle) setActiveBillingCycle(subData.billingCycle);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan, billingCycle) => {
    try {
      setLoading(true);
      const response = await subscriptionApi.upgrade({ plan, billingCycle });
      
      localStorage.setItem('pendingPayment', JSON.stringify({
        orderId: response.razorpayOrder?.id,
        amount: response.amount,
        plan,
        billingCycle,
      }));

      navigate('/payment', { state: { paymentData: response } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upgrade subscription');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !subscription) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Subscription...</p>
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const isTrial = subscription?.status === 'trial';
  
  // Calculate days remaining
  const trialEnd = subscription?.trialEndDate ? new Date(subscription.trialEndDate) : null;
  const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      {/* Header Section */}
      <section className="bg-indigo-900 pt-20 pb-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -mr-48 -mt-48" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-8"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-200 text-[10px] font-black uppercase tracking-widest">
                  Billing & Plans
                </div>
                {isTrial && (
                  <div className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-lg text-amber-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} /> {daysRemaining} Days Left
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tight leading-none mb-4">
                {isTrial ? 'Trial Period' : 'Your Subscription'}
              </h1>
              <p className="text-indigo-200 font-medium max-w-xl">
                Manage your clinic's billing, upgrade your features, and keep your practice running smoothly with Slotify Professional.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:w-80 shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isTrial ? 'bg-amber-400 shadow-amber-500/40' : 'bg-indigo-600 shadow-indigo-600/40'} shadow-lg`}>
                  {isTrial ? <Zap size={24} className="text-indigo-900" /> : <Crown size={24} className="text-white" />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Current Plan</p>
                  <p className="text-xl font-black text-white uppercase italic">{subscription?.planName || 'Free Trial'}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs font-bold text-indigo-100/70 uppercase tracking-tight">
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className={subscription?.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>
                    {subscription?.status || 'Trial'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{isTrial ? 'Expires' : 'Next Billing'}</span>
                  <span className="text-white">
                    {new Date(subscription?.endDate || subscription?.trialEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-20">
        {/* Usage Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          <UsageCard icon={Stethoscope} label="Doctors" used={subscription?.usage?.doctors} total={subscription?.limits?.doctors} />
          <UsageCard icon={Users} label="Staff" used={subscription?.usage?.receptionists} total={subscription?.limits?.receptionists} />
          <UsageCard icon={User} label="Patients" used={subscription?.usage?.patients} total={subscription?.limits?.patients} />
          <UsageCard icon={TrendingUp} label="Appointments" used={subscription?.usage?.appointmentsThisMonth} total={subscription?.limits?.appointmentsPerMonth} />
          <UsageCard icon={Database} label="Storage" used={subscription?.usage?.storageUsedGB} total={subscription?.limits?.storageGB} unit="GB" />
        </div>

        {/* Upgrade Section */}
        <div className="mb-20 text-center">
          <div className="inline-flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mb-12">
            <button 
              onClick={() => setActiveBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeBillingCycle === 'monthly' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setActiveBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeBillingCycle === 'yearly' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
            >
              Yearly <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md">Save 17%</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {plans && Object.entries(plans)
              .filter(([key]) => key !== 'free')
              .map(([key, plan]) => (
                <PricingCard 
                  key={key}
                  planKey={key}
                  plan={plan}
                  billingCycle={activeBillingCycle}
                  isCurrent={currentPlan === key}
                  onUpgrade={() => handleUpgrade(key, activeBillingCycle)}
                />
              ))}
          </div>
        </div>

        {/* Security & Support Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureFooter icon={ShieldCheck} title="Enterprise Grade Security" text="All data is encrypted with AES-256 and stored in compliant medical-grade servers." />
          <FeatureFooter icon={CreditCard} title="Flexible Billing" titleColor="text-blue-600" text="Upgrade, downgrade or cancel any time. We support all major Credit/Debit cards and UPI." />
          <FeatureFooter icon={History} title="24/7 Priority Support" titleColor="text-emerald-600" text="Paid plans include dedicated account managers and priority WhatsApp support." />
        </div>
      </div>
    </div>
  );
};

const UsageCard = ({ icon: Icon, label, used = 0, total = 0, unit = '' }) => {
  const percentage = total === -1 ? 0 : (used / total) * 100;
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600">
          <Icon size={20} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      <div className="flex items-end justify-between mb-2">
        <p className="text-2xl font-black text-slate-800">
          {used}<span className="text-slate-400 font-bold text-sm ml-1">{unit}</span>
        </p>
        <p className="text-xs font-bold text-slate-400">
          of {total === -1 ? '∞' : total}{unit}
        </p>
      </div>
      {total !== -1 && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
    </div>
  );
};

const PricingCard = ({ planKey, plan, billingCycle, isCurrent, onUpgrade }) => {
  const price = billingCycle === 'monthly' ? plan.price.monthly : Math.floor(plan.price.yearly / 12);
  const totalYearly = plan.price.yearly;

  return (
    <div className={`relative bg-white rounded-[2.5rem] p-10 border-2 transition-all group overflow-hidden ${isCurrent ? 'border-indigo-600 shadow-2xl scale-105 z-10' : 'border-slate-100 hover:border-indigo-200 shadow-xl shadow-slate-50'}`}>
      {planKey === 'pro' && (
        <div className="absolute top-6 right-[-35px] rotate-45 bg-indigo-600 text-white text-[10px] font-black px-12 py-1 uppercase tracking-widest shadow-lg">
          Best Value
        </div>
      )}

      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">{plan.name}</h3>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Professional Practice</p>

      <div className="flex items-end gap-1 mb-8">
        <span className="text-5xl font-black text-slate-900 leading-none">₹{price.toLocaleString('en-IN')}</span>
        <span className="text-slate-400 font-bold mb-1">/mo</span>
      </div>

      {billingCycle === 'yearly' && (
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-8 bg-emerald-50 py-2 px-4 rounded-xl inline-block">
          Billed annually @ ₹{totalYearly.toLocaleString('en-IN')}/yr
        </p>
      )}

      <ul className="space-y-4 mb-10">
        <FeatureLine icon={Stethoscope} text={`${plan.features.doctors === -1 ? 'Unlimited' : plan.features.doctors} Doctors`} />
        <FeatureLine icon={Users} text={`${plan.features.receptionists === -1 ? 'Unlimited' : plan.features.receptionists} Staff Members`} />
        <FeatureLine icon={User} text={`${plan.features.patients === -1 ? 'Unlimited' : plan.features.patients.toLocaleString()} Patients`} />
        <FeatureLine icon={TrendingUp} text={`${plan.features.appointmentsPerMonth === -1 ? 'Unlimited' : plan.features.appointmentsPerMonth.toLocaleString()} Appts/mo`} />
        {plan.features.aiFeatures && <FeatureLine icon={Sparkles} text={plan.features.aiFeatures} />}
        {plan.features.messaging && <FeatureLine icon={MessageSquare} text="Direct Patient Messaging System" />}
        {plan.features.advancedAnalytics && <FeatureLine icon={Zap} text="Advanced Clinical Analytics" />}
        {plan.features.customBranding && <FeatureLine icon={ShieldCheck} text="Custom White Label Branding" />}
      </ul>

      <button 
        disabled={isCurrent}
        onClick={onUpgrade}
        className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest ${isCurrent ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-slate-900 shadow-lg shadow-indigo-600/20 active:scale-95 group-hover:bg-indigo-700'}`}
      >
        {isCurrent ? <><CheckCircle2 size={18} /> Active Plan</> : <>Upgrade Now <ArrowRight size={18} /></>}
      </button>
    </div>
  );
};

const FeatureLine = ({ icon: Icon, text }) => (
  <li className="flex items-center gap-3">
    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
      <Icon size={14} />
    </div>
    <span className="text-sm font-bold text-slate-600">{text}</span>
  </li>
);

const FeatureFooter = ({ icon: Icon, title, text, titleColor = 'text-indigo-600' }) => (
  <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
    <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-indigo-600 mb-6">
      <Icon size={24} />
    </div>
    <h4 className={`text-lg font-black uppercase italic tracking-tight mb-3 ${titleColor}`}>{title}</h4>
    <p className="text-sm font-medium text-slate-500 leading-relaxed">{text}</p>
  </div>
);

export default SubscriptionManagement;
