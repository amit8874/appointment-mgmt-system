import api from '../services/api';

// Update user password
export const updatePassword = async (userId, passwordData) => {
  try {
    const response = await api.put(`/auth/update-password/${userId}`, passwordData);
    return response.data;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

// Update user profile
export const updateUser = async (userId, updateData) => {
  try {
    const response = await api.put(`/auth/update-profile/${userId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};