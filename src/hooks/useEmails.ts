import { useState, useEffect, useCallback } from 'react';
import { supabase, Email, EmailInsert } from '@/integrations/supabase/client';

export function useEmails(folder: string = 'inbox') {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('emails')
        .select('*')
        .order('received_at', { ascending: false });

      // NOTE: Treat NULL flags as false so older rows (or rows without defaults)
      // still show up in the correct folders.
      if (folder === 'inbox') {
        query = query
          .neq('is_trash', true)
          .neq('is_archived', true)
          .neq('is_sent', true);
      } else if (folder === 'sent') {
        query = query.eq('is_sent', true).neq('is_trash', true);
      } else if (folder === 'starred') {
        query = query.eq('is_starred', true).neq('is_trash', true);
      } else if (folder === 'archive') {
        query = query.eq('is_archived', true).neq('is_trash', true);
      } else if (folder === 'trash') {
        query = query.eq('is_trash', true);
      } else {
        query = query.eq('folder', folder).neq('is_trash', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setEmails((data as Email[]) || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('emails')
      .update({ is_read: true } as any)
      .eq('id', id);
    
    if (!error) {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e));
    }
    return { error };
  };

  const toggleStar = async (id: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) return { error: new Error('Email not found') };

    const { error } = await supabase
      .from('emails')
      .update({ is_starred: !email.is_starred } as any)
      .eq('id', id);
    
    if (!error) {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, is_starred: !e.is_starred } : e));
    }
    return { error };
  };

  const moveToTrash = async (id: string) => {
    const { error } = await supabase
      .from('emails')
      .update({ is_trash: true } as any)
      .eq('id', id);
    
    if (!error) {
      setEmails(prev => prev.filter(e => e.id !== id));
    }
    return { error };
  };

  const archiveEmail = async (id: string) => {
    const { error } = await supabase
      .from('emails')
      .update({ is_archived: true } as any)
      .eq('id', id);
    
    if (!error) {
      setEmails(prev => prev.filter(e => e.id !== id));
    }
    return { error };
  };

  const deleteForever = async (id: string) => {
    const { error } = await supabase
      .from('emails')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setEmails(prev => prev.filter(e => e.id !== id));
    }
    return { error };
  };

  const sendEmail = async (email: EmailInsert) => {
    // Call the send-email edge function
    const { data: functionData, error: functionError } = await supabase.functions.invoke('send-email', {
      body: email,
    });

    if (functionError) {
      console.error('Send email error:', functionError);
      return { data: null, error: functionError };
    }

    if (functionData?.error) {
      console.error('Send email API error:', functionData.error);
      return { data: null, error: new Error(functionData.error) };
    }

    // If successful, add to sent emails list
    if (functionData?.email && folder === 'sent') {
      setEmails(prev => [functionData.email as Email, ...prev]);
    }

    return { data: functionData?.email as Email | null, error: null };
  };

  return {
    emails,
    loading,
    error,
    refetch: fetchEmails,
    markAsRead,
    toggleStar,
    moveToTrash,
    archiveEmail,
    deleteForever,
    sendEmail,
  };
}
