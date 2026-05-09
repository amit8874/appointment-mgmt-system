import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const patientProgressImageApi = {
  upload: async (patientId, formData) => {
    const response = await axios.post(`${API_URL}/patients/${patientId}/progress-images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  list: async (patientId) => {
    const response = await axios.get(`${API_URL}/patients/${patientId}/progress-images`);
    return response.data;
  },

  getSignedUrl: async (patientId, imageId) => {
    const response = await axios.get(`${API_URL}/patients/${patientId}/progress-images/${imageId}/signed-url`);
    return response.data;
  },

  update: async (patientId, imageId, data) => {
    const response = await axios.put(`${API_URL}/patients/${patientId}/progress-images/${imageId}`, data);
    return response.data;
  },

  delete: async (patientId, imageId) => {
    const response = await axios.delete(`${API_URL}/patients/${patientId}/progress-images/${imageId}`);
    return response.data;
  }
};

export default patientProgressImageApi;
