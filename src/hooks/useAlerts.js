import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAlerts(limit = 10) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) setError(fetchError);
    else {
      setAlerts(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [limit]);

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
      .channel('alerts_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { alerts, loading, error, refresh: load };
}