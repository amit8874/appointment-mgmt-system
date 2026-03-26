import { useState, useEffect } from 'react';
import api from '../../services/api';

const useAvailabilitySummary = (doctorId) => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId) {
      setSummary([]);
      return;
    }

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/doctors/${doctorId}/availability-summary`);
        setSummary(response.data || []);
      } catch (err) {
        console.error('Error fetching availability summary:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [doctorId]);

  return { summary, loading, error };
};

export default useAvailabilitySummary;
