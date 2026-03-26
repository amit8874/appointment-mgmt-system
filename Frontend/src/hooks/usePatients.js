import { useState, useCallback } from 'react';
import { patientApi } from '../services/api';

export const usePatients = () => {
  // Patient state
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [totalPatients, setTotalPatients] = useState(0);
  const [patientsCountLoading, setPatientsCountLoading] = useState(true);

  // Fetch all patients
  const fetchPatients = useCallback(async () => {
    try {
      setPatientsLoading(true);
      setPatientsError('');
      const data = await patientApi.getAll();
      setPatients(data || []);
      return data || [];
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
  patientsCountLoading,

  // Setters (IMPORTANT)
  setPatients,
  setPatientsLoading,
  setPatientsError,
  setSelectedPatient,
  setTotalPatients,
  setPatientsCountLoading,
  

  // Actions
  fetchPatients,
  fetchPatientCount,
  handleViewPatient,
  handlePatientSuccess,
};

};
