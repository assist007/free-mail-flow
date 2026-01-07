import { useState, useEffect, useCallback } from 'react';
import { supabase, EmailDomain, EmailAddress } from '@/integrations/supabase/client';

export function useDomains(domainIds?: string[]) {
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('email_domains').select('*').order('created_at', { ascending: false });
      if (domainIds && domainIds.length > 0) {
        query = query.in('id', domainIds);
      } else if (domainIds && domainIds.length === 0) {
        setDomains([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setDomains((data as EmailDomain[]) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [domainIds]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const addDomain = async (domain: string) => {
    const webhookSecret = crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('email_domains')
      .insert({
        domain,
        is_verified: false,
        webhook_secret: webhookSecret,
      } as any)
      .select()
      .single();

    if (!error && data) {
      setDomains(prev => [data as EmailDomain, ...prev]);
    }
    return { data: data as EmailDomain | null, error };
  };

  const verifyDomain = async (id: string) => {
    const { error } = await supabase
      .from('email_domains')
      .update({ is_verified: true } as any)
      .eq('id', id);

    if (!error) {
      setDomains(prev => prev.map(d => d.id === id ? { ...d, is_verified: true } : d));
    }
    return { error };
  };

  const deleteDomain = async (id: string) => {
    const { error } = await supabase
      .from('email_domains')
      .delete()
      .eq('id', id);

    if (!error) {
      setDomains(prev => prev.filter(d => d.id !== id));
    }
    return { error };
  };

  return {
    domains,
    loading,
    error,
    refetch: fetchDomains,
    addDomain,
    verifyDomain,
    deleteDomain,
  };
}

export function useEmailAddresses(domainId?: string, createdBy?: string | null) {
  const [addresses, setAddresses] = useState<EmailAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAddresses = useCallback(async () => {
    if (!domainId) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('email_addresses')
        .select('*')
        .eq('domain_id', domainId)
        .order('created_at', { ascending: false });

      if (createdBy) {
        query = query.eq('created_by', createdBy);
      }

      const { data, error } = await query;

      if (!error) {
        setAddresses((data as EmailAddress[]) || []);
      }
    } finally {
      setLoading(false);
    }
  }, [domainId, createdBy]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const addAddress = async (localPart: string, displayName?: string, isCatchAll: boolean = false) => {
    if (!domainId) return { data: null, error: new Error('No domain selected') };

    const { data, error } = await supabase
      .from('email_addresses')
      .insert({
        domain_id: domainId,
        local_part: localPart.toLowerCase(),
        display_name: displayName,
        is_catch_all: isCatchAll,
        status: 'pending',
        ...(createdBy ? { created_by: createdBy } : {}),
      } as any)
      .select()
      .single();

    if (!error && data) {
      setAddresses(prev => [data as EmailAddress, ...prev]);
    }
    return { data: data as EmailAddress | null, error };
  };

  const deleteAddress = async (id: string) => {
    const { error } = await supabase
      .from('email_addresses')
      .delete()
      .eq('id', id);

    if (!error) {
      setAddresses(prev => prev.filter(a => a.id !== id));
    }
    return { error };
  };

  return {
    addresses,
    loading,
    refetch: fetchAddresses,
    addAddress,
    deleteAddress,
  };
}
