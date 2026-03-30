import { useState, useCallback } from 'react';
import { centralDoctorApi } from '../services/api';

export const useDoctors = () => {
  // Doctor state
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [doctorsCountLoading, setDoctorsCountLoading] = useState(true);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorForm, setShowDoctorForm] = useState(false);

  // Fetch doctors with pagination
  const fetchDoctors = useCallback(async (page = 1, limit = 15) => {
    try {
      setDoctorsLoading(true);
      setDoctorsError('');
      const response = await centralDoctorApi.getAll({ page, limit });
      
      let doctorsList = [];
      if (response && response.doctors) {
        doctorsList = response.doctors;
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.currentPage || 1);
        setTotalDoctors(response.totalDoctors || 0);
      } else {
        doctorsList = response || [];
      }

      const uniqueData = Array.from(new Map(doctorsList.map(doc => [doc.id || doc._id, doc])).values());
      setDoctors(uniqueData);
      return uniqueData;
    } catch (error) {
      setDoctorsError('Error loading doctors');
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  // Fetch doctor count
  const fetchDoctorCount = useCallback(async () => {
    try {
      setDoctorsCountLoading(true);
      const count = await centralDoctorApi.getCount();
      setTotalDoctors(count);
    } catch (error) {
      // Handle error silently or set error state if needed
    } finally {
      setDoctorsCountLoading(false);
    }
  }, []);

  // Handle viewing a doctor's profile
  const handleViewDoctor = useCallback((doctor) => {
    setSelectedDoctor(doctor);
  }, []);

  // Handle editing a doctor
  const handleEditDoctor = useCallback((doctor) => {
    setEditingDoctor(doctor);
    setShowDoctorForm(true);
  }, []);

  // Handle editing a doctor from profile view
  const handleEditDoctorFromProfile = useCallback((doctor) => {
    setEditingDoctor(doctor);
    setShowDoctorForm(true);
    setSelectedDoctor(null);
  }, []);

  // Handle deleting a doctor
  const handleDeleteDoctor = useCallback(async (doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await centralDoctorApi.delete(doctorId);
        // Refresh the doctors list and counts
        await Promise.all([
          fetchDoctors(),
          fetchDoctorCount()
        ]);
      } catch (error) {
        // Error notifications will be handled by backend if needed
      }
    }
  }, [fetchDoctors, fetchDoctorCount]);

  // Handle deleting a doctor from profile view
  const handleDeleteDoctorFromProfile = useCallback((doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      handleDeleteDoctor(doctorId);
      setSelectedDoctor(null);
    }
  }, [handleDeleteDoctor]);

  // Handle doctor form success
  const handleDoctorSuccess = useCallback(async (doctorData, doctorId) => {
    try {
      let newDoctor;

      if (doctorId) {
        newDoctor = await centralDoctorApi.update(doctorId, doctorData);
      } else {
        newDoctor = await centralDoctorApi.create(doctorData);
      }

      // Refresh data
      await Promise.all([
        fetchDoctors(),
        fetchDoctorCount()
      ]);

      closeDoctorForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        `Error ${doctorId ? 'updating' : 'adding'} doctor`;
    }
  }, [fetchDoctors, fetchDoctorCount]);

  // Handle doctor verification
  const handleVerifyDoctor = useCallback(async (doctorId) => {
    try {
      await centralDoctorApi.verify(doctorId);
      await Promise.all([
        fetchDoctors(),
        fetchDoctorCount()
      ]);
    } catch (error) {
      console.error('Error verifying doctor:', error);
    }
  }, [fetchDoctors, fetchDoctorCount]);

  // Handle doctor rejection
  const handleRejectDoctor = useCallback(async (doctorId) => {
    try {
      if (window.confirm('Are you sure you want to reject this doctor registration?')) {
        await centralDoctorApi.reject(doctorId);
        await Promise.all([
          fetchDoctors(),
          fetchDoctorCount()
        ]);
      }
    } catch (error) {
      console.error('Error rejecting doctor:', error);
    }
  }, [fetchDoctors, fetchDoctorCount]);

  // Open doctor form
  const openDoctorForm = useCallback(() => {
    setShowDoctorForm(true);
    setEditingDoctor(null);
  }, []);

  // Close doctor form
  const closeDoctorForm = useCallback(() => {
    setShowDoctorForm(false);
    setEditingDoctor(null);
  }, []);

  return {
    // State
    doctors,
    doctorsLoading,
    doctorsError,
    totalDoctors,
    totalPages,
    currentPage,
    doctorsCountLoading,
    editingDoctor,
    selectedDoctor,
    showDoctorForm,

    // Setters (REQUIRED for AdminDashboard)
    setDoctors,
    setDoctorsLoading,
    setDoctorsError,
    setTotalDoctors,
    setTotalPages,
    setCurrentPage,
    setDoctorsCountLoading,
    setEditingDoctor,
    setSelectedDoctor,
    setShowDoctorForm,

    // Actions
    fetchDoctors,
    fetchDoctorCount,
    handleViewDoctor,
    handleEditDoctor,
    handleEditDoctorFromProfile,
    handleDeleteDoctor,
    handleDeleteDoctorFromProfile,
    handleDoctorSuccess,
    handleVerifyDoctor,
    handleRejectDoctor,
    openDoctorForm,
    closeDoctorForm,
  };
};
