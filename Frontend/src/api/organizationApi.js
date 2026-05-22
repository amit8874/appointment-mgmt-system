import api from '../services/api.js';

export const organizationApi = {
  register: async (orgData) => {
    const { data } = await api.post('/organizations', orgData);
    return data;
  },
  getAll: async (params = {}) => {
    const { data } = await api.get('/organizations', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/organizations/${id}`);
    return data;
  },
  update: async (id, orgData) => {
    const { data } = await api.put(`/organizations/${id}`, orgData);
    return data;
  },
  getStats: async (id) => {
    const { data } = await api.get(`/organizations/${id}/stats`);
    return data;
  },
  getMySessions: async () => {
    const { data } = await api.get('/users/me/sessions');
    return data;
  },
  revokeSession: async (sessionId) => {
    const { data } = await api.delete(`/users/me/sessions/${sessionId}`);
    return data;
  },
  // Prescription Template Settings
  getPrescriptionTemplateSettings: async () => {
    const { data } = await api.get('/clinic/prescription-template');
    return data;
  },
  updatePrescriptionTemplateSettings: async (settings) => {
    const { data } = await api.put('/clinic/prescription-template/settings', settings);
    return data;
  },
  uploadPrescriptionTemplate: async (formData) => {
    const { data } = await api.post('/clinic/prescription-template/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  deletePrescriptionTemplate: async () => {
    const { data } = await api.delete('/clinic/prescription-template');
    return data;
  },
};

export default organizationApi;
