import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const RANGE_TO_HOURS = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };

export function useSensorReadings(range = '24h') {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const hours = RANGE_TO_HOURS[range] ?? 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error: fetchError } = await supabase
      .from('sensor_readings')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setReadings(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [range]);

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

  useEffect(() => {
    const channel = supabase
      .channel('sensor_readings_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          setReadings((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  return { readings, latest, loading, error, refresh: load };
}