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
};

export default organizationApi;
