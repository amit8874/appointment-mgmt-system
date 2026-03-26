import React, { useState, useEffect } from 'react';
import { subscriptionApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      
      // Store payment details
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

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      setLoading(true);
      await subscriptionApi.cancel();
      fetchData();
      alert('Subscription cancelled successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !subscription) {
    return <div className="p-8 text-center">Loading subscription...</div>;
  }

  const currentPlan = subscription?.plan || 'free';
  const currentPlanData = plans?.[currentPlan];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Current Subscription */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="text-lg font-semibold capitalize">{subscription?.planName || 'Free Trial'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`text-lg font-semibold capitalize ${
                subscription?.status === 'active' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {subscription?.status || 'trial'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {subscription?.status === 'trial' ? 'Trial Ends' : 'Renews On'}
              </p>
              <p className="text-lg font-semibold">
                {subscription?.endDate
                  ? new Date(subscription?.endDate).toLocaleDateString()
                  : subscription?.trialEndDate
                  ? new Date(subscription.trialEndDate).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4">Usage</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Doctors</p>
                <p className="text-lg">
                  {subscription?.usage?.doctors || 0} /{' '}
                  {subscription?.limits?.doctors === -1
                    ? '∞'
                    : subscription?.limits?.doctors || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Receptionists</p>
                <p className="text-lg">
                  {subscription?.usage?.receptionists || 0} /{' '}
                  {subscription?.limits?.receptionists === -1
                    ? '∞'
                    : subscription?.limits?.receptionists || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Appointments (This Month)</p>
                <p className="text-lg">
                  {subscription?.usage?.appointmentsThisMonth || 0} /{' '}
                  {subscription?.limits?.appointmentsPerMonth === -1
                    ? '∞'
                    : subscription?.limits?.appointmentsPerMonth || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Patients</p>
                <p className="text-lg">
                  {subscription?.usage?.patients || 0} /{' '}
                  {subscription?.limits?.patients === -1
                    ? '∞'
                    : subscription?.limits?.patients || 0}
                </p>
              </div>
            </div>
          </div>

          {subscription?.status === 'active' && (
            <div className="mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>

        {/* Available Plans */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upgrade Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans &&
              Object.entries(plans)
                .filter(([key]) => key !== 'free')
                .map(([key, plan]) => (
                  <PlanUpgradeCard
                    key={key}
                    planKey={key}
                    plan={plan}
                    currentPlan={currentPlan}
                    onUpgrade={handleUpgrade}
                  />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlanUpgradeCard = ({ planKey, plan, currentPlan, onUpgrade }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const isCurrentPlan = currentPlan === planKey;
  const price =
    billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;

  return (
    <div
      className={`border-2 rounded-lg p-6 ${
        isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
      <div className="mb-4">
        <span className="text-2xl font-bold">₹{price.toLocaleString('en-IN')}</span>
        <span className="text-gray-600">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
      </div>

      {!isCurrentPlan && (
        <>
          <div className="mb-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 text-sm rounded mr-2 ${
                billingCycle === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1 text-sm rounded ${
                billingCycle === 'yearly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              Yearly
            </button>
          </div>
          <button
            onClick={() => onUpgrade(planKey, billingCycle)}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Upgrade to {plan.name}
          </button>
        </>
      )}
      {isCurrentPlan && (
        <div className="text-center text-blue-600 font-semibold">Current Plan</div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
