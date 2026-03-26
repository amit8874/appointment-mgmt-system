import { useState, useEffect } from 'react';
import api from '../../services/api';

const useSlots = (doctorId, selectedDate) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!doctorId || !selectedDate) {
      setSlots([]);
      setAvailable(true);
      setError(null);
      return;
    }

    const fetchSlots = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/doctors/${doctorId}/slots?date=${selectedDate}`);
        if (response.status !== 200) {
          throw new Error('Failed to fetch slots');
        }
        const data = response.data;
        setSlots(data.slots || []);
        setAvailable(data.available !== false);
      } catch (err) {
        setError(err.message);
        setSlots([]);
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [doctorId, selectedDate]);

  return { slots, loading, error, available };
};

export default useSlots;