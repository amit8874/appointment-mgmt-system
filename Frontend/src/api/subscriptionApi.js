import api from '../services/api.js';

export const subscriptionApi = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/subscriptions', { params });
    return data;
  },
  getMySubscription: async () => {
    const { data } = await api.get('/subscriptions/my-subscription');
    return data;
  },
  getPlans: async () => {
    const { data } = await api.get('/subscriptions/plans');
    return data;
  },
  upgrade: async (planData) => {
    const { data } = await api.post('/subscriptions/upgrade', planData);
    return data;
  },
  cancel: async () => {
    const { data } = await api.post('/subscriptions/cancel');
    return data;
  },
  verifyPayment: async (paymentData) => {
    const { data } = await api.post('/subscriptions/verify-payment', paymentData);
    return data;
  },
};

export default subscriptionApi;
