import { useState, useCallback } from 'react';
import api, { receptionistApi } from '../services/api';

export const useReceptionists = () => {
  // Receptionist state
  const [receptionists, setReceptionists] = useState([]);
  const [receptionistsLoading, setReceptionistsLoading] = useState(true);
  const [receptionistsError, setReceptionistsError] = useState('');
  const [totalReceptionists, setTotalReceptionists] = useState(0);
  const [receptionistsCountLoading, setReceptionistsCountLoading] = useState(true);
  const [editingReceptionist, setEditingReceptionist] = useState(null);
  const [showReceptionistForm, setShowReceptionistForm] = useState(false);

  // Fetch all receptionists
  const fetchReceptionists = useCallback(async () => {
    try {
      setReceptionistsLoading(true);
      setReceptionistsError('');
      const data = await receptionistApi.getAll();
      setReceptionists(data || []);
      return data || [];
    } catch (error) {
      setReceptionistsError('Error loading receptionists');
    } finally {
      setReceptionistsLoading(false);
    }
  }, []);

  // Fetch receptionist count
  const fetchReceptionistCount = useCallback(async () => {
    try {
      setReceptionistsCountLoading(true);
      const count = await receptionistApi.getCount();
      setTotalReceptionists(count);
    } catch (error) {
      // Handle error silently or set error state if needed
    } finally {
      setReceptionistsCountLoading(false);
    }
  }, []);

  // Handle deleting a receptionist
  const handleDeleteReceptionist = useCallback(async (receptionistId) => {
    if (window.confirm('Are you sure you want to delete this receptionist?')) {
      try {
        await receptionistApi.delete(receptionistId);
        // Refresh the receptionists list and counts
        await Promise.all([
          fetchReceptionists(),
          fetchReceptionistCount()
        ]);
      } catch (error) {
        // Error notifications will be handled by backend if needed
      }
    }
  }, [fetchReceptionists, fetchReceptionistCount]);

  // Handle viewing a receptionist
  const handleViewReceptionist = useCallback((receptionist) => {
    // Handle viewing receptionist details
    // This could open a modal or navigate to a detail page
  }, []);

  // Handle editing a receptionist
  const openReceptionistForm = useCallback((receptionist = null) => {
    setEditingReceptionist(receptionist);
    setShowReceptionistForm(true);
  }, []);

  // Handle receptionist form success
  const handleReceptionistSuccess = useCallback(async (receptionistData) => {
    try {
      let response;
      if (editingReceptionist) {
        response = await api.put(`/receptionists/${editingReceptionist.id}`, receptionistData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post('/receptionists', receptionistData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (response.status === 200 || response.status === 201) {
        // Refresh receptionists list and count
        fetchReceptionists();
        fetchReceptionistCount();
        setShowReceptionistForm(false);
        setEditingReceptionist(null);
      } else {
        alert(`Error ${editingReceptionist ? 'updating' : 'adding'} receptionist: ${response.data.message}`);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error connecting to server. Please try again.');
    }
  }, [editingReceptionist, fetchReceptionists, fetchReceptionistCount]);

  return {
  // State
  receptionists,
  receptionistsLoading,
  receptionistsError,
  totalReceptionists,
  receptionistsCountLoading,
  editingReceptionist,
  showReceptionistForm,

  // Setters (REQUIRED for AdminDashboard)
  setReceptionists,
  setReceptionistsLoading,
  setReceptionistsError,
  setTotalReceptionists,
  setReceptionistsCountLoading,
  setEditingReceptionist,
  setShowReceptionistForm,

  // Actions
  fetchReceptionists,
  fetchReceptionistCount,
  handleDeleteReceptionist,
  handleViewReceptionist,
  openReceptionistForm,
  handleReceptionistSuccess,
};

};
