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

  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(15);
  const [isSeeAll, setIsSeeAll] = useState(false);

  // Fetch patients with pagination and search
  const fetchPatients = useCallback(async (page = 1, fetchLimit = null, search = null) => {
    try {
      setPatientsLoading(true);
      setPatientsError('');
      // If search is not provided as argument, use the current state
      const finalSearch = search !== null ? search : searchTerm;
      const finalLimit = fetchLimit !== null ? fetchLimit : limit;
      const queryLimit = (finalLimit === 'all' || finalLimit === 0) ? 'all' : (finalLimit || 15);
      const response = await patientApi.getAll({ page, limit: queryLimit, search: finalSearch });
      
      if (response && response.patients) {
        setPatients(response.patients);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.currentPage || 1);
        setTotalPatients(response.totalPatients || 0);
        if (fetchLimit !== null) {
          setLimit(fetchLimit);
          setIsSeeAll(fetchLimit === 'all' || fetchLimit === 0);
        }
        return response.patients;
      } else {
        setPatients(response || []);
        return response || [];
      }
    } catch (error) {
      setPatientsError('Error loading patients');
      return [];
    } finally {
      setPatientsLoading(false);
    }
  }, [searchTerm, limit]);

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
  searchTerm,
  limit,
  isSeeAll,

  // Setters (IMPORTANT)
  setPatients,
  setPatientsLoading,
  setPatientsError,
  setSelectedPatient,
  setTotalPatients,
  setTotalPages,
  setCurrentPage,
  setPatientsCountLoading,
  setSearchTerm,
  setLimit,
  setIsSeeAll,
  

  // Actions
  fetchPatients,
  fetchPatientCount,
  handleViewPatient,
  handlePatientSuccess,
};

};
