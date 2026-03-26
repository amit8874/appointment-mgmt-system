import api from '../services/api';
import { getUserById } from './userApi';

// Get all doctors
export const getDoctors = async () => {
  try {
    const response = await api.get('/doctors');
    return response.data;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
};

// Add a new doctor
export const addDoctor = async (doctorData, customDoctorId = null) => {
  try {
    const dataToSend = customDoctorId ? { ...doctorData, doctorId: customDoctorId } : doctorData;
    const response = await api.post('/doctors', dataToSend);
    return response.data;
  } catch (error) {
    console.error('Error adding doctor:', error);
    throw error;
  }
};

// Update an existing doctor
export const updateDoctor = async (id, doctorData) => {
  try {
    const response = await api.put(`/doctors/${id}`, doctorData);
    // Ensure we return the updated doctor data with the correct ID
    return { ...response.data, id: response.data._id || id };
  } catch (error) {
    console.error('Error updating doctor:', error);
    throw error.response?.data?.message || 'Failed to update doctor';
  }
};

// Delete a doctor
export const deleteDoctor = async (id) => {
  try {
    const response = await api.delete(`/doctors/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting doctor:', error);
    throw error;
  }
};

// Get a single doctor by ID
export const getDoctorById = async (id) => {
  try {
    const response = await api.get(`/doctors/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching doctor:', error);
    throw error;
  }
};

// Get admin profile by user ID
export const getAdminProfile = async (userId) => {
  try {
    // First try to get from doctors collection (for existing admin profiles)
    const doctorId = `ADM${userId.toString().slice(-6).toUpperCase()}`;
    const response = await api.get(`/doctors/${doctorId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      // If not found in doctors, try to get from users collection
      try {
        const userData = await getUserById(userId);
        // Map user data to expected admin profile format
        return {
          firstName: userData.name ? userData.name.split(' ')[0] : '',
          lastName: userData.name ? userData.name.split(' ').slice(1).join(' ') : '',
          email: userData.mobile || '', // Use mobile as email since email might not be in user
          phone: userData.mobile || '',
          dob: null, // Not available in user data
          address: '', // Not available
          name: userData.name || '',
          specialization: 'Administrator',
          photo: '', // Not available
        };
      } catch (userError) {
        console.error('Error fetching admin profile from users:', userError);
        throw userError;
      }
    } else {
      console.error('Error fetching admin profile:', error);
      throw error;
    }
  }
};
