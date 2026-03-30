import { useState, useCallback } from 'react';
import { patientApi } from '../services/api';

export const usePatients = () => {
  // Patient state
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsCountLoading, setPatientsCountLoading] = useState(true);

  // Fetch patients with pagination
  const fetchPatients = useCallback(async (page = 1, limit = 15) => {
    try {
      setPatientsLoading(true);
      setPatientsError('');
      const response = await patientApi.getAll({ page, limit });
      
      if (response && response.patients) {
        setPatients(response.patients);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.currentPage || 1);
        setTotalPatients(response.totalPatients || 0);
        return response.patients;
      } else {
        setPatients(response || []);
        return response || [];
      }
    } catch (error) {
      setPatientsError('Error loading patients');
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  // Fetch patient count
  const fetchPatientCount = useCallback(async () => {
    try {
      setPatientsCountLoading(true);
      const count = await patientApi.getCount();
      setTotalPatients(count);
    } catch (error) {
      // Handle error silently or set error state if needed
    } finally {
      setPatientsCountLoading(false);
    }
  }, []);

  // Handle viewing a patient's profile
  const handleViewPatient = useCallback(async (patient) => {
    try {
      setSelectedPatient(patient);
      // If you need to fetch additional patient data, you can do it here
    } catch (error) {
      // Handle error if needed
    }
  }, []);

  // Handle patient form success
  const handlePatientSuccess = useCallback((newPatient) => {
    // Refresh patients list and count
    fetchPatients();
    fetchPatientCount();
  }, [fetchPatients, fetchPatientCount]);

  return {
  // State
  patients,
  patientsLoading,
  patientsError,
  selectedPatient,
  totalPatients,
  totalPages,
  currentPage,
  patientsCountLoading,

  // Setters (IMPORTANT)
  setPatients,
  setPatientsLoading,
  setPatientsError,
  setSelectedPatient,
  setTotalPatients,
  setTotalPages,
  setCurrentPage,
  setPatientsCountLoading,
  

  // Actions
  fetchPatients,
  fetchPatientCount,
  handleViewPatient,
  handlePatientSuccess,
};

};
