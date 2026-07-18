import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// startDate / endDate are 'YYYY-MM-DD' strings from <input type="date">
export function useSensorReadingsByDate(startDate, endDate) {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!startDate || !endDate) {
      setReadings([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Include the full end day by pushing to the next day's midnight
    const start = new Date(`${startDate}T00:00:00`).toISOString();
    const end = new Date(`${endDate}T23:59:59.999`).toISOString();

    const { data, error: fetchError } = await supabase
      .from('sensor_readings')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError);
    } else {
      setReadings(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    let active = true;
    const timeoutId = setTimeout(() => {
      if (active) load();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [load]);

  return { readings, loading, error, refresh: load };
}