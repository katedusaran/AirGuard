import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useNotificationRecipients() {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('notification_recipients')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRecipients(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

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

  const addRecipient = async ({ phoneNumber, label }) => {
    const { data, error: insertError } = await supabase
      .from('notification_recipients')
      .insert({ phone_number: phoneNumber, label: label || null })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    setRecipients((current) => [data, ...current]);
  };

  const setRecipientActive = async (id, active) => {
    const { error: updateError } = await supabase
      .from('notification_recipients')
      .update({ active })
      .eq('id', id);

    if (updateError) throw new Error(updateError.message);
    setRecipients((current) => current.map((recipient) => (
      recipient.id === id ? { ...recipient, active } : recipient
    )));
  };

  const deleteRecipient = async (id) => {
    const { error: deleteError } = await supabase
      .from('notification_recipients')
      .delete()
      .eq('id', id);

    if (deleteError) throw new Error(deleteError.message);
    setRecipients((current) => current.filter((recipient) => recipient.id !== id));
  };

  return { recipients, loading, error, addRecipient, setRecipientActive, deleteRecipient, refresh: load };
}
