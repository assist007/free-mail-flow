import { useState, useEffect, useCallback } from 'react';
import { supabase, EmailAttachment, supabaseUrl } from '@/integrations/supabase/client';

export function useAttachments(emailId: string | null) {
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!emailId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('email_attachments')
        .select('*')
        .eq('email_id', emailId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setAttachments((data as EmailAttachment[]) || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching attachments:', err);
    } finally {
      setLoading(false);
    }
  }, [emailId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const getPublicUrl = (storagePath: string): string => {
    return `${supabaseUrl}/storage/v1/object/public/email-attachments/${storagePath}`;
  };

  const isImage = (contentType: string): boolean => {
    return contentType.startsWith('image/');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return {
    attachments,
    loading,
    error,
    refetch: fetchAttachments,
    getPublicUrl,
    isImage,
    formatFileSize,
  };
}
