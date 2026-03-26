import api from '../services/api';

// Get all receptionists
export const getReceptionists = async () => {
  try {
    const response = await api.get('/receptionists');
    return response.data;
  } catch (error) {
    console.error('Error fetching receptionists:', error);
    throw error;
  }
};

// Get a single receptionist by ID
export const getReceptionistById = async (id) => {
  try {
    const response = await api.get(`/receptionists/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching receptionist with ID ${id}:`, error);
    throw error;
  }
};

// Create a new receptionist
export const createReceptionist = async (receptionistData) => {
  try {
    const formData = new FormData();

    // Append all fields to FormData
    Object.keys(receptionistData).forEach(key => {
      if (key === 'profilePhoto' && receptionistData[key] instanceof File) {
        formData.append(key, receptionistData[key]);
      } else if (key === 'workingHours' || key === 'availability') {
        formData.append(key, JSON.stringify(receptionistData[key]));
      } else if (receptionistData[key] !== null && receptionistData[key] !== undefined) {
        formData.append(key, receptionistData[key]);
      }
    });

    const response = await api.post('/receptionists', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating receptionist:', error);
    throw error;
  }
};

// Update a receptionist
export const updateReceptionist = async (id, receptionistData) => {
  try {
    const formData = new FormData();

    // Append all fields to FormData
    Object.keys(receptionistData).forEach(key => {
      if (key === 'profilePhoto' && receptionistData[key] instanceof File) {
        formData.append(key, receptionistData[key]);
      } else if (key === 'workingHours' || key === 'availability') {
        formData.append(key, JSON.stringify(receptionistData[key]));
      } else if (receptionistData[key] !== null && receptionistData[key] !== undefined) {
        formData.append(key, receptionistData[key]);
      }
    });

    const response = await api.put(`/receptionists/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating receptionist with ID ${id}:`, error);
    throw error;
  }
};

// Delete a receptionist
export const deleteReceptionist = async (id) => {
  try {
    const response = await api.delete(`/receptionists/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting receptionist with ID ${id}:`, error);
    throw error;
  }
};

export default {
  getReceptionists,
  getReceptionistById,
  createReceptionist,
  updateReceptionist,
  deleteReceptionist
};
