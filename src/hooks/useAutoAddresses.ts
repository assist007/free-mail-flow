import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AutoAddress {
  localPart: string;
  fullAddress: string;
  emailCount: number;
  lastReceived: string;
}

export function useAutoAddresses(domainName: string) {
  const [addresses, setAddresses] = useState<AutoAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAddresses = useCallback(async () => {
    if (!domainName) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all emails for this domain
      const { data: emails, error } = await supabase
        .from('emails')
        .select('to_email, received_at')
        .ilike('to_email', `%@${domainName}%`)
        .order('received_at', { ascending: false });

      if (error) throw error;

      // Group by local part and count
      const addressMap = new Map<string, { count: number; lastReceived: string }>();
      
      emails?.forEach(email => {
        const match = email.to_email?.match(/^([^@]+)@/);
        if (match) {
          const localPart = match[1].toLowerCase();
          const existing = addressMap.get(localPart);
          if (existing) {
            existing.count++;
          } else {
            addressMap.set(localPart, {
              count: 1,
              lastReceived: email.received_at,
            });
          }
        }
      });

      // Convert to array
      const result: AutoAddress[] = [];
      addressMap.forEach((value, localPart) => {
        result.push({
          localPart,
          fullAddress: `${localPart}@${domainName}`,
          emailCount: value.count,
          lastReceived: value.lastReceived,
        });
      });

      // Sort by email count (most used first)
      result.sort((a, b) => b.emailCount - a.emailCount);

      setAddresses(result);
    } catch (err) {
      console.error('Error fetching auto addresses:', err);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [domainName]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Set up realtime subscription for new emails
  useEffect(() => {
    if (!domainName) return;

    const channel = supabase
      .channel('auto-addresses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emails',
        },
        (payload) => {
          const toEmail = (payload.new as any).to_email;
          if (toEmail?.toLowerCase().includes(`@${domainName.toLowerCase()}`)) {
            fetchAddresses(); // Refresh when new email arrives
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [domainName, fetchAddresses]);

  return {
    addresses,
    loading,
    refetch: fetchAddresses,
  };
}
