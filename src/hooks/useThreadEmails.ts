import { useState, useEffect, useCallback } from 'react';
import { supabase, Email } from '@/integrations/supabase/client';

export function useThreadEmails(threadId: string | null | undefined) {
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThreadEmails = useCallback(async () => {
    if (!threadId) {
      setThreadEmails([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .eq('thread_id', threadId)
        .neq('is_trash', true)
        .order('received_at', { ascending: true });

      if (fetchError) throw fetchError;
      setThreadEmails((data as Email[]) || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching thread emails:', err);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchThreadEmails();
  }, [fetchThreadEmails]);

  // Add a new email to the thread (optimistic update after sending)
  const addToThread = (email: Email) => {
    setThreadEmails(prev => [...prev, email]);
  };

  return {
    threadEmails,
    loading,
    error,
    refetch: fetchThreadEmails,
    addToThread,
  };
}
